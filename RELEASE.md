# Release Checklist

Use this checklist for each extension release.

## 1) Prepare

- [ ] Ensure branch is up-to-date and clean
- [ ] Review `CHANGELOG.md` entries for this release

## 2) Version bump

- [ ] Update `manifest.json` `version` (semver patch/minor/major as needed)
- [ ] Add/update release section in `CHANGELOG.md`

## 3) Quality gates

- [ ] `npm ci`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run format:check`

## 4) Manual smoke check

- [ ] Run targeted checks from `QA.md` (at least core flows)
  - track page play-history coloring
  - album row coloring updates
  - profile link/track recoloring
  - fan badges (success + failure state)
  - BMC keys/jump behavior
  - backup/restore

## 5) Finalize

- [ ] Commit release prep changes
- [ ] Push branch
- [ ] Open/update PR with release notes
- [ ] Tag release in git/GitHub (if used in your workflow)

## 6) Post-release sanity

- [ ] Re-open extension and verify reported version
- [ ] Spot-check one Bandcamp page and one BMC page
