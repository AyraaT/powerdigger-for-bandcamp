// Fan-page fetching: throttled concurrency + exponential backoff on 429
// + chrome.storage.session cache (6h TTL, cleared on browser close).
import { isAllowedFetch } from './utils.js';

const FAN_MAX_CONCURRENCY = 2;
const FAN_MIN_GAP_MS = 250;      // minimum gap between request starts
const FAN_MAX_RETRIES = 5;
const FAN_BASE_BACKOFF_MS = 1500;
const FAN_CACHE_PREFIX = 'fp:';
const FAN_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const fanQueue = [];             // [{url, resolve, reject}]
let fanInflight = 0;
let fanLastStart = 0;
let fanCooldownUntil = 0;        // global pause when we hit a 429
const fanInflightByUrl = new Map(); // url -> Promise (dedup concurrent requests)

// ── Cache helpers ──────────────────────────────────────────────────────────

function fanCacheKey(url) { return FAN_CACHE_PREFIX + url; }

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
        chrome.storage.session
                .set({ [fanCacheKey(url)]: { ts: Date.now(), data } })
                .catch(() => {});
}

// ── Queue / pump ───────────────────────────────────────────────────────────

export function queueFanPage(url) {
        // De-dupe in-flight requests for the same URL.
        const existing = fanInflightByUrl.get(url);
        if (existing) return existing;

        const p = getCachedFan(url).then((cached) => {
                if (cached) return cached;
                return new Promise((resolve, reject) => {
                        fanQueue.push({ url, resolve, reject });
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
        if (wait > 0) { setTimeout(pumpFanQueue, wait); return; }

        const job = fanQueue.shift();
        fanInflight++;
        fanLastStart = Date.now();
        runFanFetch(job.url, 0)
                .then(job.resolve, job.reject)
                .finally(() => { fanInflight--; pumpFanQueue(); });
        pumpFanQueue(); // fill remaining concurrency slots
}

// ── Fetch + retry ──────────────────────────────────────────────────────────

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
                                delay = FAN_BASE_BACKOFF_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 500);
                        }
                        fanCooldownUntil = Math.max(fanCooldownUntil, Date.now() + delay);
                        console.warn('[POWERDIGGER] 429 on', url, '- retry in', delay, 'ms');
                        return new Promise((r) => setTimeout(r, delay))
                                .then(() => runFanFetch(url, attempt + 1));
                }
                if (!res.ok) return null;
                return res.text().then((text) => {
                        let commonItems, collectionCount = '0';
                        const commonMatch = text.match(/(\d+)\s+(item|items)\s+in\s+common/);
                        if (commonMatch) commonItems = commonMatch[1];
                        const totalMatch = text.match(/<span class="count">(\d+)<\/span>/);
                        if (totalMatch) collectionCount = totalMatch[1];
                        const data = { commonTracks: commonItems, totalTracks: collectionCount };
                        setCachedFan(url, data);
                        return data;
                });
        }).catch((err) => {
                console.error('[POWERDIGGER] FanPage fetch error:', err);
                return null;
        });
}

// ── Public validator (BMC) ─────────────────────────────────────────────────

export function validateBMC(url) {
        if (!isAllowedFetch(url, ['buymusic.club'])) return Promise.resolve(false);
        return fetch(url).then((response) => response.text()).then((response) => {
                const marker = '<script id="__NEXT_DATA__" type="application/json">';
                const startIdx = response.indexOf(marker);
                if (startIdx === -1) return false;
                response = response.substring(startIdx + marker.length);
                response = response.substring(0, response.indexOf('</script>'));
                const data = JSON.parse(response);
                return Object.keys(data.props.pageProps.searchResults).length !== 0;
        }).catch(() => false);
}
