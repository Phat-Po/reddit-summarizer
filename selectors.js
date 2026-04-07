// selectors.js — Reddit DOM Selector Module
//
// Verified against reddit.com (shreddit / new Reddit) on 2026-04-07.
// When Reddit updates its markup, only this file needs changing.
//
// Functions:
//   isPostPage()    — true if current URL is a Reddit post page
//   findPostTitle() — returns post title string (or null)
//   findPostBody()  — returns post body text (or null if no body / link post)
//   findPostMeta()  — returns { score, commentCount } from shreddit-post attributes
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
    if (val) { return val.trim(); }
  }

  // Strategy B: first h1 on the page
  el = document.querySelector('h1');
  if (el) { return el.textContent.trim(); }

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
    if (text) { return text; }
  }

  // Strategy B: legacy usertext-body class (old/transitional Reddit)
  el = document.querySelector('.usertext-body');
  if (el) {
    var text2 = el.innerText.trim();
    if (text2) { return text2; }
  }

  return null;
}

// ─── Post Meta ────────────────────────────────────────────────────────────────
// Reads score and comment count from shreddit-post element attributes.
// Returns { score: number, commentCount: number } — values default to 0 if not found.

function findPostMeta() {
  var el = document.querySelector('shreddit-post');
  if (!el) return { score: 0, commentCount: 0 };

  var score        = parseInt(el.getAttribute('score'),         10) || 0;
  var commentCount = parseInt(el.getAttribute('comment-count'), 10) || 0;

  return { score: score, commentCount: commentCount };
}

// ─── Comments ─────────────────────────────────────────────────────────────────
// Verified: shreddit-comment elements present (67 found).
// Text lives in DIV[slot=comment] inside each shreddit-comment.

function findComments() {
  var results = [];

  // Strategy A: shreddit-comment custom elements (verified working)
  var comments = document.querySelectorAll('shreddit-comment');
  if (comments.length > 0) {
    comments.forEach(function(c) {
      if (results.length >= 50) return;
      var textEl = c.querySelector('[slot="comment"]');
      if (!textEl) textEl = c.querySelector('p');
      if (textEl) {
        var text = (textEl.textContent || textEl.innerText || '').trim();
        if (text) results.push(text);
      }
    });
    if (results.length > 0) return results;
  }

  return results;
}
