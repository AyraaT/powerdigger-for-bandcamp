// Common-fan-tracks badges: hover thumbnails on track/album pages to see
// how many tracks you share with each fan.
// Requests are throttled and retried in the service worker (fanQueue.js).

PD.injectFanBadges = function () {
        const fans = document.getElementsByClassName('pic');
        for (const fan of fans) {
                const nameEl = fan.getElementsByClassName('name')[0];
                const badge  = document.createElement('b');
                badge.className    = 'pd-common-badge';
                badge.style.marginLeft = '0.5em';
                badge.style.opacity    = '0.6';
                badge.textContent  = '(…)';
                if (nameEl) nameEl.appendChild(badge);

                chrome.runtime.sendMessage({ type: 'fanPage', url: fan.href }, (response) => {
                        if (!response) {
                                badge.textContent = '(?)';
                                badge.title = 'Could not fetch (rate-limited or network error).';
                                return;
                        }
                        badge.style.opacity = '1';
                        badge.textContent = '(' + (response.commonTracks || '0') + '/' + (response.totalTracks || '0') + ')';
                });
        }
};
