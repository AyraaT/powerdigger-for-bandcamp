// Message constants + typed-ish API wrapper for content scripts.
window.PD = window.PD || {};

PD.MSG = Object.freeze({
        OPTIONS: 'options',
        HISTORY_CHECK: 'historyCheck',
        HISTORY_CHECK_BATCH: 'historyCheckBatch',
        TRACK_GET_COUNT: 'trackGetCount',
        TRACK_PLAY: 'trackPlay',
        BMC_VALIDATE: 'bmcValidate',
        FAN_PAGE: 'fanPage',
});

PD.api = {
        send(type, payload = {}, cb) {
                chrome.runtime.sendMessage({ type, ...payload }, cb);
        },

        getOptions(cb) {
                this.send(PD.MSG.OPTIONS, {}, cb);
        },

        historyCheck(url, cb) {
                this.send(PD.MSG.HISTORY_CHECK, { url }, cb);
        },

        historyCheckBatch(urls, cb) {
                this.send(PD.MSG.HISTORY_CHECK_BATCH, { urls }, cb);
        },

        trackGetCount(trackid, cb) {
                this.send(PD.MSG.TRACK_GET_COUNT, { trackid }, cb);
        },

        trackPlay(trackid, cb) {
                this.send(PD.MSG.TRACK_PLAY, { trackid }, cb);
        },

        bmcValidate(url, cb) {
                this.send(PD.MSG.BMC_VALIDATE, { url }, cb);
        },

        fanPage(url, cb) {
                this.send(PD.MSG.FAN_PAGE, { url }, cb);
        },
};
