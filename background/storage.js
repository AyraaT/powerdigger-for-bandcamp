// Small storage adapters to keep Chrome storage calls consistent.

export const local = {
        get(defaultsOrKey) {
                return chrome.storage.local.get(defaultsOrKey);
        },
        set(obj) {
                return chrome.storage.local.set(obj);
        },
        remove(keyOrKeys) {
                return chrome.storage.local.remove(keyOrKeys);
        },
        getAll() {
                return chrome.storage.local.get(null);
        },
};

export const session = {
        hasApi() {
                return !!chrome.storage.session;
        },
        get(key) {
                if (!chrome.storage.session) return Promise.resolve({});
                return chrome.storage.session.get(key);
        },
        set(obj) {
                if (!chrome.storage.session) return Promise.resolve();
                return chrome.storage.session.set(obj);
        },
        remove(keyOrKeys) {
                if (!chrome.storage.session) return Promise.resolve();
                return chrome.storage.session.remove(keyOrKeys);
        },
};

export function pickByPrefix(obj, prefix) {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
                if (k.startsWith(prefix)) out[k] = v;
        }
        return out;
}
