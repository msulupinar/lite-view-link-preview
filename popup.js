const SETTINGS_KEY = 'liteViewSettings';

chrome.storage.local.get(SETTINGS_KEY).then(result => {
  const settings = result[SETTINGS_KEY];
  const summary = document.getElementById('summary');
  if (!settings?.enabled) summary.textContent = 'Henüz etkinleştirilmedi';
  else if (settings.allSites) summary.textContent = 'Tüm web sitelerinde etkin';
  else summary.textContent = `${settings.sites?.length || 0} sitede etkin`;
});

document.getElementById('open-settings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});
