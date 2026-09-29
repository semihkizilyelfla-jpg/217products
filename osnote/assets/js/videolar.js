/* ============================================================
   OSNote tanıtım sitesi · cihazlardaki videolar
   ------------------------------------------------------------
   Videoların kareleri tuvalde çizilir; hepsi bu site için
   hazırlandı (gerçek bir kanalın ya da maçın kopyası değil).
   - Ders videosu: eğik atış, koyu zeminli bir anlatım animasyonu.
     Top yörüngede ilerler, hız bileşenleri değişir; altyazı ve
     oynatıcının ilerleme çubuğu karenin içinde.
   - Taktik analiz: yukarıdan saha, iki takım, bir atak.
   Kare çizimi zamana bağlı ve durumsuz: ciz(t) aynı t için hep
   aynı kareyi verir.
   ============================================================ */
(function () {
  'use strict';
  var OSN = window.OSN || (window.OSN = {});
  var dil = OSN.dil || function (tr) { return tr; };
  var M = OSN.m;
  if (!M) return;

  function tuvalHazirla(tuval, W, H) {
    var r = tuval.getBoundingClientRect();
    if (!r.width) return null;
    var d = M.dpr(), w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
    if (tuval.width !== w) tuval.width = w;
    if (tuval.height !== h) tuval.height = h;
    var c = tuval.getContext('2d');
    c.setTransform(w / W, 0, 0, h / H, 0, 0);
    return c;
  }
  // "v_y = 0": _ alt simge, ^ üst simge (tek karakter); italik: değişkenler eğik
  function formul(c, metin, x, y, boy, renk, hiza, italik) {
    var par = [], i = 0;
    while (i < metin.length) {
      var ch = metin[i];
      if ((ch === '_' || ch === '^') && i + 1 < metin.length) { par.push([metin[i + 1], ch]); i += 2; }
      else { var j = i; while (j < metin.length && metin[j] !== '_' && metin[j] !== '^') j++; par.push([metin.slice(i, j), '']); i = j; }
    }
    var kucuk = Math.round(boy * 0.7 * 10) / 10;
    function yaz(ciz) {
      var cx = x;
      for (var k = 0; k < par.length; k++) {
        var t = par[k][1];
        c.font = (italik ? 'italic ' : '') + (t ? kucuk : boy) + 'px Roboto, system-ui, sans-serif';
        var w = c.measureText(par[k][0]).width;
        if (ciz) c.fillText(par[k][0], cx, y + (t === '_' ? boy * 0.3 : t === '^' ? -boy * 0.38 : 0));
        cx += w + (t ? 0.6 : 0);
      }
      return cx - x;
    }
    c.fillStyle = renk;
    c.textAlign = 'left';
    var en = yaz(false);
    if (hiza === 'sag') x -= en;
    else if (hiza === 'orta') x -= en / 2;
    yaz(true);
    return en;
  }
  function kutuYol(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function ok(c, ax, ay, bx, by, renk, kal, uc) {
    var a = Math.atan2(by - ay, bx - ax), u = uc || 7.5, L = Math.hypot(bx - ax, by - ay);
    if (L < 1) return;
    c.strokeStyle = renk; c.fillStyle = renk; c.lineWidth = kal || 2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx - Math.cos(a) * u * 0.7, by - Math.sin(a) * u * 0.7); c.stroke();
    c.beginPath(); c.moveTo(bx, by);
    c.lineTo(bx - u * Math.cos(a - 0.4), by - u * Math.sin(a - 0.4));
    c.lineTo(bx - u * Math.cos(a + 0.4), by - u * Math.sin(a + 0.4));
    c.closePath(); c.fill();
  }

  /* ========================================================== DERS VİDEOSU
     Eğik atış: v0 = 50 m/s, 53° (sin 0,8 / cos 0,6) → vx 30, vy 40, g 10. Tepe t = 4 sn, 120 m, 80 m.
     Kare 494×278 (16:9); telefonda aynı kare küçülür. */
  var DERS = { W: 494, H: 278, x0: 52, yer: 222, o: 1.6, vx: 30, vy: 40, g: 10, tepeT: 4, sure: 1865, bas: 764 };
  var MAVI = '#58C4DD', YESIL = '#83C167', KIRMIZI = '#FC6255', CAMGOBEGI = '#5CD0B3';
  function dersKonum(t) { return [DERS.x0 + DERS.vx * t * DERS.o, DERS.yer - (DERS.vy * t - DERS.g / 2 * t * t) * DERS.o]; }
  var DERS_TEPE = dersKonum(DERS.tepeT); // [244, 94]
  function sure(sn) { var d = Math.floor(sn / 60), s = Math.floor(sn % 60); return d + ':' + (s < 10 ? '0' : '') + s; }

  // t: fizik zamanı (sn), dur: duraklatmadan beri geçen evre (0..1; yoksa -1),
  // kontrol: oynatıcının denetimlerinin görünürlüğü (0..1; dokununca görünür, sonra kaybolur)
  function dersCiz(tuval, t, dur, kontrol) {
    var W = DERS.W, H = DERS.H, c = tuvalHazirla(tuval, W, H);
    if (!c) return false;
    c.fillStyle = '#0C1218';
    c.fillRect(0, 0, W, H);
    var v = c.createRadialGradient(W * 0.5, H * 0.46, 60, W * 0.5, H * 0.5, W * 0.62);
    v.addColorStop(0, 'rgba(22,34,44,0.55)');
    v.addColorStop(1, 'rgba(0,0,0,0.4)');
    c.fillStyle = v;
    c.fillRect(0, 0, W, H);
    var x0 = DERS.x0, yer = DERS.yer, o = DERS.o, xs = x0 + 240 * o;
    // koordinat ızgarası (20 m)
    c.lineWidth = 1;
    c.strokeStyle = 'rgba(88,196,221,0.08)';
    c.beginPath();
    for (var X = 20; X <= 260; X += 20) { c.moveTo(x0 + X * o + 0.5, 34); c.lineTo(x0 + X * o + 0.5, yer); }
    for (var Y = 20; Y <= 110; Y += 20) { c.moveTo(x0 - 30, yer - Y * o + 0.5); c.lineTo(W - 12, yer - Y * o + 0.5); }
    c.stroke();
    // eksenler
    c.strokeStyle = 'rgba(236,240,243,0.55)';
    c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(20, yer + 0.5); c.lineTo(W - 12, yer + 0.5); c.stroke();
    c.strokeStyle = 'rgba(236,240,243,0.22)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(x0 + 0.5, yer); c.lineTo(x0 + 0.5, 30); c.stroke();
    c.fillStyle = 'rgba(236,240,243,0.4)';
    [60, 120, 180, 240].forEach(function (m) { c.fillRect(x0 + m * o, yer, 1, 4); });
    // yörüngenin tamamı: silik noktalar
    c.fillStyle = 'rgba(236,240,243,0.2)';
    for (var q = 0; q <= 8.001; q += 0.16) { var z = dersKonum(q); c.beginPath(); c.arc(z[0], z[1], 0.9, 0, 6.2832); c.fill(); }
    // atış açısı ve ilk hız
    c.strokeStyle = 'rgba(236,240,243,0.6)';
    c.lineWidth = 1.2;
    c.beginPath(); c.arc(x0, yer, 22, -0.9273, 0); c.stroke();
    formul(c, '53°', x0 + 27, yer - 7, 10, 'rgba(236,240,243,0.8)');
    ok(c, x0, yer, x0 + 26, yer - 34.7, 'rgba(236,240,243,0.75)', 1.5, 6.5);
    formul(c, 'v_0', x0 + 8, yer - 40, 11.5, 'rgba(236,240,243,0.85)', 'sol', true);
    // topun izi
    var tt = M.sinirla(t, 0, 8);
    c.strokeStyle = CAMGOBEGI;
    c.lineWidth = 2.2;
    c.lineCap = 'round';
    c.beginPath();
    for (var s = 0; s <= 60; s++) { var k = dersKonum(tt * s / 60); if (s) c.lineTo(k[0], k[1]); else c.moveTo(k[0], k[1]); }
    c.stroke();
    // tepe: yükseklik
    var p = dersKonum(tt), tepede = Math.abs(tt - DERS.tepeT) < 0.08;
    if (tt >= DERS.tepeT - 0.08) {
      c.save();
      c.setLineDash([4, 4]);
      c.strokeStyle = 'rgba(236,240,243,0.42)';
      c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(DERS_TEPE[0] + 0.5, DERS_TEPE[1] + 9); c.lineTo(DERS_TEPE[0] + 0.5, yer); c.stroke();
      c.restore();
      formul(c, 'h', DERS_TEPE[0] + 8, (DERS_TEPE[1] + yer) / 2 + 12, 13, 'rgba(236,240,243,0.9)', 'sol', true);
    }
    // hız bileşenleri
    var vy = DERS.vy - DERS.g * tt, ov = 1.45;
    ok(c, p[0], p[1], p[0] + DERS.vx * ov, p[1], KIRMIZI, 2.2);
    formul(c, 'v_x', p[0] + DERS.vx * ov + 5, p[1] + 4, 11.5, KIRMIZI, 'sol', true);
    if (Math.abs(vy) > 1) {
      ok(c, p[0], p[1], p[0], p[1] - vy * ov, YESIL, 2.2);
      formul(c, 'v_y', p[0] - 7, p[1] - vy * ov + (vy > 0 ? -2 : 12), 11.5, YESIL, 'sag', true);
    } else {
      // öğrencinin halkası tepeyi saracak: yazı halkanın üstünde kalsın
      formul(c, 'v_y = 0', p[0], p[1] - 31, 12, YESIL, 'orta', true);
    }
    // top
    c.fillStyle = 'rgba(255,255,255,0.14)';
    c.beginPath(); c.arc(p[0], p[1], 9, 0, 6.2832); c.fill();
    c.fillStyle = '#FFFFFF';
    c.beginPath(); c.arc(p[0], p[1], 5, 0, 6.2832); c.fill();
    // üstte denklem
    // üstte denklem: değişkenler eğik, v_y yeşil
    var gx = 18, gy = 32, beyaz = 'rgba(236,240,243,0.94)';
    [['v_y', YESIL, true], [' = ', beyaz, false], ['v_0', beyaz, true], [' · sin 53° − ', beyaz, false], ['g', beyaz, true], [' · ', beyaz, false], ['t', beyaz, true]].forEach(function (p) {
      gx += formul(c, p[0], gx, gy, 14.5, p[1], 'sol', p[2]);
    });
    // altyazı
    var alt = tepede || tt > DERS.tepeT ? dil('Tepe noktasında dikey hız sıfırdır.', 'At the top, the vertical velocity is zero.')
      : dil('Top yükseldikçe dikey hızı azalır.', 'As the ball rises, its vertical velocity drops.');
    c.font = '11.5px Roboto, system-ui, sans-serif';
    var aw = c.measureText(alt).width + 14;
    c.fillStyle = 'rgba(8,8,8,0.74)';
    kutuYol(c, W / 2 - aw / 2, H - 45, aw, 19, 2);
    c.fill();
    c.fillStyle = '#FFFFFF';
    c.textAlign = 'center';
    c.fillText(alt, W / 2, H - 31.5);
    // oynatıcı: süre ve ilerleme (bölüm araları boşluklu)
    var an = DERS.bas + tt, oran = an / DERS.sure, by = H - 3;
    c.textAlign = 'left';
    c.font = '500 10.5px Roboto, system-ui, sans-serif';
    c.fillStyle = 'rgba(255,255,255,0.92)';
    c.fillText(sure(an) + ' / ' + sure(DERS.sure), 10, H - 12);
    var bolum = [0, 320 / 1865, 730 / 1865, 1185 / 1865, 1];
    for (var b = 0; b < 4; b++) {
      var a0 = bolum[b] * W + (b ? 1.5 : 0), a1 = bolum[b + 1] * W - (b < 3 ? 1.5 : 0);
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.fillRect(a0, by, a1 - a0, 3);
      if (oran > bolum[b]) { c.fillStyle = '#FFFFFF'; c.fillRect(a0, by, Math.min(a1, oran * W) - a0, 3); }
    }
    // denetimler: karartma; ortada oynat (video durdu), yanlarda önceki/sonraki; altta kalın, bölümlü
    // ilerleme çubuğu ve tutamacı. Dokunuşla gelir, bir süre sonra kaybolur (mobil oynatıcılardaki gibi)
    var den = kontrol > 0 ? Math.min(1, kontrol) : 0;
    if (den > 0) {
      c.globalAlpha = den;
      c.fillStyle = 'rgba(0,0,0,0.44)';
      c.fillRect(0, 0, W, H);
      var ox = W / 2, oy = H / 2 - 12, pop = dur >= 0 && dur < 1 ? 1 + 0.07 * Math.sin(Math.PI * Math.min(1, dur * 2.4)) : 1;
      c.fillStyle = 'rgba(0,0,0,0.36)';
      c.beginPath(); c.arc(ox, oy, 26 * pop, 0, 6.2832); c.fill();
      c.fillStyle = '#FFFFFF';
      c.beginPath(); c.moveTo(ox - 7 * pop, oy - 11 * pop); c.lineTo(ox + 12 * pop, oy); c.lineTo(ox - 7 * pop, oy + 11 * pop); c.closePath(); c.fill();
      [-1, 1].forEach(function (y) {
        var x = ox + y * 92;
        c.beginPath(); c.moveTo(x - y * 6, oy - 8); c.lineTo(x + y * 6, oy); c.lineTo(x - y * 6, oy + 8); c.closePath(); c.fill();
        c.fillRect(x + y * 6 - (y > 0 ? 0 : 2.4), oy - 8, 2.4, 16);
      });
      for (var b2 = 0; b2 < 4; b2++) {
        var k0 = bolum[b2] * W + (b2 ? 1.5 : 0), k1 = bolum[b2 + 1] * W - (b2 < 3 ? 1.5 : 0);
        c.fillStyle = 'rgba(255,255,255,0.32)';
        c.fillRect(k0, by - 1.5, k1 - k0, 4.5);
        if (oran > bolum[b2]) { c.fillStyle = '#FFFFFF'; c.fillRect(k0, by - 1.5, Math.min(k1, oran * W) - k0, 4.5); }
      }
      c.beginPath(); c.arc(oran * W, by + 0.75, 6.5, 0, 6.2832); c.fill();
      c.globalAlpha = 1;
    }
    return true;
  }
  // tepe noktasının cihaz ekranındaki yeri (kutu: tuvalin ekrandaki kutusu, tasarım pikseliyle)
  function dersTepe(kutu) {
    return kutu ? { x: kutu.x + DERS_TEPE[0] * kutu.w / DERS.W, y: kutu.y + DERS_TEPE[1] * kutu.h / DERS.H, sx: kutu.w / DERS.W, sy: kutu.h / DERS.H } : null;
  }

  /* ========================================================== TAKTİK ANALİZ
     Yukarıdan saha (105×68 m); kırmızılar sağdaki kaleye hücum eder. 10 numara topla; 9 iki stoperin
     arasına koşar, 10 ara pası atar, 9 kontrol edip vurur: gol. Video 4 sn, kare 1000×625.
     Oyuncuların yolu anahtar karelerden (Catmull-Rom), topun yolu parça parça (pasta yavaşlar). */
  var TK = { W: 1000, H: 625, x0: 56, y0: 34, o: 8.46, sure: 4 };
  function tX(m) { return TK.x0 + m * TK.o; }
  function tY(m) { return TK.y0 + m * TK.o; }
  // saha noktasının karedeki yeri. Dikey kare (625×1000, telefonda dikey tablet): yatay kare saat yönünde
  // 90° döner; atak aşağı doğru, kale altta
  function yer(x, y, dikey) { return dikey ? [TK.H - tY(y), tX(x)] : [tX(x), tY(y)]; }
  // [numara, takım (k kırmızı, b beyaz), kaleci mi, anahtar kareler [[sn, x, y], ...]]
  var OYUNCU = [
    [1, 'k', 1, [[0, 10, 34], [4, 13, 34]]],
    [2, 'k', 0, [[0, 52, 60], [4, 58, 58]]],
    [3, 'k', 0, [[0, 50, 17], [4, 55, 18.5]]],
    [4, 'k', 0, [[0, 40, 43], [4, 45, 42]]],
    [5, 'k', 0, [[0, 40, 25], [4, 45, 26]]],
    [6, 'k', 0, [[0, 60, 35], [4, 66, 33]]],
    [8, 'k', 0, [[0, 68, 46], [1.5, 74, 44], [4, 80, 42]]],
    [10, 'k', 0, [[0, 70, 25], [0.45, 72, 26], [1.6, 75, 28], [4, 79, 29]]],
    [7, 'k', 0, [[0, 84, 58], [1.5, 90, 54], [4, 95, 50]]],
    [9, 'k', 0, [[0, 84, 37], [0.5, 86, 36.5], [1.35, 96.5, 32.8], [1.6, 97.6, 32.6], [4, 99.5, 32.4]]],
    [11, 'k', 0, [[0, 83, 11], [1.5, 88.5, 11.5], [4, 92, 11]]],
    [1, 'b', 1, [[0, 101, 34], [1.6, 101.5, 33.2], [1.9, 102.7, 30.8], [4, 102.5, 30.4]]],
    [2, 'b', 0, [[0, 89, 14], [4, 90, 17.5]]],
    [4, 'b', 0, [[0, 89, 28], [0.5, 89.5, 28.5], [1.35, 94, 30], [2, 96, 30.5], [4, 97, 30.5]]],
    [5, 'b', 0, [[0, 89, 41], [0.5, 89.5, 40], [1.35, 94.5, 36], [2, 96.5, 35], [4, 97.5, 34.5]]],
    [3, 'b', 0, [[0, 88, 55], [4, 91, 53]]],
    [7, 'b', 0, [[0, 77, 15], [4, 81, 17]]],
    [6, 'b', 0, [[0, 76, 29], [0.45, 75, 28], [4, 76.5, 25]]],
    [8, 'b', 0, [[0, 76, 41], [4, 81.5, 37]]],
    [11, 'b', 0, [[0, 77, 54], [4, 81, 52]]],
    [9, 'b', 0, [[0, 62, 29], [4, 64, 29]]],
    [10, 'b', 0, [[0, 63, 43], [4, 65, 42]]]
  ];
  // top: [sn, x, y, bir sonraki parçanın türü]
  var TOP = [[0, 70.9, 25.8, 'ayak'], [0.45, 72.9, 26.6, 'pas'], [1.35, 96.9, 32.9, 'ayak'], [1.6, 98.3, 32.7, 'sut'], [1.92, 105.7, 30.4, 'ag'], [4, 106.3, 30.2, '']];
  function izde(k, t) {
    var n = k.length;
    if (t <= k[0][0]) return [k[0][1], k[0][2]];
    if (t >= k[n - 1][0]) return [k[n - 1][1], k[n - 1][2]];
    var i = 0;
    while (i < n - 2 && t > k[i + 1][0]) i++;
    var a = k[Math.max(0, i - 1)], b = k[i], c = k[i + 1], d = k[Math.min(n - 1, i + 2)];
    var q = (t - b[0]) / (c[0] - b[0]), q2 = q * q, q3 = q2 * q;
    function cr(p0, p1, p2, p3) { return 0.5 * (2 * p1 + (-p0 + p2) * q + (2 * p0 - 5 * p1 + 4 * p2 - p3) * q2 + (-p0 + 3 * p1 - 3 * p2 + p3) * q3); }
    return [cr(a[1], b[1], c[1], d[1]), cr(a[2], b[2], c[2], d[2])];
  }
  function topYer(t) {
    for (var i = 0; i < TOP.length - 1; i++) {
      var a = TOP[i], b = TOP[i + 1];
      if (t > b[0]) continue;
      var q = Math.max(0, (t - a[0]) / (b[0] - a[0]));
      if (a[3] === 'pas') q = 1 - Math.pow(1 - q, 1.7);        // yerde giden pas yavaşlayarak varır
      else if (a[3] === 'sut') q = 1 - Math.pow(1 - q, 1.25);
      else if (a[3] === 'ag') q = 1 - Math.pow(1 - q, 4);       // file topu durdurur
      return [a[1] + (b[1] - a[1]) * q, a[2] + (b[2] - a[2]) * q];
    }
    var s = TOP[TOP.length - 1];
    return [s[1], s[2]];
  }
  var saha = null, sahaD = null;
  function sahaCiz(w, h) {
    var k = document.createElement('canvas');
    k.width = w; k.height = h;
    var c = k.getContext('2d'), o = TK.o;
    c.setTransform(w / TK.W, 0, 0, h / TK.H, 0, 0);
    c.fillStyle = '#22612A';
    c.fillRect(0, 0, TK.W, TK.H);
    // biçme şeritleri (7,5 m)
    for (var i = -2; i < 16; i++) { c.fillStyle = i % 2 ? '#2A7131' : '#2E7A35'; c.fillRect(tX(i * 7.5), 0, 7.5 * o + 0.6, TK.H); }
    // yayın kamerasının ışığı: kenarlar biraz koyu
    var v = c.createRadialGradient(TK.W / 2, TK.H * 0.45, TK.H * 0.3, TK.W / 2, TK.H / 2, TK.W * 0.66);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,12,4,0.32)');
    c.fillStyle = v;
    c.fillRect(0, 0, TK.W, TK.H);
    c.strokeStyle = 'rgba(255,255,255,0.84)';
    c.fillStyle = 'rgba(255,255,255,0.84)';
    c.lineWidth = 2.2;
    function nokta(x, y) { c.beginPath(); c.arc(tX(x), tY(y), 2.6, 0, 6.2832); c.fill(); }
    function kutu(x, y, w2, h2) { c.strokeRect(tX(x), tY(y), w2 * o, h2 * o); }
    kutu(0, 0, 105, 68);
    c.beginPath(); c.moveTo(tX(52.5), tY(0)); c.lineTo(tX(52.5), tY(68)); c.stroke();
    c.beginPath(); c.arc(tX(52.5), tY(34), 9.15 * o, 0, 6.2832); c.stroke();
    nokta(52.5, 34);
    kutu(0, 34 - 20.16, 16.5, 40.32); kutu(105 - 16.5, 34 - 20.16, 16.5, 40.32);
    kutu(0, 34 - 9.16, 5.5, 18.32); kutu(105 - 5.5, 34 - 9.16, 5.5, 18.32);
    nokta(11, 34); nokta(94, 34);
    c.beginPath(); c.arc(tX(11), tY(34), 9.15 * o, -0.9273, 0.9273); c.stroke();
    c.beginPath(); c.arc(tX(94), tY(34), 9.15 * o, Math.PI - 0.9273, Math.PI + 0.9273); c.stroke();
    [[0, 0, 0], [105, 0, 1], [105, 68, 2], [0, 68, 3]].forEach(function (k2) {
      c.beginPath(); c.arc(tX(k2[0]), tY(k2[1]), 1.2 * o, k2[2] * 1.5708, k2[2] * 1.5708 + 1.5708); c.stroke();
    });
    // kaleler: file ve direkler
    [-2, 105].forEach(function (x) {
      c.fillStyle = 'rgba(255,255,255,0.14)';
      c.fillRect(tX(x), tY(34 - 3.66), 2 * o, 7.32 * o);
      c.save();
      c.beginPath(); c.rect(tX(x), tY(34 - 3.66), 2 * o, 7.32 * o); c.clip();
      c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = 0.8;
      for (var a = 0; a < 20; a++) { c.beginPath(); c.moveTo(tX(x) + a * 4 - 30, tY(34 - 3.66)); c.lineTo(tX(x) + a * 4 - 30 + 70, tY(34 + 3.66)); c.stroke(); }
      c.restore();
      c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 2.2;
      c.strokeRect(tX(x), tY(34 - 3.66), 2 * o, 7.32 * o);
    });
    return k;
  }
  function etiket(c, metin, x, y) {
    c.font = '500 15px Roboto, system-ui, sans-serif';
    var w = c.measureText(metin).width + 22;
    c.fillStyle = 'rgba(20,24,28,0.82)';
    kutuYol(c, x - w / 2, y - 16, w, 30, 15);
    c.fill();
    c.fillStyle = '#fff';
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    c.fillText(metin, x, y + 4.5);
  }
  // v: videonun ilerlemesi (0..1); boyut: [en, boy] verilirse tuvalin bit eşlemi o ölçüde (CSS kırpar).
  // Tuval dikeyse (boyu eninden büyük) saha dikey çizilir; oyuncuların numaraları dik kalır.
  function taktikCiz(tuval, v, boyut) {
    var w, h;
    if (boyut) { w = boyut[0]; h = boyut[1]; }
    else {
      var r = tuval.getBoundingClientRect();
      if (!r.width) return false;
      var d = M.dpr();
      w = Math.round(r.width * d); h = Math.round(r.height * d);
    }
    if (tuval.width !== w) tuval.width = w;
    if (tuval.height !== h) tuval.height = h;
    var dikey = h > w, c = tuval.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (dikey) {
      // yatay sahayı (h × w) bir kez çizip saat yönünde döndürerek koy
      if (!sahaD || sahaD.width !== h || sahaD.height !== w) sahaD = sahaCiz(h, w);
      c.save(); c.translate(w, 0); c.rotate(Math.PI / 2); c.drawImage(sahaD, 0, 0); c.restore();
      c.setTransform(w / TK.H, 0, 0, h / TK.W, 0, 0);
    } else {
      var arka = boyut ? sahaCiz(w, h) : (!saha || saha.width !== w || saha.height !== h) ? (saha = sahaCiz(w, h)) : saha;
      c.drawImage(arka, 0, 0);
      c.setTransform(w / TK.W, 0, 0, h / TK.H, 0, 0);
    }
    var t = M.sinirla(v, 0, 1) * TK.sure, top = topYer(t);
    // videonun kendi pas ve şut çizgileri: beyaz, kesikli; sonda kalır (tahminle karşılaştırılsın)
    function iz(a, b, s0, s1) {
      if (t <= s0) return;
      var son = t < s1 ? top : [b[1], b[2]], p0 = yer(a[1], a[2], dikey), p1 = yer(son[0], son[1], dikey);
      c.save();
      c.globalAlpha = 0.72;
      c.setLineDash([7, 6]);
      c.strokeStyle = '#FFFFFF';
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
      c.restore();
    }
    iz(TOP[1], TOP[2], 0.45, 1.35);
    iz(TOP[3], TOP[4], 1.6, 1.92);
    var liste = OYUNCU.map(function (p) { var z = izde(p[3], t); return [p, yer(z[0], z[1], dikey)]; });
    liste.sort(function (a, b) { return a[1][1] - b[1][1]; });
    // topu kimin ayağında: 10 (başta), 9 (kontrolde)
    var sahip = t < 0.45 ? 10 : t >= 1.35 && t < 1.6 ? 9 : 0;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = '500 10.5px Roboto, system-ui, sans-serif';
    liste.forEach(function (x) {
      var p = x[0], X = x[1][0], Y = x[1][1], kirmizi = p[1] === 'k';
      if (kirmizi && p[0] === sahip) {
        c.strokeStyle = 'rgba(255,255,255,0.9)';
        c.lineWidth = 1.6;
        c.beginPath(); c.arc(X, Y, 16, 0, 6.2832); c.stroke();
      }
      c.fillStyle = 'rgba(0,0,0,0.26)';
      c.beginPath(); c.arc(X + 1.6, Y + 2.6, 10, 0, 6.2832); c.fill();
      c.fillStyle = p[2] ? (kirmizi ? '#3FA56B' : '#F2C230') : (kirmizi ? '#D6453B' : '#F3F4F6');
      c.beginPath(); c.arc(X, Y, 10, 0, 6.2832); c.fill();
      c.lineWidth = 1.5;
      c.strokeStyle = kirmizi && !p[2] ? 'rgba(255,255,255,0.9)' : 'rgba(30,34,40,0.8)';
      c.stroke();
      c.fillStyle = kirmizi && !p[2] ? '#FFFFFF' : '#1F2328';
      c.fillText(String(p[0]), X, Y + 0.6);
    });
    // top
    var tp = yer(top[0], top[1], dikey), bx = tp[0], by = tp[1];
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath(); c.arc(bx + 1.2, by + 2, 4.4, 0, 6.2832); c.fill();
    c.fillStyle = '#FFFFFF';
    c.beginPath(); c.arc(bx, by, 4.4, 0, 6.2832); c.fill();
    c.lineWidth = 1.1;
    c.strokeStyle = '#1F2328';
    c.stroke();
    if (t >= 2.05) { var ge = yer(96, dikey ? 27 : 19, dikey); etiket(c, dil('Gol', 'Goal'), ge[0], ge[1]); }
    return true;
  }
  // bir saha noktasının kare içindeki yeri (tasarım pikseli; dikey: dikey kare)
  function taktikYer(x, y, dikey) { return yer(x, y, dikey); }
  function taktikOyuncu(no, takim, t, dikey) {
    for (var i = 0; i < OYUNCU.length; i++) if (OYUNCU[i][0] === no && OYUNCU[i][1] === takim) { var z = izde(OYUNCU[i][3], t); return yer(z[0], z[1], dikey); }
    return null;
  }

  OSN.videolar = {
    dersCiz: dersCiz, dersTepe: dersTepe, DERS: DERS, formul: formul, kutuYol: kutuYol, ok: ok, tuvalHazirla: tuvalHazirla, sure: sure,
    taktikCiz: taktikCiz, taktikYer: taktikYer, taktikOyuncu: taktikOyuncu, TK: TK
  };
})();
