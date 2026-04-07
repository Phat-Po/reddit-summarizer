// content.js — Main Content Script Orchestration
//
// Responsibilities:
//   1. Inject the AI button into the target page
//   2. Re-inject after SPA navigation (MutationObserver + popstate/hashchange)
//   3. On button click: extract content, open panel, stream AI response
//   4. Handle Replace and Copy actions from the panel
//
// Depends on (loaded before this by manifest.json):
//   model-config.js, selectors.js, ui/inject-button.js, ui/panel.js

'use strict';

// ─── State ────────────────────────────────────────────────────────────────────

var _panel      = null;   // panel instance from createPanel()
var _buttonApi  = null;   // { host, buttonEl, setButtonState } from injectAIButton()
var _activePort = null;   // chrome.runtime.Port for current streaming request
var _injecting  = false;  // debounce flag

// ─── Entry Point ──────────────────────────────────────────────────────────────

console.log('[EXT] Content script loaded on', location.href);
_scheduleInjection();

// ─── Injection ────────────────────────────────────────────────────────────────

function _scheduleInjection() {
  _tryInject();
  setTimeout(_tryInject, 800);
  setTimeout(_tryInject, 2500);
}

function _tryInject() {
  if (_injecting) return;
  _injecting = true;

  var anchor = findInjectionAnchor();
  if (!anchor) {
    console.debug('[EXT] Injection anchor not found, will retry via observer');
    _injecting = false;
    return;
  }

  _buttonApi = injectAIButton(anchor, _onButtonClick);
  if (_buttonApi) {
    console.log('[EXT] Button injected successfully');
  }
  _injecting = false;
}

// ─── SPA Navigation Support ───────────────────────────────────────────────────
// MutationObserver detects DOM changes after Vue/React route transitions.
// popstate + hashchange catch programmatic navigation.

var _observer = new MutationObserver(_debounce(function() {
  // Re-inject if button was removed from DOM
  if (_buttonApi && !document.body.contains(_buttonApi.host)) {
    console.log('[EXT] Button lost from DOM, re-injecting');
    _buttonApi = null;
    _scheduleInjection();
  }
  // Also attempt injection if not yet done
  if (!_buttonApi) _tryInject();
}, 300));

_observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener('popstate',   _scheduleInjection);
window.addEventListener('hashchange', _scheduleInjection);

// ─── Button Click Handler ─────────────────────────────────────────────────────

function _onButtonClick() {
  // 1. Load settings
  chrome.storage.local.get(['apiKeys', 'selectedModel', 'defaultInstruction'], function(settings) {
    var apiKeys     = settings.apiKeys     || {};
    var model       = settings.selectedModel || EXT_MODEL_OPTIONS[0].id;
    var instruction = settings.defaultInstruction || '';

    // Determine provider from selected model
    var modelDef = EXT_MODEL_OPTIONS.find(function(m) { return m.id === model; });
    var provider = modelDef ? modelDef.provider : 'anthropic';
    var apiKey   = provider === 'anthropic' ? apiKeys.anthropic : apiKeys.openai;

    if (!apiKey) {
      alert('請先在設定頁填入 API 金鑰');
      chrome.runtime.sendMessage({ action: 'openSettings' });
      return;
    }

    // 2. Extract content from page
    var extracted = _extractContent();

    // 3. Create/show panel
    if (!_panel) {
      _panel = createPanel(_onReplace, _onCopy);
      // Insert panel into page — FILL_IN: choose appropriate insertion point
      var anchor = findInjectionAnchor();
      if (anchor && anchor.parentElement) {
        anchor.parentElement.insertAdjacentElement('afterend', _panel.host);
      } else {
        document.body.appendChild(_panel.host);
      }
    }

    _panel.setInstruction(instruction);
    _panel.setCapturedContent(extracted);
    _panel.show();

    // 4. Wire up generate button
    _panel.onGenerate(function() {
      _runGenerate(provider, model, apiKey, _panel.getInstruction(), extracted);
    });
  });
}

// ─── Content Extraction ───────────────────────────────────────────────────────
// FILL_IN: implement extraction logic for your target page

function _extractContent() {
  var result = {};

  // Example:
  // var input = findPrimaryInput();
  // result.title = input ? input.value : '';

  // result.description = _extractDescription();
  // result.images = _extractImages();

  return result;
}

// ─── AI Generation ────────────────────────────────────────────────────────────

function _runGenerate(provider, model, apiKey, instruction, extracted) {
  // Cancel any in-flight request
  if (_activePort) {
    try { _activePort.disconnect(); } catch (e) {}
    _activePort = null;
  }

  _buttonApi && _buttonApi.setButtonState('loading');
  _panel.setLoading();

  var userMessage = _buildUserMessage(extracted);

  var port = chrome.runtime.connect({ name: 'ai-stream' });
  _activePort = port;

  port.postMessage({
    action:       'generate',
    provider:     provider,
    model:        model,
    apiKey:       apiKey,
    systemPrompt: instruction,
    userMessage:  userMessage,
    maxTokens:    2000,
    temperature:  0.7
  });

  port.onMessage.addListener(function(msg) {
    if (msg.type === 'chunk') {
      _panel.appendChunk(msg.text);
    } else if (msg.type === 'done') {
      _buttonApi && _buttonApi.setButtonState('idle');
      _panel.setComplete(msg.usage);
      _activePort = null;
    } else if (msg.type === 'error') {
      _buttonApi && _buttonApi.setButtonState('error');
      _panel.setError(msg.message);
      _activePort = null;
    }
  });

  port.onDisconnect.addListener(function() {
    _activePort = null;
  });
}

// ─── User Message Builder ─────────────────────────────────────────────────────
// FILL_IN: format extracted content into a prompt for the AI

function _buildUserMessage(extracted) {
  var parts = [];

  // Example:
  // if (extracted.title)       parts.push('[標題]\n' + extracted.title);
  // if (extracted.description) parts.push('[描述]\n' + extracted.description);
  // if (extracted.images && extracted.images.length)
  //   parts.push('[圖片]\n' + extracted.images.join('\n'));

  return parts.join('\n\n');
}

// ─── Replace & Copy Handlers ──────────────────────────────────────────────────
// FILL_IN: implement how results are written back to the page

function _onReplace(field, text) {
  // Example for a plain input:
  // if (field === 'title') {
  //   var input = findPrimaryInput();
  //   if (!input) return;
  //   input.value = text;
  //   input.dispatchEvent(new Event('input',  { bubbles: true }));
  //   input.dispatchEvent(new Event('change', { bubbles: true }));
  // }
  console.log('[EXT] Replace', field, text.slice(0, 50) + '...');
}

function _onCopy(field, text) {
  navigator.clipboard.writeText(text).catch(function() {
    // Fallback for environments where clipboard API isn't available
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _debounce(fn, delay) {
  var timer;
  return function() {
    clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
}
