import '../shared/contracts.js';
import { local, pickByPrefix } from './storage.js';
import { TRACK_KEY_PREFIX, recordTrackPlay, getTrackCount } from './trackHistory.js';
import { queueFanPage, validateBMC } from './fanQueue.js';
import { isAllowedFetch } from './utils.js';
import { OPTION_DEFAULTS, normalizeOptions } from './optionsSchema.js';

const { MSG } = globalThis.PD_CONTRACTS;

function requestPermission(permission) {
  return chrome.permissions.request({ permissions: [permission] });
}

function ensureString(value) {
  return typeof value === 'string' && value.length > 0;
}

function ensureUrlArray(value) {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

const handlers = {
  async [MSG.OPTIONS]() {
    const raw = await local.get(OPTION_DEFAULTS);
    return normalizeOptions(raw);
  },

  async [MSG.BACKUP_DOWNLOAD]() {
    const granted = await requestPermission('downloads');
    if (!granted) return null;

    const allItems = await local.getAll();
    const prefixed = pickByPrefix(allItems, TRACK_KEY_PREFIX);
    const trackHistory = {};
    for (const [key, value] of Object.entries(prefixed)) {
      trackHistory[key.slice(TRACK_KEY_PREFIX.length)] = value;
    }
    const url = 'data:application/json;base64,' + btoa(JSON.stringify({ trackHistory }));
    chrome.downloads.download({ url, filename: 'POWERDIGGER_backup.json' });
    return { ok: true };
  },

  async [MSG.PERM_CHECK_EXTENSIONS]() {
    const granted = await requestPermission('management');
    if (!granted) {
      await local.set({ prefBpm: false });
      return false;
    }

    const extensionBCE = 'padcfdpdlnpdojcihidkgjnmleeingep';
    const extensionBCT = 'iniomjoihcjgakkfaebmcbnhmiobppel';
    const extensions = await chrome.management.getAll();
    const ok =
      extensions.some((e) => e.id === extensionBCE && e.enabled) &&
      extensions.some((e) => e.id === extensionBCT && e.enabled);

    await local.set({ prefBpm: ok });
    return ok;
  },

  async [MSG.PERM_CHECK_HISTORY]() {
    const granted = await requestPermission('history');
    await local.set({ prefHistory: granted });
    return granted;
  },

  async [MSG.TRACK_GET_COUNT](message) {
    if (!ensureString(message.trackid)) return 0;
    return getTrackCount(message.trackid);
  },

  async [MSG.TRACK_PLAY](message) {
    if (!ensureString(message.trackid)) return 0;
    return recordTrackPlay(message.trackid);
  },

  async [MSG.HISTORY_CHECK_BATCH](message) {
    if (!ensureUrlArray(message.urls)) return { results: [] };

    const cutoff = Date.now() - 3000;
    const results = await Promise.all(
      message.urls.map(async (url) => {
        try {
          const visits = await chrome.history.getVisits({ url });
          if (!visits) return { error: true };
          return visits.filter((v) => v.visitTime < cutoff).length === 0;
        } catch {
          return { error: true };
        }
      }),
    );

    return { results };
  },

  async [MSG.HISTORY_CHECK](message) {
    if (!ensureString(message.url)) return { error: true };

    try {
      const result = await chrome.history.getVisits({ url: message.url });
      if (!result) return { error: true };
      const found = result.filter((el) => el.visitTime < Date.now() - 3000);
      return found.length === 0;
    } catch {
      return { error: true };
    }
  },

  async [MSG.BMC_VALIDATE](message) {
    if (!ensureString(message.url)) return false;
    return validateBMC(message.url);
  },

  async [MSG.FAN_PAGE](message) {
    if (!ensureString(message.url)) return null;
    if (!isAllowedFetch(message.url, ['bandcamp.com'])) return null;
    return queueFanPage(message.url).catch(() => null);
  },
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = handlers[message?.type];
  if (!handler) return false;

  Promise.resolve(handler(message, sender))
    .then((result) => sendResponse(result))
    .catch(() => sendResponse(null));
  return true;
});
