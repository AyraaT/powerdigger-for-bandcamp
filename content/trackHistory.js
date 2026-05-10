// Play-history colouring: track page, album page, profile page.
// Tracks turn progressively more red (10 shades) as play count increases.

function playColor(count) {
        const recolor = 255 - (255 / 10 * Math.min(count, 10));
        return `rgb(255,${recolor},${recolor})`;
}

// ── Debounced observer entry point ────────────────────────────────────────
PD.trackcatcher = PD.debounce(() => PD.trackRecolor(), 50);

// ── Main router ───────────────────────────────────────────────────────────
PD.trackRecolor = function () {
        const url = PD.currenturl;
        if (url.includes('/track/'))  { trackPageRecolor(); return; }
        if (url.includes('/album/'))  { albumPageRecolor(); return; }
        if (!url.includes('/tag/'))   { profilePageRecolor(); }
};

// ── Track page ────────────────────────────────────────────────────────────
function trackPageRecolor() {
        if (!PD.data) return;
        const playbutton = document.querySelector('div.playbutton');
        const titleEl = document.querySelector('h2.trackTitle');
        if (!playbutton || !titleEl) return;
        titleEl.style.color = 'black';

        const trackId = PD.data.additionalProperty[0].value.toString();

        // Set initial color from stored history.
        chrome.runtime.sendMessage({ type: 'trackhistory', trackid: trackId }, (count) => {
                if (count) titleEl.style.backgroundColor = playColor(count);
        });

        // Update color when the track starts playing.
        const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                        if (
                                (!mutation.oldValue || !mutation.oldValue.match(/\bplaying\b/)) &&
                                mutation.target.classList && mutation.target.classList.contains('playing')
                        ) {
                                chrome.runtime.sendMessage({ type: 'trackplay', trackid: trackId }, (count) => {
                                        titleEl.style.backgroundColor = playColor(count);
                                });
                        }
                });
        });
        observer.observe(playbutton, { attributes: true, attributeOldValue: true, attributeFilter: ['class'] });
}

// ── Album page ────────────────────────────────────────────────────────────
function albumPageRecolor() {
        if (!PD.data || !PD.data.track) return;
        const playbutton = document.querySelector('div.playbutton');
        const table = document.querySelectorAll('tr.track_row_view');
        if (!playbutton) return;

        document.getElementById('track_table')
                .querySelectorAll('a, div, span')
                .forEach((el) => { el.style.color = 'black'; });

        const trackIDs = PD.data.track.itemListElement
                .map((el) => el.item.additionalProperty[0].value.toString());

        // Set initial colors.
        trackIDs.forEach((id, i) => {
                chrome.runtime.sendMessage({ type: 'trackhistory', trackid: id }, (count) => {
                        if (count && table[i]) table[i].style.backgroundColor = playColor(count);
                });
        });

        // Update on play.
        const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                        if (
                                (!mutation.oldValue || !mutation.oldValue.match(/\bplaying\b/)) &&
                                mutation.target.classList && mutation.target.classList.contains('playing')
                        ) {
                                const rel = document.querySelector('tr.current_track').getAttribute('rel') || '';
                                const idx = parseInt(rel.replace('tracknum=', ''), 10) - 1;
                                chrome.runtime.sendMessage({ type: 'trackplay', trackid: trackIDs[idx] }, (count) => {
                                        if (table[idx]) table[idx].style.backgroundColor = playColor(count);
                                });
                        }
                });
        });
        observer.observe(playbutton, { attributes: true, attributeOldValue: true, attributeFilter: ['class'] });
}

// ── Profile page ──────────────────────────────────────────────────────────
function profilePageRecolor() {
        // Disconnect stale observers before re-scanning.
        PD.ObserverArray.forEach((obs) => obs.disconnect());
        PD.ObserverArray = [];
        document.querySelectorAll('li.collection-item-container').forEach(checkPlays);
}

function checkPlays(item) {
        const trackId = item.getAttribute('data-trackid');
        if (!trackId) return;

        // Set initial color.
        chrome.runtime.sendMessage({ type: 'trackhistory', trackid: trackId }, (count) => {
                if (count) item.style.backgroundColor = playColor(count);
        });

        // Update on play.
        const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                        if (
                                (!mutation.oldValue || !mutation.oldValue.match(/\bplaying\b/)) &&
                                mutation.target.classList && mutation.target.classList.contains('playing')
                        ) {
                                chrome.runtime.sendMessage({ type: 'trackplay', trackid: trackId }, (count) => {
                                        item.style.backgroundColor = playColor(count);
                                });
                        }
                });
        });
        observer.observe(item, { attributes: true, attributeOldValue: true, attributeFilter: ['class'] });
        PD.ObserverArray.push(observer);
}
