(function () {
  function createSearchToken(query) {
    return query.split(/[^\w]/g).filter(Boolean).map(encodeURIComponent).join('+');
  }

  globalThis.pdUrlBuilder = { createSearchToken };
})();
