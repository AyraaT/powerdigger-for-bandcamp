// POWERDIGGER for Bandcamp — service worker entry point.
// All feature logic lives in dedicated modules; this file just routes messages.
import { MSG } from './messages.js';
import { local, pickByPrefix } from './storage.js';
import { TRACK_KEY_PREFIX, recordTrackPlay, getTrackCount } from './trackHistory.js';
import { queueFanPage, validateBMC } from './fanQueue.js';
import { isAllowedFetch } from './utils.js';
import { OPTION_DEFAULTS, normalizeOptions } from './optionsSchema.js';

function requestPermission(permission) {
        return new Promise((resolve) => {
                chrome.permissions.request({ permissions: [permission] }, resolve);
        });
}

chrome.runtime.onMessage.addListener(function (message, sender, senderResponse) {

        // ── Options ──────────────────────────────────────────────────────────
        if (message.type === MSG.OPTIONS) {
                local.get(OPTION_DEFAULTS).then((rawOptions) => {
                        senderResponse(normalizeOptions(rawOptions));
                });
        }

        // ── Backup / restore ─────────────────────────────────────────────────
        if (message.type === MSG.BACKUP_DOWNLOAD) {
                requestPermission('downloads').then((granted) => {
                        if (!granted) return;
                        // Export all tk: keys as a legacy-compatible {trackHistory:{}} blob.
                        local.getAll().then((allItems) => {
                                const prefixed = pickByPrefix(allItems, TRACK_KEY_PREFIX);
                                const trackHistory = {};
                                for (const [k, v] of Object.entries(prefixed)) {
                                        trackHistory[k.slice(TRACK_KEY_PREFIX.length)] = v;
                                }
                                const url = 'data:application/json;base64,' + btoa(JSON.stringify({ trackHistory }));
                                chrome.downloads.download({ url, filename: 'POWERDIGGER_backup.json' });
                        });
                });
        }

        // ── 3rd-party extension check ────────────────────────────────────────
        if (message.type === MSG.PERM_CHECK_EXTENSIONS) {
                requestPermission('management').then((granted) => {
                        if (!granted) { local.set({ prefBpm: false }); senderResponse(false); return; }
                        const extensionBCE = 'padcfdpdlnpdojcihidkgjnmleeingep';
                        const extensionBCT = 'iniomjoihcjgakkfaebmcbnhmiobppel';
                        chrome.management.getAll((extensions) => {
                                const ok =
                                        extensions.some((e) => e.id === extensionBCE && e.enabled) &&
                                        extensions.some((e) => e.id === extensionBCT && e.enabled);
                                local.set({ prefBpm: ok });
                                senderResponse(ok);
                                // Note: don't auto-open tabs — options page links guide the user.
                        });
                });
        }

        // ── Browser history permission ────────────────────────────────────────
        if (message.type === MSG.PERM_CHECK_HISTORY) {
                requestPermission('history').then((granted) => {
                        local.set({ prefHistory: granted });
                });
        }

        // ── Track play history ────────────────────────────────────────────────
        if (message.type === MSG.TRACK_GET_COUNT) {
                getTrackCount(message.trackid).then((count) => senderResponse(count));
        }

        if (message.type === MSG.TRACK_PLAY) {
                recordTrackPlay(message.trackid).then((count) => senderResponse(count));
        }

        // ── Browser history lookup (batch) ────────────────────────────────────
        if (message.type === MSG.HISTORY_CHECK_BATCH) {
                const urls = Array.isArray(message.urls) ? message.urls : [];
                const cutoff = Date.now() - 3000;
                const results = new Array(urls.length).fill(null);
                let pending = urls.length;
                if (pending === 0) { senderResponse({ results }); return true; }
                urls.forEach((url, i) => {
                        try {
                                chrome.history.getVisits({ url }, (visits) => {
                                        results[i] = (chrome.runtime.lastError || !visits)
                                                ? { error: true }
                                                : visits.filter((v) => v.visitTime < cutoff).length === 0;
                                        if (--pending === 0) senderResponse({ results });
                                });
                        } catch (_) {
                                results[i] = { error: true };
                                if (--pending === 0) senderResponse({ results });
                        }
                });
        }

        // ── Browser history lookup (single — used for top banner) ─────────────
        if (message.type === MSG.HISTORY_CHECK) {
                try {
                        chrome.history.getVisits({ url: message.url }, (result) => {
                                if (chrome.runtime.lastError || !result) {
                                        senderResponse({ error: true });
                                        return;
                                }
                                const found = result.filter((el) => el.visitTime < Date.now() - 3000);
                                senderResponse(found.length === 0);
                        });
                } catch (_) {
                        senderResponse({ error: true });
                }
        }

        // ── Buy Music Club validation ──────────────────────────────────────────
        if (message.type === MSG.BMC_VALIDATE) {
                validateBMC(message.url).then(senderResponse);
        }

        // ── Fan-page common tracks ─────────────────────────────────────────────
        if (message.type === MSG.FAN_PAGE) {
                if (!isAllowedFetch(message.url, ['bandcamp.com'])) {
                        senderResponse(null);
                        return true;
                }
                queueFanPage(message.url).then(senderResponse).catch(() => senderResponse(null));
        }

        return true; // keep the message channel open for async senderResponse calls
});
