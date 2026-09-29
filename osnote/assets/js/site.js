/* ============================================================
   OSNote tanıtım sitesi · sayfa davranışları
   ------------------------------------------------------------
   Menü, hangi bölümde olduğun, duyuru şeridi, kütüphane (yakalanan
   yazılar ve defter sayfaları, yalnız bu sekmede).
   ============================================================ */
(function () {
  'use strict';
  var OSN = window.OSN || (window.OSN = {});
  var dil = OSN.dil || function (tr) { return tr; };

  /* ---------------------------------------------------------- küçük işler */
  var yil = document.querySelector('[data-yil]');
  if (yil) yil.textContent = String(new Date().getFullYear());

  function iki(n) { return (n < 10 ? '0' : '') + n; }
  // uygulamadaki kayıt adı: "Yazı yyyy-MM-dd HH:mm" (İngilizcede "Note …", "Screen …")
  OSN.tarih = function (z) {
    return z.getFullYear() + '-' + iki(z.getMonth() + 1) + '-' + iki(z.getDate()) + ' ' + iki(z.getHours()) + ':' + iki(z.getMinutes());
  };

  /* ---------------------------------------------------------- duyuru şeridi */
  var duyuru = document.getElementById('duyuru');
  var duyuruZaman = 0;
  OSN.duyur = function (metin, bag, bagMetni) {
    if (!duyuru) return;
    clearTimeout(duyuruZaman);
    duyuru.textContent = '';
    var s = document.createElement('span');
    s.textContent = metin;
    duyuru.appendChild(s);
    if (bag) {
      var a = document.createElement('a');
      a.href = bag;
      a.textContent = bagMetni || dil('Git', 'Go');
      duyuru.appendChild(a);
    }
    duyuru.classList.add('acik');
    duyuruZaman = setTimeout(function () { duyuru.classList.remove('acik'); }, bag ? 6500 : 4200);
  };
  if (duyuru) {
    duyuru.addEventListener('click', function (e) {
      if (e.target.closest('a')) duyuru.classList.remove('acik');
    });
  }

  /* ---------------------------------------------------------- kütüphane
     Uygulamanın kütüphanesinin sayfadaki karşılığı: "Sayfa ve yakala" bölümünde ve
     sayfanın kaleminde yakalananlar burada durur. Bellekte tutulur; sekme kapanınca gider. */
  var sayac = 0;
  OSN.kutuphane = {
    ogeler: [],
    dinleyici: [],
    ekle: function (o) {
      o.id = ++sayac;
      o.zaman = new Date();
      o.ad = (o.tur === 'ekran' ? dil('Ekran ', 'Screen ') : dil('Yazı ', 'Note ')) + OSN.tarih(o.zaman);
      o.url = URL.createObjectURL(o.blob);
      this.ogeler.unshift(o);
      // bellek: en çok 12 yakalama
      while (this.ogeler.length > 12) { var at = this.ogeler.pop(); URL.revokeObjectURL(at.url); }
      this.haber();
      return o;
    },
    sil: function (id) {
      for (var i = 0; i < this.ogeler.length; i++) {
        if (this.ogeler[i].id === id) { URL.revokeObjectURL(this.ogeler[i].url); this.ogeler.splice(i, 1); break; }
      }
      this.haber();
    },
    dinle: function (f) { this.dinleyici.push(f); },
    haber: function () { for (var i = 0; i < this.dinleyici.length; i++) this.dinleyici[i](this.ogeler); }
  };

  /* ---------------------------------------------------------- menü (telefonda) */
  var kapsul = document.getElementById('kapsul');
  var menu = kapsul && kapsul.querySelector('.kapsul__menu');
  function menuKapat() {
    if (!kapsul || !kapsul.classList.contains('kapsul--acik')) return;
    kapsul.classList.remove('kapsul--acik');
    menu.setAttribute('aria-expanded', 'false');
  }
  if (menu) {
    menu.addEventListener('click', function () {
      var acik = kapsul.classList.toggle('kapsul--acik');
      menu.setAttribute('aria-expanded', String(acik));
    });
    kapsul.addEventListener('click', function (e) { if (e.target.closest('.kapsul__baglar a')) menuKapat(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menuKapat(); });
    document.addEventListener('pointerdown', function (e) { if (!kapsul.contains(e.target)) menuKapat(); });
  }

  /* ---------------------------------------------------------- hangi bölümdeyiz */
  var esle = { basa: null, uygulamalar: null, 'el-modu': '#el-modu', cubuk: '#cubuk', sekiller: '#cubuk', sayfa: '#cubuk', defterler: '#defterler', dene: '#dene', gizlilik: null, indir: null };
  var bolumler = [];
  Object.keys(esle).forEach(function (id) { var el = document.getElementById(id); if (el) bolumler.push(el); });
  var kapsulBag = kapsul ? kapsul.querySelectorAll('.kapsul__baglar a') : [];
  function isaretle(id) {
    var k = esle[id] || null;
    for (var i = 0; i < kapsulBag.length; i++) {
      if (kapsulBag[i].getAttribute('href') === k) kapsulBag[i].setAttribute('aria-current', 'true');
      else kapsulBag[i].removeAttribute('aria-current');
    }
  }
  if ('IntersectionObserver' in window && bolumler.length) {
    var gorunen = {};
    var io = new IntersectionObserver(function (girdiler) {
      girdiler.forEach(function (g) { gorunen[g.target.id] = g.isIntersecting ? g.intersectionRect.height : 0; });
      var en = null, enH = 0;
      Object.keys(gorunen).forEach(function (id) { if (gorunen[id] > enH) { enH = gorunen[id]; en = id; } });
      if (en) isaretle(en);
    }, { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });
    bolumler.forEach(function (b) { io.observe(b); });
  }

})();
