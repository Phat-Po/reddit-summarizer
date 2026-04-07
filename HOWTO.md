# Chrome Extension Base Template

## What's included

| File | Status | What you do |
|------|--------|-------------|
| `manifest.json` | FILL_IN | Site URL, extension name |
| `background.js` | Ready | Nothing — works as-is |
| `model-config.js` | Ready | Nothing — update prices if needed |
| `selectors.js` | FILL_IN | Add DOM query functions for target site |
| `content.js` | FILL_IN | Fill in `_extractContent()`, `_buildUserMessage()`, `_onReplace()` |
| `ui/inject-button.js` | Minor | Change label text + color CSS variable |
| `ui/panel.js` | Minor | Change title, add more result sections if needed |
| `settings/settings.html` | Minor | Change title/heading text |
| `settings/settings.js` | Ready | Nothing |
| `settings/settings.css` | Ready | Nothing |
| `icons/` | FILL_IN | Add 16/32/48/128px PNG icons |

---

## Step 1: Get selectors from the target site

Open DevTools Console on the target page and paste this bookmarklet script:

```javascript
(function(){
  var o = [];
  document.querySelectorAll('label').forEach(function(l) {
    if (l.getAttribute('for')) o.push('LABEL[for="' + l.getAttribute('for') + '"] → "' + l.textContent.trim().slice(0,30) + '"');
  });
  document.querySelectorAll('input:not([type=hidden]),textarea').forEach(function(e) {
    o.push('INPUT id=' + e.id + ' placeholder="' + e.placeholder + '" maxlength=' + e.maxLength);
  });
  document.querySelectorAll('iframe').forEach(function(e) {
    o.push('IFRAME id=' + e.id + ' class=' + e.className);
  });
  prompt('Copy these selectors:', o.join('\n'));
})();
```

Paste the output at the top of `selectors.js`, then write the selector functions.

**Bookmarklet version** (save as a browser bookmark, click on any page):
```
javascript:(function(){var o=[];document.querySelectorAll('label').forEach(function(l){if(l.getAttribute('for'))o.push('LABEL[for="'+l.getAttribute('for')+'"] → "'+l.textContent.trim().slice(0,30)+'"');});document.querySelectorAll('input:not([type=hidden]),textarea').forEach(function(e){o.push('INPUT id='+e.id+' placeholder="'+e.placeholder+'" maxlength='+e.maxLength);});document.querySelectorAll('iframe').forEach(function(e){o.push('IFRAME id='+e.id+' class='+e.className);});prompt('Selectors:',o.join('\n'));})();
```

---

## Step 2: Fill in manifest.json

```json
"host_permissions": ["https://www.YOUR-SITE.com/*", ...]
"content_scripts" matches: ["https://www.YOUR-SITE.com/path/*"]
"name": "Your Extension Name"
```

---

## Step 3: Fill in content.js

Three functions to implement:

**`_extractContent()`** — read data from the page:
```js
function _extractContent() {
  var input = findPrimaryInput();
  return { title: input ? input.value : '' };
}
```

**`_buildUserMessage(extracted)`** — format for the AI:
```js
function _buildUserMessage(extracted) {
  return '[標題]\n' + extracted.title;
}
```

**`_onReplace(field, text)`** — write AI result back to page:
```js
function _onReplace(field, text) {
  if (field === 'result') {
    var input = findPrimaryInput();
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));  // Vue/React reactivity
  }
}
```

---

## Step 4: Add icons

Create simple colored PNGs at 16, 32, 48, 128px and put them in `icons/`.
Quick option: use any online favicon generator.

---

## Step 5: Load in Chrome

1. Go to `chrome://extensions`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select this folder

---

## Storage keys used

| Key | Type | Description |
|-----|------|-------------|
| `apiKeys` | `{ anthropic, openai }` | API keys |
| `selectedModel` | string | Model ID |
| `defaultInstruction` | string | System prompt |
| `usageToday` | `{ date, calls, inputTokens, outputTokens, costUsd }` | Daily usage |

---

## Reference projects

- `20260321__extension__shopee-ai-reply-assistant` — chat reply assistant (complex selector patterns)
- `20260407__extension__easyboss-extension` — product description rewriter (TinyMCE iframe, Vue reactivity)
