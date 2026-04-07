// settings.js — Settings page logic
// Generic template. Works with settings.html as-is.

'use strict';

document.addEventListener('DOMContentLoaded', function() {
  _buildModelDropdown();
  _loadAll();
  _bindHandlers();
  _watchStorage();
});

// ─── Model Dropdown ───────────────────────────────────────────────────────────

function _buildModelDropdown() {
  var select = document.getElementById('select-model');
  MODEL_OPTIONS.forEach(function(m) {
    var opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name + ' (' + (m.provider === 'anthropic' ? 'Anthropic' : 'OpenAI') + ')';
    select.appendChild(opt);
  });
  select.addEventListener('change', function() {
    chrome.storage.local.set({ selectedModel: select.value });
    _updateModelHint(select.value);
  });
}

function _updateModelHint(modelId) {
  var m = MODEL_OPTIONS.find(function(m) { return m.id === modelId; });
  var hint = document.getElementById('model-hint');
  if (hint) hint.textContent = m ? '供應商：' + (m.provider === 'anthropic' ? 'Anthropic' : 'OpenAI') : '';
}

// ─── Load All Settings ────────────────────────────────────────────────────────

function _loadAll() {
  chrome.storage.local.get(['apiKeys', 'selectedModel', 'defaultInstruction', 'usageToday'], function(data) {
    var keys = data.apiKeys || {};
    if (keys.anthropic) { document.getElementById('key-anthropic').value = keys.anthropic; _setStatus('anthropic', 'valid', '✓ 已設定'); }
    if (keys.openai)    { document.getElementById('key-openai').value    = keys.openai;    _setStatus('openai',    'valid', '✓ 已設定'); }

    var model = data.selectedModel || MODEL_OPTIONS[0].id;
    document.getElementById('select-model').value = model;
    _updateModelHint(model);

    document.getElementById('default-instruction').value = data.defaultInstruction || '';

    _renderUsage(data.usageToday || null);
  });
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

function _bindHandlers() {
  // Show/hide key toggle
  document.querySelectorAll('[data-toggle]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var input = document.getElementById(btn.getAttribute('data-toggle'));
      if (input) input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  // Save + validate API keys
  ['anthropic', 'openai'].forEach(function(provider) {
    var btn = document.getElementById('save-' + provider);
    if (!btn) return;
    btn.addEventListener('click', function() { _saveKey(provider, btn); });
  });

  // Save system instruction
  var saveInstrBtn = document.getElementById('save-instruction');
  if (saveInstrBtn) {
    saveInstrBtn.addEventListener('click', function() {
      var text = document.getElementById('default-instruction').value;
      chrome.storage.local.set({ defaultInstruction: text }, function() {
        var ind = document.getElementById('instruction-saved');
        if (ind) { ind.textContent = '✓ 已儲存'; setTimeout(function() { ind.textContent = ''; }, 2000); }
      });
    });
  }

  // Reset usage
  var resetBtn = document.getElementById('btn-reset-usage');
  if (resetBtn) {
    resetBtn.addEventListener('click', function() {
      if (!confirm('確定要重設今日使用紀錄？')) return;
      var empty = { date: _today(), calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
      chrome.storage.local.set({ usageToday: empty }, function() { _renderUsage(empty); });
    });
  }
}

function _saveKey(provider, btn) {
  var input = document.getElementById('key-' + provider);
  if (!input) return;
  var key = input.value.trim();
  if (!key) { _setStatus(provider, 'invalid', '✗ 請輸入金鑰'); return; }

  chrome.storage.local.get(['apiKeys'], function(data) {
    var keys = data.apiKeys || {};
    keys[provider] = key;
    chrome.storage.local.set({ apiKeys: keys });
  });

  _setStatus(provider, 'loading', '⏳ 驗證中…');
  btn.disabled = true;

  chrome.runtime.sendMessage({ action: 'validateKey', provider: provider, key: key }, function(resp) {
    btn.disabled = false;
    if (chrome.runtime.lastError || !resp) { _setStatus(provider, 'warn', '⚠ 無法驗證'); return; }
    if (resp.valid) _setStatus(provider, 'valid', '✓ 金鑰有效');
    else            _setStatus(provider, 'invalid', '✗ ' + (resp.error || '金鑰無效'));
  });
}

// ─── Usage Display ────────────────────────────────────────────────────────────

function _renderUsage(u) {
  var d = u || { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
  document.getElementById('today-calls').textContent  = (d.calls        || 0) + ' 次';
  document.getElementById('today-input').textContent  = (d.inputTokens  || 0).toLocaleString();
  document.getElementById('today-output').textContent = (d.outputTokens || 0).toLocaleString();
  var cost = d.costUsd || 0;
  document.getElementById('today-cost').textContent   = '$' + cost.toFixed(4) + ' USD ≈ NT$' + (cost * 32).toFixed(2);
}

// ─── Real-time Storage Watcher ────────────────────────────────────────────────

function _watchStorage() {
  chrome.storage.onChanged.addListener(function(changes, area) {
    if (area !== 'local') return;
    if (changes.usageToday)    _renderUsage(changes.usageToday.newValue);
    if (changes.selectedModel) { document.getElementById('select-model').value = changes.selectedModel.newValue; _updateModelHint(changes.selectedModel.newValue); }
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _setStatus(provider, type, text) {
  var el = document.getElementById('status-' + provider);
  if (!el) return;
  el.textContent = text;
  el.className = 'key-status key-status--' + type;
}

function _today() { return new Date().toISOString().slice(0, 10); }
