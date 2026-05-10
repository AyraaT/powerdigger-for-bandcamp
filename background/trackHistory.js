import { local } from './storage.js';

// Track history storage — per-track keys (tk:<id> -> integer count).
// Migration from the legacy monolithic trackHistory:{} blob runs once on first
// access and then removes the blob to free space.
export const TRACK_KEY_PREFIX = 'tk:';
let migrationDone = false;

function trackKey(trackid) {
        return TRACK_KEY_PREFIX + trackid;
}

// Migrate the old single-blob trackHistory into individual keys, then delete it.
export function migrateTrackHistory() {
        if (migrationDone) return Promise.resolve();
        return local.get('trackHistory').then((items) => {
                migrationDone = true;
                const blob = items.trackHistory;
                if (!blob || typeof blob !== 'object' || Array.isArray(blob)) return;
                const toSet = {};
                for (const [id, count] of Object.entries(blob)) {
                        toSet[trackKey(id)] = count;
                }
                if (Object.keys(toSet).length === 0) {
                        return local.remove('trackHistory');
                }
                return local.set(toSet).then(() => local.remove('trackHistory'));
        }).catch(() => { migrationDone = true; });
}

// Atomically increment a track's play count and return the new value.
// Uses a per-trackid promise queue so concurrent messages don't race.
const trackPlayQueues = new Map(); // trackid -> Promise chain tail

export function recordTrackPlay(trackid) {
        const key = trackKey(trackid);
        const prev = trackPlayQueues.get(trackid) || migrateTrackHistory();
        const next = prev.then(() => new Promise((resolve) => {
                local.get({ [key]: 0 }).then((result) => {
                        const cur = (result[key] || 0) + 1;
                        local.set({ [key]: cur }).then(() => resolve(cur));
                });
        }));
        trackPlayQueues.set(trackid, next.catch(() => {}));
        return next;
}

// Read a single track's play count (0 if never played).
export function getTrackCount(trackid) {
        return migrateTrackHistory().then(() => {
                const key = trackKey(trackid);
                return local.get({ [key]: 0 }).then((r) => r[key] || 0);
        });
}
