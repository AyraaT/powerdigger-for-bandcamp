// Track-skip: jump to a configured percentage of the track on load.

PD.jumpTime = function () {
  if (PD.audio && PD.audio.duration > 1) {
    PD.audio.currentTime = Math.round((PD.audio.duration / 100) * PD.skipValue);
  }
};
