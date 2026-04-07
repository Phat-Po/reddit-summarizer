# Reddit Summarizer

A Chrome extension that instantly summarizes Reddit posts and discussions using AI. Supports Anthropic (Claude) and OpenAI (GPT) models with streaming output and adaptive formatting based on content length.

---

## Features

- **Auto-summarizes** any Reddit post page — post body + discussion thread
- **Streaming output** — results appear word-by-word as AI generates them
- **Adaptive formatting** — short posts get a concise summary; long posts get Key Takeaways bullets; large threads get Vibe, Thread Analysis, Interaction Pattern, and Notable Quotes
- **Multi-language** — AI responds in English, Traditional Chinese (繁體中文), or Simplified Chinese (简体中文)
- **Manual trigger mode** — optionally disable auto-summarize and trigger on demand
- **Floating side panel** — Shadow DOM, non-intrusive, always visible without obscuring content
- **Dual provider** — switch between Anthropic and OpenAI models from Settings
- **Usage tracking** — tracks daily API calls and estimated cost

---

## Installation

This extension is not on the Chrome Web Store. Load it manually:

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right)
4. Click **Load unpacked**
5. Select the project folder

---

## Setup

1. Click the extension icon in your browser toolbar to open Settings
2. Enter your **Anthropic** or **OpenAI** API key and click **Save & Verify**
3. Select your preferred AI model
4. Choose a response language (default: English)
5. Open any Reddit post — the summary panel will appear on the right

---

## Usage

| Action | How |
|--------|-----|
| Summarize a post | Open any Reddit post — panel auto-appears and starts summarizing |
| Re-summarize | Click the **Re-summarize** button in the panel header |
| Manual mode | Settings → uncheck **自動摘要** — panel shows but waits for your click |
| Change model/language | Click the extension icon → Settings |
| Reset usage stats | Settings → Usage → Reset |

---

## Settings

| Setting | Description |
|---------|-------------|
| API Keys | Anthropic (`sk-ant-...`) or OpenAI (`sk-...`) — stored locally, never uploaded |
| Model | Any supported Claude or GPT model |
| Language | English / 繁體中文 / 简体中文 |
| Auto-summarize | When off, the panel shows but waits for manual trigger |

---

## Supported Models

Configured in `model-config.js`. Includes:

- **Anthropic:** Claude 3.5 Haiku, Claude 3.5 Sonnet, Claude 3 Opus
- **OpenAI:** GPT-4o Mini, GPT-4o, GPT-4 Turbo

---

## Privacy

- API keys are stored in `chrome.storage.sync` (your browser, synced to your Google account if signed in)
- No data is sent to any server except the AI provider you configure (Anthropic or OpenAI)
- Usage stats are stored locally in `chrome.storage.local`

---

## Project Structure

```
reddit-summarizer/
├── manifest.json          # Extension manifest (MV3)
├── background.js          # Service worker — streaming proxy + key validation
├── content.js             # Main content script — panel init, summarization logic
├── model-config.js        # Model list and pricing
├── selectors.js           # Reddit DOM selectors (title, body, comments, meta)
├── icons/                 # Extension icons (16, 48, 128px)
├── ui/
│   └── panel.js           # Floating side panel (Shadow DOM)
├── settings/
│   ├── settings.html      # Settings page
│   ├── settings.js        # Settings logic
│   └── settings.css       # Settings styles
└── docs/
    ├── PRD.md             # Product requirements
    └── TASK-PLAN.md       # Build task plan
```

---

## Development

No build step required. Edit files and reload the extension at `chrome://extensions`.

To reload after changes: click the refresh icon on the extension card, then hard-refresh (`Cmd+Shift+R`) any open Reddit tab.
