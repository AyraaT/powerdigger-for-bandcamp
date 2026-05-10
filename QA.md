# QA Manual Regression Checklist

## Setup

- [ ] Load unpacked extension from repo root.
- [ ] Confirm extension version shows `1.0.6`.
- [ ] Ensure optional permissions are **not** pre-granted, then grant as scenarios require.

## Options / popup behavior

- [ ] Permission note is visible and accurate.
- [ ] Toggling Browser History requests `history` permission only when enabled.
- [ ] Backup button requests `downloads` permission and exports JSON.
- [ ] 3rd Party Optimizer toggle requests `management` permission and handles denial cleanly.

## Bandcamp: track page

- [ ] Track title receives play-history background color from stored count.
- [ ] Starting playback increments count and updates color shade.
- [ ] Top menubar recolors based on browser history status.
- [ ] External buttons (BMC/SoundCloud) appear when enabled and open correct links.

## Bandcamp: album page

- [ ] Track rows are recolored from stored history counts.
- [ ] Playing a track updates the corresponding row only.
- [ ] Handles missing/edge DOM gracefully (no console exceptions on navigation).

## Bandcamp: profile/collection pages

- [ ] Collection tiles recolor from history counts.
- [ ] Observer updates tile color on play transitions.
- [ ] Link recolor works in batches without flooding errors.

## Tracks in Common (fan badges)

- [ ] Badges start as `(…)` then resolve to `(common/total)`.
- [ ] On errors/rate-limit, badge becomes `(?)` with tooltip.
- [ ] Large fan lists remain responsive (throttled request behavior).

## BuyMusicClub page

- [ ] Arrow keys work when BMC keyboard option enabled.
- [ ] Jump-to-percentage works when enabled.

## Backup / restore

- [ ] Download backup produces valid JSON with `trackHistory` object.
- [ ] Uploading legacy format restores play counts.
- [ ] Invalid JSON shows helpful alert.

## Debug logging

- [ ] Default: no noisy debug logs.
- [ ] Set `localStorage['pd:debug']='1'` and refresh: scoped logs appear.
- [ ] Remove flag and refresh: debug logs stop.

## Quality gates

- [ ] `npm run lint` passes.
- [ ] `npm run test` passes.
- [ ] `npm run format:check` passes.
