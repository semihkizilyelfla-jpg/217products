/* 217 Products — keeps the reader's place when the window changes size, on the
   product pages. Chrome's own scroll anchoring does this on the legal pages, but
   not here: the ink walls are drawn by full-width layers and the spacing is in
   vw/vh, and in a measured drag from 1440 to 760 px wide the reader was thrown
   back into the hero. So the page does it itself: it remembers the first block
   at the top of the screen and where it sat, and puts it back after a resize.
   The home page does the same in main.js, per section, because its pinned
   sections move as a whole. */
(function () {
  "use strict";
  var list = [].slice.call(document.querySelectorAll(
    "main h1, main h2, main h3, main p, main li, main dt, main dd, main summary, main figure, main .btn, footer p, footer li"));
  if (!list.length || !window.requestAnimationFrame) return;

  function read() {
    if ((window.scrollY || window.pageYOffset || 0) < 1) return null; /* at the top, the top is the place */
    var vh = window.innerHeight;
    for (var i = 0; i < list.length; i++) {
      var r = list[i].getBoundingClientRect();
      if (r.height > 0 && r.bottom > 0 && r.top < vh) return { el: list[i], top: r.top, h: r.height };
    }
    return null;
  }

  function write() {
    if (!anchor || !anchor.el.isConnected) return;
    var r = anchor.el.getBoundingClientRect();
    /* a block cut by the top edge keeps the same share of itself above it
       (it has reflowed, so its old pixel offset would land on another line);
       a block below the edge keeps its distance from it */
    var want = anchor.top < 0 && anchor.h > 0 ? anchor.top / anchor.h * r.height : anchor.top;
    var d = Math.round(r.top - want);
    if (Math.abs(d) >= 2) window.scrollTo(0, (window.scrollY || window.pageYOffset || 0) + d);
  }

  var anchor = read(), held = false, calm = 0, raf = 0, w = window.innerWidth;
  function coarse() { return !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches); }

  addEventListener("scroll", function () {
    if (held || raf) return;
    raf = requestAnimationFrame(function () { raf = 0; if (!held) anchor = read(); });
  }, { passive: true });

  addEventListener("resize", function () {
    var nw = window.innerWidth;
    /* a phone's address bar sliding away changes only the height, in the middle
       of a swipe; nothing reflows then, and pulling the page back would fight it */
    if (nw === w && coarse()) return;
    w = nw;
    held = true;
    clearTimeout(calm);
    calm = setTimeout(function () { held = false; }, 900);
    write();
  }, { passive: true });

  /* the reader moving on their own ends the hold at once */
  ["wheel", "touchstart", "keydown", "pointerdown"].forEach(function (t) {
    addEventListener(t, function () { held = false; }, { passive: true });
  });

  /* late layout (webfonts, images) moves blocks without a scroll; re-read */
  function settle() { if (!held) anchor = read(); }
  addEventListener("load", settle);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle, function () {});
})();
