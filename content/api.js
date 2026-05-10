// Message constants + tiny API wrapper for content scripts.
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
};
