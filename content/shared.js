// Shared state — imported by all content modules (same global scope via
// manifest content_scripts list, so these variables are truly shared).
// Using `var` on window so any module can read and write them.

window.PD = window.PD || {};
PD.log = globalThis.PDLogger?.mk('content') ?? console;

PD.currentUrl = window.location.href;
PD.nameSection = document.getElementById('name-section');
PD.audio = document.querySelector('audio');
PD.data = null; // ld+json, populated below for track/album pages
PD.skipValue = 0;
PD.observers = [];

// Load ld+json once — used by trackHistory, bmcButtons, and (future) library.
if (PD.currentUrl.includes('/track/') || PD.currentUrl.includes('/album/')) {
  try {
    PD.data = JSON.parse(document.querySelector('script[type="application/ld+json"]').innerHTML);
  } catch {}
}

// Debounce helper — prevents observer double-fires.
PD.debounce = function (fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};
