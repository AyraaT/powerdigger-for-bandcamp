// Entry point: fetch user options then bootstrap each feature.
// All feature functions (bmcButtons, historyLinks, etc.) are defined in their
// own files and attached to the shared PD namespace.
chrome.runtime.sendMessage({ type: 'options' }, (options) => {
        const url = PD.currenturl;
        const isTrackOrAlbum = url.includes('/track/') || url.includes('/album/');

        if (options.obmc && isTrackOrAlbum)                     PD.bmcButtons();
        if (options.ocommons && isTrackOrAlbum)                 PD.commonFanTracks();

        if (options.ohistory) {
                PD.historyRecolor();
                PD.historycatcher();
                if (!isTrackOrAlbum) {
                        const grids = document.getElementById('grids');
                        if (grids) new MutationObserver(PD.historycatcher).observe(grids, { childList: true, subtree: true });
                }
                document.addEventListener('visibilitychange', () => {
                        if (document.visibilityState === 'visible') PD.historycatcher();
                }, false);
        }

        if (options.otrhistory) {
                PD.trackcatcher();
                if (!isTrackOrAlbum) {
                        const grids = document.getElementById('grids');
                        if (grids) new MutationObserver(PD.trackcatcher).observe(grids, { childList: true, subtree: true });
                }
                document.addEventListener('visibilitychange', () => {
                        if (document.visibilityState === 'visible') PD.trackcatcher();
                }, false);
        }

        if (options.obpm)   PD.clickBPM();

        if (options.ojump) {
                PD.skipValue = options.ojumpNr;
                if (PD.audio) PD.audio.addEventListener('loadeddata', PD.jumpTime);
        }
});
