/* ============================================================
   OSNote tanıtım sitesi · cihaz ekranları
   ------------------------------------------------------------
   Giriş, uygulamalar (katman sahnesi), "Kalem ve El" tableti,
   araç çubuğunun anatomisi, şekiller ve sayfa bölümleri.
   - Cihazların içi DOM'dur (Android arayüzü, bu site için hazırlandı);
     videoların kareleri videolar.js'te çizilir.
   - Mürekkep ekranın üstündeki tuvaldedir; çizgi OSNote'un kalemiyle
     aynı: tek kalınlık, uçlar yuvarlak. El yazıları el-yazisi.js'teki
     kalem çizgilerinden, her çizgi kendi hızıyla yazılır (sahne.js).
   - Çubuk uygulamadaki gibi El modunda başlar (OverlayService.kt:
     "her ilk açılışta El modu aktif"). Renge dokunmak kalemi seçer.
   - Hareket azaltılmışsa her sahne son hâliyle çizilir.
   ============================================================ */
(function () {
  'use strict';
  var OSN = window.OSN || (window.OSN = {});
  var dil = OSN.dil || function (tr) { return tr; };
  var M = OSN.m, S = OSN.sahne, V = OSN.videolar;
  if (!M || !S || !V) return;
  var RENK = S.RENK, RENK_AD = S.RENK_AD, ILK_RENK = S.ILK_RENK, AZ = S.AZ;
  var yazi = S.yazi, yaziEn = S.yaziEn, egriOk = S.egriOk, oge = S.oge, Cihaz = S.Cihaz, ocUygula = S.ocUygula;
  var oynat = S.oynat, durdur = S.durdur, oynuyor = S.oynuyor, yazitipiHazir = S.yazitipiHazir;
  var kutuYol = V.kutuYol;

  /* ========================================================== GİRİŞ: BÖLÜNMÜŞ EKRAN
     Tablette yan yana, telefonda üst üste iki uygulama. Ders videosu oynarken kalem (tablette üst
     kenardaki yuvasından kalkarak) gelir, videoya dokunur (çubuk El'de: dokunuş uygulamaya gider) ve
     top tepedeyken video durur; oynatıcının denetimleri bir an görünüp kaybolur. Sonra Kalem ve sarı:
     tepe noktası daire içine, bir ok iki uygulamanın arasındaki çizgiyi geçer; maviyle PDF'e çözüm,
     doğru şık daire içine. Kalem tablette yuvasına döner, telefonda çekilip gider. */
  function senGiris(c, telefon, akis) {
    var tuval = c.ekran.querySelector('[data-ders]');
    var vk = c.kutu(tuval), tp = V.dersTepe(vk);
    var bos = c.kutu('.p-bosluk'), dog = c.kutu('[data-p-dogru]');
    if (!tp || !bos || !dog) return null;
    var sari = RENK[5], mavi = RENK[2], kal = telefon ? 3.6 : 4.2, ince = telefon ? 2.7 : 3.1;
    var Y = c.yuva();
    var plan = new S.Plan(c, { dinlen: Y ? [Y.x, Y.y] : [c.W + 60, c.H * 0.86], giris: Y ? 1.35 : 0.3 });
    // 1) videoya sağ üstünden dokun (kalemin gövdesi altyazıya düşmesin): oynarken durdurur
    var dur = plan.dokun([vk.x + vk.w * 0.74, vk.y + vk.h * 0.3]);
    var durT = dur.t + 0.1;
    plan.bekle(0.2);
    // 2) Kalem, sarı
    var aKalem = plan.dokun('.oc__a--kalem', { el: false, arac: 'kalem' });
    plan.dokun('[data-r="5"]', { renk: 5 });
    // 3) tepe noktası daire içine
    plan.ciz(M.halka(tp.x, tp.y + 1.5 * tp.sy, 29 * tp.sx, 18 * tp.sy, 21), sari, kal, 430, 0);
    // çözümün yeri ve boyu: yazı PDF'in yazısının iki katından biraz büyük
    var sol = bos.x + (telefon ? 4 : 44), en = telefon ? 250 : bos.w - 90;
    var boy = Math.min(telefon ? 23 : 29, en / (yaziEn('g_2', 1) || 1));
    var y1 = bos.y + boy * 1.25, y2 = bos.y + boy * 2.8;
    var satir1 = yazi('g_1', sol, y1, boy, -0.03), satir2 = yazi('g_2', sol + (telefon ? 5 : 8), y2, boy * 0.98, -0.012);
    // 4) ok: bölme çizgisini geçer
    var ok;
    if (telefon) {
      // tepenin sağından çubuğun soluna iner, ayırıcıyı geçer, sayfanın sağ boşluğundan (yazının dışından)
      // aşağı iner; çözümün ilk satırının yazılacağı yerin sonunu gösterir
      // satırın sağ ucu çizgilerinden (yazının eğimi yüzünden genişliğinden biraz taşar)
      var son = sol, pdf = c.kutu('.bol--ust .uyg--pdf') || { y: 396 };
      satir1.forEach(function (c1) { for (var i = 0; i < c1.p.length; i += 2) son = Math.max(son, c1.p[i]); });
      son += 14;
      ok = S.yolOk([[tp.x + 28 * tp.sx, tp.y + 14 * tp.sy], [tp.x + 92, tp.y + 88], [288, pdf.y - 70], [314, pdf.y + 60],
        [324, y1 - 90], [son + 36, y1 - boy * 0.7], [son, y1 - boy * 0.42]], 31, 12);
    } else {
      // tahtadan aşağı ve sağa: çizgiyi çözümün hizasında geçip boşluktaki ilk satırı gösterir
      ok = egriOk(tp.x + 32 * tp.sx, tp.y + 16 * tp.sy, bos.x - 60, bos.y + 44, bos.x + 30, bos.y + 24, 31, 15);
    }
    var oOk = plan.ciz(ok, sari, kal, 700, 0.05);
    plan.bekle(0.14);
    // 5) mavi, çözüm iki satır (ikinci satır elde yazılmış gibi biraz içeride ve daha düz)
    var aMavi = plan.dokun('[data-r="2"]', { renk: 2 });
    plan.ciz(satir1, mavi, ince, 820, 0.05);
    plan.bekle(0.16);
    plan.ciz(satir2, mavi, ince, 820, 0.05);
    plan.bekle(0.2);
    // 6) doğru şık
    var oSik = plan.ciz(M.halka(dog.x + dog.w / 2 - 2, dog.y + dog.h / 2 + 1, dog.w / 2 + 11, dog.h / 2 + 4, 33), mavi, telefon ? 3 : 3.4, 460, 0);
    // sahnenin anları (girişteki "tablette şimdi" listesi için)
    var anlar = [0, dur.t, aKalem.t, oOk.bas, aMavi.t, oSik.bas + oSik.sure];
    // video: kalem dokunana kadar oynar (top tepeye çıkarken), sonra durur; denetimler 1,6 sn görünür
    var tepeT = V.DERS.tepeT, anahtar = '';
    plan.her(function (dt, t) {
      var fiz = t < durT ? tepeT - (durT - t) : tepeT;
      var kt = t - durT;
      var geri = kt >= 0 && kt < 0.8 ? kt / 0.8 : -1;
      var den = kt < 0 ? 0 : kt < 0.14 ? kt / 0.14 : kt < 1.25 ? 1 : kt < 1.6 ? 1 - (kt - 1.25) / 0.35 : 0;
      if (akis) { var an = 0; while (an < anlar.length - 1 && t >= anlar[an + 1]) an++; akis(an); }
      var k = fiz.toFixed(3) + '|' + (geri < 0 ? '-' : geri.toFixed(2)) + '|' + den.toFixed(2);
      if (k === anahtar) return;
      anahtar = k;
      V.dersCiz(tuval, fiz, geri, den);
    });
    // bitince: tablette kalem yuvasına döner; telefonda (çubuğun, düğmenin üstüne düşmesin diye) çekilip gider
    return plan.senaryo({ el: true, arac: 'kalem', renk: -1 }, Y ? { yuva: Y } : { cikis: [c.W + 150, c.H + 80, 70], cikisGizli: true });
  }

  var giris = document.querySelector('[data-giris]');
  var girisCihaz = [];
  function girisKur() {
    if (!giris) return;
    var on = document.querySelector('.giris__on'), baslik = document.getElementById('giris-baslik');
    // "tablette şimdi": sahnenin hangi anındaysa o satır yanar, öncekiler biter
    var akisEl = document.querySelector('[data-giris-akis]'), akisLi = akisEl ? akisEl.querySelectorAll('li') : [], sonAn = -1;
    var akisSimdi = akisEl ? akisEl.querySelector('[data-giris-akis-simdi]') : null;
    function akis(an) {
      if (an === sonAn) return;
      sonAn = an;
      for (var i = 0; i < akisLi.length; i++) { akisLi[i].classList.toggle('simdi', i === an); akisLi[i].classList.toggle('bitti', i < an); }
      // kısa ekrandaki tek satır: "3/6 · Kalem ve sarı: tepe noktası"
      if (akisSimdi && akisLi[an]) akisSimdi.textContent = (an + 1) + '/' + akisLi.length + ' · ' + akisLi[an].textContent;
    }
    var dugmeler = document.querySelectorAll('[data-giris-oynat]');
    Array.prototype.forEach.call(giris.querySelectorAll('[data-giris-cihaz]'), function (el) {
      girisCihaz.push({ el: el, tur: el.getAttribute('data-giris-cihaz'), c: new Cihaz(el), sen: null, oynadi: false });
    });
    function gorunen() {
      for (var i = 0; i < girisCihaz.length; i++) if (girisCihaz[i].el.getBoundingClientRect().width) return girisCihaz[i];
      return null;
    }
    // ölçek: cihaz sütuna sığsın; geniş ekranda (yazı yandayken) ekranın yüksekliğine de. Yükseklikten
    // bölümün üst payı, başlık ve başlığın alt payı düşülür (içerik dikeyde ortalandığı için ölçülen yer
    // değil, düzenin değerleri); altyazı da ilk ekrana sığar (yarım görünmesin)
    function olcekle() {
      var o = gorunen();
      if (!o) return null;
      var W = o.tur === 'tablet' ? 1048 : 384, H = o.tur === 'tablet' ? 673 : 804;
      var yan = window.innerWidth > 1100, en = giris.clientWidth, k;
      if (yan) {
        var bolum = giris.closest('.giris'), bs = bolum ? getComputedStyle(bolum) : null;
        var ust = bs ? parseFloat(bs.paddingTop) : 112, alt = bs ? parseFloat(bs.paddingBottom) : 48;
        // başlık üstte tek satırsa onun yüksekliği; sol sütundaysa sahnenin üst payı (kalemin yuvası)
        if (kisaGenis && kisaGenis.matches) ust += parseFloat(getComputedStyle(giris).paddingTop) || 0;
        else if (baslik) ust += baslik.offsetHeight + parseFloat(getComputedStyle(baslik).marginBottom);
        var not = giris.querySelector('.giris__not');
        if (not && not.offsetHeight) alt += not.offsetHeight + parseFloat(getComputedStyle(not).marginTop);
        k = Math.min(en / W, (window.innerHeight - ust - alt) / H, 1.05);
      } else if (o.tur === 'tablet') {
        // alt alta: tablet ve altyazısı başlığın altında ilk ekrana sığsın (ekranın en az yarısı kadar yüksek kalır)
        var gb = giris.closest('.giris'), gs = gb ? getComputedStyle(gb) : null, fs = getComputedStyle(giris);
        var ust2 = (gs ? parseFloat(gs.paddingTop) : 112) + (baslik ? baslik.offsetHeight : 0) + (parseFloat(fs.marginTop) || 0);
        var not2 = giris.querySelector('.giris__not'), alt2 = (not2 ? not2.offsetHeight + parseFloat(getComputedStyle(not2).marginTop) : 0) + 24;
        k = Math.min(en / W, Math.max(window.innerHeight * 0.5, window.innerHeight - ust2 - alt2) / H, 1.05);
      } else {
        k = Math.min(en / W, window.innerHeight * 0.84 / H, 0.96);
      }
      k = Math.max(k, 0.3);
      o.el.style.setProperty('--k', k.toFixed(4));
      return o;
    }
    // optik hiza: başlığın H'si logonun sol kenarında, yazının büyük harf üstü tabletin üst kenarında
    // (kısa ve geniş ekranda başlık sol sütunda: başlığın büyük harf üstü tabletin üst kenarında)
    var kisaGenis = window.matchMedia ? window.matchMedia('(min-width: 1101px) and (max-height: 820px)') : null;
    // bir satırın kutusunun üstünden büyük harfin üstüne olan pay
    function harfPayi(x, cs, harf) {
      var f = parseFloat(cs.fontSize), lh = parseFloat(cs.lineHeight) || f * 1.2;
      x.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      var m = x.measureText(harf), fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent;
      return fa ? (lh - (fa + fd)) / 2 + fa - m.actualBoundingBoxAscent : null;
    }
    function hizala() {
      if (!on || !baslik) return;
      var x = document.createElement('canvas').getContext('2d');
      var bs = getComputedStyle(baslik);
      x.font = bs.fontWeight + ' ' + bs.fontSize + ' ' + bs.fontFamily;
      var h = x.measureText('H');
      baslik.style.setProperty('--baslik-sol', (h.actualBoundingBoxLeft || 0).toFixed(2) + 'px');
      if (window.innerWidth <= 1100) { on.style.removeProperty('--on-ust'); baslik.style.removeProperty('--baslik-ust'); return; }
      if (kisaGenis && kisaGenis.matches) {
        var pb = harfPayi(x, bs, 'H'), sahne = giris ? parseFloat(getComputedStyle(giris).paddingTop) || 0 : 0;
        if (pb != null) baslik.style.setProperty('--baslik-ust', (sahne - pb).toFixed(2) + 'px');
        return;
      }
      baslik.style.removeProperty('--baslik-ust');
      var po = harfPayi(x, getComputedStyle(on), 'V');
      if (po != null) on.style.setProperty('--on-ust', (-po).toFixed(2) + 'px');
    }
    function kur(o) {
      if (!o || !o.c.boyutla()) return false;
      var tuval = o.el.querySelector('[data-ders]');
      if (tuval) V.dersCiz(tuval, V.DERS.tepeT - 1.3, -1);
      o.sen = senGiris(o.c, o.tur === 'telefon', o.tur === 'tablet' ? akis : null);
      return !!o.sen;
    }
    function oynat1(o, gecikme) {
      if (!o || !o.sen) return;
      if (AZ) { o.sen.ciz(o.sen.son); o.oynadi = true; return; }
      o.sen.ciz(0);
      o.oynadi = true;
      oynat(o.sen, gecikme);
    }
    var sonTur = null;
    function yenile() {
      hizala();
      var o = olcekle();
      if (!o) return;
      var t = o.sen && oynuyor(o.sen);
      if (!kur(o)) return;
      if (o.tur !== sonTur) { sonTur = o.tur; if (!o.oynadi) { oynat1(o, 0.3); return; } }
      if (t) oynat(o.sen, 0); else o.sen.ciz(o.sen.son);
    }
    olcekle();
    yazitipiHazir().then(function () {
      hizala();
      var o = olcekle();
      if (kur(o)) { o.sen.ciz(AZ ? o.sen.son : 0); sonTur = o.tur; oynat1(o, 0.5); }
    });
    Array.prototype.forEach.call(dugmeler, function (dugme) {
      dugme.addEventListener('click', function () {
        var o = gorunen();
        if (!o) return;
        if (!o.sen) kur(o);
        if (!o.sen) return;
        durdur(o.sen);
        oynat1(o, 0.15);
      });
    });
    var bekle = 0, sonEn = window.innerWidth, sonBoy = window.innerHeight;
    window.addEventListener('resize', function () {
      if (window.innerWidth === sonEn && Math.abs(window.innerHeight - sonBoy) < 120) return;
      sonEn = window.innerWidth; sonBoy = window.innerHeight;
      cancelAnimationFrame(bekle);
      bekle = requestAnimationFrame(yenile);
    });
    // kısa/uzun düzen değişince (yükseklik az değişse de) yeniden ölç
    if (kisaGenis && kisaGenis.addEventListener) kisaGenis.addEventListener('change', function () {
      cancelAnimationFrame(bekle);
      bekle = requestAnimationFrame(yenile);
    });
    OSN.giris = girisCihaz;
  }

  /* ========================================================== UYGULAMALAR: KATMAN
     Kaydırmayla sürülür (p: 0..1). Önce mesajlarda yazı; telefon yan yatıp katmanlarına ayrılır
     (uygulama, OSNote'un saydam katmanı, çubuk); alttaki uygulama önce haritaya, sonra takvime döner,
     her birinde camın üstüne yeni yazı; sonunda katmanlar birleşir. Kalem ucu bu sahnede yok:
     yazı kaydırdıkça kendiliğinden ilerler. */
  function katmanKur() {
    var kap = document.querySelector('[data-katman]');
    if (!kap) return;
    var sahne = kap.querySelector('[data-katman-sahne]'), uzay = kap.querySelector('[data-katman-uzay]');
    var k3 = uzay.querySelector('[data-k3]'), cam = k3.querySelector('[data-k3-cam]'), cubukK = k3.querySelector('[data-k3-cubuk]');
    var tuval = cam.querySelector('canvas'), ctx = tuval.getContext('2d'), oc = cubukK.querySelector('.oc');
    var uyglar = Array.prototype.slice.call(k3.querySelectorAll('[data-k-uyg]'));
    var sira = Array.prototype.slice.call(kap.querySelectorAll('[data-k-sira]'));
    var AD = ['cubuk', 'cam', 'uyg'], etiket = {}, cizgi = {}, nokta = {};
    AD.forEach(function (a) { etiket[a] = uzay.querySelector('[data-etiket="' + a + '"]'); cizgi[a] = uzay.querySelector('[data-cizgi="' + a + '"]'); nokta[a] = uzay.querySelector('[data-nokta="' + a + '"]'); });
    var izCizgi = uzay.querySelector('[data-cizgi="iz"]'), izNokta = uzay.querySelector('[data-nokta="iz"]');
    // her uygulamada yazının hedefi (ekranın tasarım pikseliyle): iz çizgisi camdaki yazıdan buraya iner
    var HEDEF = { sohbet: null, harita: [281, 143], takvim: null };
    // etiketlerin bağlandığı noktalar (k3'ün tasarım pikseliyle): çubuğun üstü, camın sağ kenarı, ekranın sağ kenarı
    var ISARET = { cubuk: [364, 330], cam: [372, 470], uyg: [372, 700] };
    var PERS = 2000;
    var s = { p: 0, hedef: 0, kare: 0, w: 0, h: 0, on: 0.6, anahtar: '', renk: -2, aktif: '', gor: -1, yakin: false, gorunen: [] };
    var sen = null;

    // uygulamanın içindeki bir öğenin kutusu, uygulamanın tasarım pikseliyle (360×780)
    function kutu(uyg, el) {
      if (typeof el === 'string') el = uyg.querySelector(el);
      if (!el) return null;
      var r = el.getBoundingClientRect(), u = uyg.getBoundingClientRect(), k = u.width / 360;
      return { x: (r.left - u.left) / k, y: (r.top - u.top) / k, w: r.width / k, h: r.height / k };
    }
    // elle çekilmiş çizgi (noktalar arası, hafif titrek)
    function elCizgi(noktalar, tohum) { return [{ p: M.titret(M.duzlestir(noktalar, 3), 0.9, tohum), duz: true }]; }
    // yazı dizisi: öğeler arka arkaya (kalem ucu yok, yalnız zamanlama)
    function dizi() {
      var z = { a: [], son: 0 }, sonNokta = null;
      z.ciz = function (parca, renk, k, hiz, kalkis) {
        if (!parca.length) return;
        if (sonNokta) { var p0 = parca[0].p; z.son += 0.12 + Math.min(0.3, Math.hypot(p0[0] - sonNokta[0], p0[1] - sonNokta[1]) / 1500); }
        var o = oge(parca, renk, k, z.son, hiz, kalkis);
        z.a.push({ tur: 'ciz', t: z.son, o: o });
        z.son += o.sure;
        var pp = parca[parca.length - 1].p;
        sonNokta = [pp[pp.length - 2], pp[pp.length - 1]];
      };
      return z;
    }
    function senSohbet(u) {
      var z = dizi(), r = RENK[1];
      var h = kutu(u, '[data-fis-hedef]'), s2 = kutu(u, '[data-s-son]');
      if (!h || !s2) return z;
      // halka satırı sarar, alttaki ve üstteki satırın yazısına değmez
      var cx = h.x + h.w / 2, cy = h.y + h.h / 2 - 1.5;
      z.ciz(M.halka(cx, cy, h.w / 2 + 11, h.h / 2 + 3.5, 44), r, 3.6, 460, 0);
      var ny = s2.y + s2.h + 76, nx = 40;
      z.ciz(egriOk(h.x + h.w + 10, cy + 10, h.x + h.w + 30, (cy + ny) / 2 + 10, nx + 120, ny - 42, 45, 12), r, 3.8, 620, 0.04);
      z.ciz(yazi('o_duzelt', nx, ny, 32, -0.05), r, 4, 820, 0.05);
      return z;
    }
    function senHarita() {
      var z = dizi(), r = RENK[4];
      // mavi noktadan kuzeye, Cumhuriyet Cd.'den doğuya, Okul Sk.'tan kuzeye, Menekşe Sk.'tan kütüphanenin arka kapısına
      var yol = [131.5, 492, 131.2, 452, 130.8, 330, 130.4, 262, 136, 254.6, 150, 252.6, 180, 250.6, 206, 248.8, 214.6, 244, 215.8, 200, 215.2, 158, 219, 146.6, 232, 144.8, 262, 142.8];
      var govde = M.titret(M.duzlestir(yol, 3), 1.8, 12);
      var n = govde.length, ax = govde[n - 2] - govde[n - 8], ay = govde[n - 1] - govde[n - 7], al = Math.hypot(ax, ay) || 1;
      ax /= al; ay /= al;
      var ex = govde[n - 2], ey = govde[n - 1], uu = 13, c1 = Math.cos(0.5), s1 = Math.sin(0.5);
      var uc = [ex - uu * (ax * c1 - ay * s1), ey - uu * (ay * c1 + ax * s1), ex, ey, ex - uu * (ax * c1 + ay * s1), ey - uu * (ay * c1 - ax * s1)];
      z.ciz([{ p: govde, duz: true }, { p: uc, duz: true }], r, 4.2, 560, 0.05);
      // kapıya çarpı; not kapının altında, yolun sağında
      z.ciz(elCizgi([273, 134, 289, 150], 61), r, 3.8, 520, 0);
      z.ciz(elCizgi([289, 135, 272, 151], 62), r, 3.8, 520, 0.03);
      z.ciz(yazi('o_kapi', 150, 122, 26, -0.05), r, 3.4, 820, 0.05);
      return z;
    }
    // takvim: akşamki Spor'un üstünü çizer, yanına "slaytları bitir" yazar; Sunum'un altını çizer
    function senTakvim(u) {
      var z = dizi(), r = RENK[2];
      var sn = kutu(u, '[data-k-sunum] b'), sp = kutu(u, '[data-k-spor]'), spb = kutu(u, '[data-k-spor] b'), sps = kutu(u, '[data-k-spor] span');
      if (!sn || !sp || !spb || !sps) return z;
      // alt çizgi yazının taban çizgisinin hemen altında (alttaki saat satırına değmez)
      var ay = sn.y + sn.h * 0.9;
      z.ciz(elCizgi([sn.x - 3, ay + 0.8, sn.x + sn.w * 0.55, ay - 0.4, sn.x + sn.w + 7, ay + 0.6], 17), r, 3, 600, 0);
      // üstü çizilen yalnız başlık; not iki satırın sağında, bloğun ortasında
      var s0 = spb.x - 4, s1 = spb.x + spb.w + 6, sy = spb.y + spb.h * 0.56;
      z.ciz(elCizgi([s0, sy + 1.5, (s0 + s1) / 2, sy - 0.5, s1, sy - 1.2], 23), r, 3.2, 620, 0.04);
      var nx = Math.max(spb.x + spb.w, sps.x + sps.w) + 22;
      z.ciz(yazi('k_sinav', nx, sp.y + sp.h / 2 + 8, 22, -0.05), r, 3, 820, 0.05);
      return z;
    }

    function yum(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
    function ara(p, a, b) { return M.sinirla((p - a) / (b - a), 0, 1); }
    // kaydırmanın bir anındaki hâl: e ayrılma (0..1), an hangi uygulama (0..2, arası geçiş), m yazılar
    function durum(p) {
      if (AZ) return { e: 1, an: 1, m: [{ k: 'harita', t: 1, a: 1 }], renk: 4, aktif: 'harita' };
      var e = yum(ara(p, 0.15, 0.31)) * (1 - yum(ara(p, 0.82, 0.95)));
      var an = yum(ara(p, 0.34, 0.42)) + yum(ara(p, 0.58, 0.66));
      return {
        e: e, an: an,
        m: [
          { k: 'sohbet', t: ara(p, 0.01, 0.14), a: 1 - ara(p, 0.33, 0.38) },
          { k: 'harita', t: ara(p, 0.42, 0.55), a: 1 - ara(p, 0.57, 0.62) },
          { k: 'takvim', t: ara(p, 0.66, 0.79), a: 1 }
        ],
        renk: p < 0.4 ? 1 : p < 0.64 ? 4 : 2,
        aktif: an < 0.5 ? 'sohbet' : an < 1.5 ? 'harita' : 'takvim'
      };
    }
    // k3'ün dönüşümü: sahnede yeri, eğimi, ölçeği; katmanların yüksekliği ölçekle birlikte büyür
    var AX = 52 * Math.PI / 180, AZ_ = -32 * Math.PI / 180, ZC = 72, ZU = 160;
    // ayrık hâlin yeri ve ölçeği: yığının (gövde, cam, çubuk) ekrandaki sınırları hesaplanır; geniş sahnede
    // yığın solda, etiketler sağda; dar sahnede yığın ortada (etiket yok)
    function yerlesim() {
      var T = { o: 1, cx: 0, cy: 0, ax: AX, az: AZ_ }, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      [[0, 0, 0], [384, 0, 0], [384, 804, 0], [0, 804, 0], [12, 12, ZC], [372, 12, ZC], [372, 792, ZC], [12, 792, ZC],
        [300, 302, ZU], [364, 302, ZU], [364, 780, ZU], [300, 780, ZU]].forEach(function (q) {
        var P = izdus(T, q[0], q[1], q[2]);
        x0 = Math.min(x0, P[0]); x1 = Math.max(x1, P[0]); y0 = Math.min(y0, P[1]); y1 = Math.max(y1, P[1]);
      });
      var yer = s.w > 600 ? s.etiketEn + 64 : 0, en = s.w - yer - 12;
      var o = Math.min(s.on * 0.92, en / (x1 - x0), s.bant * (s.w > 600 ? 0.92 : 0.8) / (y1 - y0));
      // dar ekranda açıklama modelin hemen altında; ikisi birlikte bantta ortalanır
      var dar = s.w <= 600, ek = dar && aciklama ? aciklama.offsetHeight + 22 : 0;
      s.ay = { o: o, cx: 6 + (en - (x1 - x0) * o) / 2 - x0 * o, cy: s.ust + s.bant * 0.5 - (y0 + y1) / 2 * o - ek / 2 };
      if (aciklama) {
        if (dar) { aciklama.style.top = Math.round(s.ay.cy + y1 * o + 22) + 'px'; aciklama.style.bottom = 'auto'; }
        else { aciklama.style.removeProperty('top'); aciklama.style.removeProperty('bottom'); }
      }
    }
    function donusum(d) {
      var e = d.e, o = s.on + (s.ay.o - s.on) * e;
      return {
        o: o, cx: s.w / 2 + (s.ay.cx - s.w / 2) * e, cy: s.orta + (s.ay.cy - s.orta) * e,
        ax: AX * e, az: AZ_ * e, zc: ZC * o * e + 0.6, zu: ZU * o * e + 1.2
      };
    }
    // bir noktanın sahnedeki izdüşümü (k3 içi tasarım pikseli, z: katmanın yüksekliği)
    function izdus(T, x, y, z) {
      var X = (x - 192) * T.o, Y = (y - 402) * T.o;
      var cz = Math.cos(T.az), sz = Math.sin(T.az);
      var X1 = X * cz - Y * sz, Y1 = X * sz + Y * cz;
      var cx = Math.cos(T.ax), sx = Math.sin(T.ax);
      var Y2 = Y1 * cx - z * sx, Z2 = Y1 * sx + z * cx;
      var k = PERS / (PERS - Z2);
      return [T.cx + X1 * k, T.cy + Y2 * k];
    }
    function murekkep(d) {
      if (!sen) return;
      var anahtar = d.m.map(function (x) { return x.k + x.t.toFixed(4) + '/' + x.a.toFixed(3); }).join('|');
      if (anahtar === s.anahtar) return;
      s.anahtar = anahtar;
      var w = tuval.width, h = tuval.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.setTransform(w / 360, 0, 0, h / 780, 0, 0);
      d.m.forEach(function (x) {
        if (x.a <= 0.002 || x.t <= 0) return;
        var z = sen[x.k];
        ctx.globalAlpha = x.a;
        z.a.forEach(function (st) { S.ogeCiz(ctx, st.o, x.t * z.son); });
      });
      ctx.globalAlpha = 1;
    }
    function ciz(p) {
      if (!s.ay) return; // sahne henüz kurulmadı (yazı tipleri bekleniyor)
      var d = durum(p), T = donusum(d);
      k3.style.transform = 'translate(' + T.cx.toFixed(1) + 'px,' + T.cy.toFixed(1) + 'px) perspective(' + PERS + 'px) rotateX(' + (T.ax * 180 / Math.PI).toFixed(3) + 'deg) rotateZ(' + (T.az * 180 / Math.PI).toFixed(3) + 'deg) scale(' + T.o.toFixed(4) + ') translate(-192px,-402px)';
      cam.style.transform = 'translateZ(' + T.zc.toFixed(2) + 'px)';
      cubukK.style.transform = 'translateZ(' + T.zu.toFixed(2) + 'px)';
      k3.style.setProperty('--e', d.e.toFixed(3));
      // uygulamalar: şimdiki ortada, geçişte yandaki kayarak gelir (Android'deki gibi hafif küçülerek)
      for (var j = 0; j < uyglar.length; j++) {
        var x = j - d.an, g = Math.abs(x) < 0.999;
        if (g !== s.gorunen[j]) { uyglar[j].style.visibility = g ? 'visible' : 'hidden'; s.gorunen[j] = g; }
        if (g) uyglar[j].style.transform = 'translateX(' + (x * 372).toFixed(1) + 'px) scale(' + (1 - 0.07 * Math.min(1, Math.abs(x) * 2.2)).toFixed(4) + ')';
      }
      murekkep(d);
      if (d.renk !== s.renk) { s.renk = d.renk; ocUygula(oc, { el: false, arac: 'kalem', renk: d.renk }); }
      if (d.aktif !== s.aktif) {
        s.aktif = d.aktif;
        sira.forEach(function (li) { if (li.getAttribute('data-k-sira') === d.aktif) li.setAttribute('data-durum', 'simdi'); else li.removeAttribute('data-durum'); });
      }
      // etiketler: katmanlar ayrılınca gelir (dar ekranda etiket yerine altta tek satır açıklama)
      var gor = M.sinirla((d.e - 0.55) / 0.4, 0, 1);
      if (gor === 0 && s.gor === 0) return;
      s.gor = gor;
      if (aciklama) aciklama.style.opacity = gor.toFixed(3);
      // etiketler sağ sütunda, yukarıdan aşağı aynı sırada ve aralarında en az 62 px; çizgi noktadan etikete eğik iner
      var P = {}, sutun = 0;
      AD.forEach(function (a) {
        var m = ISARET[a], z = a === 'cubuk' ? T.zu : a === 'cam' ? T.zc : 0;
        P[a] = izdus(T, m[0], m[1], z);
        sutun = Math.max(sutun, P[a][0] + 40);
      });
      // iz: camdaki yazının altındaki hedef (uygulama katmanında) ile yazının kendisi arasında kesik çizgi
      // (yazı o uygulamada bitmeden iz görünmez)
      var hd = HEDEF[d.aktif], mk = d.m.filter(function (x) { return x.k === d.aktif; })[0];
      var izg = mk ? M.sinirla((mk.t - 0.85) / 0.15, 0, 1) * mk.a : 0;
      if (izCizgi && !hd) { izCizgi.style.opacity = '0'; izNokta.style.opacity = '0'; }
      if (izCizgi && hd) {
        var ust = izdus(T, hd[0] + 12, hd[1] + 12, T.zc), alt = izdus(T, hd[0] + 12, hd[1] + 12, 0);
        izCizgi.setAttribute('d', 'M' + ust[0].toFixed(1) + ' ' + ust[1].toFixed(1) + 'L' + alt[0].toFixed(1) + ' ' + alt[1].toFixed(1));
        izCizgi.style.stroke = RENK[d.renk];
        izCizgi.style.opacity = (gor * izg * 0.85).toFixed(3);
        izNokta.setAttribute('cx', alt[0].toFixed(1));
        izNokta.setAttribute('cy', alt[1].toFixed(1));
        izNokta.style.stroke = RENK[d.renk];
        izNokta.style.opacity = (gor * izg * 0.9).toFixed(3);
      }
      sutun = Math.min(sutun, s.w - s.etiketEn - 6);
      var y = -Infinity;
      AD.forEach(function (a) {
        var ly = Math.max(P[a][1] - 11, y + 62);
        y = ly;
        etiket[a].style.transform = 'translate(' + sutun.toFixed(1) + 'px,' + (ly + 6 * (1 - gor)).toFixed(1) + 'px)';
        etiket[a].style.opacity = gor.toFixed(3);
        cizgi[a].setAttribute('d', 'M' + (P[a][0] + 4).toFixed(1) + ' ' + P[a][1].toFixed(1) + 'L' + (sutun - 12).toFixed(1) + ' ' + (ly + 11).toFixed(1));
        cizgi[a].style.opacity = (gor * 0.5).toFixed(3);
        if (nokta[a]) {
          nokta[a].setAttribute('cx', (P[a][0] + 4).toFixed(1));
          nokta[a].setAttribute('cy', P[a][1].toFixed(1));
          nokta[a].style.opacity = (gor * 0.8).toFixed(3);
        }
      });
    }
    var aciklama = uzay.querySelector('[data-k-aciklama]');
    function boyut() {
      s.w = uzay.clientWidth;
      s.h = uzay.clientHeight;
      // sahne yapışıkken üstü ekranın üstündedir: telefon, sabit menü kapsülünün altındaki bantta durur
      // (yazı sütunu da aynı banda ortalanır: --k-ust)
      var kapsul = document.querySelector('.kapsul');
      s.ust = Math.round(Math.max(24, (kapsul ? kapsul.getBoundingClientRect().bottom : 0) + 24));
      s.alt = getComputedStyle(metin).position === 'sticky' ? 40 : 24;
      s.bant = Math.max(200, s.h - s.ust - s.alt);
      s.orta = s.ust + s.bant / 2;
      kap.style.setProperty('--k-ust', s.ust + 'px');
      s.etiketEn = Math.max.apply(null, AD.map(function (a) { return etiket[a].offsetWidth; }));
      s.on = Math.min(s.bant / 804, s.w * 0.84 / 384, 0.9);
      yerlesim();
      var d = M.dpr(), w = Math.round(360 * s.on * d * 1.25), h = Math.round(780 * s.on * d * 1.25);
      if (tuval.width !== w) tuval.width = w;
      if (tuval.height !== h) tuval.height = h;
      s.anahtar = '';
      s.gor = -1;
    }
    function kur() {
      boyut();
      if (!s.w) return;
      // ölçüm düz hâlde: uygulamalar üst üste, dönüşümsüz
      k3.style.transform = 'scale(' + s.on.toFixed(4) + ')';
      uyglar.forEach(function (u) { u.style.transform = 'none'; u.style.visibility = 'visible'; });
      s.gorunen = [];
      sen = { sohbet: senSohbet(uyglar[0]), harita: senHarita(uyglar[1]), takvim: senTakvim(uyglar[2]) };
      var h1 = kutu(uyglar[0], '[data-fis-hedef]');
      HEDEF.sohbet = h1 ? [h1.x + h1.w / 2, h1.y + h1.h / 2] : null;
      var h3b = kutu(uyglar[2], '[data-k-spor] b');
      HEDEF.takvim = h3b ? [h3b.x + h3b.w / 2, h3b.y + h3b.h * 0.56] : null;
      ciz(s.p);
    }
    // sahnenin kaydırma payı: geniş ekranda bölümün başından, dar ekranda metnin bitiminden başlar
    // (yapışık öğenin offsetTop'u yapıştığı yeri verir; ondan değil, metnin yüksekliğinden hesaplanır)
    var metin = kap.querySelector('.katman__metin');
    function olc() {
      var r = kap.getBoundingClientRect(), bas = getComputedStyle(metin).position === 'sticky' ? 0 : metin.offsetHeight;
      var uz = r.height - bas - sahne.offsetHeight;
      s.hedef = M.sinirla((-r.top - bas) / Math.max(1, uz), 0, 1);
    }
    // kaydırmayı yumuşak izler: her karede farkın bir kısmını kapatır
    function dongu() {
      s.kare = 0;
      var f = s.hedef - s.p;
      s.p = Math.abs(f) < 0.0005 ? s.hedef : s.p + f * 0.16;
      ciz(s.p);
      if (s.p !== s.hedef) s.kare = requestAnimationFrame(dongu);
    }
    function iste() { if (!s.kare) s.kare = requestAnimationFrame(dongu); }
    yazitipiHazir().then(function () {
      if (!AZ) { olc(); s.p = s.hedef; }
      kur();
      if (AZ) return;
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (g) {
          s.yakin = g[0].isIntersecting;
          if (s.yakin) { olc(); iste(); }
        }, { rootMargin: '300px 0px' }).observe(kap);
      } else s.yakin = true;
      window.addEventListener('scroll', function () { if (!s.yakin) return; olc(); iste(); }, { passive: true });
    });
    // telefonda adres çubuğu açılıp kapanınca da "resize" gelir: yalnız gerçek boyut değişiminde yeniden kur
    var bekle = 0, sonEn = window.innerWidth, sonBoy = window.innerHeight;
    window.addEventListener('resize', function () {
      if (window.innerWidth === sonEn && Math.abs(window.innerHeight - sonBoy) < 120) { if (!AZ) { olc(); iste(); } return; }
      sonEn = window.innerWidth; sonBoy = window.innerHeight;
      cancelAnimationFrame(bekle);
      bekle = requestAnimationFrame(function () { if (!AZ) { olc(); s.p = s.hedef; } kur(); });
    });
    OSN.katman = { s: s, sen: function () { return sen; }, ciz: ciz, durum: durum, kur: kur };
  }

  /* ========================================================== KALEM VE EL
     Tablette tam ekran bir video: taktik analiz (yukarıdan saha). Kalemle pasın gideceği yeri
     tahmin et, El'e geç, videoyu oynat: oyun altta akar, çizdiğin üstte kalır. (Ekran 1000×625,
     video 4 sn.) Örnekteki tahmin kanada; pas ise araya, 9 numaraya gider. */
  // örnekteki tahmin: 10 numaradan kanattaki 11'e kavisli bir ok (oyuncuların yerinden; dikey sahada da)
  function tahminYolu(dikey) {
    var a = V.taktikOyuncu(10, 'k', 0, dikey), b = V.taktikOyuncu(11, 'k', 0, dikey);
    var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, px = -uy, py = ux;
    var s = [a[0] + ux * 21 - px * 8, a[1] + uy * 21 - py * 8], e = [b[0] - ux * 17, b[1] - uy * 17];
    return egriOk(s[0], s[1], (s[0] + e[0]) / 2 - px * 0.2 * L, (s[1] + e[1]) / 2 - py * 0.2 * L, e[0], e[1], 19, 18);
  }
  // "tahminim": yatayda 11'in sağında; dikeyde 11'in üstünde, sola doğru
  function tahminYazi(dikey) {
    var b = V.taktikOyuncu(11, 'k', 0, dikey);
    return dikey ? [b[0] - 150, b[1] - 58, 30, -0.08] : [b[0] + 22, b[1] + 7, 32, -0.08];
  }
  function elModuKur() {
    var kok = document.querySelector('[data-el-sahne]');
    if (!kok) return;
    var tablet = kok.querySelector('[data-tablet]'), c = new Cihaz(tablet), ekran = c.ekran;
    // telefonda tablet dikey: saha dikey çizilir, çubuk sol kenarda dikey (her şey ~1,6 kat büyük görünür)
    var dar = window.matchMedia ? window.matchMedia('(max-width: 600px)') : { matches: false }, dikey = null;
    var oynatici = ekran.querySelector('.uyg--oynatici'), sim = ekran.querySelector('[data-sim]');
    var oynatD = ekran.querySelector('[data-video-oynat]'), sureEl = ekran.querySelector('[data-video-sure]'), cubukEl = ekran.querySelector('[data-video-ilerleme]');
    var cubuk = ekran.querySelector('[data-el-cubuk]'), ipucu = kok.querySelector('[data-el-ipucu]');
    var adimlar = kok.querySelectorAll('[data-adim]');
    var yuzey = new M.Yuzey(c.tuval, { sinir: 60 });
    var d = { mod: 'el', renk: -1, k: 5, v: 0, durum: 'durdu', ornek: false, cizdi: false, elGecti: false, izlendi: false, aktif: null, is: null };
    var zaman = 0, onceki = 0, SURE = V.TK.sure;
    var SON_IPUCU = dil('Tahmin kanattaydı; pas araya, 9 numaraya gitti. Çizdiğin ok yerinde duruyor. Sıra sende: Baştan’a dokun, kendi tahminini çiz.',
      'The guess was the wing; the pass went through the middle, to number 9. Your arrow is still there. Your turn: tap Restart and draw your own guess.');

    // dar ekranda (≤760, büyük düğmeler görünür) tabletin içindeki minik çubuk ve oynat düğmesi yalnız resim:
    // dokunmak için çok küçükler (8–24 px), aynı işi büyük düğmeler yapıyor (onlar bunları kodla tıklar)
    var buyukDugme = window.matchMedia ? window.matchMedia('(max-width: 760px)') : { matches: false };
    function minikleriKapat() {
      [cubuk, oynatD].forEach(function (e) {
        if (!e) return;
        e.inert = buyukDugme.matches;
        if (buyukDugme.matches) e.setAttribute('aria-hidden', 'true'); else e.removeAttribute('aria-hidden');
      });
    }
    minikleriKapat();
    if (buyukDugme.addEventListener) buyukDugme.addEventListener('change', minikleriKapat);

    function yonla() {
      if (dikey === dar.matches) return false;
      var ilk = dikey === null;
      dikey = dar.matches;
      tablet.classList.toggle('tablet--dikey', dikey);
      cubuk.classList.toggle('oc--yatay', !dikey);
      c.yonla();
      return !ilk;
    }
    function boyutla() {
      var dondu = yonla();
      // tablet kendi sütununa sığar; geniş ekranda ekranın yüksekliğine de (menü ve bölümün payları düşülür)
      var sutun = tablet.parentNode.clientWidth;
      if (window.innerWidth > 980) {
        var k = Math.min(0.96, sutun / 1048, Math.max(0.6, (window.innerHeight - 190) / 673));
        tablet.style.setProperty('--k', k.toFixed(4));
      } else tablet.style.setProperty('--k', Math.min(0.96, sutun / (dikey ? 673 : 1048)).toFixed(4));
      if (!c.boyutla()) return;
      // yön değişince eski yazı yeni sahada yanlış yerde kalır: baştan
      if (dondu) { sifirla(); ipucuYaz(dil('Kalem her açıldığında El’de başlar, ilk dokunuşun uygulamaya gider.', 'The pen always opens in Hand, so your first touch goes to the app.')); }
      var r = c.tuval.getBoundingClientRect();
      yuzey.boyutla(r.width, r.height, c.olcek, M.dpr());
      V.taktikCiz(sim, d.v);
    }
    function ipucuYaz(m) { if (ipucu) ipucu.textContent = m; }
    function adimGuncelle() {
      var hal = { kalem: d.cizdi ? 'tamam' : 'simdi', el: d.elGecti ? 'tamam' : d.cizdi ? 'simdi' : '', oynat: d.izlendi ? 'tamam' : d.elGecti ? 'simdi' : '' };
      for (var i = 0; i < adimlar.length; i++) {
        var h = hal[adimlar[i].getAttribute('data-adim')];
        if (h) adimlar[i].setAttribute('data-durum', h); else adimlar[i].removeAttribute('data-durum');
      }
    }
    var kontrol = kok.querySelectorAll('[data-el-kontrol]');
    function mod(m) {
      d.mod = m;
      ekran.setAttribute('data-mod', m);
      ocUygula(cubuk, { el: m === 'el', arac: m === 'silgi' ? 'silgi' : 'kalem', renk: d.renk });
      for (var i = 0; i < kontrol.length; i++) {
        var k = kontrol[i].getAttribute('data-el-kontrol');
        if (k !== 'oynat') kontrol[i].setAttribute('aria-pressed', String(k === (m === 'el' ? 'el' : 'kalem')));
      }
      if (m === 'el' && d.cizdi) d.elGecti = true;
      adimGuncelle();
    }
    var oynatK = kok.querySelector('[data-el-kontrol="oynat"]'), oynatYazi = oynatK && oynatK.querySelector('[data-el-oynat-yazi]'), oynatSimge = oynatK && oynatK.querySelector('use');
    function videoCiz() {
      V.taktikCiz(sim, d.v);
      var sn = Math.min(4, Math.floor(d.v * SURE + 1e-6));
      if (sureEl) sureEl.textContent = '0:0' + sn + ' / 0:04';
      if (cubukEl) cubukEl.style.width = (d.v * 100).toFixed(2) + '%';
      oynatici.setAttribute('data-durum', d.durum);
      if (oynatD) oynatD.setAttribute('aria-label', d.durum === 'bitti' ? dil('Videoyu baştan oynat', 'Play the video again')
        : d.durum === 'oynuyor' ? dil('Videoyu duraklat', 'Pause the video') : dil('Videoyu oynat', 'Play the video'));
      // dar ekrandaki büyük düğme de videonun hâlini söyler
      if (oynatYazi) oynatYazi.textContent = d.durum === 'oynuyor' ? dil('Duraklat', 'Pause') : d.durum === 'bitti' ? dil('Yeniden', 'Replay') : dil('Oynat', 'Play');
      if (oynatSimge) oynatSimge.setAttribute('href', d.durum === 'oynuyor' ? '#m-duraklat' : d.durum === 'bitti' ? '#m-yenile-m' : '#m-oynat');
    }
    function videoDuraklat() {
      if (d.durum !== 'oynuyor') return;
      d.durum = 'durdu';
      cancelAnimationFrame(zaman);
      videoCiz();
    }
    function videoOynat() {
      if (d.durum === 'oynuyor') return;
      if (d.durum === 'bitti') d.v = 0;
      d.durum = 'oynuyor';
      onceki = 0;
      cancelAnimationFrame(zaman);
      zaman = requestAnimationFrame(adim);
      videoCiz();
    }
    function adim(z) {
      if (!onceki) onceki = z;
      var dt = Math.min(0.05, (z - onceki) / 1000);
      onceki = z;
      d.v = Math.min(1, d.v + (AZ ? 1 : dt / SURE));
      if (d.v >= 1) {
        d.durum = 'bitti';
        videoCiz();
        if (d.elGecti || d.cizdi) d.izlendi = true;
        adimGuncelle();
        if (!d.ornek) ipucuYaz(d.cizdi ? dil('Oyun kendi yolunda aktı. Senin çizgin ekranda, yerinde duruyor.', 'The play went its own way. Your line is still on the screen, right where you drew it.')
          : dil('Video bitti. Şimdi Kalem’e dokunup tahminini çiz, sonra yeniden oynat.', 'The video ended. Now tap Pen, draw your guess, then play it again.'));
        return;
      }
      videoCiz();
      zaman = requestAnimationFrame(adim);
    }

    // çubuk
    cubuk.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || d.ornek) return;
      if (b.getAttribute('aria-disabled') === 'true') { ipucuYaz(dil('Şekiller bu provada kapalı. Hepsini “Çubukta ne var?” bölümünde gör, köşe sürüklemeyi aşağıda dene.',
        'Shapes are off in this demo. See them all under “What’s on the toolbar?” and try dragging corners further down.')); return; }
      var r = b.getAttribute('data-r');
      if (r != null) { d.renk = +r; mod('kalem'); ipucuYaz(RENK_AD[d.renk] + dil('. Renge dokunmak kalemi seçer.', '. Tapping a colour selects the pen.')); return; }
      var a = b.getAttribute('data-a');
      if (a === 'el') { mod('el'); ipucuYaz(d.cizdi ? dil('El: dokunuşların videoya geçer. Şimdi oynat.', 'Hand: your touches go to the video. Now play it.') : dil('El: dokunuşların videoya geçer.', 'Hand: your touches go to the video.')); }
      else if (a === 'kalem') { mod('kalem'); ipucuYaz(dil('Kalem: videonun üstüne yaz. Topun gideceği yolu çiz.', 'Pen: write on the video. Draw where the ball will go.')); }
      else if (a === 'silgi') { mod('silgi'); ipucuYaz(dil('Silgi: üstünden geçtiğin yeri siler.', 'Eraser: it erases only what you pass over.')); }
    });
    // dar ekrandaki büyük düğmeler: çubuktakilerle aynı işi yapar
    Array.prototype.forEach.call(kontrol, function (b) {
      b.addEventListener('click', function () {
        if (d.ornek) return;
        var k = b.getAttribute('data-el-kontrol');
        if (k === 'oynat') {
          if (d.mod !== 'el') { ipucuYaz(dil('Kalem seçiliyken dokunuş yazıya gider. Oynatmak için önce El’e dokun.', 'With Pen selected, a touch turns into ink. To play, tap Hand first.')); return; }
          oynatD.click();
          return;
        }
        var hedef = cubuk.querySelector('[data-a="' + k + '"]');
        if (hedef) hedef.click();
      });
    });
    if (oynatD) oynatD.addEventListener('click', function () {
      if (d.ornek) return;
      if (d.durum === 'oynuyor') { videoDuraklat(); ipucuYaz(dil('Durdu. Yeniden oynatmak için dokun.', 'Paused. Tap to play again.')); return; }
      videoOynat();
      ipucuYaz(d.cizdi ? dil('Video oynuyor; çizdiğin üstte duruyor.', 'The video is playing; your drawing stays on top.')
        : dil('Video oynuyor. Kalem’e dokunup üstüne yazabilirsin.', 'The video is playing. Tap Pen to write on it.'));
    });

    // çizim
    function nokta(e) { var r = c.tuval.getBoundingClientRect(); return [(e.clientX - r.left) / c.olcek, (e.clientY - r.top) / c.olcek]; }
    c.tuval.addEventListener('pointerdown', function (e) {
      if (d.ornek || d.mod === 'el' || d.aktif !== null) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      d.aktif = e.pointerId;
      try { c.tuval.setPointerCapture(e.pointerId); } catch (_) { /* yok */ }
      var n = nokta(e);
      // oynat düğmesinin üstüne kalemle dokunmak: yazıya gider (uygulamadaki gibi)
      var ob = c.kutu(oynatD);
      d.dugmede = ob && n[0] > ob.x && n[0] < ob.x + ob.w && n[1] > ob.y && n[1] < ob.y + ob.h;
      if (d.mod === 'silgi') { d.is = 'sil'; d.son = n; yuzey.silBaslat(); yuzey.sil(n[0], n[1], n[0], n[1], 20); }
      else { d.is = 'ciz'; yuzey.baslat('kalem', d.renk >= 0 ? RENK[d.renk] : ILK_RENK, d.k, n[0], n[1]); }
    });
    c.tuval.addEventListener('pointermove', function (e) {
      if (d.aktif !== e.pointerId) return;
      var ev = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
      if (!ev.length) ev = [e];
      for (var i = 0; i < ev.length; i++) {
        var n = nokta(ev[i]);
        if (d.is === 'sil') { yuzey.sil(d.son[0], d.son[1], n[0], n[1], 20); d.son = n; }
        else yuzey.surdur(n[0], n[1]);
      }
    });
    function birak(e) {
      if (d.aktif !== e.pointerId) return;
      d.aktif = null;
      if (d.is === 'sil') yuzey.silBitir();
      else {
        yuzey.bitir();
        var son = yuzey.ops[yuzey.ops.length - 1];
        if (son && M.uzunluk(son.p) > 60) { d.cizdi = true; adimGuncelle(); ipucuYaz(dil('Güzel. Şimdi El’e dokun, sonra videoyu oynat.', 'Nice. Now tap Hand, then play the video.')); }
        else if (d.dugmede) ipucuYaz(dil('Kalem seçiliyken dokunuş yazıya gider. Oynatmak için önce El’e dokun.', 'With Pen selected, a touch turns into ink. To play, tap Hand first.'));
      }
      d.is = null;
    }
    c.tuval.addEventListener('pointerup', birak);
    c.tuval.addEventListener('pointercancel', birak);
    c.tuval.addEventListener('lostpointercapture', birak);

    function sifirla() {
      d.ornek = false;
      clearTimeout(d.zamanlayici);
      cancelAnimationFrame(zaman);
      cancelAnimationFrame(d.ornekKare);
      S.ucYuvada(c);
      yuzey.sifirla([]);
      d.v = 0; d.durum = 'durdu'; d.cizdi = false; d.elGecti = false; d.izlendi = false; d.renk = -1;
      mod('el');
      videoCiz();
    }

    /* örnek: kalem yuvasından kalkar, Kalem'e ve sarıya dokunur, tahmini çizer, "tahminim" yazar,
       El'e ve oynat'a dokunur, sonra yuvasına döner. Yazı gerçek çizgi olarak eklenir: sonra silinebilir. */
    function ornek() {
      sifirla();
      d.ornek = true;
      ipucuYaz(dil('Örnek: önce tahmin, sonra video.', 'Example: the guess first, then the video.'));
      var Y = c.yuva();
      var plan = new S.Plan(c, { dinlen: Y ? [Y.x, Y.y] : [c.W + 110, c.H + 90], giris: Y ? 0.5 : 0.3 });
      var eylem = [];
      function dok(hedef, f) { var a = plan.dokun(hedef); eylem.push({ t: a.t + 0.12, f: f }); }
      dok('.oc__a--kalem', function () { mod('kalem'); });
      dok('[data-r="5"]', function () { d.renk = 5; mod('kalem'); });
      var ty = tahminYazi(dikey);
      var o1 = plan.ciz(tahminYolu(dikey), RENK[5], d.k, 760, 0.05);
      plan.bekle(0.08);
      var o2 = plan.ciz(yazi('e_tahmin', ty[0], ty[1], ty[2], ty[3]), RENK[5], d.k, 820, 0.05);
      plan.bekle(0.3);
      dok('.oc__a--el', function () { mod('el'); });
      dok(c.merkez(oynatD), function () { videoOynat(); });
      var sen = plan.senaryo(null, Y ? { yuva: Y } : { cikis: [c.W + 110, c.H + 90, 60] });
      var ogeler = [o1, o2];
      var besle = ogeler.map(function (o) { return o.parca.map(function () { return { n: 0, basladi: false, bitti: false }; }); });
      var bas = 0, ek = 0;
      function kare(z) {
        if (!d.ornek) return;
        if (!bas) bas = z;
        var t = (z - bas) / 1000;
        while (ek < eylem.length && t >= eylem[ek].t) eylem[ek++].f();
        // mürekkebi yüzeye nokta nokta ver (kullanıcının çizgisi gibi)
        ogeler.forEach(function (o, oi) {
          for (var i = 0; i < o.parca.length; i++) {
            var b = besle[oi][i];
            if (b.bitti) continue;
            var n = S.parcaIlerleme(o, i, t);
            if (n < 0) break;
            var p = o.parca[i].p, top = p.length / 2;
            if (!b.basladi) { yuzey.baslat('kalem', o.renk, d.k, p[0], p[1]); b.basladi = true; b.n = 1; }
            for (; b.n < Math.min(n, top); b.n++) yuzey.surdur(p[b.n * 2], p[b.n * 2 + 1]);
            if (n < top) break;
            yuzey.bitir();
            b.bitti = true;
            if (o === o1 && i === o.parca.length - 1) { d.cizdi = true; adimGuncelle(); }
          }
        });
        S.ucKoy(c, sen.ucDurus(t), t);
        if (t < sen.son) { d.ornekKare = requestAnimationFrame(kare); return; }
        S.ucYuvada(c);
        var bekle = function () {
          if (!d.ornek) return;
          if (d.durum !== 'bitti') { d.zamanlayici = setTimeout(bekle, 120); return; }
          d.ornek = false;
          ipucuYaz(SON_IPUCU);
        };
        bekle();
      }
      d.ornekKare = requestAnimationFrame(kare);
    }

    var ornekD = kok.querySelector('[data-el-ornek]'), temizD = kok.querySelector('[data-el-temizle]');
    if (ornekD) ornekD.addEventListener('click', function () {
      if (AZ) { sonHal(); return; }
      ornek();
    });
    if (temizD) temizD.addEventListener('click', function () {
      sifirla();
      ipucuYaz(dil('Baştan. Kalem’e dokun ve topun gideceği yolu çiz.', 'From the top. Tap Pen and draw where the ball will go.'));
    });

    // hareket azaltılmışsa: örneğin son hâli
    function sonHal() {
      sifirla();
      d.renk = 5;
      var ty = tahminYazi(dikey);
      var ops = tahminYolu(dikey).concat(yazi('e_tahmin', ty[0], ty[1], ty[2], ty[3])).map(function (p) {
        return { tur: 'kalem', renk: RENK[5], k: d.k, p: p.p };
      });
      yuzey.sifirla(ops);
      d.cizdi = true; d.elGecti = true; d.izlendi = true; d.v = 1; d.durum = 'bitti';
      mod('el');
      videoCiz();
      ipucuYaz(dil('Tahmin kanattaydı; pas araya, 9 numaraya gitti. Baştan’a dokun, kendi tahminini çiz.',
        'The guess was the wing; the pass went through the middle, to number 9. Tap Restart and draw your own guess.'));
    }

    yazitipiHazir().then(function () {
      boyutla();
      mod('el');
      videoCiz();
      S.ucYuvada(c);
      if (!('IntersectionObserver' in window)) return;
      var io = new IntersectionObserver(function (g) {
        if (!g[0].isIntersecting) return;
        io.disconnect();
        if (AZ) sonHal();
        else if (!d.cizdi && d.v === 0) ornek();
      }, { threshold: 0.6 });
      io.observe(tablet);
    });
    window.addEventListener('resize', function () { requestAnimationFrame(boyutla); });
    OSN.elModu = { d: d, yuzey: yuzey, sifirla: sifirla, ornek: ornek };
  }

  /* ========================================================== ARAÇ ÇUBUĞU ANATOMİSİ
     Listeden bir düğme seçilince çubukta o yer yanar ve uygulamadaki paneli açılır
     (panellerin içeriği OverlayService.kt / PremiumToolbar.kt'den). */
  function panelBas(onizleme, ad) {
    return '<div class="op__bas"><span class="op__onizleme">' + onizleme + '</span><p class="op__ad">' + ad + '<small>' + dil('Ayarları', 'Settings') + '</small></p>' +
      '<span class="op__kapat"><svg><use href="#m-kapat"/></svg></span></div>';
  }
  function kaydirac(ad, deger, az, cok, sinif) {
    var y = ((deger - az) / (cok - az) * 100).toFixed(1) + '%';
    return '<div class="op__satir"><span>' + ad + '</span><b>' + deger + ' px</b></div>' +
      '<div class="op__ray' + (sinif ? ' ' + sinif : '') + '" data-y="' + y + '"><i></i><b></b></div>';
  }
  var SEKIL_GLIF = {
    cizgi: '<path d="M5 19 19 5"/>',
    ok: '<path d="M5 19 19 5M11 5h8v8"/>',
    dikdortgen: '<rect x="4" y="4" width="16" height="16"/>',
    elips: '<ellipse cx="12" cy="12" rx="8" ry="8"/>',
    ucgen: '<path d="M12 4 20 20H4Z"/>',
    yildiz: '<path d="M12 3.6 14.4 8.7 20 9.4 15.8 13.2 16.9 18.8 12 16 7.1 18.8 8.2 13.2 4 9.4 9.6 8.7Z"/>'
  };
  // seçilen düğmenin paneli (uygulamadaki çizimiyle) ve kartın altındaki açıklaması
  function anatomiPanel(p) {
    var h = '', a = '';
    if (p === 'kalem') {
      h = '<div class="op">' + panelBas('<svg viewBox="0 0 40 40"><path d="M6 34 34 6" stroke="#D32F2F" stroke-width="5" stroke-linecap="round"/></svg>', dil('Kalem', 'Pen')) +
        kaydirac(dil('Boyut', 'Size'), 5, 1, 25) + '</div>';
      a = dil('Kalem tek kalınlıkta yazar. Seçiliyken kaleme bir daha dokununca bu panel açılır; silgide de öyle.',
        'The pen writes at one thickness. Tap the pen again while it’s selected and this panel opens; the eraser works the same way.');
    } else if (p === 'silgi') {
      h = '<div class="op">' + panelBas('<i class="op__silgi"></i>', dil('Silgi', 'Eraser')) + kaydirac(dil('Boyut', 'Size'), 36, 8, 80, 'op__ray--beyaz') + '</div>';
      a = dil('Ekran kaleminin silgisi yalnız üstünden geçtiği yeri siler; çizginin geri kalanı durur.',
        'The screen pen’s eraser removes only what it passes over; the rest of the stroke stays.');
    } else if (p === 'sekil') {
      var g = '';
      ['cizgi', 'ok', 'dikdortgen', 'elips', 'ucgen', 'yildiz'].forEach(function (s) {
        g += '<span' + (s === 'ucgen' ? ' class="sec"' : '') + '><svg viewBox="0 0 24 24">' + SEKIL_GLIF[s] + '</svg></span>';
      });
      h = '<div class="op">' + panelBas('<svg viewBox="0 0 24 24" class="op__onizleme-sekil">' + SEKIL_GLIF.ucgen + '</svg>', dil('Şekiller', 'Shapes')) +
        '<div class="op__izgara">' + g + '</div>' + kaydirac(dil('Kalınlık', 'Thickness'), 5, 2, 25, 'op__ray--kehribar') + '</div>';
      a = dil('Çizdikten sonra köşeleri tek tek sürüklenir; köşeli şekillerde açılar derece olarak yazılır.',
        'After drawing, each corner can be dragged on its own; shapes with corners show their angles in degrees.');
    } else if (p === 'sayfa') {
      var k = '';
      ['#FAFAFA', '#FDF6E3', '#FDFBF7', '#E9EEF5', '#1E1E2E', '#282C34'].forEach(function (r, i) { k += '<span class="op__kagit-' + i + (i === 0 ? ' sec' : '') + '"></span>'; });
      h = '<div class="op op--kucuk">' + panelBas('<i class="op__kareli"></i>', dil('Sayfa', 'Page')) +
        '<div class="op__anahtar"><span>' + dil('Sayfayı aç', 'Enable page') + '</span><i class="op__acik"></i></div>' +
        '<span class="op__alt">' + dil('Kağıt rengi', 'Paper colour') + '</span><div class="op__kagitlar op__kagitlar--kucuk">' + k + '</div>' +
        '<span class="op__alt">' + dil('Desen', 'Pattern') + '</span><div class="op__desenler"><span>' + dil('Boş', 'Blank') + '</span><span class="sec">' + dil('Kareli', 'Grid') +
        '</span><span>' + dil('Çizgili', 'Lined') + '</span><span>' + dil('Noktalı', 'Dotted') + '</span></div>' +
        '<div class="op__kaydir"><span class="op__alt">' + dil('Opaklık', 'Opacity') + '</span><output>95%</output></div><div class="op__ray op__ray--yesil" data-y="91.7%"><i></i><b></b></div></div>';
      a = dil('Kâğıt açık uygulamanın üstüne serilir; opaklığı %40’a kadar iner. Aşağıda deneyebilirsin.', 'Paper is laid over the open app; its opacity goes down to 40%. You can try it below.');
    } else if (p === 'daha') {
      var y = [['m-undo', dil('Geri al', 'Undo')], ['m-redo', dil('Yinele', 'Redo')], ['m-goz-kapali', dil('Gizle', 'Hide')], ['m-dondur', dil('Döndür', 'Rotate')],
        ['m-cop', dil('Temizle', 'Clear'), 'op__kirmizi'], ['m-kamera', dil('Yakala', 'Capture'), 'op__yesil']];
      var x = '';
      y.forEach(function (s) { x += '<span class="' + (s[2] || '') + '"><svg><use href="#' + s[0] + '"/></svg>' + s[1] + '</span>'; });
      h = '<div class="op"><div class="op__bas"><span class="op__onizleme"><svg class="op__onizleme-daha"><use href="#m-more-horiz"/></svg></span><p class="op__ad">' + dil('Araçlar', 'Tools') + '<small>' + dil('Hızlı erişim', 'Quick access') + '</small></p><span class="op__kapat"><svg><use href="#m-kapat"/></svg></span></div>' +
        '<div class="op__izgara op__izgara--arac">' + x + '</div></div>';
      a = dil('Döndür yalnız tablette görünür: çubuğu dikeyden yataya çevirir. Yakala, ekranı “sadece yazı” ya da “arka plan dahil” kaydeder.',
        'Rotate appears only on tablets: it turns the toolbar from upright to sideways. Capture saves “only my writing” or “writing + background”.');
    } else if (p === 'kapat') {
      h = '<div class="op op--soru"><p class="op__soru">' + dil('Kalem kapatılsın mı?', 'Turn off the pen?') + '</p><p class="op__not">' + dil('Ekrandaki çizimler silinir.', 'Ink on the screen will be cleared.') + '</p>' +
        '<div class="op__secenek"><span class="op__tehlike">' + dil('Kapat', 'Turn off') + '</span><span>' + dil('İptal', 'Cancel') + '</span></div></div>';
      a = dil('Kapatınca ekrandaki çizimler silinir; bu yüzden önce sorar.', 'Turning it off clears the ink on the screen, so it asks first.');
    } else if (p === 'kucult') {
      h = '<div class="anatomi__mini"><span><svg><use href="#m-unfold-more"/></svg></span><i></i><span class="sec"><svg><use href="#o-kalem"/></svg></span><span><svg><use href="#o-el"/></svg></span><span><svg><use href="#o-silgi"/></svg></span></div>';
      a = dil('Mini çubuk: Genişlet, Kalem, El, Silgi. Telefon yan dönünce çubuk kendiliğinden buna geçer, ekranda yer kalsın diye.',
        'Mini toolbar: Expand, Pen, Hand, Eraser. When the phone turns sideways, the toolbar switches to it on its own to leave room on the screen.');
    } else if (p === 'el') {
      a = dil('El seçiliyken dokunuşların alttaki uygulamaya geçer: kaydırır, oynatır, büyütürsün. Çizimler ekranda kalır. Kalem her açıldığında El’de başlar.',
        'With Hand selected, your touches go to the app underneath: you scroll, play, zoom. Your ink stays on the screen. The pen always opens in Hand.');
    } else if (p === 'renk') {
      a = dil('Siyah, kırmızı, mavi, yeşil, pembe, sarı. Bir renge dokununca kalem seçilir ve El’den çıkılır. Kalemin simgesi seçili rengi taşır.',
        'Black, red, blue, green, pink, yellow. Tapping a colour selects the pen and leaves Hand. The pen icon takes on the chosen colour.');
    }
    return { h: h, a: a };
  }
  function anatomiKur() {
    var kok = document.querySelector('[data-anatomi]');
    if (!kok) return;
    var liste = kok.querySelector('[data-anatomi-liste]'), cubuk = kok.querySelector('[data-anatomi-cubuk]'), panel = kok.querySelector('[data-anatomi-panel]');
    var kart = kok.querySelector('.anatomi__ekran'), aciklama = kok.querySelector('[data-anatomi-aciklama]');
    var sekmeler = liste.querySelectorAll('button[data-p]');
    // geniş ekranda çubuk yatay, altında panel; dar ekranda dikey, yanında panel. Çubuk kartın içine sığacak ölçekte
    var genis = window.matchMedia ? window.matchMedia('(min-width: 981px)') : { matches: true };
    function yerlestir() {
      var yatay = genis.matches;
      cubuk.classList.toggle('oc--yatay', yatay);
      kart.classList.toggle('anatomi__ekran--dikey', !yatay);
      kart.style.setProperty('--oc-x', cubuk.offsetWidth + 'px');
      kart.style.setProperty('--oc-y', cubuk.offsetHeight + 'px');
      var ks = getComputedStyle(kart), ic = kart.clientWidth - parseFloat(ks.paddingLeft) - parseFloat(ks.paddingRight);
      var o = yatay ? Math.min(1.14, ic / (cubuk.offsetWidth || 1)) : window.innerWidth > 700 ? 1.05 : 1;
      kart.style.setProperty('--oc-olcek', o.toFixed(4));
    }
    function sec(p, odak) {
      for (var i = 0; i < sekmeler.length; i++) {
        var s = sekmeler[i].getAttribute('data-p') === p;
        sekmeler[i].setAttribute('aria-pressed', String(s));
        sekmeler[i].tabIndex = s ? 0 : -1;
        if (s && odak) sekmeler[i].focus();
      }
      var y = cubuk.querySelectorAll('[data-p]');
      for (var j = 0; j < y.length; j++) y[j].classList.toggle('isik', y[j].getAttribute('data-p') === p);
      // araç düğmelerinin seçili hâli de uygulamadaki gibi değişsin
      var arac = { kalem: 'kalem', silgi: 'silgi', sekil: 'sekil' }[p];
      ocUygula(cubuk, { el: p === 'el', arac: arac || 'kalem', renk: 1 });
      var ap = anatomiPanel(p);
      panel.innerHTML = ap.h;
      if (aciklama) aciklama.textContent = ap.a;
      // raylar: dolu kısım genişliği (satır içi stil yok: CSSOM)
      var ray = panel.querySelectorAll('[data-y]');
      for (var k = 0; k < ray.length; k++) ray[k].style.setProperty('--y', ray[k].getAttribute('data-y'));
      // kartın yüksekliği: çubuk ve panel (yatayda alt alta); en az çubuğun kendisi kadar
      var ks0 = getComputedStyle(kart), pay = parseFloat(ks0.paddingTop) + parseFloat(ks0.paddingBottom);
      var cb = cubuk.getBoundingClientRect();
      var boy = genis.matches ? cb.height + (panel.offsetHeight ? parseFloat(ks0.rowGap || ks0.gap) + panel.offsetHeight : 0) : Math.max(cb.height, panel.offsetHeight);
      kart.style.height = Math.round(Math.max(genis.matches ? 240 : 0, boy) + pay) + 'px';
      // panel ışıklı düğmenin hizasında açılır (yatayda altında, dikeyde yanında), kartın içinde kalır
      var hedef = cubuk.querySelector('[data-p="' + p + '"]');
      if (hedef) {
        var er = kart.getBoundingClientRect(), hr = hedef.getBoundingClientRect(), ks = getComputedStyle(kart);
        if (genis.matches) {
          var sol = parseFloat(ks.paddingLeft), en = er.width - sol - parseFloat(ks.paddingRight) - panel.offsetWidth;
          panel.style.setProperty('--panel-sol', Math.max(0, Math.min(hr.left - er.left - sol - 10, en)) + 'px');
        } else {
          var ust = hr.top + hr.height / 2 - er.top - 60, alt = cb.height - panel.offsetHeight;
          panel.style.setProperty('--panel-ust', Math.max(0, Math.min(ust, alt)) + 'px');
        }
      }
    }
    liste.addEventListener('click', function (e) { var b = e.target.closest('button[data-p]'); if (b) sec(b.getAttribute('data-p')); });
    liste.addEventListener('keydown', function (e) {
      var i = Array.prototype.indexOf.call(sekmeler, document.activeElement);
      if (i < 0) return;
      var n = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? sekmeler.length - 1 : null;
      if (n === null) return;
      e.preventDefault();
      n = (n + sekmeler.length) % sekmeler.length;
      sec(sekmeler[n].getAttribute('data-p'), true);
    });
    yazitipiHazir().then(function () { yerlestir(); sec('kalem'); });
    window.addEventListener('resize', function () {
      var s = liste.querySelector('[aria-pressed="true"]');
      requestAnimationFrame(function () { yerlestir(); if (s) sec(s.getAttribute('data-p')); });
    });
  }

  /* ========================================================== ŞEKİLLER VE AÇILAR
     Sorunun şeklinin üstüne OSNote'un üçgeni: köşeler sürüklenir, açılar yazılır. Örnekte kalem ucu
     üçgeni çizer, sonra köşeleri tek tek şeklin köşelerine taşır; aralarda kalkıp geçer. */
  function sekilKur() {
    var tablet = document.querySelector('[data-sekil-tablet]');
    if (!tablet) return;
    var c = new Cihaz(tablet), ipucu = document.querySelector('[data-sekil-ipucu]');
    var v = null, hedef = null, surukle = null, kare = 0, oynuyor = false;
    var KIRMIZI = RENK[1];

    function hedefBul() {
      var svg = c.ekran.querySelector('.t-cizim'), b = c.kutu(svg);
      if (!b) return null;
      var k = b.w / 400;
      return [b.x + 70 * k, b.y + 40 * k, b.x + 70 * k, b.y + 220 * k, b.x + 382 * k, b.y + 220 * k]; // A, B, C
    }
    function susuOlcek() { return Math.min(1, c.olcek / 0.88); }
    function ciz() {
      var ctx = c.baglam();
      if (!v) return;
      M.cizgi(ctx, M.sekilYol('ucgen', v), KIRMIZI, 4, true);
      M.sekilSusu(ctx, 'ucgen', v, susuOlcek(), M.dpr());
    }
    function ipucuYaz() {
      if (!ipucu || !v) return;
      var a = M.acilar(v);
      var guzel = a.filter(function (x) { return [30, 45, 60, 90, 120, 135, 150].indexOf(x) >= 0; }).length;
      ipucu.textContent = dil('Açılar: ', 'Angles: ') + a[0] + '°, ' + a[1] + '°, ' + a[2] + '°.' + (guzel ? dil(' Sarı yazılanlar tam açı.', ' The yellow ones are clean angles.') : dil(' Köşeleri sürükle.', ' Drag the corners.'));
    }
    function kur() {
      if (!c.boyutla()) return;
      hedef = hedefBul();
      ciz();
      if (!oynuyor) S.ucYuvada(c);
    }
    function bitis() {
      v = [hedef[0], hedef[1], hedef[4], hedef[5], hedef[2], hedef[3]];
      ciz();
      if (ipucu) ipucu.textContent = dil('C köşesi 30°, B köşesi 90°: cevap B şıkkı. Şimdi sen sürükle.', 'Corner C is 30°, corner B is 90°: the answer is B. Now you drag.');
    }
    // örnek: üçgeni çiz (sürükle), köşeleri şeklin köşelerine taşı
    function ornek() {
      if (!hedef) return;
      oynuyor = true;
      cancelAnimationFrame(kare);
      if (AZ) { oynuyor = false; bitis(); return; }
      var ax = hedef[0] + 60, ay = hedef[1] + 10, bx = hedef[4] - 40, by = hedef[3] - 6, Y = c.yuva();
      var sur = [{ a: [ax, ay], b: [bx, by], s: 1.0, cizim: true }];
      var vv = M.sekilKur('ucgen', ax, ay, bx, by);
      [[0, 0], [2, 2], [1, 4]].forEach(function (e) {
        var i = e[0], j = e[1];
        sur.push({ a: [vv[i * 2], vv[i * 2 + 1]], b: [hedef[j], hedef[j + 1]], s: 0.75, i: i });
        vv = M.tutamacTasi('ucgen', vv, i, hedef[j], hedef[j + 1]);
      });
      var t = Y ? 1.35 : 1.0;   // kalem önce bir an yuvasında görünür
      sur.forEach(function (x, k) {
        if (k) t += 0.3 + Math.hypot(x.a[0] - sur[k - 1].b[0], x.a[1] - sur[k - 1].b[1]) / 1500;
        x.t0 = t;
        t += x.s;
      });
      var yol = S.izKur(sur.map(function (x) {
        return {
          bas: x.t0, son: x.t0 + x.s, ilk: { x: x.a[0], y: x.a[1], h: 0 }, sonP: { x: x.b[0], y: x.b[1], h: 0 },
          poz: function (tt) { var e = M.yumusak(M.sinirla((tt - x.t0) / x.s, 0, 1)); return { x: x.a[0] + (x.b[0] - x.a[0]) * e, y: x.a[1] + (x.b[1] - x.a[1]) * e, h: 0, yaz: true }; }
        };
      }), Y ? { yuva: Y } : { x: c.W + 90, y: c.H * 0.72, h: 60 }, Y ? { yuva: Y } : { x: c.W + 90, y: c.H * 0.72, h: 60, gizli: true }, 1.0, 0.9, c);
      var bas = 0;
      var yap = function (z) {
        if (!bas) bas = z;
        var tt = (z - bas) / 1000, w = null;
        for (var k = 0; k < sur.length; k++) {
          var x = sur[k];
          if (tt < x.t0) break;
          var e = M.yumusak(M.sinirla((tt - x.t0) / x.s, 0, 1));
          var px = x.a[0] + (x.b[0] - x.a[0]) * e, py = x.a[1] + (x.b[1] - x.a[1]) * e;
          w = x.cizim ? M.sekilKur('ucgen', ax, ay, px, py) : M.tutamacTasi('ucgen', w, x.i, px, py);
        }
        v = w;
        ciz();
        S.ucKoy(c, yol(tt), tt);
        if (tt < yol.son) { kare = requestAnimationFrame(yap); return; }
        oynuyor = false;
        S.ucYuvada(c);
        bitis();
      };
      kare = requestAnimationFrame(yap);
    }

    function nokta(e) { var r = c.tuval.getBoundingClientRect(); return [(e.clientX - r.left) / c.olcek, (e.clientY - r.top) / c.olcek]; }
    c.tuval.addEventListener('pointerdown', function (e) {
      if (oynuyor || !v) return;
      var n = nokta(e), yakin = -1, en = Math.pow(26 / c.olcek, 2);
      for (var i = 0; i < 3; i++) {
        var dx = v[i * 2] - n[0], dy = v[i * 2 + 1] - n[1], dd = dx * dx + dy * dy;
        if (dd < en) { en = dd; yakin = i; }
      }
      if (yakin < 0 && !M.icinde(v, n[0], n[1])) return;
      e.preventDefault();
      try { c.tuval.setPointerCapture(e.pointerId); } catch (_) { /* yok */ }
      surukle = { id: e.pointerId, i: yakin, x: n[0], y: n[1], v: v.slice() };
    });
    c.tuval.addEventListener('pointermove', function (e) {
      if (!surukle || surukle.id !== e.pointerId) return;
      var n = nokta(e);
      n[0] = M.sinirla(n[0], 8, c.W - 8);
      n[1] = M.sinirla(n[1], 40, c.H - 8);
      if (surukle.i >= 0) v = M.tutamacTasi('ucgen', v, surukle.i, n[0], n[1]);
      else {
        var dx = n[0] - surukle.x, dy = n[1] - surukle.y;
        v = surukle.v.map(function (s, k) { return s + (k % 2 ? dy : dx); });
      }
      ciz();
      ipucuYaz();
    });
    var birak = function (e) { if (surukle && surukle.id === e.pointerId) surukle = null; };
    c.tuval.addEventListener('pointerup', birak);
    c.tuval.addEventListener('pointercancel', birak);
    var yeniden = document.querySelector('[data-sekil-yeniden]');
    if (yeniden) yeniden.addEventListener('click', function () { cancelAnimationFrame(kare); v = null; ciz(); ornek(); });

    yazitipiHazir().then(function () {
      kur();
      if (!('IntersectionObserver' in window)) { ornek(); return; }
      var io = new IntersectionObserver(function (g) {
        if (!g[0].isIntersecting) return;
        io.disconnect();
        ornek();
      }, { threshold: 0.5 });
      io.observe(tablet);
    });
    // cihazın içi tasarım pikseliyle: ölçek değişse de köşelerin yeri aynı kalır
    window.addEventListener('resize', function () { requestAnimationFrame(kur); });
  }

  /* ========================================================== SAYFA VE YAKALA */
  function sayfaKur() {
    var kok = document.querySelector('[data-sayfa-sahne]');
    if (!kok) return;
    var tel = kok.querySelector('.tel'), c = new Cihaz(tel), kagit = tel.querySelector('[data-kagit]');
    var sayfaD = tel.querySelector('.oc__k[data-a="sayfa"]');
    var acD = kok.querySelector('[data-sp-ac]'), renkler = kok.querySelectorAll('[data-sp-renk] [role="radio"]'), desenler = kok.querySelectorAll('[data-sp-desen] [role="radio"]');
    var opak = kok.querySelector('[data-sp-opak]'), opakYazi = kok.querySelector('[data-sp-opak-yazi]'), onizleme = kok.querySelector('[data-sp-onizleme]');
    var not = kok.querySelector('[data-sp-yakala-not]');
    var d = { acik: true, renk: '#FAFAFA', desen: 'kareli', opak: 95 };   // uygulamanın varsayılanı %95
    var KOYU = { '#1E1E2E': 1, '#282C34': 1 };
    var sen = null, oynadi = false;

    function uygula() {
      kagit.hidden = !d.acik;
      kagit.setAttribute('data-desen', d.desen);
      kagit.classList.toggle('tel__kagit--koyu', !!KOYU[d.renk]);
      kagit.style.setProperty('--zemin', d.renk);
      kagit.style.setProperty('--opak', String(d.opak / 100));
      if (sayfaD) sayfaD.classList.toggle('oc__k--acik', d.acik);
      if (onizleme) { onizleme.style.setProperty('--zemin', d.renk); onizleme.style.opacity = String(d.opak / 100); onizleme.setAttribute('data-desen', d.desen); }
      if (opakYazi) opakYazi.textContent = dil('%' + d.opak, d.opak + '%');
      if (opak) opak.style.setProperty('--y', ((d.opak - 40) / 60 * 100).toFixed(1) + '%');
      // koyu kâğıtta mürekkep açık renk olsun diye değil: uygulamada mürekkep rengini sen seçersin
    }
    function radyo(grup, deger) {
      for (var i = 0; i < grup.length; i++) grup[i].setAttribute('aria-checked', String(grup[i].getAttribute('data-deger') === deger));
    }
    if (acD) acD.addEventListener('change', function () { d.acik = acD.checked; uygula(); });
    Array.prototype.forEach.call(renkler, function (b) { b.addEventListener('click', function () { d.renk = b.getAttribute('data-deger'); radyo(renkler, d.renk); uygula(); }); });
    Array.prototype.forEach.call(desenler, function (b) { b.addEventListener('click', function () { d.desen = b.getAttribute('data-deger'); radyo(desenler, d.desen); uygula(); }); });
    if (opak) opak.addEventListener('input', function () { d.opak = +opak.value; uygula(); });
    // radyo gruplarında ok tuşları
    [renkler, desenler].forEach(function (grup) {
      Array.prototype.forEach.call(grup, function (b, i) {
        b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1;
        b.addEventListener('keydown', function (e) {
          var n = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? i - 1 : null;
          if (n === null) return;
          e.preventDefault();
          n = (n + grup.length) % grup.length;
          grup[n].click();
          for (var k = 0; k < grup.length; k++) grup[k].tabIndex = k === n ? 0 : -1;
          grup[n].focus();
        });
        b.addEventListener('click', function () { for (var k = 0; k < grup.length; k++) grup[k].tabIndex = grup[k] === b ? 0 : -1; });
      });
    });

    // karalama kâğıdı: önce yörüngenin küçük bir çizimi (zemin, yol, tepeden inen kesik çizgi, h, açı), altında
    // hesap. İkinci satır yanlış (yarıyı unutmuş): üstü karalanır, doğrusu altına yazılır; kırmızıya dokunup
    // sonucun altını iki kez çizer. Kalem sonra çekilip gider.
    function elCizgiS(n, tohum) { return [{ p: M.titret(M.duzlestir(n, 3), 0.8, tohum), duz: true }]; }
    function sinir(parca) {
      var k = [Infinity, Infinity, -Infinity, -Infinity];
      parca.forEach(function (q) { for (var i = 0; i < q.p.length; i += 2) { k[0] = Math.min(k[0], q.p[i]); k[1] = Math.min(k[1], q.p[i + 1]); k[2] = Math.max(k[2], q.p[i]); k[3] = Math.max(k[3], q.p[i + 1]); } });
      return k;
    }
    function senKur() {
      var plan = new S.Plan(c, { dinlen: [c.W + 40, c.H + 120], giris: 0.2 });
      var mavi = RENK[2], kirmizi = RENK[1];
      var x0 = 98, x2 = 318, yz = 234, xt = (x0 + x2) / 2, yt = 116;
      plan.ciz(elCizgiS([x0 - 16, yz + 1, xt, yz - 0.5, x2 + 14, yz - 1], 5), mavi, 2.4, 900, 0);
      var yol = [];
      for (var i = 0; i <= 26; i++) { var t = i / 26, u = 1 - t; yol.push(u * u * x0 + 2 * u * t * xt + t * t * x2, u * u * yz + 2 * u * t * (2 * yt - yz) + t * t * yz); }
      plan.ciz([{ p: M.titret(yol, 1, 7), duz: true }], mavi, 2.8, 700, 0.03);
      for (var k = 0; k < 4; k++) { var ya = yt + 9 + k * 27; plan.ciz(elCizgiS([xt + 0.4 * k, ya, xt + 0.4 * k + 0.5, ya + 13], 30 + k), mavi, 2.2, 1300, 0); }
      plan.ciz(yazi('s_h', xt + 9, (yt + yz) / 2 + 14, 24, -0.03), mavi, 2.6, 820, 0.04);
      var yay = [];
      for (var a = 0; a <= 10; a++) { var q = -a / 10 * 0.9273; yay.push(x0 + 27 * Math.cos(q), yz + 27 * Math.sin(q)); }
      plan.ciz([{ p: M.titret(yay, 0.5, 9), duz: true }], mavi, 2.2, 700, 0.03);
      plan.ciz(yazi('s_aci', x0 + 32, yz - 7, 16, -0.03), mavi, 2.2, 820, 0.04);
      plan.bekle(0.18);
      // hesap: satırlar elle yazılmış gibi biraz kayar
      var lx = 82;
      plan.ciz(yazi('g_1', lx, 302, 25, -0.03), mavi, 2.8, 820, 0.05);
      plan.bekle(0.12);
      var hata = yazi('s_hata', lx + 5, 352, 25, -0.02), kh = sinir(hata);
      plan.ciz(hata, mavi, 2.8, 820, 0.05);
      plan.bekle(0.4);
      var zik = [], ym = (kh[1] + kh[3]) / 2, ad = 0;
      for (var zx = kh[0] - 5; zx <= kh[2] + 6; zx += 9) zik.push(zx, ym + (ad++ % 2 ? -8 : 8));
      plan.ciz([{ p: M.titret(M.duzlestir(zik, 2.5), 0.5, 12), duz: true }], mavi, 2.4, 1500, 0);
      plan.bekle(0.2);
      var dogru = yazi('y_4', lx + 2, 404, 25, -0.02), kd = sinir(dogru);
      plan.ciz(dogru, mavi, 2.8, 820, 0.05);
      plan.bekle(0.1);
      plan.dokun('[data-r="1"]', { renk: 1 });
      var ry = kd[3] + 5;
      plan.ciz(elCizgiS([kd[2] - 60, ry + 0.5, kd[2] + 4, ry - 1.2], 71), kirmizi, 3, 900, 0);
      plan.ciz(elCizgiS([kd[2] - 54, ry + 7.5, kd[2] + 8, ry + 5.5], 72), kirmizi, 3, 900, 0.03);
      return plan.senaryo({ el: false, arac: 'kalem', renk: 2 }, { cikis: [c.W + 60, c.H + 150, 70], cikisGizli: true });
    }
    function kur() {
      if (!c.boyutla()) return;
      var video = tel.querySelector('[data-ders]');
      if (video) V.dersCiz(video, V.DERS.tepeT, -1);
      sen = senKur();
      sen.ciz(oynadi || AZ ? sen.son : 0);
    }
    function yazilar() { return sen ? sen.adimlar.filter(function (a) { return a.tur === 'ciz'; }) : []; }
    function yakala(tur) {
      if (!sen || !OSN.kutuphane) return;
      var s = 2, W = 360, H = 780, cv = document.createElement('canvas'), x;
      if (tur === 'yazi') {
        // yazının çevresi, beyaz zeminde
        var k = [Infinity, Infinity, -Infinity, -Infinity];
        yazilar().forEach(function (a) {
          a.o.parca.forEach(function (p) { var b = M.kutu(p.p, a.o.k); k = [Math.min(k[0], b[0]), Math.min(k[1], b[1]), Math.max(k[2], b[2]), Math.max(k[3], b[3])]; });
        });
        k = [Math.max(0, k[0] - 20), Math.max(0, k[1] - 20), Math.min(W, k[2] + 20), Math.min(H, k[3] + 20)];
        cv.width = (k[2] - k[0]) * s; cv.height = (k[3] - k[1]) * s;
        x = cv.getContext('2d');
        x.fillStyle = '#FFFFFF';
        x.fillRect(0, 0, cv.width, cv.height);
        x.setTransform(s, 0, 0, s, -k[0] * s, -k[1] * s);
        yazilar().forEach(function (a) { a.o.parca.forEach(function (p) { M.cizgi(x, p.p, a.o.renk, a.o.k, p.duz); }); });
      } else {
        cv.width = W * s; cv.height = H * s;
        x = cv.getContext('2d');
        x.setTransform(s, 0, 0, s, 0, 0);
        ekranResmi(x, tel, c);
        if (d.acik) {
          x.save();
          x.globalAlpha = d.opak / 100;
          M.kagit(x, W, H, d.desen, d.renk, KOYU[d.renk] ? 'rgba(255,255,255,0.16)' : 'rgba(17,17,17,0.14)', 30);
          x.restore();
        }
        yazilar().forEach(function (a) { a.o.parca.forEach(function (p) { M.cizgi(x, p.p, a.o.renk, a.o.k, p.duz); }); });
      }
      M.tuvalBlob(cv, 'image/png').then(function (blob) {
        OSN.kutuphane.ekle({ tur: tur === 'yazi' ? 'yazi' : 'ekran', blob: blob, en: cv.width, boy: cv.height });
        if (OSN.duyur) OSN.duyur(dil('Kütüphanende, güvende.', 'In your library, safe and sound.'), '#kutuphane', dil('Kütüphaneye git', 'Go to library'));
        if (not) not.textContent = dil((tur === 'yazi' ? 'Sadece yazı' : 'Arka plan dahil yazı') + ' kütüphaneye eklendi. Aşağıdaki deneme bölümünde duruyor.',
          (tur === 'yazi' ? 'Your writing' : 'Your writing and the screen behind it') + ' went to the library. It’s in the Try it section below.');
      }).catch(function () { if (not) not.textContent = dil('Kaydedilemedi, bir daha dene.', 'Couldn’t save it. Try again.'); });
    }
    Array.prototype.forEach.call(kok.querySelectorAll('[data-sp-yakala]'), function (b) {
      b.addEventListener('click', function () { yakala(b.getAttribute('data-sp-yakala')); });
    });

    uygula();
    yazitipiHazir().then(function () {
      kur();
      if (AZ || !('IntersectionObserver' in window)) { oynadi = true; if (sen) sen.ciz(sen.son); return; }
      var io = new IntersectionObserver(function (g) {
        if (!g[0].isIntersecting || oynadi) return;
        io.disconnect();
        oynadi = true;
        if (sen) { sen.ciz(0); oynat(sen, 0.2); }
      }, { threshold: 0.5 });
      io.observe(tel);
    });
    window.addEventListener('resize', function () { requestAnimationFrame(function () { if (!sen || !oynuyor(sen)) kur(); }); });
  }

  /* ========================================================== DEFTERLER: GERÇEK EKRANLAR
     Dikey tablette uygulamanın gerçek ekranları; yandaki listeden seçilir. Bölüm görünürken ekranlar
     kendiliğinden ilerler (seçili satırın altında süre çizgisi); kullanıcı seçince durur. */
  function ekranlarKur() {
    var kok = document.querySelector('[data-ekranlar]');
    if (!kok) return;
    var ekran = kok.querySelectorAll('.defter-ekran'), dugme = kok.querySelectorAll('[data-ekran-sec]');
    var d = { sira: 0, bas: 0, kare: 0, gorunur: false, elle: false }, SURE = 4.2;
    function sec(i, kullanici) {
      d.sira = i;
      d.bas = 0;
      for (var k = 0; k < ekran.length; k++) ekran[k].classList.toggle('defter-ekran--acik', k === i);
      for (var j = 0; j < dugme.length; j++) {
        dugme[j].setAttribute('aria-pressed', String(j === i));
        dugme[j].tabIndex = j === i ? 0 : -1;
        dugme[j].style.setProperty('--ilerleme', '0');
      }
      if (kullanici) d.elle = true;
    }
    function dongu(z) {
      d.kare = 0;
      if (!d.gorunur || d.elle) return;
      if (!d.bas) d.bas = z;
      var q = (z - d.bas) / 1000 / SURE;
      dugme[d.sira].style.setProperty('--ilerleme', Math.min(1, q).toFixed(4));
      if (q >= 1) sec((d.sira + 1) % ekran.length);
      d.kare = requestAnimationFrame(dongu);
    }
    Array.prototype.forEach.call(dugme, function (b, i) {
      b.tabIndex = i === 0 ? 0 : -1;
      b.addEventListener('click', function () { sec(i, true); });
      b.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? i - 1 : null;
        if (n === null) return;
        e.preventDefault();
        n = (n + dugme.length) % dugme.length;
        sec(n, true);
        dugme[n].focus();
      });
    });
    OSN.defterEkran = { d: d, sec: sec };
    if (AZ || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (g) {
      d.gorunur = g[0].isIntersecting;
      if (d.gorunur && !d.kare && !d.elle) { d.bas = 0; d.kare = requestAnimationFrame(dongu); }
      else if (!d.gorunur) { cancelAnimationFrame(d.kare); d.kare = 0; }
    }, { threshold: 0.4 }).observe(kok);
  }

  // "Arka plan dahil yazı": ders videosunun ekranını tuvale çizer (durum çubuğu, kare, başlık, bölümler)
  function ekranResmi(x, tel, c) {
    x.fillStyle = '#0F0F0F';
    x.fillRect(0, 0, 360, 780);
    var video = tel.querySelector('[data-ders]');
    var kb = c.kutu('.d-kare') || { x: 0, y: 32, w: 360, h: 203 };
    if (video && video.width) x.drawImage(video, kb.x, kb.y, kb.w, kb.h);
    x.textBaseline = 'alphabetic';
    x.fillStyle = '#FFFFFF';
    x.font = '500 14px Roboto, system-ui, sans-serif';
    var saat = tel.querySelector('.durum b');
    x.fillText(saat ? saat.textContent : '', 26, 22);
    var metinler = [['.d-baslik', '500 16px', '#F1F1F1', 21], ['.d-meta', '400 12.5px', '#AAAAAA', 16], ['.d-ara', '500 13px', '#AAAAAA', 16]];
    metinler.forEach(function (m) {
      var el = tel.querySelector(m[0]);
      if (!el) return;
      var b = c.kutu(el);
      x.font = m[1] + ' Roboto, system-ui, sans-serif';
      x.fillStyle = m[2];
      satirla(x, el.textContent, b.x, b.y + m[3] * 0.78, b.w + 2, m[3]);
    });
    Array.prototype.forEach.call(tel.querySelectorAll('.d-bolumler li'), function (li) {
      var b = c.kutu(li), orta = b.y + b.h / 2 + 4.5;
      if (li.classList.contains('d-simdi')) { x.fillStyle = '#262626'; kutuYol(x, b.x, b.y, b.w, b.h, 10); x.fill(); }
      var z = c.kutu(li.querySelector('time')), ad = c.kutu(li.querySelector('span'));
      x.font = '500 12.5px Roboto, system-ui, sans-serif';
      x.fillStyle = '#8AB4F8';
      x.fillText(li.querySelector('time').textContent, z.x, orta);
      x.font = '400 13.5px Roboto, system-ui, sans-serif';
      x.fillStyle = li.classList.contains('d-simdi') ? '#FFFFFF' : '#D6D6D6';
      x.fillText(li.querySelector('span').textContent, ad.x, orta);
    });
  }
  function satirla(x, metin, sx, sy, en, satir) {
    var kelime = metin.split(/\s+/), s = '', y = sy;
    for (var i = 0; i < kelime.length; i++) {
      var dene = s ? s + ' ' + kelime[i] : kelime[i];
      if (x.measureText(dene).width > en && s) { x.fillText(s, sx, y); s = kelime[i]; y += satir; }
      else s = dene;
    }
    if (s) x.fillText(s, sx, y);
  }

  function init() {
    // çubukların kalem simgesi: seçili rengi taşı
    var ocs = document.querySelectorAll('.oc');
    for (var i = 0; i < ocs.length; i++) {
      var sec = ocs[i].querySelector('.oc__renkler .sec');
      if (sec && ocs[i].querySelector('.oc__a--sec')) ocs[i].style.setProperty('--kr', RENK[+sec.getAttribute('data-r')]);
    }
    girisKur();
    katmanKur();
    elModuKur();
    anatomiKur();
    sekilKur();
    sayfaKur();
    ekranlarKur();
  }
  init();
  OSN.ekranlar = { senGiris: senGiris };
})();
