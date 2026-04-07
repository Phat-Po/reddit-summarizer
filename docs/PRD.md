# Reddit Summarizer — Product Requirements Document

**Version**: 1.0
**Target Platform**: `reddit.com/r/*/comments/*`
**Date**: 2026-04-07

---

## 1. Overview

### Problem Statement
Reading Reddit threads is time-consuming. Posts can be long, and comment sections can have hundreds of replies. Users want to quickly understand what a post is about and what the community is saying without reading everything.

### Product Vision
A Chrome extension that automatically summarizes Reddit posts and their discussions the moment you open a thread. A floating side panel shows a concise post summary and a discussion summary, with a refresh button for manual re-triggering.

### Success Metrics
- Panel appears within 2 seconds of entering a post page
- Streaming AI response starts within 1.5 seconds of trigger
- Works correctly on SPA navigation (no page refresh required)
- No visual interference with Reddit's own UI

---

## 2. Scope

### In Scope (V1)
- Auto-trigger on entering any `reddit.com/r/*/comments/*` URL
- Floating side panel (Shadow DOM) with two sections: Post Summary + Discussion Summary
- Manual "Re-summarize" button in the panel
- Support for both Anthropic (Claude) and OpenAI (GPT) APIs
- Settings page: API key (per provider), model selection, language preference
- Streaming AI output (token-by-token display)
- SPA navigation support (panel updates when switching posts)

### Out of Scope
- Chrome Web Store publishing (V1: unpacked load only)
- `old.reddit.com` support
- Summarizing images, videos, or linked articles
- Comment voting, replying, or any Reddit interaction
- Mobile / Firefox support

---

## 3. Feature Requirements

### 3.1 Auto-Trigger on Post Pages
- Detect when URL matches `reddit.com/r/*/comments/*`
- Extract post title + body text
- Extract top comments (up to ~50 comments, sorted by top)
- Automatically send to AI and begin streaming into the panel
- If the user navigates to a new post (SPA), clear old summary and re-trigger

### 3.2 Floating Side Panel
- Fixed position, right side of screen
- Collapsible (click arrow to collapse/expand)
- Two sections:
  - **Post Summary** — 3–5 sentence summary of the post content
  - **Discussion Summary** — key themes, top opinions, notable points from comments
- Shows loading/streaming state while AI is responding
- "Re-summarize" button to manually trigger again
- Error state with message if API call fails

### 3.3 AI API Integration
- Both Anthropic (Claude) and OpenAI (GPT) supported
- User selects provider + model in settings
- All API calls go through background service worker (CORS bypass)
- Streaming via `chrome.runtime.Port`
- Handles: missing API key, network error, rate limit

### 3.4 Settings Page
- Accessible via extension icon → "Settings"
- Fields:
  - Anthropic API Key (masked input)
  - OpenAI API Key (masked input)
  - Active provider: Anthropic / OpenAI
  - Model selector (populated based on provider)
  - Summary language: English / Traditional Chinese / Simplified Chinese
- Save button with success confirmation
- All values stored in `chrome.storage.sync`

---

## 4. Technical Architecture

### 4.1 File Structure
```
reddit-summarizer/
├── manifest.json
├── background.js          # Service worker — API proxy, streaming
├── content.js             # Main injection — SPA detection, extraction
├── selectors.js           # All DOM queries for Reddit
├── model-config.js        # Model list + pricing reference
├── ui/
│   ├── panel.js           # Shadow DOM floating panel
│   └── panel.css          # Panel styles
├── settings/
│   ├── settings.html
│   ├── settings.js
│   └── settings.css
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── HOWTO.md
```

### 4.2 Manifest Permissions
```json
{
  "permissions": ["storage", "scripting"],
  "host_permissions": ["https://www.reddit.com/*"],
  "content_scripts": [{
    "matches": ["https://www.reddit.com/r/*/comments/*"],
    "js": ["selectors.js", "ui/panel.js", "content.js"]
  }]
}
```

### 4.3 Message Flow
```
content.js
  │
  ├─ extractContent() → { title, body, comments[] }
  │
  ├─ chrome.runtime.connect(port) ──────────────────────► background.js
  │                                                            │
  │                                                     fetch(AI API, stream)
  │                                                            │
  │  port.onMessage({ chunk }) ◄──────────────────── port.postMessage(chunk)
  │
  └─ panel.appendChunk(chunk) → streaming UI update
```

### 4.4 SPA Navigation Handling
- `MutationObserver` on `<title>` element (changes on every Reddit navigation)
- `popstate` event listener as backup
- On URL change: check if new URL matches post pattern → reset panel → re-trigger

---

## 5. UI/UX Specifications

### Floating Panel
- Width: 320px
- Position: fixed, right: 16px, top: 80px
- Background: white (light mode) / #1a1a1b (dark mode — future)
- Border radius: 12px
- Box shadow: subtle drop shadow
- Z-index: 999999 (above Reddit UI)
- Collapsed state: 40px wide tab showing "AI" label

### Section Headers
- "📄 Post Summary" and "💬 Discussion" with thin divider
- Loading state: animated pulsing dots
- Streaming state: text appears progressively with blinking cursor

### Controls
- Collapse/expand toggle (chevron icon, top right of panel)
- Re-summarize button (circular arrows icon, bottom of panel)
- Close button (×) — hides panel, shows small floating trigger button

---

## 6. AI Prompt Specifications

### System Prompt
```
You are a Reddit thread summarizer. Be concise, neutral, and informative.
Respond in {language}.
```

### User Message (Post Summary)
```
Summarize this Reddit post in 3-5 sentences.

Title: {title}
Body: {body}
```

### User Message (Discussion Summary)
```
Summarize the key discussion points from these Reddit comments in 4-6 bullet points.
Focus on: main opinions, notable insights, areas of agreement/disagreement.

Comments:
{top_comments_joined}
```

---

## 7. Edge Cases & Error Handling

| Case | Behavior |
|------|----------|
| Post has no body text | Summarize title only, note "text post with no body" |
| Post has no comments yet | Show "No comments to summarize yet" |
| API key not set | Panel shows "Set your API key in Settings" with link |
| API call fails | Show error message, display Re-summarize button |
| Very long comments section | Truncate to top 50 comments by score |
| User navigates away mid-stream | Cancel stream, reset panel for new post |
| Selector breaks after Reddit update | Graceful fallback, panel shows "Could not extract content" |

---

## 8. Implementation Phases

See `TASK-PLAN.md` for detailed task breakdown.
