// POWERDIGGER for Bandcamp — service worker entry point.
// All feature logic lives in dedicated modules; this file just routes messages.
import { TRACK_KEY_PREFIX, migrateTrackHistory, recordTrackPlay, getTrackCount } from './trackHistory.js';
import { queueFanPage, validateBMC } from './fanQueue.js';
import { isAllowedFetch } from './utils.js';

chrome.runtime.onMessage.addListener(function (message, sender, senderResponse) {

        // ── Options ──────────────────────────────────────────────────────────
        if (message.type === 'options') {
                chrome.storage.local.get({
                        prefHistory:   false,
                        prefPlayHistory: false,
                        prefBmcButtons:       false,
                        prefBmcKeys:   null,   // null = not yet set; migrate from prefBmcButtons below
                        prefBpm:       false,
                        prefJump:      false,
                        prefJumpPct:    0,
                        prefCommons:   false,
                }, (options) => {
                        // Backward-compat: mirror prefBmcButtons into prefBmcKeys for users upgrading from <=1.0.4.
                        if (options.prefBmcKeys === null) options.prefBmcKeys = options.prefBmcButtons;
                        senderResponse(options);
                });
        }

        // ── Backup / restore ─────────────────────────────────────────────────
        if (message.type === 'backupDownload') {
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
        if (message.type === 'permCheckExtensions') {
                chrome.permissions.request({ permissions: ['management'] }, (granted) => {
                        if (!granted) { chrome.storage.local.set({ prefBpm: false }); senderResponse(false); return; }
                        const extensionBCE = 'padcfdpdlnpdojcihidkgjnmleeingep';
                        const extensionBCT = 'iniomjoihcjgakkfaebmcbnhmiobppel';
                        chrome.management.getAll((extensions) => {
                                const ok =
                                        extensions.some((e) => e.id === extensionBCE && e.enabled) &&
                                        extensions.some((e) => e.id === extensionBCT && e.enabled);
                                chrome.storage.local.set({ prefBpm: ok });
                                senderResponse(ok);
                                // Note: don't auto-open tabs — options page links guide the user.
                        });
                });
        }

        // ── Browser history permission ────────────────────────────────────────
        if (message.type === 'permCheckHistory') {
                chrome.permissions.request({ permissions: ['history'] }, (granted) => {
                        chrome.storage.local.set({ prefHistory: granted });
                });
        }

        // ── Track play history ────────────────────────────────────────────────
        if (message.type === 'trackGetCount') {
                getTrackCount(message.trackid).then((count) => senderResponse(count));
        }

        if (message.type === 'trackPlay') {
                recordTrackPlay(message.trackid).then((count) => senderResponse(count));
        }

        // ── Browser history lookup (batch) ────────────────────────────────────
        if (message.type === 'historyCheckBatch') {
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
        if (message.type === 'historyCheck') {
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
        if (message.type === 'bmcValidate') {
                validateBMC(message.url).then(senderResponse);
        }

        // ── Fan-page common tracks ─────────────────────────────────────────────
        if (message.type === 'fanPage') {
                if (!isAllowedFetch(message.url, ['bandcamp.com'])) {
                        senderResponse(null);
                        return true;
                }
                queueFanPage(message.url).then(senderResponse).catch(() => senderResponse(null));
        }

        return true; // keep the message channel open for async senderResponse calls
});
