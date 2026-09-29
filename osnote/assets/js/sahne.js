/* ============================================================
   OSNote tanıtım sitesi · sahne motoru
   ------------------------------------------------------------
   Cihaz sahnelerinin ortak parçaları:
   - Cihaz: ekranın içi tasarım pikseliyle (telefon 360×780,
     tablet 1000×625), mürekkep tuvali, OSNote çubuğu.
   - Kalem ucu (stylus): SVG gövde + eğik gölge. Uç yere değince
     gölge ucun altında birleşir, kalkınca açılır.
   - Mürekkep öğesi: her çizgi kendi hız profiliyle yazılır
     (düz yerde hızlı, kıvrımda yavaş; baş ve sonda ivme).
   - Plan: dokun / çiz / bekle adımlarını kalemin gerçekten
     yetişebileceği sürelerle sıraya dizer.
   - Senaryo: zamana bağlı, durumsuz. ciz(t) her şeyi t anına
     göre baştan kurar; kaydırmayla da sürülebilir.
   Modül değil düz betik: sayfa dosyadan da açılsın.
   ============================================================ */
(function () {
  'use strict';
  var OSN = window.OSN || (window.OSN = {});
  var dil = OSN.dil || function (tr) { return tr; };
  var M = OSN.m;
  if (!M) return;
  var VERI = OSN.elYazisi || {};
  var RENK = ['#1A1A1A', '#D32F2F', '#1565C0', '#2E7D32', '#C2185B', '#FBC02D'];
  var RENK_AD = OSN.en ? ['Black', 'Red', 'Blue', 'Green', 'Pink', 'Yellow'] : ['Siyah', 'Kırmızı', 'Mavi', 'Yeşil', 'Pembe', 'Sarı'];
  var ILK_RENK = '#FFC107'; // kalemin ilk rengi, paletin dışında (OverlayService.kt)
  var AZ = M.azHareket();
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------------------------------------------------------- el yazısı
     Kayıtlı çizgiler (1 em = 200 birim, taban çizgisi y=0) → ekran yolları. İngilizce sayfada
     "anahtar_en" varsa o yazılır (el-yazisi-metinler.json: "benim değil" → "not mine", 0,8 → 0.8). */
  var BIRIM = 200, cozulen = {};
  function cizgiler(anahtar) {
    if (cozulen[anahtar]) return cozulen[anahtar];
    var m = (OSN.en && VERI[anahtar + '_en']) || VERI[anahtar];
    if (!m) return null;
    var s = m.s.map(function (k) {
      var o = [k[0], k[1]], x = k[0], y = k[1];
      for (var i = 2; i < k.length; i += 2) { x += k[i]; y += k[i + 1]; o.push(x, y); }
      return o;
    });
    return (cozulen[anahtar] = { g: m.g, s: s });
  }
  function yaziEn(anahtar, boy) { var c = cizgiler(anahtar); return c ? c.g * boy / BIRIM : 0; }
  function yazi(anahtar, x, y, boy, egim) {
    var c = cizgiler(anahtar);
    if (!c) return [];
    var k = boy / BIRIM, ca = Math.cos(egim || 0), sa = Math.sin(egim || 0);
    return c.s.map(function (s) {
      var p = [];
      for (var i = 0; i < s.length; i += 2) {
        var u = s[i] * k, v = s[i + 1] * k;
        p.push(x + u * ca - v * sa, y + u * sa + v * ca);
      }
      return { p: M.duzlestir(p, 1.1), duz: true };
    });
  }

  // eğri ok: (x0,y0)'dan (x1,y1)'e, (kx,ky) denetim noktasına doğru bükülen gövde + iki çizgiyle uç
  function egriOk(x0, y0, kx, ky, x1, y1, tohum, ucBoy) {
    var g = [];
    for (var i = 0; i <= 40; i++) {
      var t = i / 40, u = 1 - t;
      g.push(u * u * x0 + 2 * u * t * kx + t * t * x1, u * u * y0 + 2 * u * t * ky + t * t * y1);
    }
    g = M.titret(g, 1.2, tohum);
    var n = g.length;
    var ax = g[n - 2] - g[n - 10], ay = g[n - 1] - g[n - 9], al = Math.hypot(ax, ay) || 1;
    ax /= al; ay /= al;
    var ex = g[n - 2], ey = g[n - 1], u2 = ucBoy || 16, c1 = Math.cos(0.5), s1 = Math.sin(0.5);
    var uc = [ex - u2 * (ax * c1 - ay * s1), ey - u2 * (ay * c1 + ax * s1), ex, ey, ex - u2 * (ax * c1 + ay * s1), ey - u2 * (ay * c1 - ax * s1)];
    return [{ p: g }, { p: uc, duz: true }];
  }
  // birkaç noktadan geçen ok (Catmull-Rom): yazının arasından değil, boşluklardan geçen yollar için
  function yolOk(noktalar, tohum, ucBoy) {
    var P = noktalar, g = [];
    for (var i = 0; i < P.length - 1; i++) {
      var p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      for (var k = i ? 1 : 0; k <= 12; k++) {
        var t = k / 12, t2 = t * t, t3 = t2 * t;
        g.push(0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3));
      }
    }
    g = M.titret(g, 1.2, tohum);
    var n = g.length;
    var ax = g[n - 2] - g[n - 10], ay = g[n - 1] - g[n - 9], al = Math.hypot(ax, ay) || 1;
    ax /= al; ay /= al;
    var ex = g[n - 2], ey = g[n - 1], u2 = ucBoy || 16, c1 = Math.cos(0.5), s1 = Math.sin(0.5);
    var uc = [ex - u2 * (ax * c1 - ay * s1), ey - u2 * (ay * c1 + ax * s1), ex, ey, ex - u2 * (ax * c1 + ay * s1), ey - u2 * (ay * c1 - ax * s1)];
    return [{ p: g }, { p: uc, duz: true }];
  }

  /* ---------------------------------------------------------- hız profili
     Bir çizginin noktaları için birikimli "zaman" tablosu: kıvrımda yavaşlar
     (yarıçapı küçük yerde el yavaşlar), çizginin başında hızlanır, sonunda yavaşlar. */
  function hizTablosu(p) {
    var n = p.length / 2, L = new Float64Array(n), T = new Float64Array(n), f = new Float64Array(n);
    for (var i = 1; i < n; i++) L[i] = L[i - 1] + Math.hypot(p[i * 2] - p[i * 2 - 2], p[i * 2 + 1] - p[i * 2 - 1]);
    var top = L[n - 1] || 0, w = 3;
    for (var j = 0; j < n; j++) {
      var a = Math.max(1, j - w), b = Math.min(n - 1, j + w), k = 0;
      if (b - a >= 2 && L[b] - L[a - 1] > 0.5) {
        var a1 = Math.atan2(p[a * 2 + 1] - p[a * 2 - 1], p[a * 2] - p[a * 2 - 2]);
        var a2 = Math.atan2(p[b * 2 + 1] - p[b * 2 - 1], p[b * 2] - p[b * 2 - 2]);
        var d = Math.abs(a2 - a1);
        if (d > Math.PI) d = 2 * Math.PI - d;
        k = d / Math.max(1, L[b] - L[a - 1]);
      }
      var rampa = Math.min(1, 0.32 + L[j] / 16) * Math.min(1, 0.4 + (top - L[j]) / 20);
      f[j] = rampa / (1 + 16 * k);
    }
    for (var m = 1; m < n; m++) T[m] = T[m - 1] + (L[m] - L[m - 1]) / Math.max(0.08, (f[m] + f[m - 1]) / 2);
    return { L: L, T: T, top: top };
  }
  // zamanın T içindeki yeri → yolun o ana kadarki kısmı
  function kismi(p, tab, tt) {
    var T = tab.T, n = T.length;
    if (tt <= 0) return p.slice(0, 2);
    if (tt >= T[n - 1]) return p;
    var a = 0, b = n - 1;
    while (b - a > 1) { var m = (a + b) >> 1; if (T[m] <= tt) a = m; else b = m; }
    var q = (tt - T[a]) / ((T[b] - T[a]) || 1);
    var o = p.slice(0, a * 2 + 2);
    o.push(p[a * 2] + (p[b * 2] - p[a * 2]) * q, p[a * 2 + 1] + (p[b * 2 + 1] - p[a * 2 + 1]) * q);
    return o;
  }

  /* ---------------------------------------------------------- mürekkep öğesi
     Parçalar sırayla; her biri kendi hız profiliyle. Aralarında kalem kalkar.
     hiz: ortalama hız (px/sn); kalkis: parçalar arası bekleme (sn). */
  function oge(parca, renk, k, bas, hiz, kalkis) {
    var kal = kalkis == null ? 0.07 : kalkis, t = 0, ara = [], tab = [], uz = [];
    var tepe = hiz * 1.45; // en yüksek hız: ortalamanın biraz üstü
    for (var i = 0; i < parca.length; i++) {
      var h = hizTablosu(parca[i].p);
      var d = Math.max(0.04, h.T[h.T.length - 1] / tepe);
      tab.push(h); uz.push(h.top);
      ara.push([t, t + d]);
      if (i < parca.length - 1) {
        // kalem kalkıp bir sonraki çizgiye geçer: harf içinde kısa, kelimeler arasında biraz uzun
        var p0 = parca[i].p, p1 = parca[i + 1].p, ara2 = Math.hypot(p1[0] - p0[p0.length - 2], p1[1] - p0[p0.length - 1]);
        t += d + Math.min(kal * 1.6, kal * 0.45 + ara2 / 1100);
      } else t += d;
    }
    return { parca: parca, tab: tab, uz: uz, ara: ara, renk: renk, k: k, bas: bas, sure: t };
  }
  // öğeyi t anına kadar çizer; kalem o an bir parçayı yazıyorsa ucunu döndürür
  function ogeCiz(ctx, o, t) {
    var yer = t - o.bas, uc = null;
    if (yer <= 0) return null;
    for (var i = 0; i < o.parca.length; i++) {
      var a = o.ara[i];
      if (yer <= a[0]) break;
      var p = o.parca[i];
      if (yer >= a[1]) { M.cizgi(ctx, p.p, o.renk, o.k, p.duz); continue; }
      var tab = o.tab[i], q = (yer - a[0]) / (a[1] - a[0]);
      var y = kismi(p.p, tab, q * tab.T[tab.T.length - 1]);
      M.cizgi(ctx, y, o.renk, o.k, p.duz);
      uc = [y[y.length - 2], y[y.length - 1]];
      break;
    }
    return uc;
  }
  // kalemin öğe süresince duruşu: yazarken uç yolda (h 0); parçalar arasında kalkıp bir sonrakine geçer
  function ogeDurus(o, t) {
    var yer = t - o.bas;
    for (var i = 0; i < o.parca.length; i++) {
      var a = o.ara[i], p = o.parca[i].p;
      if (yer < a[0]) {
        // önceki parçanın sonundan bu parçanın başına
        var onceki = o.parca[i - 1].p, b0 = o.ara[i - 1][1], q = (yer - b0) / Math.max(0.001, a[0] - b0);
        var x0 = onceki[onceki.length - 2], y0 = onceki[onceki.length - 1], x1 = p[0], y1 = p[1];
        var e = M.yumusak(M.sinirla(q, 0, 1)), uz = Math.hypot(x1 - x0, y1 - y0);
        return { x: x0 + (x1 - x0) * e, y: y0 + (y1 - y0) * e, h: Math.sin(Math.PI * e) * Math.min(9, 2.5 + uz * 0.08), yaz: false };
      }
      if (yer <= a[1]) {
        var tab = o.tab[i], qq = (yer - a[0]) / (a[1] - a[0]);
        var y = kismi(p, tab, qq * tab.T[tab.T.length - 1]);
        return { x: y[y.length - 2], y: y[y.length - 1], h: 0, yaz: true };
      }
    }
    var son = o.parca[o.parca.length - 1].p;
    return { x: son[son.length - 2], y: son[son.length - 1], h: 0, yaz: false };
  }
  // öğenin i. parçası t anında kaç noktasına kadar yazıldı (0..n); henüz başlamadıysa -1
  function parcaIlerleme(o, i, t) {
    var yer = t - o.bas, a = o.ara[i], n = o.parca[i].p.length / 2;
    if (yer < a[0]) return -1;
    if (yer >= a[1]) return n;
    var T = o.tab[i].T, tt = (yer - a[0]) / (a[1] - a[0]) * T[T.length - 1];
    var lo = 0, hi = T.length - 1;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (T[m] <= tt) lo = m; else hi = m; }
    return lo + 1;
  }
  function ogeBas(o) { var p = o.parca[0].p; return [p[0], p[1]]; }
  function ogeSon(o) { var p = o.parca[o.parca.length - 1].p; return [p[p.length - 2], p[p.length - 1]]; }

  /* ---------------------------------------------------------- kalem ucu (stylus)
     Yerel çizim: uç (0,0), gövde +x yönünde. Gölge, kalemin eğimi yüzünden uçtan uzaklaştıkça
     açılır (arka uç yüksekte): gölgenin dönüşümü eğik (shear). Işık üstten, biraz soldan.
     Oranlar gerçek bir kaleme göre: boy çapın ~21 katı (tablette ~145 mm × 6,8 mm). Titanyum gri,
     yanında düğmesi olan bir Android kalemi. Yatarken (yuvada) eğim 0: gölge kaymaz, uç temas etmez. */
  var R = 15, SIVRI = 78, BOY = 640;
  var YOL_UC = 'M0 0C1.6-1.1 5.2-2.5 12.5-3.3L12.5 3.3C5.2 2.5 1.6 1.1 0 0Z';
  var YOL_SIVRI = 'M12.5-3.3C33-5.2 54-12.6 ' + SIVRI + ' -' + R + 'L' + SIVRI + ' ' + R + 'C54 12.6 33 5.2 12.5 3.3Z';
  var YOL_GOVDE = 'M' + SIVRI + ' -' + R + 'H' + (BOY - 9) + 'A9 ' + R + ' 0 0 1 ' + (BOY - 9) + ' ' + R + 'H' + SIVRI + 'Z';
  var YOL_SILUET = 'M0 0C1.6-1.1 5.2-2.5 12.5-3.3C33-5.2 54-12.6 ' + SIVRI + ' -' + R + 'H' + (BOY - 9) + 'A9 ' + R + ' 0 0 1 ' + (BOY - 9) + ' ' + R + 'H' + SIVRI + 'C54 12.6 33 5.2 12.5 3.3C5.2 2.5 1.6 1.1 0 0Z';
  var LX = -0.34, LY = 0.94, GOL = 0.5, EGIM = 0.34;
  function svgEl(ic, sinif) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('class', sinif);
    s.setAttribute('width', '1');
    s.setAttribute('height', '1');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    s.innerHTML = ic;
    return s;
  }
  function mat(a, b, c, d, e, f) { return 'matrix(' + a.toFixed(4) + ',' + b.toFixed(4) + ',' + c.toFixed(4) + ',' + d.toFixed(4) + ',' + e.toFixed(2) + ',' + f.toFixed(2) + ')'; }
  function KalemUcu(govde, dx, dy, olcek) {
    var kok = document.createElement('div');
    kok.className = 'uc';
    kok.setAttribute('aria-hidden', 'true');
    this.golge = svgEl('<path d="' + YOL_SILUET + '" fill="url(#ku-golge)"/>', 'uc__golge');
    this.temas = svgEl('<ellipse cx="3" cy="0" rx="7" ry="3.2" fill="#0B0D10"/>', 'uc__temas');
    this.govde = svgEl(
      '<path d="' + YOL_GOVDE + '" fill="url(#ku-govde)"/>' +
      '<ellipse cx="' + (BOY - 9) + '" cy="0" rx="8.4" ry="' + (R - 0.6) + '" fill="url(#ku-kapak)" opacity="0.9"/>' +
      '<path d="' + YOL_SIVRI + '" fill="url(#ku-sivri)"/>' +
      '<path d="' + YOL_UC + '" fill="url(#ku-uc)"/>' +
      // koniyle gövdenin birleştiği ince çizgi
      '<path d="M' + SIVRI + ' -' + R + 'C' + (SIVRI + 2.2) + ' -6 ' + (SIVRI + 2.2) + ' 6 ' + SIVRI + ' ' + R + '" fill="none" stroke="rgba(0,0,0,0.42)" stroke-width="1"/>' +
      // yan düğme, ucun yakınında
      '<rect x="' + (SIVRI + 54) + '" y="-5" width="50" height="10" rx="5" fill="url(#ku-dugme)"/>' +
      '<path d="M' + (SIVRI + 59) + ' -4.3H' + (SIVRI + 99) + '" stroke="#FFFFFF" stroke-width="0.8" stroke-linecap="round" opacity="0.16"/>' +
      // saten metal parlaması
      '<path d="M' + (SIVRI + 14) + ' -7.9H' + (BOY - 26) + '" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" opacity="0.24"/>' +
      '<path d="M22 -3.6C38 -5 52 -8.6 ' + (SIVRI - 4) + ' -10.6" fill="none" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" opacity="0.3"/>' +
      '<path d="M' + SIVRI + ' ' + (R - 0.4) + 'H' + (BOY - 9) + '" stroke="rgba(0,0,0,0.36)" stroke-width="0.8"/>',
      'uc__govde');
    kok.appendChild(this.golge);
    kok.appendChild(this.temas);
    kok.appendChild(this.govde);
    govde.appendChild(kok);
    this.kok = kok;
    this.dx = dx; this.dy = dy; this.olcek = olcek || 1;
    this.anahtar = '';
  }
  // x, y: ekran içindeki yer (tasarım pikseli); h: yükseklik; aci: gövdenin yönü (radyan);
  // egim: kalemin masaya göre eğimi (yazarken EGIM, yuvada yatarken 0)
  KalemUcu.prototype.poz = function (x, y, h, aci, gorunur, egim) {
    if (egim == null) egim = EGIM;
    var anahtar = gorunur === false ? '-' : Math.round(x * 4) + ',' + Math.round(y * 4) + ',' + Math.round(h * 4) + ',' + Math.round(aci * 400) + ',' + Math.round(egim * 300);
    if (anahtar === this.anahtar) return;
    this.anahtar = anahtar;
    if (gorunur === false) { this.kok.classList.add('uc--gizli'); return; }
    this.kok.classList.remove('uc--gizli');
    var X = x + this.dx, Y = y + this.dy, o = this.olcek, c = Math.cos(aci), s = Math.sin(aci);
    var b = o * (1 + h * 0.0016);
    this.govde.style.transform = mat(c * b, s * b, -s * b, c * b, X, Y);
    var lx = (c * LX + s * LY) * GOL, ly = (-s * LX + c * LY) * GOL;
    var A = c * (1 + egim * lx) - s * (egim * ly), B = s * (1 + egim * lx) + c * (egim * ly);
    var hx = X + h * GOL * LX * o, hy = Y + h * GOL * LY * o;
    this.golge.style.transform = mat(A * o, B * o, -s * o, c * o, hx, hy);
    this.golge.style.opacity = (0.34 - Math.min(h, 60) * 0.0024).toFixed(3);
    this.temas.style.transform = mat(c * o, s * o, -s * o, c * o, hx, hy);
    this.temas.style.opacity = (0.5 * Math.max(0, 1 - h / 9) * Math.min(1, egim / EGIM)).toFixed(3);
  };

  /* ---------------------------------------------------------- cihaz
     Ekranın içi tasarım pikseliyle (telefon 360×780, tablet 1000×625 / 625×1000). */
  function Cihaz(kok) {
    this.kok = kok;
    this.govde = kok.querySelector('.tel__govde, .tablet__govde');
    this.ekran = kok.querySelector('.tel__ekran, .tablet__ekran');
    this.tuval = this.ekran.querySelector('[data-murekkep], [data-sekil-tuval]');
    this.ctx = this.tuval ? this.tuval.getContext('2d') : null;
    var tablet = kok.classList.contains('tablet'), dikey = kok.classList.contains('tablet--dikey');
    this.tablet = tablet;
    this.W = tablet ? (dikey ? 625 : 1000) : 360;
    this.H = tablet ? (dikey ? 1000 : 625) : 780;
    this.kenar = tablet ? 24 : 12;           // gövdenin kenarından ekrana
    this.oc = this.ekran.querySelector('.oc');
    this.olcek = 1;
    this.uc = null;
  }
  // tablet dikey/yatay çevrilince (sınıfı değişince) ekranın tasarım ölçüleri
  Cihaz.prototype.yonla = function () {
    if (!this.tablet) return;
    var dikey = this.kok.classList.contains('tablet--dikey');
    this.W = dikey ? 625 : 1000;
    this.H = dikey ? 1000 : 625;
  };
  Cihaz.prototype.boyutla = function () {
    var r = this.ekran.getBoundingClientRect();
    if (!r.width) return false;
    this.olcek = r.width / this.W;
    if (this.tuval) {
      var d = M.dpr(), w = Math.round(this.W * this.olcek * d), h = Math.round(this.H * this.olcek * d);
      if (this.tuval.width !== w) this.tuval.width = w;
      if (this.tuval.height !== h) this.tuval.height = h;
    }
    return true;
  };
  Cihaz.prototype.baglam = function () {
    var c = this.ctx, s = this.tuval.width / this.W;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.tuval.width, this.tuval.height);
    c.setTransform(s, 0, 0, s, 0, 0);
    return c;
  };
  // bir öğenin ekrandaki kutusu, tasarım pikseliyle
  Cihaz.prototype.kutu = function (el) {
    if (typeof el === 'string') el = this.ekran.querySelector(el);
    if (!el) return null;
    var r = el.getBoundingClientRect(), e = this.ekran.getBoundingClientRect(), k = e.width / this.W;
    return { x: (r.left - e.left) / k, y: (r.top - e.top) / k, w: r.width / k, h: r.height / k };
  };
  Cihaz.prototype.merkez = function (el) {
    var b = this.kutu(el);
    return b ? [b.x + b.w / 2, b.y + b.h / 2] : [0, 0];
  };
  // kalem ucu: telefonda biraz daha ince ve kısa (telefon kalemi)
  Cihaz.prototype.ucKur = function () {
    if (!this.uc) this.uc = new KalemUcu(this.govde, this.kenar, this.kenar, this.tablet ? 1 : 0.84);
    return this.uc;
  };
  // kalemin yuvası: tabletin uzun kenarına mıknatısla tutunur (yatayda üst kenar, dikeyde sağ kenar),
  // ucu yukarıda/solda. dis: kenardan dışarı birim yön. Telefonda yuva yok.
  Cihaz.prototype.yuva = function () {
    if (!this.tablet) return null;
    var p = R + 0.3;
    if (this.W > this.H) return { x: this.W * 0.324, y: -this.kenar - p, h: 3, aci: 0, egim: 0, dis: [0, -1] };
    return { x: this.W + this.kenar + p, y: this.H * 0.3, h: 3, aci: Math.PI / 2, egim: 0, dis: [1, 0] };
  };
  // tek bir an için kalem ucu: etkileşimli sahnelerin örnekleri (basılıyken uç ekranda)
  Cihaz.prototype.dokunus = function (x, y, gorunur, basili) {
    var u = this.ucKur();
    if (!gorunur || AZ) { u.poz(0, 0, 0, 0, false); return; }
    u.poz(x, y, basili ? 0 : 7, 0.98 + (x / this.W - 0.5) * 0.2 - (y / this.H - 0.5) * 0.1, true);
  };
  // çubuğun hâli: { el, arac: 'kalem' | 'silgi' | 'sekil', renk: -1..5 }
  Cihaz.prototype.ocDurum = function (d) {
    var oc = this.oc;
    if (!oc) return;
    var anahtar = (d.el ? 1 : 0) + d.arac + d.renk;
    if (this.ocAnahtar === anahtar) return;
    this.ocAnahtar = anahtar;
    ocUygula(oc, d);
  };
  function ocUygula(oc, d) {
    oc.classList.toggle('oc--el', !!d.el);
    var a = oc.querySelectorAll('.oc__a');
    for (var i = 0; i < a.length; i++) {
      var ad = a[i].getAttribute('data-a'), sec = ad === 'el' ? !!d.el : (!d.el && ad === d.arac);
      a[i].classList.toggle('oc__a--sec', sec);
      if (a[i].hasAttribute('aria-pressed')) a[i].setAttribute('aria-pressed', String(sec));
    }
    var r = oc.querySelectorAll('.oc__renkler > *');
    for (var j = 0; j < r.length; j++) {
      var s = j === d.renk && d.arac !== 'silgi';
      r[j].classList.toggle('sec', s);
      if (r[j].hasAttribute('aria-pressed')) r[j].setAttribute('aria-pressed', String(s));
    }
    var kalemRengi = d.renk >= 0 ? RENK[d.renk] : ILK_RENK;
    oc.style.setProperty('--kr', !d.el && d.arac !== 'silgi' ? kalemRengi : '#8E8E93');
  }

  /* ---------------------------------------------------------- plan
     Adımları kalemin yetişeceği sürelerle dizer: iki hedef arası yol mesafeye göre sürer. */
  function Plan(c, ayar) {
    ayar = ayar || {};
    this.c = c;
    this.t = ayar.bas || 0;
    this.dinlen = ayar.dinlen || [c.W + 120, c.H + 140];
    this.poz = this.dinlen.slice();
    this.a = [];
    this.giris = ayar.giris || 0;   // ilk hedefe yol, en erken bu anda başlar
  }
  Plan.prototype.yolSure = function (x, y) {
    var d = Math.hypot(x - this.poz[0], y - this.poz[1]);
    return 0.16 + Math.min(0.62, d / 1500);
  };
  Plan.prototype.git = function (x, y) {
    var s = this.yolSure(x, y);
    if (!this.a.length) this.t = Math.max(this.t + s, this.giris + s);
    else this.t += s;
    this.poz = [x, y];
  };
  // çubuktaki bir düğmeye ya da ekrandaki bir noktaya dokun; ocDegis: dokunuşla gelen çubuk hâli
  Plan.prototype.dokun = function (hedef, ocDegis, ek) {
    var m = typeof hedef === 'string' ? this.c.merkez(this.c.oc.querySelector(hedef)) : hedef;
    this.git(m[0], m[1]);
    var adim = { t: this.t, tur: 'dokun', x: m[0], y: m[1], sure: 0.3 };
    if (ek) for (var k in ek) adim[k] = ek[k];
    this.a.push(adim);
    if (ocDegis) { ocDegis.t = this.t + 0.12; ocDegis.tur = 'oc'; this.a.push(ocDegis); }
    this.t += 0.3;
    return adim;
  };
  Plan.prototype.ciz = function (parca, renk, k, hiz, kalkis) {
    if (!parca.length) return null;
    var b = [parca[0].p[0], parca[0].p[1]];
    this.git(b[0], b[1]);
    var o = oge(parca, renk, k, this.t, hiz, kalkis);
    this.a.push({ t: this.t, tur: 'ciz', o: o });
    this.t += o.sure;
    this.poz = ogeSon(o);
    return o;
  };
  Plan.prototype.bekle = function (s) { this.t += s; return this; };
  Plan.prototype.her = function (f, t) { this.a.push({ t: t || 0, tur: 'her', f: f }); };
  Plan.prototype.senaryo = function (ilk, ayar) {
    ayar = ayar || {};
    return new Senaryo(this.c, this.a, { ilk: ilk, uc: ayar.uc !== false, dinlen: ayar.cikis || this.dinlen, giris: this.dinlen, cikisGizli: ayar.cikisGizli, yuva: ayar.yuva });
  };

  /* ---------------------------------------------------------- senaryo
     Adımlar: oc (çubuk hâli), dokun (kalem ucu dokunur), ciz (mürekkep), her (her karede çağrılır).
     Kalem ucunun yolu adımlardan kurulur: duraklar (dokunuş, yazı) ve aralarında kavisli, kalkıp inen geçiş. */
  function Senaryo(cihaz, adimlar, ayar) {
    ayar = ayar || {};
    this.c = cihaz;
    this.adimlar = adimlar;
    this.ilk = ayar.ilk || { el: true, arac: 'kalem', renk: -1 };
    this.ucVar = !!ayar.uc && !AZ;
    var son = 0, duraklar = [];
    adimlar.forEach(function (a) {
      var b = a.t + (a.tur === 'ciz' ? a.o.sure : a.sure || 0.3);
      if (a.tur !== 'her' && b > son) son = b;
      if (a.tur === 'dokun') duraklar.push({ bas: a.t, son: a.t + a.sure, tur: 'dokun', x: a.x, y: a.y });
      else if (a.tur === 'ciz') duraklar.push({ bas: a.o.bas, son: a.o.bas + a.o.sure, tur: 'ciz', o: a.o });
    });
    duraklar.sort(function (a, b) { return a.bas - b.bas; });
    this.duraklar = duraklar;
    this.giris = ayar.giris || [cihaz.W + 120, cihaz.H + 140];
    this.cikis = ayar.dinlen || this.giris;
    this.yuva = ayar.yuva || null;  // varsa kalem yuvadan kalkar ve sonunda yuvaya döner
    this.cikisSure = this.yuva ? YUVA_DON : 0.9;
    this.cikisGizli = !!ayar.cikisGizli; // çıkınca kalem ekrandan gider (yoksa çıkış yerinde havada durur)
    this.son = son + (this.ucVar && duraklar.length ? this.cikisSure : 0.2);
  }
  function durakBas(d) { return d.tur === 'dokun' ? { x: d.x, y: d.y, h: 7 } : (function (p) { return { x: p[0], y: p[1], h: 0 }; })(ogeBas(d.o)); }
  function durakSon(d) { return d.tur === 'dokun' ? { x: d.x, y: d.y, h: 7 } : (function (p) { return { x: p[0], y: p[1], h: 0 }; })(ogeSon(d.o)); }
  function yumusak3(q) { return q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2; }
  // yuva hareketleri: kalkış (mıknatıstan ayrılıp dönerek hedefe) ve dönüş (yükselip döner, kenarın biraz
  // dışında durur, mıknatıs hızlanarak çeker, küçük bir sekme)
  var YUVA_KALK = 1.05, YUVA_DON = 1.4;
  function yuvaDurus(Y) { return { x: Y.x, y: Y.y, h: Y.h, aci: Y.aci, egim: Y.egim, yuvada: true }; }
  function arala(a, b, e) {
    return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, h: a.h + (b.h - a.h) * e, aci: a.aci + (b.aci - a.aci) * e, egim: a.egim + (b.egim - a.egim) * e };
  }
  function yuvadanKalk(c, Y, b, q, t) {
    var K = 0.2, don = Y.dis[1] ? 0.06 : -0.06;
    var A1 = { x: Y.x + Y.dis[0] * 12, y: Y.y + Y.dis[1] * 12, h: 20, aci: Y.aci + don, egim: 0.08 };
    if (q < K) return arala(yuvaDurus(Y), A1, M.yavasla(q / K));
    var r = (q - K) / (1 - K), p = gecis(A1, b, r), ea = yumusak3(Math.min(1, r * 1.25)), hedef = ucAci(c, b, 0);
    p.aci = A1.aci + (hedef - A1.aci) * ea;
    p.egim = A1.egim + (EGIM - A1.egim) * ea;
    return p;
  }
  function yuvayaDon(c, a, Y, s) {
    var don = Y.dis[1] ? 0.05 : -0.05;
    var H = { x: Y.x + Y.dis[0] * 18, y: Y.y + Y.dis[1] * 18, h: 24, aci: Y.aci + don, egim: 0.1 };
    var P1 = 0.68, P2 = 0.78;
    if (s < P1) {
      var r = s / P1, p = gecis(a, H, r), bas = ucAci(c, a, 0), ea = yumusak3(M.sinirla(r * 1.3 - 0.15, 0, 1));
      p.aci = bas + (H.aci - bas) * ea;
      p.egim = EGIM + (H.egim - EGIM) * ea;
      return p;
    }
    if (s < P2) { var e = (s - P1) / (P2 - P1); return arala(H, yuvaDurus(Y), e * e); }
    var q = M.sinirla((s - P2) / (1 - P2), 0, 1), sek = Math.sin(Math.PI * Math.min(1, q * 1.6)) * (1 - q) * 1.6;
    var d = yuvaDurus(Y);
    d.x += Y.dis[0] * sek; d.y += Y.dis[1] * sek;
    return d;
  }
  // iki duruş arasında geçiş: yavaş başlar, hızlanır, yavaşça iner; yol hafif kavisli, kalem kalkar
  function gecis(a, b, q) {
    var e = yumusak3(M.sinirla(q, 0, 1)), dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    var kavis = Math.sin(Math.PI * e) * Math.min(60, d * 0.09);
    var nx = d ? -dy / d : 0, ny = d ? dx / d : 0;
    if (ny > 0) { nx = -nx; ny = -ny; } // kavis hep yukarı doğru
    var kalk = Math.min(40, 8 + d * 0.05);
    return { x: a.x + dx * e + nx * kavis, y: a.y + dy * e + ny * kavis, h: a.h + (b.h - a.h) * e + Math.sin(Math.PI * e) * kalk, yaz: false };
  }
  Senaryo.prototype.ucDurus = function (t) {
    var D = this.duraklar;
    if (!D.length) return null;
    var ilk = D[0], sonD = D[D.length - 1], Y = this.yuva;
    var dinlen = { x: this.giris[0], y: this.giris[1], h: 60 };
    var cikis = { x: this.cikis[0], y: this.cikis[1], h: this.cikis[2] == null ? 60 : this.cikis[2] };
    var girisSure = Y ? Math.min(YUVA_KALK, Math.max(0.4, ilk.bas)) : Math.min(1.1, Math.max(0.5, ilk.bas));
    if (t < ilk.bas) {
      if (t < ilk.bas - girisSure) return Y ? yuvaDurus(Y) : { x: dinlen.x, y: dinlen.y, h: dinlen.h, gizli: true };
      var q0 = (t - (ilk.bas - girisSure)) / girisSure;
      return Y ? yuvadanKalk(this.c, Y, durakBas(ilk), q0, t) : gecis(dinlen, durakBas(ilk), q0);
    }
    for (var i = 0; i < D.length; i++) {
      var d = D[i];
      if (t < d.bas) return gecis(durakSon(D[i - 1]), durakBas(d), (t - D[i - 1].son) / Math.max(0.001, d.bas - D[i - 1].son));
      if (t <= d.son) {
        if (d.tur === 'dokun') {
          var q = (t - d.bas) / (d.son - d.bas);
          // gelir, bastırır (0.3–0.55), kalkar
          var h = q < 0.3 ? 7 * (1 - yumusak3(q / 0.3)) : q < 0.55 ? 0 : 7 * yumusak3((q - 0.55) / 0.45);
          return { x: d.x, y: d.y, h: h, yaz: false, bas: q >= 0.3 && q < 0.55 };
        }
        return ogeDurus(d.o, t);
      }
    }
    var s = (t - sonD.son) / this.cikisSure;
    if (Y) return yuvayaDon(this.c, durakSon(sonD), Y, Math.min(1, s));
    if (s >= 1 && this.cikisGizli) return { x: cikis.x, y: cikis.y, h: cikis.h, gizli: true };
    return gecis(durakSon(sonD), cikis, s);
  };
  Senaryo.prototype.ciz = function (t) {
    var c = this.c, d = { el: this.ilk.el, arac: this.ilk.arac, renk: this.ilk.renk };
    var ctx = c.baglam();
    for (var i = 0; i < this.adimlar.length; i++) {
      var a = this.adimlar[i];
      if (a.tur === 'her') { a.f(t - a.t, t); continue; }
      if (a.t > t) continue;
      if (a.tur === 'oc') {
        if (a.el != null) d.el = a.el;
        if (a.arac) d.arac = a.arac;
        if (a.renk != null) d.renk = a.renk;
      } else if (a.tur === 'ciz') ogeCiz(ctx, a.o, t);
    }
    c.ocDurum(d);
    if (this.ucVar) ucKoy(c, this.ucDurus(t), t);
    else if (this.yuva) ucKoy(c, yuvaDurus(this.yuva), t); // hareket azaltılmışsa kalem yuvasında durur
    else if (c.uc) c.uc.poz(0, 0, 0, 0, false);
  };
  // gövdenin yönü: sağ elle tutulur, sağ alta bakar; el sola gittikçe biraz yatar; yazarken hafifçe oynar
  function ucAci(c, p, t) {
    var a = 0.98 + (p.x / c.W - 0.5) * 0.2 - (p.y / c.H - 0.5) * 0.1;
    if (p.yaz) a += Math.sin(t * 7.3) * 0.018;
    return a;
  }
  /* Genel kalem yolu: sürükleme gibi kendi zamanlamasıyla oynayan sahneler için.
     duraklar: [{ bas, son, ilk: {x,y,h}, sonP: {x,y,h}, poz: function (t) → {x,y,h,yaz} }] (sıralı) */
  // giris/cikis { yuva: Cihaz.yuva() } olursa kalem yuvadan kalkar / yuvaya döner (c gerekir)
  function izKur(duraklar, giris, cikis, girisSure, cikisSure, c) {
    girisSure = giris.yuva ? YUVA_KALK : girisSure || 0.9;
    cikisSure = cikis.yuva ? YUVA_DON : cikisSure || 0.9;
    var D = duraklar;
    var f = function (t) {
      if (!D.length) return null;
      var ilk = D[0];
      if (t < ilk.bas) {
        if (t < ilk.bas - girisSure) return giris.yuva ? yuvaDurus(giris.yuva) : { x: giris.x, y: giris.y, h: giris.h, gizli: true };
        var q0 = (t - (ilk.bas - girisSure)) / girisSure;
        return giris.yuva ? yuvadanKalk(c, giris.yuva, ilk.ilk, q0, t) : gecis(giris, ilk.ilk, q0);
      }
      for (var i = 0; i < D.length; i++) {
        var d = D[i];
        if (t < d.bas) return gecis(D[i - 1].sonP, d.ilk, (t - D[i - 1].son) / Math.max(0.001, d.bas - D[i - 1].son));
        if (t <= d.son) return d.poz(t);
      }
      var s = D[D.length - 1], q = (t - s.son) / cikisSure;
      if (cikis.yuva) return yuvayaDon(c, s.sonP, cikis.yuva, Math.min(1, q));
      if (q >= 1) return { x: cikis.x, y: cikis.y, h: cikis.h, gizli: !!cikis.gizli };
      return gecis(s.sonP, cikis, q);
    };
    f.son = D.length ? D[D.length - 1].son + cikisSure : 0;
    return f;
  }
  // kalem ucunu bir duruşa koy (yoksa ya da gizliyse sakla; hareket azaltılmışsa yalnız yuvada görünür)
  function ucKoy(c, p, t) {
    var u = c.ucKur();
    if (!p || p.gizli || (AZ && !p.yuvada)) u.poz(0, 0, 0, 0, false);
    else u.poz(p.x, p.y, p.h, p.aci != null ? p.aci : ucAci(c, p, t), true, p.egim);
  }
  // kalemi yuvasına koy; yuva yoksa (telefon) sakla
  function ucYuvada(c) {
    var Y = c.yuva();
    ucKoy(c, Y ? yuvaDurus(Y) : null, 0);
  }

  /* ---------------------------------------------------------- oynatma döngüsü */
  var calisan = [];
  var kare = 0;
  function dongu(z) {
    kare = 0;
    for (var i = calisan.length - 1; i >= 0; i--) {
      var o = calisan[i];
      if (o.bas == null) o.bas = z;
      var t = (z - o.bas) / 1000 - o.gecikme;
      if (t < 0) continue;
      if (t >= o.sen.son) { o.sen.ciz(o.sen.son); calisan.splice(i, 1); if (o.bitti) o.bitti(); continue; }
      o.sen.ciz(t);
    }
    if (calisan.length) kare = requestAnimationFrame(dongu);
  }
  function oynat(sen, gecikme, bitti) {
    durdur(sen);
    calisan.push({ sen: sen, gecikme: gecikme || 0, bas: null, bitti: bitti });
    if (!kare) kare = requestAnimationFrame(dongu);
  }
  function durdur(sen) {
    for (var i = calisan.length - 1; i >= 0; i--) if (calisan[i].sen === sen) calisan.splice(i, 1);
  }
  function oynuyor(sen) {
    for (var i = 0; i < calisan.length; i++) if (calisan[i].sen === sen) return true;
    return false;
  }

  function yazitipiHazir() {
    var bekle = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    return Promise.race([bekle, new Promise(function (ok) { setTimeout(ok, 1800); })]);
  }

  OSN.sahne = {
    RENK: RENK, RENK_AD: RENK_AD, ILK_RENK: ILK_RENK, AZ: AZ,
    yazi: yazi, yaziEn: yaziEn, egriOk: egriOk, yolOk: yolOk, oge: oge, ogeCiz: ogeCiz, ogeDurus: ogeDurus, parcaIlerleme: parcaIlerleme,
    Cihaz: Cihaz, ocUygula: ocUygula, KalemUcu: KalemUcu, Plan: Plan, Senaryo: Senaryo,
    oynat: oynat, durdur: durdur, oynuyor: oynuyor, yazitipiHazir: yazitipiHazir, gecis: gecis,
    izKur: izKur, ucKoy: ucKoy, ucYuvada: ucYuvada, ucAci: ucAci, yumusak3: yumusak3, YUVA_DON: YUVA_DON
  };
})();
