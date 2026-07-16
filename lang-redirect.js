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
  try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (_) {}
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
  setTimeout(imgsGo, 2200);

  /* --- opening choreography ---
     Everything inside the hero animates via the Web Animations API, NOT CSS
     animations: GSAP later pins the hero, which re-parents it into a
     pin-spacer, and re-parenting RESTARTS any running CSS animation on its
     descendants — that restart was the "everything appears twice" opening.
     WAAPI animations survive DOM moves untouched, whatever the CDN timing. */
  document.addEventListener("DOMContentLoaded", function () {
    if (!canAnimate) { fontsGo(); imgsGo(); return; }

    /* hero copy — one synchronized 3s rise, held for the webfonts */
    [].forEach.call(document.querySelectorAll(".hero .rise"), function (el) {
      var cue = el.classList.contains("scroll-cue");
      var from = cue ? "translateX(-50%) translateY(10px)" : "translateY(26px)";
      var to   = cue ? "translateX(-50%) translateY(0)"    : "translateY(0)";
      el.style.opacity = "1"; /* resting state — the animation covers the ride */
      var a = el.animate(
        [{ opacity: 0, transform: from }, { opacity: 1, transform: to }],
        { duration: 2400, delay: 200, easing: EASE_FADE, fill: "backwards" });
      if (!fontsReady) { a.pause(); textAnims.push(a); }
      bootAnims.push(a);
    });

    /* scene settle — gentle zoom, desktop only (skipped on phones for GPU) */
    var scene = document.querySelector(".hero-scene");
    if (scene && matchMedia("(min-width: 821px)").matches) {
      scene.animate(
        [{ transform: "scale(1.035)" }, { transform: "scale(1)" }],
        { duration: 2000, easing: EASE_MOVE, fill: "backwards" });
    }

    /* hero layers — each fades in once decoded, in the same tempo family as
       the copy (1.8s, same curve). Desktop leaves sky + torii untouched for
       the scroll-assembly; phones reveal all four. Cached visits fade too —
       the opening should feel composed every time, never "pop". */
    var small = matchMedia("(max-width: 820px)").matches;
    var pls = [].slice.call(document.querySelectorAll(small ? ".hero-scene .pl" : ".pl-mount, .pl-fore"));
    var delays = { "pl-mount": 80, "pl-fore": 260, "pl-sky": 440, "pl-torii": 620 };
    if (!pls.length) { imgsGo(); return; }
    var left = pls.length;
    function done() { if (--left <= 0) imgsGo(); }
    pls.forEach(function (im) {
      function reveal(withFade) {
        im.style.opacity = "1";
        if (withFade) {
          var d = 0;
          Object.keys(delays).forEach(function (k) { if (im.classList.contains(k)) d = delays[k]; });
          bootAnims.push(im.animate([{ opacity: 0 }, { opacity: 1 }],
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
  });

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

  var chosen = null;
  try { chosen = localStorage.getItem(KEY); } catch (_) {}
  if (chosen) return; /* respect a previous manual or auto choice — no loops */

  var primary = (navigator.language || (navigator.languages && navigator.languages[0]) || "").toLowerCase();
  if (/^tr/.test(primary)) {
    try { localStorage.setItem(KEY, "tr"); } catch (_) {}
    location.replace("index-tr.html");
  }
})();
