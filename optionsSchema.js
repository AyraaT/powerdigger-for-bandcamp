// Centralized option defaults/migration for popup + bmc content scripts.
(function () {
  const DEFAULTS = Object.freeze({
    prefHistory: false,
    prefPlayHistory: false,
    prefBmcButtons: false,
    prefBmcKeys: null,
    prefBpm: false,
    prefJump: false,
    prefJumpPct: 0,
    prefCommons: false,
  });

  function normalizeOptions(raw) {
    const options = Object.assign({}, DEFAULTS, raw || {});
    if (options.prefBmcKeys === null) options.prefBmcKeys = options.prefBmcButtons;
    return options;
  }

  window.PDOptionSchema = { DEFAULTS, normalizeOptions };
})();
