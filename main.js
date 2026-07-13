/* 217 Products — ukiyo-e maximalist edition
   Layered 3D-parallax hero (scroll + mouse), section parallax, an
   infinite marquee, word-by-word scroll-brighten text and a pinned
   self-drawing ensō medallion. Stack: Lenis + GSAP ScrollTrigger. */

(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- mobile nav (hamburger) — runs regardless of GSAP ---------- */
  (function () {
    var t = document.getElementById("navToggle"), n = document.getElementById("navLinks");
    if (!t || !n) return;
    function close() { n.classList.remove("open"); t.classList.remove("is-open"); t.setAttribute("aria-expanded", "false"); }
    t.addEventListener("click", function () {
      var open = n.classList.toggle("open");
      t.classList.toggle("is-open", open);
      t.setAttribute("aria-expanded", open ? "true" : "false");
    });
    [].forEach.call(n.querySelectorAll("a"), function (a) { a.addEventListener("click", close); });
    addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  })();

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

    gsap.set(".head-1", { autoAlpha: 1 });
    gsap.set([".head-2", ".head-3"], { autoAlpha: 0 });
    gsap.timeline({
      defaults: { ease: "power2.out", duration: 1 },
      scrollTrigger: { trigger: ".hero", start: "top top", end: "+=160%", pin: true, scrub: 0.7, anticipatePin: 1 }
    })
      /* scene 2 (sky) + headline 1→2 share the same 0.2–1.2 window */
      .to(".pl-sky",   { autoAlpha: 1, scale: 1 }, 0.2)
      .to(".head-1",   { autoAlpha: 0, duration: 0.6 }, 0.25)
      .to(".head-2",   { autoAlpha: 1, duration: 0.6 }, 0.55)
      /* scene 3 (torii) + headline 2→3 share the same 1.5–2.5 window */
      .to(".pl-torii", { autoAlpha: 1, yPercent: 0 }, 1.5)
      .to(".head-2",   { autoAlpha: 0, duration: 0.6 }, 1.55)
      .to(".head-3",   { autoAlpha: 1, duration: 0.6 }, 1.85);

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

  /* ---------- pinned globe: quick spin + one outward arrow per scroll step ----------
     Sticky globe over a tall track; the track's scroll progress is split into 3 steps.
     Entering each step spins the globe once and reveals the next reach arrow. */
  var hub = document.querySelector(".hub");
  var globeStage = document.querySelector(".globe-stage");
  if (hub && globeStage) {
    hub.classList.add("js-hub");
    function spinGlobe() { if (window.OSGlobe && window.OSGlobe.spin) window.OSGlobe.spin(); }
    function setReach(n) {
      globeStage.classList.toggle("on1", n >= 1);
      globeStage.classList.toggle("on2", n >= 2);
      globeStage.classList.toggle("on3", n >= 3);
    }
    var curStep = -1;
    function toStep(n) {
      if (n === curStep) return;
      var increasing = n > curStep;
      curStep = n; setReach(n);
      if (increasing && n > 0) spinGlobe();
    }
    if (isTouch) {
      /* mobile: no pin — spin once and stagger the arrows in as the section enters */
      ScrollTrigger.create({ trigger: ".hub", start: "top 60%", once: true, onEnter: function () {
        spinGlobe(); setReach(1);
        gsap.delayedCall(0.55, function () { setReach(2); });
        gsap.delayedCall(1.05, function () { setReach(3); });
      }});
    } else {
      /* desktop: pin the globe; each third of the scroll spins it and reveals one arrow */
      ScrollTrigger.create({
        trigger: ".hub", start: "top top", end: "+=260%", pin: ".hub-pin", anticipatePin: 1,
        onUpdate: function (self) { toStep(Math.min(3, Math.floor(self.progress * 3 + 0.0001) + 1)); },
        onLeaveBack: function () { toStep(0); }
      });
    }
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();
