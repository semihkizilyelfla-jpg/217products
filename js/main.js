/* 217 Products — maximalist theme interactions
   Stack: Lenis (smooth scroll) + GSAP ScrollTrigger (CDN, guarded) */

(function () {
  "use strict";

  /* ---------- i18n ---------- */
  var TR = {
    nav_work: "İŞLER",
    nav_studio: "STÜDYO",
    nav_contact: "İLETİŞİM",
    mq1: "217 PRODUCTS ★ KÜÇÜK KESKİN ARAÇLAR ★ SIFIR DOLGU ★ ÖNCE YAYINLA, SONRA KESKİNLEŞTİR ★ ",
    mq2: "BAĞIMSIZ ANDROID STÜDYOSU ✦ HER UYGULAMA TEK İŞ ✦ NE DİYORSA ONU YAPAR ✦ ",
    hero_sub: "MOBİL UYGULAMA STÜDYOSU",
    st1: "YENİ ÇIKTI: OSNOTE",
    st2: "TEK İŞ YAPAR",
    tag_idea: "FİKİR",
    tag_work: "SEÇİLMİŞ İŞLER",
    tag_build: "NASIL ÜRETİYORUZ",
    tag_touch: "İLETİŞİME GEÇ",
    mani_note: "Hiçbir uygulamayı büyük görünsün diye şişirmiyoruz. Açarsın, işini görür, kapatırsın. Anlaşma bu.",
    p1_desc: "Hangi uygulamada olursan ol, ekranın üstüne çizdiriyor. Videoda bir yeri daire içine al, PDF'in üstünü karala, görüntüyü kaydet, bitti.",
    p1_status: "GOOGLE PLAY'DE YAYINDA",
    p1_link: "SİTEYE GİT ↗",
    p2_name: "SIRADAKİ ÜRÜN",
    p2_desc: "İkinci uygulama şu an tezgâhta. Göstermeye değer hâle gelmeden göstermeyeceğiz.",
    p2_status: "GELİŞTİRME AŞAMASINDA",
    pr1_d: "Bir uygulamayı tek cümleyle anlatamıyorsak yayınlamayız. İkiye böler, öyle yayınlarız.",
    pr2_d: "Küçük indirme, göz açıp kapayana kadar açılış, gözünün önünde duran fiyat. Mağaza sayfası neyse alacağın da o.",
    pr3_d: "Bugün iyi bir uygulama çıkarmayı, seneye 'mükemmel' çıkarmaya tercih ederiz. Yorum gelir, güncelleme gider.",
    ft_play: "TÜM UYGULAMALAR GOOGLE PLAY'DE",
    ft_note: "© 2026 217 PRODUCTS. TÜM HAKLARI SAKLIDIR."
  };
  /* keys whose value carries fixed inline markup (mark/em) — values are ours, never user input */
  var TR_HTML = {
    mani: "Tek dertli bir stüdyoyuz: <mark>küçük, keskin</mark> uygulamalar. Birini adam gibi bitirir, yayınlar, <mark>sıradakine geçeriz.</mark>",
    pr1_t: "Her uygulamaya <em>tek iş</em>",
    pr2_t: "Hızlı ve <em>dürüst</em>",
    pr3_t: "Yayınla, sonra <em>geliştir</em>"
  };
  var TR_META = "217 Products bağımsız bir Android stüdyosu. Tek işi iyi yapan küçük, odaklı uygulamalar.";

  var lang = "en";
  try { lang = localStorage.getItem("217lang") || "en"; } catch (e) {}

  if (lang === "tr") {
    document.documentElement.lang = "tr";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (TR[key]) el.textContent = TR[key];
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (TR_HTML[key]) el.innerHTML = TR_HTML[key];
    });
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", TR_META);
  }

  var toggle = document.getElementById("langToggle");
  if (toggle) {
    toggle.textContent = lang === "tr" ? "EN" : "TR";
    toggle.addEventListener("click", function () {
      try { localStorage.setItem("217lang", lang === "tr" ? "en" : "tr"); } catch (e) {}
      location.reload();
    });
  }

  /* ---------- motion ---------- */
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis();
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.2, offset: -90 });
      else target.scrollIntoView({ behavior: "smooth" });
    });
  });

  /* hero entrance */
  gsap.timeline({ defaults: { ease: "power4.out" } })
    .from(".hero h1", { yPercent: 24, autoAlpha: 0, duration: 0.9 })
    .from(".hero-sub", { x: -40, autoAlpha: 0, duration: 0.6 }, "-=0.4")
    .from(".sticker", { scale: 0, rotation: 25, duration: 0.6, ease: "back.out(2)", stagger: 0.12 }, "-=0.3");

  /* scroll reveals (initial state set here so no-JS keeps content visible) */
  gsap.set(".reveal", { y: 44, autoAlpha: 0 });
  ScrollTrigger.batch(".reveal", {
    start: "top 86%",
    once: true,
    onEnter: function (els) {
      gsap.to(els, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.1, ease: "power3.out" });
    }
  });

  /* giant footer wordmark slides up as it enters */
  gsap.from(".giant", {
    yPercent: 40,
    ease: "none",
    scrollTrigger: { trigger: "footer", start: "top bottom", end: "bottom bottom", scrub: true }
  });
})();
