// Sayfanın başında, eşzamanlı çalışır: "js" sınıfını koyar, dil yardımcısını kurar ve sunucudan
// açılınca yazı tiplerini önden yükler, manifesti bağlar. Dosyadan (file://) açıldığında tarayıcı bu
// istekleri CORS yüzünden reddettiği için eklenmez. Satır içi betik yok: içerik güvenlik
// politikası (script-src 'self') satır içi betiğe izin vermiyor.
(function () {
  var h = document.documentElement;
  h.classList.remove('js-yok');
  h.classList.add('js');
  // dil: sayfanın dili (html lang). Betikler metni OSN.dil('Türkçe', 'English') ile seçer;
  // index.html Türkçe, en.html İngilizce (araclar/ceviri.mjs üretir).
  var en = (h.getAttribute('lang') || '').slice(0, 2) === 'en';
  var OSN = window.OSN || (window.OSN = {});
  OSN.en = en;
  OSN.dil = function (tr, ing) { return en ? ing : tr; };
  if (location.protocol === 'file:') return;
  var liste = [
    ['preload', 'assets/fonts/shippori-800.woff2'],
    ['preload', 'assets/fonts/manrope.woff2'],
    ['preload', 'assets/fonts/roboto-400.woff2'],
    ['preload', 'assets/fonts/roboto-500.woff2'],
    ['manifest', en ? 'site-en.webmanifest' : 'site.webmanifest']
  ];
  for (var i = 0; i < liste.length; i++) {
    var l = document.createElement('link');
    l.rel = liste[i][0];
    l.href = liste[i][1];
    if (l.rel === 'preload') { l.as = 'font'; l.type = 'font/woff2'; l.crossOrigin = 'anonymous'; }
    document.head.appendChild(l);
  }
})();
