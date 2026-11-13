const SETTINGS_KEY = 'liteViewSettings';
const enabledInput = document.getElementById('enabled');
const sitesInput = document.getElementById('sites');
const scopeOptions = document.getElementById('scope-options');
const status = document.getElementById('status');
const saveButton = document.getElementById('save');

function selectedScope() {
  return document.querySelector('input[name="scope"]:checked')?.value || 'selected';
}

function updateDisabledState() {
  const disabled = !enabledInput.checked;
  scopeOptions.disabled = disabled;
  sitesInput.disabled = disabled || selectedScope() === 'all';
}

function normalizeSites(value) {
  const sites = new Set();
  for (const original of value.split(/\r?\n/)) {
    const input = original.trim();
    if (!input) continue;
    let url;
    try { url = new URL(input.includes('://') ? input : `https://${input}`); }
    catch { throw new Error(`Geçersiz adres: ${input}`); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) {
      throw new Error(`Yalnızca http(s)://alan-adı biçiminde adres gir: ${input}`);
    }
    if (url.port && !((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443'))) {
      throw new Error(`Özel port desteklenmiyor: ${input}`);
    }
    if (!url.hostname || url.hostname.includes('*')) throw new Error(`Geçersiz alan adı: ${input}`);
    sites.add(url.origin);
  }
  return [...sites];
}

function patternsFor(settings) {
  if (settings.allSites) return ['http://*/*', 'https://*/*'];
  return settings.sites.map(site => `${site}/*`);
}

function showStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
}

async function loadSettings() {
  const { [SETTINGS_KEY]: settings } = await chrome.storage.local.get(SETTINGS_KEY);
  if (!settings) return;
  enabledInput.checked = Boolean(settings.enabled);
  document.querySelector(`input[name="scope"][value="${settings.allSites ? 'all' : 'selected'}"]`).checked = true;
  sitesInput.value = (settings.sites || []).join('\n');
  updateDisabledState();
}

enabledInput.addEventListener('change', updateDisabledState);
document.querySelectorAll('input[name="scope"]').forEach(input => input.addEventListener('change', updateDisabledState));

saveButton.addEventListener('click', async () => {
  showStatus('');
  saveButton.disabled = true;
  try {
    const allSites = selectedScope() === 'all';
    const sites = allSites ? [] : normalizeSites(sitesInput.value);
    const enabled = enabledInput.checked;
    if (enabled && !allSites && sites.length === 0) {
      throw new Error('Etkinleştirmek için en az bir site ekle.');
    }

    const settings = { enabled, allSites, sites };
    const desiredOrigins = enabled ? patternsFor(settings) : [];

    // Called directly from the Save click to satisfy Chrome's user-gesture rule.
    if (desiredOrigins.length) {
      const granted = await chrome.permissions.request({ origins: desiredOrigins });
      if (!granted) throw new Error('Site izni verilmedi; ayarlar kaydedilmedi.');
    }

    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
    const current = await chrome.permissions.getAll();
    const obsolete = (current.origins || []).filter(origin => !desiredOrigins.includes(origin));
    if (obsolete.length) await chrome.permissions.remove({ origins: obsolete });

    const result = await chrome.runtime.sendMessage({ type: 'lite-view:sync' });
    if (!result?.ok) throw new Error(result?.error || 'İçerik betiği kaydedilemedi.');
    showStatus(enabled ? 'Ayarlar kaydedildi.' : 'Lite View devre dışı bırakıldı.');
  } catch (error) {
    showStatus(error.message || String(error), true);
  } finally {
    saveButton.disabled = false;
  }
});

loadSettings().catch(error => showStatus(error.message || String(error), true));
