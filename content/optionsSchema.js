// Option defaults/migration for bandcamp content scripts.
window.PD = window.PD || {};

PD.optionSchema = {
        DEFAULTS: Object.freeze({
                prefHistory: false,
                prefPlayHistory: false,
                prefBmcButtons: false,
                prefBmcKeys: null,
                prefBpm: false,
                prefJump: false,
                prefJumpPct: 0,
                prefCommons: false,
        }),
        normalize(raw) {
                const options = Object.assign({}, this.DEFAULTS, raw || {});
                if (options.prefBmcKeys === null) options.prefBmcKeys = options.prefBmcButtons;
                return options;
        },
};
