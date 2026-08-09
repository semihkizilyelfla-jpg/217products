/* 217 Products — first-paint boot: language routing + opening choreography.
   Runs synchronously in <head> so the gate classes exist before first paint. */
(function () {
  "use strict";

  /* Mark JS as available on <html> from the very first paint, so reveal styles
     can hide entrance elements up front (no "flash then hide" on load).
     img-wait / fonts-wait choreograph the opening and are both lifted by hard
     timeouts below, so nothing can ever stay hidden. */
  var de = document.documentElement;
  de.className += " js img-wait fonts-wait";

  var reduced = false;
  try {
    reduced = matchMedia("(prefers-reduced-motion: reduce)").matches ||
              /[?&]motion=reduce/.test(location.search); /* test hook, same path */
  } catch (_) {}
  var canAnimate = !reduced && !!(window.Element && Element.prototype.animate);
  /* Two curves on purpose. The expo-out (EASE_MOVE) front-loads ~75% of the
     change into the first fifth of the duration — great for movement, but on
     an opacity fade it reads as an instant "pop". Fades therefore use a
     balanced curve (EASE_FADE) that spends the whole duration visibly. */
  var EASE_MOVE = "cubic-bezier(0.16, 1, 0.3, 1)";
  var EASE_FADE = "cubic-bezier(0.45, 0.05, 0.25, 1)";

  /* --- webfont hold: the hero copy waits (max 900ms) for its typefaces so it
     never rises in a fallback face and then reshapes. --- */
  var fontsReady = false, textAnims = [], bootAnims = [];
  function fontsGo() {
    fontsReady = true;
    de.classList.remove("fonts-wait");
    textAnims.forEach(function (a) { try { a.play(); } catch (_) {} });
    textAnims = [];
  }
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('800 1em "Shippori Mincho"'),
      document.fonts.load('400 1em "Manrope"'),
      document.fonts.load('700 1em "Manrope"')
    ]).then(fontsGo, fontsGo);
  }
  setTimeout(fontsGo, 900);

  function imgsGo() { de.classList.remove("img-wait"); }

  /* MAIN.JS FAILSAFE. `.js` is what arms every entrance gate in the stylesheet,
     and main.js is the only thing that opens them. This file is tiny, in the
     head, and has no dependencies — so it is the right place to notice that the
     big script never finished and put the page back to its no-JS presentation,
     which is fully readable. Six seconds is well past a slow 3G fetch of the
     vendor bundle and far short of a visitor giving up. */
  setTimeout(function () {
    if (!de.classList.contains("js-live")) de.classList.remove("js");
  }, 6000);
  setTimeout(imgsGo, 2200);

  /* --- opening choreography ---
     Everything inside the hero animates via the Web Animations API, NOT CSS
     animations: GSAP later pins the hero, which re-parents it into a
     pin-spacer, and re-parenting RESTARTS any running CSS animation on its
     descendants — that restart was the "everything appears twice" opening.
     WAAPI animations survive DOM moves untouched, whatever the CDN timing. */
  /* STARTED THE MOMENT THE HERO EXISTS, not when the page finishes loading.
     This used to hang off DOMContentLoaded — and DCL does not fire until every
     classic script at the foot of the body has downloaded AND executed: gsap
     73 KB + ScrollTrigger 45 KB + lenis 18 KB + main.js 38 KB. Meanwhile
     `.js .rise { opacity: 0 }` had already hidden the headline, the credo and
     the foot line from the first paint, so on a slow connection the opening
     screen sat blank behind 174 KB of JavaScript that has nothing to do with it.
     A rAF poll finds `.hero .rise` a few milliseconds after the parser walks
     past it — long before those scripts are even requested. DCL still calls in
     as a backstop, and `started` makes sure only one of them wins. */
  var started = false;
  function startHero() {
    if (started) return;
    if (!document.querySelector(".hero .rise")) return;
    started = true;
    run();
  }
  (function poll() {
    if (started) return;
    startHero();
    if (!started) requestAnimationFrame(poll);
  })();
  document.addEventListener("DOMContentLoaded", function () {
    started = started || !document.querySelector(".hero .rise");
    if (!started) { startHero(); return; }
    run();
  });

  var ran = false;
  function run() {
    if (ran) return;
    ran = true;
    if (!canAnimate) { fontsGo(); imgsGo(); return; }

    /* hero copy — one synchronized rise, held for the webfonts. The foot line
       comes in a beat later and travels less: it's a margin note, not the
       headline, and giving it the same 26px lift made the screen arrive as one
       undifferentiated block. */
    [].forEach.call(document.querySelectorAll(".hero .rise"), function (el) {
      var foot = !!el.closest(".hero-foot");
      el.style.opacity = "1"; /* resting state — the animation covers the ride */
      var a = el.animate(
        [{ opacity: 0, transform: "translateY(" + (foot ? 10 : 26) + "px)" },
         { opacity: 1, transform: "translateY(0)" }],
        { duration: foot ? 1600 : 2400, delay: foot ? 900 : 200, easing: EASE_FADE, fill: "backwards" });
      if (!fontsReady) { a.pause(); textAnims.push(a); }
      bootAnims.push(a);
    });

    /* plate settle — gentle zoom, desktop only (skipped on phones for GPU).
       It rides on the SCENE, never on `.sun`: a WAAPI transform there would
       override the scroll gesture's own transform for its first two seconds. */
    var scene = document.querySelector(".hero-ground");
    if (scene && matchMedia("(min-width: 821px)").matches) {
      scene.animate(
        [{ transform: "scale(1.035)" }, { transform: "scale(1)" }],
        { duration: 2000, easing: EASE_MOVE, fill: "backwards" });
    }

    /* the plate — fades in once decoded, in the same tempo family as the copy
       (1.8s, same curve). Cached visits fade too: the opening should feel
       composed every time, never "pop". */
    var pls = [].slice.call(document.querySelectorAll(".hero-ground .hz"));
    var delays = { "hz": 120 };
    if (!pls.length) { imgsGo(); return; }
    var left = pls.length;
    function done() { if (--left <= 0) imgsGo(); }
    pls.forEach(function (im) {
      /* fade TO the layer's own resting opacity (see --o in the stylesheet),
         never to a flat 1 — that would collapse the depth of the plate */
      var rest = (getComputedStyle(im).getPropertyValue("--o") || "").trim() || "1";
      function reveal(withFade) {
        im.style.opacity = rest;
        if (withFade) {
          var d = 0;
          Object.keys(delays).forEach(function (k) { if (im.classList.contains(k)) d = delays[k]; });
          bootAnims.push(im.animate([{ opacity: 0 }, { opacity: rest }],
            { duration: 1800, delay: d, easing: EASE_FADE, fill: "backwards" }));
        }
        done();
      }
      if (im.complete && im.naturalWidth > 0) { reveal(de.classList.contains("img-wait")); return; }
      (im.decode ? im.decode() : Promise.resolve())
        .catch(function () {})
        .then(function () { reveal(de.classList.contains("img-wait")); });
    });

    /* absolute failsafe: whatever stalls, everything is released by 3.2s. In a
       tab opened in the background the animation timeline may be frozen — jump
       those straight to their finished state so the page is fully settled the
       moment the visitor switches to it. */
    setTimeout(function () {
      fontsGo(); imgsGo();
      if (document.hidden) bootAnims.forEach(function (a) { try { a.finish(); } catch (_) {} });
    }, 3200);
  }

  /* --- first-visit language routing (static, self-hosted, no network) --- */
  var KEY = "lang217";

  /* Remember the visitor's explicit choice whenever they use the language switch.
     Delegated on document so it works even though the links parse after this script. */
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[data-lang]") : null;
    if (a) { try { localStorage.setItem(KEY, a.getAttribute("data-lang")); } catch (_) {} }
  });

  /* Auto-routing runs only from the English (root) page, only on a first visit. */
  var pageLang = (de.getAttribute("lang") || "en").slice(0, 2).toLowerCase();
  if (pageLang !== "en") return;

  /* THE STORED CHOICE IS HONOURED, not merely recorded. This used to read the
     key and then `return` on any value — so a visitor who picked Turkish had
     "tr" written to localStorage and was sent to the English page on every
     later visit, forever, by the very branch whose comment claimed to respect
     their choice. Only "en" is a reason to stay.
     No loop risk: the function has already returned above unless this page is
     the English one, so index-tr.html never reaches here. */
  var chosen = null;
  try { chosen = localStorage.getItem(KEY); } catch (_) {}
  if (chosen === "en") return;

  /* QUERY AND HASH TRAVEL WITH THE VISITOR. Replacing the location with a bare
     filename dropped both — a shared link to 217products.com/#products landed a
     Turkish reader at the top of the Turkish page, and ?motion=reduce (the test
     hook this site relies on) was silently stripped on any Turkish browser. */
  var carry = location.search + location.hash;

  if (chosen === "tr") { location.replace("index-tr.html" + carry); return; }

  var primary = (navigator.language || (navigator.languages && navigator.languages[0]) || "").toLowerCase();
  if (/^tr/.test(primary)) {
    try { localStorage.setItem(KEY, "tr"); } catch (_) {}
    location.replace("index-tr.html" + carry);
  }
})();
