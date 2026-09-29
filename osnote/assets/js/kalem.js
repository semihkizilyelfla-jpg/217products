/* ============================================================
   OSNote tanıtım sitesi · sayfanın ekran kalemi
   ------------------------------------------------------------
   Uygulamadaki Ekran Kalemi'nin (gelişmiş çubuk) tarayıcıdaki provası.
   Çubuk ve paneller uygulamanın çizimleriyle (PremiumToolbar.kt,
   OverlayService.kt): El, Kalem, Silgi, Şekiller, altı renk, Sayfa,
   Kapat, Küçült, ⋯ (Geri al, Yinele, Gizle/Göster, Temizle, Yakala).
   - Katman ekrana sabittir: yazı sayfayla birlikte kaymaz. Uygulamada da
     çizim ekranın üstündedir; El modunda alttaki uygulama kayar.
   - Seçili araca ikinci dokunuş boyut panelini açar; renge dokunmak
     kaleme döner ve El modundan çıkar (uygulamadaki kurallar).
   - Kalem (stylus) algılanınca parmak ve avuç yazmaz (El reddi).
   - Yakala → "Sadece yazı": yazı beyaz zeminde PNG olur ve deneme
     bölümündeki kütüphaneye düşer. Tarayıcı sayfanın görüntüsünü
     alamadığı için "Arka plan dahil yazı" burada kapalı.
   - Sitede kalem, düğmeye basan kişi yazmak istediği için doğrudan
     Kalem'de açılır (uygulamada El'de açılır).
   ============================================================ */
(function () {
  'use strict';
  var OSN = window.OSN || (window.OSN = {});
  var dil = OSN.dil || function (tr) { return tr; };
  var M = OSN.m;
  var kok = document.getElementById('kalem');
  if (!M || !kok) return;

  // Uygulamadaki altı mürekkep rengi (PremiumToolbar.kt)
  var RENKLER = [
    ['#1A1A1A', dil('Siyah', 'Black')], ['#D32F2F', dil('Kırmızı', 'Red')], ['#1565C0', dil('Mavi', 'Blue')],
    ['#2E7D32', dil('Yeşil', 'Green')], ['#C2185B', dil('Pembe', 'Pink')], ['#FBC02D', dil('Sarı', 'Yellow')]
  ];
  // Sayfa: kâğıt renkleri ve desenler (OverlayService.kt)
  var KAGITLAR = [
    ['#FAFAFA', dil('Beyaz', 'White')], ['#FDF6E3', dil('Krem', 'Ivory')], ['#FDFBF7', dil('Kâğıt', 'Paper')],
    ['#E9EEF5', dil('Gri', 'Slate')], ['#1E1E2E', dil('Gece', 'Night')], ['#282C34', dil('Koyu', 'Dark')]
  ];
  var DESENLER = [['bos', dil('Boş', 'Blank')], ['kareli', dil('Kareli', 'Grid')], ['cizgili', dil('Çizgili', 'Lined')], ['noktali', dil('Noktalı', 'Dotted')]];
  var SEKILLER = ['cizgi', 'ok', 'dikdortgen', 'elips', 'ucgen', 'yildiz'];
  var GLIF = {
    cizgi: '<path d="M5 19 19 5"/>',
    ok: '<path d="M5 19 19 5M11 5h8v8"/>',
    dikdortgen: '<rect x="4" y="4" width="16" height="16"/>',
    elips: '<ellipse cx="12" cy="12" rx="8" ry="8"/>',
    ucgen: '<path d="M12 4 20 20H4Z"/>',
    yildiz: '<path d="M12 3.6 14.4 8.7 20 9.4 15.8 13.2 16.9 18.8 12 16 7.1 18.8 8.2 13.2 4 9.4 9.6 8.7Z"/>'
  };

  var sekme = document.getElementById('kalem-ac');
  var cubuk = document.getElementById('kalem-cubuk');
  var panel = document.getElementById('kalem-panel');
  var tuval = null, yuzey = null, sayfa = null, acan = null;

  var d = {
    acik: false,
    el: false,
    mini: false,
    arac: 'kalem',            // kalem | silgi | sekil
    sekil: 'ok',
    renk: RENKLER[1][0],
    kalem: 5,                 // 1–25 px; şekiller aynı kalınlığı kullanır (2–25)
    silgi: 36,                // 8–80 px
    kalemGoruldu: false,
    aktif: null,
    is: null,                 // bu basışta ne yapılıyor: 'ciz' | 'sil' | 'sekil' | 'duzen'
    sayfa: { acik: false, renk: KAGITLAR[0][0], desen: 'kareli', opak: 95 },
    gizli: false
  };

  /* ---------------------------------------------------------- araç çubuğu */
  function sm(id) { return '<svg aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function arac(k, etiket, id) {
    return '<button type="button" class="oc__a oc__a--' + (k === 'sekil' ? 'sekil' : k) + '" data-k="' + k + '" aria-pressed="false" aria-label="' + etiket + '" title="' + etiket + '">' + sm(id) + '</button>';
  }
  function cubukKur() {
    var h = '';
    cubuk.classList.toggle('kalem__cubuk--mini', d.mini);
    if (d.mini) {
      // Mini çubuk (OverlayService.kt MiniToolbar): Genişlet, Kalem, El, Silgi
      h += '<button type="button" class="oc__k oc__k--dolu" data-k="genislet" aria-label="' + dil('Genişlet', 'Expand') + '" title="' + dil('Genişlet', 'Expand') + '">' + sm('m-unfold-more') + '</button>';
      h += '<i class="oc__mini-ara" aria-hidden="true"></i>';
      h += arac('kalem', dil('Kalem', 'Pen'), 'o-kalem') + arac('el', dil('El', 'Hand'), 'o-el') + arac('silgi', dil('Silgi', 'Eraser'), 'o-silgi');
      cubuk.innerHTML = h;
      isaretle();
      return;
    }
    h += '<svg class="oc__tac" aria-hidden="true"><use href="#o-tac"/></svg>';
    h += arac('el', dil('El: dokunuşların sayfaya geçer, yazı yerinde kalır', 'Hand: your touches reach the page, your writing stays put'), 'o-el');
    h += '<i class="oc__ara" aria-hidden="true"></i><span class="oc__grup">';
    h += arac('kalem', dil('Kalem (seçiliyken tekrar dokun: boyut)', 'Pen (tap again while selected: size)'), 'o-kalem');
    h += arac('silgi', dil('Silgi (seçiliyken tekrar dokun: boyut)', 'Eraser (tap again while selected: size)'), 'o-silgi');
    h += arac('sekil', dil('Şekiller', 'Shapes'), 'o-sekiller');
    h += '</span><i class="oc__ara" aria-hidden="true"></i><span class="oc__renkler" role="group" aria-label="' + dil('Renkler', 'Colours') + '">';
    for (var i = 0; i < RENKLER.length; i++) {
      h += '<button type="button" data-r="' + i + '" data-renk="' + RENKLER[i][0] + '" aria-pressed="false" aria-label="' + RENKLER[i][1] + '" title="' + RENKLER[i][1] + '"></button>';
    }
    h += '</span><i class="oc__ara" aria-hidden="true"></i>';
    h += '<button type="button" class="oc__k" data-a="sayfa" data-k="sayfa" aria-pressed="false" aria-label="' + dil('Sayfa: ekranın üstüne kâğıt', 'Page: paper over the screen') + '" title="' + dil('Sayfa', 'Page') + '">' + sm('o-sayfa') + '</button>';
    h += '<i class="oc__ara" aria-hidden="true"></i>';
    h += '<button type="button" class="oc__kapat" data-k="kapat" aria-label="' + dil('Kalemi kapat', 'Turn off pen') + '" title="' + dil('Kalemi kapat', 'Turn off pen') + '">' + sm('m-guc') + '<b aria-hidden="true">' + dil('KAPAT', 'OFF') + '</b></button>';
    h += '<button type="button" class="oc__k oc__k--dolu oc__k--kucult" data-k="kucult" aria-label="' + dil('Küçült', 'Minimize') + '" title="' + dil('Küçült', 'Minimize') + '">' + sm('m-unfold-less') + '</button>';
    h += '<button type="button" class="oc__k oc__k--dolu" data-k="daha" aria-label="' + dil('Araçlar: geri al, yinele, gizle, temizle, yakala', 'Tools: undo, redo, hide, clear, capture') + '" title="' + dil('Araçlar', 'Tools') + '" aria-expanded="false">' + sm('m-more-vert') + '</button>';
    cubuk.innerHTML = h;
    isaretle();
  }

  function isaretle() {
    cubuk.classList.toggle('oc--el', d.el && !d.mini);
    var b = cubuk.querySelectorAll('[data-k]');
    for (var i = 0; i < b.length; i++) {
      var k = b[i].getAttribute('data-k'), sec = null;
      if (k === 'kalem' || k === 'silgi' || k === 'sekil') sec = !d.el && d.arac === k;
      if (k === 'el') sec = d.el;
      if (sec !== null) {
        b[i].setAttribute('aria-pressed', String(sec));
        b[i].classList.toggle('oc__a--sec', sec && (k !== 'el' || d.mini));
      }
      if (k === 'sayfa') { b[i].setAttribute('aria-pressed', String(d.sayfa.acik)); b[i].classList.toggle('oc__k--acik', d.sayfa.acik); }
    }
    var r = cubuk.querySelectorAll('[data-renk]');
    for (var j = 0; j < r.length; j++) r[j].setAttribute('aria-pressed', String(r[j].getAttribute('data-renk') === d.renk && d.arac !== 'silgi'));
    cubuk.style.setProperty('--kr', !d.el && d.arac !== 'silgi' ? d.renk : '#8E8E93');
    kok.classList.toggle('kalem--el', d.el);
    document.documentElement.classList.toggle('kalem-el', d.acik && d.el);
    kok.setAttribute('data-kalem-arac', d.arac);
  }

  /* ---------------------------------------------------------- paneller
     Uygulamanın panel dili: solda önizleme kutusu, sağa yaslı başlık ve "Ayarları", kapat dairesi. */
  function bas(onizleme, ad, alt) {
    return '<div class="op__bas"><span class="op__onizleme" aria-hidden="true">' + onizleme + '</span><p class="op__ad">' + ad + '<small>' + (alt || dil('Ayarları', 'Settings')) + '</small></p>' +
      '<button type="button" class="op__kapat" data-is="vazgec" aria-label="' + dil('Paneli kapat', 'Close panel') + '">' + sm('m-kapat') + '</button></div>';
  }
  function aralik(ad, etiket, az, cok, deger, birim, renk) {
    return '<label class="op__boy"><span class="op__satir"><span>' + etiket + '</span><output data-cikti="' + ad + '">' + (birim === '%' ? deger + '%' : deger + ' px') + '</output></span>' +
      '<input type="range" min="' + az + '" max="' + cok + '" step="1" value="' + deger + '" data-aralik="' + ad + '" data-birim="' + birim + '" data-renk-ray="' + (renk || '') + '"></label>';
  }
  function panelAc(tur, kaynak) {
    var h = '';
    if (tur === 'kalem' || tur === 'silgi') {
      var sil = tur === 'silgi', deger = sil ? d.silgi : d.kalem;
      var on = sil ? '<i class="op__silgi" data-onizleme-silgi></i>' : '<svg viewBox="0 0 40 40"><path d="M7 33 33 7" stroke="' + d.renk + '" stroke-width="' + Math.max(2, Math.min(12, d.kalem)) + '" stroke-linecap="round" data-onizleme-cizgi/></svg>';
      h += bas(on, sil ? dil('Silgi', 'Eraser') : dil('Kalem', 'Pen'));
      h += aralik('boy-' + tur, dil('Boyut', 'Size'), sil ? 8 : 1, sil ? 80 : 25, deger, 'px', sil ? 'rgba(255,255,255,0.8)' : d.renk);
    } else if (tur === 'sekil') {
      h += bas('<svg viewBox="0 0 24 24" class="op__onizleme-sekil">' + GLIF[d.sekil] + '</svg>', dil('Şekiller', 'Shapes'));
      h += '<div class="op__izgara" role="group" aria-label="' + dil('Şekil', 'Shape') + '">';
      for (var i = 0; i < SEKILLER.length; i++) {
        var s = SEKILLER[i];
        h += '<button type="button" data-sekil="' + s + '" aria-pressed="' + (s === d.sekil) + '" aria-label="' + M.SEKIL_AD[s] + '" title="' + M.SEKIL_AD[s] + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + GLIF[s] + '</svg></button>';
      }
      h += '</div>' + aralik('boy-kalem', dil('Kalınlık', 'Thickness'), 2, 25, Math.max(2, d.kalem), 'px', '#FFC107');
      h += '<p class="op__not">' + dil('Çizdikten sonra köşelerini tek tek sürükle: açılar derece olarak yazılır.', 'After drawing, drag the corners one by one: the angles are shown in degrees.') + '</p>';
    } else if (tur === 'sayfa') {
      h += bas('<i class="op__kagit-onizleme" data-sayfa-onizleme></i>', dil('Sayfa', 'Page'));
      h += '<label class="op__anahtar"><span>' + dil('Sayfayı aç', 'Enable page') + '</span><input type="checkbox" data-sayfa-ac' + (d.sayfa.acik ? ' checked' : '') + '><i aria-hidden="true"></i></label>';
      h += '<span class="op__alt">' + dil('Kâğıt rengi', 'Paper colour') + '</span><div class="op__kagitlar" role="group" aria-label="' + dil('Kâğıt rengi', 'Paper colour') + '">';
      for (var j = 0; j < KAGITLAR.length; j++) {
        h += '<button type="button" data-kagit="' + KAGITLAR[j][0] + '" data-deger="' + KAGITLAR[j][0] + '" aria-pressed="' + (KAGITLAR[j][0] === d.sayfa.renk) + '" aria-label="' + KAGITLAR[j][1] + '" title="' + KAGITLAR[j][1] + '"></button>';
      }
      h += '</div><span class="op__alt">' + dil('Desen', 'Pattern') + '</span><div class="op__desenler" role="group" aria-label="' + dil('Desen', 'Pattern') + '">';
      for (var k = 0; k < DESENLER.length; k++) {
        h += '<button type="button" data-desen="' + DESENLER[k][0] + '" aria-pressed="' + (DESENLER[k][0] === d.sayfa.desen) + '">' + DESENLER[k][1] + '</button>';
      }
      h += '</div>' + aralik('opak', dil('Opaklık', 'Opacity'), 40, 100, d.sayfa.opak, '%', '#4CAF50');
    } else if (tur === 'daha') {
      h += bas(sm('m-more-horiz'), dil('Araçlar', 'Tools'), dil('Hızlı erişim', 'Quick access'));
      h += '<div class="op__izgara op__izgara--arac">';
      h += aracDugme('geri', dil('Geri al', 'Undo'), 'm-undo', !yuzey || !yuzey.geri.length);
      h += aracDugme('ileri', dil('Yinele', 'Redo'), 'm-redo', !yuzey || !yuzey.ileri.length);
      h += aracDugme('gizle', d.gizli ? dil('Göster', 'Show') : dil('Gizle', 'Hide'), d.gizli ? 'm-goz' : 'm-goz-kapali', false);
      h += aracDugme('temizle', dil('Temizle', 'Clear'), 'm-cop', !yuzey || !yuzey.ops.length, 'op__kirmizi');
      h += aracDugme('yakala', dil('Yakala', 'Capture'), 'm-kamera', !yuzey || !yuzey.ops.length, 'op__yesil');
      h += '</div>';
    } else if (tur === 'yakala') {
      h += '<p class="op__soru">' + dil('Ekran görüntüsü kaydedilsin mi?', 'Save this capture?') + '</p><p class="op__not">' + dil('Neyin kaydedileceğini seç.', 'Choose what to capture.') + '</p>';
      h += '<div class="op__secenek"><button type="button" class="op__birincil" data-is="yakala-yazi">' + dil('Sadece yazı', 'Only my writing') + '</button>';
      h += '<button type="button" data-is="yakala-ekran" disabled aria-describedby="kp-ekran-not">' + dil('Arka plan dahil yazı', 'Writing + background') + '</button></div>';
      h += '<p class="op__not" id="kp-ekran-not">' + dil('Tarayıcı sayfanın görüntüsünü alamaz. Uygulamada bu seçenek arkadaki ekranı da kaydeder.',
        'A browser can’t take a picture of the page. In the app, this option saves the screen behind your writing too.') + '</p>';
      h += '<button type="button" class="op__metin" data-is="vazgec">' + dil('Vazgeç', 'Cancel') + '</button>';
    } else if (tur === 'temizle' || tur === 'kapat') {
      var kap = tur === 'kapat';
      h += '<p class="op__soru">' + (kap ? dil('Kalem kapatılsın mı?', 'Turn off the pen?') : dil('Tuval temizlensin mi?', 'Clear everything?')) + '</p>';
      h += '<p class="op__not">' + (kap ? dil('Ekrandaki çizimler silinir.', 'Ink on the screen will be cleared.')
        : dil('Bütün çizimler silinir; geri al ile dönebilirsin.', 'All ink on screen is erased. Undo brings it back.')) + '</p>';
      h += '<div class="op__secenek"><button type="button" class="op__tehlike" data-is="' + (kap ? 'kapat-evet' : 'temizle-evet') + '">' + (kap ? dil('Kapat', 'Turn off') : dil('Temizle', 'Clear')) + '</button>';
      h += '<button type="button" data-is="vazgec">' + dil('İptal', 'Cancel') + '</button></div>';
    }
    panel.innerHTML = h;
    panel.hidden = false;
    panel.setAttribute('data-tur', tur);
    rayGuncelle();
    sayfaOnizleme();
    // paneli, onu açan düğmenin hizasına koy (ekrandan taşmasın)
    var hedef = kaynak || cubuk.querySelector('[data-k="' + tur + '"]') || cubuk;
    var r = hedef.getBoundingClientRect(), kr = kok.getBoundingClientRect(), pr = panel.getBoundingClientRect();
    var ust = r.top - kr.top - 10, en = window.innerHeight - kr.top - pr.height - 12;
    panel.style.setProperty('--ust', Math.max(-kr.top + 12, Math.min(ust, en)) + 'px');
    var daha = cubuk.querySelector('[data-k="daha"]');
    if (daha) daha.setAttribute('aria-expanded', String(tur === 'daha'));
  }
  function aracDugme(is, etiket, id, kapali, sinif) {
    return '<button type="button" data-is="' + is + '"' + (sinif ? ' class="' + sinif + '"' : '') + (kapali ? ' disabled' : '') + '>' + sm(id) + '<span>' + etiket + '</span></button>';
  }
  // kaydıracın dolu kısmı (Compose kaydıracı gibi renkli ray)
  function rayGuncelle() {
    var a = panel.querySelectorAll('input[type="range"]');
    for (var i = 0; i < a.length; i++) {
      var g = a[i], y = (g.value - g.min) / (g.max - g.min) * 100;
      g.style.setProperty('--y', y.toFixed(1) + '%');
      var r = g.getAttribute('data-renk-ray');
      if (r) g.style.setProperty('--dolu', r);
    }
  }
  function sayfaOnizleme() {
    var o = panel.querySelector('[data-sayfa-onizleme]');
    if (!o) return;
    o.style.setProperty('--zemin', d.sayfa.renk);
    o.style.opacity = String(d.sayfa.opak / 100);
    o.setAttribute('data-desen', d.sayfa.desen);
  }
  function panelKapat() {
    panel.hidden = true;
    panel.innerHTML = '';
    panel.removeAttribute('data-tur');
    var daha = cubuk.querySelector('[data-k="daha"]');
    if (daha) daha.setAttribute('aria-expanded', 'false');
  }
  function panelTur() { return panel.hidden ? null : panel.getAttribute('data-tur'); }

  /* ---------------------------------------------------------- katmanlar */
  function katmanKur() {
    if (tuval) return;
    sayfa = document.createElement('div');
    sayfa.className = 'kalem-sayfa';
    sayfa.setAttribute('aria-hidden', 'true');
    sayfa.hidden = true;
    document.body.appendChild(sayfa);
    tuval = document.createElement('canvas');
    tuval.className = 'kalem-tuval';
    tuval.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tuval);
    yuzey = new M.Yuzey(tuval, { sinir: 200 });
    yuzey.degisti = function () { if (panelTur() === 'daha') panelAc('daha'); };
    boyutla();
    tuval.addEventListener('pointerdown', bas2);
    tuval.addEventListener('pointermove', surukle);
    tuval.addEventListener('pointerup', birak);
    tuval.addEventListener('pointercancel', birak);
    tuval.addEventListener('lostpointercapture', birak);
    tuval.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  function boyutla() {
    if (!tuval) return;
    var r = tuval.getBoundingClientRect();
    if (!r.width || !r.height) return;
    // büyük ekranlarda katman en çok ~6 milyon piksel (bellek: görünen tuval + önbelleği)
    var dpr = Math.min(M.dpr(), Math.sqrt(6e6 / (r.width * r.height)));
    yuzey.boyutla(r.width, r.height, 1, dpr);
  }
  var boyutKare = 0;
  window.addEventListener('resize', function () {
    if (!tuval) return;
    cancelAnimationFrame(boyutKare);
    boyutKare = requestAnimationFrame(boyutla);
  });
  function sayfaGuncelle() {
    if (!sayfa) return;
    sayfa.hidden = !d.sayfa.acik;
    sayfa.setAttribute('data-desen', d.sayfa.desen);
    var koyu = d.sayfa.renk === '#1E1E2E' || d.sayfa.renk === '#282C34';
    sayfa.classList.toggle('kalem-sayfa--koyu', koyu);
    sayfa.style.setProperty('--zemin', d.sayfa.renk);
    sayfa.style.setProperty('opacity', String(d.sayfa.opak / 100));
  }

  /* ---------------------------------------------------------- çizim */
  function nokta(e) {
    var r = d.kutu || tuval.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  function bas2(e) {
    if (!d.acik || d.el) return;
    if (e.pointerType === 'pen') {
      if (!d.kalemGoruldu) {
        d.kalemGoruldu = true;
        duyur(dil('El reddi açık: kalem algılandı, artık yalnız kalem yazar. Elini ekrana dayayabilirsin.',
        'Palm rejection is on: a stylus was detected, so only the stylus writes now. You can rest your hand on the screen.'));
      }
    } else if (e.pointerType === 'touch' && d.kalemGoruldu) {
      return;
    }
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (d.aktif !== null) return; // ikinci parmak çizmez
    e.preventDefault();
    if (panelTur()) panelKapat();
    d.aktif = e.pointerId;
    d.kutu = tuval.getBoundingClientRect();
    try { tuval.setPointerCapture(e.pointerId); } catch (_) { /* yok */ }
    var n = nokta(e);
    var silgiUcu = e.pointerType === 'pen' && (e.button === 5 || (e.buttons & 32));
    if (d.arac === 'silgi' || silgiUcu) {
      d.is = 'sil';
      d.son = n;
      yuzey.silBaslat();
      yuzey.sil(n[0], n[1], n[0], n[1], d.silgi / 2);
      halka(n);
    } else if (d.arac === 'sekil') {
      var dok = yuzey.sekilDokunus(n[0], n[1]);
      if (dok) { d.is = 'duzen'; yuzey.duzenBaslat(dok, n[0], n[1]); }
      else { d.is = 'sekil'; yuzey.birak(); yuzey.sekilBaslat(d.sekil, d.renk, Math.max(2, d.kalem), n[0], n[1]); }
    } else {
      d.is = 'ciz';
      yuzey.baslat('kalem', d.renk, d.kalem, n[0], n[1]);
    }
  }
  function surukle(e) {
    if (d.aktif !== e.pointerId) {
      if (d.acik && !d.el && d.arac === 'silgi' && e.pointerType === 'mouse') halka(nokta(e), true);
      return;
    }
    var olaylar = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
    if (!olaylar.length) olaylar = [e];
    for (var i = 0; i < olaylar.length; i++) {
      var n = nokta(olaylar[i]);
      if (d.is === 'sil') { yuzey.sil(d.son[0], d.son[1], n[0], n[1], d.silgi / 2); d.son = n; }
      else if (d.is === 'sekil') yuzey.sekilSurukle(n[0], n[1]);
      else if (d.is === 'duzen') yuzey.duzenSurukle(n[0], n[1]);
      else yuzey.surdur(n[0], n[1]);
    }
    if (d.is === 'sil') halka(nokta(e));
  }
  function birak(e) {
    if (d.aktif !== e.pointerId) return;
    d.aktif = null;
    d.kutu = null;
    if (d.is === 'sil') { yuzey.silBitir(); halka(null); }
    else if (d.is === 'sekil') yuzey.sekilBitir();
    else if (d.is === 'duzen') yuzey.duzenBitir();
    else yuzey.bitir();
    d.is = null;
  }

  // silginin dairesi
  var halkaEl = null;
  function halka(n, uzak) {
    if (!halkaEl) {
      halkaEl = document.createElement('div');
      halkaEl.className = 'kalem-silgi';
      halkaEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(halkaEl);
    }
    if (!n || !d.acik || d.el) { halkaEl.hidden = true; return; }
    halkaEl.hidden = false;
    halkaEl.style.setProperty('--x', n[0] + 'px');
    halkaEl.style.setProperty('--y', n[1] + 'px');
    halkaEl.style.setProperty('--r', d.silgi + 'px');
    halkaEl.classList.toggle('uzak', !!uzak);
  }

  /* ---------------------------------------------------------- aç / kapat */
  function ac() {
    if (d.acik) { if (d.el) elModu(false); return; }
    acan = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    katmanKur();
    d.acik = true;
    d.el = false;
    d.mini = false;
    d.gizli = false;
    cubukKur();
    kok.classList.add('kalem--acik');
    document.documentElement.classList.add('kalem-acik');
    sekme.setAttribute('aria-expanded', 'true');
    cubuk.hidden = false;
    boyutla();
    sayfaGuncelle();
    isaretle();
    duyur(dil('Kalem açık. Sayfanın istediğin yerine yaz. Kaydırmak ya da bir şeye dokunmak için El’e geç.',
      'The pen is on. Write anywhere on the page. To scroll or tap something, switch to Hand.'));
    var ilk = cubuk.querySelector('[data-k="kalem"]');
    if (ilk && document.activeElement && (document.activeElement === sekme || document.activeElement.hasAttribute('data-kalem-ac'))) ilk.focus();
  }
  function kapat() {
    if (!d.acik) return;
    d.acik = false;
    d.aktif = null;
    d.is = null;
    panelKapat();
    halka(null);
    kok.classList.remove('kalem--acik', 'kalem--el');
    document.documentElement.classList.remove('kalem-acik', 'kalem-el');
    sekme.setAttribute('aria-expanded', 'false');
    cubuk.hidden = true;
    cubuk.innerHTML = '';
    // katmanların belleğini bırak
    if (yuzey) yuzey.birakBellek();
    if (tuval) { tuval.width = 0; tuval.height = 0; tuval.remove(); tuval = null; yuzey = null; }
    if (sayfa) { sayfa.remove(); sayfa = null; }
    duyur(dil('Kalem kapandı; ekrandaki çizimler silindi.', 'The pen is off; the ink on the screen was cleared.'));
    // odağı açan düğmeye geri ver (telefonda sekme gizli: menü kapsülündeki düğme)
    var hedef = acan && acan.isConnected && acan.getClientRects().length ? acan : (sekme.getClientRects().length ? sekme : document.querySelector('.kapsul__kalem'));
    if (hedef && hedef.focus) hedef.focus();
  }
  function elModu(acik) {
    d.el = acik;
    if (acik && yuzey) yuzey.birak();
    panelKapat();
    halka(null);
    isaretle();
    duyur(acik ? dil('El: sayfayı kaydırabilir, bağlantılara dokunabilirsin. Yazı ekranda kalır.', 'Hand: you can scroll the page and tap links. Your writing stays on the screen.')
      : dil('Kalem: yeniden yazabilirsin.', 'Pen: you can write again.'));
  }
  function aracSec(k) {
    if (d.el) elModu(false);
    if (d.arac !== k && yuzey) yuzey.birak();
    // seçili araca ikinci dokunuş: ayar paneli (uygulamadaki gibi); şekillerde her dokunuş
    var ikinci = d.arac === k;
    d.arac = k;
    isaretle();
    if (k === 'sekil' || ikinci) {
      if (panelTur() === k) panelKapat(); else panelAc(k);
    } else panelKapat();
  }

  function yakala() {
    if (!yuzey || !yuzey.ops.length) return;
    var k = [Infinity, Infinity, -Infinity, -Infinity];
    for (var i = 0; i < yuzey.ops.length; i++) {
      var b = M.kutu(yuzey.ops[i].p, yuzey.ops[i].k);
      k = [Math.min(k[0], b[0]), Math.min(k[1], b[1]), Math.max(k[2], b[2]), Math.max(k[3], b[3])];
    }
    var W = yuzey.cssW, H = yuzey.cssH;
    k = [Math.max(0, k[0] - 24), Math.max(0, k[1] - 24), Math.min(W, k[2] + 24), Math.min(H, k[3] + 24)];
    var olcek = 2, w = Math.max(1, Math.round((k[2] - k[0]) * olcek)), h = Math.max(1, Math.round((k[3] - k[1]) * olcek));
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var x = c.getContext('2d');
    // uygulamadaki gibi "Sadece yazı": düz beyaz zemin
    x.fillStyle = '#FFFFFF';
    x.fillRect(0, 0, w, h);
    x.setTransform(olcek, 0, 0, olcek, -k[0] * olcek, -k[1] * olcek);
    M.opsCiz(x, yuzey.ops, olcek);
    M.tuvalBlob(c, 'image/png').then(function (blob) {
      if (OSN.kutuphane) OSN.kutuphane.ekle({ tur: 'yazi', blob: blob, en: w, boy: h });
      duyur(dil('Kütüphanende, güvende. Deneme bölümündeki kütüphanede duruyor.', 'In your library, safe and sound. It’s in the library of the Try it section.'),
        '#kutuphane', dil('Kütüphaneye git', 'Go to library'));
    }).catch(function () { duyur(dil('Kaydedilemedi, bir daha dene.', 'Couldn’t save it. Try again.')); });
  }

  /* ---------------------------------------------------------- olaylar */
  function cubukTik(e) {
    var b = e.target.closest('button');
    if (!b || !cubuk.contains(b) || b.disabled) return;
    var renk = b.getAttribute('data-renk');
    if (renk) {
      // uygulamadaki kural: renge dokunmak kaleme döndürür ve El modundan çıkarır
      d.renk = renk;
      d.arac = 'kalem';
      d.el = false;
      if (yuzey) yuzey.birak();
      panelKapat();
      isaretle();
      return;
    }
    switch (b.getAttribute('data-k')) {
      case 'el': elModu(!d.el); break;
      case 'kalem': aracSec('kalem'); break;
      case 'silgi': aracSec('silgi'); break;
      case 'sekil': aracSec('sekil'); break;
      case 'sayfa': if (panelTur() === 'sayfa') panelKapat(); else panelAc('sayfa'); break;
      case 'daha': if (panelTur() === 'daha') panelKapat(); else panelAc('daha'); break;
      case 'kapat':
        if (yuzey && yuzey.ops.length) panelAc('kapat', b); else kapat();
        break;
      case 'kucult': d.mini = true; panelKapat(); cubukKur(); focusK('genislet'); break;
      case 'genislet': d.mini = false; cubukKur(); focusK('kucult'); break;
    }
  }
  function focusK(k) { var b = cubuk.querySelector('[data-k="' + k + '"]'); if (b) b.focus(); }

  function panelTik(e) {
    var b = e.target.closest('button');
    if (!b || !panel.contains(b) || b.disabled) return;
    var s = b.getAttribute('data-sekil');
    if (s) {
      d.sekil = s;
      d.arac = 'sekil';
      if (yuzey) yuzey.birak();
      var t = panel.querySelectorAll('[data-sekil]');
      for (var i = 0; i < t.length; i++) t[i].setAttribute('aria-pressed', String(t[i] === b));
      var on = panel.querySelector('.op__onizleme-sekil');
      if (on) on.innerHTML = GLIF[s];
      isaretle();
      return;
    }
    var kg = b.getAttribute('data-kagit');
    if (kg) {
      d.sayfa.renk = kg;
      var u = panel.querySelectorAll('[data-kagit]');
      for (var j = 0; j < u.length; j++) u[j].setAttribute('aria-pressed', String(u[j] === b));
      sayfaGuncelle();
      sayfaOnizleme();
      return;
    }
    var ds = b.getAttribute('data-desen');
    if (ds) {
      d.sayfa.desen = ds;
      var w = panel.querySelectorAll('[data-desen]');
      for (var k = 0; k < w.length; k++) w[k].setAttribute('aria-pressed', String(w[k] === b));
      sayfaGuncelle();
      sayfaOnizleme();
      return;
    }
    switch (b.getAttribute('data-is')) {
      case 'geri': if (yuzey) yuzey.geriAl(); break;
      case 'ileri': if (yuzey) yuzey.yinele(); break;
      case 'gizle':
        d.gizli = !d.gizli;
        if (yuzey) { yuzey.gizli = d.gizli; yuzey.ciz(); }
        panelAc('daha');
        duyur(d.gizli ? dil('Çizim gizlendi; silinmedi.', 'Drawing hidden, not deleted.') : dil('Çizim yeniden görünüyor.', 'Drawing visible again.'));
        break;
      case 'temizle': panelAc('temizle', cubuk.querySelector('[data-k="daha"]')); break;
      case 'temizle-evet': if (yuzey) yuzey.temizle(); panelKapat(); break;
      case 'yakala': panelAc('yakala', cubuk.querySelector('[data-k="daha"]')); break;
      case 'yakala-yazi': panelKapat(); yakala(); break;
      case 'kapat-evet': kapat(); break;
      case 'vazgec': panelKapat(); break;
    }
  }
  function panelGirdi(e) {
    var a = e.target.getAttribute && e.target.getAttribute('data-aralik');
    if (a) {
      var v = +e.target.value, o = panel.querySelector('[data-cikti="' + a + '"]');
      if (o) o.textContent = e.target.getAttribute('data-birim') === '%' ? v + '%' : v + ' px';
      if (a === 'boy-kalem') {
        d.kalem = v;
        var cz = panel.querySelector('[data-onizleme-cizgi]');
        if (cz) cz.setAttribute('stroke-width', String(Math.max(2, Math.min(12, v))));
      } else if (a === 'boy-silgi') d.silgi = v;
      else if (a === 'opak') { d.sayfa.opak = v; sayfaGuncelle(); sayfaOnizleme(); }
      rayGuncelle();
      return;
    }
    if (e.target.hasAttribute && e.target.hasAttribute('data-sayfa-ac')) {
      d.sayfa.acik = e.target.checked;
      sayfaGuncelle();
      isaretle();
    }
  }

  function duyur(metin, bag, bagMetni) { if (OSN.duyur) OSN.duyur(metin, bag, bagMetni); }

  function init() {
    sekme.addEventListener('click', function () { if (d.acik) { if (yuzey && yuzey.ops.length) panelAc('kapat', sekme); else kapat(); } else ac(); });
    cubuk.addEventListener('click', cubukTik);
    panel.addEventListener('click', panelTik);
    panel.addEventListener('input', panelGirdi);
    panel.addEventListener('change', panelGirdi);
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !d.acik) return;
      if (panelTur()) { panelKapat(); return; }
      if (!d.el) elModu(true);
    });
    // panel dışına dokununca paneli kapat
    document.addEventListener('pointerdown', function (e) {
      if (!panelTur()) return;
      if (panel.contains(e.target) || cubuk.contains(e.target) || sekme.contains(e.target)) return;
      if (tuval && e.target === tuval) return; // tuvalde bas2() kapatıyor
      panelKapat();
    }, true);
    var acanlar = document.querySelectorAll('[data-kalem-ac]');
    for (var i = 0; i < acanlar.length; i++) acanlar[i].addEventListener('click', function (e) { e.preventDefault(); ac(); });
    OSN.kalem = { ac: ac, kapat: kapat, d: d, yuzey: function () { return yuzey; } };
  }
  init();
})();
