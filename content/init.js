// Entry point: fetch user options then bootstrap each feature.
// All feature functions (bmcButtons, historyLinks, etc.) are defined in their
// own files and attached to the shared PD namespace.
PD.api.getOptions((rawOptions) => {
        const options = PD.optionSchema ? PD.optionSchema.normalize(rawOptions) : rawOptions;
        const url = PD.currentUrl;
        const isTrackOrAlbum = url.includes('/track/') || url.includes('/album/');

        if (options.prefBmcButtons && isTrackOrAlbum)                     PD.injectBmcButtons();
        if (options.prefCommons && isTrackOrAlbum)                 PD.injectFanBadges();

        if (options.prefHistory) {
                PD.recolorBanner();
                PD.onHistoryChange();
                if (!isTrackOrAlbum) {
                        const grids = PD.dom.qs('#grids');
                        if (grids) new MutationObserver(PD.onHistoryChange).observe(grids, { childList: true, subtree: true });
                }
                document.addEventListener('visibilitychange', () => {
                        if (document.visibilityState === 'visible') PD.onHistoryChange();
                }, false);
        }

        if (options.prefPlayHistory) {
                PD.onTrackChange();
                if (!isTrackOrAlbum) {
                        const grids = PD.dom.qs('#grids');
                        if (grids) new MutationObserver(PD.onTrackChange).observe(grids, { childList: true, subtree: true });
                }
                document.addEventListener('visibilitychange', () => {
                        if (document.visibilityState === 'visible') PD.onTrackChange();
                }, false);
        }

        if (options.prefBpm)   PD.autoBpm();

        if (options.prefJump) {
                PD.skipValue = options.prefJumpPct;
                if (PD.audio) PD.audio.addEventListener('loadeddata', PD.jumpTime);
        }
});
