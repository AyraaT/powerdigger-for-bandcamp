// Play-history colouring: track page, album page, profile page.
// Tracks turn progressively more red (10 shades) as play count increases.

function playColor(count) {
  const recolor = 255 - (255 / 10) * Math.min(count, 10);
  return `rgb(255,${recolor},${recolor})`;
}

PD.onTrackChange = PD.debounce(() => {
  PD.recolorTracks();
}, 50);

PD.recolorTracks = function () {
  const url = PD.currentUrl;
  if (url.includes('/track/')) {
    trackPageRecolor();
    return;
  }
  if (url.includes('/album/')) {
    albumPageRecolor();
    return;
  }
  if (!url.includes('/tag/')) profilePageRecolor();
};

async function trackPageRecolor() {
  if (!PD.data) return;
  const playbutton = PD.dom.qs('div.playbutton');
  const titleEl = PD.dom.qs('h2.trackTitle');
  if (!playbutton || !titleEl) return;
  titleEl.style.color = 'black';

  const trackId = PD.data.additionalProperty[0].value.toString();
  const count = await PD.api.trackGetCount(trackId);
  if (count) titleEl.style.backgroundColor = playColor(count);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach(async (mutation) => {
      if (
        (!mutation.oldValue || !mutation.oldValue.match(/\bplaying\b/)) &&
        mutation.target.classList &&
        mutation.target.classList.contains('playing')
      ) {
        const nextCount = await PD.api.trackPlay(trackId);
        titleEl.style.backgroundColor = playColor(nextCount);
      }
    });
  });
  observer.observe(playbutton, {
    attributes: true,
    attributeOldValue: true,
    attributeFilter: ['class'],
  });
}

async function albumPageRecolor() {
  if (!PD.data || !PD.data.track) return;
  const playbutton = PD.dom.qs('div.playbutton');
  const table = PD.dom.qsa('tr.track_row_view');
  const trackTableEl = PD.dom.qs('#track_table');
  if (!playbutton || !trackTableEl) return;

  trackTableEl.querySelectorAll('a, div, span').forEach((el) => {
    el.style.color = 'black';
  });

  const trackIDs = PD.data.track.itemListElement.map((el) =>
    el.item.additionalProperty[0].value.toString(),
  );

  for (let i = 0; i < trackIDs.length; i++) {
    const count = await PD.api.trackGetCount(trackIDs[i]);
    if (count && table[i]) table[i].style.backgroundColor = playColor(count);
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach(async (mutation) => {
      if (
        (!mutation.oldValue || !mutation.oldValue.match(/\bplaying\b/)) &&
        mutation.target.classList &&
        mutation.target.classList.contains('playing')
      ) {
        const currentTrackEl = PD.dom.qs('tr.current_track');
        if (!currentTrackEl) return;
        const rel = currentTrackEl.getAttribute('rel') || '';
        const idx = parseInt(rel.replace('tracknum=', ''), 10) - 1;
        if (!Number.isFinite(idx) || idx < 0 || idx >= trackIDs.length) return;
        const nextCount = await PD.api.trackPlay(trackIDs[idx]);
        if (table[idx]) table[idx].style.backgroundColor = playColor(nextCount);
      }
    });
  });
  observer.observe(playbutton, {
    attributes: true,
    attributeOldValue: true,
    attributeFilter: ['class'],
  });
}

function profilePageRecolor() {
  PD.observers.forEach((obs) => obs.disconnect());
  PD.observers = [];
  PD.dom.qsa('li.collection-item-container').forEach(checkPlays);
}

async function checkPlays(item) {
  const trackId = item.getAttribute('data-trackid');
  if (!trackId) return;

  const count = await PD.api.trackGetCount(trackId);
  if (count) item.style.backgroundColor = playColor(count);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach(async (mutation) => {
      if (
        (!mutation.oldValue || !mutation.oldValue.match(/\bplaying\b/)) &&
        mutation.target.classList &&
        mutation.target.classList.contains('playing')
      ) {
        const nextCount = await PD.api.trackPlay(trackId);
        item.style.backgroundColor = playColor(nextCount);
      }
    });
  });
  observer.observe(item, { attributes: true, attributeOldValue: true, attributeFilter: ['class'] });
  PD.observers.push(observer);
}
