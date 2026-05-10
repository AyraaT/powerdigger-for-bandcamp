window.PD = window.PD || {};

const MSG = globalThis.PD_CONTRACTS.MSG;

PD.api = {
  send(type, payload = {}) {
    return chrome.runtime.sendMessage({ type, ...payload });
  },

  getOptions() {
    return this.send(MSG.OPTIONS);
  },

  historyCheck(url) {
    return this.send(MSG.HISTORY_CHECK, { url });
  },

  historyCheckBatch(urls) {
    return this.send(MSG.HISTORY_CHECK_BATCH, { urls });
  },

  trackGetCount(trackid) {
    return this.send(MSG.TRACK_GET_COUNT, { trackid });
  },

  trackPlay(trackid) {
    return this.send(MSG.TRACK_PLAY, { trackid });
  },

  bmcValidate(url) {
    return this.send(MSG.BMC_VALIDATE, { url });
  },

  fanPage(url) {
    return this.send(MSG.FAN_PAGE, { url });
  },
};
