const MSG = globalThis.PD_CONTRACTS.MSG;

const oHistory = document.getElementById('chistory');
const oTrackHistory = document.getElementById('ctrhistory');
const oBMC = document.getElementById('cbmc');
const oBMCKeys = document.getElementById('cbmckeys');
const oBPM = document.getElementById('cbpm');
const oJump = document.getElementById('cjump');
const oJumpNR = document.getElementById('cjumpnumber');
const oCommons = document.getElementById('ccommons');

const send = (type, payload = {}) => chrome.runtime.sendMessage({ type, ...payload });

document.addEventListener('DOMContentLoaded', restoreOptions);
oHistory.addEventListener('change', historyPermission);
oTrackHistory.addEventListener('change', saveOptions);
oBMC.addEventListener('change', saveOptions);
if (oBMCKeys) oBMCKeys.addEventListener('change', saveOptions);
oBPM.addEventListener('change', permCheckExtensions);
oJump.addEventListener('change', saveOptions);
oJumpNR.addEventListener('change', percentageLimits);
oCommons.addEventListener('change', saveOptions);

document.getElementById('downloadBTN').addEventListener('click', download);
document.getElementById('uploadBTN').addEventListener('click', uploadAll);
document
  .getElementById('scbutton')
  .addEventListener('click', () =>
    chrome.tabs.create({ url: 'https://soundcloud.com/ayras_flashdrive' }),
  );
document
  .getElementById('instabutton')
  .addEventListener('click', () =>
    chrome.tabs.create({ url: 'https://www.instagram.com/ayras_flashdrive/' }),
  );
document
  .getElementById('emailbutton')
  .addEventListener('click', () =>
    chrome.tabs.create({ url: 'mailto:ayras_flashdrive@icloud.com' }),
  );

function saveOptions() {
  const data = {
    prefPlayHistory: oTrackHistory.checked,
    prefBmcButtons: oBMC.checked,
    prefJump: oJump.checked,
    prefCommons: oCommons.checked,
  };
  if (oBMCKeys) data.prefBmcKeys = oBMCKeys.checked;
  chrome.storage.local.set(data);
}

function uploadAll() {
  const data = prompt('Please copy full backup file content here');
  if (!data) {
    alert(
      'Please enter valid content or use the following to reset all:\n\n{"trackHistory":{}}\n\n',
    );
    return;
  }

  try {
    const parsed = JSON.parse(data);
    if (parsed.trackHistory && typeof parsed.trackHistory === 'object') {
      const toSet = {};
      for (const [id, count] of Object.entries(parsed.trackHistory)) {
        toSet[`${globalThis.PD_CONTRACTS.STORAGE.TRACK_KEY_PREFIX}${id}`] = count;
      }
      chrome.storage.local.set(toSet);
      return;
    }
    alert('Unrecognised backup format.\n\nTo reset all play history use:\n\n{"trackHistory":{}}');
  } catch {
    alert('Please enter valid JSON, or use the following to reset all:\n\n{"trackHistory":{}}');
  }
}

function restoreOptions() {
  const defaults = window.PDOptionSchema
    ? window.PDOptionSchema.DEFAULTS
    : {
        prefHistory: false,
        prefPlayHistory: false,
        prefBmcButtons: false,
        prefBmcKeys: null,
        prefBpm: false,
        prefJump: false,
        prefJumpPct: 0,
        prefCommons: false,
      };

  chrome.storage.local.get(defaults, async (rawItems) => {
    const items = window.PDOptionSchema
      ? window.PDOptionSchema.normalizeOptions(rawItems)
      : rawItems;
    oHistory.checked = items.prefHistory;
    oTrackHistory.checked = items.prefPlayHistory;
    oBMC.checked = items.prefBmcButtons;
    if (oBMCKeys) oBMCKeys.checked = items.prefBmcKeys;
    oJump.checked = items.prefJump;
    oJumpNR.value = items.prefJumpPct;
    oCommons.checked = items.prefCommons;
    if (items.prefBpm) await permCheckExtensionsOnStart();
  });
}

async function historyPermission() {
  if (oHistory.checked) {
    await send(MSG.PERM_CHECK_HISTORY);
  } else {
    chrome.storage.local.set({ prefHistory: false });
  }
}

async function download() {
  await send(MSG.BACKUP_DOWNLOAD);
}

function percentageLimits() {
  if (oJumpNR.value > 100 || oJumpNR.value < 0) {
    alert('Please enter a value between 0 and 100 percent!');
  } else {
    chrome.storage.local.set({ prefJumpPct: oJumpNR.value });
  }
}

async function permCheckExtensions() {
  if (oBPM.checked) {
    const valid = await send(MSG.PERM_CHECK_EXTENSIONS);
    if (!valid) {
      alert(
        'To use this option, please install and enable the two required extensions.\n\nLinks are in this options page below.',
      );
      oBPM.checked = false;
    }
  } else {
    chrome.storage.local.set({ prefBpm: false });
  }
}

async function permCheckExtensionsOnStart() {
  const extensionBCE = 'padcfdpdlnpdojcihidkgjnmleeingep';
  const extensionBCT = 'iniomjoihcjgakkfaebmcbnhmiobppel';

  const extensions = await chrome.management.getAll();
  const BCEisInstalled = extensions.some((e) => e.id === extensionBCE && e.enabled);
  const BCTisInstalled = extensions.some((e) => e.id === extensionBCT && e.enabled);

  if (BCEisInstalled && BCTisInstalled) {
    chrome.storage.local.set({ prefBpm: true });
    oBPM.checked = true;
  } else {
    chrome.storage.local.set({ prefBpm: false });
    oBPM.checked = false;
    alert(
      "To keep using the '3rd Party Optimizer', please install and enable both required extensions.\n\nLinks are in the options page below.",
    );
  }
}
