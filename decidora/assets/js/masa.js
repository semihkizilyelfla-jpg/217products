/*!
 * Decidora tanıtım sitesi — tarayıcıda dene
 * Uygulamadaki dört aracın tarayıcıda çalışan provası: zar, yazı tura, çark
 * ve parmak seçici; yanında karar defteri. Sonuçlar crypto.getRandomValues
 * ile, sapmasız biçimde belirlenir. Hiçbir şey kalıcı olarak saklanmaz.
 *
 * Sınırlar ve düğme adları uygulamanın kendisinden (2.3 kaynak kodu):
 * aynı anda en çok 6 zar (d100'de 3), ek −99…+99; çarkta en çok 30 seçenek,
 * her biri en çok 24 harf; parmak seçicide Seç (1–4 kişi), Takım (2–4), Sıra.
 * Beklerken sonuç mürekkeple yazılır, karar çıkınca kırmızı mühürle basılır.
 */
(function () {
  'use strict';

  const kok = document.getElementById('masa-uygulama');
  if (!kok || !window.Zar3D || !window.Cark) return;

  const Z = window.Zar3D;
  const C = window.Cark;
  const SESSIZ = { cal() {}, calRastgele() {} };
  const S = () => window.DecidoraSes || SESSIZ;

  const $ = (s, k) => (k || document).querySelector(s);
  const $$ = (s, k) => Array.from((k || document).querySelectorAll(s));

  const kece = $('#kece');
  const tuval = $('#masa-tuval');
  const govde = $('#masa-govde');
  const sonucKutu = $('.masa__sonuc', kok);
  const sonucBuyuk = $('#sonuc-buyuk');
  const sonucAlt = $('#sonuc-alt');
  const ipucu = $('.masa__ipucu', kok);
  const ipucuMetin = $('[data-ipucu]', kok);
  const kapatDugme = $('[data-tam-kapat]', kok);

  const mq = (s) => (window.matchMedia ? window.matchMedia(s) : { matches: false });
  const hareketAz = mq('(prefers-reduced-motion: reduce)');
  const dokunmatik = mq('(hover: none) and (pointer: coarse)').matches;

  const TAM = Math.PI * 2;

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
  // [0, n) aralığında sapmasız tam sayı (ret örneklemesi)
  function rastgeleTam(n) {
    const sinir = 4294967296 - (4294967296 % n);
    let v;
    do { v = ham32(); } while (v >= sinir);
    return v % n;
  }
  const rastgele = () => ham32() / 4294967296;
  const arasi = (a, b) => a + (b - a) * rastgele();
  function karistir(dizi) {
    const a = dizi.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = rastgeleTam(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ------------------------------------------------------------ yardımcılar */
  const kisit = (v, a, b) => Math.max(a, Math.min(b, v));
  const cikis3 = (u) => 1 - Math.pow(1 - u, 3);
  const geriYay = (u) => {
    const c = 1.7;
    return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2);
  };
  const isaretli = (n) => (n < 0 ? '−' + Math.abs(n) : String(n));

  /* ------------------------------------------------------------ dil */
  // Sayfanın diline göre (html lang). İngilizce metinler uygulamanın kendi çevirisinden
  // (lib/core/dil.dart); orada karşılığı olmayanlar (yönergeler, erişilebilirlik etiketleri)
  // aynı üslupla yazıldı. Yazı = Heads, Tura = Tails: uygulamadaki eşleme.
  const EN = document.documentElement.lang === 'en';
  const DIL = EN ? {
    bugun: 'Today',
    dunAksam: 'Last night',
    dokunVeAt: 'Tap to roll',
    dokunVeAtPara: 'Tap to flip',
    dokunVeCevir: 'Tap to spin',
    enYuksek: 'Highest',
    enDusuk: 'Lowest',
    zar: 'Dice',
    yaziMiTuraMi: 'Heads or tails?',
    atisYok: 'No flips yet.',
    sayacSifirlandi: 'Counter reset.',
    yazi: 'Heads',
    tura: 'Tails',
    paraSayac: (y, t) => `${y} heads · ${t} tails`,
    yaziTura: 'Coin',
    secenek: (n) => `${n} ${n === 1 ? 'option' : 'options'}`,
    ikiSecenek: 'You need at least two options to spin.',
    secenekEkle: 'Add an option',
    donuyor: 'Spinning…',
    secildi: 'Chosen',
    secildiler: 'Chosen',
    cark: 'Wheel',
    secenegiSil: (m) => `Remove “${m}”`,
    listeDolu: (n) => `The wheel is full (${n} options).`,
    zatenListede: 'Already on the wheel.',
    kendiCarkin: 'Your wheel',
    yenidenCevir: 'Chosen · tap to spin again',
    cikti: (m) => `${m} is out`,
    kaldi: (n) => `${n} options left · Tap to spin`,
    yalnizKaldi: (m) => `Only “${m}” is left`,
    carkBos: 'The wheel is empty',
    hazir: [
      { ad: 'What to eat', liste: ['Pizza', 'Burger', 'Sushi', 'Pasta', 'Salad', 'Curry', 'Soup', 'Tacos'] },
      { ad: 'What to drink', liste: ['Tea', 'Coffee', 'Juice', 'Lemonade', 'Soda', 'Water'] },
      { ad: 'What to do', liste: ['Film', 'A walk', 'A game', 'A book', 'Go out'] },
      { ad: 'Yes / No', liste: ['Yes', 'No', 'Maybe'] },
      { ad: 'Film genre', liste: ['Action', 'Comedy', 'Horror', 'Drama', 'Sci-fi', 'Documentary'] },
    ],
    harfDili: 'en-US',
    kip: { sec: 'Pick', takim: 'Teams', sira: 'Order' },
    ve: ' and ',
    siraKimde: 'Who goes first?',
    takimlar: 'How do the teams split?',
    kimSecilecek: 'Who will it be?',
    herkesParmak: 'Everyone, put a finger down',
    tiklaEkle: 'Click to add fingers',
    tiklaParmak: 'Click to add a finger',
    enCokParmak: (n) => `${n} fingers at most`,
    seciliyor: 'Choosing…',
    parmak: (n) => `${n} ${n === 1 ? 'finger' : 'fingers'}`,
    enAzParmak: (n) => `At least ${n} fingers`,
    kipirdama: 'Hold still, choosing in a moment',
    takim: (n) => `${n} teams`,
    siraBelli: 'Order set',
    parmakArac: 'Fingers',
    takimAd: 'Teams',
    secilecek: 'To pick',
    takimAzalt: 'Fewer teams',
    takimArtir: 'More teams',
    kisiAzalt: 'Pick fewer people',
    kisiArtir: 'Pick more people',
    yonergeDokun: 'Everyone puts a finger down and holds still. When the fingers stop, Decidora picks.',
    yonergeFare: 'Click to add a finger, click it again to take it away. Once there are enough fingers, Decidora waits a moment and picks. On a touch screen everyone can put down their own finger.',
    keceZar: 'Tap to roll: roll the dice',
    kecePara: 'Tap to flip: flip the coin',
    keceCark: 'Tap to spin: spin the wheel',
    keceParmakDokun: 'Finger picker area: everyone puts a finger here',
    keceParmakFare: 'Finger picker area: click or press Enter to add a finger',
  } : {
    bugun: 'Bugün',
    dunAksam: 'Dün akşam',
    dokunVeAt: 'Dokun ve at',
    dokunVeAtPara: 'Dokun ve at',
    dokunVeCevir: 'Dokun ve çevir',
    enYuksek: 'En yüksek',
    enDusuk: 'En düşük',
    zar: 'Zar',
    yaziMiTuraMi: 'Yazı mı, tura mı?',
    atisYok: 'Henüz atış yok.',
    sayacSifirlandi: 'Sayaç sıfırlandı.',
    yazi: 'Yazı',
    tura: 'Tura',
    paraSayac: (y, t) => `${y} yazı · ${t} tura`,
    yaziTura: 'Yazı tura',
    secenek: (n) => `${n} seçenek`,
    ikiSecenek: 'Çevirmek için en az iki seçenek gerek.',
    secenekEkle: 'Seçenek ekle',
    donuyor: 'Dönüyor…',
    secildi: 'Seçildi',
    secildiler: 'Seçildiler',
    cark: 'Çark',
    secenegiSil: (m) => `“${m}” seçeneğini sil`,
    listeDolu: (n) => `Liste dolu (${n} seçenek).`,
    zatenListede: 'Bu zaten listede.',
    kendiCarkin: 'Kendi çarkın',
    yenidenCevir: 'Seçildi · yeniden çevirmek için dokun',
    cikti: (m) => `${m} çıktı`,
    kaldi: (n) => `${n} seçenek kaldı · Dokun ve çevir`,
    yalnizKaldi: (m) => `Geriye yalnız “${m}” kaldı`,
    carkBos: 'Çark boş',
    hazir: [
      { ad: 'Ne yesek', liste: ['Pizza', 'Lahmacun', 'Kebap', 'Mantı', 'Burger', 'Döner', 'Çorba', 'Balık'] },
      { ad: 'Ne içsek', liste: ['Çay', 'Kahve', 'Ayran', 'Limonata', 'Soda', 'Su'] },
      { ad: 'Ne yapsak', liste: ['Film', 'Yürüyüş', 'Oyun', 'Kitap', 'Dışarı çık'] },
      { ad: 'Evet / Hayır', liste: ['Evet', 'Hayır', 'Belki'] },
      { ad: 'Film türü', liste: ['Aksiyon', 'Komedi', 'Korku', 'Dram', 'Bilim kurgu', 'Belgesel'] },
    ],
    harfDili: 'tr-TR',
    kip: { sec: 'Seç', takim: 'Takım', sira: 'Sıra' },
    ve: ' ve ',
    siraKimde: 'Sıra kimde?',
    takimlar: 'Takımlar ne olsun?',
    kimSecilecek: 'Kim seçilecek?',
    herkesParmak: 'Herkes bir parmağını koysun',
    tiklaEkle: 'Tıklayarak parmak ekle',
    tiklaParmak: 'Tıkla, parmak ekle',
    enCokParmak: (n) => `En çok ${n} parmak`,
    seciliyor: 'Seçiliyor…',
    parmak: (n) => `${n} parmak`,
    enAzParmak: (n) => `En az ${n} parmak`,
    kipirdama: 'Kıpırdamayın, birazdan seçiliyor',
    takim: (n) => `${n} takım`,
    siraBelli: 'Sıra belli',
    parmakArac: 'Parmak',
    takimAd: 'Takım',
    secilecek: 'Seçilecek',
    takimAzalt: 'Takım sayısını azalt',
    takimArtir: 'Takım sayısını artır',
    kisiAzalt: 'Seçilecek kişi sayısını azalt',
    kisiArtir: 'Seçilecek kişi sayısını artır',
    yonergeDokun: 'Herkes bir parmağını koysun ve kıpırdatmasın. Parmaklar durunca Decidora seçer.',
    yonergeFare: 'Tıklayarak parmak ekle, yeniden tıklayarak çıkar. Yeterince parmak olunca Decidora kısa bir süre bekler ve seçer. Dokunmatik ekranda herkes kendi parmağını koyabilir.',
    keceZar: 'Dokun ve at: zarları at',
    kecePara: 'Dokun ve at: parayı at',
    keceCark: 'Dokun ve çevir: çarkı çevir',
    keceParmakDokun: 'Parmak seçici alanı: herkes bir parmağını buraya koysun',
    keceParmakFare: 'Parmak seçici alanı: parmak eklemek için tıkla ya da Enter tuşuna bas',
  };
  // SVG simgesi DOM ile kurulur: sayfada innerHTML yok (Trusted Types açık, CSP'ye bak)
  const SVG_AD = 'http://www.w3.org/2000/svg';
  function simge(id) {
    const s = document.createElementNS(SVG_AD, 'svg');
    s.setAttribute('class', 'simge');
    s.setAttribute('aria-hidden', 'true');
    const u = document.createElementNS(SVG_AD, 'use');
    u.setAttribute('href', '#' + id);
    s.appendChild(u);
    return s;
  }
  // Türkçe saat biçimi "20:05". Intl ile kurmak ilk çağrıda yerel ayar verisini yüklüyor
  // (yavaş telefonda ~50 ms) ve bu ilk atışın bittiği kareye denk geliyordu.
  const iki = (n) => (n < 10 ? '0' : '') + n;
  const saat = (d) => iki(d.getHours()) + ':' + iki(d.getMinutes());
  function hexRgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  const Rz = (a) => Z.M.eksenAci([0, 0, 1], a);

  function radyoGrubu(kap, secince) {
    const dugmeler = $$('[role="radio"]', kap);
    const sec = (b, odak) => {
      dugmeler.forEach((d) => {
        const s = d === b;
        d.setAttribute('aria-checked', s ? 'true' : 'false');
        d.tabIndex = s ? 0 : -1;
      });
      if (odak) b.focus();
      secince(b);
    };
    dugmeler.forEach((b, i) => {
      b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1;
      b.addEventListener('click', () => sec(b));
      b.addEventListener('keydown', (e) => {
        let j = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % dugmeler.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + dugmeler.length) % dugmeler.length;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = dugmeler.length - 1;
        if (j !== null) {
          e.preventDefault();
          sec(dugmeler[j], true);
        }
      });
    });
  }

  // Basılı tutunca tekrarlayan düğme (sayaçlar için)
  function tekrarla(dugme, fn) {
    let z1 = 0, z2 = 0, tekrarladi = false;
    const dur = () => { clearTimeout(z1); clearInterval(z2); };
    dugme.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      tekrarladi = false;
      dur();
      z1 = setTimeout(() => {
        z2 = setInterval(() => { tekrarladi = true; fn(); }, 85);
      }, 430);
    });
    ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach((o) => dugme.addEventListener(o, dur));
    dugme.addEventListener('click', () => {
      if (tekrarladi) { tekrarladi = false; return; }
      fn();
    });
  }

  /* ------------------------------------------------------------ tuval ve çizim döngüsü */
  const T = { en: 0, boy: 0, dpr: 1, ctx: null, kam: null };
  let arac = 'zar';
  let kareNo = 0;
  let gorunur = true;

  function iste() {
    if (!kareNo && gorunur && !document.hidden) kareNo = requestAnimationFrame(kare);
  }
  function kare(t) {
    kareNo = 0;
    if (!T.ctx) return;
    T.ctx.setTransform(1, 0, 0, 1, 0, 0);
    T.ctx.clearRect(0, 0, tuval.width, tuval.height);
    if (ARAC[arac].ciz(t, T.ctx)) iste();
  }
  function boyutla() {
    const en = kece.clientWidth, boy = kece.clientHeight;
    if (!en || !boy) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (en === T.en && boy === T.boy && dpr === T.dpr && T.ctx) return;
    const r = Z.tuvalHazirla(tuval, en, boy, 2);
    T.en = en; T.boy = boy; T.dpr = r.dpr; T.ctx = r.ctx; T.kam = r.kam;
    Object.values(ARAC).forEach((a) => a.boyut && a.boyut());
    iste();
  }

  /* ------------------------------------------------------------ sonuç alanı */
  function sonucGoster(g, canlandir) {
    sonucBuyuk.textContent = g.buyuk;
    sonucAlt.textContent = g.alt || '';
    sonucBuyuk.classList.toggle('muhurlu', !g.bekliyor);
    sonucBuyuk.classList.remove('soluk');
    if (canlandir) {
      sonucBuyuk.classList.remove('yeni');
      void sonucBuyuk.offsetWidth;
      sonucBuyuk.classList.add('yeni');
    }
  }
  // Atış başlarken: eski mühür kalkar, yazı soluklaşır
  function sonucBekle() {
    sonucBuyuk.classList.remove('muhurlu', 'yeni');
    sonucBuyuk.classList.add('soluk');
  }
  function mesgul(evet) {
    sonucKutu.setAttribute('aria-busy', evet ? 'true' : 'false');
    kece.classList.toggle('mesgul', !!evet);
  }
  function ipucuAyarla(metin, goster) {
    if (metin) ipucuMetin.textContent = metin;
    ipucu.classList.toggle('gizli', !goster);
  }

  /* ------------------------------------------------------------ karar defteri */
  // Uygulamadaki gibi kararlar güne göre ayrılır: "Bugün" ziyaretçinin burada
  // denedikleri, "Dün akşam" sayfanın anlattığı akşamın kararları (sahneler bunları
  // site.js'ten, gerçekten çıkan sonuçlarla yazar).
  const Defter = (function () {
    const liste = $('#defterim-liste');
    const sayi = $('#defterim-sayi');
    const bos = $('#defterim-bos');
    const anahtar = $('#defterim-acik');
    const temizle = $('#defterim-temizle');
    const kutu = $('.defterim', kok);
    const EN_COK = 200;
    let kayitlar = [];   // bugün, en yeni başta
    let dun = [];        // { saat: '19.40', baslik, sonuc, detay }
    let acik = true;
    let bugunBaslik = null;   // listede "Bugün" başlığı (yeni kayıtlar hemen altına girer)
    let dunBaslik = null;

    function satir(k) {
      const li = document.createElement('li');
      const ne = document.createElement('span');
      ne.className = 'ne';
      const b = document.createElement('b');
      b.textContent = k.baslik;
      const sm = document.createElement('small');
      sm.textContent = (k.saat || saat(k.zaman)) + (k.detay ? ' · ' + k.detay : '');
      ne.append(b, sm);
      const so = document.createElement('span');
      so.className = 'sonuc';
      so.textContent = k.sonuc;
      li.append(ne, so);
      return li;
    }
    function gun(metin) {
      const li = document.createElement('li');
      li.className = 'defterim__gun';
      li.textContent = metin;
      return li;
    }
    function sayac() {
      const n = kayitlar.length + dun.length;
      sayi.textContent = n + ' / ' + EN_COK;
      bos.hidden = n > 0;
      temizle.hidden = n === 0;
    }
    function yaz() {
      liste.textContent = '';
      bugunBaslik = dunBaslik = null;
      if (kayitlar.length) {
        bugunBaslik = liste.appendChild(gun(DIL.bugun));
        kayitlar.forEach((k) => liste.appendChild(satir(k)));
      }
      if (dun.length) {
        dunBaslik = liste.appendChild(gun(DIL.dunAksam));
        dun.slice().reverse().forEach((k) => liste.appendChild(satir(k)));
      }
      sayac();
    }
    // Atışın bittiği karede çalışır: 200 satırı baştan kurmak yavaş telefonda o kareyi
    // takıltıyordu. Yeni satır başlığın altına girer, sınırı aşan en eski satır çıkar.
    function ekle(k) {
      if (!acik) return;
      k.zaman = new Date();
      kayitlar.unshift(k);
      if (!bugunBaslik) {
        if (kayitlar.length + dun.length > EN_COK) kayitlar.length = Math.max(0, EN_COK - dun.length);
        yaz();
        return;
      }
      bugunBaslik.after(satir(k));
      while (kayitlar.length > 1 && kayitlar.length + dun.length > EN_COK) {
        kayitlar.pop();
        const son = dunBaslik ? dunBaslik.previousElementSibling : liste.lastElementChild;
        if (son && son !== bugunBaslik) son.remove();
      }
      sayac();
    }
    // Akşamın bir kararı: aynı saatteki kayıt varsa yerine geçer (sahne yeniden oynatılınca)
    function aksam(k) {
      if (!acik) return;
      const i = dun.findIndex((d) => d.saat === k.saat);
      if (i >= 0) dun[i] = k;
      else {
        dun.push(k);
        dun.sort((a, b) => a.saat.localeCompare(b.saat));
      }
      yaz();
    }
    anahtar.addEventListener('change', () => {
      acik = anahtar.checked;
      kutu.classList.toggle('kapali', !acik);
    });
    temizle.addEventListener('click', () => {
      kayitlar = [];
      dun = [];
      yaz();
    });
    yaz();
    return { ekle, aksam };
  })();

  /* ============================================================ ZAR */
  const DUSUS = (u) => {
    if (u < 0.62) return 1.25 * (1 - Math.pow(u / 0.62, 2));
    if (u < 0.86) {
      const s = (u - 0.62) / 0.24;
      return 0.18 * 4 * s * (1 - s);
    }
    return 0;
  };

  // Uygulamada aynı anda en çok 6 zar var; d100 her değeri iki zarla attığı için orada 3.
  const EN_COK_ZAR = 6;
  const EN_COK_EK = 99;
  const enCokAdet = (tur) => (tur === 100 ? EN_COK_ZAR / 2 : EN_COK_ZAR);

  const zar = {
    tur: 6,
    adet: 2,
    ek: 0,
    liste: [],
    degerler: [6, 4],
    atiyor: false,
    zamanlayici: 0,
    kurZamanlayici: 0,
    vurguBas: 0,
    ipucu: true,
    gosterge: { buyuk: '2d6', alt: DIL.dokunVeAt, bekliyor: true },

    formul() {
      const e = this.ek > 0 ? '+' + this.ek : this.ek < 0 ? '−' + -this.ek : '';
      return this.adet + 'd' + this.tur + e;
    },
    yaricap() {
      const r = 0.5 * Math.sqrt((T.en * T.boy) / (this.adet * 9.5));
      return kisit(Math.min(r, Math.min(T.en, T.boy) * 0.13), 13, 70);
    },
    // bolge: yatayda [sol, sağ] oranı. Atışta zarlar sağ kenardan geldiği için iniş
    // masanın ortasına ve soluna; yoksa sağa inen zar neredeyse hiç yol almıyor.
    yerlestir(n, bolge) {
      const r = this.yaricap() * Z.OLCEK[this.tur];
      const yan = r * 1.2, ust = r * 1.75, alt = r * 0.9 + (this.ipucu ? 46 : 12);
      let x0 = yan, x1 = Math.max(yan + 1, T.en - yan);
      const y0 = ust, y1 = Math.max(ust + 1, T.boy - alt);
      if (bolge) {
        x0 = Math.max(x0, T.en * bolge[0]);
        x1 = Math.max(x0 + 1, Math.min(x1, T.en * bolge[1]));
      }
      const noktalar = [];
      let mesafe = r * 2.25;
      for (let i = 0; i < n; i++) {
        let p = null;
        for (let d = 0; d < 360 && !p; d++) {
          if (d && d % 60 === 0) mesafe *= 0.88;
          const x = arasi(x0, x1), y = arasi(y0, y1);
          if (noktalar.every((q) => Math.hypot(q[0] - x, (q[1] - y) * 1.15) >= mesafe)) p = [x, y];
        }
        noktalar.push(p || [arasi(x0, x1), arasi(y0, y1)]);
      }
      return noktalar.map(([x, y]) => [x / T.en, y / T.boy]);
    },
    yonlendir(z, deger) {
      const yaw = z.tur === 6 ? (rastgele() < 0.5 ? -1 : 1) * arasi(0.4, 0.95) : arasi(-0.45, 0.45);
      if (z.tur === 100) z.etiket = Z.yuzEtiketD100(deger, rastgele);
      const d = Z.dinlenme(z, deger, yaw);
      z.Rson = d.R;
      z.ustYuz = d.ust;
      z.ustKose = d.ustKose;
    },
    kur() {
      // İlk görünüm: uygulamanın ekran görüntüsündeki gibi 6 ve 4
      const r = this.yaricap();
      const yer = [[0.41, 0.45, 6, 0.62], [0.6, 0.67, 4, -0.55]];
      this.liste = yer.map(([nx, ny, deger, yaw]) => {
        const z = Z.zarOlustur(6, { boy: r });
        const d = Z.dinlenme(z, deger, yaw);
        z.Rson = d.R; z.R = d.R; z.ustYuz = d.ust; z.vurgu = 1;
        return { z, nx, ny, anim: null };
      });
    },
    boyut() {
      if (!this.liste.length) this.kur();
      const r = this.yaricap();
      for (const o of this.liste) o.z.boy = r;
    },
    etkin() {
      sonucGoster(this.gosterge);
      ipucuAyarla(DIL.dokunVeAt, this.ipucu);
    },
    dokun() { this.at(); },

    // İlk yayın tepesi: masanın dörtte biri kadar, ama hiçbir zar masanın üstünden taşmasın.
    // Uygulamadaki guvenliTepe'nin karşılığı: en yüksek nokta ilk yayın ortasında, iniş
    // noktasının biraz altından (yörünge 0.05..0.095 aşağıdan başlıyor); rastgele çarpan 1.16'ya dek.
    guvenliTepe(hedefler, r) {
      const boy = r * Z.OLCEK[this.tur];
      let tepe = T.boy * 0.26;
      for (const [, y] of hedefler) tepe = Math.min(tepe, (y * T.boy - boy * 1.7 - 10) / 1.16);
      return Math.max(boy * 0.6, tepe);
    },
    at() {
      if (this.atiyor || !T.en) return;
      clearTimeout(this.kurZamanlayici);
      const az = hareketAz.matches;
      const simdi = performance.now();
      // uygulamadaki gibi ~950 ms; geniş masada yol uzadığı için biraz daha uzun
      const sure = az ? 320 : kisit(880 + T.en * 0.12, 950, 1150);
      const r = this.yaricap();
      const hedefler = this.yerlestir(this.adet, [0.14, 0.74]);
      // Tür değişince zarlar 110 ms sonra yeniden dizilir; o arada atılırsa eski türdeki
      // zarlar yeni türün sonucunu gösteremez (d6'da 57 diye yüz yok). Yeni türde başlasınlar.
      this.liste = this.liste.map((o) => {
        if (o.z.tur === this.tur) return o;
        const z = Z.zarOlustur(this.tur, { boy: r });
        z.R = o.z.R;
        return Object.assign({}, o, { z, anim: null });
      });
      while (this.liste.length < this.adet) {
        this.liste.push({ z: Z.zarOlustur(this.tur, { boy: r }), nx: 1.1, ny: 0.6, anim: null });
      }
      this.liste.length = this.adet;
      this.degerler = [];
      const enYuksek = this.guvenliTepe(hedefler, r);
      let sonOturma = 0;
      let ilkCarpma = 1;
      this.liste.forEach((o, i) => {
        const z = o.z;
        z.boy = r;
        const deger = 1 + rastgeleTam(this.tur);
        this.degerler.push(deger);
        this.yonlendir(z, deger);   // z.Rson: sonuç yüzü üstte duruş
        o.nx = hedefler[i][0];
        o.ny = hedefler[i][1];
        z.vurgu = 0;
        if (az) {
          o.anim = null;
          z.R = z.Rson;
          z.hava = 0;
          return;
        }
        const hareket = Z.zarAtisi({ enYuksek, hedef: hedefler[i], rastgele });
        o.anim = {
          tip: 'atis', bas: simdi, sure, hareket, donus: Z.atisDonusu(rastgele),
          boyTaban: r, derinlikSon: hareket.derinlik(1),
        };
        sonOturma = Math.max(sonOturma, hareket.oturmaAni);
        ilkCarpma = Math.min(ilkCarpma, hareket.carpmaAnlari[0]);
      });
      this.atiyor = true;
      this.vurguBas = 0;
      // ses, ilk zarın masaya ilk değdiği anda
      const carpma = az ? 0.05 : (ilkCarpma * sure) / 1000;
      if (this.adet === 1) {
        S().calRastgele('zar_tek', { gecikme: carpma, ses: 0.95 });
      } else {
        S().calRastgele('zar_cok', { gecikme: carpma, ses: 0.95 });
        if (this.adet >= 5) S().calRastgele('zar_cok', { gecikme: carpma + 0.09, ses: 0.5, hiz: 1.06 });
      }
      this.ipucu = false;
      if (arac === 'zar') {
        ipucuAyarla(null, false);
        sonucBekle();
      }
      mesgul(true);
      clearTimeout(this.zamanlayici);
      // sonuç, bütün zarlar oturunca (sallanmadan sonra) basılır
      this.zamanlayici = setTimeout(() => this.bitir(), (az ? sure : sonOturma * sure) + 60);
      iste();
    },
    bitir() {
      this.atiyor = false;
      // atış hareketi t = 1'e kadar kendi kendine biter (dinlenme payı); burada yalnız
      // hareketi olmayanları (hareketi azalt) yerine koy
      for (const o of this.liste) {
        if (o.anim && o.anim.tip === 'atis') continue;
        o.anim = null;
        o.z.R = o.z.Rson;
        o.z.hava = 0;
      }
      this.vurguBas = performance.now();
      const toplam = this.degerler.reduce((a, b) => a + b, 0) + this.ek;
      const dokum = this.degerler.join(' · ') + (this.ek ? (this.ek > 0 ? '  +' : '  −') + Math.abs(this.ek) : '');
      // uygulamadaki gibi: tek zarda en yüksek ya da en düşük gelirse sonucun altında söylenir
      let not = '';
      if (this.adet === 1 && this.degerler[0] === this.tur) not = DIL.enYuksek;
      else if (this.adet === 1 && this.degerler[0] === 1) not = DIL.enDusuk;
      const alt = this.adet === 1 ? [this.formul(), not].filter(Boolean).join(' · ') : this.formul() + ' · ' + dokum;
      this.gosterge = { buyuk: isaretli(toplam), alt, bekliyor: false };
      if (arac === 'zar') sonucGoster(this.gosterge, true);
      mesgul(false);
      Defter.ekle({ arac: 'zar', baslik: DIL.zar + ' · ' + this.formul(), sonuc: isaretli(toplam), detay: dokum });
      iste();
    },
    yenidenKur() {
      // Tür ya da adet değişince zarları yeniden diz (atış sayılmaz, deftere yazılmaz)
      if (!T.en) return;
      const r = this.yaricap();
      const yer = this.yerlestir(this.adet);
      const simdi = performance.now();
      const az = hareketAz.matches;
      this.liste = yer.map(([nx, ny], i) => {
        const z = Z.zarOlustur(this.tur, { boy: r });
        this.yonlendir(z, 1 + rastgeleTam(this.tur));
        z.R = z.Rson;
        z.vurgu = 0;
        const o = { z, nx, ny, anim: null };
        if (!az) {
          const eksen = Z.V.birim([rastgele() - 0.5, rastgele() - 0.5, rastgele() - 0.5]);
          o.anim = { bas: simdi + i * 16, sure: 460, sx: nx, sy: ny, ex: nx, ey: ny, eksen, teta: arasi(0.6, 1.3), profil: DUSUS, yuk: 1 };
        }
        return o;
      });
      this.degerler = [];
      clearTimeout(this.kurZamanlayici);
      this.kurZamanlayici = setTimeout(() => {
        for (const o of this.liste) o.anim = null;
        iste();
      }, 520 + this.adet * 16);
      iste();
    },
    ayarGuncelle(yeniden) {
      clearTimeout(this.zamanlayici);
      if (this.atiyor) {
        this.atiyor = false;
        mesgul(false);
      }
      $('#zar-adet').textContent = this.adet;
      $('#zar-ek').textContent = this.ek > 0 ? '+' + this.ek : this.ek < 0 ? '−' + -this.ek : '+0';
      $('#zar-formul').textContent = this.formul();
      const [adEksi, adArti] = $$('[data-sayac="adet"] button', kok);
      const [ekEksi, ekArti] = $$('[data-sayac="ek"] button', kok);
      adEksi.disabled = this.adet <= 1;
      adArti.disabled = this.adet >= enCokAdet(this.tur);
      ekEksi.disabled = this.ek <= -EN_COK_EK;
      ekArti.disabled = this.ek >= EN_COK_EK;
      this.gosterge = { buyuk: this.formul(), alt: DIL.dokunVeAt, bekliyor: true };
      if (arac === 'zar') sonucGoster(this.gosterge);
      if (yeniden) {
        clearTimeout(this.kurZamanlayici);
        this.kurZamanlayici = setTimeout(() => this.yenidenKur(), 110);
      }
    },
    bagla() {
      radyoGrubu($('[data-zar-turleri]', kok), (b) => {
        const tur = +b.dataset.tur;
        if (tur === this.tur) return;
        this.tur = tur;
        Z.kaliplariIsit(tur);
        this.adet = Math.min(this.adet, enCokAdet(tur));
        this.ayarGuncelle(true);
      });
      const [adEksi, adArti] = $$('[data-sayac="adet"] button', kok);
      const [ekEksi, ekArti] = $$('[data-sayac="ek"] button', kok);
      const adet = (d) => () => {
        const y = kisit(this.adet + d, 1, enCokAdet(this.tur));
        if (y !== this.adet) { this.adet = y; this.ayarGuncelle(true); }
      };
      const ek = (d) => () => {
        const y = kisit(this.ek + d, -EN_COK_EK, EN_COK_EK);
        if (y !== this.ek) { this.ek = y; this.ayarGuncelle(false); }
      };
      tekrarla(adEksi, adet(-1));
      tekrarla(adArti, adet(1));
      tekrarla(ekEksi, ek(-1));
      tekrarla(ekArti, ek(1));
      adEksi.disabled = this.adet <= 1;
    },

    ciz(t, ctx) {
      let devam = false;
      const liste = [];
      for (const o of this.liste) {
        const z = o.z;
        let nx = o.nx, ny = o.ny;
        z.hava = 0;
        const a = o.anim;
        if (a && a.tip === 'atis') {
          // uygulamanın atış modeli: zemindeki nokta, sekme yüksekliği, iki eksenli dönüş
          const u = kisit((t - a.bas) / a.sure, 0, 1);
          const h = a.hareket;
          [nx, ny] = h.zemin(u);
          z.hava = h.yukseklik(u) / Z.SIN;
          z.R = Z.atisDurusu(z.Rson, h, a.donus, u);
          z.boy = (a.boyTaban * h.derinlik(u)) / a.derinlikSon;
          if (u < 1) devam = true;
          else { o.anim = null; z.boy = a.boyTaban; }
        } else if (a) {
          const u = kisit((t - a.bas) / a.sure, 0, 1);
          const e = cikis3(u);
          nx = a.sx + (a.ex - a.sx) * e;
          ny = a.sy + (a.ey - a.sy) * e;
          if (a.profil) z.hava = a.profil(u) * z.boy * a.yuk;
          z.R = Z.M.carp(Z.M.eksenAci(a.eksen, a.teta * Math.pow(1 - u, 2.2)), z.Rson);
          if (u < 1) devam = true;
        }
        z.konum = [nx * T.en, Z.masaY(T.boy, ny * T.boy), 0];
        liste.push(z);
      }
      if (this.vurguBas) {
        const v = kisit((t - this.vurguBas) / 380, 0, 1);
        for (const o of this.liste) o.z.vurgu = v;
        if (v < 1) devam = true;
        else this.vurguBas = 0;
      }
      // uzaktan yakına
      const derinlik = (z) => -z.konum[1] * Z.SIN + z.hava * Z.COS;
      liste.sort((p, q) => derinlik(p) - derinlik(q));
      for (const z of liste) Z.zarGolge(ctx, z, T.kam);
      for (const z of liste) Z.zarCiz(ctx, z, T.kam);
      return devam;
    },
  };

  /* ============================================================ YAZI TURA */
  // Paranın masadaki evi (birim kutu): atış bulunduğu yerden kalkar, buraya yakın iner.
  // Uygulamada da atış kutunun alt üçte birinden kalkıyor; yukarıda yay için yer kalsın.
  const PARA_EV = [0.5, 0.66];

  const para = {
    p: Z.paraOlustur({ yaricap: 60 }),
    x: PARA_EV[0],
    y: PARA_EV[1],
    yazi: 0,
    tura: 0,
    anim: null,
    zamanlayici: 0,
    ipucu: true,
    gosterge: { buyuk: DIL.yaziMiTuraMi, alt: DIL.atisYok, bekliyor: true },

    boyut() {
      // masaüstünde keçe ~300 px boyunda: para büyük olunca yaya yer kalmıyordu
      this.p.yaricap = kisit(Math.min(T.en, T.boy) * 0.16, 30, 100);
      if (!this.anim) this.p.R = this.p.R || Rz(0.25);
    },
    etkin() {
      sonucGoster(this.gosterge);
      ipucuAyarla(DIL.dokunVeAtPara, this.ipucu);
    },
    dokun() { this.at(); },
    at() {
      if (this.anim || !T.en) return;
      const p = this.p;
      const tura = rastgeleTam(2) === 1;
      const d = Z.paraDonusu(p.R, tura, rastgele);
      this.ipucu = false;
      if (arac === 'para') {
        ipucuAyarla(null, false);
        sonucBekle();
      }
      mesgul(true);
      clearTimeout(this.zamanlayici);
      if (hareketAz.matches) {
        // hareketi azalt: atış yok, para sonuç yüzüyle yerinde
        this.anim = { d, h: null, tura };
        this.bitir();
        return;
      }
      const bitis = [PARA_EV[0] + arasi(-0.07, 0.07), PARA_EV[1] - 0.02 + arasi(-0.03, 0.03)];
      // yay tepesi kutunun boyunun %62'si (uygulamada %66), ama para kadrajdan taşmasın
      const tavan = Z.paraTavani(Math.min(this.y, bitis[1]) * T.boy, p.yaricap);
      const h = Z.paraAtisi({ enYuksek: T.boy * 0.62, tavan, baslangic: [this.x, this.y], bitis, rastgele });
      // süre yayın kareköküyle (serbest düşüş): uygulamada ~160 px'lik yaya 1050 ms
      const sure = kisit(1050 * Math.sqrt(h.enYuksek / 160), 950, 1350);
      const a = { bas: performance.now(), sure, h, d, tura };
      this.anim = a;
      // sesler yörüngenin çarpma anlarından: fiske, iniş, sekme, sonra hızlanan tıkırtı
      const ses = S();
      const an = (u) => (u * sure) / 1000;
      ses.cal('para_fiske', { ses: 0.7 });
      ses.cal('para_dus', { gecikme: an(h.carpmaAnlari[0]), ses: 0.9 });
      ses.cal('para_dus', { gecikme: an(h.carpmaAnlari[1]), ses: 0.4, hiz: 1.12 });
      const w = h.oturmaAni - h.ucusSonu;
      ses.cal('para_titre', { gecikme: an(h.ucusSonu + w * 0.14), ses: 0.5 });
      ses.cal('para_titre', { gecikme: an(h.ucusSonu + w * 0.5), ses: 0.36, hiz: 1.18 });
      ses.cal('para_titre', { gecikme: an(h.ucusSonu + w * 0.78), ses: 0.24, hiz: 1.4 });
      this.zamanlayici = setTimeout(() => this.bitir(), sure + 40);
      iste();
    },
    bitir() {
      const a = this.anim;
      if (!a) return;
      this.anim = null;
      this.p.R = a.d.hedef;
      this.p.hava = 0;
      if (a.h) [this.x, this.y] = a.h.zemin(1);
      if (a.tura) this.tura++;
      else this.yazi++;
      const ad = a.tura ? DIL.tura : DIL.yazi;
      this.sayacYaz(ad);
      this.gosterge = { buyuk: ad, alt: DIL.paraSayac(this.yazi, this.tura), bekliyor: false };
      if (arac === 'para') sonucGoster(this.gosterge, true);
      mesgul(false);
      Defter.ekle({ arac: 'para', baslik: DIL.yaziTura, sonuc: ad, detay: DIL.paraSayac(this.yazi, this.tura) });
      iste();
    },
    sayacYaz(son) {
      $('#para-yazi').textContent = this.yazi;
      $('#para-tura').textContent = this.tura;
      $('#para-son').textContent = son || '–';
      const top = this.yazi + this.tura;
      $('#oran-yazi').style.flexGrow = top ? this.yazi : 1;
      $('#oran-tura').style.flexGrow = top ? this.tura : 1;
    },
    bagla() {
      $('#para-sifirla').addEventListener('click', () => {
        this.yazi = 0;
        this.tura = 0;
        this.sayacYaz(null);
        this.gosterge = { buyuk: DIL.yaziMiTuraMi, alt: DIL.sayacSifirlandi, bekliyor: true };
        if (arac === 'para') sonucGoster(this.gosterge);
      });
      this.sayacYaz(null);
    },
    // uygulamanın para modeli (zar3d.js › paraYonelimi): sabit hızla dönerek uçar, bir kez
    // seker, 46° eğikle değip titreyerek yatar
    guncelle(t) {
      const a = this.anim;
      const p = this.p;
      const u = kisit((t - a.bas) / a.sure, 0, 1);
      [this.x, this.y] = a.h.zemin(u);
      p.hava = a.h.yukseklik(u) / Z.SIN;
      p.R = Z.paraYonelimi(a.d, a.h, u);
      return u < 1;
    },
    ciz(t, ctx) {
      let devam = false;
      if (this.anim) devam = this.guncelle(t);
      const p = this.p;
      if (!p.R) p.R = Rz(0.25);
      p.konum = [this.x * T.en, Z.masaY(T.boy, this.y * T.boy), 0];
      Z.paraGolge(ctx, p, T.kam);
      Z.paraCiz(ctx, p, T.kam);
      return devam;
    },
  };
  para.p.R = Rz(0.25);

  /* ============================================================ ÇARK */
  // Uygulamanın kendi hazır çarkları, aynı sırayla ve aynı içerikle
  const HAZIR = DIL.hazir;
  const EN_FAZLA = 30;
  const EN_UZUN = 24;
  const kucuk = (m) => m.toLocaleLowerCase(DIL.harfDili);

  const cark = {
    ad: HAZIR[0].ad,
    secenekler: HAZIR[0].liste.slice(),
    aci: -0.42,
    donus: null,
    onbellek: {},
    zamanlayici: 0,
    sonuc: -1,
    vurguT: 0,
    vurguHedef: 0,
    igne: 0,
    igneHiz: 0,
    sonT: 0,
    sonKat: 0,
    sonTik: 0,
    ipucu: true,
    gosterge: null,

    geo() {
      const bosluk = 46;
      const r = Math.max(40, Math.min(T.en / 2 / 1.16, ((T.boy - bosluk) / 2) * 0.95));
      return { cx: T.en / 2 - r * 0.05, cy: (T.boy - bosluk) / 2 + 5, r };
    },
    varsayilanGosterge() {
      const n = this.secenekler.length;
      return {
        buyuk: this.ad,
        alt: n >= 2 ? `${DIL.secenek(n)} · ${DIL.dokunVeCevir}` : DIL.ikiSecenek,
        bekliyor: true,
      };
    },
    etkin() {
      if (!this.gosterge) this.gosterge = this.varsayilanGosterge();
      if (!this.donus) sonucGoster(this.gosterge);
      ipucuAyarla(DIL.dokunVeCevir, this.ipucu);
    },
    dokun() { this.cevir(); },

    cevir() {
      if (this.donus || !T.en) return;
      const n = this.secenekler.length;
      if (n < 2) {
        this.gosterge = { buyuk: DIL.secenekEkle, alt: DIL.ikiSecenek, bekliyor: true };
        sonucGoster(this.gosterge, true);
        return;
      }
      this.sonucKapat();
      const az = hareketAz.matches;
      const kazanan = rastgeleTam(n);
      const s = TAM / n;
      const hedef = -(kazanan + arasi(0.14, 0.86)) * s;
      const fark = (((hedef - this.aci) % TAM) + TAM) % TAM;
      const delta = fark + TAM * (az ? 1 : 5 + rastgeleTam(3));
      const sure = az ? 1300 : 4600 + rastgele() * 1400;
      this.donus = { bas: performance.now(), sure, aci0: this.aci, delta, kazanan };
      this.sonKat = Math.floor(this.aci / s);
      this.vurguHedef = 0;
      this.ipucu = false;
      ipucuAyarla(null, false);
      this.duzenKilit(true);
      mesgul(true);
      sonucBekle();
      sonucBuyuk.textContent = DIL.donuyor;
      sonucAlt.textContent = this.ad;
      clearTimeout(this.zamanlayici);
      this.zamanlayici = setTimeout(() => this.bitir(), sure + 40);
      iste();
    },
    bitir() {
      const d = this.donus;
      if (!d) return;
      this.aci = d.aci0 + d.delta;
      this.donus = null;
      this.sonuc = d.kazanan;
      this.vurguHedef = 1;
      S().cal('secim', { ses: 0.85 });
      const ad = this.secenekler[this.sonuc];
      this.gosterge = { buyuk: ad, alt: DIL.secildi + ' · ' + this.ad, bekliyor: false };
      if (arac === 'cark') sonucGoster(this.gosterge, true);
      mesgul(false);
      this.duzenKilit(false);
      $('#cark-sonuc').hidden = false;
      $('#cark-duzen').hidden = true;
      Defter.ekle({ arac: 'cark', baslik: DIL.cark + ' · ' + this.ad, sonuc: ad, detay: DIL.secenek(this.secenekler.length) });
      iste();
    },
    sonucKapat() {
      $('#cark-sonuc').hidden = true;
      $('#cark-duzen').hidden = false;
    },
    duzenKilit(kilit) {
      $$('#cark-duzen input, #cark-duzen button, #cark-duzen select, #cark-duzen textarea', kok).forEach((el) => {
        el.disabled = kilit;
      });
    },

    // --- düzenleyici
    listeYaz() {
      const ul = $('#cark-liste');
      ul.textContent = '';
      const n = this.secenekler.length;
      this.secenekler.forEach((s, i) => {
        const li = document.createElement('li');
        const ad = document.createElement('span');
        ad.className = 'ad';
        ad.textContent = s;
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', DIL.secenegiSil(s));
        b.appendChild(simge('i-carpi'));
        b.addEventListener('click', () => this.sil(i));
        li.append(ad, b);
        ul.appendChild(li);
      });
      $('#cark-ad').textContent = this.ad;
      $('#cark-sayi').textContent = DIL.secenek(n);
      iste();
    },
    temizMetin(m) {
      return String(m)
        .replace(/^\s*(?:[-•*·–—]|\d+[.)])\s+/, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, EN_UZUN);
    },
    ekle(metinler) {
      let eklenen = 0;
      for (const m of metinler) {
        const t = this.temizMetin(m);
        if (!t) continue;
        if (this.secenekler.length >= EN_FAZLA) break;
        // uygulamadaki gibi aynı seçenek iki kez girmez
        if (this.secenekler.some((v) => kucuk(v) === kucuk(t))) continue;
        this.secenekler.push(t);
        eklenen++;
      }
      if (eklenen) {
        this.sonuc = -1;
        this.vurguT = 0;
        this.vurguHedef = 0;
      }
      this.listeYaz();
      if (this.secenekler.length >= EN_FAZLA) {
        this.gosterge = { buyuk: this.ad, alt: DIL.listeDolu(EN_FAZLA), bekliyor: true };
      } else if (!eklenen && metinler.some((m) => this.temizMetin(m))) {
        this.gosterge = { buyuk: this.ad, alt: DIL.zatenListede, bekliyor: true };
      } else {
        this.gosterge = this.varsayilanGosterge();
      }
      if (arac === 'cark') sonucGoster(this.gosterge);
      return eklenen;
    },
    sil(i) {
      if (this.donus) return;
      this.secenekler.splice(i, 1);
      this.sonuc = -1;
      this.vurguT = 0;
      this.vurguHedef = 0;
      this.listeYaz();
      this.gosterge = this.varsayilanGosterge();
      if (arac === 'cark') sonucGoster(this.gosterge);
    },
    hazirYukle(i) {
      const h = HAZIR[i];
      if (!h || this.donus) return;
      this.ad = h.ad;
      this.secenekler = h.liste.slice();
      this.sonuc = -1;
      this.vurguT = 0;
      this.vurguHedef = 0;
      this.sonucKapat();
      this.listeYaz();
      this.gosterge = this.varsayilanGosterge();
      if (arac === 'cark') sonucGoster(this.gosterge, true);
    },
    topluAyir(metin) {
      let satirlar = metin.split(/\r?\n/);
      if (satirlar.length === 1 && /[,;]/.test(satirlar[0])) satirlar = satirlar[0].split(/[,;]/);
      return satirlar;
    },
    bagla() {
      const secim = $('#cark-hazir');
      HAZIR.forEach((h, i) => {
        const o = document.createElement('option');
        o.value = String(i);
        o.textContent = h.ad;
        secim.appendChild(o);
      });
      secim.addEventListener('change', () => {
        this.hazirYukle(+secim.value);
        secim.value = '';
      });
      const form = $('#cark-ekle');
      const girdi = $('#cark-girdi');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (this.ekle([girdi.value])) girdi.value = '';
        girdi.focus();
      });
      const toplu = $('#cark-toplu');
      const topluAc = $('#cark-toplu-ac');
      const metin = $('#cark-toplu-metin');
      topluAc.addEventListener('click', () => {
        const ac = toplu.hidden;
        toplu.hidden = !ac;
        topluAc.setAttribute('aria-expanded', ac ? 'true' : 'false');
        if (ac) metin.focus();
      });
      $('#cark-toplu-ekle').addEventListener('click', () => {
        if (this.ekle(this.topluAyir(metin.value))) {
          metin.value = '';
          toplu.hidden = true;
          topluAc.setAttribute('aria-expanded', 'false');
        }
      });
      $('#cark-toplu-degistir').addEventListener('click', () => {
        const liste = this.topluAyir(metin.value).map((m) => this.temizMetin(m)).filter(Boolean);
        if (!liste.length) return;
        this.ad = DIL.kendiCarkin;
        this.secenekler = [];
        this.ekle(liste);
        metin.value = '';
        toplu.hidden = true;
        topluAc.setAttribute('aria-expanded', 'false');
      });
      $('#cark-tamam').addEventListener('click', () => {
        this.vurguHedef = 0;
        this.sonucKapat();
        this.gosterge = Object.assign({}, this.gosterge, { alt: DIL.yenidenCevir });
        sonucGoster(this.gosterge);
        kece.focus({ preventScroll: true });
        iste();
      });
      $('#cark-cikar').addEventListener('click', () => {
        const ad = this.secenekler[this.sonuc];
        if (this.sonuc >= 0) this.secenekler.splice(this.sonuc, 1);
        this.sonuc = -1;
        this.vurguT = 0;
        this.vurguHedef = 0;
        this.sonucKapat();
        this.listeYaz();
        const n = this.secenekler.length;
        this.gosterge = {
          buyuk: ad ? DIL.cikti(ad) : this.ad,
          alt: n >= 2 ? DIL.kaldi(n) : n === 1 ? DIL.yalnizKaldi(this.secenekler[0]) : DIL.carkBos,
          bekliyor: true,
        };
        sonucGoster(this.gosterge, true);
        kece.focus({ preventScroll: true });
      });
      this.listeYaz();
    },

    ciz(t, ctx) {
      let devam = false;
      const dt = this.sonT ? Math.min(0.05, Math.max(0.001, (t - this.sonT) / 1000)) : 0.016;
      this.sonT = t;
      const n = this.secenekler.length;
      if (this.donus && n) {
        const d = this.donus;
        const u = kisit((t - d.bas) / d.sure, 0, 1);
        const yeni = d.aci0 + d.delta * (1 - Math.pow(1 - u, 3.2));
        const s = TAM / n;
        const kat = Math.floor(yeni / s);
        const w = (yeni - this.aci) / dt;
        if (kat !== this.sonKat) {
          this.sonKat = kat;
          this.igne = Math.max(this.igne, Math.min(0.46, 0.14 + Math.abs(w) * 0.012));
          this.igneHiz = Math.max(0, this.igneHiz);
          const simdi = performance.now();
          if (simdi - this.sonTik > 28) {
            this.sonTik = simdi;
            S().cal('tik', { ses: kisit(0.62 - Math.abs(w) * 0.016, 0.2, 0.62), hiz: arasi(0.95, 1.08) });
          }
        }
        this.aci = yeni;
        devam = true;
      }
      // ibre: sönümlü yay
      this.igneHiz += (-320 * this.igne - 17 * this.igneHiz) * dt;
      this.igne += this.igneHiz * dt;
      if (Math.abs(this.igne) > 0.0015 || Math.abs(this.igneHiz) > 0.02) devam = true;
      else { this.igne = 0; this.igneHiz = 0; }
      // kazanan dilimin altın vurgusu
      if (this.vurguT !== this.vurguHedef) {
        const adim = dt / 0.35;
        this.vurguT = this.vurguHedef > this.vurguT
          ? Math.min(this.vurguHedef, this.vurguT + adim)
          : Math.max(this.vurguHedef, this.vurguT - adim);
        devam = true;
      }
      const g = this.geo();
      C.ciz(ctx, {
        onbellek: this.onbellek,
        cx: g.cx, cy: g.cy, r: g.r,
        secenekler: n ? this.secenekler : [''],
        aci: this.aci,
        yaziAci: this.donus ? this.donus.aci0 + this.donus.delta : this.aci,
        vurgu: this.sonuc,
        vurguT: this.vurguT,
        igne: this.igne,
        dpr: T.dpr,
      });
      return devam;
    },
  };

  /* ============================================================ PARMAK SEÇİCİ */
  // Parmaklar konuldukları sırayla harf alır (A, B, C…); halkalar mürekkep, seçilen
  // kırmızı mühürle basılır. Takımlar: mürekkep, kırmızı, çelik grisi, kâğıt.
  const HARFLER = 'ABCDEFGHIJ'.split('');
  const TAKIM = [
    { dolgu: '#111111', yazi: '#ffffff' },
    { dolgu: '#E0402A', yazi: '#ffffff' },
    { dolgu: '#6E7380', yazi: '#ffffff' },
    { dolgu: '#ffffff', yazi: '#111111' },
  ];
  const EN_COK_KISI = 4;
  const EN_COK_TAKIM = 4;
  const EN_COK_PARMAK = 10;
  const KIP_ADI = DIL.kip;
  const SAYIM = 1100;
  const SERIF = '"Shippori Mincho", Georgia, serif';

  function yuvarlakDortgen(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }
  // "Seçildi" mührü: kırmızı zemin, beyaz ince iç çerçeve, beyaz Mincho
  function muhurHap(ctx, x, y, metin, R, dpr) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.06);
    ctx.font = `700 ${Math.round(R * 0.36)}px ${SERIF}`;
    const w = ctx.measureText(metin).width + R * 0.62;
    const h = R * 0.62;
    ctx.shadowColor = 'rgba(191,50,24,0.3)';
    ctx.shadowBlur = 8 * dpr;
    ctx.shadowOffsetY = 2 * dpr;
    yuvarlakDortgen(ctx, -w / 2, -h / 2, w, h, R * 0.08);
    ctx.fillStyle = '#E0402A';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    yuvarlakDortgen(ctx, -w / 2 + 3.5, -h / 2 + 3.5, w - 7, h - 7, R * 0.05);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(metin, 0, h * 0.04);
    ctx.restore();
  }
  function ve(liste) {
    if (liste.length < 2) return liste.join('');
    return liste.slice(0, -1).join(', ') + DIL.ve + liste[liste.length - 1];
  }

  const parmak = {
    harita: new Map(),
    mod: 'sec',
    kisi: 1,
    takim: 2,
    asama: 'bekle',
    degisim: 0,
    sayimBas: 0,
    sonucBas: 0,
    sayac: 0,
    bosZamanlayici: 0,
    zamanlayicilar: [],
    gosterge: null,

    // uygulamadaki kural: Seç'te seçilecek sayıdan bir fazla, Takım'da takım sayısı kadar, Sıra'da iki parmak
    gerekli() { return this.mod === 'sec' ? this.kisi + 1 : this.mod === 'takim' ? this.takim : 2; },
    varsayilanGosterge() {
      return {
        buyuk: this.mod === 'sira' ? DIL.siraKimde : this.mod === 'takim' ? DIL.takimlar : DIL.kimSecilecek,
        alt: dokunmatik ? DIL.herkesParmak : DIL.tiklaEkle,
        bekliyor: true,
      };
    },
    R() { return kisit(Math.min(T.en, T.boy) * 0.085, 26, 46); },
    fareVar() {
      for (const p of this.harita.values()) if (p.fare) return true;
      return false;
    },
    harfAl() {
      const kullanilan = new Set(Array.from(this.harita.values(), (p) => p.harf));
      return HARFLER.find((h) => !kullanilan.has(h)) || '?';
    },
    etkin() {
      if (!this.gosterge) this.gosterge = this.varsayilanGosterge();
      sonucGoster(this.gosterge);
      ipucuAyarla(dokunmatik ? DIL.herkesParmak : DIL.tiklaParmak, this.harita.size === 0);
    },
    pasif() {
      if (this.harita.size) this.sifirla(true);
    },
    boyut() {},
    uyar(metin) {
      this.gosterge = Object.assign({}, this.gosterge || this.varsayilanGosterge(), { alt: metin, bekliyor: true });
      if (arac === 'parmak') sonucGoster(this.gosterge);
    },
    ekle(id, x, y, fare) {
      if (!T.en) return;
      if (this.harita.size >= EN_COK_PARMAK) {
        this.uyar(DIL.enCokParmak(EN_COK_PARMAK));
        return;
      }
      clearTimeout(this.bosZamanlayici);
      if (this.asama === 'sonuc') this.sifirla(false);
      this.harita.set(id, {
        id, fare, harf: this.harfAl(), dogus: performance.now(),
        x: x / T.en, y: y / T.boy, ax: x, ay: y,
        secildi: false, takim: -1, sira: 0,
      });
      S().cal('tik', { ses: 0.35, hiz: arasi(1.15, 1.3) });
      this.degisti();
    },
    cikar(id) {
      const p = this.harita.get(id);
      if (!p) return;
      this.harita.delete(id);
      if (this.asama === 'sonuc') {
        if (p.fare) {
          this.sifirla(false);
        } else if (!this.harita.size) {
          clearTimeout(this.bosZamanlayici);
          this.bosZamanlayici = setTimeout(() => {
            if (!this.harita.size) this.sifirla(true);
          }, 1400);
        }
        iste();
        return;
      }
      this.degisti();
    },
    tasi(id, x, y) {
      const p = this.harita.get(id);
      if (!p) return;
      p.x = x / T.en;
      p.y = y / T.boy;
      // küçük titremeler seçimi bozmasın
      if (Math.hypot(x - p.ax, y - p.ay) > 14 && this.asama !== 'sonuc') {
        p.ax = x;
        p.ay = y;
        this.degisti();
      }
      iste();
    },
    bul(x, y) {
      const R = this.R();
      let en = null, enD = Infinity;
      for (const p of this.harita.values()) {
        const d = Math.hypot(p.x * T.en - x, p.y * T.boy - y);
        if (d < R * 1.15 && d < enD) { en = p; enD = d; }
      }
      return en;
    },
    rastgeleEkle() {
      if (!T.en) return;
      const R = this.R();
      let x = T.en / 2, y = T.boy / 2;
      for (let d = 0; d < 200; d++) {
        const px = arasi(R * 1.6, T.en - R * 1.6), py = arasi(R * 1.9, T.boy - R * 1.6 - 40);
        let uygun = true;
        for (const p of this.harita.values()) {
          if (Math.hypot(p.x * T.en - px, p.y * T.boy - py) < R * 3) { uygun = false; break; }
        }
        x = px; y = py;
        if (uygun) break;
      }
      this.ekle('f' + ++this.sayac, x, y, true);
    },
    // Durum geçişleri çizim döngüsüne değil zamanlayıcılara bağlı: sekme arka plana
    // geçse ya da çizim dursa bile seçim zamanında yapılır.
    zamanla(fn, ms) { this.zamanlayicilar.push(setTimeout(fn, ms)); },
    zamanlayicilariTemizle() {
      this.zamanlayicilar.forEach(clearTimeout);
      this.zamanlayicilar = [];
    },
    planla() {
      this.zamanlayicilariTemizle();
      if (this.asama === 'sonuc') return;
      this.asama = 'bekle';
      if (this.harita.size < this.gerekli()) return;
      this.zamanla(() => this.sayimBaslat(), this.fareVar() ? 1600 : 1000);
    },
    sayimBaslat() {
      if (this.asama !== 'bekle' || this.harita.size < this.gerekli()) return;
      this.asama = 'sayim';
      this.sayimBas = performance.now();
      for (let k = 0; k < 3; k++) {
        this.zamanla(() => S().cal('tik', { ses: 0.45, hiz: 0.9 + k * 0.08 }), (SAYIM / 3) * k);
      }
      this.zamanla(() => this.sec(performance.now()), SAYIM);
      if (arac === 'parmak') sonucAlt.textContent = DIL.seciliyor;
      iste();
    },
    degisti() {
      this.degisim = performance.now();
      if (this.asama === 'sayim') this.asama = 'bekle';
      if (arac === 'parmak') ipucuAyarla(null, this.harita.size === 0);
      if (this.asama === 'bekle' && this.harita.size) {
        const g = this.gerekli();
        this.gosterge = {
          buyuk: DIL.parmak(this.harita.size),
          alt: this.harita.size < g ? DIL.enAzParmak(g) : DIL.kipirdama,
          bekliyor: true,
        };
        if (arac === 'parmak') sonucGoster(this.gosterge);
      }
      this.planla();
      iste();
    },
    sifirla(tamamen) {
      clearTimeout(this.bosZamanlayici);
      this.zamanlayicilariTemizle();
      if (tamamen) this.harita.clear();
      for (const p of this.harita.values()) {
        p.secildi = false;
        p.takim = -1;
        p.sira = 0;
      }
      this.asama = 'bekle';
      this.degisim = performance.now();
      if (tamamen || !this.harita.size) {
        this.gosterge = this.varsayilanGosterge();
        if (arac === 'parmak') {
          sonucGoster(this.gosterge);
          ipucuAyarla(null, true);
        }
      } else {
        this.degisti();
      }
      iste();
    },
    sec(t) {
      this.zamanlayicilariTemizle();
      const liste = karistir(Array.from(this.harita.values()));
      const n = liste.length;
      if (n < this.gerekli()) {
        this.uyar(DIL.enAzParmak(this.gerekli()));
        return;
      }
      liste.forEach((p) => { p.secildi = false; p.takim = -1; p.sira = 0; });
      let buyuk, alt, kisa, detay;
      if (this.mod === 'sec') {
        const secilen = liste.slice(0, this.kisi);
        secilen.forEach((p) => { p.secildi = true; });
        buyuk = ve(secilen.map((p) => p.harf).sort());
        alt = (secilen.length === 1 ? DIL.secildi : DIL.secildiler) + ' · ' + DIL.parmak(n);
        kisa = buyuk;
        detay = DIL.parmak(n);
      } else if (this.mod === 'takim') {
        const tk = this.takim;
        liste.forEach((p, i) => { p.takim = i % tk; });
        const gruplar = [];
        for (let i = 0; i < tk; i++) {
          gruplar.push(`${i + 1}: ${liste.filter((p) => p.takim === i).map((p) => p.harf).sort().join(', ')}`);
        }
        buyuk = DIL.takim(tk);
        alt = gruplar.join(' · ');
        kisa = buyuk;
        detay = alt;
      } else {
        liste.forEach((p, i) => { p.sira = i + 1; });
        buyuk = DIL.siraBelli;
        alt = liste.map((p) => `${p.sira}. ${p.harf}`).join(' · ');
        kisa = '1. ' + liste[0].harf;
        detay = alt;
      }
      this.asama = 'sonuc';
      this.sonucBas = t;
      S().cal('secim', { ses: 0.9 });
      this.gosterge = { buyuk, alt, bekliyor: false };
      if (arac === 'parmak') sonucGoster(this.gosterge, true);
      Defter.ekle({ arac: 'parmak', baslik: DIL.parmakArac + ' · ' + KIP_ADI[this.mod], sonuc: kisa, detay });
      iste();
    },
    simdiSec() {
      if (this.harita.size < this.gerekli()) {
        this.uyar(DIL.enAzParmak(this.gerekli()));
        return;
      }
      this.sec(performance.now());
    },
    sayacYaz() {
      $('#parmak-sayac-kutu').hidden = this.mod === 'sira';
      const takimda = this.mod === 'takim';
      const [eksi, arti] = $$('[data-sayac="parmak"] button', kok);
      $('#parmak-sayi').textContent = takimda ? this.takim : this.kisi;
      $('#parmak-sayi-ad').textContent = takimda ? DIL.takimAd : DIL.secilecek;
      eksi.disabled = takimda ? this.takim <= 2 : this.kisi <= 1;
      arti.disabled = takimda ? this.takim >= EN_COK_TAKIM : this.kisi >= EN_COK_KISI;
      eksi.setAttribute('aria-label', takimda ? DIL.takimAzalt : DIL.kisiAzalt);
      arti.setAttribute('aria-label', takimda ? DIL.takimArtir : DIL.kisiArtir);
    },
    ayarDegisti() {
      this.sayacYaz();
      if (this.asama === 'sonuc' || this.asama === 'sayim') this.sifirla(false);
      else if (this.harita.size) this.degisti();
      else {
        this.gosterge = this.varsayilanGosterge();
        if (arac === 'parmak') sonucGoster(this.gosterge);
      }
    },
    bagla() {
      radyoGrubu($('[data-parmak-modlari]', kok), (b) => {
        this.mod = b.dataset.mod;
        this.ayarDegisti();
      });
      const [eksi, arti] = $$('[data-sayac="parmak"] button', kok);
      const degistir = (d) => () => {
        if (this.mod === 'takim') this.takim = kisit(this.takim + d, 2, EN_COK_TAKIM);
        else this.kisi = kisit(this.kisi + d, 1, EN_COK_KISI);
        this.ayarDegisti();
      };
      eksi.addEventListener('click', degistir(-1));
      arti.addEventListener('click', degistir(1));
      this.sayacYaz();
      $('#parmak-ekle').addEventListener('click', () => this.rastgeleEkle());
      $('#parmak-sec').addEventListener('click', () => this.simdiSec());
      $('#parmak-temizle').addEventListener('click', () => this.sifirla(true));
      const tam = $('#parmak-tam');
      if (!dokunmatik) tam.hidden = true;
      else $('#parmak-ekle').hidden = true;
      tam.addEventListener('click', tamEkranAc);
      $('#parmak-yonerge').textContent = dokunmatik ? DIL.yonergeDokun : DIL.yonergeFare;
    },
    ciz(t, ctx) {
      const d = T.dpr;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      const R = this.R();
      const az = hareketAz.matches;
      const sonucS = this.asama === 'sonuc' ? kisit((t - this.sonucBas) / 450, 0, 1) : 0;
      const tekli = this.mod === 'sec';
      for (const p of this.harita.values()) {
        const x = p.x * T.en, y = p.y * T.boy;
        const yas = (t - p.dogus) / 1000;
        let olcek = 0.55 + 0.45 * geriYay(kisit(yas / 0.3, 0, 1));
        if (!az) olcek *= 1 + 0.03 * Math.sin(yas * 4.2 + (p.dogus % 7));
        let alfa = 1;
        let dolgu = '#ffffff', yazi = '#111111', hat = '#111111';
        const takimli = this.asama === 'sonuc' && p.takim >= 0;
        if (takimli) {
          dolgu = TAKIM[p.takim].dolgu;
          yazi = TAKIM[p.takim].yazi;
        }
        if (this.asama === 'sonuc' && tekli) {
          if (p.secildi) {
            olcek *= 1 + 0.22 * geriYay(sonucS);
            if (sonucS > 0.15) { dolgu = '#E0402A'; yazi = '#ffffff'; hat = '#BF3218'; }
          } else { alfa = 1 - 0.7 * sonucS; olcek *= 1 - 0.1 * sonucS; }
        }
        const rr = R * olcek;
        ctx.save();
        ctx.globalAlpha = alfa;
        // dokunuş halesi
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(17,17,17,0.16)';
        ctx.beginPath();
        ctx.arc(x, y, rr + R * 0.32, 0, TAM);
        ctx.stroke();
        // halka
        ctx.shadowColor = 'rgba(17,17,26,0.14)';
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
        // harf
        ctx.fillStyle = yazi;
        ctx.font = `700 ${Math.round(rr * 0.78)}px ${SERIF}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.harf, x, y + rr * 0.05);
        ctx.restore();

        if (this.asama === 'sayim') {
          const s = kisit((t - this.sayimBas) / SAYIM, 0, 1);
          ctx.save();
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#E0402A';
          ctx.beginPath();
          ctx.arc(x, y, rr + R * 0.46, -Math.PI / 2, -Math.PI / 2 + TAM * s);
          ctx.stroke();
          ctx.restore();
        }
        if (this.asama === 'sonuc' && tekli && p.secildi) {
          ctx.save();
          for (let k = 0; k < 2; k++) {
            const f = az ? 0.45 : (((t - this.sonucBas) / 1500 + k * 0.5) % 1);
            ctx.globalAlpha = (1 - f) * 0.55 * sonucS;
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#E0402A';
            ctx.beginPath();
            ctx.arc(x, y, rr * (1.25 + f * 0.9), 0, TAM);
            ctx.stroke();
          }
          ctx.restore();
          const ustte = y - rr - R * 0.8 > 14;
          ctx.save();
          ctx.globalAlpha = sonucS;
          muhurHap(ctx, x, ustte ? y - rr - R * 0.72 : y + rr + R * 0.72, DIL.secildi, R, d);
          ctx.restore();
        }
        if (this.asama === 'sonuc' && (takimli || p.sira)) {
          const bx = x + rr * 0.8, by = y - rr * 0.8, br = R * 0.4;
          ctx.save();
          ctx.globalAlpha = sonucS;
          ctx.shadowColor = 'rgba(17,17,26,0.25)';
          ctx.shadowBlur = 6 * d;
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, TAM);
          ctx.fillStyle = takimli ? '#ffffff' : '#E0402A';
          ctx.fill();
          ctx.shadowColor = 'transparent';
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = takimli ? '#111111' : '#BF3218';
          ctx.stroke();
          ctx.fillStyle = takimli ? '#111111' : '#ffffff';
          ctx.font = `700 ${Math.round(br * 1.1)}px ${SERIF}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(takimli ? String(p.takim + 1) : String(p.sira), bx, by + br * 0.06);
          ctx.restore();
        }
      }
      return this.harita.size > 0;
    },
  };

  /* ------------------------------------------------------------ parmak işaretçileri */
  function konum(e) {
    const r = kece.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  kece.addEventListener('pointerdown', (e) => {
    if (arac !== 'parmak') return;
    const { x, y } = konum(e);
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      e.preventDefault();
      try { kece.setPointerCapture(e.pointerId); } catch (_) { /* yok say */ }
      parmak.ekle('p' + e.pointerId, x, y, false);
    } else if (e.button === 0) {
      const var_ = parmak.bul(x, y);
      if (var_ && var_.fare) parmak.cikar(var_.id);
      else parmak.ekle('f' + ++parmak.sayac, x, y, true);
    }
  });
  kece.addEventListener('pointermove', (e) => {
    if (arac !== 'parmak' || e.pointerType === 'mouse') return;
    const { x, y } = konum(e);
    parmak.tasi('p' + e.pointerId, x, y);
  });
  const birak = (e) => {
    if (arac !== 'parmak' || e.pointerType === 'mouse') return;
    parmak.cikar('p' + e.pointerId);
  };
  kece.addEventListener('pointerup', birak);
  kece.addEventListener('pointercancel', birak);
  kece.addEventListener('contextmenu', (e) => {
    if (arac === 'parmak') e.preventDefault();
  });

  /* ------------------------------------------------------------ tam ekran (parmak seçici) */
  let yerTutucu = null;
  function tamEkranAc() {
    if (kece.classList.contains('tam-ekran')) return;
    parmak.sifirla(true);
    yerTutucu = document.createElement('div');
    yerTutucu.style.height = kece.offsetHeight + 'px';
    kece.parentNode.insertBefore(yerTutucu, kece);
    document.body.appendChild(kece);
    kece.classList.add('tam-ekran');
    kapatDugme.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    kece.focus({ preventScroll: true });
    boyutla();
  }
  function tamEkranKapat() {
    if (!kece.classList.contains('tam-ekran')) return;
    parmak.sifirla(true);
    kece.classList.remove('tam-ekran');
    if (yerTutucu && yerTutucu.parentNode) {
      yerTutucu.parentNode.insertBefore(kece, yerTutucu);
      yerTutucu.remove();
    }
    yerTutucu = null;
    kapatDugme.hidden = true;
    document.documentElement.style.overflow = '';
    const t = $('#parmak-tam');
    if (t && !t.hidden) t.focus({ preventScroll: true });
    boyutla();
  }
  kapatDugme.addEventListener('pointerdown', (e) => e.stopPropagation());
  kapatDugme.addEventListener('click', (e) => {
    e.stopPropagation();
    tamEkranKapat();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') tamEkranKapat();
  });

  /* ------------------------------------------------------------ araçlar ve sekmeler */
  const ARAC = { zar, para, cark, parmak };
  const sekmeler = $$('.sekme', kok);
  const paneller = $$('.panel', kok);
  const KECE_ETIKET = {
    zar: DIL.keceZar,
    para: DIL.kecePara,
    cark: DIL.keceCark,
    parmak: dokunmatik ? DIL.keceParmakDokun : DIL.keceParmakFare,
  };

  function aracSec(yeni, odakla) {
    if (!ARAC[yeni]) return;
    if (yeni !== arac) {
      if (arac === 'parmak') tamEkranKapat();
      const eski = ARAC[arac];
      if (eski.pasif) eski.pasif();
    }
    arac = yeni;
    kok.dataset.arac = yeni;
    sekmeler.forEach((b) => {
      const s = b.dataset.sekme === yeni;
      b.setAttribute('aria-selected', s ? 'true' : 'false');
      b.tabIndex = s ? 0 : -1;
      if (s && odakla) b.focus();
    });
    govde.setAttribute('aria-labelledby', 'sekme-' + yeni);
    paneller.forEach((p) => { p.hidden = p.dataset.panel !== yeni; });
    kece.setAttribute('aria-label', KECE_ETIKET[yeni]);
    kece.style.touchAction = yeni === 'parmak' ? 'none' : '';
    ARAC[yeni].etkin();
    iste();
  }

  sekmeler.forEach((b, i) => {
    b.addEventListener('click', () => aracSec(b.dataset.sekme));
    b.addEventListener('keydown', (e) => {
      let j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % sekmeler.length;
      else if (e.key === 'ArrowLeft') j = (i - 1 + sekmeler.length) % sekmeler.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = sekmeler.length - 1;
      if (j !== null) {
        e.preventDefault();
        aracSec(sekmeler[j].dataset.sekme, true);
      }
    });
  });

  kece.addEventListener('click', () => {
    if (arac === 'parmak') return;
    ARAC[arac].dokun();
  });
  kece.addEventListener('keydown', (e) => {
    if (e.target !== kece) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      if (arac === 'parmak') parmak.rastgeleEkle();
      else ARAC[arac].dokun();
    }
  });

  // Sayfadaki "masada dene" bağlantıları ilgili aracı açar (kaydırmayı bağlantı yapar)
  $$('[data-arac-ac]').forEach((a) => {
    a.addEventListener('click', () => aracSec(a.dataset.aracAc));
  });

  /* ------------------------------------------------------------ başlat */
  zar.bagla();
  para.bagla();
  cark.bagla();
  parmak.bagla();

  if ('ResizeObserver' in window) new ResizeObserver(boyutla).observe(kece);
  else window.addEventListener('resize', boyutla);
  boyutla();

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((girdiler) => {
      gorunur = girdiler[0].isIntersecting;
      if (gorunur) {
        iste();
        if (S().hazirla) S().hazirla();
      }
    }, { rootMargin: '200px 0px' }).observe(kok);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) iste(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => iste());
  if (document.fonts && document.fonts.load) {
    document.fonts.load('700 40px "Shippori Mincho"').then(() => iste()).catch(() => {});
  }

  aracSec('zar');

  window.DecidoraMasa = { ac: (a) => aracSec(a), aksam: (k) => Defter.aksam(k) };
  // bölüm yüklenmeden önce sahnelerde çıkan akşam kararları sırada bekliyordu
  (window.__aksamSirasi || []).forEach((k) => Defter.aksam(k));
})();
