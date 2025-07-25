let ptimeout;

chrome.runtime.onMessage.addListener(function(message, sender, senderResponse) {
        if (message.type === "options") {
                chrome.storage.local.get({
                        ohistory: false,
                        otrhistory: false,
                        obmc: false,
                        obpm: false,
                        ojump: false,
                        ojumpNr: 0,
                        ocommons: false
                }, (options) => {
                        senderResponse(options);
                });
        }
        if(message.type === "downloadFull"){
             chrome.permissions.request({permissions: ['downloads']}, function(granted) {
                                        if (granted) {
                                                chrome.storage.local.get({trackHistory:{}}, function(items) { // null implies all items
                                                    // Convert object to a string.
                                                    var result = JSON.stringify(items);
                                                    // Save as file
                                                    var url = 'data:application/json;base64,' + btoa(result);
                                                    chrome.downloads.download({url: url, filename: 'POWERDIGGER_backup.json'});
                                                });
                                        } 
                                });
        }
        if (message.type === "checkExtensions"){
            chrome.permissions.request({permissions: ['management']}, function (granted) {
                                        if (granted) {
                                                var extensionBCE = 'padcfdpdlnpdojcihidkgjnmleeingep';
                                                var extensionBCT = 'iniomjoihcjgakkfaebmcbnhmiobppel';
                                                chrome.management.getAll(function(extensions) {
                                                        var BCEisInstalled = extensions.some(function(extensionInfo) {return extensionInfo.id === extensionBCE  && extensionInfo.enabled;});
                                                        var BCTisInstalled = extensions.some(function(extensionInfo) {return extensionInfo.id === extensionBCT && extensionInfo.enabled;});
                                                        if (BCEisInstalled && BCTisInstalled){
                                                                chrome.storage.local.set({obpm: true});
                                                                senderResponse(true);

                                                        }else{
                                                                chrome.storage.local.set({obpm: false});
                                                                chrome.tabs.create({url: "https://chrome.google.com/webstore/detail/bandcamp-enhancement-suit/padcfdpdlnpdojcihidkgjnmleeingep", active: false});
                                                                chrome.tabs.create({url: "https://chrome.google.com/webstore/detail/bandcamp-tempo-adjust/iniomjoihcjgakkfaebmcbnhmiobppel", active: false});
                                                                senderResponse(false);
                                                        }
                                                });
                                        } else {
                                                chrome.storage.local.set({obpm: false});
                                                senderResponse(false);
                                        }
                                });
        }
        if (message.type === "checkHistory"){
                    chrome.permissions.request({permissions: ['history']}, function (granted) {
                                        if (granted) {
                                                chrome.storage.local.set({ohistory: true});
                                        } else {
                                                chrome.storage.local.set({ohistory: false});
                                        }
                                });
        }
        if (message.type === "trackhistory") {
                let trackid = message.trackid;
                chrome.storage.local.get({
                        trackHistory: {}
                }).then((result) => {
                        if (trackid in result.trackHistory) {
                                senderResponse(result.trackHistory[trackid]);
                        } else {
                                senderResponse(0);
                        }
                });
        }
        if (message.type === "trackplay") {
                clearTimeout(ptimeout);
                ptimeout = setTimeout(() => {
                    
                         let trackid = message.trackid;
                        chrome.storage.local.get({
                                trackHistory: {}
                        }).then((result) => {
                                if (trackid in result.trackHistory) {
                                        result.trackHistory[trackid] = result.trackHistory[trackid] + 1;
                                } else {
                                        result.trackHistory[trackid] = 1;
                                }
                                chrome.storage.local.set({
                                        trackHistory: result.trackHistory
                                }).then(() => {
                                        senderResponse(result.trackHistory[trackid]);
                                });
                        });
                }, 50);
        }
        if (message.type === "nobrowserhistory") {
                try {
                        chrome.history.getVisits({
                                        'url': message.url
                                },
                                (result) => {
                                        //Check if there is a visit older than 3 seconds ago in chrome history
                                        const found = result.filter(element => (element.visitTime < Date.now() - 3000));
                                        //Create A bool and pass it back
                                        senderResponse(found.length === 0);
                                });
                } catch (error) {
                        senderResponse(error);
                }
        }
        if (message.type === "validate") {
                fetch(message.url).then(function(response) {
                        return response.text();
                }).then(function(response) {
                        response = response.substring(response.indexOf('<script id="__NEXT_DATA__" type="application/json">') + 51);
                        response = response.substring(0, response.indexOf("</script>"));
                        data = JSON.parse(response);
                        senderResponse(Object.keys(data.props.pageProps.searchResults).length !== 0);
                }).catch(function(err) {
                        // There was an error
                        senderResponse('Something went wrong.');
                });
        }
        if (message.type === "FanPage") {
                fetch(message.url)
                    .then(response => response.text())  // Wait for the response to be fully loaded
                    .then(text => {
                        let commonItems, collectionCount = '0';
                
                        // Look for "items in common"
                        const commonMatch = text.match(/(\d+)\s+(item|items)\s+in\s+common/);
                        if (commonMatch) commonItems = commonMatch[1];
                
                        // Look for "total tracks"
                        const totalMatch = text.match(/<span class="count">(\d+)<\/span>/);
                        if (totalMatch) collectionCount = totalMatch[1];
                
                        // Send the response with the extracted values
                        senderResponse({
                            commonTracks: commonItems,
                            totalTracks: collectionCount
                        });
                    })
                    .catch(err => {
                        console.error('Fetch error:', err);
                    });
                }
        return true;
});
