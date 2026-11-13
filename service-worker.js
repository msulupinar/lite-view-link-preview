const SETTINGS_KEY = 'liteViewSettings';
const SCRIPT_ID = 'lite-view-page-preview';
let syncQueue = Promise.resolve();

async function syncContentScript() {
  const { [SETTINGS_KEY]: settings } = await chrome.storage.local.get(SETTINGS_KEY);
  const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
  if (registered.length) {
    await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
  }

  if (!settings?.enabled) return;
  const matches = settings.allSites
    ? ['http://*/*', 'https://*/*']
    : (settings.sites || []).map(site => `${site}/*`);
  if (!matches.length) return;

  const granted = await chrome.permissions.contains({ origins: matches });
  if (!granted) return;

  await chrome.scripting.registerContentScripts([{
    id: SCRIPT_ID,
    matches,
    js: ['content.js'],
    runAt: 'document_start',
    allFrames: false,
    persistAcrossSessions: true
  }]);
}

function queueSync() {
  syncQueue = syncQueue.catch(() => {}).then(syncContentScript);
  return syncQueue;
}

chrome.runtime.onInstalled.addListener(() => { void queueSync(); });
chrome.runtime.onStartup.addListener(() => { void queueSync(); });
chrome.permissions.onAdded.addListener(() => { void queueSync(); });
chrome.permissions.onRemoved.addListener(() => { void queueSync(); });
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'lite-view:sync') {
    queueSync().then(() => sendResponse({ ok: true })).catch(error => {
      sendResponse({ ok: false, error: String(error) });
    });
    return true;
  }
});
