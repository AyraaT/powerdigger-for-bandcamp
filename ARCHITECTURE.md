# Architecture

## Runtime layout

- `background/` (MV3 service worker, module): message router + storage/fetch logic.
- `content/` (Bandcamp pages): UI and DOM behavior split by feature.
- `bmc.js` (BuyMusicClub pages): keyboard/jump behavior.
- `shared/contracts.js`: canonical message types + storage key prefixes.
- `shared/urlBuilder.js`: shared tokenization for BMC/SoundCloud queries.

## Message contract

All message names live in `shared/contracts.js` (`PD_CONTRACTS.MSG`).

## Storage model

- Track counts: `tk:<trackid> -> integer`
- Fan cache (session): `fp:<fanUrl> -> { ts, data }`
- Legacy migration: `trackHistory` blob migrated to `tk:*` keys on first read.

## Rate-limit strategy

Fan-page fetches are queued with:

- max 2 concurrent requests
- 250ms min start gap
- Retry-After support + exponential backoff/jitter
- bounded retries on 429/503

## Quality gates

- `npm run lint`
- `npm run test`
- `npm run format:check`
