/* 217 Products — ukiyo-e maximalist edition
   Layered 3D-parallax hero (scroll + mouse), section parallax, an
   infinite marquee, word-by-word scroll-brighten text and a pinned
   self-drawing ensō medallion. Stack: Lenis + GSAP ScrollTrigger. */

(function () {
  "use strict";
  /* ?motion=reduce mirrors the OS setting for testing — same code path */
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
                /[?&]motion=reduce/.test(location.search);

  /* ---------- contact e-mail: ONE place to change ----------
     When the corporate mailbox on the domain is ready, update this constant —
     every a[data-mail] link (nav, closing CTA, footer) and the printed address
     (a[data-mail][data-mail-text]) follow automatically. The mailto in the
     HTML is only the no-JS fallback. */
  var CONTACT_EMAIL = "destek217product@gmail.com";
  [].forEach.call(document.querySelectorAll("a[data-mail]"), function (a) {
    a.href = "mailto:" + CONTACT_EMAIL;
    if (a.hasAttribute("data-mail-text")) a.textContent = CONTACT_EMAIL;
  });

  /* ---------- deck backdrop offset ----------
     The paper sheet that slides over the parked hero starts exactly at the
     hero's bottom. 100svh is only a first guess — on short landscape screens
     the hero can be taller, and a fixed guess would cover its last rows. */
  (function () {
    var hero = document.querySelector(".hero");
    if (!hero) return;
    function sync() {
      document.documentElement.style.setProperty("--hero-h", Math.round(hero.offsetHeight) + "px");
    }
    sync();
    addEventListener("load", sync);
    addEventListener("resize", sync, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync);
  })();

  /* ---------- nav: scrolled "washi ribbon" state — runs regardless of GSAP ----------
     Also flags <html>. The ensō is only clickable while the hero is at rest:
     once the ink starts growing it covers the viewport, and a full-screen
     click target would swallow every link on the page under it. */
  (function () {
    var nav = document.querySelector(".nav");
    function onScroll() {
      var past = (window.scrollY || 0) > 40;
      if (nav) nav.classList.toggle("is-scrolled", past);
      document.documentElement.classList.toggle("scrolled", past);
    }
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  })();

  /* ---------- mobile nav (hamburger) — runs regardless of GSAP ---------- */
  (function () {
    var t = document.getElementById("navToggle"), n = document.getElementById("navLinks");
    if (!t || !n) return;
    function close() {
      n.classList.remove("open"); t.classList.remove("is-open");
      t.setAttribute("aria-expanded", "false");
      document.documentElement.classList.remove("menu-open");
    }
    t.addEventListener("click", function () {
      var open = n.classList.toggle("open");
      t.classList.toggle("is-open", open);
      t.setAttribute("aria-expanded", open ? "true" : "false");
      document.documentElement.classList.toggle("menu-open", open); /* scroll lock */
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
    /* no scroll animation → the ensō stays a ring, and the hero keeps its
       resting state. The plate layers are revealed by the boot script. */
    document.documentElement.classList.add("no-motion");
    /* word-brighten scrub won't run → give the words full ink */
    [].forEach.call(document.querySelectorAll(".brighten .w"), function (el) {
      el.style.color = "var(--ink)";
    });
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  /* Phones hide/show the browser chrome while scrolling, which fires resize and
     made ScrollTrigger recalc everything MID-SCROLL — the page visibly jumped.
     This tells it to ignore those height-only mobile resizes (GSAP's official
     cure); real orientation/width changes still refresh normally. */
  ScrollTrigger.config({ ignoreMobileResize: true });

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
  /* Desktop and touch setups live in gsap.matchMedia so crossing the 820px
     boundary (window narrowed then restored, device rotation, snap layouts)
     tears one mode down cleanly and builds the other — the pin no longer
     depends on the width the page happened to LOAD at. */
  var mm = gsap.matchMedia();

  /* ---------- THE INK ----------
     The whole opening gesture. The ensō sitting in the sentence fills solid,
     then is scaled from its own centre until it floods the screen and the dark
     shelf below takes over inside that ink. Runs on every width — it IS the
     transition, not an enhancement.
     The scale needed is derived, not guessed: the disc has to reach the far
     corner of the viewport from wherever the sentence happens to put it. */
  (function () {
    var blot = document.querySelector(".blot");
    if (!blot) return;
    var ring = blot.querySelector(".enso-ring");
    var fill = blot.querySelector(".blot-fill");

    function neededScale() {
      var r = blot.getBoundingClientRect();
      if (!r.width) return 24;
      /* getBoundingClientRect already includes the live scroll transform, so
         divide it back out — otherwise every refresh mid-flood reads a huge
         width and collapses the target scale. */
      var s = gsap.getProperty(blot, "scaleX") || 1;
      var w = r.width / s;
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var far = Math.max(
        Math.hypot(cx, cy),
        Math.hypot(innerWidth - cx, cy),
        Math.hypot(cx, innerHeight - cy),
        Math.hypot(innerWidth - cx, innerHeight - cy));
      return (far * 2) / w * 1.06; /* +6% so no rim shows at the corner */
    }

    /* ---- timing, measured off the reference rather than guessed ----
       Its circle holds at 1:1 for the first ~80px of scroll (9% of a viewport),
       then grows on a dead-straight linear ramp, and has swallowed the whole
       screen by scrollY ~205 — under a quarter of one screen.
       Ours used to finish at ~519px. Two and a half times too slow is not a
       slower version of the same gesture; it turns a flood into a black ball
       you sit and watch expand. Same shape now: hold, then go.
         hold  = 0.37 * 0.26vh = ~87px on a 900-tall screen
         cover = ~218px */
    var RIDE = 0.26, HOLD = 0.37;
    function inkEase(p) { return p < HOLD ? 0 : (p - HOLD) / (1 - HOLD); }

    gsap.fromTo(blot, { scale: 1 }, {
      scale: function () { return neededScale() * 1.12; },
      ease: inkEase, force3D: true,
      scrollTrigger: { start: 0, end: function () { return window.innerHeight * RIDE; },
                       scrub: true, invalidateOnRefresh: true }
    });
    /* the ring closes into a solid disc INSIDE the hold, so growth always
       starts from a finished circle and never from a half-drawn one */
    if (fill) gsap.to(fill, { opacity: 1, ease: "power1.in", scrollTrigger: {
      start: 0, end: function () { return window.innerHeight * 0.075; }, scrub: true, invalidateOnRefresh: true } });
    if (ring) gsap.to(ring, { opacity: 0, ease: "none", scrollTrigger: {
      start: function () { return window.innerHeight * 0.04; },
      end: function () { return window.innerHeight * 0.085; }, scrub: true, invalidateOnRefresh: true } });

    /* No fade on the hero copy. GSAP would capture its start opacity while the
       WAAPI entrance is still mid-flight and animate 0 -> 0, blanking the hero.
       It isn't needed either: the ink sits above the copy in the stack, so the
       growing disc covers the words on its own. */
  })();

  /* ---------- the splash ----------
     Tap the ink and it throws sumi droplets across the sheet. They settle at a
     whisper and stay, so the paper collects marks over a visit. Our version of
     the "click for a surprise" toy: no physics engine, no extra bytes. */
  (function () {
    var hero = document.querySelector(".hero");
    var blot = document.querySelector(".blot");
    var btn = document.getElementById("inkTap");
    if (!hero) return;

    function splash(cx, cy) {
      var n = 11;
      for (var i = 0; i < n; i++) {
        var d = document.createElement("i");
        d.className = "ink-drop";
        var size = 5 + Math.random() * 15;
        var ang = Math.random() * Math.PI * 2;
        var dist = 60 + Math.random() * Math.min(340, innerWidth * 0.3);
        d.style.width = d.style.height = size.toFixed(1) + "px";
        hero.appendChild(d);
        gsap.set(d, { x: cx, y: cy, xPercent: -50, yPercent: -50, scale: 0.2, opacity: 0.9 });
        var tl = gsap.timeline({ onComplete: (function (el) {
          /* the drop stays on the paper — but never more than a few dozen, or
             a long visit would leave hundreds of layers for the compositor */
          return function () {
            var all = hero.querySelectorAll(".ink-drop");
            if (all.length > 40) all[0].remove();
          };
        })(d) });
        tl.to(d, { x: cx + Math.cos(ang) * dist, y: cy + Math.sin(ang) * dist,
                   scale: 0.35 + Math.random() * 0.8,
                   duration: 0.62 + Math.random() * 0.5, ease: "power3.out" })
          .to(d, { opacity: 0.1 + Math.random() * 0.07, duration: 0.9, ease: "power2.out" }, 0.35);
      }
    }
    function at(el) {
      var hb = hero.getBoundingClientRect(), r = el.getBoundingClientRect();
      splash(r.left - hb.left + r.width / 2, r.top - hb.top + r.height / 2);
    }
    if (blot) blot.addEventListener("click", function () { at(blot); });
    if (btn) btn.addEventListener("click", function () { at(blot || btn); });
  })();

  mm.add("(min-width: 821px)", function () {
    /* section parallax (desktop only) */
    gsap.utils.toArray("[data-parallax]").forEach(function (el) {
      var f = parseFloat(el.dataset.parallax) || 0.12;
      /* force3D pins these onto their own GPU layer up front, so the first
         scroll doesn't pay a promotion hitch mid-motion */
      gsap.fromTo(el, { yPercent: -f * 100 }, { yPercent: f * 100, ease: "none", force3D: true,
        scrollTrigger: { trigger: el.closest("section") || el, start: "top bottom", end: "bottom top", scrub: true } });
    });

    /* light mouse parallax across the plate. The .hz layers already carry a
       translateX(-50%) centring transform, so their pointer offset rides on
       xPercent instead of x — writing to x would fight the centring. */
    if (matchMedia("(pointer: fine)").matches) {
      var setters = gsap.utils.toArray(".hero-ground [data-depth]").map(function (el) {
        var d = parseFloat(el.dataset.depth) || 0.2;
        var centred = el.classList.contains("hz");
        return { x: gsap.quickTo(el, centred ? "xPercent" : "x", { duration: 1.0, ease: "power3.out" }),
                 y: gsap.quickTo(el, "y", { duration: 1.0, ease: "power3.out" }),
                 d: d, base: centred ? -50 : 0, unit: centred ? 0.14 : 1 };
      });
      var onMove = function (e) {
        var nx = (e.clientX / innerWidth) * 2 - 1, ny = (e.clientY / innerHeight) * 2 - 1;
        setters.forEach(function (s) { s.x(s.base + nx * -18 * s.d * s.unit); s.y(ny * -11 * s.d); });
      };
      addEventListener("mousemove", onMove);
      return function () { removeEventListener("mousemove", onMove); };
    }
  });

  mm.add("(max-width: 820px)", function () {
    /* phones: the plate layers drift at their own depths as the hero scrolls
       away, so the print keeps its dimensionality on touch too. Transform-only,
       scrubbed, cheap. Absolute offsets, like the desktop branch: the hero is
       sticky, so its box never travels and "bottom top" would never fire. */
    gsap.utils.toArray(".hero-ground [data-depth]").forEach(function (el) {
      var d = parseFloat(el.dataset.depth) || 0.2;
      gsap.to(el, { y: -(d * 46), ease: "none", force3D: true,
        scrollTrigger: { start: 0, end: function () { return window.innerHeight; }, scrub: true, invalidateOnRefresh: true } });
    });
  });

  /* recalc pins after big hero layers finish loading (kills layout shift) */
  addEventListener("load", function () { ScrollTrigger.refresh(); });

  /* Pre-decode every below-fold image during idle time after load. GitHub
     Pages caches assets for only 10 minutes, so revisits (especially right
     after a deploy) are effectively cold — without this, images downloaded
     and decoded MID-SCROLL, which read as the site "stuttering". After this
     warm-up, scrolling never waits on network or decode. */
  addEventListener("load", function () {
    function warm() {
      [].forEach.call(document.images, function (im) {
        if (im.loading === "lazy") im.loading = "eager";
        if (im.decode) im.decode().catch(function () {});
      });
    }
    if ("requestIdleCallback" in window) requestIdleCallback(warm, { timeout: 2500 });
    else setTimeout(warm, 1200);
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

  /* The globe just auto-rotates (and can be dragged) — no scroll pinning. Its
     reach copy rides the shared `.rise` reveal like every other section. */

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
