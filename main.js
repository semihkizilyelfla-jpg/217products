/* 217 Products — ukiyo-e maximalist edition
   Layered 3D-parallax hero (scroll + mouse), section parallax, an
   infinite marquee, word-by-word scroll-brighten text and a pinned
   self-drawing ensō medallion. Stack: Lenis + GSAP ScrollTrigger. */

(function () {
  "use strict";
  /* ?motion=reduce mirrors the OS setting for testing — same code path */
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
                /[?&]motion=reduce/.test(location.search);

  /* ---------- contact addresses: ONE place to change ----------
     Both roles point at the working mailbox today. When the domain mailboxes
     exist, set general -> "hello@217products.com" and support ->
     "support@217products.com" here and every link follows: data-mail picks
     the general address, data-mail="support" picks support, and
     data-mail-text also prints it. The mailto in the HTML is the no-JS
     fallback and stays valid either way. */
  var CONTACT = {
    general: "destek217product@gmail.com",
    support: "destek217product@gmail.com"
  };
  [].forEach.call(document.querySelectorAll("a[data-mail]"), function (a) {
    var addr = CONTACT[a.getAttribute("data-mail") || "general"] || CONTACT.general;
    a.href = "mailto:" + addr;
    if (a.hasAttribute("data-mail-text")) a.textContent = addr;
  });

  /* ---------- nav: scrolled "washi ribbon" state — runs regardless of GSAP ---------- */
  (function () {
    var nav = document.querySelector(".nav");
    if (!nav) return;
    function onScroll() { nav.classList.toggle("is-scrolled", (window.scrollY || 0) > 40); }
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  })();

  /* ---------- mobile nav (hamburger) — runs regardless of GSAP ----------
     A closed drawer is a real dialog: it is inert (out of the tab order and
     hidden from screen readers), focus moves inside on open, Tab cycles within
     it, and Escape returns focus to the button that opened it. */
  (function () {
    var t = document.getElementById("navToggle"), n = document.getElementById("navLinks");
    if (!t || !n) return;
    var links = [].slice.call(n.querySelectorAll("a"));
    var isDrawer = function () { return getComputedStyle(t).display !== "none"; };

    function setInert(on) {
      /* only while the drawer layout is active — on desktop the same links are
         the visible nav bar and must stay reachable */
      if (on) { n.setAttribute("inert", ""); n.setAttribute("aria-hidden", "true"); }
      else { n.removeAttribute("inert"); n.removeAttribute("aria-hidden"); }
    }
    function syncInert() { setInert(isDrawer() && !n.classList.contains("open")); }
    syncInert();
    addEventListener("resize", syncInert, { passive: true });

    function close(returnFocus) {
      n.classList.remove("open"); t.classList.remove("is-open");
      t.setAttribute("aria-expanded", "false");
      document.documentElement.classList.remove("menu-open");
      syncInert();
      if (returnFocus) t.focus();
    }
    function open() {
      n.classList.add("open"); t.classList.add("is-open");
      t.setAttribute("aria-expanded", "true");
      document.documentElement.classList.add("menu-open"); /* scroll lock */
      setInert(false);
      if (links[0]) links[0].focus();
    }
    t.addEventListener("click", function () {
      n.classList.contains("open") ? close(false) : open();
    });
    links.forEach(function (a) { a.addEventListener("click", function () { close(false); }); });
    addEventListener("keydown", function (e) {
      if (!n.classList.contains("open")) return;
      if (e.key === "Escape") { close(true); return; }
      if (e.key !== "Tab" || !isDrawer()) return;
      /* focus trap: the toggle (the X) is part of the cycle */
      var ring = [t].concat(links);
      var i = ring.indexOf(document.activeElement);
      if (i === -1) return;
      var next = e.shiftKey ? (i - 1 + ring.length) % ring.length : (i + 1) % ring.length;
      e.preventDefault(); ring[next].focus();
    });
  })();

  /* ---------- section ↔ nav sync: hash, history and aria-current ----------
     Uses one IntersectionObserver instead of measuring on every scroll frame. */
  (function () {
    var sections = [].slice.call(document.querySelectorAll("main section[id]"));
    var linkFor = {};
    [].forEach.call(document.querySelectorAll('.nav-links a[href^="#"]'), function (a) {
      linkFor[a.getAttribute("href").slice(1)] = a;
    });
    if (!sections.length) return;
    var current = "";
    function mark(id) {
      if (id === current) return;
      current = id;
      for (var k in linkFor) linkFor[k].removeAttribute("aria-current");
      if (linkFor[id]) linkFor[id].setAttribute("aria-current", "location");
      /* keep the address bar honest without adding history entries */
      var want = id ? "#" + id : location.pathname;
      if (location.hash !== "#" + id) history.replaceState(null, "", want);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) mark(e.target.id); });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { io.observe(s); });
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
  /* Phones hide/show the browser chrome while scrolling, which fires resize and
     made ScrollTrigger recalc everything MID-SCROLL — the page visibly jumped.
     This tells it to ignore those height-only mobile resizes (GSAP's official
     cure); real orientation/width changes still refresh normally. */
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* Lenis only where it adds something: a mouse wheel fires coarse ~100px
     steps that genuinely benefit from interpolation. Touch scrolling is
     already interpolated by the compositor off the main thread, so running
     Lenis there replaces free native momentum with JS work every frame — the
     single biggest scroll cost on a phone. Pointer-based coarse input and
     reduced-motion opt out entirely; ScrollTrigger then rides native scroll. */
  var wantsSmooth = matchMedia("(pointer: fine)").matches && !matchMedia("(max-width: 820px)").matches;
  var lenis = null;
  if (window.Lenis && wantsSmooth) {
    lenis = new Lenis({ lerp: 0.12 }); /* tighter, more responsive glide */
    lenis.on("scroll", ScrollTrigger.update);
    /* one ticker drives Lenis + GSAP + ScrollTrigger — never a second RAF loop */
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  /* A backgrounded tab should cost nothing, and must not fast-forward the
     scene when it returns: pause the ticker while hidden, resync on return. */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { gsap.ticker.sleep(); }
    else { gsap.ticker.wake(); ScrollTrigger.update(); }
  });

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

  mm.add("(min-width: 821px)", function () {
    /* desktop: give sky + torii their pre-assembly transform (opacity:0 comes from
       CSS); the pinned timeline below fades and settles them on scroll.
       Short, nimble pin (+=100%): sky settles first, then the torii lands as the
       headline hands over — opening line → closing line. */
    gsap.set(".pl-sky",   { scale: 1.06, force3D: true });
    gsap.set(".pl-torii", { yPercent: -12, force3D: true });

    /* The headline hand-over only runs where a second line exists. The TR page
       carries a single headline, so there is nothing to hand over to — fading
       head-1 out there would empty the hero for the rest of the pin. */
    var swap = document.querySelector(".head-3");
    gsap.set(".head-1", { autoAlpha: 1 });
    if (swap) gsap.set(".head-3", { autoAlpha: 0 });
    var heroTl = gsap.timeline({
      defaults: { ease: "power2.out", duration: 1 },
      /* no anticipatePin: with Lenis smoothing it could double-adjust and hop
         as the pin engaged — Lenis already removes the flash it guards against */
      /* scrub:true, not a number. Lenis already smooths the scroll position;
         adding scrub lag on top made the scene trail behind the page, which
         reads as stutter rather than smoothness. Now it tracks 1:1. */
      scrollTrigger: { trigger: ".hero", start: "top top", end: "+=70%", pin: true, scrub: true }
    })
      /* constant micro-drift across the whole pin: every scroll tick moves
         pixels on screen, so the pinned hero never reads as "frozen" */
      .to(".pl-mount",     { yPercent: -2.5, ease: "none", duration: 2 }, 0)
      .to(".pl-fore",      { yPercent: -4.5, ease: "none", duration: 2 }, 0)
      .to(".hero-content", { yPercent: -3,   ease: "none", duration: 2 }, 0)
      .to(".pl-sky",   { autoAlpha: 1, scale: 1 }, 0)
      .to(".pl-torii", { autoAlpha: 1, yPercent: 0 }, 0.75);

    /* Hand-over sits earlier in the (30% shorter) pin so the second line is
       on screen well before release — still scrubbed, still fully two-way. */
    if (swap) {
      heroTl.to(".head-1", { autoAlpha: 0, duration: 0.5 }, 0.55)
            .to(".head-3", { autoAlpha: 1, duration: 0.5 }, 0.9);
    }

    /* section parallax (desktop only) */
    gsap.utils.toArray("[data-parallax]").forEach(function (el) {
      var f = parseFloat(el.dataset.parallax) || 0.12;
      /* force3D pins these onto their own GPU layer up front, so the first
         scroll doesn't pay a promotion hitch mid-motion */
      gsap.fromTo(el, { yPercent: -f * 100 }, { yPercent: f * 100, ease: "none", force3D: true,
        scrollTrigger: { trigger: el.closest("section") || el, start: "top bottom", end: "bottom top", scrub: true } });
    });

    /* light mouse parallax */
    if (matchMedia("(pointer: fine)").matches) {
      var setters = gsap.utils.toArray(".hero-scene .pl").map(function (el) {
        var d = parseFloat(el.dataset.depth) || 0.2;
        return { x: gsap.quickTo(el, "x", { duration: 1.0, ease: "power3.out" }),
                 y: gsap.quickTo(el, "y", { duration: 1.0, ease: "power3.out" }), d: d };
      });
      var onMove = function (e) {
        var nx = (e.clientX / innerWidth) * 2 - 1, ny = (e.clientY / innerHeight) * 2 - 1;
        setters.forEach(function (s) { s.x(nx * -15 * s.d); s.y(ny * -9 * s.d); });
      };
      addEventListener("mousemove", onMove);
      return function () { removeEventListener("mousemove", onMove); };
    }
  });

  mm.add("(max-width: 820px)", function () {
    /* Phones: no pin, and the four layers move together as ONE composited
       group instead of four independently scrubbed transforms. Same drift on
       screen, a quarter of the per-frame work — layer-by-layer parallax was
       the most expensive thing left on touch devices.
       The headline hand-over happens on its own short timeline so the second
       line still arrives, without a long pinned scene to scroll through. */
    gsap.to(".hero-scene", { yPercent: -6, ease: "none", force3D: true,
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

    gsap.set(".pl-sky, .pl-torii", { autoAlpha: 1, scale: 1, yPercent: 0 });
    var swapM = document.querySelector(".head-3");
    if (swapM) {
      gsap.set(".head-1", { autoAlpha: 1 });
      gsap.set(".head-3", { autoAlpha: 0 });
      gsap.timeline({ defaults: { ease: "none" },
        scrollTrigger: { trigger: ".hero", start: "top top", end: "45% top", scrub: true } })
        .to(".head-1", { autoAlpha: 0, duration: 0.45 }, 0.25)
        .to(".head-3", { autoAlpha: 1, duration: 0.45 }, 0.55);
    }
  });

  /* One debounced refresh path for every source (load, fonts, resize) instead
     of three uncoordinated calls — a refresh re-measures every trigger, so
     firing it repeatedly is one of the most expensive things on the page. */
  var refreshT;
  function refreshSoon() { clearTimeout(refreshT); refreshT = setTimeout(function () { ScrollTrigger.refresh(); }, 180); }
  addEventListener("load", refreshSoon);
  var lastW = innerWidth;
  addEventListener("resize", function () {
    /* height-only changes are the mobile URL bar; ignore them completely */
    if (innerWidth === lastW) return;
    lastW = innerWidth; refreshSoon();
  }, { passive: true });

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
    document.fonts.ready.then(refreshSoon);
  }

  /* Fail-open. Whatever stalls — GSAP timing, a decode, a ScrollTrigger that
     never fired — nothing already on screen stays invisible. Plain inline
     styles, no dependency on the animation ticker.
     It runs at 1.5s AND whenever the tab becomes visible again: a tab that was
     scrolled while hidden never fired its triggers, and would otherwise come
     back to blank sections. */
  function revealOnScreen() {
    document.querySelectorAll(".rise").forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top > innerHeight * 1.2 || r.bottom < 0) return;  /* still gated on purpose */
      if (parseFloat(getComputedStyle(el).opacity) < 0.9) {
        el.style.opacity = "1"; el.style.visibility = "visible"; el.style.transform = "none";
      }
    });
  }
  setTimeout(revealOnScreen, 1500);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) setTimeout(revealOnScreen, 60);
  });

  /* Anything focused must be visible — a keyboard user can reach a link inside
     a section whose reveal has not run yet. */
  document.addEventListener("focusin", function (e) {
    var el = e.target && e.target.closest ? e.target.closest(".rise") : null;
    if (el && parseFloat(getComputedStyle(el).opacity) < 0.99) {
      gsap.set(el, { autoAlpha: 1, y: 0 });
    }
  });
})();
