/*!
 * Decidora tanıtım sitesi — ses
 * Uygulamanın kendi sesleri (Kenney, CC0). Web Audio ile gecikmesiz çalınır;
 * OGG Vorbis çözemeyen tarayıcılar MP3 kopyasını, dosyadan (file://) açılan
 * sayfa ise <audio> öğesini kullanır. Hiçbir ayar kalıcı olarak saklanmaz.
 */
(function (kok) {
  'use strict';

  const ADLAR = [
    'zar_tek_1', 'zar_tek_2', 'zar_tek_3', 'zar_tek_4',
    'zar_cok_1', 'zar_cok_2', 'zar_cok_3',
    'para_fiske', 'para_dus', 'para_titre',
    'secim', 'tik',
  ];
  const KLASOR = 'assets/ses/';

  let bicim = null;
  let ctx = null;
  let ana = null;
  let acik = true;
  let onYukleme = null;       // ArrayBuffer indirmeleri
  let cozme = null;           // AudioBuffer çözümleri
  const ham = {};             // ad -> ArrayBuffer
  const tampon = {};          // ad -> AudioBuffer
  const yedek = {};           // ad -> HTMLAudioElement[]
  const dinleyiciler = new Set();
  const dosyadan = location.protocol === 'file:';

  function bicimSec() {
    if (bicim) return bicim;
    const a = document.createElement('audio');
    const ogg = a.canPlayType ? a.canPlayType('audio/ogg; codecs="vorbis"') : '';
    bicim = ogg ? 'ogg' : 'mp3';
    return bicim;
  }
  const adres = (ad) => KLASOR + ad + '.' + bicimSec();

  // Dosyaları önceden indir (çözmeden). Kullanıcı etkileşimi gerekmez.
  function hazirla() {
    if (onYukleme) return onYukleme;
    if (dosyadan || !kok.fetch) {
      onYukleme = Promise.resolve();
      return onYukleme;
    }
    onYukleme = Promise.all(ADLAR.map((ad) => fetch(adres(ad))
      .then((y) => (y.ok ? y.arrayBuffer() : Promise.reject(new Error(String(y.status)))))
      .then((v) => { ham[ad] = v; })
      .catch(() => {})));
    return onYukleme;
  }

  function yedekKur(ad) {
    if (yedek[ad]) return;
    yedek[ad] = [0, 1, 2].map(() => {
      const a = new Audio(adres(ad));
      a.preload = 'auto';
      return a;
    });
  }

  // Tarayıcı, sayfaya bir kez gerçekten dokunulmadan (tıklama, dokunup bırakma, tuş)
  // ses bağlamının açılmasına izin vermiyor; erken denemek konsola uyarı yazıyor.
  // Parmak seçicide parmaklar ekrana konup bekletilir ve bu henüz "dokunup bırakma"
  // sayılmaz; o yüzden izin gelene kadar ses sessizce atlanır.
  const izinli = () => !kok.navigator.userActivation || kok.navigator.userActivation.hasBeenActive;

  // İlk kullanıcı etkileşiminde çağrılır: ses bağlamını açar ve dosyaları çözer.
  function baslat() {
    if (!izinli()) return Promise.resolve();
    if (!ctx) {
      const AC = kok.AudioContext || kok.webkitAudioContext;
      if (AC && !dosyadan) {
        try {
          ctx = new AC();
          ana = ctx.createGain();
          ana.gain.value = 0.9;
          ana.connect(ctx.destination);
        } catch (e) {
          ctx = null;
        }
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (!cozme) {
      cozme = hazirla().then(() => Promise.all(ADLAR.map((ad) => {
        if (ctx && ham[ad]) {
          return new Promise((coz) => {
            // eski Safari yalnız geri çağırma biçimini destekler
            ctx.decodeAudioData(ham[ad].slice(0), (b) => { tampon[ad] = b; coz(); }, () => { yedekKur(ad); coz(); });
          });
        }
        yedekKur(ad);
        return null;
      })));
    }
    return cozme;
  }

  function cal(ad, s) {
    s = s || {};
    if (!acik && !s.zorla) return;
    if (!izinli()) return;
    const hazir = baslat();
    const siddet = s.ses == null ? 1 : s.ses;
    const hiz = s.hiz || 1;
    const gecikme = s.gecikme || 0;
    const b = tampon[ad];
    if (ctx && b) {
      const kaynak = ctx.createBufferSource();
      kaynak.buffer = b;
      kaynak.playbackRate.value = hiz;
      const g = ctx.createGain();
      g.gain.value = siddet;
      kaynak.connect(g);
      g.connect(ana);
      kaynak.start(ctx.currentTime + gecikme);
      return;
    }
    const havuz = yedek[ad];
    if (havuz) {
      const a = havuz.find((x) => x.paused || x.ended) || havuz[0];
      const oynat = () => {
        try {
          a.currentTime = 0;
          a.volume = Math.max(0, Math.min(1, siddet));
          a.playbackRate = hiz;
          const p = a.play();
          if (p && p.catch) p.catch(() => {});
        } catch (e) { /* sessizce geç */ }
      };
      if (gecikme) setTimeout(oynat, gecikme * 1000);
      else oynat();
      return;
    }
    // henüz hazır değil: yükleme kısa sürdüyse yine de çal
    const t0 = performance.now();
    hazir.then(() => {
      if (performance.now() - t0 < 450 && (tampon[ad] || yedek[ad])) cal(ad, s);
    });
  }

  function calRastgele(onek, s) {
    const secenek = ADLAR.filter((a) => a.indexOf(onek + '_') === 0);
    if (!secenek.length) return;
    const a = new Uint32Array(1);
    if (kok.crypto && kok.crypto.getRandomValues) kok.crypto.getRandomValues(a);
    else a[0] = Math.floor(Math.random() * 4294967296);
    cal(secenek[a[0] % secenek.length], s);
  }

  function ayarla(yeni) {
    acik = !!yeni;
    if (acik) baslat();
    dinleyiciler.forEach((f) => f(acik));
  }

  /* ---------------------------------------------------------- ses düğmeleri */
  function dugmeleriBagla() {
    const dugmeler = Array.from(document.querySelectorAll('[data-ses-anahtar]'));
    const yansit = (a) => {
      dugmeler.forEach((d) => {
        d.setAttribute('aria-pressed', a ? 'true' : 'false');
        const et = d.querySelector('[data-ses-etiket]');
        if (et) et.textContent = a ? 'Sesi kapat' : 'Sesi aç';
        d.title = a ? 'Sesi kapat' : 'Sesi aç';
      });
    };
    dugmeler.forEach((d) => d.addEventListener('click', () => ayarla(!acik)));
    dinleyiciler.add(yansit);
    yansit(acik);
  }

  // İlk dokunuşta ses bağlamını hazırla (tarayıcılar kullanıcı etkileşimi ister)
  const OLAYLAR = ['pointerdown', 'pointerup', 'keydown', 'touchend', 'click'];
  const ilk = () => {
    if (!izinli()) return;
    baslat();
    OLAYLAR.forEach((o) => kok.removeEventListener(o, ilk, true));
  };
  OLAYLAR.forEach((o) => kok.addEventListener(o, ilk, true));

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dugmeleriBagla);
  else dugmeleriBagla();

  kok.DecidoraSes = {
    cal,
    calRastgele,
    hazirla,
    baslat,
    ac: ayarla,
    acikMi: () => acik,
    dinle: (f) => dinleyiciler.add(f),
  };
})(window);
