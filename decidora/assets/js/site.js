/*!
 * Decidora tanıtım sitesi — sayfa davranışları
 * Üst şerit ve menü, hangi bölümde olunduğu, akşamın sahneleri.
 *
 * Sahneler: her birinde bir araç soruyu canlı çözer (çark, parmak seçici, zar,
 * yazı tura). Sahne ekrana gelince bir kez kendiliğinden oynar, dokununca yeniden
 * çekilir. Sonuçlar gerçekten rastgele (crypto.getRandomValues, sapmasız); çıkan
 * sonuç mühürlenir ve deneme bölümündeki deftere "Dün akşam" diye yazılır.
 */
(function () {
  'use strict';

  const $ = (s, k) => (k || document).querySelector(s);
  const $$ = (s, k) => Array.from((k || document).querySelectorAll(s));
  const mq = (s) => (window.matchMedia ? window.matchMedia(s) : { matches: false });
  const hareketAz = mq('(prefers-reduced-motion: reduce)');

  // Dil: sayfanın diline göre (html lang). Sahnelerin sonuçları ve deftere yazılanlar;
  // İngilizcesi uygulamanın kendi çevirisinden (Yazı = Heads, Tura = Tails, hazır çarklar).
  const EN = document.documentElement.lang === 'en';
  const DIL = EN ? {
    neYesek: ['Pizza', 'Burger', 'Sushi', 'Pasta', 'Salad', 'Curry', 'Soup', 'Tacos'],
    carkEtiket: 'Wheel · What to eat · 8 options',
    carkBaslik: 'Wheel · What to eat',
    sekizSecenek: '8 options',
    hesapKimde: (h) => h,
    parmakEtiket: 'Fingers · Pick · 6 fingers',
    parmakBaslik: 'Fingers · Pick',
    altiParmak: '6 fingers',
    secildi: 'Chosen',
    zarEtiket: (a, b) => `Dice · 2d6 · ${a} and ${b}`,
    zarBaslik: 'Dice · 2d6',
    yazi: 'Heads',
    tura: 'Tails',
    paraSayac: (y, t) => `${y} heads · ${t} tails`,
    turaAnlam: 'everyone goes home.',
    yaziAnlam: 'one more round.',
    paraBaslik: 'Coin',
  } : {
    neYesek: ['Pizza', 'Lahmacun', 'Kebap', 'Mantı', 'Burger', 'Döner', 'Çorba', 'Balık'],
    carkEtiket: 'Çark · Ne yesek · 8 seçenek',
    carkBaslik: 'Çark · Ne yesek',
    sekizSecenek: '8 seçenek',
    // "Bu akşam hesap A’dan / D’den": harfin okunuşuna göre ek (a → dan, öbürleri e ile okunur)
    hesapKimde: (h) => h + (h === 'A' ? '’dan' : '’den'),
    parmakEtiket: 'Parmak seçici · Seç · 6 parmak',
    parmakBaslik: 'Parmak · Seç',
    altiParmak: '6 parmak',
    secildi: 'Seçildi',
    zarEtiket: (a, b) => `Zar · 2d6 · ${a} ve ${b}`,
    zarBaslik: 'Zar · 2d6',
    yazi: 'Yazı',
    tura: 'Tura',
    paraSayac: (y, t) => `${y} yazı · ${t} tura`,
    turaAnlam: 'herkes evine.',
    yaziAnlam: 'bir el daha.',
    paraBaslik: 'Yazı tura',
  };
  const TAM = Math.PI * 2;
  const kisit = (v, a, b) => Math.max(a, Math.min(b, v));
  const cikis3 = (u) => 1 - Math.pow(1 - u, 3);
  const geriYay = (u) => {
    const c = 1.7;
    return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2);
  };

  /* ------------------------------------------------------------ rastgelelik */
  const kripto = window.crypto && window.crypto.getRandomValues ? window.crypto : null;
  const hucre = new Uint32Array(1);
  function ham32() {
    if (kripto) {
      kripto.getRandomValues(hucre);
      return hucre[0];
    }
    return Math.floor(Math.random() * 4294967296);
  }
  function rastgeleTam(n) {
    const sinir = 4294967296 - (4294967296 % n);
    let v;
    do { v = ham32(); } while (v >= sinir);
    return v % n;
  }
  const rastgele = () => ham32() / 4294967296;
  const arasi = (a, b) => a + (b - a) * rastgele();

  /* ============================================================ açılış */
  // Açılış animasyonları bitince sınıfı kaldır: sonradan bir öğe yeniden çizilirse
  // animasyon baştan oynamasın.
  setTimeout(() => document.documentElement.classList.remove('acilis'), 2600);

  /* ============================================================ yıl */
  $$('[data-yil]').forEach((e) => { e.textContent = String(new Date().getFullYear()); });

  /* ============================================================ üst şerit: menü (dar ekran) */
  (function menu() {
    const dugme = $('.kapsul__menu');
    const baglar = $('#kapsul-baglar');
    if (!dugme || !baglar) return;
    const ac = (evet) => {
      baglar.classList.toggle('acik', evet);
      dugme.setAttribute('aria-expanded', evet ? 'true' : 'false');
    };
    dugme.addEventListener('click', (e) => {
      e.stopPropagation();
      ac(!baglar.classList.contains('acik'));
    });
    baglar.addEventListener('click', (e) => { if (e.target.closest('a')) ac(false); });
    document.addEventListener('click', (e) => { if (!e.target.closest('.kapsul')) ac(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && baglar.classList.contains('acik')) {
        ac(false);
        dugme.focus();
      }
    });
  })();

  /* ============================================================ üst şerit: kayarken çekil (dar ekran) */
  // Telefonda sabit kapsül okunan satırın üstüne biniyordu: başlıklar, düğmeler, Play
  // düğmesi yarısı örtülü geçiyordu. Aşağı kayarken yukarı çekilir; yukarı kayınca, sayfanın
  // başında, menü açıkken ya da klavyeyle içine gelinince geri gelir.
  (function cekil() {
    const kapsul = $('.kapsul');
    const baglar = $('#kapsul-baglar');
    if (!kapsul) return;
    const dar = mq('(max-width: 980px)');
    const ESIK = 8;
    let son = window.scrollY;
    let gizli = false;
    let is = 0;
    const ayarla = (evet) => {
      if (evet === gizli) return;
      gizli = evet;
      kapsul.classList.toggle('kapsul--cekik', evet);
    };
    const bak = () => {
      is = 0;
      const y = window.scrollY;
      if (!dar.matches || y < 96 || (baglar && baglar.classList.contains('acik'))) {
        ayarla(false);
        son = y;
        return;
      }
      const fark = y - son;
      if (Math.abs(fark) < ESIK) return;
      ayarla(fark > 0);
      son = y;
    };
    window.addEventListener('scroll', () => { if (!is) is = requestAnimationFrame(bak); }, { passive: true });
    kapsul.addEventListener('focusin', () => ayarla(false));
  })();

  /* ============================================================ hangi bölümdeyiz */
  (function konum() {
    if (!('IntersectionObserver' in window)) return;
    const bolumler = $$('main > section[id]');
    const kapsul = $$('#kapsul-baglar a');
    const dizin = $$('.aksam a');
    const KAPSUL = { basa: '#aksam', 's-2110': '#aksam', 's-2205': '#aksam', 's-2330': '#aksam', gizlilik: '#gizlilik', dene: '#dene' };
    const isaretle = (id) => {
      kapsul.forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === KAPSUL[id] ? 'true' : 'false'));
      dizin.forEach((a) => {
        if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    };
    const io = new IntersectionObserver((girdiler) => {
      for (const g of girdiler) if (g.isIntersecting) isaretle(g.target.id);
    }, { rootMargin: '-45% 0px -50% 0px' });
    bolumler.forEach((b) => io.observe(b));
  })();

  /* ============================================================ geç yüklenen betikler */
  // İlk açılışta yalnız çark (cark.js) ve bu dosya yükleniyor. Zar ve para çizicisi
  // (zar3d.js), deneme bölümü (masa.js) ve sesleri (ses.js) o bölümlere yaklaşınca ya da
  // açılış bitip tarayıcı boşa düşünce geliyor. Hepsi açılışta birlikte çalışınca yavaş
  // telefonda (işlemci 4×) 400 ms'lik tek bir donma oluyor, çarkın açılışıyla çakışıyordu.
  // Trusted Types (CSP'de zorunlu): betik adresi yalnız bu politikayla ve yalnız kendi
  // dosyalarımız için üretilebilir. Trusted Types bilmeyen tarayıcıda düz metin.
  const betikAdresi = (() => {
    const tt = window.trustedTypes;
    const p = tt && tt.createPolicy ? tt.createPolicy('decidora', {
      createScriptURL: (u) => {
        if (/^assets\/js\/[a-z0-9]+\.js$/.test(u)) return u;
        throw new TypeError('izinsiz betik adresi: ' + u);
      },
    }) : null;
    return (u) => (p ? p.createScriptURL(u) : u);
  })();
  const yuklenen = {};
  function yukle(ad) {
    if (!yuklenen[ad]) {
      yuklenen[ad] = new Promise((coz) => {
        const b = document.createElement('script');
        b.src = betikAdresi('assets/js/' + ad + '.js');
        b.onload = () => coz(true);
        b.onerror = () => coz(false);
        document.head.appendChild(b);
      });
    }
    return yuklenen[ad];
  }
  const zar3dYukle = () => yukle('zar3d');
  const masaYukle = () => zar3dYukle().then(() => yukle('ses')).then(() => yukle('masa'));
  function yaklasinca(el, fn, pay) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { fn(); return; }
    const io = new IntersectionObserver((girdiler) => {
      if (girdiler.some((g) => g.isIntersecting)) { io.disconnect(); fn(); }
    }, { rootMargin: (pay || '150%') + ' 0px' });
    io.observe(el);
  }
  yaklasinca($('#gizlilik'), masaYukle);
  // Boşta yükleme, giriş çarkının ilk dönüşü bitip mühür basıldıktan sonra: masa.js'i
  // çalıştırmak yavaş telefonda ~60 ms'lik tek görev, dönen çarkı bir an takıltıyordu.
  // Çark oynamazsa (sayfa aşağıdan açıldı, sekme arkada) en geç 9 sn sonra.
  const girisBitti = new Promise((coz) => {
    const basa = $('#basa');
    if (basa) basa.addEventListener('sahne-bitti', () => setTimeout(coz, 900), { once: true });
    setTimeout(coz, 9000);
  });
  window.addEventListener('load', () => {
    const bos = window.requestIdleCallback || ((f) => setTimeout(f, 1));
    girisBitti.then(() => bos(masaYukle, { timeout: 3000 }));
  });
  // "Çarkı dene" gibi bağlantılar deneme bölümü yüklenmeden tıklanırsa: bağlantı sayfayı
  // kaydırır, bölüm yüklenince doğru araç açılır
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('[data-arac-ac]');
    if (!a || window.DecidoraMasa) return;
    const hangisi = a.dataset.aracAc;
    masaYukle().then(() => { if (window.DecidoraMasa) window.DecidoraMasa.ac(hangisi); });
  });

  /* ============================================================ sahneler */
  const C = window.Cark;
  if (!C) return;
  let Z = window.Zar3D || null;
  // Akşamın kararları deneme bölümündeki deftere yazılır. Bölüm henüz yüklenmediyse
  // sırada bekler; masa.js açılınca sıradakileri alır.
  const aksamSirasi = window.__aksamSirasi || (window.__aksamSirasi = []);
  const defteraYaz = (k) => {
    if (window.DecidoraMasa && window.DecidoraMasa.aksam) { window.DecidoraMasa.aksam(k); return; }
    const i = aksamSirasi.findIndex((x) => x.saat === k.saat);
    if (i >= 0) aksamSirasi[i] = k;
    else aksamSirasi.push(k);
  };
  const SERIF = '"Shippori Mincho", Georgia, serif';

  const Rz = (a) => Z.M.eksenAci([0, 0, 1], a);

  // Tuvali CSS ölçüsüne ve ekranın piksel yoğunluğuna (en çok 2) göre kurar
  function tuvalHazirla(tuval, en, boy) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(en * dpr)), h = Math.max(1, Math.round(boy * dpr));
    if (tuval.width !== w || tuval.height !== h) {
      tuval.width = w;
      tuval.height = h;
    }
    return { ctx: tuval.getContext('2d'), dpr };
  }

  function sahneKur(bolum, arac) {
    const kutu = $('[data-sahne-tuval]', bolum);
    const tuval = kutu && $('canvas', kutu);
    if (!tuval) return;
    const muhur = $('[data-sahne-muhur]', bolum);
    const etiket = $('[data-sahne-etiket]', bolum);
    const cevap = $('[data-sahne-cevap]', bolum);
    const dugme = $('[data-sahne-dugme]', bolum);
    const dugmeYazi = dugme && $('[data-sahne-dugme-yazi]', dugme);
    const T = { en: 0, boy: 0, dpr: 1, ctx: null, kam: null };
    let kareNo = 0;
    let gorunur = false;
    let oynadi = false;
    let mesgul = false;
    let durttu = false;
    // düğme ne olduğunu söylesin: çalışırken "Dönüyor…", bitince "Yeniden çevir"
    const durum = (calisiyor) => {
      if (!dugme) return;
      dugme.setAttribute('aria-disabled', calisiyor ? 'true' : 'false');
      dugmeYazi.textContent = calisiyor ? dugme.dataset.mesgul : dugme.dataset.hazir;
    };

    // Ekran dışındaki sahne hiç çizilmez (dönüşü bitince vurgulu diski baştan çizmek yavaş
    // telefonda ~30 ms); görünür olunca gözlemci çağırır, sahne zamana bağlı olduğu için
    // o anki hâl çizilir.
    const iste = () => { if (!kareNo && gorunur) kareNo = requestAnimationFrame(kare); };
    function kare(t) {
      kareNo = 0;
      if (!T.ctx) return;
      T.ctx.setTransform(1, 0, 0, 1, 0, 0);
      T.ctx.clearRect(0, 0, tuval.width, tuval.height);
      if (arac.ciz(t, T) && gorunur) iste();
    }
    function boyutla() {
      const en = kutu.clientWidth, boy = kutu.clientHeight;
      if (!en || !boy) return;
      const r = tuvalHazirla(tuval, en, boy);
      Object.assign(T, { en, boy, dpr: r.dpr, ctx: r.ctx, kam: Z ? Z.kamera(boy, r.dpr) : null });
      iste();
    }
    function bitti(s) {
      mesgul = false;
      kutu.removeAttribute('aria-busy');
      durum(false);
      // ilk sonuçtan sonra düğme bir kez halka atar; ziyaretçi dokunabileceğini görsün
      if (!durttu && dugme && !hareketAz.matches) {
        durttu = true;
        dugme.classList.add('durt');
        setTimeout(() => dugme.classList.remove('durt'), 3600);
      }
      muhur.textContent = s.muhur;
      muhur.classList.remove('bas');
      void muhur.offsetWidth;
      muhur.classList.add('bas');
      if (etiket) etiket.textContent = s.etiket;
      if (cevap) {
        $$('[data-sahne-deger]', cevap).forEach((e) => { e.textContent = s.deger; });
        $$('[data-sahne-anlam]', cevap).forEach((e) => { e.textContent = s.anlam || ''; });
        cevap.classList.add('acik');
      }
      defteraYaz(s.defter);
      iste();
      bolum.dispatchEvent(new Event('sahne-bitti'));
    }
    function oynat() {
      if (mesgul || !T.en) return;
      mesgul = true;
      kutu.setAttribute('aria-busy', 'true');
      durum(true);
      muhur.classList.remove('bas');
      if (cevap) cevap.classList.remove('acik');
      arac.baslat(T, bitti, iste);
      iste();
    }
    // bütün çizim alanı da tıklanır; klavye ve ekran okuyucu için asıl denetim düğme
    kutu.addEventListener('click', oynat);
    if (dugme) dugme.addEventListener('click', oynat);
    // ResizeObserver ilk ölçüyü yerleşimden sonra kendisi bildirir. Burada clientWidth
    // okumak, sayfanın bütün yerleşimini betiğin içinde erkenden hesaplatıyordu: yavaş
    // telefonda ilk görüntüden önce ~150 ms'lik tek bir görev.
    if ('ResizeObserver' in window) new ResizeObserver(boyutla).observe(kutu);
    else {
      window.addEventListener('resize', boyutla);
      boyutla();
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(iste);

    const ilkKez = () => {
      if (oynadi) return;
      oynadi = true;
      // yazı tipi gelmeden çizilen mühür ve etiketler Georgia'yla ölçülmesin
      const fonts = document.fonts && document.fonts.load
        ? document.fonts.load(`700 20px ${SERIF}`).catch(() => {})
        : Promise.resolve();
      // girişteki çark önce kendini çizer (açılış), sonra döner
      fonts.then(() => setTimeout(oynat, 250 + (arac.girisBaslat ? arac.girisBaslat(iste) : 0)));
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((girdiler) => {
        gorunur = girdiler[0].isIntersecting;
        if (gorunur) iste();
      }, { rootMargin: '120px 0px' }).observe(kutu);
      new IntersectionObserver((girdiler, io) => {
        if (girdiler[0].isIntersecting) {
          io.disconnect();
          ilkKez();
        }
      }, { threshold: 0.5 }).observe(kutu);
    } else {
      gorunur = true;
      iste();
      ilkKez();
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) iste(); });
  }

  /* ------------------------------------------------------------ 19.40 · çark */
  const NE_YESEK = DIL.neYesek;
  const cark = {
    aci: -0.42,
    anim: null,
    onbellek: {},
    // açılış: ensō kendini çizer, çark belirir, ibre gelir. Başlamadan önce hiçbir şey
    // çizilmez ki tam çark bir kare görünüp sonra kaybolmasın.
    girisBas: 0,
    giris: hareketAz.matches ? 1 : 0,
    GIRIS_SURESI: 1150,
    girisBaslat(iste) {
      if (hareketAz.matches || this.giris >= 1) return 0;
      this.girisBas = performance.now();
      iste();
      return this.GIRIS_SURESI;
    },
    sonuc: -1,
    vurguT: 0,
    vurguHedef: 0,
    igne: 0,
    igneHiz: 0,
    sonT: 0,
    sonKat: 0,
    geo(T) {
      const r = Math.min(T.en / 2.5, T.boy / 2.3);
      return { cx: T.en / 2 - r * 0.07, cy: T.boy / 2, r };
    },
    baslat(T, bitti, iste) {
      const n = NE_YESEK.length, s = TAM / n;
      const az = hareketAz.matches;
      const kazanan = rastgeleTam(n);
      const hedef = -(kazanan + arasi(0.18, 0.82)) * s;
      const fark = (((hedef - this.aci) % TAM) + TAM) % TAM;
      const delta = fark + TAM * (az ? 0 : 4 + rastgeleTam(2));
      const sure = az ? 20 : 3800 + rastgele() * 700;
      this.anim = { bas: performance.now(), sure, aci0: this.aci, delta };
      this.sonKat = Math.floor(this.aci / s);
      this.sonuc = -1;
      this.vurguHedef = 0;
      setTimeout(() => {
        const a = this.anim;
        if (a) this.aci = a.aci0 + a.delta;
        this.anim = null;
        this.sonuc = kazanan;
        this.vurguHedef = 1;
        const ad = NE_YESEK[kazanan];
        bitti({
          muhur: ad, deger: ad,
          etiket: DIL.carkEtiket,
          defter: { saat: '19.40', baslik: DIL.carkBaslik, sonuc: ad, detay: DIL.sekizSecenek },
        });
        iste();
      }, sure + 30);
    },
    ciz(t, T) {
      let devam = false;
      const dt = this.sonT ? Math.min(0.05, Math.max(0.001, (t - this.sonT) / 1000)) : 0.016;
      this.sonT = t;
      const n = NE_YESEK.length;
      if (this.anim) {
        const a = this.anim;
        const u = kisit((t - a.bas) / a.sure, 0, 1);
        const yeni = a.aci0 + a.delta * (1 - Math.pow(1 - u, 3.2));
        const s = TAM / n;
        const kat = Math.floor(yeni / s);
        const w = (yeni - this.aci) / dt;
        if (kat !== this.sonKat) {
          this.sonKat = kat;
          this.igne = Math.max(this.igne, Math.min(0.42, 0.12 + Math.abs(w) * 0.012));
        }
        this.aci = yeni;
        devam = true;
      }
      // ibre: sönümlü yay
      this.igneHiz += (-320 * this.igne - 17 * this.igneHiz) * dt;
      this.igne += this.igneHiz * dt;
      if (Math.abs(this.igne) > 0.0015 || Math.abs(this.igneHiz) > 0.02) devam = true;
      else { this.igne = 0; this.igneHiz = 0; }
      if (this.vurguT !== this.vurguHedef) {
        const adim = dt / 0.35;
        this.vurguT = this.vurguHedef > this.vurguT
          ? Math.min(this.vurguHedef, this.vurguT + adim)
          : Math.max(this.vurguHedef, this.vurguT - adim);
        devam = true;
      }
      if (this.girisBas && this.giris < 1) {
        this.giris = kisit((t - this.girisBas) / this.GIRIS_SURESI, 0, 1);
        if (this.giris < 1) devam = true;
      }
      const g = this.geo(T);
      C.ciz(T.ctx, {
        onbellek: this.onbellek,
        giris: this.giris,
        cx: g.cx, cy: g.cy, r: g.r, secenekler: NE_YESEK, aci: this.aci,
        yaziAci: this.anim ? this.anim.aci0 + this.anim.delta : this.aci,
        vurgu: this.sonuc, vurguT: this.vurguT, igne: this.igne, dpr: T.dpr,
      });
      return devam;
    },
  };

  /* ------------------------------------------------------------ 21.10 · parmak seçici */
  const PARMAK_YER = [[0.2, 0.38], [0.41, 0.2], [0.69, 0.24], [0.81, 0.58], [0.56, 0.76], [0.27, 0.7]];
  const HARF = 'ABCDEF';
  function yuvarlakDortgen(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }
  const parmak = {
    liste: [],
    secilen: -1,
    sayimBas: 0,
    sonucBas: 0,
    SAYIM: 1100,
    baslat(T, bitti, iste) {
      const az = hareketAz.matches;
      const simdi = performance.now();
      this.liste = PARMAK_YER.map(([x, y], i) => ({
        x: x + arasi(-0.025, 0.025), y: y + arasi(-0.025, 0.025), harf: HARF[i],
        dogus: simdi + (az ? 0 : 120 + i * 170),
      }));
      this.secilen = rastgeleTam(this.liste.length);
      const gelis = az ? 0 : 120 + this.liste.length * 170 + 420;
      const sayim = az ? 0 : this.SAYIM;
      this.sayimBas = simdi + gelis;
      this.sonucBas = simdi + gelis + sayim;
      setTimeout(() => {
        const harf = this.liste[this.secilen].harf;
        bitti({
          muhur: harf, deger: DIL.hesapKimde(harf),
          etiket: DIL.parmakEtiket,
          defter: { saat: '21.10', baslik: DIL.parmakBaslik, sonuc: harf, detay: DIL.altiParmak },
        });
        iste();
      }, gelis + sayim + 20);
    },
    ciz(t, T) {
      if (!this.liste.length) return false;
      const ctx = T.ctx;
      const d = T.dpr;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      const R = kisit(Math.min(T.en, T.boy) * 0.085, 22, 46);
      const az = hareketAz.matches;
      const sonucS = t >= this.sonucBas ? kisit((t - this.sonucBas) / 450, 0, 1) : 0;
      const sayimda = t >= this.sayimBas && t < this.sonucBas;
      // seçilenin halkaları üç saniye atar, sonra söner ve çizim durur (işlemci boşa dönmesin)
      const sonme = 1 - kisit((t - this.sonucBas - 3000) / 900, 0, 1);
      const devam = t < this.sonucBas + 3900;
      this.liste.forEach((p, i) => {
        if (t < p.dogus) return;
        const x = p.x * T.en, y = p.y * T.boy;
        const yas = (t - p.dogus) / 1000;
        let olcek = 0.55 + 0.45 * geriYay(kisit(yas / 0.3, 0, 1));
        if (!az) olcek *= 1 + 0.03 * Math.sin(yas * 4.2 + i);
        const secildi = i === this.secilen && sonucS > 0;
        let alfa = 1, dolgu = '#ffffff', yazi = '#111111', hat = '#111111';
        if (sonucS > 0) {
          if (i === this.secilen) {
            olcek *= 1 + 0.22 * geriYay(sonucS);
            if (sonucS > 0.15) { dolgu = '#E0402A'; yazi = '#ffffff'; hat = '#BF3218'; }
          } else { alfa = 1 - 0.68 * sonucS; olcek *= 1 - 0.1 * sonucS; }
        }
        const rr = R * olcek;
        ctx.save();
        ctx.globalAlpha = alfa;
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(17,17,17,0.18)';
        ctx.beginPath();
        ctx.arc(x, y, rr + R * 0.32, 0, TAM);
        ctx.stroke();
        ctx.shadowColor = 'rgba(17,17,26,0.16)';
        ctx.shadowBlur = 10 * d;
        ctx.shadowOffsetY = 2 * d;
        ctx.beginPath();
        ctx.arc(x, y, rr, 0, TAM);
        ctx.fillStyle = dolgu;
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.lineWidth = Math.max(2.5, R * 0.085);
        ctx.strokeStyle = hat;
        ctx.stroke();
        ctx.fillStyle = yazi;
        ctx.font = `700 ${Math.round(rr * 0.78)}px ${SERIF}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.harf, x, y + rr * 0.05);
        ctx.restore();

        if (sayimda) {
          const s = kisit((t - this.sayimBas) / this.SAYIM, 0, 1);
          ctx.save();
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#E0402A';
          ctx.beginPath();
          ctx.arc(x, y, rr + R * 0.46, -Math.PI / 2, -Math.PI / 2 + TAM * s);
          ctx.stroke();
          ctx.restore();
        }
        if (secildi) {
          ctx.save();
          for (let k = 0; k < 2; k++) {
            const f = az ? 0.45 : (((t - this.sonucBas) / 1500 + k * 0.5) % 1);
            ctx.globalAlpha = (1 - f) * 0.55 * sonucS * sonme;
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#E0402A';
            ctx.beginPath();
            ctx.arc(x, y, rr * (1.25 + f * 0.9), 0, TAM);
            ctx.stroke();
          }
          ctx.restore();
          // "Seçildi" mührü
          const ustte = y - rr - R * 0.8 > 14;
          const my = ustte ? y - rr - R * 0.72 : y + rr + R * 0.72;
          ctx.save();
          ctx.globalAlpha = sonucS;
          ctx.translate(x, my);
          ctx.rotate(-0.06);
          ctx.font = `700 ${Math.round(R * 0.36)}px ${SERIF}`;
          const w = ctx.measureText(DIL.secildi).width + R * 0.62, h = R * 0.62;
          yuvarlakDortgen(ctx, -w / 2, -h / 2, w, h, R * 0.08);
          ctx.fillStyle = '#E0402A';
          ctx.fill();
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          yuvarlakDortgen(ctx, -w / 2 + 3.5, -h / 2 + 3.5, w - 7, h - 7, R * 0.05);
          ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(DIL.secildi, 0, h * 0.04);
          ctx.restore();
        }
      });
      return devam;
    },
  };

  /* ------------------------------------------------------------ 22.05 · zar */
  // Uygulamanın atış modeli (Zar3D.zarAtisi): sağ kenardan savrulur, iki kez seker, son
  // sekmede sonuç yüzüne oturur, küçük bir sallanmayla durur.
  const zar = {
    liste: [],
    baslat(T, bitti, iste) {
      const az = hareketAz.matches;
      const simdi = performance.now();
      const sure = az ? 20 : 1000;
      const boy = kisit(Math.min(T.en, T.boy) * 0.13, 26, 70);
      const degerler = [1 + rastgeleTam(6), 1 + rastgeleTam(6)];
      const hedefler = (rastgele() < 0.5 ? [[0.4, 0.5], [0.61, 0.64]] : [[0.39, 0.64], [0.6, 0.5]])
        .map(([x, y]) => [x + arasi(-0.03, 0.03), y + arasi(-0.025, 0.025)]);
      let enYuksek = T.boy * 0.26;
      for (const [, y] of hedefler) enYuksek = Math.min(enYuksek, (y * T.boy - boy * 1.7 - 10) / 1.16);
      enYuksek = Math.max(boy * 0.6, enYuksek);
      let sonOturma = 0;
      this.liste = degerler.map((deger, i) => {
        const z = Z.zarOlustur(6, { boy });
        const dl = Z.dinlenme(z, deger, (rastgele() < 0.5 ? -1 : 1) * arasi(0.4, 0.95));
        z.Rson = dl.R;
        z.ustYuz = dl.ust;
        z.R = z.Rson;
        const hareket = Z.zarAtisi({ enYuksek, hedef: hedefler[i], rastgele });
        sonOturma = Math.max(sonOturma, hareket.oturmaAni);
        return {
          z, hedef: hedefler[i], bas: simdi, sure, bitti: az,
          hareket, donus: Z.atisDonusu(rastgele), boyTaban: boy, derinlikSon: hareket.derinlik(1),
        };
      });
      setTimeout(() => {
        const [a, b] = degerler;
        const top = String(a + b);
        bitti({
          muhur: top, deger: top,
          etiket: DIL.zarEtiket(a, b),
          defter: { saat: '22.05', baslik: DIL.zarBaslik, sonuc: top, detay: `${a} · ${b}` },
        });
        iste();
      }, (az ? sure : sonOturma * sure) + 60);
    },
    ciz(t, T) {
      if (!this.liste.length) return false;
      let devam = false;
      const liste = [];
      for (const o of this.liste) {
        const z = o.z;
        let [nx, ny] = o.hedef;
        if (!o.bitti) {
          const u = kisit((t - o.bas) / o.sure, 0, 1);
          [nx, ny] = o.hareket.zemin(u);
          z.hava = o.hareket.yukseklik(u) / Z.SIN;
          z.R = Z.atisDurusu(z.Rson, o.hareket, o.donus, u);
          z.boy = (o.boyTaban * o.hareket.derinlik(u)) / o.derinlikSon;
          if (u < 1) devam = true;
          else o.bitti = true;
        }
        if (o.bitti) {
          z.hava = 0;
          z.R = z.Rson;
          z.boy = o.boyTaban;
        }
        z.konum = [nx * T.en, Z.masaY(T.boy, ny * T.boy), 0];
        liste.push(z);
      }
      const derinlik = (z) => -z.konum[1] * Z.SIN + z.hava * Z.COS;
      liste.sort((p, q) => derinlik(p) - derinlik(q));
      for (const z of liste) Z.zarGolge(T.ctx, z, T.kam);
      for (const z of liste) Z.zarCiz(T.ctx, z, T.kam);
      return devam;
    },
  };

  /* ------------------------------------------------------------ 23.30 · yazı tura */
  // Paranın evi (birim kutu): atış bulunduğu yerden kalkar, buraya yakın iner. Uygulamada da
  // atış kutunun alt üçte birinden kalkıyor; yukarıda yay için yer kalsın.
  const PARA_EV = [0.5, 0.66];
  const para = {
    p: null,
    hazirla() {
      if (this.p) return;
      this.p = Z.paraOlustur({ yaricap: 60 });
      this.p.R = Rz(0.25);
    },
    x: PARA_EV[0],
    y: PARA_EV[1],
    yazi: 0,
    tura: 0,
    anim: null,
    // uygulamanın para modeli (zar3d.js › paraYonelimi): sabit hızla dönerek uçar, bir kez
    // seker, 46° eğikle değip titreyerek yatar. Hareketi azalt: atış yok, sonuç hemen.
    baslat(T, bitti, iste) {
      const p = this.p;
      p.yaricap = kisit(Math.min(T.en, T.boy) * 0.17, 30, 100);
      const tura = rastgeleTam(2) === 1;
      const d = Z.paraDonusu(p.R, tura, rastgele);
      let h = null;
      let sure = 0;
      if (!hareketAz.matches) {
        const bitis = [PARA_EV[0] + arasi(-0.06, 0.06), PARA_EV[1] - 0.02 + arasi(-0.03, 0.03)];
        // yay tepesi kutunun boyunun %62'si (uygulamada %66), ama para kadrajdan taşmasın
        const tavan = Z.paraTavani(Math.min(this.y, bitis[1]) * T.boy, p.yaricap);
        h = Z.paraAtisi({ enYuksek: T.boy * 0.62, tavan, baslangic: [this.x, this.y], bitis, rastgele });
        // süre yayın kareköküyle (serbest düşüş): uygulamada ~160 px'lik yaya 1050 ms
        sure = kisit(1050 * Math.sqrt(h.enYuksek / 160), 950, 1350);
        this.anim = { bas: performance.now(), sure, h, d };
      }
      setTimeout(() => {
        this.anim = null;
        p.R = d.hedef;
        p.hava = 0;
        if (h) [this.x, this.y] = h.zemin(1);
        if (tura) this.tura++;
        else this.yazi++;
        const ad = tura ? DIL.tura : DIL.yazi;
        const sayac = DIL.paraSayac(this.yazi, this.tura);
        bitti({
          muhur: ad, deger: ad, anlam: tura ? DIL.turaAnlam : DIL.yaziAnlam,
          etiket: DIL.paraBaslik + ' · ' + sayac,
          defter: { saat: '23.30', baslik: DIL.paraBaslik, sonuc: ad, detay: sayac },
        });
        iste();
      }, h ? sure + 40 : 60);
    },
    guncelle(t) {
      const a = this.anim;
      const p = this.p;
      const u = kisit((t - a.bas) / a.sure, 0, 1);
      [this.x, this.y] = a.h.zemin(u);
      p.hava = a.h.yukseklik(u) / Z.SIN;
      p.R = Z.paraYonelimi(a.d, a.h, u);
      return u < 1;
    },
    ciz(t, T) {
      let devam = false;
      const p = this.p;
      if (!this.anim) p.yaricap = kisit(Math.min(T.en, T.boy) * 0.17, 30, 100);
      if (this.anim) devam = this.guncelle(t);
      p.konum = [this.x * T.en, Z.masaY(T.boy, this.y * T.boy), 0];
      Z.paraGolge(T.ctx, p, T.kam);
      Z.paraCiz(T.ctx, p, T.kam);
      return devam;
    },
  };
  const ARACLAR = { cark, parmak, zar, para };
  // zar ve para, zar3d.js gelince kurulur; o da sahneye yaklaşınca yüklenir
  const ZAR3D_ISTER = { zar: true, para: true };
  $$('section[data-sahne]').forEach((b) => {
    const arac = ARACLAR[b.dataset.sahne];
    if (!arac) return;
    if (!ZAR3D_ISTER[b.dataset.sahne]) { sahneKur(b, arac); return; }
    yaklasinca(b, () => zar3dYukle().then((tamam) => {
      if (!tamam || !window.Zar3D) return;
      Z = window.Zar3D;
      if (arac.hazirla) arac.hazirla();
      sahneKur(b, arac);
    }), '120%');
  });
})();
