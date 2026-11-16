const SETTINGS_KEY = 'liteViewSettings';
const MIN_WIDTH = 320;
const MAX_WIDTH = 2400;
const MIN_HEIGHT = 240;
const MAX_HEIGHT = 1800;

const enabledInput = document.getElementById('enabled');
const scopeOptions = document.getElementById('scope-options');
const siteList = document.getElementById('site-list');
const defaultWidthInput = document.getElementById('default-width');
const defaultHeightInput = document.getElementById('default-height');
const siteHelp = document.getElementById('site-help');
const status = document.getElementById('status');
const saveButton = document.getElementById('save');

function selectedScope() {
  return document.querySelector('input[name="scope"]:checked')?.value || 'selected';
}

function updateDisabledState() {
  scopeOptions.disabled = !enabledInput.checked;
  siteHelp.textContent = selectedScope() === 'all'
    ? 'Tüm sitelerde varsayılan boyut kullanılır. Eklediğin adresler yalnızca o sitelere özel boyut uygular.'
    : 'Her satırda bir site ve ona özel pencere boyutu bulunur. Boyutlar ekran alanına göre sınırlandırılır.';
}

function addSiteRow(site = {}) {
  const row = document.createElement('div');
  row.className = 'site-row';

  const origin = document.createElement('input');
  origin.type = 'url';
  origin.className = 'site-origin';
  origin.placeholder = 'https://example.com';
  origin.value = site.origin || '';
  origin.setAttribute('aria-label', 'Site adresi');

  const width = document.createElement('input');
  width.type = 'number'; width.min = MIN_WIDTH; width.max = MAX_WIDTH; width.step = 10;
  width.value = site.width || defaultWidthInput.value || 1280;
  width.setAttribute('aria-label', 'Popup genişliği piksel');

  const height = document.createElement('input');
  height.type = 'number'; height.min = MIN_HEIGHT; height.max = MAX_HEIGHT; height.step = 10;
  height.value = site.height || defaultHeightInput.value || 880;
  height.setAttribute('aria-label', 'Popup yüksekliği piksel');

  const remove = document.createElement('button');
  remove.type = 'button'; remove.className = 'remove-site'; remove.textContent = '×';
  remove.title = 'Siteyi kaldır'; remove.setAttribute('aria-label', 'Siteyi kaldır');
  remove.addEventListener('click', () => row.remove());

  row.append(origin, width, height, remove);
  siteList.append(row);
}

function normalizeOrigin(value) {
  const input = value.trim();
  let url;
  try { url = new URL(input.includes('://') ? input : `https://${input}`); }
  catch { throw new Error(`Geçersiz site adresi: ${input}`); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) {
    throw new Error(`Yalnızca http(s)://alan-adı biçiminde adres gir: ${input}`);
  }
  if (url.port && !((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443'))) {
    throw new Error(`Özel port desteklenmiyor: ${input}`);
  }
  if (!url.hostname || url.hostname.includes('*')) throw new Error(`Geçersiz alan adı: ${input}`);
  return url.origin;
}

function readDimension(input, min, max, label) {
  const value = Number(input.value);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label}, ${min} ile ${max} piksel arasında tam sayı olmalı.`);
  }
  return value;
}

function readSites() {
  const seen = new Set();
  const sites = [];
  for (const row of siteList.querySelectorAll('.site-row')) {
    const originInput = row.querySelector('.site-origin');
    if (!originInput.value.trim()) continue;
    const origin = normalizeOrigin(originInput.value);
    if (seen.has(origin)) throw new Error(`Bu site birden fazla eklenmiş: ${origin}`);
    seen.add(origin);
    const inputs = row.querySelectorAll('input[type="number"]');
    sites.push({
      origin,
      width: readDimension(inputs[0], MIN_WIDTH, MAX_WIDTH, 'Popup genişliği'),
      height: readDimension(inputs[1], MIN_HEIGHT, MAX_HEIGHT, 'Popup yüksekliği')
    });
  }
  return sites;
}

function patternsFor(settings) {
  if (settings.allSites) return ['http://*/*', 'https://*/*'];
  return settings.sites.map(site => `${site.origin}/*`);
}

function showStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
}

async function loadSettings() {
  const { [SETTINGS_KEY]: settings } = await chrome.storage.local.get(SETTINGS_KEY);
  if (!settings) {
    addSiteRow();
    updateDisabledState();
    return;
  }
  enabledInput.checked = Boolean(settings.enabled);
  document.querySelector(`input[name="scope"][value="${settings.allSites ? 'all' : 'selected'}"]`).checked = true;
  defaultWidthInput.value = settings.defaultSize?.width || 1280;
  defaultHeightInput.value = settings.defaultSize?.height || 880;

  // Migrate the previous version's string-only site list without losing sites.
  const sites = (settings.sites || []).map(site => typeof site === 'string'
    ? { origin: site, width: defaultWidthInput.value, height: defaultHeightInput.value }
    : site);
  sites.forEach(addSiteRow);
  if (!sites.length) addSiteRow();
  updateDisabledState();
}

enabledInput.addEventListener('change', updateDisabledState);
document.querySelectorAll('input[name="scope"]').forEach(input => input.addEventListener('change', updateDisabledState));
document.getElementById('add-site').addEventListener('click', () => addSiteRow());

saveButton.addEventListener('click', async () => {
  showStatus('');
  saveButton.disabled = true;
  try {
    const allSites = selectedScope() === 'all';
    const enabled = enabledInput.checked;
    const defaultSize = {
      width: readDimension(defaultWidthInput, MIN_WIDTH, MAX_WIDTH, 'Varsayılan genişlik'),
      height: readDimension(defaultHeightInput, MIN_HEIGHT, MAX_HEIGHT, 'Varsayılan yükseklik')
    };
    const sites = readSites();
    if (enabled && !allSites && sites.length === 0) {
      throw new Error('Etkinleştirmek için en az bir site ekle.');
    }

    const settings = { enabled, allSites, defaultSize, sites };
    const desiredOrigins = enabled ? patternsFor(settings) : [];

    // Request permissions directly from this click, as Chrome requires.
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
    showStatus(enabled ? 'Ayarlar kaydedildi. Açık siteleri yenile.' : 'Lite View devre dışı bırakıldı.');
  } catch (error) {
    showStatus(error.message || String(error), true);
  } finally {
    saveButton.disabled = false;
  }
});

loadSettings().catch(error => showStatus(error.message || String(error), true));
