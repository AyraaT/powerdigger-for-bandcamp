// POWERDIGGER for Bandcamp — service worker entry point.
// All feature logic lives in dedicated modules; this file just routes messages.
import { TRACK_KEY_PREFIX, migrateTrackHistory, recordTrackPlay, getTrackCount } from './trackHistory.js';
import { queueFanPage, validateBMC } from './fanQueue.js';
import { isAllowedFetch } from './utils.js';

chrome.runtime.onMessage.addListener(function (message, sender, senderResponse) {

        // ── Options ──────────────────────────────────────────────────────────
        if (message.type === 'options') {
                chrome.storage.local.get({
                        ohistory:   false,
                        otrhistory: false,
                        obmc:       false,
                        obmcKeys:   null,   // null = not yet set; migrate from obmc below
                        obpm:       false,
                        ojump:      false,
                        ojumpNr:    0,
                        ocommons:   false,
                }, (options) => {
                        // Backward-compat: mirror obmc into obmcKeys for users upgrading from <=1.0.4.
                        if (options.obmcKeys === null) options.obmcKeys = options.obmc;
                        senderResponse(options);
                });
        }

        // ── Backup / restore ─────────────────────────────────────────────────
        if (message.type === 'downloadFull') {
                chrome.permissions.request({ permissions: ['downloads'] }, (granted) => {
                        if (!granted) return;
                        // Export all tk: keys as a legacy-compatible {trackHistory:{}} blob.
                        chrome.storage.local.get(null, (allItems) => {
                                const trackHistory = {};
                                for (const [k, v] of Object.entries(allItems)) {
                                        if (k.startsWith(TRACK_KEY_PREFIX)) {
                                                trackHistory[k.slice(TRACK_KEY_PREFIX.length)] = v;
                                        }
                                }
                                const url = 'data:application/json;base64,' + btoa(JSON.stringify({ trackHistory }));
                                chrome.downloads.download({ url, filename: 'POWERDIGGER_backup.json' });
                        });
                });
        }

        // ── 3rd-party extension check ────────────────────────────────────────
        if (message.type === 'checkExtensions') {
                chrome.permissions.request({ permissions: ['management'] }, (granted) => {
                        if (!granted) { chrome.storage.local.set({ obpm: false }); senderResponse(false); return; }
                        const extensionBCE = 'padcfdpdlnpdojcihidkgjnmleeingep';
                        const extensionBCT = 'iniomjoihcjgakkfaebmcbnhmiobppel';
                        chrome.management.getAll((extensions) => {
                                const ok =
                                        extensions.some((e) => e.id === extensionBCE && e.enabled) &&
                                        extensions.some((e) => e.id === extensionBCT && e.enabled);
                                chrome.storage.local.set({ obpm: ok });
                                senderResponse(ok);
                                // Note: don't auto-open tabs — options page links guide the user.
                        });
                });
        }

        // ── Browser history permission ────────────────────────────────────────
        if (message.type === 'checkHistory') {
                chrome.permissions.request({ permissions: ['history'] }, (granted) => {
                        chrome.storage.local.set({ ohistory: granted });
                });
        }

        // ── Track play history ────────────────────────────────────────────────
        if (message.type === 'trackhistory') {
                getTrackCount(message.trackid).then((count) => senderResponse(count));
        }

        if (message.type === 'trackplay') {
                recordTrackPlay(message.trackid).then((count) => senderResponse(count));
        }

        // ── Browser history lookup (batch) ────────────────────────────────────
        if (message.type === 'nobrowserhistoryBatch') {
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
        if (message.type === 'nobrowserhistory') {
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
        if (message.type === 'validate') {
                validateBMC(message.url).then(senderResponse);
        }

        // ── Fan-page common tracks ─────────────────────────────────────────────
        if (message.type === 'FanPage') {
                if (!isAllowedFetch(message.url, ['bandcamp.com'])) {
                        senderResponse(null);
                        return true;
                }
                queueFanPage(message.url).then(senderResponse).catch(() => senderResponse(null));
        }

        return true; // keep the message channel open for async senderResponse calls
});
