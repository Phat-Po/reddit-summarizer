// ui/inject-button.js — Shadow DOM Button Injection
//
// Generic template. Customize:
//   - Button text (labelSpan.textContent)
//   - Button color (CSS --btn-bg)
//   - Injection position logic at the bottom of injectAIButton()
//
// Usage (from content.js):
//   var api = injectAIButton(anchorEl, onClickCallback);
//   if (api) api.setButtonState('loading' | 'idle' | 'error' | 'disabled');

'use strict';

var _BTN_CSS = `
:host {
  display: inline-flex;
  align-items: center;
  margin: 0 4px;
  flex-shrink: 0;
  vertical-align: middle;
}
.ai-btn {
  --btn-bg: #00B96B;
  height: 26px;
  border-radius: 13px;
  padding: 0 12px;
  background: var(--btn-bg);
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  user-select: none;
  transition: opacity 0.15s;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  outline: none;
  box-sizing: border-box;
}
.ai-btn:hover:not([disabled]) { opacity: 0.85; }
.ai-btn[data-state="loading"]  { opacity: 0.6; cursor: not-allowed; }
.ai-btn[data-state="error"]    { --btn-bg: #e53e3e; }
.ai-btn[data-state="disabled"] { --btn-bg: #ccc; cursor: not-allowed; color: #888; }
`;

/**
 * Injects a Shadow DOM button adjacent to `anchorEl`.
 *
 * @param {Element}  anchorEl        — Element to inject next to
 * @param {Function} onClickCallback — Called on click (not during loading/disabled)
 * @returns {{ host, buttonEl, setButtonState } | null}
 */
function injectAIButton(anchorEl, onClickCallback) {
  if (!anchorEl) return null;

  // Idempotency — don't inject twice into the same anchor
  if (anchorEl.hasAttribute('data-ext-btn-injected')) return null;
  anchorEl.setAttribute('data-ext-btn-injected', 'true');

  // Build Shadow DOM host
  var host   = document.createElement('span');
  var shadow = host.attachShadow({ mode: 'open' });

  var style = document.createElement('style');
  style.textContent = _BTN_CSS;
  shadow.appendChild(style);

  // Build button (all createElement, no innerHTML)
  var btn = document.createElement('button');
  btn.className = 'ai-btn';
  btn.setAttribute('data-state', 'idle');
  btn.setAttribute('type', 'button');

  var iconSpan = document.createElement('span');
  iconSpan.textContent = '✨';
  iconSpan.setAttribute('aria-hidden', 'true');

  var labelSpan = document.createElement('span');
  labelSpan.textContent = 'AI 改写'; // FILL_IN: button label

  btn.appendChild(iconSpan);
  btn.appendChild(labelSpan);
  shadow.appendChild(btn);

  btn.addEventListener('click', function() {
    var state = btn.getAttribute('data-state');
    if (state === 'loading' || state === 'disabled') return;
    if (typeof onClickCallback === 'function') onClickCallback();
  });

  // FILL_IN: choose injection position
  // Option A: insert after anchorEl
  if (anchorEl.parentNode) {
    anchorEl.parentNode.insertBefore(host, anchorEl.nextSibling);
  }
  // Option B: append inside anchorEl
  // anchorEl.appendChild(host);

  function setButtonState(state) {
    btn.setAttribute('data-state', state);
    btn.disabled = (state === 'loading' || state === 'disabled');
    switch (state) {
      case 'idle':     iconSpan.textContent = '✨'; labelSpan.textContent = 'AI 改写'; break;
      case 'loading':  iconSpan.textContent = '⏳'; labelSpan.textContent = '生成中…'; break;
      case 'error':    iconSpan.textContent = '⚠️'; labelSpan.textContent = 'AI 改写'; break;
      case 'disabled': iconSpan.textContent = '✨'; labelSpan.textContent = 'AI 改写'; break;
    }
  }

  return { host: host, buttonEl: btn, setButtonState: setButtonState };
}
