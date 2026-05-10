// Centralized option defaults and migration helpers for background context.

export const OPTION_DEFAULTS = Object.freeze({
        prefHistory: false,
        prefPlayHistory: false,
        prefBmcButtons: false,
        prefBmcKeys: null, // null => migrate from prefBmcButtons
        prefBpm: false,
        prefJump: false,
        prefJumpPct: 0,
        prefCommons: false,
});

export function normalizeOptions(raw) {
        const options = { ...OPTION_DEFAULTS, ...(raw || {}) };
        if (options.prefBmcKeys === null) options.prefBmcKeys = options.prefBmcButtons;
        return options;
}
