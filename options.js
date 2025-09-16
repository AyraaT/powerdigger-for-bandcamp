// Saves options to chrome.storage
const oHistory = document.getElementById('chistory');
const oTrackHistory = document.getElementById('ctrhistory');
const oBMC = document.getElementById('cbmc');
const oBPM = document.getElementById('cbpm');
const oJump = document.getElementById("cjump");
const oJumpNR = document.getElementById("cjumpnumber");
const oCommons = document.getElementById('ccommons');

document.addEventListener('DOMContentLoaded', restoreOptions);
oHistory.addEventListener('change', historyPermission);
oTrackHistory.addEventListener('change', saveOptions);
oBMC.addEventListener('change', saveOptions);
oBPM.addEventListener('change', checkExtensions);
oJump.addEventListener('change', saveOptions);
oJumpNR.addEventListener('change', percentageLimits);
oCommons.addEventListener('change', saveOptions);

document.getElementById("downloadBTN").addEventListener('click',download);
document.getElementById("uploadBTN").addEventListener('click',uploadAll);
document.getElementById("scbutton").addEventListener('click', function () {chrome.tabs.create({url: "https://soundcloud.com/ayras_flashdrive"})});
document.getElementById("instabutton").addEventListener('click', function () {chrome.tabs.create({url: "https://www.instagram.com/ayras_flashdrive/"})});
document.getElementById("emailbutton").addEventListener('click', function () {chrome.tabs.create({url: "mailto:ayras_flashdrive@icloud.com"})});

function saveOptions() {
        chrome.storage.local.set({
                        otrhistory: oTrackHistory.checked,
                        obmc: oBMC.checked,
                        ojump: oJump.checked,
                        ocommons: oCommons.checked
                });
}

function uploadAll(){
        let data = prompt('Please copy full backup file content here');
        if (data != ""){
            try{
                chrome.storage.local.set({trackHistory:JSON.parse(data).trackHistory});
            }catch{
                alert('Please enter valid content or use the following to reset all:\n\n{"trackHistory":{}}\n\n');
            }
        }else{
                alert('Please enter valid content or use the following to reset all:\n\n{"trackHistory":{}}\n\n');
        }
}

function restoreOptions() {
        chrome.storage.local.get({
                        ohistory: false,
                        otrhistory: false,
                        obmc: false,
                        obpm: false,
                        ojump: false,
                        ojumpNr: 0,
                        ocommons: false
                },
                (items) => {
                        oHistory.checked = items.ohistory;
                        oTrackHistory.checked = items.otrhistory;
                        oBMC.checked = items.obmc;
                        oJump.checked = items.ojump;
                        oJumpNR.value = items.ojumpNr;
                        oCommons.checked = items.ocommons;
                        if(items.obpm){
                                    onstartCheckExtensions();          
                        }
                });
}

function historyPermission() {
            if (oHistory.checked){
                            chrome.runtime.sendMessage({type: 'checkHistory'});         
            }else{
                            chrome.storage.local.set({ohistory: false});
            }                       
}
 

function download() {
                chrome.runtime.sendMessage({type: 'downloadFull'});                   
}

function percentageLimits() {
        if (oJumpNR.value > 100 || oJumpNR.value < 0) {
                alert("Please enter a value between 0 and 100 percent!");
        } else {
                chrome.storage.local.set({ojumpNr: oJumpNR.value});

        }
}

function checkExtensions() {
            if (oBPM.checked){
                        chrome.runtime.sendMessage({type: 'checkExtensions'}, valid => {
                        if (!valid){
                                alert("To use this option, please install and activate the two extensions I mention.\n\n(Installation pages have been opened in the background)");
                                oJump.checked = false;
                        }
                });           
                 }else{
                                                chrome.storage.local.set({obpm: false});
            }   
                                         
}

function onstartCheckExtensions() {

                                                var extensionBCE = 'padcfdpdlnpdojcihidkgjnmleeingep';
                                                var extensionBCT = 'iniomjoihcjgakkfaebmcbnhmiobppel';

                                                chrome.management.getAll(function(extensions) {
                                                        var BCEisInstalled = extensions.some(function(extensionInfo) {return extensionInfo.id === extensionBCE  && extensionInfo.enabled;});
                                                        var BCTisInstalled = extensions.some(function(extensionInfo) {return extensionInfo.id === extensionBCT && extensionInfo.enabled;});
                                                        if (BCEisInstalled && BCTisInstalled){
                                                                chrome.storage.local.set({obpm: true});
                                                                oBPM.checked = true;

                                                        }else{
                                                                chrome.storage.local.set({obpm: false});
                                                                oBPM.checked = false;
                                                                chrome.tabs.create({url: "https://chrome.google.com/webstore/detail/bandcamp-enhancement-suit/padcfdpdlnpdojcihidkgjnmleeingep", active: false});
                                                                chrome.tabs.create({url: "https://chrome.google.com/webstore/detail/bandcamp-tempo-adjust/iniomjoihcjgakkfaebmcbnhmiobppel", active: false});
                                                                alert("To keep using the '3rd Party Optimizer', please install and activate the two extensions I mention.\n\n(Installation pages have been opened in the background)");
                                                        }
                                                });
}