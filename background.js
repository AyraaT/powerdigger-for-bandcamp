// Atomically increment trackHistory[trackid] and return the new count.
// Uses a tiny in-memory queue keyed by trackid so concurrent messages don't
// race (each completes its read-modify-write before the next starts).
const trackPlayQueues = new Map(); // trackid -> Promise chain tail
function recordTrackPlay(trackid) {
        const prev = trackPlayQueues.get(trackid) || Promise.resolve();
        const next = prev.then(() => new Promise((resolve) => {
                chrome.storage.local.get({trackHistory: {}}).then((result) => {
                        const cur = (result.trackHistory[trackid] || 0) + 1;
                        result.trackHistory[trackid] = cur;
                        chrome.storage.local.set({trackHistory: result.trackHistory}).then(() => resolve(cur));
                });
        }));
        trackPlayQueues.set(trackid, next.catch(() => {}));
        return next;
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
                                                chrome.storage.local.get({trackHistory:{}}, function(items) { // null implies all items
                                                    // Convert object to a string.
                                                    var result = JSON.stringify(items);
                                                    // Save as file
                                                    var url = 'data:application/json;base64,' + btoa(result);
                                                    chrome.downloads.download({url: url, filename: 'POWERDIGGER_backup.json'});
                                                });
                                        } 
                                });
        }
        if (message.type === "checkExtensions"){
            chrome.permissions.request({permissions: ['management']}, function (granted) {
                                        if (granted) {
                                                var extensionBCE = 'padcfdpdlnpdojcihidkgjnmleeingep';
                                                var extensionBCT = 'iniomjoihcjgakkfaebmcbnhmiobppel';
                                                chrome.management.getAll(function(extensions) {
                                                        var BCEisInstalled = extensions.some(function(extensionInfo) {return extensionInfo.id === extensionBCE  && extensionInfo.enabled;});
                                                        var BCTisInstalled = extensions.some(function(extensionInfo) {return extensionInfo.id === extensionBCT && extensionInfo.enabled;});
                                                        if (BCEisInstalled && BCTisInstalled){
                                                                chrome.storage.local.set({obpm: true});
                                                                senderResponse(true);

                                                        }else{
                                                                chrome.storage.local.set({obpm: false});
                                                                chrome.tabs.create({url: "https://chrome.google.com/webstore/detail/bandcamp-enhancement-suit/padcfdpdlnpdojcihidkgjnmleeingep", active: false});
                                                                chrome.tabs.create({url: "https://chrome.google.com/webstore/detail/bandcamp-tempo-adjust/iniomjoihcjgakkfaebmcbnhmiobppel", active: false});
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
                let trackid = message.trackid;
                chrome.storage.local.get({
                        trackHistory: {}
                }).then((result) => {
                        if (trackid in result.trackHistory) {
                                senderResponse(result.trackHistory[trackid]);
                        } else {
                                senderResponse(0);
                        }
                });
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

// ---------- FanPage throttled fetch with 429 retry ----------
// Bandcamp rate-limits aggressive fan-profile scraping. Run requests through a
// small concurrency pool with exponential backoff that honours Retry-After.
const FAN_MAX_CONCURRENCY = 2;
const FAN_MIN_GAP_MS = 250;     // minimum gap between request starts
const FAN_MAX_RETRIES = 5;
const FAN_BASE_BACKOFF_MS = 1500;

const fanQueue = [];            // [{url, resolve, reject}]
let fanInflight = 0;
let fanLastStart = 0;
let fanCooldownUntil = 0;       // global pause when we hit a 429

function queueFanPage(url) {
        return new Promise((resolve, reject) => {
                fanQueue.push({url, resolve, reject});
                pumpFanQueue();
        });
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
                        return {commonTracks: commonItems, totalTracks: collectionCount};
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
