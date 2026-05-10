import '../shared/contracts.js';
import { isAllowedFetch } from './utils.js';
import { session } from './storage.js';

const { STORAGE } = globalThis.PD_CONTRACTS;
const logger = globalThis.PDLogger?.mk('fanQueue') ?? console;

const FAN_MAX_CONCURRENCY = 2;
const FAN_MIN_GAP_MS = 250;
const FAN_MAX_RETRIES = 5;
const FAN_BASE_BACKOFF_MS = 1500;
const FAN_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const fanQueue = [];
let fanInflight = 0;
let fanLastStart = 0;
let fanCooldownUntil = 0;
const fanInflightByUrl = new Map();

function fanCacheKey(url) {
  return STORAGE.FAN_CACHE_PREFIX + url;
}

export function isCacheEntryFresh(entry, now = Date.now()) {
  return !!entry && typeof entry.ts === 'number' && now - entry.ts <= FAN_CACHE_TTL_MS;
}

export function computeRetryDelay(
  retryAfterHeader,
  attempt,
  now = Date.now(),
  jitterFn = () => Math.floor(Math.random() * 500),
) {
  let delay;
  if (retryAfterHeader && /^\d+$/.test(retryAfterHeader)) {
    delay = parseInt(retryAfterHeader, 10) * 1000;
  } else if (retryAfterHeader) {
    const dt = Date.parse(retryAfterHeader);
    delay = Number.isNaN(dt) ? null : dt - now;
  }

  if (!delay || delay < 0) {
    delay = FAN_BASE_BACKOFF_MS * Math.pow(2, attempt) + jitterFn();
  }
  return delay;
}

function getCachedFan(url) {
  if (!session.hasApi()) return Promise.resolve(null);
  const key = fanCacheKey(url);
  return session
    .get(key)
    .then((items) => {
      const entry = items[key];
      if (!isCacheEntryFresh(entry)) {
        if (entry) session.remove(key);
        return null;
      }
      return entry.data;
    })
    .catch(() => null);
}

function setCachedFan(url, data) {
  if (!session.hasApi()) return;
  session.set({ [fanCacheKey(url)]: { ts: Date.now(), data } }).catch(() => {});
}

export function queueFanPage(url) {
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

  pumpFanQueue();
}

function runFanFetch(url, attempt) {
  return fetch(url)
    .then((res) => {
      if (res.status === 429 || res.status === 503) {
        if (attempt >= FAN_MAX_RETRIES) {
          logger.warn('max retries reached', { url, attempt });
          return null;
        }

        const delay = computeRetryDelay(res.headers.get('Retry-After'), attempt);
        logger.warn('rate limited; backing off', { url, attempt, delay, status: res.status });
        fanCooldownUntil = Math.max(fanCooldownUntil, Date.now() + delay);
        return new Promise((resolve) => setTimeout(resolve, delay)).then(() =>
          runFanFetch(url, attempt + 1),
        );
      }

      if (!res.ok) return null;

      return res.text().then((text) => {
        let commonItems;
        let collectionCount = '0';
        const commonMatch = text.match(/(\d+)\s+(item|items)\s+in\s+common/);
        if (commonMatch) commonItems = commonMatch[1];
        const totalMatch = text.match(/<span class="count">(\d+)<\/span>/);
        if (totalMatch) collectionCount = totalMatch[1];

        const data = { commonTracks: commonItems, totalTracks: collectionCount };
        setCachedFan(url, data);
        return data;
      });
    })
    .catch(() => null);
}

export function validateBMC(url) {
  if (!isAllowedFetch(url, ['buymusic.club'])) return Promise.resolve(false);

  return fetch(url)
    .then((response) => response.text())
    .then((responseText) => {
      const marker = '<script id="__NEXT_DATA__" type="application/json">';
      const startIdx = responseText.indexOf(marker);
      if (startIdx === -1) return false;

      const payload = responseText.substring(
        startIdx + marker.length,
        responseText.indexOf('</script>', startIdx),
      );
      const data = JSON.parse(payload);
      return Object.keys(data.props.pageProps.searchResults).length !== 0;
    })
    .catch(() => false);
}
