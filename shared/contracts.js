(function () {
  const MSG = Object.freeze({
    OPTIONS: 'options',
    BACKUP_DOWNLOAD: 'backupDownload',
    PERM_CHECK_EXTENSIONS: 'permCheckExtensions',
    PERM_CHECK_HISTORY: 'permCheckHistory',
    TRACK_GET_COUNT: 'trackGetCount',
    TRACK_PLAY: 'trackPlay',
    HISTORY_CHECK_BATCH: 'historyCheckBatch',
    HISTORY_CHECK: 'historyCheck',
    BMC_VALIDATE: 'bmcValidate',
    FAN_PAGE: 'fanPage',
  });

  const STORAGE = Object.freeze({
    TRACK_KEY_PREFIX: 'tk:',
    FAN_CACHE_PREFIX: 'fp:',
    LEGACY_TRACK_HISTORY_KEY: 'trackHistory',
  });

  const PD_CONTRACTS = Object.freeze({ MSG, STORAGE });
  globalThis.PD_CONTRACTS = PD_CONTRACTS;
})();
