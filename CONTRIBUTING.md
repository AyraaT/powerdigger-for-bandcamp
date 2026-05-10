# Contributing

Thanks for contributing to POWERDIGGER for Bandcamp.

## Local setup

1. Install dependencies:
   - `npm ci`
2. Run quality checks:
   - `npm run lint`
   - `npm run test`
   - `npm run format:check`
3. Load extension in Chrome:
   - `chrome://extensions`
   - enable **Developer mode**
   - **Load unpacked** from repo root

## Branching workflow

- Base ongoing work on `restructure` unless otherwise discussed.
- Keep changes focused and small.
- Use clear commit messages describing intent.

## Code conventions

- Keep message/storage contracts centralized in `shared/contracts.js`.
- Prefer Promise/`async` messaging patterns over callback style.
- Validate payloads at message boundaries (background router handlers).
- Reuse shared utilities instead of duplicating helpers.

## Required checks before push

Run all:

- `npm run lint`
- `npm run test`
- `npm run format:check`

If any fail, fix before pushing.

## Pull request notes

Include in PR description:

- what changed
- why it changed
- risk/regression areas
- validation performed (commands + any manual QA)

For UI or behavior changes, run the manual checklist in `QA.md`.
