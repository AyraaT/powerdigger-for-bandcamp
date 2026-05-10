// 3rd-Party Optimizer: auto-click the BPM load button after 1 s.

PD.clickBPM = function () {
        setTimeout(() => {
                if (PD.currenturl.includes('/track/') || PD.currenturl.includes('/album/')) {
                        const spacer = document.createElement('div');
                        spacer.style.height = '40px';
                        const app = document.getElementById('pitchSliderApp');
                        if (app) app.prepend(spacer);
                }
                try {
                        document.querySelectorAll('._button_s60sf_1')[0].click();
                } catch (_) {}
        }, 1000);
};
