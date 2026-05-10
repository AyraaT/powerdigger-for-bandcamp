let skipValue = 0;
const audio = document.querySelector('audio');

(async function initBmc() {
  const rawOptions = await chrome.runtime.sendMessage({
    type: globalThis.PD_CONTRACTS.MSG.OPTIONS,
  });
  const options = window.PDOptionSchema
    ? window.PDOptionSchema.normalizeOptions(rawOptions)
    : rawOptions;

  if (options.prefBmcKeys && audio) {
    window.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowUp') {
        audio.currentTime = 0;
      } else if (event.key === 'ArrowDown') {
        audio.currentTime = audio.duration;
      } else if (event.key === 'ArrowRight') {
        audio.currentTime += 10;
      } else if (event.key === 'ArrowLeft') {
        audio.currentTime -= 10;
      }
    });
  }

  if (options.prefJump && audio) {
    skipValue = options.prefJumpPct;
    audio.addEventListener('loadeddata', jumpTime);
  }
})();

function jumpTime() {
  if (audio.duration > 1) {
    audio.currentTime = Math.round((audio.duration / 100) * skipValue);
  }
}
