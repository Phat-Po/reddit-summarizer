// content.js — Reddit Summarizer Content Script
//
// Depends on (loaded before this by manifest.json):
//   model-config.js, selectors.js, ui/panel.js
//
// Responsibilities:
//   1. Detect Reddit post pages via isPostPage()
//   2. Inject the floating side panel (Shadow DOM)
//   3. Auto-trigger AI summarization on load and SPA navigation
//   4. Stream AI response into panel sections (Post Summary + Discussion)
//
// Storage: reads from chrome.storage.local (Task 6 migrates both sides to .sync)

'use strict';

// ─── System Prompts ───────────────────────────────────────────────────────────

var _SYS_POST = 'You are a helpful assistant. Summarize the following Reddit post in 2-3 clear, concise sentences. Focus on the main topic and key points.';
var _SYS_DISCUSSION = 'You are a helpful assistant. Summarize the key discussion points from the following Reddit comments in 3-5 bullet points. Capture the main opinions, insights, and any consensus or disagreement.';

var _MAX_COMMENT_CHARS = 6000;
var _MAX_COMMENTS      = 25;

// ─── State ────────────────────────────────────────────────────────────────────

var _panel    = null;
var _lastUrl  = location.href;
var _running  = false;

// ─── Entry Point ──────────────────────────────────────────────────────────────

console.log('[RS] Content script loaded on', location.href);

_init();

function _init() {
  _panel = createPanel();
  document.body.appendChild(_panel.host);

  if (isPostPage()) {
    _panel.show();
    _summarize();
  }

  _panel.onResummarize(function() {
    if (_running) return;
    _panel.reset();
    _summarize();
  });

  _startNavObserver();
}

// ─── Summarizer ───────────────────────────────────────────────────────────────

function _summarize() {
  if (_running) return;
  _running = true;

  chrome.storage.local.get(['apiKeys', 'selectedModel'], function(data) {
    var keys  = data.apiKeys || {};
    var model = data.selectedModel || EXT_MODEL_OPTIONS[0].id;
    var modelCfg = EXT_MODEL_OPTIONS.find(function(m) { return m.id === model; });
    var provider = modelCfg ? modelCfg.provider : 'anthropic';
    var apiKey   = keys[provider];

    if (!apiKey) {
      _panel.setError('post',       'No API key set. Open extension settings to add your key.');
      _panel.setError('discussion', 'No API key set. Open extension settings to add your key.');
      _running = false;
      return;
    }

    var content = _extractContent();

    // ── Post Summary ──────────────────────────────────────────────────────────
    _panel.setLoading('post');

    var postMsg = 'Title: ' + content.title;
    if (content.body) postMsg += '\n\nBody:\n' + content.body;

    _stream({
      provider:     provider,
      model:        model,
      apiKey:       apiKey,
      systemPrompt: _SYS_POST,
      userMessage:  postMsg,
      maxTokens:    400,
      temperature:  0.5,
      section:      'post',
      onDone: function() {
        // ── Discussion ──────────────────────────────────────────────────────
        if (content.comments.length === 0) {
          _panel.setNoContent('discussion');
          _running = false;
          return;
        }

        _panel.setLoading('discussion');

        var commentText = content.comments
          .slice(0, _MAX_COMMENTS)
          .join('\n---\n')
          .slice(0, _MAX_COMMENT_CHARS);

        var discMsg = 'Post title: ' + content.title + '\n\nComments:\n' + commentText;

        _stream({
          provider:     provider,
          model:        model,
          apiKey:       apiKey,
          systemPrompt: _SYS_DISCUSSION,
          userMessage:  discMsg,
          maxTokens:    500,
          temperature:  0.5,
          section:      'discussion',
          onDone: function() { _running = false; },
          onError: function() { _running = false; }
        });
      },
      onError: function() {
        _panel.setError('discussion', 'Post summary failed — discussion skipped.');
        _running = false;
      }
    });
  });
}

// ─── Streaming Helper ─────────────────────────────────────────────────────────

function _stream(opts) {
  var port;
  try {
    port = chrome.runtime.connect({ name: 'ai-stream' });
  } catch (e) {
    _panel.setError(opts.section, 'Could not connect to extension background.');
    if (opts.onError) opts.onError();
    return;
  }

  port.onMessage.addListener(function(msg) {
    if (msg.type === 'chunk') {
      _panel.appendChunk(opts.section, msg.text);
    } else if (msg.type === 'done') {
      _panel.setComplete(opts.section);
      port.disconnect();
      if (opts.onDone) opts.onDone();
    } else if (msg.type === 'error') {
      _panel.setError(opts.section, msg.message || 'Unknown error.');
      port.disconnect();
      if (opts.onError) opts.onError();
    }
  });

  port.onDisconnect.addListener(function() {
    // Background disconnected unexpectedly (e.g. service worker recycled)
    if (chrome.runtime.lastError) {
      _panel.setError(opts.section, 'Connection lost. Try re-summarizing.');
      if (opts.onError) opts.onError();
    }
  });

  port.postMessage({
    action:       'generate',
    provider:     opts.provider,
    model:        opts.model,
    apiKey:       opts.apiKey,
    systemPrompt: opts.systemPrompt,
    userMessage:  opts.userMessage,
    maxTokens:    opts.maxTokens,
    temperature:  opts.temperature
  });
}

// ─── Content Extraction ───────────────────────────────────────────────────────

function _extractContent() {
  var title    = (findPostTitle()   || '').trim();
  var body     = (findPostBody()    || '').trim();
  var rawNodes = findComments();

  var comments = [];
  for (var i = 0; i < rawNodes.length; i++) {
    var text = (rawNodes[i].textContent || '').trim();
    if (text) comments.push(text);
  }

  return { title: title, body: body, comments: comments };
}

// ─── SPA Navigation ───────────────────────────────────────────────────────────

function _startNavObserver() {
  var target = document.querySelector('title') || document.head;

  var observer = new MutationObserver(function() {
    if (location.href === _lastUrl) return;
    _lastUrl = location.href;
    console.log('[RS] Navigation:', location.href);

    if (isPostPage()) {
      _running = false;
      _panel.reset();
      _panel.show();
      _summarize();
    } else {
      _running = false;
      _panel.hide();
    }
  });

  observer.observe(target, { childList: true, subtree: true, characterData: true });

  window.addEventListener('popstate', function() {
    // popstate fires before MutationObserver on back/forward — trigger manually
    if (location.href !== _lastUrl) {
      _lastUrl = location.href;
      if (isPostPage()) {
        _running = false;
        _panel.reset();
        _panel.show();
        _summarize();
      } else {
        _running = false;
        _panel.hide();
      }
    }
  });
}
