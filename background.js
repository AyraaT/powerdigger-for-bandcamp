// ---------- Track history storage (per-track keys) ----------
// Storage format: chrome.storage.local key = 'tk:<trackid>' -> integer count.
// Migration from the legacy monolithic trackHistory:{} blob runs once on first
// access and then removes the blob to free space.
const TRACK_KEY_PREFIX = 'tk:';
let migrationDone = false;

function trackKey(trackid) {
        return TRACK_KEY_PREFIX + trackid;
}

// Migrate the old single-blob trackHistory into individual keys, then delete it.
function migrateTrackHistory() {
        if (migrationDone) return Promise.resolve();
        return chrome.storage.local.get('trackHistory').then((items) => {
                migrationDone = true;
                const blob = items.trackHistory;
                if (!blob || typeof blob !== 'object' || Array.isArray(blob)) return;
                const toSet = {};
                for (const [id, count] of Object.entries(blob)) {
                        toSet[trackKey(id)] = count;
                }
                if (Object.keys(toSet).length === 0) {
                        return chrome.storage.local.remove('trackHistory');
                }
                return chrome.storage.local.set(toSet).then(() => chrome.storage.local.remove('trackHistory'));
        }).catch(() => { migrationDone = true; });
}

// Atomically increment a track's play count and return the new value.
// Uses a per-trackid promise queue so concurrent messages don't race.
const trackPlayQueues = new Map(); // trackid -> Promise chain tail
function recordTrackPlay(trackid) {
        const key = trackKey(trackid);
        const prev = trackPlayQueues.get(trackid) || migrateTrackHistory();
        const next = prev.then(() => new Promise((resolve) => {
                chrome.storage.local.get({[key]: 0}).then((result) => {
                        const cur = (result[key] || 0) + 1;
                        chrome.storage.local.set({[key]: cur}).then(() => resolve(cur));
                });
        }));
        trackPlayQueues.set(trackid, next.catch(() => {}));
        return next;
}

// Read a single track's play count (0 if never played).
function getTrackCount(trackid) {
        return migrateTrackHistory().then(() => {
                const key = trackKey(trackid);
                return chrome.storage.local.get({[key]: 0}).then((r) => r[key] || 0);
        });
}

chrome.runtime.onMessage.addListener(function(message, sender, senderResponse) {
        if (message.type === "options") {
                chrome.storage.local.get({
                        ohistory: false,
                        otrhistory: false,
                        obmc: false,
                        obmcKeys: null, // null => not yet set; migrate from obmc below
                        obpm: false,
                        ojump: false,
                        ojumpNr: 0,
                        ocommons: false
                }, (options) => {
                        // Backward-compat: when obmcKeys was never set, mirror obmc
                        // so users upgrading from <=1.0.4 keep their arrow-key behaviour.
                        if (options.obmcKeys === null) options.obmcKeys = options.obmc;
                        senderResponse(options);
                });
        }
        if(message.type === "downloadFull"){
             chrome.permissions.request({permissions: ['downloads']}, function(granted) {
                                        if (granted) {
                                                // Export all tk: keys as a legacy-compatible {trackHistory:{}} blob.
                                                chrome.storage.local.get(null, function(allItems) {
                                                    const trackHistory = {};
                                                    for (const [k, v] of Object.entries(allItems)) {
                                                        if (k.startsWith(TRACK_KEY_PREFIX)) {
                                                            trackHistory[k.slice(TRACK_KEY_PREFIX.length)] = v;
                                                        }
                                                    }
                                                    const result = JSON.stringify({trackHistory});
                                                    const url = 'data:application/json;base64,' + btoa(result);
                                                    chrome.downloads.download({url: url, filename: 'POWERDIGGER_backup.json'});
                                                });
                                        } 
                                });
        }
        if (message.type === "checkExtensions"){
            chrome.permissions.request({permissions: ['management']}, function (granted) {
                                        if (granted) {
                                                const extensionBCE = 'padcfdpdlnpdojcihidkgjnmleeingep';
                                                const extensionBCT = 'iniomjoihcjgakkfaebmcbnhmiobppel';
                                                chrome.management.getAll(function(extensions) {
                                                        const BCEisInstalled = extensions.some(function(e) {return e.id === extensionBCE && e.enabled;});
                                                        const BCTisInstalled = extensions.some(function(e) {return e.id === extensionBCT && e.enabled;});
                                                        if (BCEisInstalled && BCTisInstalled){
                                                                chrome.storage.local.set({obpm: true});
                                                                senderResponse(true);
                                                        } else {
                                                                chrome.storage.local.set({obpm: false});
                                                                // Don't auto-open tabs — let the options UI guide the user.
                                                                senderResponse(false);
                                                        }
                                                });
                                        } else {
                                                chrome.storage.local.set({obpm: false});
                                                senderResponse(false);
                                        }
                                });
        }
        if (message.type === "checkHistory"){
                    chrome.permissions.request({permissions: ['history']}, function (granted) {
                                        if (granted) {
                                                chrome.storage.local.set({ohistory: true});
                                        } else {
                                                chrome.storage.local.set({ohistory: false});
                                        }
                                });
        }
        if (message.type === "trackhistory") {
                getTrackCount(message.trackid).then((count) => senderResponse(count));
        }
        if (message.type === "trackplay") {
                // No SW-side debounce — the content script is responsible for
                // collapsing duplicate fires. Persist immediately so a SW kill
                // can't drop the increment.
                recordTrackPlay(message.trackid).then((count) => {
                        senderResponse(count);
                });
        }
        if (message.type === "nobrowserhistoryBatch") {
                // Batch variant: takes {urls: [...]} and returns {results: [bool|null...]}
                const urls = Array.isArray(message.urls) ? message.urls : [];
                const cutoff = Date.now() - 3000;
                const results = new Array(urls.length).fill(null);
                let pending = urls.length;
                if (pending === 0) {
                        senderResponse({results});
                        return true;
                }
                urls.forEach((url, i) => {
                        try {
                                chrome.history.getVisits({url}, (visits) => {
                                        if (chrome.runtime.lastError || !visits) {
                                                results[i] = {error: true};
                                        } else {
                                                results[i] = visits.filter(v => v.visitTime < cutoff).length === 0;
                                        }
                                        if (--pending === 0) senderResponse({results});
                                });
                        } catch (_) {
                                results[i] = {error: true};
                                if (--pending === 0) senderResponse({results});
                        }
                });
        }
        if (message.type === "nobrowserhistory") {
                try {
                        chrome.history.getVisits({
                                        'url': message.url
                                },
                                (result) => {
                                        if (chrome.runtime.lastError || !result) {
                                                senderResponse({error: true});
                                                return;
                                        }
                                        //Check if there is a visit older than 3 seconds ago in chrome history
                                        const found = result.filter(element => (element.visitTime < Date.now() - 3000));
                                        //Create A bool and pass it back
                                        senderResponse(found.length === 0);
                                });
                } catch (error) {
                        senderResponse({error: true});
                }
        }
        if (message.type === "validate") {
                if (!isAllowedFetch(message.url, ['buymusic.club'])) {
                        senderResponse('Blocked URL.');
                        return true;
                }
                fetch(message.url).then(function(response) {
                        return response.text();
                }).then(function(response) {
                        const marker = '<script id="__NEXT_DATA__" type="application/json">';
                        const startIdx = response.indexOf(marker);
                        if (startIdx === -1) {
                                senderResponse(false);
                                return;
                        }
                        response = response.substring(startIdx + marker.length);
                        response = response.substring(0, response.indexOf("</script>"));
                        const data = JSON.parse(response);
                        senderResponse(Object.keys(data.props.pageProps.searchResults).length !== 0);
                }).catch(function(err) {
                        // There was an error
                        senderResponse('Something went wrong.');
                });
        }
        if (message.type === "FanPage") {
                if (!isAllowedFetch(message.url, ['bandcamp.com'])) {
                        senderResponse(null);
                        return true;
                }
                queueFanPage(message.url).then(senderResponse).catch(() => senderResponse(null));
                return true; // keep channel open for async response
        }
        return true;
});

// ---------- FanPage throttled fetch with 429 retry + session cache ----------
// Bandcamp rate-limits aggressive fan-profile scraping. Run requests through a
// small concurrency pool with exponential backoff that honours Retry-After.
// Successful results are cached in chrome.storage.session so a re-visit during
// the same browser session doesn't refetch.
const FAN_MAX_CONCURRENCY = 2;
const FAN_MIN_GAP_MS = 250;     // minimum gap between request starts
const FAN_MAX_RETRIES = 5;
const FAN_BASE_BACKOFF_MS = 1500;
const FAN_CACHE_PREFIX = 'fp:';
const FAN_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h, also bounded by session lifetime

const fanQueue = [];            // [{url, resolve, reject}]
let fanInflight = 0;
let fanLastStart = 0;
let fanCooldownUntil = 0;       // global pause when we hit a 429
const fanInflightByUrl = new Map(); // url -> Promise (dedupe concurrent requests)

function fanCacheKey(url) {
        return FAN_CACHE_PREFIX + url;
}

function getCachedFan(url) {
        if (!chrome.storage.session) return Promise.resolve(null);
        const key = fanCacheKey(url);
        return chrome.storage.session.get(key).then((items) => {
                const entry = items[key];
                if (!entry) return null;
                if (Date.now() - entry.ts > FAN_CACHE_TTL_MS) {
                        chrome.storage.session.remove(key);
                        return null;
                }
                return entry.data;
        }).catch(() => null);
}

function setCachedFan(url, data) {
        if (!chrome.storage.session) return;
        chrome.storage.session.set({[fanCacheKey(url)]: {ts: Date.now(), data}}).catch(() => {});
}

function queueFanPage(url) {
        // De-dupe in-flight requests for the same URL.
        const existing = fanInflightByUrl.get(url);
        if (existing) return existing;

        const p = getCachedFan(url).then((cached) => {
                if (cached) return cached;
                return new Promise((resolve, reject) => {
                        fanQueue.push({url, resolve, reject});
                        pumpFanQueue();
                });
        });
        fanInflightByUrl.set(url, p);
        p.finally(() => fanInflightByUrl.delete(url));
        return p;
}

function pumpFanQueue() {
        if (fanInflight >= FAN_MAX_CONCURRENCY) return;
        if (fanQueue.length === 0) return;
        const now = Date.now();
        const wait = Math.max(fanCooldownUntil - now, fanLastStart + FAN_MIN_GAP_MS - now, 0);
        if (wait > 0) {
                setTimeout(pumpFanQueue, wait);
                return;
        }
        const job = fanQueue.shift();
        fanInflight++;
        fanLastStart = Date.now();
        runFanFetch(job.url, 0)
                .then(job.resolve, job.reject)
                .finally(() => {
                        fanInflight--;
                        pumpFanQueue();
                });
        // Try to fill up to MAX_CONCURRENCY immediately
        pumpFanQueue();
}

function runFanFetch(url, attempt) {
        return fetch(url).then((res) => {
                if (res.status === 429 || res.status === 503) {
                        if (attempt >= FAN_MAX_RETRIES) {
                                console.warn('[POWERDIGGER] FanPage giving up on', url, 'after', attempt, 'retries');
                                return null;
                        }
                        const ra = res.headers.get('Retry-After');
                        let delay;
                        if (ra && /^\d+$/.test(ra)) {
                                delay = parseInt(ra, 10) * 1000;
                        } else if (ra) {
                                const dt = Date.parse(ra);
                                delay = isNaN(dt) ? null : (dt - Date.now());
                        }
                        if (!delay || delay < 0) {
                                // Exponential backoff with jitter.
                                delay = FAN_BASE_BACKOFF_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 500);
                        }
                        // Pause the whole queue so we don't hammer through the cooldown.
                        fanCooldownUntil = Math.max(fanCooldownUntil, Date.now() + delay);
                        console.warn('[POWERDIGGER] 429 on', url, '- retry in', delay, 'ms');
                        return new Promise((r) => setTimeout(r, delay)).then(() => runFanFetch(url, attempt + 1));
                }
                if (!res.ok) return null;
                return res.text().then((text) => {
                        let commonItems, collectionCount = '0';
                        const commonMatch = text.match(/(\d+)\s+(item|items)\s+in\s+common/);
                        if (commonMatch) commonItems = commonMatch[1];
                        const totalMatch = text.match(/<span class="count">(\d+)<\/span>/);
                        if (totalMatch) collectionCount = totalMatch[1];
                        const data = {commonTracks: commonItems, totalTracks: collectionCount};
                        setCachedFan(url, data);
                        return data;
                });
        }).catch((err) => {
                console.error('[POWERDIGGER] FanPage fetch error:', err);
                return null;
        });
}

// Allow only requests to known hosts (defence-in-depth against a compromised
// content script asking the SW to fetch arbitrary URLs).
function isAllowedFetch(url, allowedSuffixes) {
        try {
                const u = new URL(url);
                if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
                return allowedSuffixes.some(suffix => u.hostname === suffix || u.hostname.endsWith('.' + suffix));
        } catch (_) {
                return false;
        }
}
