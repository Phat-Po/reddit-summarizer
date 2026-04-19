# Reddit Summarizer

![JavaScript](https://img.shields.io/badge/JavaScript-ES6-f7df1e?logo=javascript&logoColor=black)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![License](https://img.shields.io/badge/License-MIT-blue)

A Chrome extension that instantly summarizes Reddit posts and discussions using AI. Supports Anthropic (Claude), OpenAI (GPT), and Groq (Llama) models with streaming output and adaptive formatting based on content length.

---

## Features

- **Auto-summarizes** any Reddit post page — post body + discussion thread
- **Streaming output** — results appear word-by-word as AI generates them
- **Adaptive formatting** — short posts get a concise summary; long posts get Key Takeaways bullets; large threads get Vibe, Thread Analysis, Interaction Pattern, and Notable Quotes
- **Multi-language** — AI responds in English, Traditional Chinese (繁體中文), or Simplified Chinese (简体中文)
- **Manual trigger mode** — optionally disable auto-summarize and trigger on demand
- **Floating side panel** — Shadow DOM, non-intrusive, always visible without obscuring content
- **Multi-provider** — switch between Anthropic, OpenAI, and Groq models from Settings
- **Usage tracking** — tracks daily API calls and estimated cost in USD

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
2. Enter your API key for your chosen provider and click **Save & Verify**
3. Select your preferred AI model
4. Choose a response language (default: English)
5. Open any Reddit post — the summary panel will appear on the right

---

## Usage

| Action | How |
|--------|-----|
| Summarize a post | Open any Reddit post — panel auto-appears and starts summarizing |
| Re-summarize | Click the **Re-summarize** button in the panel header |
| Manual mode | Settings → uncheck **Auto-summarize** — panel shows but waits for your click |
| Change model/language | Click the extension icon → Settings |
| Reset usage stats | Settings → Usage → Reset |

---

## Settings

| Setting | Description |
|---------|-------------|
| Anthropic API Key | `sk-ant-...` — get yours at [console.anthropic.com](https://console.anthropic.com) |
| OpenAI API Key | `sk-...` — get yours at [platform.openai.com](https://platform.openai.com) |
| Groq API Key | `gsk_...` — get yours at [console.groq.com](https://console.groq.com) |
| Model | Any supported model from the three providers |
| Language | English / 繁體中文 / 简体中文 |
| Auto-summarize | When off, the panel shows but waits for manual trigger |

All API keys are stored locally in your browser — never uploaded to any server.

---

## Supported Models

Configured in `model-config.js`.

**Anthropic**
| Model | ID |
|-------|----|
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` |
| Claude Sonnet 4.5 | `claude-sonnet-4-5` |
| Claude Opus 4 | `claude-opus-4` |

**OpenAI**
| Model | ID |
|-------|----|
| GPT-4.1 Nano | `gpt-4.1-nano` |
| GPT-4.1 Mini | `gpt-4.1-mini` |
| GPT-4o Mini | `gpt-4o-mini` |
| GPT-4.1 | `gpt-4.1` |
| GPT-4o | `gpt-4o` |

**Groq**
| Model | ID |
|-------|----|
| Llama 3.3 70B Versatile | `llama-3.3-70b-versatile` |
| Llama 3.1 8B Instant | `llama-3.1-8b-instant` |
| GPT OSS 120B | `openai/gpt-oss-120b` |

---

## Privacy

- API keys are stored in `chrome.storage.sync` (your browser, synced to your Google account if signed in)
- No data is sent to any server except the AI provider you configure
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
└── settings/
    ├── settings.html      # Settings page
    ├── settings.js        # Settings logic
    └── settings.css       # Settings styles
```

---

## Development

No build step required. Edit files and reload the extension at `chrome://extensions`.

To reload after changes: click the refresh icon on the extension card, then hard-refresh (`Cmd+Shift+R`) any open Reddit tab.

---

## License

MIT — see [LICENSE](LICENSE) for details.
