/* ============================================================
   OSNote tanıtım sitesi · "Şimdi sen yaz" deneme defteri
   ------------------------------------------------------------
   Hızlı Notlar'ın tarayıcıdaki provası. Uygulamanın kodundan:
   - Araçlar sırasıyla: Kalem, Fosforlu, Silgi, Kement, Şekiller.
   - Dört hızlı renk (#1A1A1A, #FFC107, #E53935, #2196F3) ve "Renk tonu"
     panelindeki on iki klasik renk.
   - Kalınlık "2" ve "4" ile 1–12 arası özel değer; fosforlu kalemin 4,5 katı.
   - Silgi dokunduğu çizginin tamamını siler; kalemin silgi ucu da siler.
   - Kement: seç, taşı, "Seçimi sil". Tek şekil seçilirse köşeleri çekilir.
   - On şekil; köşeli olanlarda açılar derece olarak yazılır.
   - Kâğıt: boş, çizgili, kareli, noktalı; sık/orta/geniş; dört renk.
   - Dışa aktar: PDF tüm defter, PNG bu sayfa.
   Provada en çok 8 sayfa (uygulamada 50). Hiçbir şey saklanmaz.
   ============================================================ */
(function () {
  'use strict';
  var OSN = window.OSN || (window.OSN = {});
  var dil = OSN.dil || function (tr) { return tr; };
  var M = OSN.m;
  var kok = document.getElementById('defter');
  if (!M || !kok) return;

  var W = 600, H = 848;                 // A4 dikey (oran 0,707), mantıksal birim
  var BIRIM = 1.5;                      // uygulamadaki 1 dp → 1,5 birim
  var EN_COK_SAYFA = 8;
  var HIZLI = [['#1A1A1A', dil('Siyah', 'Black')], ['#FFC107', dil('Kehribar', 'Amber')], ['#E53935', dil('Kırmızı', 'Red')], ['#2196F3', dil('Mavi', 'Blue')]];
  var KLASIK = [['#000000', dil('Siyah', 'Black')], ['#FFFFFF', dil('Beyaz', 'White')], ['#9E9E9E', dil('Gri', 'Grey')], ['#E53935', dil('Kırmızı', 'Red')],
    ['#FB8C00', dil('Turuncu', 'Orange')], ['#FFC107', dil('Kehribar', 'Amber')], ['#43A047', dil('Yeşil', 'Green')], ['#00ACC1', dil('Camgöbeği', 'Cyan')],
    ['#1E88E5', dil('Mavi', 'Blue')], ['#3949AB', dil('Çivit', 'Indigo')], ['#8E24AA', dil('Mor', 'Purple')], ['#D81B60', dil('Pembe', 'Pink')]];
  var SEKILLER = ['cizgi', 'ok', 'ciftok', 'yay', 'elips', 'ucgen', 'dikucgen', 'dikdortgen', 'besgen', 'yildiz'];
  var ARALIK = { sik: 22 * BIRIM, orta: 34 * BIRIM, genis: 48 * BIRIM };
  var KOYU = { '#202124': 1, '#14331F': 1 };
  var IPUCU = OSN.en ? {
    kalem: 'A stylus, finger or mouse can write. Once a stylus is detected, your finger and palm no longer write.',
    fosforlu: 'The highlighter is see-through: the writing underneath stays visible.',
    silgi: 'The eraser removes each stroke it touches, whole. Your stylus’s eraser end works too.',
    kement: 'Draw around what you want to select, then drag to move it or tap “Delete selection”. Select a single shape and you can pull its corners.',
    sekil: 'Drag to draw, then pull the corners one by one. Shapes with corners show their angles in degrees.'
  } : {
    kalem: 'Kalem, parmak ya da fare yazar. Kalem (stylus) algılanınca parmak ve avuç yazmaz.',
    fosforlu: 'Fosforlu yarı saydam: altındaki yazı görünmeye devam eder.',
    silgi: 'Silgi, dokunduğu çizginin tamamını siler. Kaleminin silgi ucu da siler.',
    kement: 'Seçmek istediğinin çevresini çiz; sonra sürükleyip taşı ya da “Seçimi sil”. Tek bir şekli seçersen köşelerini çekersin.',
    sekil: 'Sürükleyerek çiz, sonra köşelerini tek tek çek. Köşeli şekillerde açılar derece olarak yazılır.'
  };
  // "3 sayfa" / "3 pages"
  function sayfaSay(n) { return n + dil(' sayfa', n === 1 ? ' page' : ' pages'); }

  var $ = function (s) { return kok.querySelector(s); };
  var $$ = function (s) { return kok.querySelectorAll(s); };
  var sayfaEl = $('[data-sayfa]');
  var kagitT = $('.defter__kagit');
  var murekkepT = $('.defter__murekkep');
  var ipucu = $('[data-defter-ipucu]');
  var sayfaNo = $('[data-sayfa-no]');
  if (!sayfaEl || !kagitT || !murekkepT) return;

  var d = {
    arac: 'kalem', renk: '#2196F3', boy: 4, sekil: 'ucgen',
    kagit: { desen: 'kareli', aralik: 'orta', renk: '#FFFFFF' },
    sayfalar: [{ ops: [], geri: [], ileri: [] }], no: 0,
    kalemGoruldu: false, isaretci: null, is: null, son: null, kutu: null
  };
  var yuzey = new M.Yuzey(murekkepT, { sinir: 60 });

  /* ---------------------------------------------------------- araç çubuğu */
  function kurRenkler() {
    var k = $('[data-renkler]'), h = '';
    for (var i = 0; i < HIZLI.length; i++) {
      h += '<button type="button" role="radio" class="renk" data-renk="' + HIZLI[i][0] + '" aria-checked="false" aria-label="' + HIZLI[i][1] + '" title="' + HIZLI[i][1] + '"></button>';
    }
    h += '<button type="button" class="renk renk--ton" data-is="ton" aria-expanded="false" aria-controls="defter-renk" aria-label="' + dil('Renk tonu: diğer renkler', 'Hue: more colours') + '" title="' + dil('Renk tonu', 'Hue') + '"></button>';
    k.innerHTML = h;
    var t = $('[data-klasik]'), g = '';
    for (var j = 0; j < KLASIK.length; j++) {
      g += '<button type="button" role="radio" class="renk" data-renk="' + KLASIK[j][0] + '" aria-checked="false" aria-label="' + KLASIK[j][1] + '" title="' + KLASIK[j][1] + '"></button>';
    }
    t.innerHTML = g;
    var hepsi = $$('.renk[data-renk]');
    for (var n = 0; n < hepsi.length; n++) hepsi[n].style.setProperty('--r', hepsi[n].getAttribute('data-renk'));
    var zemin = $$('[data-defter-zemin] [data-deger]');
    for (var z = 0; z < zemin.length; z++) zemin[z].style.setProperty('--r', zemin[z].getAttribute('data-deger'));
  }
  function kurBoylar() {
    $('[data-boylar]').innerHTML =
      '<button type="button" role="radio" class="boy" data-boy="2" aria-checked="false" aria-label="' + dil('İnce', 'Thin') + '" title="' + dil('İnce', 'Thin') + '"><i></i></button>' +
      '<button type="button" role="radio" class="boy boy--kalin" data-boy="4" aria-checked="false" aria-label="' + dil('Kalın', 'Thick') + '" title="' + dil('Kalın', 'Thick') + '"><i></i></button>' +
      '<button type="button" class="boy boy--ozel" data-is="boy" aria-expanded="false" aria-controls="defter-boy" title="' + dil('Özel kalınlık', 'Custom thickness') + '"><span data-boy-ozel>' + dil('Özel', 'Custom') + '</span></button>';
  }
  function kurSekiller() {
    var h = '';
    for (var i = 0; i < SEKILLER.length; i++) {
      var s = SEKILLER[i];
      h += '<button type="button" role="radio" data-sekil="' + s + '" aria-checked="' + (s === d.sekil) + '" aria-label="' + M.SEKIL_AD[s] + '" title="' + M.SEKIL_AD[s] + '">' + sekilSimge(s) + '</button>';
    }
    $('[data-sekiller]').innerHTML = h;
  }
  // on şeklin küçük çizimleri (satır içi SVG; stil yok, yalnız yol)
  function sekilSimge(s) {
    var v = { cizgi: 'M5 19 19 5', ok: 'M5 19 19 5M11.2 5H19v7.8', ciftok: 'M5 19 19 5M11.2 5H19v7.8M12.8 19H5v-7.8', yay: 'M4 17a8 8 0 0 1 16 0',
      elips: 'M3.5 12a8.5 6 0 1 0 17 0a8.5 6 0 1 0-17 0', ucgen: 'M12 4.6l8.2 14.6H3.8z', dikucgen: 'M5 4.5v15h14z', dikdortgen: 'M4.5 6.5h15v11h-15z',
      besgen: 'M12 3.8l8.2 6-3.1 9.7H6.9L3.8 9.8z', yildiz: 'M12 3.8l2.5 5.3 5.7.7-4.2 3.9 1.1 5.7L12 16.6l-5.1 2.8 1.1-5.7-4.2-3.9 5.7-.7z' }[s];
    return '<svg class="simge" viewBox="0 0 24 24" aria-hidden="true"><path d="' + v + '"/></svg>';
  }

  function isaretle() {
    var a = $$('[data-arac]');
    for (var i = 0; i < a.length; i++) {
      var sec = a[i].getAttribute('data-arac') === d.arac;
      a[i].setAttribute('aria-checked', String(sec));
      a[i].tabIndex = sec ? 0 : -1;
    }
    var r = $$('.renk[data-renk]'), bulundu = false;
    for (var j = 0; j < r.length; j++) {
      var s = r[j].getAttribute('data-renk').toUpperCase() === d.renk.toUpperCase();
      r[j].setAttribute('aria-checked', String(s));
      if (r[j].closest('[data-renkler]')) { r[j].tabIndex = s ? 0 : -1; if (s) bulundu = true; }
    }
    // seçili renk hızlı renklerde yoksa ilk hızlı renk sekme sırasında kalsın
    if (!bulundu) { var ilk = $('[data-renkler] .renk[data-renk]'); if (ilk) ilk.tabIndex = 0; }
    var ton = $('[data-is="ton"]');
    if (ton) { ton.style.setProperty('--r', d.renk); ton.classList.toggle('renk--ozel', !bulundu); }
    var b = $$('[data-boy]'), boyBulundu = false;
    for (var k = 0; k < b.length; k++) {
      var bs = +b[k].getAttribute('data-boy') === d.boy;
      b[k].setAttribute('aria-checked', String(bs));
      b[k].tabIndex = bs ? 0 : -1;
      if (bs) boyBulundu = true;
    }
    if (!boyBulundu && b[0]) b[0].tabIndex = 0;
    var oz = $('[data-boy-ozel]');
    if (oz) oz.textContent = boyBulundu ? dil('Özel', 'Custom') : String(d.boy);
    var sk = $$('[data-sekil]');
    for (var n = 0; n < sk.length; n++) {
      var ss = sk[n].getAttribute('data-sekil') === d.sekil;
      sk[n].setAttribute('aria-checked', String(ss));
      sk[n].tabIndex = ss ? 0 : -1;
    }
    sayfaEl.setAttribute('data-arac', d.arac);
    durum();
  }
  function durum() {
    $('[data-is="geri"]').disabled = !yuzey.geri.length;
    $('[data-is="ileri"]').disabled = !yuzey.ileri.length;
    var sil = $('[data-is="secim-sil"]');
    sil.hidden = !(yuzey.secim || (yuzey.aktif && (d.arac === 'kement' || d.arac === 'sekil')));
    var n = d.sayfalar.length;
    sayfaNo.textContent = dil('Sayfa ', 'Page ') + (d.no + 1) + ' / ' + n;
    $('[data-is="onceki"]').disabled = d.no === 0;
    $('[data-is="sonraki"]').disabled = d.no >= n - 1;
    var ekle = $('[data-is="ekle"]');
    ekle.disabled = n >= EN_COK_SAYFA;
    ekle.title = n >= EN_COK_SAYFA ? dil('Provada en çok ' + EN_COK_SAYFA + ' sayfa (uygulamada 50)', 'Up to ' + EN_COK_SAYFA + ' pages in this demo (50 in the app)') : '';
    var pa = $('[data-pdf-alt]');
    if (pa) pa.textContent = dil('Tüm defter • ', 'Whole notebook • ') + sayfaSay(n);
  }
  function ipucuYaz(m) { if (ipucu) ipucu.textContent = m; }

  /* ---------------------------------------------------------- açılır paneller */
  var ACILIR = { sekil: 'defter-sekil', ton: 'defter-renk', boy: 'defter-boy', kagit: 'defter-kagit', aktar: 'defter-aktar' };
  var acikPanel = null;
  function panelAc(ad) {
    if (acikPanel === ad) { panelKapat(); return; }
    panelKapat();
    var p = document.getElementById(ACILIR[ad]);
    if (!p) return;
    p.hidden = false;
    acikPanel = ad;
    var tetik = ad === 'sekil' ? $('[data-arac="sekil"]') : $('[data-is="' + ad + '"]');
    if (tetik && tetik.hasAttribute('aria-expanded')) tetik.setAttribute('aria-expanded', 'true');
    // panel araç çubuğuna bağlı (çubuk kaydırırken yapışık kalır): tetikleyen düğmenin hizasında, çubuktan taşmadan
    var cubuk = $('.defter__cubuk').getBoundingClientRect(), t = tetik ? tetik.getBoundingClientRect() : cubuk;
    var en = p.getBoundingClientRect().width;
    var sol = M.sinirla(t.left - cubuk.left - 8, 0, Math.max(0, cubuk.width - en));
    p.style.setProperty('--sol', sol + 'px');
  }
  function panelKapat() {
    if (!acikPanel) return;
    var p = document.getElementById(ACILIR[acikPanel]);
    if (p) p.hidden = true;
    var e = $$('[aria-expanded="true"]');
    for (var i = 0; i < e.length; i++) e[i].setAttribute('aria-expanded', 'false');
    acikPanel = null;
  }

  /* ---------------------------------------------------------- kâğıt ve boyut */
  var boyut = { w: 0, h: 0, olcek: 1 };
  function boyutla() {
    var r = sayfaEl.getBoundingClientRect();
    if (!r.width) return false;
    var w = r.width, h = w * H / W, dpr = M.dpr();
    boyut = { w: w, h: h, olcek: w / W };
    var kw = Math.round(w * dpr), kh = Math.round(h * dpr);
    if (kagitT.width !== kw || kagitT.height !== kh) { kagitT.width = kw; kagitT.height = kh; }
    kagitCiz();
    yuzey.boyutla(w, h, boyut.olcek, dpr);
    return true;
  }
  function kagitRenkleri(zemin) {
    var koyu = !!KOYU[zemin.toUpperCase()] || !!KOYU[zemin];
    return koyu ? 'rgba(255,255,255,0.16)' : 'rgba(17,17,17,0.12)';
  }
  function kagitCiz(c, olcek) {
    var x = c || kagitT.getContext('2d');
    var s = olcek || (kagitT.width / W);
    x.setTransform(s, 0, 0, s, 0, 0);
    M.kagit(x, W, H, d.kagit.desen, d.kagit.renk, kagitRenkleri(d.kagit.renk), ARALIK[d.kagit.aralik]);
  }

  /* ---------------------------------------------------------- sayfalar */
  function sayfaKaydet() {
    var s = d.sayfalar[d.no];
    s.ops = yuzey.ops; s.geri = yuzey.geri; s.ileri = yuzey.ileri;
  }
  function sayfaAc(n) {
    if (n < 0 || n >= d.sayfalar.length || n === d.no) return;
    sayfaKaydet();
    d.no = n;
    var s = d.sayfalar[n];
    yuzey.aktif = null; yuzey.secim = null; yuzey.canli = null; yuzey.kement = null;
    yuzey.ops = s.ops; yuzey.geri = s.geri; yuzey.ileri = s.ileri;
    yuzey.ciz();
    durum();
    kutuphaneYenile();
  }
  function sayfaEkle() {
    if (d.sayfalar.length >= EN_COK_SAYFA) { ipucuYaz(dil('Provada en çok ' + EN_COK_SAYFA + ' sayfa; uygulamada bir defterde 50 sayfaya kadar yazarsın.',
      'This demo holds up to ' + EN_COK_SAYFA + ' pages; in the app a notebook holds up to 50.')); return; }
    sayfaKaydet();
    d.sayfalar.push({ ops: [], geri: [], ileri: [] });
    sayfaAc(d.sayfalar.length - 1);
    ipucuYaz(dil('Yeni sayfa eklendi. Uygulamada sayfalar alt alta akar; son sayfa dolunca yenisi kendiliğinden eklenir.',
      'New page added. In the app, pages run one below the other, and a new one is added when the last fills up.'));
  }

  /* ---------------------------------------------------------- çizim */
  function nokta(e) {
    var r = d.kutu || murekkepT.getBoundingClientRect();
    return [(e.clientX - r.left) / boyut.olcek, (e.clientY - r.top) / boyut.olcek];
  }
  function bas(e) {
    if (e.pointerType === 'pen') {
      if (!d.kalemGoruldu) { d.kalemGoruldu = true; ipucuYaz(dil('Kalem algılandı: artık yalnız kalem yazıyor, parmağın ve avucun yazmaz.', 'Stylus detected: now only the stylus writes, not your finger or palm.')); }
    } else if (e.pointerType === 'touch' && d.kalemGoruldu) {
      return; // avuç ve parmak: kalem varken yazmaz
    }
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (d.isaretci !== null) return;
    e.preventDefault();
    panelKapat();
    d.isaretci = e.pointerId;
    d.kutu = murekkepT.getBoundingClientRect();
    try { murekkepT.setPointerCapture(e.pointerId); } catch (_) { /* yok */ }
    var n = nokta(e);
    d.son = n;
    d.bas = n;
    var silgiUcu = e.pointerType === 'pen' && (e.button === 5 || (e.buttons & 32) === 32);
    if (silgiUcu && d.arac !== 'kement') {
      d.is = 'sil'; yuzey.silBaslat(); yuzey.silButun(n[0], n[1], n[0], n[1], 16 * BIRIM);
      return;
    }
    switch (d.arac) {
      case 'kalem': d.is = 'ciz'; yuzey.baslat('kalem', d.renk, d.boy * BIRIM, n[0], n[1]); break;
      case 'fosforlu': d.is = 'ciz'; yuzey.baslat('fosforlu', d.renk, Math.min(d.boy * 4.5, 110) * BIRIM, n[0], n[1]); break;
      case 'silgi': d.is = 'sil'; yuzey.silBaslat(); yuzey.silButun(n[0], n[1], n[0], n[1], 16 * BIRIM); break;
      case 'kement':
        if (yuzey.secim && yuzey.secimIcinde(n[0], n[1])) { d.is = 'tasi'; }
        else if (yuzey.aktif && yuzey.sekilDokunus(n[0], n[1])) { d.is = 'duzen'; yuzey.duzenBaslat(yuzey.sekilDokunus(n[0], n[1]), n[0], n[1]); }
        else { d.is = 'kement'; yuzey.kementBaslat(n[0], n[1]); }
        break;
      case 'sekil':
        var dok = yuzey.aktif && yuzey.sekilDokunus(n[0], n[1]);
        if (dok) { d.is = 'duzen'; yuzey.duzenBaslat(dok, n[0], n[1]); }
        else { d.is = 'sekil'; yuzey.birak(); yuzey.sekilBaslat(d.sekil, d.renk, d.boy * BIRIM, n[0], n[1]); }
        break;
    }
    durum();
  }
  function surukle(e) {
    if (d.isaretci !== e.pointerId) return;
    var olaylar = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
    if (!olaylar.length) olaylar = [e];
    for (var i = 0; i < olaylar.length; i++) {
      var n = nokta(olaylar[i]);
      switch (d.is) {
        case 'ciz': yuzey.surdur(n[0], n[1]); break;
        case 'sil': yuzey.silButun(d.son[0], d.son[1], n[0], n[1], 16 * BIRIM); break;
        case 'kement': yuzey.kementSurdur(n[0], n[1]); break;
        case 'tasi': break;
        case 'duzen': yuzey.duzenSurukle(n[0], n[1]); break;
        case 'sekil': yuzey.sekilSurukle(n[0], n[1]); break;
      }
      d.son = n;
    }
    if (d.is === 'tasi') yuzey.tasi(d.son[0] - d.bas[0], d.son[1] - d.bas[1], false);
  }
  function birak(e) {
    if (d.isaretci !== e.pointerId) return;
    d.isaretci = null;
    d.kutu = null;
    switch (d.is) {
      case 'ciz': yuzey.bitir(); break;
      case 'sil': yuzey.silBitir(); break;
      case 'kement':
        var n = yuzey.kementBitir();
        ipucuYaz(n ? (yuzey.aktif ? dil('Şekil seçildi: köşelerini çek, gövdesinden tutup taşı.', 'Shape selected: pull its corners, or grab its body to move it.')
          : n + dil(' çizgi seçildi. Sürükleyip taşı ya da “Seçimi sil”.', (n === 1 ? ' stroke' : ' strokes') + ' selected. Drag to move, or tap “Delete selection”.'))
          : dil('Hiçbir şey seçilmedi; çizginin çevresini dolaş.', 'Nothing selected; draw all the way around a stroke.'));
        break;
      case 'tasi': yuzey.tasi(d.son[0] - d.bas[0], d.son[1] - d.bas[1], true); break;
      case 'duzen': yuzey.duzenBitir(); break;
      case 'sekil': yuzey.sekilBitir(); break;
    }
    d.is = null;
    durum();
  }

  /* ---------------------------------------------------------- dışa aktar */
  function sayfaTuvali(sayfa, olcek) {
    var c = document.createElement('canvas');
    c.width = Math.round(W * olcek);
    c.height = Math.round(H * olcek);
    var x = c.getContext('2d');
    kagitCiz(x, olcek);
    x.setTransform(olcek, 0, 0, olcek, 0, 0);
    M.opsCiz(x, sayfa.ops, olcek);
    return c;
  }
  function pngAl() {
    sayfaKaydet();
    var c = sayfaTuvali(d.sayfalar[d.no], 2);
    M.tuvalBlob(c, 'image/png').then(function (b) {
      M.indir(b, dil('osnote-defter-sayfa-', 'osnote-notebook-page-') + (d.no + 1) + '.png');
      ipucuYaz(dil('Bu sayfa PNG olarak indi.', 'This page was saved as a PNG.'));
    }).catch(function () { ipucuYaz(dil('PNG hazırlanamadı, bir daha dene.', 'Couldn’t make the PNG. Try again.')); });
  }
  function pdfAl() {
    sayfaKaydet();
    var isler = d.sayfalar.map(function (s) {
      var c = sayfaTuvali(s, 1.6);
      return M.tuvalBlob(c, 'image/jpeg', 0.9).then(M.blobBayt).then(function (u8) {
        return { jpeg: u8, px: [c.width, c.height], pt: [595.28, 841.89] };
      });
    });
    Promise.all(isler).then(function (sayfalar) {
      M.indir(M.pdf(sayfalar, dil('OSNote defter', 'OSNote notebook')), dil('osnote-defter.pdf', 'osnote-notebook.pdf'));
      ipucuYaz(dil('Defterin tamamı PDF olarak indi (', 'The whole notebook was saved as a PDF (') + sayfaSay(sayfalar.length) + ').');
    }).catch(function () { ipucuYaz(dil('PDF hazırlanamadı, bir daha dene.', 'Couldn’t make the PDF. Try again.')); });
  }

  /* ---------------------------------------------------------- kütüphane */
  // Defterin kapağı: uygulamanın on kapağından biri (res/drawable-nodpi/cover_ink_plane)
  var KAPAK = 'assets/img/kapak-ucak.webp';
  var sekme = 'tumu', listeZaman = 0;
  var liste = document.querySelector('[data-kutuphane-liste]');
  var bos = document.querySelector('[data-kutuphane-bos]');
  var sayac = document.querySelector('[data-kutuphane-sayi]');
  function kutuphaneYenile() {
    clearTimeout(listeZaman);
    listeZaman = setTimeout(listele, 120);
  }
  function kart(o) {
    var li = document.createElement('li');
    li.className = 'kkart' + (o.defter ? ' kkart--defter' : '');
    var resim = document.createElement(o.defter ? 'button' : 'div');
    resim.className = 'kkart__resim';
    if (o.defter) { resim.type = 'button'; resim.setAttribute('aria-label', dil('Defteri aç: ', 'Open notebook: ') + o.ad); }
    if (o.url) {
      var img = document.createElement('img');
      img.src = o.url;
      img.alt = o.defter ? '' : (o.tur === 'ekran' ? dil('Yakalanan ekran ve yazı', 'Captured screen and writing') : dil('Yakalanan yazı', 'Captured writing'));
      img.decoding = 'async';
      resim.appendChild(img);
    }
    li.appendChild(resim);
    var ad = document.createElement('p');
    ad.className = 'kkart__ad';
    ad.textContent = o.ad;
    li.appendChild(ad);
    var alt = document.createElement('p');
    alt.className = 'kkart__alt';
    alt.textContent = o.alt;
    li.appendChild(alt);
    if (o.defter) {
      resim.addEventListener('click', function () {
        sayfaEl.scrollIntoView({ behavior: M.azHareket() ? 'auto' : 'smooth', block: 'center' });
      });
    } else {
      var is = document.createElement('div');
      is.className = 'kkart__is';
      var indir = document.createElement('button');
      indir.type = 'button';
      indir.textContent = dil('İndir', 'Download');
      indir.setAttribute('aria-label', dil(o.ad + ' indir', 'Download ' + o.ad));
      indir.addEventListener('click', function () { M.indir(o.blob, 'osnote-' + (o.tur === 'ekran' ? dil('ekran', 'screen') : dil('yazi', 'note')) + '-' + o.id + '.png'); });
      var sil = document.createElement('button');
      sil.type = 'button';
      sil.textContent = dil('Sil', 'Delete');
      sil.setAttribute('aria-label', dil(o.ad + ' sil', 'Delete ' + o.ad));
      sil.addEventListener('click', function () { OSN.kutuphane.sil(o.id); });
      is.appendChild(indir);
      is.appendChild(sil);
      li.appendChild(is);
    }
    return li;
  }
  function listele() {
    if (!liste) return;
    var yakalar = OSN.kutuphane ? OSN.kutuphane.ogeler : [];
    liste.textContent = '';
    if (sekme !== 'goruntu') {
      liste.appendChild(kart({ defter: true, ad: dil('Fizik', 'Physics'), alt: sayfaSay(d.sayfalar.length), url: KAPAK }));
    }
    if (sekme !== 'defter') {
      for (var i = 0; i < yakalar.length; i++) {
        var o = yakalar[i];
        liste.appendChild(kart({ id: o.id, ad: o.ad, alt: o.tur === 'ekran' ? dil('Arka plan dahil yazı', 'Writing + background') : dil('Sadece yazı', 'Only my writing'), url: o.url, blob: o.blob, tur: o.tur }));
      }
    }
    if (bos) bos.hidden = !(sekme !== 'defter' && !yakalar.length);
    if (sayac) sayac.textContent = dil('1 defter · ' + yakalar.length + ' görüntü', '1 notebook · ' + yakalar.length + (yakalar.length === 1 ? ' capture' : ' captures'));
  }
  function sekmeSec(b) {
    var t = document.querySelectorAll('.kutuphane [role="tab"]');
    for (var i = 0; i < t.length; i++) {
      var s = t[i] === b;
      t[i].setAttribute('aria-selected', String(s));
      t[i].tabIndex = s ? 0 : -1;
    }
    sekme = b.getAttribute('data-sekme');
    liste.setAttribute('aria-labelledby', b.id);
    listele();
  }

  /* ---------------------------------------------------------- olaylar */
  function aracSec(a) {
    if (a !== d.arac) {
      if (!(a === 'kement' && d.arac === 'sekil')) yuzey.birak();
      else yuzey.secim = null;
      d.arac = a;
      yuzey.ciz();
    }
    isaretle();
    ipucuYaz(IPUCU[a]);
    if (a === 'sekil') panelAc('sekil'); else panelKapat();
  }
  function renkSec(r) {
    d.renk = r;
    // uygulamadaki gibi: renk seçince çizim aracına dön (silgi/kement seçiliyse kalem)
    if (d.arac === 'silgi' || d.arac === 'kement') { yuzey.birak(); d.arac = 'kalem'; ipucuYaz(IPUCU.kalem); }
    isaretle();
  }
  kok.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b || !kok.contains(b) || b.disabled) return;
    var a = b.getAttribute('data-arac');
    if (a) { aracSec(a); return; }
    var r = b.getAttribute('data-renk');
    if (r) { renkSec(r); if (b.closest('[data-klasik]')) panelKapat(); return; }
    var bo = b.getAttribute('data-boy');
    if (bo) { d.boy = +bo; var ar = $('[data-boy-aralik]'); if (ar) { ar.value = d.boy; $('[data-boy-yazi]').textContent = d.boy; } isaretle(); return; }
    var s = b.getAttribute('data-sekil');
    if (s) { d.sekil = s; yuzey.birak(); d.arac = 'sekil'; isaretle(); panelKapat(); ipucuYaz(M.SEKIL_AD[s] + ': ' + IPUCU.sekil); return; }
    var grup = b.closest('[data-defter-desen],[data-defter-aralik],[data-defter-zemin]');
    if (grup) {
      var hepsi = grup.querySelectorAll('[role="radio"]');
      for (var i = 0; i < hepsi.length; i++) { hepsi[i].setAttribute('aria-checked', String(hepsi[i] === b)); hepsi[i].tabIndex = hepsi[i] === b ? 0 : -1; }
      var v = b.getAttribute('data-deger');
      if (grup.hasAttribute('data-defter-desen')) d.kagit.desen = v;
      else if (grup.hasAttribute('data-defter-aralik')) d.kagit.aralik = v;
      else {
        var eskiKoyu = !!KOYU[d.kagit.renk];
        d.kagit.renk = v;
        // koyu kâğıtta varsayılan mürekkep beyaz (uygulamadaki gibi)
        if (!eskiKoyu && KOYU[v] && d.renk.toUpperCase() === '#1A1A1A') d.renk = '#FFFFFF';
        else if (eskiKoyu && !KOYU[v] && d.renk.toUpperCase() === '#FFFFFF') d.renk = '#1A1A1A';
        isaretle();
      }
      kagitCiz();
      kutuphaneYenile();
      return;
    }
    switch (b.getAttribute('data-is')) {
      case 'geri': yuzey.geriAl(); break;
      case 'ileri': yuzey.yinele(); break;
      case 'secim-sil': yuzey.secileniSil(); ipucuYaz(dil('Seçilenler silindi. Geri al ile dönebilirsin.', 'Selection deleted. Undo brings it back.')); break;
      case 'ton': panelAc('ton'); break;
      case 'boy': panelAc('boy'); break;
      case 'kagit': panelAc('kagit'); break;
      case 'aktar': panelAc('aktar'); break;
      case 'png': panelKapat(); pngAl(); break;
      case 'pdf': panelKapat(); pdfAl(); break;
      case 'onceki': sayfaAc(d.no - 1); break;
      case 'sonraki': sayfaAc(d.no + 1); break;
      case 'ekle': sayfaEkle(); break;
    }
    durum();
  });
  kok.addEventListener('input', function (e) {
    if (e.target.hasAttribute('data-boy-aralik')) {
      d.boy = +e.target.value;
      $('[data-boy-yazi]').textContent = d.boy;
      isaretle();
    }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!acikPanel) return;
    var p = document.getElementById(ACILIR[acikPanel]);
    if (p && p.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.defter__cubuk')) return;
    panelKapat();
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && acikPanel) {
      var tetik = acikPanel === 'sekil' ? $('[data-arac="sekil"]') : $('[data-is="' + acikPanel + '"]');
      panelKapat();
      if (tetik && kok.contains(document.activeElement)) tetik.focus();
    }
  });
  var sekmeler = document.querySelector('.kutuphane__sekmeler');
  if (sekmeler) {
    sekmeler.addEventListener('click', function (e) { var b = e.target.closest('[role="tab"]'); if (b) sekmeSec(b); });
    sekmeler.addEventListener('keydown', function (e) {
      var yon = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!yon) return;
      var t = Array.prototype.slice.call(sekmeler.querySelectorAll('[role="tab"]')), i = t.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var j = (i + yon + t.length) % t.length;
      t[j].focus();
      sekmeSec(t[j]);
    });
  }

  murekkepT.addEventListener('pointerdown', bas);
  murekkepT.addEventListener('pointermove', surukle);
  murekkepT.addEventListener('pointerup', birak);
  murekkepT.addEventListener('pointercancel', birak);
  murekkepT.addEventListener('lostpointercapture', birak);
  murekkepT.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  yuzey.degisti = function () { durum(); kutuphaneYenile(); };

  kurRenkler();
  kurBoylar();
  kurSekiller();
  if (OSN.radyoKlavye) OSN.radyoKlavye(kok);
  isaretle();
  if (OSN.kutuphane) OSN.kutuphane.dinle(listele);

  // ilk boyut: bölüm görünür olmadan önce de (yerleşim hazırsa) kur
  var ilk = function () { boyutla(); };
  if ('ResizeObserver' in window) {
    var sonW = 0;
    new ResizeObserver(function () {
      var w = sayfaEl.getBoundingClientRect().width;
      if (Math.abs(w - sonW) < 0.5) return;
      sonW = w;
      boyutla();
    }).observe(sayfaEl);
  } else {
    window.addEventListener('resize', boyutla);
  }
  ilk();
  listele();
  OSN.defter = { d: d, yuzey: yuzey, sayfaAc: sayfaAc };
})();
