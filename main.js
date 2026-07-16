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

  /* No animation path (reduced-motion or GSAP unavailable): reveal any entrance
     elements the CSS hid up front, so content is never stuck invisible. */
  if (reduced || !window.gsap || !window.ScrollTrigger) {
    [].forEach.call(document.querySelectorAll(".rise"), function (el) {
      el.style.opacity = "1"; el.style.transform = "none";
    });
    /* no scroll-assembly available → make sure sky + torii show too */
    [].forEach.call(document.querySelectorAll(".pl-sky, .pl-torii"), function (el) {
      el.style.opacity = "1";
    });
    /* word-brighten scrub won't run → give the words full ink */
    [].forEach.call(document.querySelectorAll(".brighten .w"), function (el) {
      el.style.color = "var(--ink)";
    });
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.12 }); /* tighter, more responsive glide */
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* in-page anchors glide with Lenis instead of teleporting */
  [].forEach.call(document.querySelectorAll('a[href^="#"]'), function (a) {
    a.addEventListener("click", function (e) {
      var target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.35, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
      else target.scrollIntoView({ behavior: "smooth" });
    });
  });
  function settle(el){ el.style.willChange = "auto"; }

  /* flipped decorative images owned by GSAP */
  gsap.set(".pl-branch-r, .final-branch", { scaleX: -1 });

  /* ---------- rise reveals ----------
     The hero entrance is pure CSS (it starts with the first paint, before any
     CDN script arrives) — GSAP only drives the below-fold, scroll-gated reveals. */
  var belowRise = gsap.utils.toArray(".rise").filter(function (el) { return !el.closest(".hero"); });
  gsap.set(belowRise, { autoAlpha: 0, y: 26 });
  belowRise.forEach(function (el) {
    gsap.to(el, { autoAlpha: 1, y: 0, duration: 1.2, ease: "power3.out",
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
  /* Scene 1 (mountains + foreground) is painted from the first frame via CSS and is
     never hidden — the hero opens as a finished image, with no half-loaded
     "assembling" flash. Sky + torii start hidden on desktop (gated in CSS, so they
     never flash in either) and materialise on scroll. On touch there is no pin, so
     all four layers simply show. */
  if (!isTouch) {
    /* desktop: give sky + torii their pre-assembly transform (opacity:0 comes from
       CSS); the pinned timeline below fades and settles them on scroll.
       Short, nimble pin (+=100%): sky settles first, then the torii lands as the
       headline hands over — opening line → closing line. */
    gsap.set(".pl-sky",   { scale: 1.06, force3D: true });
    gsap.set(".pl-torii", { yPercent: -12, force3D: true });

    gsap.set(".head-1", { autoAlpha: 1 });
    gsap.set(".head-3", { autoAlpha: 0 });
    gsap.timeline({
      defaults: { ease: "power2.out", duration: 1 },
      scrollTrigger: { trigger: ".hero", start: "top top", end: "+=100%", pin: true, scrub: 0.45, anticipatePin: 1 }
    })
      /* constant micro-drift across the whole pin: every scroll tick moves
         pixels on screen, so the pinned hero never reads as "frozen" */
      .to(".pl-mount",     { yPercent: -2.5, ease: "none", duration: 2 }, 0)
      .to(".pl-fore",      { yPercent: -4.5, ease: "none", duration: 2 }, 0)
      .to(".hero-content", { yPercent: -3,   ease: "none", duration: 2 }, 0)
      .to(".pl-sky",   { autoAlpha: 1, scale: 1 }, 0)
      .to(".head-1",   { autoAlpha: 0, duration: 0.5 }, 0.9)
      .to(".pl-torii", { autoAlpha: 1, yPercent: 0 }, 1.0)
      .to(".head-3",   { autoAlpha: 1, duration: 0.5 }, 1.25);

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

  if (isTouch) {
    /* phones: no pin — instead the layers drift at their own depths as the
       hero scrolls away, so the scene keeps its dimensionality on touch too.
       Transform-only, scrubbed, cheap. The bottom scrim fade masks the edges. */
    gsap.utils.toArray(".hero-scene .pl").forEach(function (el) {
      var d = parseFloat(el.dataset.depth) || 0.2;
      gsap.to(el, { yPercent: -(d * 22), ease: "none", force3D: true,
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    });
  }

  /* recalc pins after big hero layers finish loading (kills layout shift) */
  addEventListener("load", function () { ScrollTrigger.refresh(); });

  /* ---------- section parallax (desktop only) ---------- */
  if (!isTouch) gsap.utils.toArray("[data-parallax]").forEach(function (el) {
    var f = parseFloat(el.dataset.parallax) || 0.12;
    gsap.fromTo(el, { yPercent: -f * 100 }, { yPercent: f * 100, ease: "none",
      scrollTrigger: { trigger: el.closest("section") || el, start: "top bottom", end: "bottom top", scrub: true } });
  });

  /* ---------- reading-progress ink line (transform-only, cheap) ---------- */
  var ink = document.querySelector(".scroll-ink");
  if (ink) ScrollTrigger.create({ start: 0, end: "max",
    onUpdate: function (self) { ink.style.transform = "scaleX(" + self.progress.toFixed(4) + ")"; } });

  /* ---------- marquee (paused while off-screen to save compositing) ---------- */
  var marq = document.getElementById("marqRow");
  if (marq) {
    var marqTween = gsap.to(marq, { xPercent: -50, duration: 26, ease: "none", repeat: -1 });
    ScrollTrigger.create({ trigger: ".marquee", start: "top bottom", end: "bottom top",
      onToggle: function (self) { self.isActive ? marqTween.play() : marqTween.pause(); } });
  }

  /* ---------- globe reach callouts: revealed once, staggered, as the section enters ----------
     The globe itself just auto-rotates (and can be dragged) — no scroll pinning. */
  var hub = document.querySelector(".hub");
  var reachSteps = document.querySelector(".reach-steps");
  if (hub && reachSteps) {
    hub.classList.add("js-hub");
    function setReach(n) {
      reachSteps.classList.toggle("on1", n >= 1);
      reachSteps.classList.toggle("on2", n >= 2);
      reachSteps.classList.toggle("on3", n >= 3);
    }
    ScrollTrigger.create({ trigger: ".hub", start: "top 62%", once: true, onEnter: function () {
      setReach(1);
      gsap.delayedCall(0.5, function () { setReach(2); });
      gsap.delayedCall(1.0, function () { setReach(3); });
    }});
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }

  /* Absolute failsafe: nothing in the hero stays invisible past ~2.6s, whatever
     happens with GSAP timing, decode, or an initially-hidden tab. Plain inline
     styles — no dependency on the animation ticker. */
  setTimeout(function () {
    document.querySelectorAll(".hero .rise").forEach(function (el) {
      if (parseFloat(getComputedStyle(el).opacity) < 0.05) {
        el.style.opacity = "1"; el.style.visibility = "visible"; el.style.transform = "none";
      }
    });
  }, 2600);
})();
