/* 217 Products — first-visit language routing (static, self-hosted, no network).
   Turkish-preferring browsers land on the Turkish page automatically; any manual
   choice via the EN/TR switch is remembered so the visitor is never bounced. */
(function () {
  "use strict";

  /* Mark JS as available on <html> from the very first paint, so reveal styles
     can hide entrance elements up front (no "flash then hide" on load).
     img-wait / fonts-wait choreograph the opening (see style.css) and are both
     lifted by hard timeouts below, so nothing can ever stay hidden. */
  var de = document.documentElement;
  de.className += " js img-wait fonts-wait";

  /* Webfont hold: the whole hero entrance waits for the two hero typefaces
     (headline serif + body sans) so nothing animates in a fallback and then
     reshapes. Released as soon as they're ready; hard cap so it never stalls. */
  function fontsGo() { de.classList.remove("fonts-wait"); }
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('800 1em "Shippori Mincho"'),
      document.fonts.load('400 1em "Manrope"'),
      document.fonts.load('700 1em "Manrope"')
    ]).then(fontsGo, fontsGo);
  } else { fontsGo(); }
  setTimeout(fontsGo, 900);

  /* Image choreography: each hero layer fades in the moment it decodes; a
     cached repeat visit paints instantly with no fade at all. Hard cap 2s. */
  function imgsGo() { de.classList.remove("img-wait"); }
  setTimeout(imgsGo, 2000);
  document.addEventListener("DOMContentLoaded", function () {
    var pls = [].slice.call(document.querySelectorAll(".hero-scene .pl"));
    if (!pls.length) return imgsGo();
    var left = pls.length;
    function done() { if (--left <= 0) imgsGo(); }
    pls.forEach(function (im) {
      if (im.complete && im.naturalWidth > 0) { done(); return; }
      (im.decode ? im.decode() : Promise.resolve())
        .catch(function () {})
        .then(function () {
          if (de.classList.contains("img-wait")) im.classList.add("pl-in");
          done();
        });
    });
  });

  var KEY = "lang217";

  /* Remember the visitor's explicit choice whenever they use the language switch.
     Delegated on document so it works even though the links parse after this script. */
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[data-lang]") : null;
    if (a) { try { localStorage.setItem(KEY, a.getAttribute("data-lang")); } catch (_) {} }
  });

  /* Auto-routing runs only from the English (root) page, only on a first visit. */
  var pageLang = (document.documentElement.getAttribute("lang") || "en").slice(0, 2).toLowerCase();
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
