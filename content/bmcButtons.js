// Buy Music Club + SoundCloud buttons injected on track / album pages.

PD.injectBmcButtons = function () {
        if (!PD.nameSection || !PD.data) return;

        const type = PD.data['@type'];
        let trackURL = '', albumURL = '', artistURL = '', scbuttonurl = '';

        const ip = PD.nameSection;
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

                validateAll([
                        { label: 'track', url: trackURL },
                        { label: 'album', url: albumURL },
                        { label: 'artist', url: artistURL },
                ]).then(renderButtons);

        } else if (type === 'MusicAlbum') {
                const albumID  = PD.data.name;
                const artistID = PD.data.byArtist.name;
                scbuttonurl = 'https://soundcloud.com/search?q=' + urlCreator(artistID + ' ' + albumID);
                albumURL    = 'https://www.buymusic.club/search/' + urlCreator(artistID + ' ' + albumID);
                artistURL   = 'https://www.buymusic.club/search/' + urlCreator(artistID);
                scbutton.onclick = () => window.open(scbuttonurl, '_blank');
                ip.append(scbutton);

                validateAll([
                        { label: 'album', url: albumURL },
                        { label: 'artist', url: artistURL },
                ]).then(renderButtons);
        }

        // ── URL builder ─────────────────────────────────────────────────────
        function urlCreator(query) {
                return query.split(/[^\w]/g).filter(Boolean).map(encodeURIComponent).join('+');
        }

        function validateOne(entry) {
                return new Promise((resolve) => {
                        PD.api.bmcValidate(entry.url, (valid) => resolve({ ...entry, valid: !!valid }));
                });
        }

        function validateAll(entries) {
                return Promise.all(entries.map(validateOne));
        }

        // ── Render result buttons ────────────────────────────────────────────
        function renderButtons(results) {
                const status = {
                        track: results.some((r) => r.label === 'track' && r.valid),
                        album: results.some((r) => r.label === 'album' && r.valid),
                        artist: results.some((r) => r.label === 'artist' && r.valid),
                };

                const entries = [
                        { flag: status.track,  label: 'TRACK',  url: trackURL  },
                        { flag: status.album,  label: 'ALBUM',  url: albumURL  },
                        { flag: status.artist, label: 'ARTIST', url: artistURL },
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
