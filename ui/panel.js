// ui/panel.js — Shadow DOM Inline Panel
//
// Generic AI result panel with:
//   - System instruction editor (pre-filled from settings)
//   - "开始生成" button
//   - Streaming result area
//   - Replace + Copy action buttons
//   - Close button
//
// Customize:
//   - _PANEL_CSS colors/dimensions
//   - Number of result sections (default: one generic "result")
//   - Labels and placeholder text
//
// Usage (from content.js):
//   var panel = createPanel(onReplace, onCopy);
//   document.body.appendChild(panel.host);
//   panel.setCapturedContent({ title: '...', description: '...' });
//   panel.setInstruction('System prompt text');
//   panel.show();
//   panel.onGenerate(function() { /* start streaming */ });
//   panel.appendChunk('text chunk');
//   panel.setComplete({ costUsd: 0.001 });
//   panel.setError('error message');

'use strict';

var _PANEL_CSS = `
:host { display: block; }
.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-top: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  color: #333;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.panel-title { font-weight: 600; font-size: 14px; }
.btn-close {
  background: none; border: none; cursor: pointer;
  font-size: 16px; color: #888; padding: 2px 6px; border-radius: 4px;
}
.btn-close:hover { background: #f0f0f0; }
.preview {
  background: #f7fafc;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
  font-size: 12px;
  color: #555;
}
.preview-label { font-weight: 600; color: #333; margin-bottom: 2px; }
.instruction-label { font-weight: 600; margin-bottom: 4px; font-size: 12px; }
.instruction-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 8px;
  font-size: 12px;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  margin-bottom: 10px;
  outline: none;
}
.instruction-textarea:focus { border-color: #00B96B; }
.btn-generate {
  background: #00B96B;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  width: 100%;
  margin-bottom: 12px;
  transition: opacity 0.15s;
}
.btn-generate:hover:not([disabled]) { opacity: 0.85; }
.btn-generate[disabled] { opacity: 0.5; cursor: not-allowed; }
.result-section { margin-top: 12px; }
.result-label { font-weight: 600; font-size: 12px; margin-bottom: 4px; }
.result-text {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px;
  min-height: 48px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 6px;
}
.result-actions { display: flex; gap: 6px; }
.btn-action {
  flex: 1;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 5px;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.1s;
}
.btn-action:hover { background: #f0f0f0; }
.btn-action--primary { border-color: #00B96B; color: #00B96B; }
.status-bar {
  margin-top: 10px;
  font-size: 11px;
  color: #888;
  min-height: 16px;
}
.status-bar--error { color: #e53e3e; }
`;

/**
 * Creates the inline AI result panel.
 *
 * @param {Function} onReplace - Called with (field, text) when Replace is clicked
 * @param {Function} onCopy    - Called with (field, text) when Copy is clicked
 * @returns {{ host, show, hide, setCapturedContent, setInstruction, getInstruction,
 *             onGenerate, appendChunk, setLoading, setComplete, setError }}
 */
function createPanel(onReplace, onCopy) {
  var host   = document.createElement('div');
  var shadow = host.attachShadow({ mode: 'open' });

  var style = document.createElement('style');
  style.textContent = _PANEL_CSS;
  shadow.appendChild(style);

  var panel = document.createElement('div');
  panel.className = 'panel';

  // ── Header ────────────────────────────────────────────────────────────────
  var header = document.createElement('div');
  header.className = 'panel-header';

  var title = document.createElement('span');
  title.className = 'panel-title';
  title.textContent = '✨ AI 改写'; // FILL_IN: panel title

  var closeBtn = document.createElement('button');
  closeBtn.className = 'btn-close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', function() { hide(); });

  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // ── Content Preview ───────────────────────────────────────────────────────
  var preview = document.createElement('div');
  preview.className = 'preview';
  preview.style.display = 'none';
  panel.appendChild(preview);

  // ── System Instruction ────────────────────────────────────────────────────
  var instrLabel = document.createElement('div');
  instrLabel.className = 'instruction-label';
  instrLabel.textContent = '系统指令';

  var instrTA = document.createElement('textarea');
  instrTA.className = 'instruction-textarea';
  instrTA.placeholder = '输入 AI 系统指令...';
  instrTA.rows = 4;

  panel.appendChild(instrLabel);
  panel.appendChild(instrTA);

  // ── Generate Button ───────────────────────────────────────────────────────
  var genBtn = document.createElement('button');
  genBtn.className = 'btn-generate';
  genBtn.textContent = '开始生成';
  genBtn.addEventListener('click', function() {
    if (genBtn.disabled) return;
    if (_onGenerateCb) _onGenerateCb();
  });
  panel.appendChild(genBtn);

  // ── Result Section ────────────────────────────────────────────────────────
  // FILL_IN: add more sections (e.g. title + description) by duplicating this block
  var resultSection = document.createElement('div');
  resultSection.className = 'result-section';

  var resultLabel = document.createElement('div');
  resultLabel.className = 'result-label';
  resultLabel.textContent = '生成结果';

  var resultText = document.createElement('div');
  resultText.className = 'result-text';

  var resultActions = document.createElement('div');
  resultActions.className = 'result-actions';

  var replaceBtn = document.createElement('button');
  replaceBtn.className = 'btn-action btn-action--primary';
  replaceBtn.textContent = '替换';
  replaceBtn.addEventListener('click', function() {
    if (onReplace) onReplace('result', resultText.textContent);
  });

  var copyBtn = document.createElement('button');
  copyBtn.className = 'btn-action';
  copyBtn.textContent = '复制';
  copyBtn.addEventListener('click', function() {
    if (onCopy) onCopy('result', resultText.textContent);
    copyBtn.textContent = '✓ 已复制';
    setTimeout(function() { copyBtn.textContent = '复制'; }, 1500);
  });

  resultActions.appendChild(replaceBtn);
  resultActions.appendChild(copyBtn);
  resultSection.appendChild(resultLabel);
  resultSection.appendChild(resultText);
  resultSection.appendChild(resultActions);
  panel.appendChild(resultSection);

  // ── Status Bar ────────────────────────────────────────────────────────────
  var statusBar = document.createElement('div');
  statusBar.className = 'status-bar';
  panel.appendChild(statusBar);

  shadow.appendChild(panel);
  host.style.display = 'none';

  // ── Internal state ────────────────────────────────────────────────────────
  var _onGenerateCb = null;

  // ── Public API ────────────────────────────────────────────────────────────

  function show() { host.style.display = 'block'; }
  function hide() { host.style.display = 'none'; _reset(); }

  function setCapturedContent(data) {
    // FILL_IN: format your extracted data into the preview div
    // Example:
    // preview.style.display = 'block';
    // preview.innerHTML = '';
    // var label = document.createElement('div');
    // label.className = 'preview-label';
    // label.textContent = '已捕获：' + (data.title || '').slice(0, 40);
    // preview.appendChild(label);
  }

  function setInstruction(text) { instrTA.value = text || ''; }
  function getInstruction()     { return instrTA.value; }

  function onGenerate(cb)       { _onGenerateCb = cb; }

  function appendChunk(text) {
    resultText.textContent += text;
    resultText.scrollTop = resultText.scrollHeight;
  }

  function setLoading() {
    genBtn.disabled = true;
    genBtn.textContent = '生成中…';
    resultText.textContent = '';
    statusBar.className = 'status-bar';
    statusBar.textContent = '';
  }

  function setComplete(usage) {
    genBtn.disabled = false;
    genBtn.textContent = '重新生成';
    if (usage && usage.costUsd !== undefined) {
      statusBar.textContent = '费用：$' + usage.costUsd.toFixed(4) + ' USD';
    }
  }

  function setError(message) {
    genBtn.disabled = false;
    genBtn.textContent = '重试';
    statusBar.className = 'status-bar status-bar--error';
    statusBar.textContent = '错误：' + message;
  }

  function _reset() {
    resultText.textContent = '';
    statusBar.textContent  = '';
    statusBar.className    = 'status-bar';
    genBtn.disabled        = false;
    genBtn.textContent     = '开始生成';
  }

  return { host: host, show: show, hide: hide, setCapturedContent: setCapturedContent,
           setInstruction: setInstruction, getInstruction: getInstruction,
           onGenerate: onGenerate, appendChunk: appendChunk,
           setLoading: setLoading, setComplete: setComplete, setError: setError };
}
