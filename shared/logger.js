(function () {
  function flagEnabled() {
    try {
      if (globalThis.PD_DEBUG === true) return true;
      if (globalThis.localStorage && localStorage.getItem('pd:debug') === '1') return true;
    } catch {}
    return false;
  }

  function fmt(scope, args) {
    return [`[POWERDIGGER:${scope}]`, ...args];
  }

  function mk(scope) {
    return {
      enabled: flagEnabled,
      log(...args) {
        if (flagEnabled()) console.log(...fmt(scope, args));
      },
      warn(...args) {
        if (flagEnabled()) console.warn(...fmt(scope, args));
      },
      error(...args) {
        if (flagEnabled()) console.error(...fmt(scope, args));
      },
    };
  }

  globalThis.PDLogger = { mk };
})();
