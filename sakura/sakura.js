/* 217 Products — ukiyo-e maximalist edition
   Layered 3D-parallax hero (scroll + mouse), section parallax, an
   infinite marquee, word-by-word scroll-brighten text and a pinned
   self-drawing ensō medallion. Stack: Lenis + GSAP ScrollTrigger. */

(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* split brighten paragraphs into words */
  var brightenEls = [].slice.call(document.querySelectorAll("[data-brighten]"));
  brightenEls.forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    words.forEach(function (word, i) {
      var s = document.createElement("span"); s.className = "w"; s.textContent = word;
      el.appendChild(s); if (i < words.length-1) el.appendChild(document.createTextNode(" "));
    });
  });

  if (reduced || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.09 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function settle(el){ el.style.willChange = "auto"; }

  /* flipped decorative images owned by GSAP */
  gsap.set(".pl-branch-r, .final-branch", { scaleX: -1 });

  /* ---------- rise reveals ---------- */
  gsap.set(".rise", { autoAlpha: 0, y: 26 });
  var heroRise = gsap.utils.toArray(".hero .rise");
  gsap.to(heroRise, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.12, ease: "power2.out", delay: 0.15,
    onComplete: function(){ heroRise.forEach(settle); } });
  gsap.utils.toArray(".rise").forEach(function (el) {
    if (el.closest(".hero") || el.closest(".hub")) return;
    gsap.to(el, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true }, onComplete: function(){ settle(el); } });
  });

  /* ---------- word-by-word brighten ---------- */
  var inkColor = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#1E1A16";
  brightenEls.forEach(function (el) {
    gsap.to(el.querySelectorAll(".w"), { color: inkColor, ease: "none", stagger: 1,
      scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 58%", scrub: true } });
  });

  /* ---------- hero: scene 1 loads with the site; sky + torii assemble on scroll ----------
     Scene 1 (the landscape) fades in on load with the copy, so the site never
     opens blank. Scrolling then builds scene 2 (sky) and scene 3 (torii),
     evenly paced. Reduced pin distance keeps the first scroll gentle. */
  var isTouch = matchMedia("(max-width: 820px)").matches;
  gsap.set(".pl-mount", { autoAlpha: 0, yPercent: 8, force3D: true });
  gsap.set(".pl-fore",  { autoAlpha: 0, yPercent: 12, force3D: true });
  gsap.set(".pl-sky",   { autoAlpha: 0, scale: 1.06, force3D: true });
  gsap.set(".pl-torii", { autoAlpha: 0, yPercent: -12, force3D: true });

  if (isTouch) {
    /* mobile/tablet: reveal the whole scene on load, no pin — consistent on every device */
    gsap.to(".pl-mount", { autoAlpha: 1, yPercent: 0, duration: 1.2, ease: "power2.out", delay: 0.12 });
    gsap.to(".pl-fore",  { autoAlpha: 1, yPercent: 0, duration: 1.2, ease: "power2.out", delay: 0.24 });
    gsap.to(".pl-sky",   { autoAlpha: 1, scale: 1,    duration: 1.2, ease: "power2.out", delay: 0.40 });
    gsap.to(".pl-torii", { autoAlpha: 1, yPercent: 0, duration: 1.2, ease: "power2.out", delay: 0.55 });
  } else {
    /* desktop: scene 1 (landscape) on load, then sky + torii assemble on scroll */
    gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.1 })
      .to(".pl-mount", { autoAlpha: 1, yPercent: 0, duration: 1.5 }, 0)
      .to(".pl-fore",  { autoAlpha: 1, yPercent: 0, duration: 1.5 }, 0.12);

    gsap.timeline({
      defaults: { ease: "power2.out", duration: 1 },
      scrollTrigger: { trigger: ".hero", start: "top top", end: "+=150%", pin: true, scrub: 0.7, anticipatePin: 1 }
    })
      .to(".pl-sky",   { autoAlpha: 1, scale: 1 }, 0.2)      /* scene 2 · sky */
      .to(".pl-torii", { autoAlpha: 1, yPercent: 0 }, 1.5);  /* scene 3 · torii */

    /* light mouse parallax (desktop only) */
    if (matchMedia("(pointer: fine)").matches) {
      var setters = gsap.utils.toArray(".hero-scene .pl").map(function (el) {
        var d = parseFloat(el.dataset.depth) || 0.2;
        return { x: gsap.quickTo(el, "x", { duration: 1.0, ease: "power3.out" }),
                 y: gsap.quickTo(el, "y", { duration: 1.0, ease: "power3.out" }), d: d };
      });
      addEventListener("mousemove", function (e) {
        var nx = (e.clientX / innerWidth) * 2 - 1, ny = (e.clientY / innerHeight) * 2 - 1;
        setters.forEach(function (s) { s.x(nx * -15 * s.d); s.y(ny * -9 * s.d); });
      });
    }
  }

  /* recalc pins after big hero layers finish loading (kills layout shift) */
  addEventListener("load", function () { ScrollTrigger.refresh(); });

  /* ---------- section parallax (desktop only) ---------- */
  if (!isTouch) gsap.utils.toArray("[data-parallax]").forEach(function (el) {
    var f = parseFloat(el.dataset.parallax) || 0.12;
    gsap.fromTo(el, { yPercent: -f * 100 }, { yPercent: f * 100, ease: "none",
      scrollTrigger: { trigger: el.closest("section") || el, start: "top bottom", end: "bottom top", scrub: true } });
  });

  /* ---------- marquee ---------- */
  var marq = document.getElementById("marqRow");
  if (marq) gsap.to(marq, { xPercent: -50, duration: 26, ease: "none", repeat: -1 });

  /* ---------- pinned medallion ---------- */
  var enso = document.querySelector(".enso-path");
  var ribbons = gsap.utils.toArray(".ribbon");
  if (enso) { var el0 = enso.getTotalLength(); enso.style.strokeDasharray = el0; enso.style.strokeDashoffset = el0; }
  ribbons.forEach(function (p) { var len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len; });
  gsap.set(".hub-core", { xPercent: -50, yPercent: -50, scale: 0.72, autoAlpha: 0.3 });
  gsap.set(".hub-seal", { autoAlpha: 0, scale: 0.6 });
  gsap.set(".hub-caption", { autoAlpha: 0, y: 26 });

  function buildHub(tl) {
    return tl
      .to(enso, { strokeDashoffset: 0, ease: "power1.inOut" }, 0)
      .to(".hub-core", { scale: 1, autoAlpha: 1, ease: "power2.out" }, 0.4)
      .to(ribbons, { strokeDashoffset: 0, stagger: 0.12, ease: "power1.inOut" }, 0.72)
      .to(".hub-seal", { autoAlpha: 1, scale: 1, stagger: 0.14, ease: "back.out(1.5)" }, 1.02)
      .to(".hub-caption", { autoAlpha: 1, y: 0, ease: "power2.out" }, 1.42);
  }
  if (isTouch) {
    /* mobile: draw the medallion once as it enters — no pin */
    ScrollTrigger.create({ trigger: ".hub", start: "top 68%", once: true, onEnter: function () {
      buildHub(gsap.timeline({ defaults: { duration: 0.7 } }));
    }});
  } else {
    buildHub(gsap.timeline({
      defaults: { duration: 0.5 },
      scrollTrigger: { trigger: ".hub", start: "top top", end: "+=170%", pin: ".hub-pin", scrub: 0.6, anticipatePin: 1 }
    }));
  }

  gsap.to(".seal-osnote", { y: 10, duration: 3.4, repeat: -1, yoyo: true, ease: "sine.inOut" });
  gsap.to(".seal-next", { y: -10, duration: 3.8, repeat: -1, yoyo: true, ease: "sine.inOut" });
  gsap.to(".seal-idea", { y: 8, duration: 4.2, repeat: -1, yoyo: true, ease: "sine.inOut" });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();
