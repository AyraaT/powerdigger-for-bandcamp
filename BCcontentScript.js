const currenturl = window.location.href;
const insertionPoint = document.getElementById("name-section");
var queryCount = 0;
var trackBool = false;
var albumBool = false;
var artistBool = false;
var trackURL = "";
var albumURL = "";
var artistURL = "";
const audio = document.querySelector("audio");
var skipValue = 0;
let ttimeout;
let htimeout;
let ObserverArray = [];
let data;

// Get JSON Data on Track or Album
if (currenturl.includes("/track/") || currenturl.includes("/album/")) {
        data = JSON.parse(document.querySelector('script[type="application/ld+json"]').innerHTML);
}

// Get Options and load scripts accordingly 
chrome.runtime.sendMessage({
        type: 'options'
}, options => {

        if (options.obmc && (currenturl.includes("/track/") || currenturl.includes("/album/"))) {
                bmcbuttons();
        }
        if (options.ohistory) {
                historyRecolor();
                historycatcher();
                if (!(currenturl.includes("/track/") || currenturl.includes("/album/"))) {
                        new MutationObserver(historycatcher).observe(document.getElementById("grids"),  {childList: true, subtree: true});
                }
                document.addEventListener("visibilitychange", function() {if (document.visibilityState === "visible") {historycatcher();}}, false);
        }
        if (options.otrhistory) {
                trackcatcher();
                if (!(currenturl.includes("/track/") || currenturl.includes("/album/"))) {
                        new MutationObserver(trackcatcher).observe(document.getElementById("grids"),  {childList: true, subtree: true});
                }
                document.addEventListener("visibilitychange", function() {if (document.visibilityState === "visible") {trackcatcher();}}, false);
        }
        if (options.obpm) {
                clickBPM();
        }
        if (options.ojump) {
                skipValue = options.ojumpNr
                audio.addEventListener('loadeddata', jumpTime);
        }
        // in common option
        if (options.ocommons && (currenturl.includes("/track/") || currenturl.includes("/album/"))) {
            commonFanTracks();   
        }
});

// Skip into Track
function jumpTime() {
        if (audio.duration > 1) {
                audio.currentTime = Math.round(audio.duration / 100 * skipValue);
        }
}

// Autoload BPM
function clickBPM() {
        setTimeout(() => {
                if (currenturl.includes("/track/") || currenturl.includes("/album/")) {
                        let div = document.createElement("div");
                        div.style.height = "40px";
                        document.getElementById("pitchSliderApp").prepend(div);
                }
                try {
                        document.querySelectorAll('._button_s60sf_1')[0].click();
                } catch {}
        }, 1000);
}

// Recolor Top Banner
function historyRecolor() {
        chrome.runtime.sendMessage({
                type: 'nobrowserhistory',
                url: currenturl
        }, response => {
                if (response instanceof Error) {
                        document.getElementById("menubar").style.backgroundColor = "yellow";
                } else if (response) {
                        document.getElementById("menubar").style.backgroundColor = "DarkSeaGreen";
                } else if (!response) {
                        document.getElementById("menubar").style.backgroundColor = "Salmon";
                }
        });
}

// Catch Double Firings of Observers
function historycatcher() {
        clearTimeout(htimeout);
        htimeout = setTimeout(() => {
                linkRecolor();
        }, 50);
}
function trackcatcher() {
        clearTimeout(ttimeout);
        ttimeout = setTimeout(() => {
                trackRecolor();
        }, 50);
}

// Recolor all Links
function linkRecolor() {
                let alllinks = document.querySelectorAll("a");
                // more precise for profile pages is: a.item-link
                alllinks.forEach(checkLinks);
        
}

// Recolor track plays on loading
function trackRecolor() {
        // Check Track plays on Track page
        if (currenturl.includes("/track/")) {
                let playbutton = document.querySelector("div.playbutton");
                let tracktitel = document.querySelector("h2.trackTitle");
                tracktitel.style.color = "black";
                let track = data.additionalProperty[0].value.toString();
                const observer = new MutationObserver((mutations) => {
                        mutations.forEach((mutation) => {
                                //const el = mutation.target;
                                if ((!mutation.oldValue || !mutation.oldValue.match(/\bplaying\b/)) && mutation.target.classList && mutation.target.classList.contains('playing')) {
                                        chrome.runtime.sendMessage({
                                                type: 'trackplay',
                                                trackid: track
                                        }, response => {
                                                let recolor = 255 - (255 / 10 * response);
                                                tracktitel.style.backgroundColor = "rgb(255," + recolor + "," + recolor + ")";
                                        });
                                }
                        });
                });
                observer.observe(playbutton, {
                        attributes: true,
                        attributeOldValue: true,
                        attributeFilter: ['class']
                });
                try {
                        chrome.runtime.sendMessage({
                                type: 'trackhistory',
                                trackid: track
                        }, response => {
                                let recolor = 255 - (255 / 10 * response);
                                tracktitel.style.backgroundColor = "rgb(255," + recolor + "," + recolor + ")";
                        });
                } catch {
                        console.log(track);
                }
        }
        // Check Track plays on album
        if (currenturl.includes("/album/")) {
                let playbutton = document.querySelector("div.playbutton");
                let table = document.querySelectorAll("tr.track_row_view");
                document.getElementById("track_table").querySelectorAll("a, div, span").forEach((element) => {
                        element.style.color = "black";
                });
                let trackIDs = [];
                for (const element of data.track.itemListElement) {
                        trackIDs.push(element.item.additionalProperty[0].value.toString());
                }
                const observer = new MutationObserver((mutations) => {
                        mutations.forEach((mutation) => {
                                const el = mutation.target;
                                if ((!mutation.oldValue || !mutation.oldValue.match(/\bplaying\b/)) && mutation.target.classList && mutation.target.classList.contains('playing')) {
                                        let currentTrack = parseInt(document.querySelector("tr.current_track").getAttribute("rel").replace("tracknum=", "")) - 1;
                                        chrome.runtime.sendMessage({
                                                type: 'trackplay',
                                                trackid: trackIDs[currentTrack]
                                        }, response => {
                                                let recolor = 255 - (255 / 10 * response);
                                                table[currentTrack].style.backgroundColor = "rgb(255," + recolor + "," + recolor + ")";
                                        });
                                }
                        });
                });
                observer.observe(playbutton, {
                        attributes: true,
                        attributeOldValue: true,
                        attributeFilter: ['class']
                });
                try {
                        trackIDs.forEach(function(track, i) {
                                chrome.runtime.sendMessage({
                                        type: 'trackhistory',
                                        trackid: track
                                }, response => {
                                        let recolor = 255 - (255 / 10 * response);
                                        table[i].style.backgroundColor = "rgb(255," + recolor + "," + recolor + ")";
                                });
                        });
                } catch {}
        }
        if (currenturl.includes("/tag/")){
            //do sth with tag
        }
        // Track Plays on Profiles
        if (!(currenturl.includes("/track/") || currenturl.includes("/album/") || currenturl.includes("/tag/"))) {
                ObserverArray.forEach(element => element.disconnect());
                let allplays = document.querySelectorAll("li.collection-item-container");
                allplays.forEach(checkPlays);
        }
}


// Recolor track plays on profile page
function checkPlays(item, index) {
        let track = item.getAttribute("data-trackid").toString();
        const observer = new MutationObserver((mutations, observer) => {
                mutations.forEach((mutation) => {
                        const el = mutation.target;
                        if ((!mutation.oldValue || !mutation.oldValue.match(/\bplaying\b/)) && mutation.target.classList && mutation.target.classList.contains('playing')) {
                                chrome.runtime.sendMessage({
                                        type: 'trackplay',
                                        trackid: track
                                }, response => {
                                        let recolor = 255 - (255 / 10 * response);
                                        item.style.backgroundColor = "rgb(255," + recolor + "," + recolor + ")";
                                });
                        }
                });
        });
    
        observer.observe(item, {
                attributes: true,
                attributeOldValue: true,
                attributeFilter: ['class']
        });
        ObserverArray.push(observer);
        try {
                chrome.runtime.sendMessage({
                        type: 'trackhistory',
                        trackid: track
                }, response => {
                        let recolor = 255 - (255 / 10 * response);
                        item.style.backgroundColor = "rgb(255," + recolor + "," + recolor + ")";
                });
        } catch {
                console.log(track);
        }
}

// Recolor the URLS based on Background Query
function checkLinks(item, index) {
        let urltest;
        try {
                urltest = new URL(item.href);
                chrome.runtime.sendMessage({
                        type: 'nobrowserhistory',
                        url: urltest
                }, response => {
                        if (response) {
                                item.style.color = "DarkOliveGreen";
                        } else {
                                item.style.color = "DarkRed";
                        }
                });
        } catch (_) {}
}

// Initiate Buy Music Club Query
function bmcbuttons() {
        
        insertionPoint.append(document.createElement("br"));
        var scbutton = document.createElement("button");
        scbutton.innerHTML = "Sound<br>cloud";
        scbutton.style.backgroundColor = "#FF5500";
        scbutton.style.fontWeight = "bolder";
        scbutton.style.color = "#000000";
        scbutton.style.textAlign = "left";
        
        const type = data["@type"];
        if (type === "MusicRecording") {
                const trackID = data.name;
                const albumID = data.inAlbum.name;
                const artistID = data.byArtist.name;
                if(trackID.includes('-')){
                        scbuttonurl = "https://soundcloud.com/search?q=" + URLCreator(trackID);
                        trackURL = "https://www.buymusic.club/search/" + URLCreator(trackID);
                }else{
                        scbuttonurl = "https://soundcloud.com/search?q=" + URLCreator(artistID + " " + trackID);
                        trackURL = "https://www.buymusic.club/search/" + URLCreator(artistID + " " + trackID);
                }
                albumURL = "https://www.buymusic.club/search/" +URLCreator(artistID + " " + albumID);
                artistURL = "https://www.buymusic.club/search/" +URLCreator(artistID);
                scbutton.onclick = function () {window.open(scbuttonurl,'_blank');};
                insertionPoint.append(scbutton);
                queryCount = 3;
                qBMC(trackURL, "track");
                qBMC(albumURL, "album");
                qBMC(artistURL, "artist");
        } else if (type === "MusicAlbum") {
                var albumID = data.name;
                var artistID = data.byArtist.name;
                scbuttonurl = "https://soundcloud.com/search?q=" + URLCreator(artistID + " " + albumID);
                albumURL = "https://www.buymusic.club/search/" + URLCreator(artistID + " " + albumID);
                artistURL = "https://www.buymusic.club/search/" + URLCreator(artistID);
                scbutton.onclick = function () {window.open(scbuttonurl,'_blank');};
                insertionPoint.append(scbutton);
                queryCount = 2;
                qBMC(albumURL, "album");
                qBMC(artistURL, "artist");
        }
}

// format the Buy Music Club URL
function URLCreator (query) {
        const ar = query.split(/[^\w]/g);
        const arr = ar.filter((a) => a);
        query = arr.join('+');
        return query;
}

function oldURLCreator(query) {
        query = query.replace(/\-.*/, '');
        query = query.replace(/\s\s+/g, '');
        query = query.replace('(', '');
        query = query.replace('/', '');
        query = query.replace(')', '');
        query = query.replace('  ', ' ');
        query = "https://www.buymusic.club/search/" + query;
        return query;
}



// Validate Buy Music Club with background script
function qBMC(query, type) {
        chrome.runtime.sendMessage({
                type: 'validate',
                url: query
        }, valid => {
                if (valid && type === "track") {
                        trackBool = true;
                } else if (valid && type === "album") {
                        albumBool = true;
                } else if (valid && type === "artist") {
                        artistBool = true;
                }
                qResult();
        });
}

// Display Buy Music Club Buttons
function qResult() {
        queryCount = queryCount - 1;
        if (queryCount === 0) {
                if (trackBool) {
                        var button = document.createElement("button");
                        button.innerHTML = "<span style='color: black'>BMC:</span><br>TRACK";
                        button.style.backgroundColor = "white";
                        button.style.fontWeight = "bolder";
		                button.style.color = "#1A00FF";
		                button.style.textAlign = "left";
                        button.onclick = function () {window.open(trackURL,'_blank');};
                        insertionPoint.append(button);
                }
                if (albumBool) {
                        var button = document.createElement("button");
                        button.innerHTML = "<span style='color: black'>BMC:</span><br>ALBUM";
                        button.style.backgroundColor = "white";
                        button.style.fontWeight = "bolder";
		                button.style.color = "#1A00FF";
		                button.style.textAlign = "left";
                        button.onclick = function () {window.open(albumURL,'_blank');};
                        insertionPoint.append(button);
                }
                if (artistBool) {
                        var button = document.createElement("button");
                        button.innerHTML = "<span style='color: black'>BMC:</span><br>ARTIST";
                        button.style.backgroundColor = "white";
                        button.style.fontWeight = "bolder";
		                button.style.color = "#1A00FF";
		                button.style.textAlign = "left";
                        button.onclick = function () {window.open(artistURL,'_blank');};
                        insertionPoint.append(button);
                }
        }
}

// Common Fan Tracks
function commonFanTracks() {
                        const fans = document.getElementsByClassName('pic');
                        for (let fan of fans) {
                            chrome.runtime.sendMessage({
                                type: 'FanPage',
                                url: fan.href
                            }, response => {
                                // Ensure that the response object has both properties or defaults to 0
                                const commonTracks = response.commonTracks || '0';
                                const totalTracks = response.totalTracks || '0';
                                console.log(response.totalTracks);
                        
                                fan.getElementsByClassName('name')[0].innerHTML += '&nbsp;&nbsp;<b>(' + commonTracks + '/' + totalTracks + ')</b>';
                            });
                        }
}

