// Buy Music Club + SoundCloud buttons injected on track / album pages.

PD.bmcButtons = function () {
        if (!PD.insertionPoint || !PD.data) return;

        const type = PD.data['@type'];
        let trackURL = '', albumURL = '', artistURL = '', scbuttonurl = '';
        let queryCount = 0;
        let trackBool = false, albumBool = false, artistBool = false;

        const ip = PD.insertionPoint;
        ip.append(document.createElement('br'));

        const scbutton = document.createElement('button');
        scbutton.innerHTML = 'Sound<br>cloud';
        scbutton.style.backgroundColor = '#FF5500';
        scbutton.style.fontWeight = 'bolder';
        scbutton.style.color = '#000000';
        scbutton.style.textAlign = 'left';

        if (type === 'MusicRecording') {
                const trackID  = PD.data.name;
                const albumID  = PD.data.inAlbum.name;
                const artistID = PD.data.byArtist.name;
                if (trackID.includes('-')) {
                        scbuttonurl = 'https://soundcloud.com/search?q=' + urlCreator(trackID);
                        trackURL    = 'https://www.buymusic.club/search/' + urlCreator(trackID);
                } else {
                        scbuttonurl = 'https://soundcloud.com/search?q=' + urlCreator(artistID + ' ' + trackID);
                        trackURL    = 'https://www.buymusic.club/search/' + urlCreator(artistID + ' ' + trackID);
                }
                albumURL  = 'https://www.buymusic.club/search/' + urlCreator(artistID + ' ' + albumID);
                artistURL = 'https://www.buymusic.club/search/' + urlCreator(artistID);
                scbutton.onclick = () => window.open(scbuttonurl, '_blank');
                ip.append(scbutton);
                queryCount = 3;
                qBMC(trackURL,  'track');
                qBMC(albumURL,  'album');
                qBMC(artistURL, 'artist');
        } else if (type === 'MusicAlbum') {
                const albumID  = PD.data.name;
                const artistID = PD.data.byArtist.name;
                scbuttonurl = 'https://soundcloud.com/search?q=' + urlCreator(artistID + ' ' + albumID);
                albumURL    = 'https://www.buymusic.club/search/' + urlCreator(artistID + ' ' + albumID);
                artistURL   = 'https://www.buymusic.club/search/' + urlCreator(artistID);
                scbutton.onclick = () => window.open(scbuttonurl, '_blank');
                ip.append(scbutton);
                queryCount = 2;
                qBMC(albumURL,  'album');
                qBMC(artistURL, 'artist');
        }

        // ── URL builder ─────────────────────────────────────────────────────
        function urlCreator(query) {
                return query.split(/[^\w]/g).filter(Boolean).map(encodeURIComponent).join('+');
        }

        // ── Validate and count down ──────────────────────────────────────────
        function qBMC(url, label) {
                chrome.runtime.sendMessage({ type: 'validate', url }, (valid) => {
                        if (valid && label === 'track')  trackBool  = true;
                        if (valid && label === 'album')  albumBool  = true;
                        if (valid && label === 'artist') artistBool = true;
                        queryCount--;
                        if (queryCount === 0) renderButtons();
                });
        }

        // ── Render result buttons ────────────────────────────────────────────
        function renderButtons() {
                const entries = [
                        { flag: trackBool,  label: 'TRACK',  url: trackURL  },
                        { flag: albumBool,  label: 'ALBUM',  url: albumURL  },
                        { flag: artistBool, label: 'ARTIST', url: artistURL },
                ];
                entries.forEach(({ flag, label, url }) => {
                        if (!flag) return;
                        const btn = document.createElement('button');
                        btn.innerHTML = `<span style='color:black'>BMC:</span><br>${label}`;
                        btn.style.backgroundColor = 'white';
                        btn.style.fontWeight = 'bolder';
                        btn.style.color = '#1A00FF';
                        btn.style.textAlign = 'left';
                        btn.onclick = () => window.open(url, '_blank');
                        ip.append(btn);
                });
        }
};
