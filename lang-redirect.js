/* 217 Products — first-visit language routing (static, self-hosted, no network).
   Turkish-preferring browsers land on the Turkish page automatically; any manual
   choice via the EN/TR switch is remembered so the visitor is never bounced. */
(function () {
  "use strict";
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
