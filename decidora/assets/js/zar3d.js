/*!
 * Decidora tanıtım sitesi — zar ve para çizici
 * Canvas 2D, eğik bakışlı dik izdüşüm. Dış kütüphane yok.
 *
 * Görünüm 217 Products'ın kâğıt ve mürekkep dilinde: zarlar porselen beyazı,
 * hatları mürekkeple çekilmiş; altı yüzlüde "1" Japon zarlarındaki gibi iri
 * ve kırmızı. Para gümüş; "Tura" yüzünde kırmızı bir mühür var ("tura"
 * sözcüğü tuğradan, yani bir mühür imzasından geliyor), "Yazı" yüzünde yazı.
 *
 * Masa koordinatları piksel cinsindendir:
 *   x → sağa, y → masanın içine (ekranda yukarı), z → masadan yukarı.
 * Dik izdüşümde her yüzün ekrana eşlenmesi afin olduğu için rakamlar,
 * noktalar ve para üstündeki yazılar setTransform ile birebir yüzeye oturur.
 */
(function (kok) {
  'use strict';

  /* ------------------------------------------------------------ vektör */
  const V = {
    ekle: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    cikar: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    carp: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    ic: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    dis: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    boy: (a) => Math.hypot(a[0], a[1], a[2]),
    birim: (a) => {
      const l = Math.hypot(a[0], a[1], a[2]) || 1;
      return [a[0] / l, a[1] / l, a[2] / l];
    },
  };

  /* ------------------------------------------------------------ 3x3 matris (satır öncelikli) */
  const M = {
    birim: () => [1, 0, 0, 0, 1, 0, 0, 0, 1],
    carp(a, b) {
      const r = new Array(9);
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
        }
      }
      return r;
    },
    uygula: (m, v) => [
      m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
      m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
      m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
    ],
    eksenAci(eksen, aci) {
      const [x, y, z] = V.birim(eksen);
      const c = Math.cos(aci), s = Math.sin(aci), t = 1 - c;
      return [
        t * x * x + c, t * x * y - s * z, t * x * z + s * y,
        t * x * y + s * z, t * y * y + c, t * y * z - s * x,
        t * x * z - s * y, t * y * z + s * x, t * z * z + c,
      ];
    },
    sutunlardan: (a, b, c) => [a[0], b[0], c[0], a[1], b[1], c[1], a[2], b[2], c[2]],
    devrik: (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]],
  };

  /* ------------------------------------------------------------ geometri */
  const PHI = (1 + Math.sqrt(5)) / 2;

  function kose(tur) {
    const v = [];
    if (tur === 4) {
      v.push([1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]);
    } else if (tur === 6) {
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) v.push([x, y, z]);
    } else if (tur === 8) {
      v.push([1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]);
    } else if (tur === 10 || tur === 100) {
      // Beşgen yamuk yüzlü (d10). Uçurtma yüzlerin düzlemsel olması için
      // tepe yüksekliği halka yüksekliğine bağlı: h = z0 (1 + cos36) / (1 - cos36)
      const z0 = 0.105;
      const c36 = Math.cos(Math.PI / 5);
      const h = z0 * (1 + c36) / (1 - c36);
      v.push([0, 0, h], [0, 0, -h]);
      for (let k = 0; k < 5; k++) {
        const a = (k * 2 * Math.PI) / 5;
        v.push([Math.cos(a), Math.sin(a), z0]);
        const b = a + Math.PI / 5;
        v.push([Math.cos(b), Math.sin(b), -z0]);
      }
    } else if (tur === 12) {
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) v.push([x, y, z]);
      for (const a of [-1, 1]) {
        for (const b of [-1, 1]) {
          v.push([0, a / PHI, b * PHI]);
          v.push([a / PHI, b * PHI, 0]);
          v.push([a * PHI, 0, b / PHI]);
        }
      }
    } else if (tur === 20) {
      for (const a of [-1, 1]) {
        for (const b of [-1, 1]) {
          v.push([0, a, b * PHI]);
          v.push([a, b * PHI, 0]);
          v.push([a * PHI, 0, b]);
        }
      }
    }
    // çevrel yarıçapı 1'e getir
    const r = Math.max(...v.map(V.boy));
    return v.map((p) => V.carp(p, 1 / r));
  }

  // Dışbükey zarf: tüm üçlüleri dene, diğer köşeler tek tarafta kalıyorsa yüz düzlemidir.
  function zarf(k) {
    const yuzler = [];
    const n = k.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        for (let l = j + 1; l < n; l++) {
          let nr = V.dis(V.cikar(k[j], k[i]), V.cikar(k[l], k[i]));
          const L = V.boy(nr);
          if (L < 1e-9) continue;
          nr = V.carp(nr, 1 / L);
          let d = V.ic(nr, k[i]);
          let arti = 0, eksi = 0;
          for (let m = 0; m < n; m++) {
            const s = V.ic(nr, k[m]) - d;
            if (s > 1e-6) arti++;
            else if (s < -1e-6) eksi++;
          }
          if (arti && eksi) continue;
          if (arti) { nr = V.carp(nr, -1); d = -d; }
          if (yuzler.some((f) => V.ic(f.n, nr) > 1 - 1e-6)) continue;
          const idx = [];
          for (let m = 0; m < n; m++) if (Math.abs(V.ic(nr, k[m]) - d) < 1e-5) idx.push(m);
          yuzler.push({ n: nr, d, idx });
        }
      }
    }
    for (const f of yuzler) {
      const ort = V.carp(f.idx.reduce((s, i) => V.ekle(s, k[i]), [0, 0, 0]), 1 / f.idx.length);
      const a = V.birim(V.cikar(k[f.idx[0]], ort));
      const b = V.dis(f.n, a);
      const aci = (i) => {
        const p = V.cikar(k[i], ort);
        return Math.atan2(V.ic(p, b), V.ic(p, a));
      };
      f.idx.sort((p, q) => aci(p) - aci(q));
      // alan ağırlıklı merkez
      let alan = 0, m = [0, 0, 0];
      const p0 = k[f.idx[0]];
      for (let t = 1; t < f.idx.length - 1; t++) {
        const p1 = k[f.idx[t]], p2 = k[f.idx[t + 1]];
        const al = V.boy(V.dis(V.cikar(p1, p0), V.cikar(p2, p0))) / 2;
        alan += al;
        m = V.ekle(m, V.carp(V.ekle(V.ekle(p0, p1), p2), al / 3));
      }
      f.c = V.carp(m, 1 / alan);
      // iç yarıçap: merkezden kenarlara en kısa uzaklık
      let ic = Infinity;
      for (let t = 0; t < f.idx.length; t++) {
        const A = k[f.idx[t]], B = k[f.idx[(t + 1) % f.idx.length]];
        const AB = V.cikar(B, A);
        const w = V.dis(AB, V.cikar(f.c, A));
        ic = Math.min(ic, V.boy(w) / V.boy(AB));
      }
      f.ic = ic;
    }
    return yuzler;
  }

  function karistir(dizi, tohum) {
    // belirlenimci karıştırma: aynı zar türü hep aynı dizilişte olsun
    let s = tohum;
    const r = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const a = dizi.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const GEO = {};
  function geometri(tur) {
    if (GEO[tur]) return GEO[tur];
    const k = kose(tur);
    const yuzler = zarf(k);
    // yüzün "yukarı"sı: yazının üst ucu hangi yöne bakacak
    for (const f of yuzler) {
      let hedef;
      if (tur === 6) {
        hedef = V.ekle(k[f.idx[0]], k[f.idx[1]]);
        hedef = V.carp(hedef, 0.5);
      } else if (tur === 10 || tur === 100) {
        hedef = f.idx.map((i) => k[i]).sort((a, b) => V.boy(V.cikar(b, f.c)) - V.boy(V.cikar(a, f.c)))[0];
      } else {
        hedef = k[f.idx[0]];
      }
      f.yukari = V.birim(V.cikar(hedef, f.c));
    }
    // karşılıklı yüz çiftleri
    const esli = new Array(yuzler.length).fill(-1);
    yuzler.forEach((f, i) => {
      yuzler.forEach((g, j) => {
        if (i !== j && V.ic(f.n, g.n) < -1 + 1e-6) esli[i] = j;
      });
    });
    const yuzSayisi = yuzler.length;
    const deger = new Array(yuzSayisi).fill(0);
    if (tur === 4) {
      // d4: değerler köşelerde; yüz değeri o yüzün karşısındaki köşe
      const kd = [1, 2, 3, 4];
      yuzler.forEach((f, i) => {
        const karsi = [0, 1, 2, 3].find((m) => !f.idx.includes(m));
        deger[i] = kd[karsi];
      });
      GEO[tur] = { tur, k, yuzler, deger, koseDeger: kd, yukseklik: -Math.min(...k.map((p) => p[2])) };
    } else {
      const ciftler = [];
      const goruldu = new Set();
      yuzler.forEach((f, i) => {
        if (goruldu.has(i)) return;
        goruldu.add(i);
        goruldu.add(esli[i]);
        ciftler.push([i, esli[i]]);
      });
      const N = yuzSayisi;
      const sira = karistir(ciftler, tur * 7919);
      sira.forEach(([a, b], p) => {
        deger[a] = p + 1;
        deger[b] = N - p;
      });
      GEO[tur] = { tur, k, yuzler, deger };
    }
    return GEO[tur];
  }

  /* ------------------------------------------------------------ zar boyutları ve yazı ölçüleri */
  // Görsel büyüklük dengesi: çevrel yarıçap çarpanı
  const OLCEK = { 4: 1.36, 6: 1.0, 8: 1.1, 10: 1.1, 12: 1.06, 20: 1.08, 100: 1.1 };
  // yazı boyu (100 birim = yüz iç yarıçapı)
  const YAZI = { 4: 64, 8: 92, 10: 92, 12: 88, 20: 100, 100: 76 };

  /* ------------------------------------------------------------ kamera */
  const ACI = (40 * Math.PI) / 180;
  const COS = Math.cos(ACI), SIN = Math.sin(ACI);
  const BAKIS = [0, -SIN, COS];                  // kameraya doğru
  const ISIK = V.birim([-0.42, -0.5, 0.86]);      // ışığa doğru (sol, ön, üst)
  const YARIM = V.birim(V.ekle(ISIK, BAKIS));

  function kamera(yukseklik, dpr) {
    return {
      h: yukseklik,
      dpr: dpr || 1,
      // masa noktası → ekran (CSS px)
      nokta: (p) => [p[0], yukseklik - (p[1] * COS + p[2] * SIN)],
      yon: (d) => [d[0], -(d[1] * COS + d[2] * SIN)],
    };
  }
  // ekran y'sinden (dinlenme noktası) masa y'sine
  const masaY = (h, ekranY) => (h - ekranY) / COS;

  /* ------------------------------------------------------------ renk */
  const karis = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgb = (c, a) => (a == null
    ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
    : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`);

  const PORSELEN_ACIK = [255, 255, 255];
  const PORSELEN_KOYU = [150, 153, 162];
  function golgeRenk(n, acik, koyu) {
    const lam = Math.max(0, V.ic(n, ISIK));
    const t = Math.min(1, 0.34 + 0.7 * lam);
    const sp = Math.pow(Math.max(0, V.ic(n, YARIM)), 28) * 0.1;
    const c = karis(koyu || PORSELEN_KOYU, acik || PORSELEN_ACIK, t);
    return karis(c, [255, 255, 255], Math.min(1, sp * 4));
  }
  const MUREKKEP = '#151515';
  const KIRMIZI = [224, 64, 42];      // 217'nin mühür kırmızısı (--vermilion)
  const KIRMIZI_KOYU = [191, 50, 24]; // --vermilion-deep

  /* ------------------------------------------------------------ 2B dışbükey zarf (gölge için) */
  function zarf2(p) {
    const n = p.length;
    if (n < 3) return p.slice();
    const s = p.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const alt = [];
    for (const q of s) {
      while (alt.length >= 2 && cr(alt[alt.length - 2], alt[alt.length - 1], q) <= 0) alt.pop();
      alt.push(q);
    }
    const ust = [];
    for (let i = s.length - 1; i >= 0; i--) {
      const q = s[i];
      while (ust.length >= 2 && cr(ust[ust.length - 2], ust[ust.length - 1], q) <= 0) ust.pop();
      ust.push(q);
    }
    ust.pop();
    alt.pop();
    return alt.concat(ust);
  }

  // Yumuşak gölge: şekli tuvalin dışına çizip yalnız gölgesini içeri düşür (her tarayıcıda çalışır)
  function yumusakDoldur(ctx, noktalar, renk, bulanik, dpr) {
    if (noktalar.length < 3) return;
    const kay = 20000;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.shadowColor = renk;
    ctx.shadowBlur = bulanik * dpr;
    ctx.shadowOffsetX = kay;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    noktalar.forEach((q, i) => {
      const x = q[0] * dpr - kay, y = q[1] * dpr;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* ------------------------------------------------------------ zar nesnesi */
  function zarOlustur(tur, secenek) {
    const g = geometri(tur);
    const z = {
      tur,
      g,
      R: M.birim(),
      konum: [0, 0, 0],       // masa koordinatı (merkezin yere izdüşümü + yükseklik ayrıca)
      hava: 0,                 // masadan yükseklik (px)
      boy: 40,                 // çevrel yarıçap (px), OLCEK uygulanmadan
      deger: 1,
      etiket: g.deger.slice(), // yüz başına yazı
      vurgu: 0,                // 0..1 sonuç yüzü altın
      ustYuz: -1,
      ...secenek,
    };
    return z;
  }

  // Belirli bir değeri yukarı getiren dinlenme dönüşü (yaw: z çevresinde dönüş)
  function dinlenme(z, deger, yaw) {
    const g = z.g;
    let e3, e2, ust = -1, ustKose = -1;
    if (g.tur === 4) {
      const ki = g.koseDeger.indexOf(deger);
      ustKose = ki;
      e3 = V.birim(g.k[ki]);
      const diger = g.k[(ki + 1) % 4];
      e2 = V.birim(V.cikar(diger, V.carp(e3, V.ic(diger, e3))));
      e2 = V.carp(e2, -1);
    } else {
      if (g.tur === 100) {
        ust = 0;
      } else {
        ust = g.deger.indexOf(deger);
      }
      const f = g.yuzler[ust];
      e3 = f.n;
      e2 = f.yukari;
    }
    const e1 = V.dis(e2, e3);
    const t3 = [0, 0, 1];
    const t2 = [-Math.sin(yaw), Math.cos(yaw), 0];
    const t1 = V.dis(t2, t3);
    const T = M.sutunlardan(t1, t2, t3);
    const E = M.sutunlardan(e1, e2, e3);
    return { R: M.carp(T, M.devrik(E)), ust, ustKose };
  }

  // d100 için yüz etiketleri: üst yüz sonuç, diğerleri farklı iki basamaklı sayılar
  function yuzEtiketD100(deger, rastgele) {
    const et = new Array(10);
    et[0] = String(deger);
    const kullan = new Set([deger]);
    for (let i = 1; i < 10; i++) {
      let v;
      do { v = 1 + Math.floor(rastgele() * 100); } while (kullan.has(v));
      kullan.add(v);
      et[i] = String(v);
    }
    return et;
  }

  function ekranKoseleri(z, kam) {
    const s = z.boy * OLCEK[z.tur];
    const noktalar = [];
    const dunya = [];
    let minZ = Infinity;
    for (const p of z.g.k) {
      const q = M.uygula(z.R, p);
      dunya.push(q);
      if (q[2] < minZ) minZ = q[2];
    }
    const merkezZ = -minZ * s + z.hava;
    for (let i = 0; i < dunya.length; i++) {
      const q = dunya[i];
      const w = [z.konum[0] + q[0] * s, z.konum[1] + q[1] * s, merkezZ + q[2] * s];
      dunya[i] = w;
      noktalar.push(kam.nokta(w));
    }
    return { dunya, noktalar, s, merkezZ };
  }

  function zarGolge(ctx, z, kam) {
    const { dunya, s } = ekranKoseleri(z, kam);
    // yönlü gölge: ışık doğrultusunda masaya izdüşüm
    const iz = dunya.map((p) => {
      const t = p[2] / ISIK[2];
      return kam.nokta([p[0] - ISIK[0] * t, p[1] - ISIK[1] * t, 0]);
    });
    const havada = Math.min(1, z.hava / (s * 3));
    const koyuluk = 0.2 * (1 - 0.55 * havada);
    yumusakDoldur(ctx, zarf2(iz), `rgba(17,17,26,${koyuluk})`, 6 + s * 0.14 + havada * 14, kam.dpr);
    // temas gölgesi: dik izdüşüm, daha sıkı
    if (havada < 0.9) {
      const dik = dunya.map((p) => kam.nokta([p[0], p[1], 0]));
      yumusakDoldur(ctx, zarf2(dik), `rgba(17,17,26,${0.26 * (1 - havada)})`, 3 + s * 0.05, kam.dpr);
    }
  }

  function yuzYolu(ctx, noktalar, idx, dpr) {
    ctx.beginPath();
    idx.forEach((i, t) => {
      const q = noktalar[i];
      if (t) ctx.lineTo(q[0] * dpr, q[1] * dpr);
      else ctx.moveTo(q[0] * dpr, q[1] * dpr);
    });
    ctx.closePath();
  }

  // yüz düzlemine afin dönüşüm: 100 birim = yüzün iç yarıçapı
  function yuzDonusumu(ctx, z, f, kam, s, merkezZ, merkez, yukari) {
    const R = z.R;
    const n = M.uygula(R, f.n);
    const u = M.uygula(R, yukari || f.yukari);
    const r = V.dis(u, n);
    const c0 = M.uygula(R, merkez || f.c);
    const c = [z.konum[0] + c0[0] * s, z.konum[1] + c0[1] * s, merkezZ + c0[2] * s];
    const cp = kam.nokta(c);
    const k = (s * f.ic) / 100;
    const pr = kam.yon(r), pu = kam.yon(u);
    const d = kam.dpr;
    ctx.setTransform(pr[0] * k * d, pr[1] * k * d, -pu[0] * k * d, -pu[1] * k * d, cp[0] * d, cp[1] * d);
  }

  // Japon zarlarında olduğu gibi "1" beneği iri ve kırmızı
  const BIR_BENEK = 34;
  const PIPLER = {
    1: [[0, 0]],
    2: [[-52, -52], [52, 52]],
    3: [[-52, -52], [0, 0], [52, 52]],
    4: [[-52, -52], [52, -52], [-52, 52], [52, 52]],
    5: [[-52, -52], [52, -52], [0, 0], [-52, 52], [52, 52]],
    6: [[-52, -54], [-52, 0], [-52, 54], [52, -54], [52, 0], [52, 54]],
  };

  let YAZI_AILESI = '"Shippori Mincho", Georgia, serif';

  // Paranın yüzlerindeki yazı sayfanın diline göre; uygulamadaki eşleme: Yazı = Heads, Tura = Tails.
  // İngilizcesi bir harf uzun: sığmazsa yazı küçülür (en geniş: birim 100 = paranın yarıçapı).
  const PARA_EN = typeof document !== 'undefined' && document.documentElement.lang === 'en';
  const PARA_YAZI = PARA_EN ? 'Heads' : 'Yazı';
  const PARA_TURA = PARA_EN ? 'Tails' : 'Tura';
  function sigdirYaz(ctx, metin, x, y, px, enGenis) {
    ctx.font = `700 ${px}px ${YAZI_AILESI}`;
    const w = ctx.measureText(metin).width;
    if (w > enGenis) ctx.font = `700 ${(px * enGenis) / w}px ${YAZI_AILESI}`;
    ctx.fillText(metin, x, y);
  }

  /* ------------------------------------------------------------ rakam kalıpları */
  // Yüzlerdeki rakamlar her karede fillText'le yazılınca yavaş telefonda (işlemci 4×)
  // 6 × d20 atışı saniyede ~30 kareye düşüyordu: kare başına 60 döndürülmüş yazı. Her
  // rakam bir kez küçük bir tuvale yazılıp saklanıyor; karede yalnız o resim yüzün
  // dönüşümüyle basılıyor. Rakam ekranda en çok ~53 cihaz pikseli (masaüstünde tek d12),
  // telefonda ~32; kalıp bundan çok büyük olursa bellek boşa gider, küçültülürken de titrer.
  // Yalnız iki renk var: mürekkep ve kırmızı (kazananın kırmızıya dönüşü ikisinin geçişi).
  const KALIP_PX = 56;              // kalıptaki yazının piksel boyu
  const EN_COK_KALIP = 240;         // d100'ün yüzleri 1–100 arası her sayıyı gösterebiliyor
  const kaliplar = new Map();       // sıra = son kullanım; taşınca en eskisi atılır
  let kalipYazi = null;             // hangi yazı tipi yüklüyken çizildi
  const VURGU = rgb(KIRMIZI_KOYU);
  // document.fonts.check ucuz değil; her rakamda sorulunca atış başına binlerce kez
  // çağrılıyordu. Yazı tipi bir kez yüklenince öyle kalır; yüklenene dek 200 ms'de bir sor.
  let yaziYuklu = false, yaziSorgu = 0;
  function yaziHazir() {
    if (yaziYuklu || typeof document === 'undefined' || !document.fonts) return true;
    const simdi = Date.now();
    if (simdi - yaziSorgu > 200) {
      yaziSorgu = simdi;
      try { yaziYuklu = document.fonts.check(`700 20px ${YAZI_AILESI}`); } catch (e) { yaziYuklu = true; }
    }
    return yaziYuklu;
  }
  function rakamKalibi(metin, renk) {
    const yazi = YAZI_AILESI + '|' + (yaziHazir() ? 1 : 0);
    if (yazi !== kalipYazi) { kaliplar.clear(); kalipYazi = yazi; }
    const anahtar = metin + '|' + renk;
    let k = kaliplar.get(anahtar);
    if (k) {
      kaliplar.delete(anahtar);
      kaliplar.set(anahtar, k);
      return k;
    }
    const c = document.createElement('canvas');
    const x = c.getContext('2d');
    x.font = `700 ${KALIP_PX}px ${YAZI_AILESI}`;
    const w = Math.ceil(x.measureText(metin).width + KALIP_PX * 0.3);
    const h = Math.ceil(KALIP_PX * 1.5);
    c.width = w;
    c.height = h;
    x.font = `700 ${KALIP_PX}px ${YAZI_AILESI}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillStyle = renk;
    x.fillText(metin, w / 2, h / 2);
    if (metin === '6' || metin === '9') {
      const mw = x.measureText(metin).width;
      x.fillRect(w / 2 - mw * 0.42, h / 2 + KALIP_PX * 0.42, mw * 0.84, KALIP_PX * 0.075);
    }
    k = { c, w, h };
    kaliplar.set(anahtar, k);
    if (kaliplar.size > EN_COK_KALIP) kaliplar.delete(kaliplar.keys().next().value);
    return k;
  }
  // (0, dy) merkezli, fs birim boyunda rakam (fs birim = KALIP_PX kalıp pikseli)
  function rakamBas(ctx, metin, renk, fs, dy) {
    if (typeof document === 'undefined') {
      ctx.font = `700 ${fs}px ${YAZI_AILESI}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = renk;
      ctx.fillText(metin, 0, dy);
      return;
    }
    const k = rakamKalibi(metin, renk);
    const o = fs / KALIP_PX;
    ctx.drawImage(k.c, (-k.w / 2) * o, dy - (k.h / 2) * o, k.w * o, k.h * o);
  }
  // Sonuç rakamı mürekkepten kırmızıya v (0..1) kadar döner: mürekkep tam, üstüne kırmızı
  // v saydamlığıyla basılınca renk tam ara renk olur (kırmızı·v + mürekkep·(1 − v)).
  function rakamVurgulu(ctx, metin, v, fs, dy) {
    if (v < 1) rakamBas(ctx, metin, MUREKKEP, fs, dy);
    if (v > 0) {
      const a = ctx.globalAlpha;
      ctx.globalAlpha = a * Math.min(1, v);
      rakamBas(ctx, metin, VURGU, fs, dy);
      ctx.globalAlpha = a;
    }
  }
  // Seçilen türün kalıplarını boşta önceden üret: yoksa ilk atışta ilk kez görünen yüzler
  // kalıplarını aynı karede üretiyor ve o kare takılıyor.
  function kaliplariIsit(tur) {
    if (typeof document === 'undefined' || tur === 6) return;
    const g = geometri(tur);
    const is = [];
    if (tur === 100) {
      for (let v = 1; v <= 100; v++) is.push([String(v), MUREKKEP]);
    } else {
      for (const v of tur === 4 ? g.koseDeger : g.deger) is.push([String(v), MUREKKEP], [String(v), VURGU]);
    }
    let i = 0;
    const bosta = kok.requestIdleCallback || ((f) => setTimeout(() => f({ timeRemaining: () => 6 }), 60));
    const adim = (son) => {
      while (i < is.length && son.timeRemaining() > 1) rakamKalibi(is[i][0], is[i++][1]);
      if (i < is.length) bosta(adim);
    };
    bosta(adim);
  }

  // Her kenar bir kez: [köşe a, köşe b, yüz 1, yüz 2]. Çizgiler yüz yüz çizilince iki
  // görünen yüzün ortak kenarı iki kez çiziliyor ve zar başına 20 ayrı çizim çağrısı
  // gidiyordu; kenarlar bir kez toplanıp dört çağrıda çiziliyor. Ortak kenar eskiden
  // üst üste iki kez çizildiği için onun rengi o iki katın toplamı (0,85 → 0,9775; 0,2 → 0,36).
  function kenarlarBul(g) {
    if (g.kenarlar) return g.kenarlar;
    const harita = new Map();
    g.yuzler.forEach((f, fi) => {
      const idx = f.idx;
      for (let t = 0; t < idx.length; t++) {
        const a = Math.min(idx[t], idx[(t + 1) % idx.length]);
        const b = Math.max(idx[t], idx[(t + 1) % idx.length]);
        const anahtar = a * 1024 + b;
        const e = harita.get(anahtar);
        if (e) e.push(fi);
        else harita.set(anahtar, [a, b, fi]);
      }
    });
    g.kenarlar = [...harita.values()];
    g.gorunur = new Uint8Array(g.yuzler.length);
    return g.kenarlar;
  }

  function zarCiz(ctx, z, kam) {
    const { noktalar, s, merkezZ } = ekranKoseleri(z, kam);
    const d = kam.dpr;
    const g = z.g;
    const gorunen = [];
    g.yuzler.forEach((f, i) => {
      const n = M.uygula(z.R, f.n);
      const b = V.ic(n, BAKIS);
      if (b > 0.002) gorunen.push([i, n, b]);
    });

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.lineJoin = 'round';
    // yüzler
    for (const [i, n] of gorunen) {
      const f = g.yuzler[i];
      yuzYolu(ctx, noktalar, f.idx, d);
      ctx.fillStyle = rgb(golgeRenk(n));
      ctx.fill();
    }
    // kenar parıltısı (pahlı kenar izlenimi), üstüne ince mürekkep: çizim gibi okunsun.
    // iki görünen yüzün ortak kenarı "iç", tek görünen yüzünki "dış" yolda
    const kenarlar = kenarlarBul(g);
    const gor = g.gorunur;
    gor.fill(0);
    for (const [i] of gorunen) gor[i] = 1;
    const icYol = new Path2D(), disYol = new Path2D();
    for (const e of kenarlar) {
      const v = gor[e[2]] + (e.length > 3 ? gor[e[3]] : 0);
      if (!v) continue;
      const yol = v === 2 ? icYol : disYol;
      const p = noktalar[e[0]], q = noktalar[e[1]];
      yol.moveTo(p[0] * d, p[1] * d);
      yol.lineTo(q[0] * d, q[1] * d);
    }
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(0.8, s * 0.03) * d;
    ctx.strokeStyle = 'rgba(255,255,255,0.9775)';
    ctx.stroke(icYol);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.stroke(disYol);
    ctx.lineWidth = Math.max(0.6, s * 0.012) * d;
    ctx.strokeStyle = 'rgba(17,17,17,0.36)';
    ctx.stroke(icYol);
    ctx.strokeStyle = 'rgba(17,17,17,0.2)';
    ctx.stroke(disYol);
    ctx.lineCap = 'butt';
    // dış hat: kâğıt üstünde beyaz zarı ayıran mürekkep çizgisi
    const hat = zarf2(noktalar);
    ctx.beginPath();
    hat.forEach((q, t) => (t ? ctx.lineTo(q[0] * d, q[1] * d) : ctx.moveTo(q[0] * d, q[1] * d)));
    ctx.closePath();
    ctx.strokeStyle = 'rgba(17,17,17,0.62)';
    ctx.lineWidth = Math.max(0.9, s * 0.026) * d;
    ctx.stroke();

    // rakamlar / noktalar. Kalıplar ekrandakinden büyük; küçültürken ara boyutlu kopyaları
    // (mipmap) kullansın ki dönen zarda ince çizgiler titremesin.
    ctx.imageSmoothingQuality = 'medium';
    const v = z.vurgu || 0;
    const kirmizi = rgb(KIRMIZI);
    for (const [i, n, b] of gorunen) {
      const f = g.yuzler[i];
      const sonuc = i === z.ustYuz;
      ctx.globalAlpha = Math.min(1, b * 3.2);
      if (g.tur === 6) {
        yuzDonusumu(ctx, z, f, kam, s, merkezZ);
        const deger = z.etiket[i];
        const pip = PIPLER[deger] || [];
        for (const [x, y] of pip) {
          ctx.beginPath();
          ctx.arc(x, y, deger === 1 ? BIR_BENEK : 16, 0, Math.PI * 2);
          // altı yüzlüde sonuç beneklerle zaten okunuyor; vurgu yalnız öteki zarların rakamında
          ctx.fillStyle = deger === 1 ? kirmizi : MUREKKEP;
          ctx.fill();
        }
      } else if (g.tur === 4) {
        // her köşenin değeri, o köşeye bakan yüzlerde köşeye yakın yazılır
        const koseler = f.idx;
        for (const ki of koseler) {
          const kp = g.k[ki];
          const yon = V.birim(V.cikar(kp, f.c));
          const mer = V.ekle(f.c, V.carp(V.cikar(kp, f.c), 0.56));
          yuzDonusumu(ctx, z, f, kam, s, merkezZ, mer, yon);
          const deger = g.koseDeger[ki];
          const ustKose = z.ustKose === ki;
          if (ustKose) rakamVurgulu(ctx, String(deger), v, YAZI[4], 0);
          else rakamBas(ctx, String(deger), MUREKKEP, YAZI[4], 0);
        }
      } else {
        yuzDonusumu(ctx, z, f, kam, s, merkezZ);
        const metin = String(z.etiket[i]);
        let fs = YAZI[g.tur];
        if (metin.length >= 3) fs *= 0.74;
        else if (metin.length === 2 && g.tur !== 100) fs *= 0.9;
        const dy = g.tur === 10 || g.tur === 100 ? fs * 0.18 : fs * 0.06;
        if (sonuc) rakamVurgulu(ctx, metin, v, fs, dy);
        else rakamBas(ctx, metin, MUREKKEP, fs, dy);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    return { noktalar, hat };
  }

  /* ------------------------------------------------------------ para */
  const PARA_N = 72;
  const GUMUS_ACIK = [238, 240, 244];
  const GUMUS_KOYU = [104, 108, 118];

  function paraOlustur(secenek) {
    return {
      R: M.birim(),
      konum: [0, 0, 0],
      hava: 0,
      yaricap: 60,
      kalinlik: 0.11,     // yarıçapa oranla
      ust: 'YAZI',
      alt: 'TURA',
      ...secenek,
    };
  }

  function paraKoseleri(p, kam) {
    const r = p.yaricap, t = p.yaricap * p.kalinlik * 0.5;
    const ust = [], alt = [], ustD = [], altD = [];
    let minZ = Infinity;
    const ham = [];
    for (let i = 0; i < PARA_N; i++) {
      const a = (i / PARA_N) * Math.PI * 2;
      const u = M.uygula(p.R, [Math.cos(a) * r, Math.sin(a) * r, t]);
      const l = M.uygula(p.R, [Math.cos(a) * r, Math.sin(a) * r, -t]);
      ham.push([u, l]);
      minZ = Math.min(minZ, u[2], l[2]);
    }
    const mz = -minZ + p.hava;
    for (const [u, l] of ham) {
      const U = [p.konum[0] + u[0], p.konum[1] + u[1], mz + u[2]];
      const L = [p.konum[0] + l[0], p.konum[1] + l[1], mz + l[2]];
      ustD.push(U); altD.push(L);
      ust.push(kam.nokta(U)); alt.push(kam.nokta(L));
    }
    return { ust, alt, ustD, altD, mz };
  }

  function paraGolge(ctx, p, kam) {
    const { ustD, altD } = paraKoseleri(p, kam);
    const tum = ustD.concat(altD);
    const iz = tum.map((q) => {
      const t = q[2] / ISIK[2];
      return kam.nokta([q[0] - ISIK[0] * t, q[1] - ISIK[1] * t, 0]);
    });
    const havada = Math.min(1, p.hava / (p.yaricap * 4));
    yumusakDoldur(ctx, zarf2(iz), `rgba(17,17,26,${0.22 * (1 - 0.6 * havada)})`, 7 + p.yaricap * 0.1 + havada * 18, kam.dpr);
    if (havada < 0.6) {
      const dik = tum.map((q) => kam.nokta([q[0], q[1], 0]));
      yumusakDoldur(ctx, zarf2(dik), `rgba(17,17,26,${0.28 * (1 - havada / 0.6)})`, 3 + p.yaricap * 0.04, kam.dpr);
    }
  }

  // Yazı yüzü: gümüşe kazınmış "Yazı". Tura yüzü: ortada kırmızı yuvarlak mühür.
  function paraYuzu(ctx, p, kam, mz, ustte) {
    const d = kam.dpr;
    const t = p.yaricap * p.kalinlik * 0.5;
    const n = M.uygula(p.R, [0, 0, ustte ? 1 : -1]);
    // alt yüz X ekseni çevresinde çevrilince düz okunsun diye "yukarı"sı ters
    const u = M.uygula(p.R, [0, ustte ? 1 : -1, 0]);
    const r = V.dis(u, n);
    const c0 = M.uygula(p.R, [0, 0, ustte ? t : -t]);
    const cp = kam.nokta([p.konum[0] + c0[0], p.konum[1] + c0[1], mz + c0[2]]);
    const k = p.yaricap / 100;
    const pr = kam.yon(r), pu = kam.yon(u);
    ctx.setTransform(pr[0] * k * d, pr[1] * k * d, -pu[0] * k * d, -pu[1] * k * d, cp[0] * d, cp[1] * d);

    const lam = Math.max(0, V.ic(n, ISIK));
    const parlak = 0.58 + 0.42 * lam;
    const sp = Math.pow(Math.max(0, V.ic(n, YARIM)), 12);
    const gumus = (x) => rgb(karis(GUMUS_KOYU, GUMUS_ACIK, Math.max(0, Math.min(1, x))));

    // gövde
    const gr = ctx.createLinearGradient(-100, -100, 100, 100);
    gr.addColorStop(0, gumus(parlak + 0.12));
    gr.addColorStop(0.5, gumus(parlak * 0.9));
    gr.addColorStop(1, gumus(parlak * 0.66));
    ctx.beginPath();
    ctx.arc(0, 0, 100, 0, Math.PI * 2);
    ctx.fillStyle = gr;
    ctx.fill();
    // kabarık kenar halkası
    ctx.lineWidth = 8;
    ctx.strokeStyle = gumus(parlak * 1.1);
    ctx.beginPath();
    ctx.arc(0, 0, 92, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(30,33,40,0.4)';
    ctx.beginPath();
    ctx.arc(0, 0, 86.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(17,17,17,0.5)';
    ctx.beginPath();
    ctx.arc(0, 0, 99.2, 0, Math.PI * 2);
    ctx.stroke();
    // nokta halkası
    ctx.fillStyle = 'rgba(30,33,40,0.34)';
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 78, Math.sin(a) * 78, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    const yazi = ustte ? p.ust : p.alt;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (yazi === 'YAZI') {
      // kazıma: altta ince bir ışık, üstte koyu harf
      const harf = (fn) => {
        ctx.save();
        ctx.translate(1.2, 1.8);
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        fn();
        ctx.restore();
        ctx.fillStyle = 'rgba(24,26,32,0.88)';
        fn();
      };
      harf(() => sigdirYaz(ctx, PARA_YAZI, 0, -2, 46, 128));
      ctx.fillStyle = 'rgba(24,26,32,0.55)';
      ctx.fillRect(-26, 26, 52, 2.4);
    } else {
      // kırmızı yuvarlak mühür
      const mr = 60;
      const mg = ctx.createRadialGradient(-18, -22, 4, 0, 0, mr);
      mg.addColorStop(0, rgb(karis(KIRMIZI, [255, 255, 255], 0.12 * lam)));
      mg.addColorStop(1, rgb(karis(KIRMIZI_KOYU, KIRMIZI, 0.35 + 0.4 * lam)));
      ctx.beginPath();
      ctx.arc(0, 0, mr, 0, Math.PI * 2);
      ctx.fillStyle = mg;
      ctx.fill();
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.arc(0, 0, mr - 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      sigdirYaz(ctx, PARA_TURA, 0, 2, 34, 84);
    }
    // parıltı
    if (sp > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      const pg = ctx.createRadialGradient(-30, -40, 0, -30, -40, 110);
      pg.addColorStop(0, `rgba(255,255,255,${0.3 * sp})`);
      pg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(0, 0, 100, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function paraCiz(ctx, p, kam) {
    const d = kam.dpr;
    const { ust, alt, mz } = paraKoseleri(p, kam);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // yan yüz (tırtıklı kenar)
    for (let i = 0; i < PARA_N; i++) {
      const j = (i + 1) % PARA_N;
      const a = ((i + 0.5) / PARA_N) * Math.PI * 2;
      const n = M.uygula(p.R, [Math.cos(a), Math.sin(a), 0]);
      if (V.ic(n, BAKIS) <= 0) continue;
      const c = golgeRenk(n, [226, 229, 235], [84, 88, 98]);
      const tirtik = i % 2 ? 0.88 : 1.03;
      ctx.fillStyle = rgb([c[0] * tirtik, c[1] * tirtik, c[2] * tirtik]);
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 0.6 * d;
      ctx.beginPath();
      ctx.moveTo(ust[i][0] * d, ust[i][1] * d);
      ctx.lineTo(ust[j][0] * d, ust[j][1] * d);
      ctx.lineTo(alt[j][0] * d, alt[j][1] * d);
      ctx.lineTo(alt[i][0] * d, alt[i][1] * d);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // görünen yüz
    const nUst = M.uygula(p.R, [0, 0, 1]);
    const bUst = V.ic(nUst, BAKIS);
    if (bUst > 0.001) paraYuzu(ctx, p, kam, mz, true);
    else if (bUst < -0.001) paraYuzu(ctx, p, kam, mz, false);
    ctx.restore();
  }

  /* ------------------------------------------------------------ atış hareketi */
  // Uygulamanın kendi hareket modeli, aynı sayılarla (uygulama kaynağında lib/zar/atis_hareketi.dart
  // ve zar3d.dart › atisDurusu). Oradaki kararlar kullanıcı geri bildirimiyle ölçülerek
  // verildi; burada değiştirmeden taşındı:
  //  · Zar kenardan savrulur, iki GÖRÜNÜR sekme yapar; her sekme hem alçalır hem kısalır.
  //  · Zar SON SEKMEDE hedef duruşuna varır. Sonra yalnız küçük, sönen bir sallanma var;
  //    kenarından devrilme YOK (devrilince üst yüz değişiyor, "sonuç değişti" diye okunuyordu).
  //  · Dönüş iki eksende (ana + dik yan eksen): tek eksende dönen zar yuvarlanmıyor, hep
  //    aynı birkaç yüzü gösteriyor. Tur sayısı 1.15–1.40: daha fazlası simetri açısına
  //    yaklaşıp zarı "donduruyor".
  //  · Dönüş hızı havada sabite yakın, sona doğru çöker ve her çarpmada biraz düşer.
  // Zaman t: 0..1. Konumlar birim kutuda (ekranın oranı), yükseklik ekran pikselinde.
  const SALLANMA_ACISI = (7.5 * Math.PI) / 180;
  const SALLANMA_SALINIM = 1.75;
  const EN_AZ_TUR = 1.15, EN_COK_TUR = 1.4, YAN_EKSEN_ORANI = 0.6, DONUS_SONME_USSU = 4;
  const kisit = (v, a, b) => Math.max(a, Math.min(b, v));

  function atisHareketi(o) {
    const h = Object.assign({ sekmeSayisi: 2, sonum: 0.36, sallanmaSuresi: 0.1, durusPayi: 0.1 }, o);
    const r = h.rastgele || Math.random;
    h.ucusSonu = kisit(1 - h.durusPayi - h.sallanmaSuresi, 0.05, 1);
    h.oturmaAni = 1 - h.durusPayi;
    // yay süreleri: her sekme alçalıyor ve KISALIYOR
    const yaySayisi = h.sekmeSayisi + 1;
    const ham = [];
    let toplam = 0;
    for (let i = 0; i < yaySayisi; i++) { const d = Math.pow(h.sonum, i * 0.5); ham.push(d); toplam += d; }
    h.yayBasi = []; h.yaySonu = []; h.yayTepesi = [];
    let an = 0;
    for (let i = 0; i < yaySayisi; i++) {
      h.yayBasi.push(an);
      an += (ham[i] / toplam) * h.ucusSonu;
      h.yaySonu.push(an);
      h.yayTepesi.push(Math.pow(h.sonum, i));
    }
    h.sapma = (r() - 0.5) * 0.05;
    // sallanma ekseni masa düzleminde yatay: zar bir kenarına doğru yaylanır
    h.sallanmaYonu = r() * Math.PI * 2;
    const ilkel = (x) => x - Math.pow(x, DONUS_SONME_USSU + 1) / ((DONUS_SONME_USSU + 1) * Math.pow(h.ucusSonu, DONUS_SONME_USSU));
    h.integral = (t) => {
      const ust = kisit(t, 0, h.ucusSonu);
      let top = 0;
      for (let i = 0; i < h.yaySonu.length; i++) {
        const a = h.yayBasi[i], b = Math.min(h.yaySonu[i], ust);
        if (b <= a) break;
        top += Math.pow(h.sonum, i * 0.3) * (ilkel(b) - ilkel(a));
        if (b < h.yaySonu[i]) break;
      }
      return top;
    };
    h.hizIntegrali = h.integral(h.ucusSonu);
    // zemindeki nokta: yol başta hızlı sonra yavaş; yanal sapma yalnız havadayken
    h.zemin = (t) => {
      const s = kisit(t / h.ucusSonu, 0, 1);
      const u = 1 - Math.pow(1 - s, 1.9);
      const x = h.baslangic[0] + (h.bitis[0] - h.baslangic[0]) * u;
      const y = h.baslangic[1] + (h.bitis[1] - h.baslangic[1]) * u;
      return [x + h.sapma * Math.sin(u * Math.PI) * (1 - u), y];
    };
    // yerden yükseklik (ekran pikseli): her yay bir parabol
    h.yukseklik = (t) => {
      if (t >= h.ucusSonu) return 0;
      for (let i = 0; i < h.yaySonu.length; i++) {
        if (t > h.yaySonu[i]) continue;
        const sure = h.yaySonu[i] - h.yayBasi[i];
        if (sure <= 0) return 0;
        const s = kisit((t - h.yayBasi[i]) / sure, 0, 1);
        return h.enYuksek * h.yayTepesi[i] * 4 * s * (1 - s);
      }
      return 0;
    };
    // oturduktan sonraki sallanma (radyan): değme anında sıfırdan başlar, söner
    h.sallanma = (t) => {
      if (h.sallanmaSuresi <= 0 || t <= h.ucusSonu || t >= h.oturmaAni) return 0;
      const s = kisit((t - h.ucusSonu) / h.sallanmaSuresi, 0, 1);
      return SALLANMA_ACISI * Math.pow(1 - s, 2) * Math.sin(s * SALLANMA_SALINIM * Math.PI * 2);
    };
    // kalan dönüş oranı: 1'den 0'a, uçuş bitince tam olarak 0
    h.kalanDonme = (t) => {
      if (t >= h.ucusSonu || h.hizIntegrali <= 0) return 0;
      return kisit(1 - h.integral(t) / h.hizIntegrali, 0, 1);
    };
    // derinlik: masanın arkasındaki zar biraz küçük, öndeki büyük
    h.derinlik = (t) => 0.88 + 0.24 * kisit(h.zemin(t)[1], 0, 1.2);
    h.carpmaAnlari = h.yaySonu.slice();
    h.carpmaGucleri = h.yayTepesi.map(Math.sqrt);
    return h;
  }

  // Zarın yörüngesi (uygulamadaki "SAVRUK"): sağ kenardan, boydan boya.
  // Çıkış noktası geniş, iniş noktası verilir; çıkış yüksekliği inişten türer ki zemin
  // çizgisi ilk sekmeden fazla kaymasın (yoksa sekme ekranda ters okunuyor).
  function zarAtisi({ enYuksek, hedef, rastgele }) {
    const r = rastgele || Math.random;
    const cikisY = hedef[1] + 0.05 + r() * 0.045;
    return atisHareketi({
      baslangic: [0.9 + r() * 0.14, cikisY],
      bitis: hedef,
      enYuksek: enYuksek * (0.84 + r() * 0.32),
      rastgele: r,
      sonum: 0.36 + r() * 0.12,
      sallanmaSuresi: 0.11,
      // zarlar birlikte çıkar, farklı zamanlarda OTURUR
      durusPayi: 0.22 + r() * 0.12,
    });
  }

  // Atış boyunca dönüş: ana eksen ve ona dik yan eksen, ikisi de aynı "kalan" eğrisiyle.
  function atisDonusu(rastgele) {
    const r = rastgele || Math.random;
    const eksen = () => {
      const n = [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1];
      return V.boy(n) < 1e-6 ? [1, 0, 0] : V.birim(n);
    };
    const ana = eksen();
    let yan = V.dis(eksen(), ana);
    if (V.boy(yan) < 1e-3) yan = V.dis(ana, [0, 1, 0]);
    return { ana, yan: V.birim(yan), tur: EN_AZ_TUR + r() * (EN_COK_TUR - EN_AZ_TUR) };
  }

  // [t] anındaki yönelim. t'de uçuş bitince tam olarak hedefR (sonuç yüzü üstte).
  function atisDurusu(hedefR, h, donus, t) {
    const sal = h.sallanma(t);
    if (sal !== 0) {
      // dünya uzayında, masa düzlemindeki yatay eksen çevresinde: masa dönmez, zar yaylanır
      return M.carp(M.eksenAci([Math.cos(h.sallanmaYonu), Math.sin(h.sallanmaYonu), 0], sal), hedefR);
    }
    const kalan = h.kalanDonme(t);
    if (kalan <= 0) return hedefR;
    return M.carp(M.carp(hedefR, M.eksenAci(donus.ana, donus.tur * Math.PI * 2 * kalan)),
      M.eksenAci(donus.yan, donus.tur * YAN_EKSEN_ORANI * Math.PI * 2 * kalan));
  }

  /* ------------------------------------------------------------ para atışı */
  // Uygulamanın para modeli, aynı sayılarla (uygulama kaynağında lib/tura/para_ciz.dart ›
  // paraYonelimi, lib/zar/atis_hareketi.dart › paraAtisi):
  //  · Havada SABİT hızla, YATAY bir eksende döner (serbest düşüşte tork yok, eksen sabit).
  //    2–3 tur: daha çoğu kare başına 30°'yi geçiyor, göz dönmeyi değil art arda pozları görüyor.
  //  · Masaya 46° eğikle değer (düz değse "yapıştı" gibi duruyor), bir kez seker, sonra Euler
  //    diski gibi yatar: eğim (1 − s)^1.5 ile söner, değme noktası çevrede HIZLANARAK dolanır.
  //  · Son duruş tam hedef: sonuç yüzü yukarı, yazı ±12° içinde dik (tam rastgele açıda
  //    yazı baş aşağı kalıyordu).
  // Uygulamadan tek fark: orada para atışın ilk karesinde yeni duruşa sıçrıyor. Burada dönüş
  // paranın yattığı duruştan başlıyor; yazının dik inmesi için gereken yön farkı uçuş boyunca
  // yavaş bir sapma (presesyon) olarak dağılıyor. Para yüz değiştirecekse dönme ekseni yazının
  // yatayına ±45° yakın seçiliyor; yoksa o sapma 180°'ye kadar büyüyordu.
  const PARA_TITRESIM_ACISI = (46 * Math.PI) / 180;
  const PARA_TITRESIM_TURU = 2.0;
  const PARA_TITRESIM_SONUMU = 1.5;
  const PARA_DURUS_SAPMASI = (12 * Math.PI) / 180;
  const aciSar = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const duzAci = (R) => Math.atan2(R[3], R[0]);   // düz yatan paranın masadaki açısı

  // tavan: yayın en çok ne kadar yükselebileceği (ekran px). Para havada dik durduğunda
  // tepesi zeminden yay + 2r·sin(eğim) kadar yukarıda; kadrajdan taşmasın diye çağıran
  // paraTavani ile hesaplar. Rastgele pay tavandan sonra değil ÖNCE uygulanır.
  const paraTavani = (zeminPx, yaricap) => Math.max(30, zeminPx - 2 * yaricap * SIN - 8);
  function paraAtisi({ enYuksek, tavan, baslangic, bitis, rastgele }) {
    const r = rastgele || Math.random;
    let tepe = enYuksek * (0.88 + r() * 0.24);
    if (tavan != null) tepe = Math.min(tepe, tavan);
    return atisHareketi({
      baslangic, bitis, rastgele: r,
      enYuksek: tepe,
      sekmeSayisi: 1,
      sonum: 0.3,
      // uygulamada önce 0'dı: pencere olmayınca titreşim hiç çalışmıyor, para masaya yapışıyordu
      sallanmaSuresi: 0.3,
      durusPayi: 0.12,
    });
  }

  // Bir atışın dönüşü. R0: paranın şimdi yattığı duruş; tura: sonuç.
  function paraDonusu(R0, tura, rastgele) {
    const r = rastgele || Math.random;
    const cevir = tura !== (R0[8] < 0);            // R0[8] < 0: tura yüzü yukarıda
    const psi0 = duzAci(R0);
    const psi1 = (r() * 2 - 1) * PARA_DURUS_SAPMASI;
    // yarım tur sayısı; tekse yüz değişir. 4–6 yarım tur = 2–3 tur
    const yarim = cevir ? 5 : r() < 0.5 ? 4 : 6;
    const azimut = cevir
      ? (psi0 + psi1) / 2 + (r() * 2 - 1) * (Math.PI / 4) + (r() < 0.5 ? 0 : Math.PI)
      : r() * Math.PI * 2;
    const eksen = [Math.cos(azimut), Math.sin(azimut), 0];
    const aci = yarim * Math.PI;
    const P = M.carp(M.eksenAci(eksen, aci), R0);   // uçuş bitince (eğimsiz) duruş
    const presesyon = aciSar(psi1 - duzAci(P));
    return { R0, eksen, aci, azimut, presesyon, hedef: M.carp(M.eksenAci([0, 0, 1], presesyon), P) };
  }

  // [t] anındaki yönelim; t = 0'da tam R0, t = 1'de tam hedef.
  function paraYonelimi(d, h, t) {
    if (t < h.ucusSonu) {
      const u = kisit(t / h.ucusSonu, 0, 1);
      return M.carp(M.eksenAci([0, 0, 1], d.presesyon * u),
        M.carp(M.eksenAci(d.eksen, (d.aci + PARA_TITRESIM_ACISI) * u), d.R0));
    }
    const pencere = h.oturmaAni - h.ucusSonu;
    const s = pencere <= 1e-9 ? 1 : kisit((t - h.ucusSonu) / pencere, 0, 1);
    const egim = PARA_TITRESIM_ACISI * Math.pow(1 - s, PARA_TITRESIM_SONUMU);
    if (egim < 1e-6) return d.hedef;
    // değme noktasının dolanması: hız s ile artıyor (Euler diski); başı uçuşun iniş ekseni
    const a = d.azimut + d.presesyon + PARA_TITRESIM_TURU * Math.PI * 2 * (0.34 * s + 0.66 * s * s);
    return M.carp(M.eksenAci([Math.cos(a), Math.sin(a), 0], egim), d.hedef);
  }

  /* ------------------------------------------------------------ tuval yardımcıları */
  function tuvalHazirla(tuval, en, boy, dprUst) {
    const dpr = Math.min(dprUst || 2, kok.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(en * dpr));
    const h = Math.max(1, Math.round(boy * dpr));
    if (tuval.width !== w || tuval.height !== h) {
      tuval.width = w;
      tuval.height = h;
    }
    const ctx = tuval.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, dpr, kam: kamera(boy, dpr) };
  }

  kok.Zar3D = {
    V, M, geometri, zarOlustur, dinlenme, zarCiz, zarGolge, yuzEtiketD100,
    paraOlustur, paraCiz, paraGolge, kamera, masaY, tuvalHazirla,
    atisHareketi, zarAtisi, atisDonusu, atisDurusu, kaliplariIsit,
    paraAtisi, paraTavani, paraDonusu, paraYonelimi,
    OLCEK, ACI, COS, SIN,
    yaziAilesi(a) { YAZI_AILESI = a; yaziYuklu = false; yaziSorgu = 0; },
  };
})(window);
