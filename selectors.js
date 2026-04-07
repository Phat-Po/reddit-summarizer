// selectors.js — Reddit DOM Selector Module
//
// All DOM queries for reddit.com go here.
// When Reddit updates its markup, only this file needs changing.
//
// Functions:
//   isPostPage()    — true if current URL is a Reddit post page
//   findPostTitle() — returns post title string (or null)
//   findPostBody()  — returns post body text (or null if no body)
//   findComments()  — returns array of comment text strings (top 50)

'use strict';

// ─── Page Detection ───────────────────────────────────────────────────────────

function isPostPage() {
  return /^https:\/\/www\.reddit\.com\/r\/[^/]+\/comments\//.test(location.href);
}

// ─── Post Title ───────────────────────────────────────────────────────────────

function findPostTitle() {
  var el;

  // Strategy A: data-testid on the post container's h1
  el = document.querySelector('[data-testid="post-title"]');
  if (el) { console.debug('[RS] findPostTitle: Strategy A'); return el.textContent.trim(); }

  // Strategy B: shreddit-post custom element attribute
  el = document.querySelector('shreddit-post');
  if (el && el.getAttribute('post-title')) {
    console.debug('[RS] findPostTitle: Strategy B');
    return el.getAttribute('post-title').trim();
  }

  // Strategy C: first h1 inside the main post container
  el = document.querySelector('h1');
  if (el) { console.debug('[RS] findPostTitle: Strategy C'); return el.textContent.trim(); }

  console.warn('[RS] findPostTitle: all strategies failed');
  return null;
}

// ─── Post Body ────────────────────────────────────────────────────────────────

function findPostBody() {
  var el;

  // Strategy A: shreddit text body slot
  el = document.querySelector('[slot="text-body"]');
  if (el) { console.debug('[RS] findPostBody: Strategy A'); return el.innerText.trim() || null; }

  // Strategy B: data-testid rtjson content
  el = document.querySelector('[data-testid="post-rtjson-content"]');
  if (el) { console.debug('[RS] findPostBody: Strategy B'); return el.innerText.trim() || null; }

  // Strategy C: usertext-body class (old/transitional Reddit)
  el = document.querySelector('.usertext-body');
  if (el) { console.debug('[RS] findPostBody: Strategy C'); return el.innerText.trim() || null; }

  console.debug('[RS] findPostBody: no body found (link post or empty)');
  return null;
}

// ─── Comments ─────────────────────────────────────────────────────────────────

function findComments() {
  var results = [];

  // Strategy A: shreddit-comment elements
  var comments = document.querySelectorAll('shreddit-comment');
  if (comments.length > 0) {
    console.debug('[RS] findComments: Strategy A (' + comments.length + ' found)');
    comments.forEach(function(c) {
      if (results.length >= 50) return;
      // Text lives in [slot="comment"] or a <p> inside
      var textEl = c.querySelector('[slot="comment"]') || c.querySelector('p');
      if (textEl) {
        var text = textEl.innerText.trim();
        if (text) results.push(text);
      }
    });
    if (results.length > 0) return results;
  }

  // Strategy B: data-testid="comment"
  comments = document.querySelectorAll('[data-testid="comment"]');
  if (comments.length > 0) {
    console.debug('[RS] findComments: Strategy B (' + comments.length + ' found)');
    comments.forEach(function(c) {
      if (results.length >= 50) return;
      var textEl = c.querySelector('.text-neutral-content') || c.querySelector('p');
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
