// ui/panel.js — Reddit Summarizer floating Shadow DOM panel
//
// Two-section panel (Post Summary + Discussion) with:
//   - Fixed position, right edge, Shadow DOM style isolation
//   - Collapse/expand toggle (chevron → 40px "AI" tab)
//   - Close button → trigger tab on right edge
//   - Per-section states: idle | loading | streaming | complete | error | noContent
//   - Re-summarize button
//
// Usage (from content.js):
//   var panel = createPanel();
//   document.body.appendChild(panel.host);
//   panel.show();
//   panel.setLoading('post');
//   panel.appendChunk('post', 'text...');
//   panel.setComplete('post');
//   panel.onResummarize(function() { /* restart */ });

'use strict';

var _PANEL_CSS = `
  :host { all: initial; }

  /* ── Trigger tab (shown when panel is closed) ── */
  .trigger-tab {
    position: fixed;
    right: 0;
    top: 80px;
    width: 28px;
    height: 64px;
    background: #FF4500;
    color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    display: none;
    align-items: center;
    justify-content: center;
    border-radius: 6px 0 0 6px;
    cursor: pointer;
    z-index: 999999;
    box-shadow: -2px 2px 8px rgba(0,0,0,0.18);
    user-select: none;
    transition: background 0.15s;
  }
  .trigger-tab:hover { background: #e03d00; }
  .trigger-tab.visible { display: flex; }

  /* ── Main panel ── */
  .panel {
    position: fixed;
    right: 16px;
    top: 80px;
    width: 320px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.16), 0 1px 4px rgba(0,0,0,0.08);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    color: #1a1a1b;
    overflow: hidden;
    display: none;
    transition: width 0.2s ease;
  }
  .panel.visible { display: block; }

  /* ── Collapsed state: 40px wide "AI" tab ── */
  .panel.collapsed {
    width: 40px;
    border-radius: 8px 0 0 8px;
    right: 0;
    cursor: pointer;
  }
  .panel.collapsed .panel-title,
  .panel.collapsed .btn-close,
  .panel.collapsed .panel-body { display: none; }
  .panel.collapsed .panel-header {
    flex-direction: column;
    height: 64px;
    padding: 0;
    justify-content: center;
    background: #FF4500;
    border-radius: 8px 0 0 8px;
  }
  .panel.collapsed .btn-collapse {
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    transform: none;
    padding: 0;
    height: auto;
  }
  .panel.collapsed .btn-collapse::before { content: 'AI'; }
  .panel.collapsed .btn-collapse .chevron { display: none; }

  /* ── Header ── */
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px 10px 14px;
    border-bottom: 1px solid #edeff1;
    background: #fff;
    gap: 6px;
  }
  .panel-title {
    font-weight: 700;
    font-size: 13px;
    color: #1a1a1b;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .btn-collapse,
  .btn-close {
    background: none;
    border: none;
    cursor: pointer;
    color: #878a8c;
    padding: 2px 4px;
    border-radius: 4px;
    font-size: 15px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .btn-collapse:hover,
  .btn-close:hover { background: #f6f7f8; color: #1a1a1b; }
  .btn-collapse .chevron { transition: transform 0.2s; display: inline-block; }
  .btn-collapse.collapsed-btn .chevron { transform: rotate(180deg); }

  /* ── Panel body ── */
  .panel-body {
    overflow-y: auto;
    max-height: calc(100vh - 160px);
  }

  /* ── Section ── */
  .section { padding: 12px 14px; }
  .section-label {
    font-weight: 600;
    font-size: 12px;
    color: #1a1a1b;
    margin-bottom: 8px;
  }
  .section-content {
    font-size: 12px;
    line-height: 1.6;
    color: #3c3c3c;
    min-height: 36px;
    word-break: break-word;
    white-space: pre-wrap;
  }

  /* idle */
  .section-content.idle { color: #b0b3b8; font-style: italic; }

  /* loading dots */
  .dots { display: flex; gap: 5px; align-items: center; padding: 4px 0; }
  .dot {
    width: 7px; height: 7px;
    background: #FF4500;
    border-radius: 50%;
    opacity: 0.3;
    animation: pulse 1.2s ease-in-out infinite;
  }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes pulse {
    0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
    40%           { opacity: 1;   transform: scale(1.1); }
  }

  /* streaming cursor */
  .cursor {
    display: inline-block;
    width: 1px;
    height: 1em;
    background: #FF4500;
    margin-left: 1px;
    vertical-align: text-bottom;
    animation: blink 0.8s step-end infinite;
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }

  /* error */
  .section-content.error { color: #d93025; }

  /* ── Divider ── */
  .divider {
    border: none;
    border-top: 1px solid #edeff1;
    margin: 0;
  }

  /* ── Re-summarize button ── */
  .btn-resummarize {
    display: block;
    width: calc(100% - 28px);
    margin: 4px 14px 14px;
    padding: 7px 0;
    background: #fff;
    border: 1px solid #edeff1;
    border-radius: 6px;
    color: #878a8c;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    text-align: center;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
  }
  .btn-resummarize:hover {
    background: #fff4f0;
    border-color: #FF4500;
    color: #FF4500;
  }
  .btn-resummarize[disabled] {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

/**
 * Creates the Reddit Summarizer floating panel.
 * @returns {{ host, show, hide, reset,
 *             setLoading, appendChunk, setComplete, setError, setNoContent,
 *             onResummarize }}
 */
function createPanel() {
  var host   = document.createElement('div');
  var shadow = host.attachShadow({ mode: 'open' });

  var style = document.createElement('style');
  style.textContent = _PANEL_CSS;
  shadow.appendChild(style);

  // ── Trigger tab ────────────────────────────────────────────────────────────
  var triggerTab = document.createElement('div');
  triggerTab.className = 'trigger-tab';
  triggerTab.textContent = 'AI';
  triggerTab.addEventListener('click', function() {
    triggerTab.classList.remove('visible');
    panel.classList.add('visible');
  });
  shadow.appendChild(triggerTab);

  // ── Main panel ─────────────────────────────────────────────────────────────
  var panel = document.createElement('div');
  panel.className = 'panel';

  // ── Header ─────────────────────────────────────────────────────────────────
  var header = document.createElement('div');
  header.className = 'panel-header';

  var titleEl = document.createElement('span');
  titleEl.className = 'panel-title';
  titleEl.textContent = 'Reddit Summarizer';

  var collapseBtn = document.createElement('button');
  collapseBtn.className = 'btn-collapse';
  collapseBtn.title = 'Collapse';
  var chevron = document.createElement('span');
  chevron.className = 'chevron';
  chevron.textContent = '›';
  collapseBtn.appendChild(chevron);
  collapseBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    _toggleCollapse();
  });

  var closeBtn = document.createElement('button');
  closeBtn.className = 'btn-close';
  closeBtn.title = 'Close';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', function() { hide(); });

  header.appendChild(titleEl);
  header.appendChild(collapseBtn);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // clicking header area when collapsed expands the panel
  header.addEventListener('click', function() {
    if (panel.classList.contains('collapsed')) _toggleCollapse();
  });

  // ── Panel body ─────────────────────────────────────────────────────────────
  var body = document.createElement('div');
  body.className = 'panel-body';

  // Post Summary section
  var postSection  = _makeSection('📄 Post Summary');
  var divider      = document.createElement('hr');
  divider.className = 'divider';
  // Discussion section
  var discSection  = _makeSection('💬 Discussion');

  // Re-summarize button
  var resumBtn = document.createElement('button');
  resumBtn.className = 'btn-resummarize';
  resumBtn.textContent = '↺  Re-summarize';
  resumBtn.addEventListener('click', function() {
    if (resumBtn.disabled) return;
    if (_onResummarizeCb) _onResummarizeCb();
  });

  body.appendChild(postSection.el);
  body.appendChild(divider);
  body.appendChild(discSection.el);
  body.appendChild(resumBtn);
  panel.appendChild(body);

  shadow.appendChild(panel);

  // ── Internal state ─────────────────────────────────────────────────────────
  var _onResummarizeCb = null;
  var _sections = { post: postSection, discussion: discSection };

  // ── Helpers ────────────────────────────────────────────────────────────────

  function _makeSection(labelText) {
    var el = document.createElement('div');
    el.className = 'section';

    var label = document.createElement('div');
    label.className = 'section-label';
    label.textContent = labelText;

    var content = document.createElement('div');
    content.className = 'section-content idle';

    el.appendChild(label);
    el.appendChild(content);
    return { el: el, content: content };
  }

  function _toggleCollapse() {
    var isCollapsed = panel.classList.toggle('collapsed');
    collapseBtn.classList.toggle('collapsed-btn', isCollapsed);
    collapseBtn.title = isCollapsed ? 'Expand' : 'Collapse';
  }

  function _setSectionState(key, state, text) {
    var sec = _sections[key];
    if (!sec) return;
    var c = sec.content;
    c.className = 'section-content';
    c.innerHTML = '';

    if (state === 'idle') {
      c.classList.add('idle');
    } else if (state === 'loading') {
      var dots = document.createElement('div');
      dots.className = 'dots';
      dots.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
      c.appendChild(dots);
    } else if (state === 'streaming') {
      c.textContent = text || '';
      var cursor = document.createElement('span');
      cursor.className = 'cursor';
      c.appendChild(cursor);
    } else if (state === 'complete') {
      c.textContent = text || '';
    } else if (state === 'error') {
      c.classList.add('error');
      c.textContent = '⚠ ' + (text || 'An error occurred.');
    } else if (state === 'noContent') {
      c.classList.add('idle');
      c.textContent = 'No comments yet.';
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  function show() {
    triggerTab.classList.remove('visible');
    panel.classList.add('visible');
  }

  function hide() {
    panel.classList.remove('visible');
    triggerTab.classList.add('visible');
  }

  function reset() {
    _setSectionState('post', 'idle');
    _setSectionState('discussion', 'idle');
    resumBtn.disabled = false;
  }

  function setLoading(section) {
    _setSectionState(section, 'loading');
    resumBtn.disabled = true;
  }

  function appendChunk(section, text) {
    var sec = _sections[section];
    if (!sec) return;
    var c = sec.content;
    // Remove existing cursor if present, append text, re-add cursor
    var cursor = c.querySelector('.cursor');
    if (cursor) cursor.remove();
    // Append text node
    c.appendChild(document.createTextNode(text));
    // Re-add cursor
    var newCursor = document.createElement('span');
    newCursor.className = 'cursor';
    c.appendChild(newCursor);
    // Scroll to bottom
    body.scrollTop = body.scrollHeight;
  }

  function setComplete(section) {
    var sec = _sections[section];
    if (!sec) return;
    var c = sec.content;
    var cursor = c.querySelector('.cursor');
    if (cursor) cursor.remove();
    resumBtn.disabled = false;
  }

  function setError(section, msg) {
    _setSectionState(section, 'error', msg);
    resumBtn.disabled = false;
  }

  function setNoContent(section) {
    _setSectionState(section, 'noContent');
  }

  function onResummarize(cb) {
    _onResummarizeCb = cb;
  }

  // Initialize both sections to idle
  reset();

  return {
    host:         host,
    show:         show,
    hide:         hide,
    reset:        reset,
    setLoading:   setLoading,
    appendChunk:  appendChunk,
    setComplete:  setComplete,
    setError:     setError,
    setNoContent: setNoContent,
    onResummarize: onResummarize
  };
}
