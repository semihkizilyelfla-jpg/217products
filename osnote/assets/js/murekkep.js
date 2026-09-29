/* ============================================================
   OSNote tanıtım sitesi · mürekkep motoru
   ------------------------------------------------------------
   Kalemin, fosforlunun, silginin ve şekillerin çizimi; sahnelerdeki
   el yazısı; çizim yüzeyi (Yuzey); PNG ve PDF'e dışa aktarma.

   Uygulamanın kodundan alınan davranışlar (OSNote 19.1 kaynağı):
   - Kalem tek kalınlıkta çizer, basınç yok; yol orta noktalardan geçen
     ikinci derece eğrilerle yumuşatılır.
   - Şekil çizildikten sonra düzenlenebilir kalır: köşe tutamaçları
     (beyaz daire, mavi kenar) tek tek sürüklenir, gövdeden tutulunca
     şekil taşınır. Köşeli şekillerde her köşenin iç açısı derece
     olarak yazılır; 30/45/60/90/120/135/150'de yazı sarıya döner.
     Açılar çizime işlenmez, yalnız şekil düzenlenirken görünür.
   - Ekran kaleminin silgisi pikselleri siler; defterin silgisi
     dokunduğu çizginin tamamını siler.
   - Fosforlu, rengin %40 saydamı; altındaki yazı görünmeye devam eder.
   Modül değil düz betik: sayfa dosyadan da açılsın.
   ============================================================ */
(function () {
  'use strict';
  var dil = (window.OSN && window.OSN.dil) || function (tr) { return tr; };

  var M = {};

  /* ---------------------------------------------------------- sayılar */
  M.sinirla = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  M.yumusak = function (t) { return t * t * (3 - 2 * t); };
  M.yavasla = function (t) { return 1 - Math.pow(1 - t, 3); };
  // tekrarlanabilir rastgele (sahnelerdeki el titremesi her seferinde aynı çıksın)
  M.tohum = function (s) {
    var t = s >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  };
  M.dpr = function () { return M.sinirla(window.devicePixelRatio || 1, 1, 2.5); };
  M.azHareket = function () {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };

  /* ---------------------------------------------------------- yollar
     Yol = düz dizi [x0, y0, x1, y1, ...] */
  M.uzunluk = function (p) {
    var L = 0;
    for (var i = 2; i < p.length; i += 2) L += Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]);
    return L;
  };

  // yolun baştan L uzunluğundaki kısmı (canlandırma için)
  M.onEk = function (p, L) {
    if (p.length <= 2 || L <= 0) return p.slice(0, 2);
    var o = [p[0], p[1]], top = 0;
    for (var i = 2; i < p.length; i += 2) {
      var dx = p[i] - p[i - 2], dy = p[i + 1] - p[i - 1], d = Math.hypot(dx, dy);
      if (top + d >= L) {
        var k = d ? (L - top) / d : 0;
        o.push(p[i - 2] + dx * k, p[i - 1] + dy * k);
        return o;
      }
      top += d;
      o.push(p[i], p[i + 1]);
    }
    return o;
  };

  // eşit aralıklı yeniden örnekleme (köşeler korunur)
  M.ornekle = function (p, aralik) {
    if (p.length <= 2) return p.slice();
    var o = [p[0], p[1]];
    for (var i = 2; i < p.length; i += 2) {
      var x0 = p[i - 2], y0 = p[i - 1], x1 = p[i], y1 = p[i + 1];
      var d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(d / aralik));
      for (var j = 1; j <= n; j++) o.push(x0 + (x1 - x0) * j / n, y0 + (y1 - y0) * j / n);
    }
    return o;
  };

  // yumuşatılmış yolun kendisini sık noktalara çevirir (orta noktalardan geçen ikinci derece eğriler)
  M.duzlestir = function (p, adim) {
    var n = p.length;
    adim = adim || 1.5;
    if (n <= 4) return M.ornekle(p, adim);
    var o = [p[0], p[1]], ax = p[0], ay = p[1];
    for (var i = 2; i < n - 2; i += 2) {
      var cx = p[i], cy = p[i + 1], bx = (p[i] + p[i + 2]) / 2, by = (p[i + 1] + p[i + 3]) / 2;
      var L = Math.hypot(cx - ax, cy - ay) + Math.hypot(bx - cx, by - cy);
      var k = Math.max(1, Math.ceil(L / adim));
      for (var j = 1; j <= k; j++) {
        var t = j / k, u = 1 - t;
        o.push(u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by);
      }
      ax = bx; ay = by;
    }
    var son = M.ornekle([ax, ay, p[n - 2], p[n - 1]], adim);
    for (var s = 2; s < son.length; s++) o.push(son[s]);
    return o;
  };

  M.yolKur = function (ctx, p, duz) {
    var n = p.length;
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    if (n === 2) { ctx.lineTo(p[0] + 0.01, p[1] + 0.01); return; }
    if (duz || n === 4) {
      for (var i = 2; i < n; i += 2) ctx.lineTo(p[i], p[i + 1]);
      return;
    }
    for (var j = 2; j < n - 2; j += 2) {
      ctx.quadraticCurveTo(p[j], p[j + 1], (p[j] + p[j + 2]) / 2, (p[j + 1] + p[j + 3]) / 2);
    }
    ctx.lineTo(p[n - 2], p[n - 1]);
  };

  M.cizgi = function (ctx, p, renk, kalinlik, duz) {
    if (!p || p.length < 2) return;
    ctx.save();
    ctx.strokeStyle = renk;
    ctx.lineWidth = kalinlik;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    M.yolKur(ctx, p, duz);
    ctx.stroke();
    ctx.restore();
  };

  M.kutu = function (p, k) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (var i = 0; i < p.length; i += 2) {
      if (p[i] < x0) x0 = p[i];
      if (p[i] > x1) x1 = p[i];
      if (p[i + 1] < y0) y0 = p[i + 1];
      if (p[i + 1] > y1) y1 = p[i + 1];
    }
    var y = (k || 0) / 2 + 1;
    return [x0 - y, y0 - y, x1 + y, y1 + y];
  };

  // bir noktanın yola uzaklığının karesi
  M.yolaUzaklik2 = function (p, x, y) {
    var en = Infinity;
    if (p.length === 2) return (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y);
    for (var i = 2; i < p.length; i += 2) {
      var ax = p[i - 2], ay = p[i - 1], dx = p[i] - ax, dy = p[i + 1] - ay, dd = dx * dx + dy * dy;
      var t = dd ? M.sinirla(((x - ax) * dx + (y - ay) * dy) / dd, 0, 1) : 0;
      var ex = ax + dx * t - x, ey = ay + dy * t - y, d = ex * ex + ey * ey;
      if (d < en) en = d;
    }
    return en;
  };

  M.icinde = function (poly, x, y) {
    var ic = false;
    for (var i = 0, j = poly.length - 2; i < poly.length; j = i, i += 2) {
      var xi = poly[i], yi = poly[i + 1], xj = poly[j], yj = poly[j + 1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi)) ic = !ic;
    }
    return ic;
  };

  /* ---------------------------------------------------------- el işi çizgiler (sahneler)
     Hepsi bir parça listesi döndürür: [{ p: yol, duz: bool }] — sırayla çizilir. */

  // yola dik yönde yavaş dalgalanma: elle çizilmiş gibi
  M.titret = function (p, genlik, tohum) {
    var r = M.tohum(tohum || 7);
    var f1 = 0.006 + r() * 0.01, f2 = 0.018 + r() * 0.02, a1 = r() * 6.28, a2 = r() * 6.28;
    var q = M.ornekle(p, 3), o = [], s = 0;
    for (var i = 0; i < q.length; i += 2) {
      var ix = Math.min(i + 2, q.length - 2), jx = Math.max(i - 2, 0);
      var tx = q[ix] - q[jx], ty = q[ix + 1] - q[jx + 1], tl = Math.hypot(tx, ty) || 1;
      if (i) s += Math.hypot(q[i] - q[i - 2], q[i + 1] - q[i - 1]);
      var d = genlik * (0.65 * Math.sin(s * f1 + a1) + 0.35 * Math.sin(s * f2 + a2));
      o.push(q[i] - ty / tl * d, q[i + 1] + tx / tl * d);
    }
    return o;
  };

  // bir şeyi daire içine almak: tam kapanmaz, ucu biraz taşar
  M.halka = function (cx, cy, rx, ry, tohum) {
    var r = M.tohum(tohum || 3);
    var bas = -2.3 + r() * 0.5, tur = Math.PI * 2 * (1.07 + r() * 0.05), egim = (r() - 0.5) * 0.12;
    var o = [], n = 80;
    for (var i = 0; i <= n; i++) {
      var t = i / n, a = bas + tur * t;
      var k = 1 + 0.045 * Math.sin(a * 1.7 + 0.4) + 0.07 * t;
      var x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
      o.push(cx + x * Math.cos(egim) - y * Math.sin(egim), cy + x * Math.sin(egim) + y * Math.cos(egim));
    }
    return [{ p: o }];
  };

  // altını çizmek: hafif yükselen, bir tık kavisli
  M.altCiz = function (x0, x1, y, tohum) {
    var r = M.tohum(tohum || 11), o = [];
    var egim = -(x1 - x0) * (0.012 + r() * 0.012), kavis = 1.5 + r() * 2;
    for (var i = 0; i <= 24; i++) {
      var t = i / 24;
      o.push(x0 + (x1 - x0) * t, y + egim * t + Math.sin(t * Math.PI) * kavis);
    }
    return [{ p: M.titret(o, 0.8, tohum) }];
  };

  // ok: hafif kavisli gövde + iki çizgiyle uç
  M.ok = function (x0, y0, x1, y1, tohum, ucBoy) {
    var r = M.tohum(tohum || 5);
    var dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
    var nx = -dy / L, ny = dx / L, bukum = L * (0.04 + r() * 0.05) * (r() < 0.5 ? -1 : 1);
    var govde = [];
    for (var i = 0; i <= 20; i++) {
      var t = i / 20, b = Math.sin(t * Math.PI) * bukum;
      govde.push(x0 + dx * t + nx * b, y0 + dy * t + ny * b);
    }
    var n = govde.length;
    var ax = govde[n - 2] - govde[n - 6], ay = govde[n - 1] - govde[n - 5], al = Math.hypot(ax, ay) || 1;
    ax /= al; ay /= al;
    var u = ucBoy || M.sinirla(L * 0.22, 12, 26), c1 = Math.cos(0.48), s1 = Math.sin(0.48);
    var uc = [x1 - u * (ax * c1 - ay * s1), y1 - u * (ay * c1 + ax * s1), x1, y1, x1 - u * (ax * c1 + ay * s1), y1 - u * (ay * c1 - ax * s1)];
    return [{ p: M.titret(govde, 0.9, tohum) }, { p: uc, duz: true }];
  };

  // tik işareti
  M.tik = function (x, y, boy, tohum) {
    var r = M.tohum(tohum || 13);
    var a = [x - boy * 0.42, y - boy * 0.02];
    var b = [x - boy * 0.08, y + boy * 0.34];
    var c = [x + boy * (0.52 + r() * 0.08), y - boy * (0.52 + r() * 0.06)];
    var o = [];
    for (var i = 0; i <= 8; i++) { var t = i / 8; o.push(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * 2); }
    for (var j = 1; j <= 14; j++) { var s = j / 14; o.push(b[0] + (c[0] - b[0]) * s, b[1] + (c[1] - b[1]) * s - Math.sin(s * Math.PI) * boy * 0.06); }
    return [{ p: o }];
  };

  /* ---------------------------------------------------------- şekiller
     Ekran kaleminde altı şekil: çizgi, ok, dikdörtgen, elips, üçgen, yıldız.
     Defterde on şekil: çizgi, ok, çift ok, yay, elips, üçgen, dik üçgen,
     dikdörtgen, beşgen, yıldız. Her şekil denetim noktalarıyla (v) tutulur. */
  M.SEKIL_AD = {
    cizgi: dil('Çizgi', 'Line'), ok: dil('Ok', 'Arrow'), ciftok: dil('Çift ok', 'Double arrow'), yay: dil('Yay', 'Arc'),
    elips: dil('Elips', 'Oval'), ucgen: dil('Üçgen', 'Triangle'),
    dikucgen: dil('Dik üçgen', 'Right triangle'), dikdortgen: dil('Dikdörtgen', 'Rectangle'),
    besgen: dil('Beşgen', 'Pentagon'), yildiz: dil('Yıldız', 'Star')
  };
  var KOSELI = { dikdortgen: 1, ucgen: 1, dikucgen: 1, besgen: 1, yildiz: 1 };
  var UCLU = { cizgi: 1, ok: 1, ciftok: 1 };
  M.koseliMi = function (s) { return !!KOSELI[s]; };

  // sürüklemenin başı (ax, ay) ve sonu (bx, by) → denetim noktaları
  M.sekilKur = function (tur, ax, ay, bx, by) {
    if (UCLU[tur]) return [ax, ay, bx, by];
    var x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), y0 = Math.min(ay, by), y1 = Math.max(ay, by);
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2, v, i;
    switch (tur) {
      case 'dikdortgen': return [x0, y0, x1, y0, x1, y1, x0, y1];
      case 'ucgen': return [cx, y0, x1, y1, x0, y1];
      case 'dikucgen': return [x0, y0, x1, y1, x0, y1];
      case 'besgen':
        v = [];
        for (i = 0; i < 5; i++) { var a = -Math.PI / 2 + i * Math.PI * 2 / 5; v.push(cx + Math.cos(a) * rx, cy + 0.05 * ry + Math.sin(a) * ry); }
        return v;
      case 'yildiz':
        v = [];
        for (i = 0; i < 10; i++) {
          var b = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? 0.4 : 1;
          v.push(cx + Math.cos(b) * rx * k, cy + 0.05 * ry + Math.sin(b) * ry * k);
        }
        return v;
      default: return [x0, y0, x1, y1]; // elips, yay: kutu
    }
  };

  // denetim noktaları → çizilecek yol (tek parça)
  M.sekilYol = function (tur, v, k) {
    var o, i;
    if (KOSELI[tur]) { o = v.slice(); o.push(v[0], v[1]); return o; }
    if (tur === 'elips' || tur === 'yay') {
      var cx = (v[0] + v[2]) / 2, cy = (v[1] + v[3]) / 2, rx = Math.abs(v[2] - v[0]) / 2, ry = Math.abs(v[3] - v[1]) / 2;
      var n = Math.max(28, Math.ceil((rx + ry) / 2.5)), bas = tur === 'yay' ? Math.PI : 0, tur2 = tur === 'yay' ? Math.PI : Math.PI * 2;
      if (tur === 'yay') { cy = Math.max(v[1], v[3]); ry = Math.abs(v[3] - v[1]); }
      o = [];
      for (i = 0; i <= n; i++) { var t = bas + tur2 * i / n; o.push(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry); }
      return o;
    }
    var ax = v[0], ay = v[1], bx = v[2], by = v[3];
    if (tur === 'cizgi') return [ax, ay, bx, by];
    var dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    var u = M.sinirla(L * 0.28, 9, 18 + (k || 4) * 2), c = Math.cos(0.45), s = Math.sin(0.45);
    var bUc = [bx - u * (ux * c - uy * s), by - u * (uy * c + ux * s), bx, by, bx - u * (ux * c + uy * s), by - u * (uy * c - ux * s)];
    if (tur === 'ok') return [ax, ay, bx, by].concat(bUc.slice(0, 2), [bx, by], bUc.slice(4));
    var aUc = [ax + u * (ux * c - uy * s), ay + u * (uy * c + ux * s), ax, ay, ax + u * (ux * c + uy * s), ay + u * (uy * c - ux * s)];
    return aUc.concat([bx, by], bUc.slice(0, 2), [bx, by], bUc.slice(4));
  };

  // tutamaçlar: köşeli şekilde her köşe, uçlu şekilde iki uç, elips/yayda kutunun dört köşesi
  M.tutamaclar = function (tur, v) {
    if (KOSELI[tur] || UCLU[tur]) return v.slice();
    return [v[0], v[1], v[2], v[1], v[2], v[3], v[0], v[3]];
  };
  // tutamaç i sürüklenince yeni denetim noktaları
  M.tutamacTasi = function (tur, v, i, x, y) {
    var o = v.slice();
    if (KOSELI[tur] || UCLU[tur]) { o[i * 2] = x; o[i * 2 + 1] = y; return o; }
    // kutu: sürüklenen köşe ile karşı köşe
    var kose = [[v[0], v[1]], [v[2], v[1]], [v[2], v[3]], [v[0], v[3]]], karsi = kose[(i + 2) % 4];
    return [karsi[0], karsi[1], x, y];
  };

  // köşeli şeklin iç açıları (uygulamadaki hesabın aynısı)
  M.acilar = function (v) {
    var n = v.length / 2, o = [];
    for (var i = 0; i < n; i++) {
      var vx = v[i * 2], vy = v[i * 2 + 1];
      var px = v[((i - 1 + n) % n) * 2], py = v[((i - 1 + n) % n) * 2 + 1];
      var nx = v[((i + 1) % n) * 2], ny = v[((i + 1) % n) * 2 + 1];
      var d = Math.abs(Math.atan2(py - vy, px - vx) - Math.atan2(ny - vy, nx - vx));
      if (d > Math.PI) d = 2 * Math.PI - d;
      o.push(Math.round(d * 180 / Math.PI));
    }
    return o;
  };
  var GUZEL = [30, 45, 60, 90, 120, 135, 150];

  // düzenlenen şeklin tutamaçları ve açıları (ekran birimiyle sabit boyut: olcek = birim→CSS px)
  M.sekilSusu = function (c, tur, v, olcek, dpr) {
    var h = M.tutamaclar(tur, v), r = 7 / olcek;
    c.save();
    for (var i = 0; i < h.length; i += 2) {
      c.beginPath();
      c.arc(h[i], h[i + 1], r, 0, 6.2832);
      c.fillStyle = '#FFFFFF';
      c.fill();
      c.lineWidth = 1.6 / olcek;
      c.strokeStyle = '#3B82F6';
      c.stroke();
    }
    if (KOSELI[tur]) {
      var a = M.acilar(v), n = v.length / 2, mx = 0, my = 0;
      for (var j = 0; j < n; j++) { mx += v[j * 2]; my += v[j * 2 + 1]; }
      mx /= n; my /= n;
      c.font = '800 ' + (12.5 / olcek) + 'px Manrope, system-ui, sans-serif';
      c.textAlign = 'center';
      // uygulamadaki beyaz yazı + koyu gölgenin karşılığı: önce koyu kontur, sonra yazı. Bulanık gölge
      // kullanılmaz (ekran kartı olmayan cihazda her karede pahalı); beyaz kâğıtta da okunur.
      c.lineJoin = 'round';
      c.lineWidth = 3.2 / olcek;
      c.strokeStyle = 'rgba(17,17,17,0.82)';
      // yazı açıortayın üstünde, açının iki kolunun arasına sığacak uzaklıkta (dar açıda daha uzak; dik açının
      // işaretine değmesin diye en az 30 px)
      for (var k = 0; k < n; k++) {
        var vx = v[k * 2], vy = v[k * 2 + 1], o1 = ((k + n - 1) % n) * 2, o2 = ((k + 1) % n) * 2;
        var ax = v[o1] - vx, ay = v[o1 + 1] - vy, bx = v[o2] - vx, by = v[o2 + 1] - vy;
        var al = Math.max(1, Math.hypot(ax, ay)), bl = Math.max(1, Math.hypot(bx, by));
        ax /= al; ay /= al; bx /= bl; by /= bl;
        var ox = ax + bx, oy = ay + by, ol = Math.hypot(ox, oy);
        if (ol < 0.01) { ox = mx - vx; oy = my - vy; ol = Math.max(1, Math.hypot(ox, oy)); }
        ox /= ol; oy /= ol;
        var yarim = Math.acos(M.sinirla(ax * bx + ay * by, -1, 1)) / 2, en = c.measureText(a[k] + '°').width / 2 + 5 / olcek;
        var uz = M.sinirla(en / Math.max(0.1, Math.sin(yarim)), 30 / olcek, 84 / olcek);
        var tx = vx + ox * uz, ty = vy + oy * uz + 4.5 / olcek;
        c.strokeText(a[k] + '°', tx, ty);
        c.fillStyle = GUZEL.indexOf(a[k]) >= 0 ? '#FFC107' : '#FFFFFF';
        c.fillText(a[k] + '°', tx, ty);
      }
    }
    c.restore();
  };

  /* ---------------------------------------------------------- kâğıt
     Uygulamadaki dört desen: boş, kareli, çizgili, noktalı. */
  M.kagit = function (ctx, w, h, desen, zemin, cizgiRengi, aralik, kenarCizgisi) {
    ctx.save();
    ctx.fillStyle = zemin;
    ctx.fillRect(0, 0, w, h);
    var a = aralik || 24, t = Math.max(0.6, a / 34);
    ctx.fillStyle = cizgiRengi;
    if (desen === 'kareli') {
      for (var x = a; x < w; x += a) ctx.fillRect(x - t / 2, 0, t, h);
      for (var y = a; y < h; y += a) ctx.fillRect(0, y - t / 2, w, t);
    } else if (desen === 'cizgili') {
      for (var y2 = a * 2; y2 < h; y2 += a) ctx.fillRect(0, y2 - t / 2, w, t);
      if (kenarCizgisi) { ctx.fillStyle = kenarCizgisi; ctx.fillRect(a * 2.4, 0, t * 1.3, h); }
    } else if (desen === 'noktali') {
      var r = Math.max(0.8, a / 20);
      for (var y3 = a; y3 < h; y3 += a) {
        for (var x3 = a; x3 < w; x3 += a) { ctx.beginPath(); ctx.arc(x3, y3, r, 0, 6.2832); ctx.fill(); }
      }
    }
    ctx.restore();
  };

  /* ---------------------------------------------------------- fosforlu
     Tek parça saydam: kendi üstüne binen yeri koyulaştırmaz. Uygulamada rengin %40'ı.
     Çağıran bağlamın dönüşümü yalnız ölçek olmalı (öteleme yok): burada cihaz pikseline dönülür. */
  var fosTuval = null;
  M.fosforlu = function (c, p, renk, k, olcek) {
    var kutu = M.kutu(p, k);
    var w = Math.ceil((kutu[2] - kutu[0]) * olcek) + 2, h = Math.ceil((kutu[3] - kutu[1]) * olcek) + 2;
    if (w <= 2 || h <= 2 || w * h > 16e6) return;
    if (!fosTuval) fosTuval = document.createElement('canvas');
    if (fosTuval.width < w || fosTuval.height < h) {
      fosTuval.width = Math.max(w, fosTuval.width);
      fosTuval.height = Math.max(h, fosTuval.height);
    }
    var f = fosTuval.getContext('2d');
    f.setTransform(1, 0, 0, 1, 0, 0);
    f.clearRect(0, 0, w, h);
    f.setTransform(olcek, 0, 0, olcek, -kutu[0] * olcek + 1, -kutu[1] * olcek + 1);
    f.strokeStyle = renk;
    f.lineWidth = k;
    f.lineCap = 'round';
    f.lineJoin = 'round';
    M.yolKur(f, p, false);
    f.stroke();
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 0.4;
    c.drawImage(fosTuval, 0, 0, w, h, Math.round(kutu[0] * olcek) - 1, Math.round(kutu[1] * olcek) - 1, w, h);
    c.restore();
  };

  // başka bir bağlama (dışa aktarma, küçük resim) bütün işlemleri çizer; olcek = birimden cihaz pikseline
  M.opsCiz = function (c, ops, olcek) {
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      if (op.tur === 'fosforlu') M.fosforlu(c, op.p, op.renk, op.k, olcek);
      else M.cizgi(c, op.p, op.renk, op.k, !!op.sekil);
    }
  };

  /* ---------------------------------------------------------- çizim yüzeyi
     Tuvalin üstüne işlem listesi (ops) çizer. İşlemler değişmez nesnelerdir; geri al / yinele
     listenin anlık kopyalarını (yalnız başvurular) tutar.
     İşlem: { tur: 'kalem' | 'fosforlu', renk, k, p: sık noktalı yol, sekil?, v? (şeklin denetim noktaları) } */
  function Yuzey(tuval, ayar) {
    this.tuval = tuval;
    this.ctx = tuval.getContext('2d');
    this.ayar = ayar || {};
    this.ops = [];
    this.geri = [];
    this.ileri = [];
    this.olcek = 1;          // birim → CSS piksel
    this.dpr = 1;
    this.canli = null;       // çizilmekte olan serbest çizgi
    this.aktif = null;       // düzenlenen şekil (ops içindeki nesnenin kendisi)
    this.secim = null;       // kementle seçilenler
    this.kement = null;      // çizilmekte olan kement yolu
    this.gizli = false;
    this.sinir = this.ayar.sinir || 80;
    this.degisti = null;
  }
  Yuzey.prototype.boyutla = function (cssW, cssH, olcek, dpr) {
    var d = dpr || M.dpr();
    var w = Math.max(1, Math.round(cssW * d)), h = Math.max(1, Math.round(cssH * d));
    if (this.tuval.width !== w) this.tuval.width = w;
    if (this.tuval.height !== h) this.tuval.height = h;
    this.dpr = w / Math.max(1, cssW);
    this.olcek = olcek || 1;
    this.cssW = cssW;
    this.cssH = cssH;
    this.ciz();
  };
  Yuzey.prototype.kaydet = function () {
    this.geri.push(this.ops);
    if (this.geri.length > this.sinir) this.geri.shift();
    this.ileri = [];
  };
  Yuzey.prototype.geriAl = function () {
    if (!this.geri.length) return false;
    this.ileri.push(this.ops);
    this.ops = this.geri.pop();
    this.aktif = null; this.secim = null;
    this.ciz(); this.haber();
    return true;
  };
  Yuzey.prototype.yinele = function () {
    if (!this.ileri.length) return false;
    this.geri.push(this.ops);
    this.ops = this.ileri.pop();
    this.aktif = null; this.secim = null;
    this.ciz(); this.haber();
    return true;
  };
  Yuzey.prototype.temizle = function () {
    if (!this.ops.length) return false;
    this.kaydet();
    this.ops = [];
    this.aktif = null; this.secim = null;
    this.ciz(); this.haber();
    return true;
  };
  Yuzey.prototype.sifirla = function (ops) {
    this.ops = ops || [];
    this.geri = []; this.ileri = [];
    this.aktif = null; this.secim = null; this.canli = null; this.kement = null;
    this.ciz();
  };
  Yuzey.prototype.haber = function () { if (this.degisti) this.degisti(this); };
  Yuzey.prototype.birak = function () {
    var d = !!(this.aktif || this.secim);
    this.aktif = null; this.secim = null;
    if (d) this.ciz();
  };

  // ---- çizim
  Yuzey.prototype.baglam = function () {
    var c = this.ctx, s = this.dpr * this.olcek;
    c.setTransform(s, 0, 0, s, 0, 0);
    return c;
  };
  // Bitmiş işlemler bir önbellek tuvalinde durur: yazarken her karede yalnız canlı çizgi çizilir.
  Yuzey.prototype.onbellek = function () {
    var ob = this.ob || (this.ob = document.createElement('canvas')), s = this.dpr * this.olcek;
    if (ob.width !== this.tuval.width || ob.height !== this.tuval.height) {
      ob.width = this.tuval.width;
      ob.height = this.tuval.height;
      this.obOps = null;
    }
    if (this.obOps !== this.ops || this.obOlcek !== s) {
      var x = ob.getContext('2d');
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(0, 0, ob.width, ob.height);
      x.setTransform(s, 0, 0, s, 0, 0);
      M.opsCiz(x, this.ops, s);
      this.obOps = this.ops;
      this.obOlcek = s;
    }
    return ob;
  };
  Yuzey.prototype.birakBellek = function () { if (this.ob) { this.ob.width = 0; this.ob.height = 0; this.ob = null; } this.obOps = null; };
  Yuzey.prototype.ciz = function () {
    var c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.tuval.width, this.tuval.height);
    if (this.gizli) return;
    c.drawImage(this.onbellek(), 0, 0);
    this.baglam();
    var s = this.dpr * this.olcek, h = this.secim && this.secim.harita;
    if (h) {
      for (var i = 0; i < this.ops.length; i++) {
        if (!h[i]) continue;
        c.save();
        c.globalAlpha = 0.55;
        M.cizgi(c, this.ops[i].p, '#ffffff', Math.max(1 / this.olcek, this.ops[i].k * 0.3), !!this.ops[i].sekil);
        c.restore();
      }
    }
    if (this.canli) {
      if (this.canli.tur === 'fosforlu') M.fosforlu(c, this.canli.p, this.canli.renk, this.canli.k, s);
      else M.cizgi(c, this.canli.p, this.canli.renk, this.canli.k, false);
    }
    if (this.aktif && this.ops.indexOf(this.aktif) >= 0) M.sekilSusu(c, this.aktif.sekil, this.aktif.v, this.olcek, this.dpr);
    if (this.secim) this.secimCiz(c);
    if (this.kement) this.kementCiz(c);
    if (this.ayar.sonra) this.ayar.sonra(c);
  };
  Yuzey.prototype.secimCiz = function (c) {
    var k = this.secim.kutu, pay = 6 / this.olcek;
    c.save();
    c.lineWidth = 1.3 / this.olcek;
    c.setLineDash([6 / this.olcek, 4 / this.olcek]);
    c.strokeStyle = '#3B82F6';
    c.strokeRect(k[0] - pay, k[1] - pay, k[2] - k[0] + pay * 2, k[3] - k[1] + pay * 2);
    c.restore();
  };
  Yuzey.prototype.kementCiz = function (c) {
    c.save();
    c.lineWidth = 1.4 / this.olcek;
    c.setLineDash([5 / this.olcek, 4 / this.olcek]);
    c.strokeStyle = '#3B82F6';
    c.fillStyle = 'rgba(59,130,246,0.06)';
    M.yolKur(c, this.kement, true);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  };

  // ---- serbest çizgi (kalem, fosforlu)
  Yuzey.prototype.baslat = function (tur, renk, k, x, y) {
    this.aktif = null; this.secim = null;
    this.canli = { tur: tur, renk: renk, k: k, p: [x, y] };
    this.ciz();
  };
  Yuzey.prototype.surdur = function (x, y) {
    var c = this.canli;
    if (!c) return;
    var n = c.p.length;
    // uygulamadaki gibi çok küçük kıpırtıyı yok say (~0,77 px)
    if (Math.hypot(x - c.p[n - 2], y - c.p[n - 1]) * this.olcek < 0.77) return;
    c.p.push(x, y);
    this.ciz();
  };
  Yuzey.prototype.bitir = function () {
    var c = this.canli;
    this.canli = null;
    if (!c) return null;
    var adim = Math.max(0.5, 1.5 / this.olcek);
    var p = c.p.length === 2 ? [c.p[0], c.p[1], c.p[0] + 0.01, c.p[1] + 0.01] : M.duzlestir(c.p, adim);
    var op = { tur: c.tur, renk: c.renk, k: c.k, p: p };
    this.kaydet();
    this.ops = this.ops.concat([op]);
    this.ciz(); this.haber();
    return op;
  };
  Yuzey.prototype.vazgec = function () { this.canli = null; this.kement = null; this.ciz(); };

  // ---- şekil: çiz, sonra düzenle
  Yuzey.prototype.sekilOp = function (tur, v, renk, k) {
    return { tur: 'kalem', renk: renk, k: k, sekil: tur, v: v, p: M.ornekle(M.sekilYol(tur, v, k), Math.max(0.6, 1.5 / this.olcek)) };
  };
  Yuzey.prototype.sekilBaslat = function (tur, renk, k, x, y) {
    this.secim = null;
    this.yeniSekil = { tur: tur, renk: renk, k: k, x: x, y: y, op: null, oncesi: this.ops };
  };
  Yuzey.prototype.sekilSurukle = function (x, y) {
    var s = this.yeniSekil;
    if (!s) return;
    var op = this.sekilOp(s.tur, M.sekilKur(s.tur, s.x, s.y, x, y), s.renk, s.k);
    this.ops = s.op ? this.ops.map(function (o) { return o === s.op ? op : o; }) : s.oncesi.concat([op]);
    s.op = op;
    this.aktif = op;
    this.ciz();
  };
  Yuzey.prototype.sekilBitir = function () {
    var s = this.yeniSekil;
    this.yeniSekil = null;
    if (!s) return null;
    if (!s.op) { this.ciz(); return null; }
    var kk = M.kutu(s.op.v, 0);
    if (Math.max(kk[2] - kk[0], kk[3] - kk[1]) * this.olcek < 8) {
      this.ops = s.oncesi; this.aktif = null; this.ciz(); return null;
    }
    this.geri.push(s.oncesi);
    if (this.geri.length > this.sinir) this.geri.shift();
    this.ileri = [];
    this.aktif = s.op;
    this.ciz(); this.haber();
    return s.op;
  };
  // düzenlenen şeklin neresine dokunuldu: { tutamac: i } | { govde: true } | null
  Yuzey.prototype.sekilDokunus = function (x, y) {
    var a = this.aktif;
    if (!a || this.ops.indexOf(a) < 0) return null;
    var h = M.tutamaclar(a.sekil, a.v), r = 26 / this.olcek, en = -1, enD = r * r;
    for (var i = 0; i < h.length; i += 2) {
      var d = (h[i] - x) * (h[i] - x) + (h[i + 1] - y) * (h[i + 1] - y);
      if (d <= enD) { enD = d; en = i / 2; }
    }
    if (en >= 0) return { tutamac: en };
    var yakin = (a.k / 2 + 12 / this.olcek);
    if (M.yolaUzaklik2(a.p, x, y) <= yakin * yakin) return { govde: true };
    if (KOSELI[a.sekil] && M.icinde(a.v, x, y)) return { govde: true };
    return null;
  };
  Yuzey.prototype.duzenBaslat = function (dokunus, x, y) {
    this.duzen = { d: dokunus, x: x, y: y, op: this.aktif, oncesi: this.ops, degisti: false };
  };
  Yuzey.prototype.duzenSurukle = function (x, y) {
    var z = this.duzen;
    if (!z) return;
    var eski = z.op, v;
    if (z.d.tutamac !== undefined) v = M.tutamacTasi(eski.sekil, eski.v, z.d.tutamac, x, y);
    else {
      var dx = x - z.x, dy = y - z.y;
      v = eski.v.map(function (n, i) { return n + (i % 2 ? dy : dx); });
    }
    var op = this.sekilOp(eski.sekil, v, eski.renk, eski.k);
    this.ops = z.oncesi.map(function (o) { return o === eski ? op : o; });
    this.aktif = op;
    z.degisti = true;
    this.ciz();
  };
  Yuzey.prototype.duzenBitir = function () {
    var z = this.duzen;
    this.duzen = null;
    if (!z || !z.degisti) return;
    this.geri.push(z.oncesi);
    if (this.geri.length > this.sinir) this.geri.shift();
    this.ileri = [];
    this.haber();
  };

  // ---- silgi (ekran kalemi): (x0,y0)→(x1,y1) kesimine değen noktaları atar, çizgiyi böler
  Yuzey.prototype.silBaslat = function () { this.silKayit = false; this.aktif = null; this.secim = null; };
  Yuzey.prototype.sil = function (x0, y0, x1, y1, r) {
    var ops = this.ops, yeni = null, bx0 = Math.min(x0, x1) - r, bx1 = Math.max(x0, x1) + r, by0 = Math.min(y0, y1) - r, by1 = Math.max(y0, y1) + r;
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i], kk = kutuAl(op);
      if (kk[2] < bx0 || kk[0] > bx1 || kk[3] < by0 || kk[1] > by1) { if (yeni) yeni.push(op); continue; }
      var parcalar = kes(op, x0, y0, x1, y1, r + op.k / 2);
      if (parcalar === null) { if (yeni) yeni.push(op); continue; }
      if (!yeni) yeni = ops.slice(0, i);
      for (var j = 0; j < parcalar.length; j++) yeni.push(parcalar[j]);
    }
    if (!yeni) return false;
    if (!this.silKayit) { this.geri.push(this.ops); if (this.geri.length > this.sinir) this.geri.shift(); this.ileri = []; this.silKayit = true; }
    this.ops = yeni;
    this.ciz();
    return true;
  };
  // ---- silgi (defter): değdiği çizginin tamamını siler
  Yuzey.prototype.silButun = function (x0, y0, x1, y1, r) {
    var ops = this.ops, kalan = [], silindi = false;
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i], kk = kutuAl(op), rr = r + op.k / 2;
      if (kk[2] < Math.min(x0, x1) - r || kk[0] > Math.max(x0, x1) + r || kk[3] < Math.min(y0, y1) - r || kk[1] > Math.max(y0, y1) + r) { kalan.push(op); continue; }
      if (kes(op, x0, y0, x1, y1, rr) === null) kalan.push(op);
      else silindi = true;
    }
    if (!silindi) return false;
    if (!this.silKayit) { this.geri.push(this.ops); if (this.geri.length > this.sinir) this.geri.shift(); this.ileri = []; this.silKayit = true; }
    this.ops = kalan;
    this.ciz();
    return true;
  };
  Yuzey.prototype.silBitir = function () { if (this.silKayit) this.haber(); this.silKayit = false; };

  var kutular = typeof WeakMap === 'function' ? new WeakMap() : null;
  function kutuAl(op) {
    if (!kutular) return M.kutu(op.p, op.k);
    var k = kutular.get(op);
    if (!k) { k = M.kutu(op.p, op.k); kutular.set(op, k); }
    return k;
  }

  function kes(op, x0, y0, x1, y1, r) {
    var p = op.p, dx = x1 - x0, dy = y1 - y0, dd = dx * dx + dy * dy, rr = r * r, degdi = false;
    var tut = new Array(p.length / 2);
    for (var i = 0; i < p.length; i += 2) {
      var t = dd ? M.sinirla(((p[i] - x0) * dx + (p[i + 1] - y0) * dy) / dd, 0, 1) : 0;
      var ex = x0 + dx * t - p[i], ey = y0 + dy * t - p[i + 1];
      var ic = ex * ex + ey * ey <= rr;
      tut[i / 2] = !ic;
      if (ic) degdi = true;
    }
    if (!degdi) return null;
    var o = [], cur = [];
    for (var j = 0; j < tut.length; j++) {
      if (tut[j]) cur.push(p[j * 2], p[j * 2 + 1]);
      else if (cur.length) { o.push(cur); cur = []; }
    }
    if (cur.length) o.push(cur);
    var sonuc = [];
    for (var k = 0; k < o.length; k++) {
      if (o[k].length < 4) continue; // tek noktalık kırıntı kalmasın
      // silinen şekil artık düzenlenebilir bir şekil değil, düz çizgi parçası
      sonuc.push({ tur: op.tur, renk: op.renk, k: op.k, p: o[k] });
    }
    return sonuc;
  }

  // ---- kement
  Yuzey.prototype.kementBaslat = function (x, y) { this.aktif = null; this.secim = null; this.kement = [x, y]; this.ciz(); };
  Yuzey.prototype.kementSurdur = function (x, y) {
    if (!this.kement) return;
    var n = this.kement.length;
    if (Math.hypot(x - this.kement[n - 2], y - this.kement[n - 1]) * this.olcek < 2) return;
    this.kement.push(x, y);
    this.ciz();
  };
  // kementi kapat ve içindekileri seç; tek şekil seçildiyse şekil düzenlemesine geçer
  Yuzey.prototype.kementBitir = function () {
    var cokgen = this.kement;
    this.kement = null;
    if (!cokgen || cokgen.length < 6) { this.ciz(); return 0; }
    var harita = {}, idx = [], kutu = [Infinity, Infinity, -Infinity, -Infinity];
    for (var i = 0; i < this.ops.length; i++) {
      var p = this.ops[i].p, ic = 0, top = 0, adim = Math.max(2, Math.floor(p.length / 40) * 2);
      for (var j = 0; j < p.length; j += adim) { top++; if (M.icinde(cokgen, p[j], p[j + 1])) ic++; }
      if (top && ic / top >= 0.5) {
        harita[i] = true; idx.push(i);
        var b = kutuAl(this.ops[i]);
        kutu = [Math.min(kutu[0], b[0]), Math.min(kutu[1], b[1]), Math.max(kutu[2], b[2]), Math.max(kutu[3], b[3])];
      }
    }
    if (idx.length === 1 && this.ops[idx[0]].sekil) {
      this.aktif = this.ops[idx[0]];
      this.secim = null;
    } else {
      this.secim = idx.length ? { idx: idx, harita: harita, kutu: kutu } : null;
    }
    this.ciz();
    return idx.length;
  };
  Yuzey.prototype.secimIcinde = function (x, y) {
    if (!this.secim) return false;
    var k = this.secim.kutu, pay = 10 / this.olcek;
    return x >= k[0] - pay && x <= k[2] + pay && y >= k[1] - pay && y <= k[3] + pay;
  };
  // taşırken görünüm kayar; bırakınca geri alınabilir bir adım olarak yazılır
  Yuzey.prototype.tasi = function (dx, dy, bitti) {
    var s = this.secim;
    if (!s) return;
    if (!s.asil) { s.asil = this.ops; s.kutuAsil = s.kutu.slice(); }
    var yeni = s.asil.slice();
    for (var i = 0; i < s.idx.length; i++) {
      var op = s.asil[s.idx[i]], p = new Array(op.p.length);
      for (var j = 0; j < p.length; j += 2) { p[j] = op.p[j] + dx; p[j + 1] = op.p[j + 1] + dy; }
      var yop = { tur: op.tur, renk: op.renk, k: op.k, p: p };
      if (op.sekil) { yop.sekil = op.sekil; yop.v = op.v.map(function (v, n) { return v + (n % 2 ? dy : dx); }); }
      yeni[s.idx[i]] = yop;
    }
    this.ops = yeni;
    var b = s.kutuAsil;
    s.kutu = [b[0] + dx, b[1] + dy, b[2] + dx, b[3] + dy];
    if (bitti) {
      if (dx || dy) { this.geri.push(s.asil); if (this.geri.length > this.sinir) this.geri.shift(); this.ileri = []; this.haber(); }
      s.asil = null; s.kutuAsil = null;
    }
    this.ciz();
  };
  Yuzey.prototype.secileniSil = function () {
    var h = this.secim ? this.secim.harita : null, a = this.aktif;
    if (!h && !a) return false;
    this.kaydet();
    this.ops = this.ops.filter(function (o, i) { return h ? !h[i] : o !== a; });
    this.secim = null; this.aktif = null;
    this.ciz(); this.haber();
    return true;
  };

  M.Yuzey = Yuzey;

  /* ---------------------------------------------------------- dışa aktarma */
  M.indir = function (blob, ad) {
    var u = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = u;
    a.download = ad;
    a.rel = 'noopener';
    a.hidden = true;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 60000);
  };

  M.tuvalBlob = function (tuval, tur, kalite) {
    return new Promise(function (ok, hata) {
      if (tuval.toBlob) {
        tuval.toBlob(function (b) { b ? ok(b) : hata(new Error('görüntü üretilemedi')); }, tur, kalite);
      } else {
        try {
          var d = tuval.toDataURL(tur, kalite), ikili = atob(d.split(',')[1]), u8 = new Uint8Array(ikili.length);
          for (var i = 0; i < ikili.length; i++) u8[i] = ikili.charCodeAt(i);
          ok(new Blob([u8], { type: tur }));
        } catch (e) { hata(e); }
      }
    });
  };

  M.blobBayt = function (blob) {
    if (blob.arrayBuffer) return blob.arrayBuffer().then(function (b) { return new Uint8Array(b); });
    return new Promise(function (ok, hata) {
      var r = new FileReader();
      r.onload = function () { ok(new Uint8Array(r.result)); };
      r.onerror = function () { hata(r.error); };
      r.readAsArrayBuffer(blob);
    });
  };

  // En küçük PDF: her sayfa bir JPEG görüntü (DCTDecode). sayfalar: [{ jpeg: Uint8Array, px: [w, h], pt: [w, h] }]
  M.pdf = function (sayfalar, baslik) {
    var parca = [], konum = 0, yer = [];
    function ekle(x) {
      var b;
      if (typeof x === 'string') {
        b = new Uint8Array(x.length);
        for (var i = 0; i < x.length; i++) b[i] = x.charCodeAt(i) & 0xff;
      } else b = x;
      parca.push(b);
      konum += b.length;
    }
    function nesne(no, govde) { yer[no] = konum; ekle(no + ' 0 obj\n'); govde(); ekle('\nendobj\n'); }
    var n = sayfalar.length, sayfaNo = [];
    for (var s = 0; s < n; s++) sayfaNo.push(4 + s * 3);
    var ad = String(baslik || 'OSNote').replace(/[^\x20-\x7e]/g, '').replace(/[()\\]/g, '');
    ekle('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    nesne(1, function () { ekle('<< /Type /Catalog /Pages 2 0 R >>'); });
    nesne(2, function () { ekle('<< /Type /Pages /Count ' + n + ' /Kids [' + sayfaNo.map(function (k) { return k + ' 0 R'; }).join(' ') + '] >>'); });
    nesne(3, function () { ekle('<< /Producer (OSNote tanitim sitesi) /Title (' + ad + ') >>'); });
    sayfalar.forEach(function (sf, i) {
      var p = sayfaNo[i], w = sf.pt[0].toFixed(2), h = sf.pt[1].toFixed(2);
      var icerik = 'q ' + w + ' 0 0 ' + h + ' 0 0 cm /Im0 Do Q';
      nesne(p, function () {
        ekle('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + w + ' ' + h + '] /Resources << /XObject << /Im0 ' + (p + 2) + ' 0 R >> >> /Contents ' + (p + 1) + ' 0 R >>');
      });
      nesne(p + 1, function () { ekle('<< /Length ' + icerik.length + ' >>\nstream\n' + icerik + '\nendstream'); });
      nesne(p + 2, function () {
        ekle('<< /Type /XObject /Subtype /Image /Width ' + sf.px[0] + ' /Height ' + sf.px[1] + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + sf.jpeg.length + ' >>\nstream\n');
        ekle(sf.jpeg);
        ekle('\nendstream');
      });
    });
    var xref = konum, toplam = 4 + n * 3;
    var t = 'xref\n0 ' + toplam + '\n0000000000 65535 f \n';
    for (var k = 1; k < toplam; k++) t += ('0000000000' + yer[k]).slice(-10) + ' 00000 n \n';
    t += 'trailer\n<< /Size ' + toplam + ' /Root 1 0 R /Info 3 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
    ekle(t);
    return new Blob(parca, { type: 'application/pdf' });
  };

  window.OSN = window.OSN || {};
  window.OSN.m = M;
})();
