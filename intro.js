/* 217 Products — brief branded intro curtain.
   Covers the first paint so the hero (fonts + landscape) is fully assembled by
   the time the curtain lifts — the visitor never sees anything half-loaded.
   Self-contained: no GSAP dependency, never hangs (hard cap), never flashes
   (minimum show), and if JS is disabled the curtain never shows at all. */
(function () {
  "use strict";
  var intro = document.getElementById("intro");
  if (!intro) return;

  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  var t0 = now();

  function lift() {
    if (lift.done) return; lift.done = true;
    intro.classList.add("intro--out");
    var remove = function () { if (intro && intro.parentNode) intro.parentNode.removeChild(intro); };
    intro.addEventListener("transitionend", remove, { once: true });
    setTimeout(remove, 900); /* in case transitionend never fires */
  }

  var minShow = reduced ? 0 : 650;   /* don't flash on a fast/cached load */
  var hardCap = 3200;                 /* never hang, whatever stalls */

  var waits = [];
  if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
  [].forEach.call(document.querySelectorAll(".pl-mount, .pl-fore, .pl-sky"), function (im) {
    waits.push(im.decode ? im.decode().catch(function () {}) : Promise.resolve());
  });

  Promise.all(waits).then(function () {
    setTimeout(lift, Math.max(0, minShow - (now() - t0)));
  });
  setTimeout(lift, hardCap);
})();
