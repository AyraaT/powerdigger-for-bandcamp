const MSG = {
        OPTIONS: 'options',
};

function send(type, payload = {}, cb) {
        chrome.runtime.sendMessage({ type, ...payload }, cb);
}

let skipValue = 0;
const audio = document.querySelector('audio');

send(MSG.OPTIONS, {}, (options) => {
        if (options.prefBmcKeys) {
                window.addEventListener('keydown', function (event) {
                        if (event.key === 'ArrowUp') {
                                audio.currentTime = 0;
                        } else if (event.key === 'ArrowDown') {
                                audio.currentTime = audio.duration;
                        } else if (event.key === 'ArrowRight') {
                                audio.currentTime = audio.currentTime + 10;
                        } else if (event.key === 'ArrowLeft') {
                                audio.currentTime = audio.currentTime - 10;
                        }
                });
        }
        if (options.prefJump) {
                skipValue = options.prefJumpPct;
                audio.addEventListener('loadeddata', jumpTime);
        }
});

function jumpTime() {
        if (audio.duration > 1) {
                audio.currentTime = Math.round(audio.duration / 100 * skipValue);
        }
}
