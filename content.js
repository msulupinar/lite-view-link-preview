(() => {
  const PAGE_KEY = '__liteViewLinkPreviewInstalled';
  if (window[PAGE_KEY]) return;
  window[PAGE_KEY] = true;

  const PAGE_ORIGIN = location.origin;
  const isHttpPage = location.protocol === 'http:' || location.protocol === 'https:';
  if (!isHttpPage) return;

  let previewSettings = { sites: [], nestedPopupDefault: false };
  const refreshSettings = () => chrome.storage.local.get('liteViewSettings').then(stored => {
    previewSettings = stored.liteViewSettings || { sites: [], nestedPopupDefault: false };
  }).catch(() => {});
  void refreshSettings();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.liteViewSettings) {
      previewSettings = changes.liteViewSettings.newValue || { sites: [], nestedPopupDefault: false };
    }
  });

  function nestedPopupEnabled() {
    const site = (previewSettings.sites || []).find(item =>
      typeof item !== 'string' && item.origin === PAGE_ORIGIN);
    if (site && typeof site.nestedPopup === 'boolean') return site.nestedPopup;
    return Boolean(previewSettings.nestedPopupDefault);
  }

  function insideLiteViewPreview() {
    let current = window;
    while (current !== current.top) {
      try {
        if (current.parent.document.getElementById('__lite_view_preview_host')) return true;
        current = current.parent;
      } catch { return false; }
    }
    return false;
  }

  function canOpenPreviewHere() {
    return window === window.top || (nestedPopupEnabled() && insideLiteViewPreview());
  }

  let activePreviewWindow = null;
  let lastWheelClickAt = 0;
  let suppressNextWheelAuxClick = false;
  const WHEEL_DOUBLE_CLICK_MS = 400;
  const closePreview = () => {
    document.getElementById('__lite_view_preview_host')?.remove();
    activePreviewWindow = null;
  };
  const isPdf = url => url.pathname.toLowerCase().endsWith('.pdf');

  function createLogo() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 64 64');
    svg.setAttribute('aria-hidden', 'true');
    const background = document.createElementNS(svg.namespaceURI, 'rect');
    background.setAttribute('width', '64'); background.setAttribute('height', '64');
    background.setAttribute('rx', '16'); background.setAttribute('fill', '#147c5c');
    const monogram = document.createElementNS(svg.namespaceURI, 'path');
    monogram.setAttribute('d', 'M15 15h8v26h13v8H15z M28 19h8l7 18 8-18h8L47 49h-8z');
    monogram.setAttribute('fill', '#fff');
    svg.append(background, monogram);
    return svg;
  }

  async function openPreview(rawUrl, title) {
    let target;
    try { target = new URL(rawUrl, location.href); } catch { return; }
    // Preview only pages on the current origin. Never turn the iframe into an
    // arbitrary cross-site browser or allow URL user-info credentials.
    if (target.origin !== PAGE_ORIGIN || !isHttpPage || target.username || target.password) return;
    closePreview();

    let siteSettings;
    try {
      const stored = await chrome.storage.local.get('liteViewSettings');
      const settings = stored.liteViewSettings || {};
      siteSettings = (settings.sites || []).find(site =>
        (typeof site === 'string' ? site : site.origin) === PAGE_ORIGIN && typeof site !== 'string');
      siteSettings ||= settings.defaultSize;
    } catch { /* Use the built-in dimensions if settings cannot be read. */ }
    const getDimension = (value, fallback, min, max) => {
      const n = Number(value);
      return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
    };
    const width = getDimension(siteSettings?.width, 1280, 320, 2400);
    const height = getDimension(siteSettings?.height, 880, 240, 1800);

    const host = document.createElement('div');
    host.id = '__lite_view_preview_host';
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483647';
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = `
      :host{all:initial}.layer{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:3vh 3vw;background:rgba(12,24,22,.55);backdrop-filter:blur(5px);font-family:Inter,"Segoe UI",Arial,sans-serif}
      .panel{width:min(var(--popup-width,1280px),90vw);height:min(var(--popup-height,880px),92vh);min-width:min(var(--popup-min-width,600px),94vw);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(255,255,255,.8);border-radius:15px;background:#f7f9f8;box-shadow:0 26px 84px rgba(7,23,19,.34)}
      header{height:53px;flex:none;display:flex;align-items:center;gap:11px;padding:0 14px 0 17px;border-bottom:1px solid #e8eeeb;background:#fff}.mark{width:27px;height:27px;flex:none}.mark svg{width:100%;height:100%;display:block}.heading{min-width:0;flex:1}.name{display:block;overflow:hidden;color:#1b2927;font-size:12px;font-weight:650;text-overflow:ellipsis;white-space:nowrap}.hint{display:block;margin-top:2px;color:#87948e;font-size:9px}
      button{width:32px;height:32px;border:0;border-radius:8px;background:#f1f5f3;color:#687871;font:20px/1 Inter,"Segoe UI",Arial,sans-serif;cursor:pointer}button:hover{background:#e5eee9;color:#147c5c}iframe{width:100%;height:100%;min-height:0;flex:1;border:0;background:#fff}
      @media(max-width:640px){.layer{padding:12px}.panel{width:100%;height:100%;min-width:0;border-radius:11px}}
    `;
    const layer = document.createElement('div'); layer.className = 'layer';
    const panel = document.createElement('section'); panel.className = 'panel';
    panel.style.setProperty('--popup-width', `${width}px`);
    panel.style.setProperty('--popup-height', `${height}px`);
    panel.style.setProperty('--popup-min-width', `${Math.min(width, 600)}px`);
    const bar = document.createElement('header');
    const mark = document.createElement('div'); mark.className = 'mark'; mark.append(createLogo());
    const heading = document.createElement('div'); heading.className = 'heading';
    const name = document.createElement('strong'); name.className = 'name'; name.textContent = title || 'Sayfa önizlemesi';
    const hint = document.createElement('small'); hint.className = 'hint'; hint.textContent = 'Lite View önizleme';
    heading.append(name, hint);
    const close = document.createElement('button'); close.type = 'button'; close.title = 'Kapat (Esc)'; close.setAttribute('aria-label', 'Önizlemeyi kapat'); close.textContent = '×';
    close.addEventListener('click', closePreview);
    const frame = document.createElement('iframe'); frame.title = title || 'Sayfa önizlemesi'; frame.src = target.href;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    activePreviewWindow = frame.contentWindow;
    bar.append(mark, heading, close); panel.append(bar, frame); layer.append(panel); shadow.append(style, layer);
    layer.addEventListener('mousedown', event => { if (event.target === layer) closePreview(); });
    document.documentElement.append(host);

  }

  document.addEventListener('mousedown', event => {
    if (event.button !== 1) return;
    // Chrome starts middle-button auto-scroll on mousedown, before auxclick.
    event.preventDefault();
    const now = performance.now();
    if (now - lastWheelClickAt <= WHEEL_DOUBLE_CLICK_MS) {
      lastWheelClickAt = 0;
      suppressNextWheelAuxClick = true;
      window.history.back();
      return;
    }
    lastWheelClickAt = now;
  }, true);

  document.addEventListener('auxclick', event => {
    if (event.button !== 1) return;
    if (suppressNextWheelAuxClick) {
      suppressNextWheelAuxClick = false;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return;
    }
    if (!canOpenPreviewHere()) return;

    const link = event.target?.closest?.('a[href]');
    if (!link) return;
    let target;
    try { target = new URL(link.href, location.href); } catch { return; }
    if (target.origin !== PAGE_ORIGIN || target.username || target.password || !/^https?:$/.test(target.protocol)) return;
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    openPreview(target.href, (link.getAttribute('aria-label') || link.title || link.innerText || link.textContent || '').trim());
  }, true);

  document.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (!canOpenPreviewHere()) return;
    const link = event.target?.closest?.('a[href]');
    if (!link) return;
    let target;
    try { target = new URL(link.href, location.href); } catch { return; }
    if (!isPdf(target) || target.origin !== PAGE_ORIGIN || target.username || target.password) return;
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    openPreview(target.href, (link.innerText || link.textContent || '').trim() || 'PDF belgesi');
  }, true);

  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (document.getElementById('__lite_view_preview_host')) closePreview();
    else if (window !== window.top) window.parent.postMessage({ type: 'lite-view:close-preview' }, PAGE_ORIGIN);
  }, true);

  window.addEventListener('message', event => {
    if (event.origin !== PAGE_ORIGIN || event.source !== activePreviewWindow ||
        event.data?.type !== 'lite-view:close-preview') return;
    closePreview();
  });
})();
