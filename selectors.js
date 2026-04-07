// selectors.js — DOM Selector Abstraction Module
//
// ALL DOM queries for the target site go here.
// When the site updates its markup, only this file needs changing.
//
// Pattern for every function:
//   1. Try Strategy A (most specific/semantic)
//   2. Try Strategy B (attribute-based fallback)
//   3. Try Strategy C (structural/text-walk fallback)
//   4. Log which strategy matched
//   5. Return null on total failure (never throw)
//
// ── HOW TO FILL THIS IN ────────────────────────────────────────────────────────
//
//  1. Open target page in Chrome
//  2. Open DevTools Console and paste the inspector bookmarklet:
//     javascript:(function(){var o=[];document.querySelectorAll('label').forEach(function(l){if(l.getAttribute('for'))o.push('LABEL[for="'+l.getAttribute('for')+'"] → "'+l.textContent.trim().slice(0,30)+'"');});document.querySelectorAll('input:not([type=hidden]),textarea').forEach(function(e){o.push('INPUT: id='+e.id+' placeholder='+e.placeholder+' maxlength='+e.maxLength);});document.querySelectorAll('iframe').forEach(function(e){o.push('IFRAME: id='+e.id+' class='+e.className);});prompt('Selectors',o.join('\n'));})();
//  3. Paste the output here as a comment, then write the selector functions below
//
// ─── PASTE YOUR SELECTORS HERE ────────────────────────────────────────────────
//
// Example output:
//   LABEL[for="title"] → "产品标题"
//   INPUT: id= placeholder=标题不能为空 maxlength=60
//   IFRAME: id=tinymceId_437_ifr class=tox-edit-area__iframe
//
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

// ─── FILL IN: Primary target element ─────────────────────────────────────────
// Example: the main input or content area the extension reads from

function findPrimaryInput() {
  // Strategy A: most specific — attribute or semantic selector
  // var el = document.querySelector('FILL_IN');
  // if (el) { console.debug('[EXT] findPrimaryInput: Strategy A'); return el; }

  // Strategy B: attribute-based fallback
  // var el = document.querySelector('input[placeholder="FILL_IN"]');
  // if (el) { console.debug('[EXT] findPrimaryInput: Strategy B'); return el; }

  // Strategy C: walk from a label
  // var label = _findLabelByText('FILL_IN');
  // if (label) {
  //   var input = document.getElementById(label.getAttribute('for'));
  //   if (input) { console.debug('[EXT] findPrimaryInput: Strategy C'); return input; }
  // }

  console.warn('[EXT] findPrimaryInput: all strategies failed');
  return null;
}

// ─── FILL IN: Button injection anchor ────────────────────────────────────────
// The element next to which you'll inject your button

function findInjectionAnchor() {
  // Strategy A
  // var el = document.querySelector('FILL_IN');
  // if (el) { console.debug('[EXT] findInjectionAnchor: Strategy A'); return el; }

  // Strategy B: walk from label text
  // var label = _findLabelByText('FILL_IN');
  // if (label) { console.debug('[EXT] findInjectionAnchor: Strategy B'); return label; }

  console.warn('[EXT] findInjectionAnchor: all strategies failed');
  return null;
}

// ─── ADD MORE functions as needed ─────────────────────────────────────────────
// Pattern:
//
// function findXxx() {
//   var el;
//   // Strategy A
//   el = document.querySelector('...');
//   if (el) { console.debug('[EXT] findXxx: Strategy A'); return el; }
//   // Strategy B
//   ...
//   console.warn('[EXT] findXxx: all strategies failed');
//   return null;
// }

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _findLabelByText(text) {
  var labels = document.querySelectorAll('label');
  for (var i = 0; i < labels.length; i++) {
    if (labels[i].textContent.trim().indexOf(text) !== -1) return labels[i];
  }
  return null;
}
