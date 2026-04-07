// selectors.js — Reddit DOM Selector Module
//
// Verified against reddit.com (shreddit / new Reddit) on 2026-04-07.
// When Reddit updates its markup, only this file needs changing.
//
// Functions:
//   isPostPage()    — true if current URL is a Reddit post page
//   findPostTitle() — returns post title string (or null)
//   findPostBody()  — returns post body text (or null if no body / link post)
//   findComments()  — returns array of comment text strings (up to 50)

'use strict';

// ─── Page Detection ───────────────────────────────────────────────────────────

function isPostPage() {
  return /^https:\/\/www\.reddit\.com\/r\/[^/]+\/comments\//.test(location.href);
}

// ─── Post Title ───────────────────────────────────────────────────────────────
// Verified: shreddit-post[post-title] attr works; h1 as fallback.
// [data-testid="post-title"] does NOT exist on new Reddit.

function findPostTitle() {
  var el, val;

  // Strategy A: shreddit-post custom element attribute (most reliable)
  el = document.querySelector('shreddit-post');
  if (el) {
    val = el.getAttribute('post-title');
    if (val) { console.debug('[RS] findPostTitle: Strategy A'); return val.trim(); }
  }

  // Strategy B: first h1 on the page
  el = document.querySelector('h1');
  if (el) { console.debug('[RS] findPostTitle: Strategy B'); return el.textContent.trim(); }

  console.warn('[RS] findPostTitle: all strategies failed');
  return null;
}

// ─── Post Body ────────────────────────────────────────────────────────────────
// Verified: [slot="text-body"] works for text posts.
// Returns null for link posts or posts with no body text.

function findPostBody() {
  var el;

  // Strategy A: shreddit text body slot (verified working)
  el = document.querySelector('[slot="text-body"]');
  if (el) {
    var text = el.innerText.trim();
    if (text) { console.debug('[RS] findPostBody: Strategy A'); return text; }
  }

  // Strategy B: legacy usertext-body class (old/transitional Reddit)
  el = document.querySelector('.usertext-body');
  if (el) {
    var text2 = el.innerText.trim();
    if (text2) { console.debug('[RS] findPostBody: Strategy B'); return text2; }
  }

  console.debug('[RS] findPostBody: no body (link post or empty)');
  return null;
}

// ─── Comments ─────────────────────────────────────────────────────────────────
// Verified: shreddit-comment elements present (67 found).
// Text lives in DIV[slot=comment] inside each shreddit-comment.

function findComments() {
  var results = [];

  // Strategy A: shreddit-comment custom elements (verified working)
  var comments = document.querySelectorAll('shreddit-comment');
  if (comments.length > 0) {
    console.debug('[RS] findComments: Strategy A (' + comments.length + ' found)');
    comments.forEach(function(c) {
      if (results.length >= 50) return;
      var textEl = c.querySelector('[slot="comment"]');
      if (!textEl) textEl = c.querySelector('p');
      if (textEl) {
        var text = textEl.innerText.trim();
        if (text) results.push(text);
      }
    });
    if (results.length > 0) return results;
  }

  console.warn('[RS] findComments: all strategies failed');
  return results;
}
