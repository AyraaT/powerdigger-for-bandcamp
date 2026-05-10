// Browser-history colouring: top banner + all links on the page.

// ── Top-banner recolor ────────────────────────────────────────────────────
PD.historyRecolor = function () {
        chrome.runtime.sendMessage({ type: 'nobrowserhistory', url: PD.currenturl }, (response) => {
                const menubar = document.getElementById('menubar');
                if (!menubar) return;
                if (response && response.error) {
                        menubar.style.backgroundColor = 'yellow';          // perm denied / error
                } else if (response === true) {
                        menubar.style.backgroundColor = 'DarkSeaGreen';   // not visited
                } else {
                        menubar.style.backgroundColor = 'Salmon';         // visited
                }
        });
};

// ── Debounced observer entry point ────────────────────────────────────────
PD.historycatcher = PD.debounce(() => PD.linkRecolor(), 50);

// ── Batched link recolor ──────────────────────────────────────────────────
PD.linkRecolor = function () {
        const alllinks = document.querySelectorAll('a[href]');
        const byHref = new Map(); // href -> [elements]
        alllinks.forEach((a) => {
                let href;
                try { href = new URL(a.href).href; } catch (_) { return; }
                if (!byHref.has(href)) byHref.set(href, []);
                byHref.get(href).push(a);
        });
        const urls = Array.from(byHref.keys());
        if (urls.length === 0) return;

        const CHUNK = 100;
        for (let i = 0; i < urls.length; i += CHUNK) {
                const slice = urls.slice(i, i + CHUNK);
                chrome.runtime.sendMessage({ type: 'nobrowserhistoryBatch', urls: slice }, (response) => {
                        if (!response || !response.results) return;
                        response.results.forEach((res, j) => {
                                const els = byHref.get(slice[j]);
                                if (!els || (res && res.error)) return;
                                const color = res === true ? 'DarkOliveGreen' : 'DarkRed';
                                els.forEach((el) => { el.style.color = color; });
                        });
                });
        }
};
