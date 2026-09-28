/* 217 Products — language routing for the pages that are not the home page.
   The same rule lang-redirect.js applies on / (and the one the privacy page
   describes): a stored choice wins, otherwise a Turkish browser on its first
   visit to an English page is sent to that page's Turkish twin, once, and the
   choice is remembered. It runs from <head>, after the hreflang links it reads,
   so there is nothing to flash. No choreography here — that stays on the home
   page, where the hero needs it. */
(function () {
  "use strict";
  var KEY = "lang217";

  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[data-lang]") : null;
    if (a) { try { localStorage.setItem(KEY, a.getAttribute("data-lang")); } catch (_) {} }
  });

  var de = document.documentElement;
  if ((de.getAttribute("lang") || "en").slice(0, 2).toLowerCase() !== "en") return;

  var alt = document.querySelector('link[rel="alternate"][hreflang="tr"]');
  if (!alt) return;

  var chosen = null;
  try { chosen = localStorage.getItem(KEY); } catch (_) {}
  if (chosen === "en") return;

  /* the path only: the hreflang link is absolute to the live domain, and a
     local copy of the site should route to its own Turkish page, not the live one */
  var to;
  try { to = new URL(alt.getAttribute("href"), location.href).pathname; } catch (_) { return; }
  if (!to || to === location.pathname) return;
  var carry = location.search + location.hash;

  if (chosen === "tr") { location.replace(to + carry); return; }

  var primary = (navigator.language || (navigator.languages && navigator.languages[0]) || "").toLowerCase();
  if (/^tr/.test(primary)) {
    try { localStorage.setItem(KEY, "tr"); } catch (_) {}
    location.replace(to + carry);
  }
})();
