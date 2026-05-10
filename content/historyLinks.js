// Browser-history colouring: top banner + all links on the page.

PD.recolorBanner = async function () {
  const response = await PD.api.historyCheck(PD.currentUrl);
  const menubar = PD.dom.qs('#menubar');
  if (!menubar) return;

  if (response && response.error) {
    menubar.style.backgroundColor = 'yellow';
  } else if (response === true) {
    menubar.style.backgroundColor = 'DarkSeaGreen';
  } else {
    menubar.style.backgroundColor = 'Salmon';
  }
};

PD.onHistoryChange = PD.debounce(() => {
  PD.recolorLinks();
}, 50);

PD.recolorLinks = async function () {
  const alllinks = PD.dom.qsa('a[href]');
  const byHref = new Map();
  alllinks.forEach((a) => {
    let href;
    try {
      href = new URL(a.href).href;
    } catch {
      return;
    }
    if (!byHref.has(href)) byHref.set(href, []);
    byHref.get(href).push(a);
  });

  const urls = Array.from(byHref.keys());
  if (urls.length === 0) return;

  const CHUNK = 100;
  for (let i = 0; i < urls.length; i += CHUNK) {
    const slice = urls.slice(i, i + CHUNK);
    const response = await PD.api.historyCheckBatch(slice);
    if (!response || !response.results) continue;

    response.results.forEach((res, j) => {
      const els = byHref.get(slice[j]);
      if (!els || (res && res.error)) return;
      const color = res === true ? 'DarkOliveGreen' : 'DarkRed';
      els.forEach((el) => {
        el.style.color = color;
      });
    });
  }
};
