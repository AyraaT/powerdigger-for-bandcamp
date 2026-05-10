// 3rd-Party Optimizer: auto-click the BPM load button after 1 s.

PD.autoBpm = function () {
  setTimeout(() => {
    if (PD.currentUrl.includes('/track/') || PD.currentUrl.includes('/album/')) {
      const spacer = document.createElement('div');
      spacer.style.height = '40px';
      const app = PD.dom.qs('#pitchSliderApp');
      if (app) app.prepend(spacer);
    }
    try {
      PD.dom.qsa('._button_s60sf_1')[0].click();
    } catch {}
  }, 1000);
};
