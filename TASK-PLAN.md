# Reddit Summarizer — MVP Task Plan

**Version**: 1.0
**Date**: 2026-04-07

---

## Task 1: Project Scaffolding & Base Template

**Goal**: Extension 能在 Chrome 載入，不報錯

**Deliverables**:
- Copy base template from `_TEMPLATES/chrome-extension-base/`
- Update `manifest.json`:
  - name: "Reddit Summarizer"
  - host_permissions: `https://www.reddit.com/*`
  - content_scripts matches: `https://www.reddit.com/r/*/comments/*`
- Placeholder icons (16/48/128px)
- `background.js` — template dual-provider streaming proxy (use as-is)
- `model-config.js` — template model list (use as-is)
- `content.js` — skeleton with console.log on injection
- `selectors.js` — empty shells

**Acceptance**:
- Loads in `chrome://extensions` with no errors
- Open any Reddit post → DevTools console shows injection log

---

## Task 2: DOM Selectors (`selectors.js`)

**Goal**: Reliably extract post title, body, and comments from Reddit's DOM

**Deliverables**:
- `selectors.js` with:
  - `findPostTitle()` — returns post title string
  - `findPostBody()` — returns post body text (null if no body)
  - `findComments()` — returns array of comment text strings (top 50)
  - `isPostPage()` — returns true if current URL is a post page

**Selector strategy** (in priority order):
- `[data-testid="post-title"]`, `h1` in post container
- `[data-testid="post-rtjson-content"]` or `[slot="text-body"]`
- Comments: `[data-testid="comment"]` → `.text-neutral-content` or `p` inside

**Acceptance**:
- Run each function in DevTools console on a Reddit post → returns correct data
- Works on text posts, link posts, and posts with no body

---

## Task 3: Floating Side Panel (`ui/panel.js`)

**Goal**: Shadow DOM panel appears on the right side of Reddit post pages

**Deliverables**:
- `ui/panel.js` — Shadow DOM component with:
  - Panel container (320px wide, fixed right side)
  - Two sections: "Post Summary" + "Discussion"
  - States: idle / loading (animated dots) / streaming (text + cursor) / error
  - Collapse/expand toggle button (chevron)
  - Re-summarize button (bottom)
  - Close button → hides panel, shows small floating trigger tab
- `ui/panel.css` — styles scoped inside Shadow DOM

**Acceptance**:
- Panel renders correctly on Reddit post page
- Collapse/expand works
- Close → trigger tab → reopen works
- No visual conflict with Reddit UI

---

## Task 4: Content Extraction & SPA Navigation (`content.js`)

**Goal**: Auto-trigger on post pages, re-trigger on SPA navigation

**Deliverables**:
- `content.js` implementing:
  - `_extractContent()` — calls selectors, returns `{ title, body, comments }`
  - `_buildUserMessage()` — formats extracted content into AI prompt
  - `_onReplace()` — handles panel reset when new content detected
  - SPA detection: `MutationObserver` on `<title>` + `popstate` listener
  - On URL change to post page: reset panel → call `_extractContent()` → trigger AI
  - On URL change away from post page: hide panel

**Acceptance**:
- Open Reddit post → panel auto-triggers and shows extracted content in console
- Navigate to another post (without page refresh) → panel resets and re-triggers
- Navigate to subreddit listing → panel hides

---

## Task 5: AI Integration & Streaming

**Goal**: Extracted content sent to AI, response streams into panel

**Deliverables**:
- `background.js` update (minimal — template handles most):
  - System prompt with language variable
  - Route post summary and discussion summary as two sequential requests
- `content.js` update:
  - Connect to background via `chrome.runtime.Port`
  - Send post summary request → stream into "Post Summary" section
  - On post summary complete → send discussion request → stream into "Discussion" section
  - Handle: no API key (show settings link), API error (show error state)

**AI Prompt**:
- Post Summary: "Summarize this Reddit post in 3-5 sentences.\n\nTitle: {title}\nBody: {body}"
- Discussion: "Summarize the key discussion points from these Reddit comments in 4-6 bullet points.\n\n{comments}"
- Language injected from `chrome.storage.sync`

**Acceptance**:
- Open Reddit post → both sections stream AI response within 2 seconds
- No API key set → panel shows "Set your API key in Settings" with clickable link
- API error → error message shown, Re-summarize button available

---

## Task 6: Settings Page

**Goal**: User can configure API keys, model, and language

**Deliverables**:
- `settings/settings.html` + `settings.js` + `settings.css`
- Fields:
  - Active provider toggle: Anthropic / OpenAI
  - Anthropic API Key (password input)
  - OpenAI API Key (password input)
  - Model selector (dynamic based on provider, from `model-config.js`)
  - Language: English / 繁體中文 / 简体中文
- Save → `chrome.storage.sync.set()` → show "Saved ✓"
- On load → `chrome.storage.sync.get()` → populate fields

**Acceptance**:
- Enter API key → Save → reload settings page → key still present (masked)
- Switch provider → model list updates correctly
- Background reads key successfully and API call works

---

## Task 7: Integration & Polish

**Goal**: Full flow works end-to-end, no console errors

**Deliverables**:
- Remove all debug `console.log` calls
- Handle edge cases:
  - Post with no body text
  - Post with 0 comments
  - Very long posts (truncate body to 2000 chars)
  - Rapid navigation (debounce trigger, cancel in-flight streams)
- Verify no errors in `chrome://extensions`
- Final test pass on 5 different Reddit posts

**Test Checklist**:
- [ ] Text post with body + comments → both sections summarize correctly
- [ ] Link post (no body) → post summary handles gracefully
- [ ] New post with 0 comments → Discussion shows "No comments yet"
- [ ] SPA navigate to new post → panel resets and re-triggers
- [ ] SPA navigate to subreddit listing → panel hides
- [ ] No API key → settings link shown
- [ ] Invalid API key → error state shown
- [ ] Collapse → navigate → expand → content still correct
- [ ] Re-summarize button → re-fetches and updates
- [ ] `chrome://extensions` → zero errors or warnings

**Acceptance**:
- All checklist items pass
- Zero console errors during normal operation
