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
  setTimeout(imgsGo, 2200);

  /* --- opening choreography ---
     Everything inside the hero animates via the Web Animations API, NOT CSS
     animations: GSAP later pins the hero, which re-parents it into a
     pin-spacer, and re-parenting RESTARTS any running CSS animation on its
     descendants — that restart was the "everything appears twice" opening.
     WAAPI animations survive DOM moves untouched, whatever the CDN timing. */
  document.addEventListener("DOMContentLoaded", function () {
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

    /* The disc's settle used to be a zoom on the whole painted scene. There is
       no scene now, and it must NOT be re-pointed at `.sun`: a WAAPI transform
       there would override the scroll gesture's own transform for its first two
       seconds. The disc arrives on opacity alone, below. */

    /* the disc — fades in once decoded, in the same tempo family as the copy
       (1.8s, same curve). Cached visits fade too: the opening should feel
       composed every time, never "pop". */
    var pls = [].slice.call(document.querySelectorAll(".hero .sun-ink"));
    var delays = { "sun-ink": 120 };
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
