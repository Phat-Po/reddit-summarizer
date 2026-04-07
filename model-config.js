// model-config.js — AI model definitions and pricing
// Generic template — update prices if Anthropic/OpenAI change their rates.
// Prices are per 1M tokens (USD).

'use strict';

var EXT_MODEL_OPTIONS = [
  // ── Anthropic ──────────────────────────────────────────────────────────────
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5',  provider: 'anthropic', inputRate: 1.00,  outputRate: 5.00  },
  { id: 'claude-sonnet-4-5',         name: 'Claude Sonnet 4.5', provider: 'anthropic', inputRate: 3.00,  outputRate: 15.00 },
  { id: 'claude-opus-4',             name: 'Claude Opus 4',     provider: 'anthropic', inputRate: 15.00, outputRate: 75.00 },

  // ── OpenAI ─────────────────────────────────────────────────────────────────
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', provider: 'openai', inputRate: 0.10, outputRate: 0.40 },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'openai', inputRate: 0.40, outputRate: 1.60 },
  { id: 'gpt-4o-mini',  name: 'GPT-4o Mini',  provider: 'openai', inputRate: 0.15, outputRate: 0.60 },
  { id: 'gpt-4.1',      name: 'GPT-4.1',      provider: 'openai', inputRate: 2.00, outputRate: 8.00 },
  { id: 'gpt-4o',       name: 'GPT-4o',        provider: 'openai', inputRate: 2.50, outputRate: 10.00 }
];

// Build lookup maps used by background.js
var EXT_MODEL_RATES = (function() {
  var map = {};
  EXT_MODEL_OPTIONS.forEach(function(m) { map[m.id] = { inputRate: m.inputRate, outputRate: m.outputRate }; });
  return map;
})();

var EXT_MODEL_NAMES = (function() {
  var map = {};
  EXT_MODEL_OPTIONS.forEach(function(m) { map[m.id] = m.name; });
  return map;
})();

// Alias for settings page (uses MODEL_OPTIONS)
var MODEL_OPTIONS = EXT_MODEL_OPTIONS;
