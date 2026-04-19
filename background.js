// background.js — Service Worker (API Proxy + Streaming)
// Generic template — copy and use as-is. No site-specific logic here.
//
// Handles:
//   - Port-based streaming to content script (ai-stream port)
//   - Dual-provider: Anthropic + OpenAI
//   - Key validation for settings page
//   - Daily usage tracking in chrome.storage.local
//
// Usage from content script:
//   var port = chrome.runtime.connect({ name: 'ai-stream' });
//   port.postMessage({ action: 'generate', provider, model, apiKey,
//                      systemPrompt, userMessage, maxTokens, temperature });
//   port.onMessage.addListener(function(msg) { /* msg.type: chunk|done|error */ });

'use strict';

importScripts('model-config.js');

// ─── Constants ────────────────────────────────────────────────────────────────

var OPENAI_ENDPOINT    = 'https://api.openai.com/v1/chat/completions';
var ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
var GROQ_ENDPOINT      = 'https://api.groq.com/openai/v1/chat/completions';
var ANTHROPIC_VERSION  = '2023-06-01';
var REQUEST_TIMEOUT_MS = 30000;

var ERROR_MESSAGES = {
  auth:        'API 金鑰無效，請在設定頁更新',
  rate_anthro: '請求過於頻繁，請稍候 10 秒後再試',
  rate_openai: 'OpenAI API 請求達到速率上限，請稍候再試',
  rate_groq:   'Groq API 請求達到速率上限，請稍候再試',
  server:      'AI 服務暫時不穩定，請稍後再試',
  overload:    'AI 服務目前負載過高，請稍後再試',
  network:     '無法連線至 AI 服務，請確認網路連線',
  timeout:     '請求逾時，請重試',
  stream:      '回覆中斷，已產生部分內容'
};

var MODEL_RATES = (typeof EXT_MODEL_RATES === 'object' && EXT_MODEL_RATES) ? EXT_MODEL_RATES : {};
var SESSION_USAGE = { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };

// ─── Port-based Streaming ─────────────────────────────────────────────────────

chrome.runtime.onConnect.addListener(function(port) {
  if (port.name !== 'ai-stream') return;
  port.onMessage.addListener(function(msg) {
    if (msg.action === 'generate') handleStreamGenerate(port, msg);
  });
});

async function handleStreamGenerate(port, request) {
  var provider     = request.provider;
  var model        = request.model;
  var apiKey       = request.apiKey;
  var systemPrompt = request.systemPrompt;
  var userMessage  = request.userMessage;
  var maxTokens    = request.maxTokens   || 1000;
  var temperature  = request.temperature !== undefined ? request.temperature : 0.7;

  var url, headers, body;

  if (provider === 'anthropic') {
    url = ANTHROPIC_ENDPOINT;
    headers = {
      'x-api-key':                                  apiKey,
      'anthropic-version':                          ANTHROPIC_VERSION,
      'anthropic-dangerous-direct-browser-access':  'true',
      'content-type':                               'application/json'
    };
    body = JSON.stringify({
      model: model, max_tokens: maxTokens, temperature: temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      stream: true
    });
  } else if (provider === 'groq') {
    url = GROQ_ENDPOINT;
    headers = { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' };
    body = JSON.stringify({
      model: model, max_tokens: maxTokens, temperature: temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  }
      ],
      stream: true,
      stream_options: { include_usage: true }
    });
  } else {
    url = OPENAI_ENDPOINT;
    headers = { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' };
    body = JSON.stringify({
      model: model, max_tokens: maxTokens, temperature: temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  }
      ],
      stream: true,
      stream_options: { include_usage: true }
    });
  }

  var controller = new AbortController();
  var timeoutId  = setTimeout(function() { controller.abort(); }, REQUEST_TIMEOUT_MS);

  var response;
  try {
    response = await fetch(url, { method: 'POST', headers: headers, body: body, signal: controller.signal });
  } catch (e) {
    clearTimeout(timeoutId);
    _postSafe(port, { type: 'error', message: e.name === 'AbortError' ? ERROR_MESSAGES.timeout : ERROR_MESSAGES.network });
    return;
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    _postSafe(port, { type: 'error', message: _httpError(response.status, provider) });
    return;
  }

  var inputTokens = 0, outputTokens = 0, accumulated = '', streamDone = false;
  var reader = response.body.getReader();
  var decoder = new TextDecoder('utf-8');
  var lineBuf = '';

  try {
    while (!streamDone) {
      var result = await reader.read();
      if (result.done) break;

      lineBuf += decoder.decode(result.value, { stream: true });
      var lines = lineBuf.split('\n');
      lineBuf = lines.pop();

      for (var i = 0; i < lines.length && !streamDone; i++) {
        var line = lines[i].trim();
        if (!line || line[0] === ':' || line.slice(0, 6) !== 'data: ') continue;
        var data = line.slice(6);

        if (data === '[DONE]') {
          _postSafe(port, { type: 'done', usage: _usage(model, inputTokens, outputTokens) });
          _saveUsage(model, inputTokens, outputTokens);
          streamDone = true;
          break;
        }

        var parsed;
        try { parsed = JSON.parse(data); } catch (e) { continue; }

        if (provider === 'anthropic') {
          if (parsed.type === 'message_start' && parsed.message && parsed.message.usage)
            inputTokens = parsed.message.usage.input_tokens || 0;
          else if (parsed.type === 'content_block_delta' && parsed.delta && parsed.delta.text) {
            accumulated += parsed.delta.text;
            _postSafe(port, { type: 'chunk', text: parsed.delta.text });
          } else if (parsed.type === 'message_delta' && parsed.usage)
            outputTokens = parsed.usage.output_tokens || 0;
          else if (parsed.type === 'message_stop') {
            _postSafe(port, { type: 'done', usage: _usage(model, inputTokens, outputTokens) });
            _saveUsage(model, inputTokens, outputTokens);
            streamDone = true;
          }
        } else {
          if (parsed.usage) {
            inputTokens  = parsed.usage.prompt_tokens     || 0;
            outputTokens = parsed.usage.completion_tokens || 0;
          }
          if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
            accumulated += parsed.choices[0].delta.content;
            _postSafe(port, { type: 'chunk', text: parsed.choices[0].delta.content });
          }
        }
      }
    }

    if (!streamDone) {
      if (accumulated.length > 0) {
        _postSafe(port, { type: 'done', usage: _usage(model, inputTokens, outputTokens) });
        _saveUsage(model, inputTokens, outputTokens);
      } else {
        _postSafe(port, { type: 'error', message: ERROR_MESSAGES.stream });
      }
    }
  } catch (e) {
    _postSafe(port, { type: 'error', message: accumulated.length > 0 ? ERROR_MESSAGES.stream : ERROR_MESSAGES.network });
  }
}

// ─── Extension Icon Click ─────────────────────────────────────────────────────

chrome.action.onClicked.addListener(function() {
  chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html') });
});

// ─── One-shot Messages ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'validateKey') {
    _validateKey(request.provider, request.key).then(sendResponse);
    return true;
  }
  if (request.action === 'openSettings') {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html') });
    sendResponse({ ok: true });
    return false;
  }
  if (request.action === 'getSessionUsage') {
    sendResponse({ ok: true, session: Object.assign({}, SESSION_USAGE) });
    return false;
  }
  return false;
});

// ─── Key Validation ───────────────────────────────────────────────────────────

async function _validateKey(provider, key) {
  try {
    var response;
    if (provider === 'anthropic') {
      response = await fetch('https://api.anthropic.com/v1/models', {
        method: 'GET',
        headers: {
          'x-api-key': key, 'anthropic-version': ANTHROPIC_VERSION,
          'anthropic-dangerous-direct-browser-access': 'true'
        }
      });
    } else if (provider === 'groq') {
      response = await fetch('https://api.groq.com/openai/v1/models', { headers: { 'Authorization': 'Bearer ' + key } });
    } else {
      response = await fetch('https://api.openai.com/v1/models', { headers: { 'Authorization': 'Bearer ' + key } });
    }
    if (response.ok)             return { valid: true };
    if (response.status === 401) return { valid: false, error: ERROR_MESSAGES.auth };
    return { valid: false, error: _httpError(response.status, provider) };
  } catch (e) {
    return { valid: false, error: ERROR_MESSAGES.network };
  }
}

// ─── Usage Tracking ───────────────────────────────────────────────────────────

function _saveUsage(model, inputTokens, outputTokens) {
  var costUsd = _calcCost(model, inputTokens, outputTokens);
  var today   = new Date().toISOString().slice(0, 10);
  SESSION_USAGE.calls++;
  SESSION_USAGE.inputTokens  += inputTokens;
  SESSION_USAGE.outputTokens += outputTokens;
  SESSION_USAGE.costUsd       = _round6(SESSION_USAGE.costUsd + costUsd);

  chrome.storage.local.get(['usageToday'], function(data) {
    var u = data.usageToday || { date: today, calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    if (u.date !== today) u = { date: today, calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    u.calls++;
    u.inputTokens  += inputTokens;
    u.outputTokens += outputTokens;
    u.costUsd       = _round6(u.costUsd + costUsd);
    chrome.storage.local.set({ usageToday: u });
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _postSafe(port, message) {
  try { port.postMessage(message); } catch (e) {}
}

function _httpError(status, provider) {
  if (status === 401) return ERROR_MESSAGES.auth;
  if (status === 429) {
    if (provider === 'openai')  return ERROR_MESSAGES.rate_openai;
    if (provider === 'groq')    return ERROR_MESSAGES.rate_groq;
    return ERROR_MESSAGES.rate_anthro;
  }
  if (status === 503) return ERROR_MESSAGES.overload;
  return ERROR_MESSAGES.server;
}

function _usage(model, inputTokens, outputTokens) {
  return { inputTokens: inputTokens, outputTokens: outputTokens, costUsd: _calcCost(model, inputTokens, outputTokens) };
}

function _calcCost(model, inputTokens, outputTokens) {
  var rates = MODEL_RATES[model];
  if (!rates) return 0;
  return _round6((inputTokens * rates.inputRate + outputTokens * rates.outputRate) / 1000000);
}

function _round6(n) { return Math.round(n * 1000000) / 1000000; }
