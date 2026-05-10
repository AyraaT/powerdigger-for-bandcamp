# Changelog

## Unreleased

- Unified message/storage contracts in `shared/contracts.js`.
- Converted messaging to Promise/`async` API flows in background/content/options/BMC scripts.
- Refactored background router to handler map with payload validation.
- Centralized key prefixes (`tk:` / `fp:` / legacy key) from shared contracts.
- Added shared URL token builder in `shared/urlBuilder.js` and reused in BMC button logic.
- Added ESLint + Prettier configuration and npm scripts.
- Added minimal tests for:
  - option normalization migration
  - fan retry delay + cache freshness
  - URL tokenization behavior
