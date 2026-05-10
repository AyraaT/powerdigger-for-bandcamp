const MSG = {
        BACKUP_DOWNLOAD: 'backupDownload',
        PERM_CHECK_HISTORY: 'permCheckHistory',
        PERM_CHECK_EXTENSIONS: 'permCheckExtensions',
};

function send(type, payload = {}, cb) {
        chrome.runtime.sendMessage({ type, ...payload }, cb);
}

// Saves options to chrome.storage
const oHistory = document.getElementById('chistory');
const oTrackHistory = document.getElementById('ctrhistory');
const oBMC = document.getElementById('cbmc');
const oBMCKeys = document.getElementById('cbmckeys');
const oBPM = document.getElementById('cbpm');
const oJump = document.getElementById("cjump");
const oJumpNR = document.getElementById("cjumpnumber");
const oCommons = document.getElementById('ccommons');

document.addEventListener('DOMContentLoaded', restoreOptions);
oHistory.addEventListener('change', historyPermission);
oTrackHistory.addEventListener('change', saveOptions);
oBMC.addEventListener('change', saveOptions);
if (oBMCKeys) oBMCKeys.addEventListener('change', saveOptions);
oBPM.addEventListener('change', permCheckExtensions);
oJump.addEventListener('change', saveOptions);
oJumpNR.addEventListener('change', percentageLimits);
oCommons.addEventListener('change', saveOptions);

document.getElementById("downloadBTN").addEventListener('click',download);
document.getElementById("uploadBTN").addEventListener('click',uploadAll);
document.getElementById("scbutton").addEventListener('click', function () {chrome.tabs.create({url: "https://soundcloud.com/ayras_flashdrive"})});
document.getElementById("instabutton").addEventListener('click', function () {chrome.tabs.create({url: "https://www.instagram.com/ayras_flashdrive/"})});
document.getElementById("emailbutton").addEventListener('click', function () {chrome.tabs.create({url: "mailto:ayras_flashdrive@icloud.com"})});

function saveOptions() {
        const data = {
                prefPlayHistory: oTrackHistory.checked,
                prefBmcButtons: oBMC.checked,
                prefJump: oJump.checked,
                prefCommons: oCommons.checked
        };
        if (oBMCKeys) data.prefBmcKeys = oBMCKeys.checked;
        chrome.storage.local.set(data);
}

function uploadAll(){
        let data = prompt('Please copy full backup file content here');
        if (data && data !== ""){
            try{
                const parsed = JSON.parse(data);
                // Accept both the legacy {trackHistory:{id:count}} blob and
                // a direct flat object of tk: keys (future format).
                if (parsed.trackHistory && typeof parsed.trackHistory === 'object') {
                    // Legacy format — write as individual tk: keys directly so no
                    // migration is needed and the old blob is never re-stored.
                    const toSet = {};
                    for (const [id, count] of Object.entries(parsed.trackHistory)) {
                        toSet['tk:' + id] = count;
                    }
                    chrome.storage.local.set(toSet);
                } else {
                    alert('Unrecognised backup format.\n\nTo reset all play history use:\n\n{"trackHistory":{}}');
                }
            }catch{
                alert('Please enter valid JSON, or use the following to reset all:\n\n{"trackHistory":{}}');
            }
        }else{
                alert('Please enter valid content or use the following to reset all:\n\n{"trackHistory":{}}\n\n');
        }
}

function restoreOptions() {
        chrome.storage.local.get({
                        prefHistory: false,
                        prefPlayHistory: false,
                        prefBmcButtons: false,
                        prefBmcKeys: null,
                        prefBpm: false,
                        prefJump: false,
                        prefJumpPct: 0,
                        prefCommons: false
                },
                (items) => {
                        oHistory.checked = items.prefHistory;
                        oTrackHistory.checked = items.prefPlayHistory;
                        oBMC.checked = items.prefBmcButtons;
                        // Migrate: legacy installs only have prefBmcButtons; mirror it into prefBmcKeys.
                        const keysVal = items.prefBmcKeys === null ? items.prefBmcButtons : items.prefBmcKeys;
                        if (oBMCKeys) oBMCKeys.checked = keysVal;
                        oJump.checked = items.prefJump;
                        oJumpNR.value = items.prefJumpPct;
                        oCommons.checked = items.prefCommons;
                        if(items.prefBpm){
                                    permCheckExtensionsOnStart();          
                        }
                });
}

function historyPermission() {
            if (oHistory.checked){
                            send(MSG.PERM_CHECK_HISTORY);         
            }else{
                            chrome.storage.local.set({prefHistory: false});
            }                       
}
 

function download() {
                send(MSG.BACKUP_DOWNLOAD);                   
}

function percentageLimits() {
        if (oJumpNR.value > 100 || oJumpNR.value < 0) {
                alert("Please enter a value between 0 and 100 percent!");
        } else {
                chrome.storage.local.set({prefJumpPct: oJumpNR.value});

        }
}

function permCheckExtensions() {
            if (oBPM.checked){
                        send(MSG.PERM_CHECK_EXTENSIONS, {}, valid => {
                        if (!valid){
                                alert("To use this option, please install and enable the two required extensions.\n\nLinks are in this options page below.");
                                oBPM.checked = false;
                        }
                });           
                 }else{
                                                chrome.storage.local.set({prefBpm: false});
            }   
                                         
}

function permCheckExtensionsOnStart() {
                                                const extensionBCE = 'padcfdpdlnpdojcihidkgjnmleeingep';
                                                const extensionBCT = 'iniomjoihcjgakkfaebmcbnhmiobppel';

                                                chrome.management.getAll(function(extensions) {
                                                        const BCEisInstalled = extensions.some(function(e) {return e.id === extensionBCE && e.enabled;});
                                                        const BCTisInstalled = extensions.some(function(e) {return e.id === extensionBCT && e.enabled;});
                                                        if (BCEisInstalled && BCTisInstalled){
                                                                chrome.storage.local.set({prefBpm: true});
                                                                oBPM.checked = true;
                                                        } else {
                                                                chrome.storage.local.set({prefBpm: false});
                                                                oBPM.checked = false;
                                                                // Show a single CTA in the options page instead of silently opening tabs.
                                                                alert("To keep using the '3rd Party Optimizer', please install and enable both required extensions.\n\nLinks are in the options page below.");
                                                        }
                                                });
}