// content.js — Reddit Summarizer Content Script
//
// Responsibilities (fully implemented in Tasks 4 & 5):
//   1. Detect Reddit post pages via isPostPage()
//   2. Inject the floating side panel (Shadow DOM)
//   3. Auto-trigger AI summarization on load and SPA navigation
//   4. Stream AI response into panel sections (Post Summary + Discussion)
//
// Depends on (loaded before this by manifest.json):
//   model-config.js, selectors.js, ui/panel.js

'use strict';

// ─── Entry Point ──────────────────────────────────────────────────────────────

console.log('[RS] Content script loaded on', location.href);

if (isPostPage()) {
  console.log('[RS] Post page detected — panel will be initialized in Task 3');
} else {
  console.log('[RS] Not a post page, standing by');
}

// ─── SPA Navigation Stub ──────────────────────────────────────────────────────
// Full implementation in Task 4

var _lastUrl = location.href;

var _navObserver = new MutationObserver(function() {
  if (location.href !== _lastUrl) {
    _lastUrl = location.href;
    console.log('[RS] SPA navigation detected:', location.href);
    if (isPostPage()) {
      console.log('[RS] Navigated to post page — will trigger summarizer');
    } else {
      console.log('[RS] Navigated away from post page — will hide panel');
    }
  }
});

_navObserver.observe(document.querySelector('title') || document.head, {
  childList: true,
  subtree: true,
  characterData: true
});

window.addEventListener('popstate', function() {
  console.log('[RS] popstate:', location.href);
});
