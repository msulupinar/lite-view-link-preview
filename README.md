# Lite View – Link Preview

Chrome and Edge extension that opens same-site links in an in-page preview when middle-clicked. Same-site PDF links open in the same preview. It does not run a web server and does not send browsing data anywhere.

## Features

- Choose specific HTTP/HTTPS sites, or explicitly enable all HTTP/HTTPS sites.
- Middle-click a same-origin link to preview it without opening a tab.
- Open same-origin PDF links in the preview with a normal click.
- Close previews with Escape, the close button, or a click on the backdrop.
- Site selection is stored locally in the browser.

External links keep their normal browser behavior. Preview navigation is limited to the origin of the current page.

## Install from source

1. Download or clone this repository and extract it.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose the `lite-view-configurable-extension` folder.
5. Open the extension's **Options** page and select the sites where it should run.

For selected sites, enter one origin per line, for example `https://example.com`. Only that origin is granted access. The extension asks Chrome for the relevant site permission when settings are saved. Choosing all websites requests access to all HTTP and HTTPS sites; Chrome displays this broader access request.

## Privacy and permissions

- `storage`: saves the enabled state and site list in the browser.
- `scripting`: registers the preview content script only for the selected origins.
- Optional HTTP/HTTPS site access: requested only for the configured sites, or for all HTTP/HTTPS sites if that option is selected.
- No analytics, remote scripts, external network requests, password handling, or browsing-history collection.

The extension source is provided under the MIT License. Review the source before installing or publishing it.

---

# Lite View – Bağlantı Önizleme

Orta fare tuşuyla tıklanan aynı siteye ait bağlantıları sayfa içi önizleme penceresinde açan Chrome ve Edge eklentisi. Aynı siteye ait PDF bağlantıları da aynı önizlemede açılır. Eklentinin çalışması için web sunucusu gerekmez ve gezinme verileri herhangi bir yere gönderilmez.

## Özellikler

- Belirli HTTP/HTTPS sitelerini seçebilir veya tüm HTTP/HTTPS sitelerinde çalışmasını etkinleştirebilirsin.
- Aynı kaynaktaki bir bağlantıya orta tıklayarak yeni sekme açmadan önizleyebilirsin.
- Aynı kaynaktaki PDF bağlantılarını normal tıklamayla önizlemede açabilirsin.
- Önizlemeyi Esc tuşuyla, kapatma düğmesiyle veya arka plana tıklayarak kapatabilirsin.
- Site seçimi tarayıcıda yerel olarak saklanır.

Dış bağlantılar tarayıcının normal davranışını sürdürür. Önizleme içinde gezinme, o anki sayfayla aynı kaynakla sınırlıdır.

## Kaynak koddan kurulum

1. Bu depoyu indir veya klonla ve arşivden çıkar.
2. Chrome'da `chrome://extensions`, Edge'de `edge://extensions` adresini aç.
3. **Geliştirici modu**nu etkinleştir.
4. **Paketlenmemiş öğe yükle** seçeneğine tıkla ve `lite-view-configurable-extension` klasörünü seç.
5. Eklentinin **Seçenekler** sayfasını açıp çalışmasını istediğin siteleri belirle.


Belirli siteleri seçerken her satıra bir adres yaz. Örneğin: `https://example.com`. Eklenti yalnızca bu adrese erişim izni ister. Ayarları kaydederken Chrome ilgili site iznini sorar. Tüm siteler seçeneği tüm HTTP ve HTTPS sitelerine erişim ister; Chrome bu geniş kapsamlı izin isteğini gösterir.

## Gizlilik ve izinler

- `storage`: etkinleştirme durumunu ve site listesini tarayıcıda saklar.
- `scripting`: önizleme kodunu yalnızca seçilen adreslerde çalıştırır.
- İsteğe bağlı HTTP/HTTPS site erişimi: yalnızca yapılandırılan siteler için veya tüm siteler seçildiyse tüm HTTP/HTTPS siteleri için istenir.
- Analitik, uzaktan kod, harici ağ isteği, parola işleme veya gezinme geçmişi toplama yoktur.

Eklenti MIT Lisansı ile sunulur. Kurmadan veya yayımlamadan önce kaynak kodunu incele.
