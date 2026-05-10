# Changelog

## 1.0.6

- Added GitHub Actions CI workflow (`lint`, `test`, `format:check`) for pushes/PRs.
- Added lightweight debug logger utility (`shared/logger.js`) with opt-in flag:
  - set `window.PD_DEBUG = true`, or
  - set `localStorage['pd:debug'] = '1'`.
- Added optional-permissions UX note in options popup explaining why/when each permission is requested.
- Added `QA.md` manual regression checklist for key extension flows.

## 1.0.5

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
