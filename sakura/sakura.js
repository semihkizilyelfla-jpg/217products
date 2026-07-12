/* 217 Products — HubX-style mechanics
   Black minimal canvas, scroll-brighten text (word by word), a pinned
   glowing "217" medallion whose ribbons draw in and icon cards float in
   as you scroll. Stack: Lenis + GSAP ScrollTrigger (CDN, guarded). */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- ambient petals ---------- */
  function startPetals() {
    var canvas = document.getElementById("petals");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var COLORS = ["#F4A6C1", "#FFE1EA", "#EFA44F"];
    var petals = [];
    function resize() { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; }
    resize(); addEventListener("resize", resize);
    var COUNT = innerWidth < 720 ? 8 : 16;
    function spawn(any) {
      return {
        color: COLORS[(Math.random() * COLORS.length) | 0],
        x: Math.random() * canvas.width,
        y: any ? Math.random() * canvas.height : -30 * dpr,
        vy: (0.2 + Math.random() * 0.5) * dpr,
        size: (3.5 + Math.random() * 6) * dpr,
        rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.02,
        phase: Math.random() * Math.PI * 2, sway: 0.3 + Math.random() * 0.5,
        squish: 0.55 + Math.random() * 0.3, alpha: 0.25 + Math.random() * 0.35
      };
    }
    for (var i = 0; i < COUNT; i++) petals.push(spawn(true));
    function draw(p) {
      var s = p.size;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, p.squish);
      ctx.beginPath(); ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * 0.9, -s * 0.5, s * 0.7, s * 0.6, 0, s);
      ctx.bezierCurveTo(-s * 0.7, s * 0.6, -s * 0.9, -s * 0.5, 0, -s);
      ctx.closePath(); ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha; ctx.fill();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath(); ctx.arc(0, -s, s * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = "source-over"; ctx.restore();
    }
    var t = 0;
    function tick() {
      requestAnimationFrame(tick);
      if (document.hidden) return;
      t += 0.016; ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < petals.length; i++) {
        var p = petals[i]; p.y += p.vy;
        p.x += Math.sin(t * p.sway + p.phase) * 0.4 * dpr; p.rot += p.vr;
        if (p.y > canvas.height + 40 * dpr) petals[i] = spawn(false);
        draw(p);
      }
    }
    tick();
  }
  if (!reduced) startPetals();

  /* split brighten paragraphs into words (needed with and without motion libs) */
  var brightenEls = [].slice.call(document.querySelectorAll("[data-brighten]"));
  brightenEls.forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    words.forEach(function (word, i) {
      var s = document.createElement("span");
      s.className = "w"; s.textContent = word;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
  });

  if (reduced || !window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.09 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function settle(el) { el.style.willChange = "auto"; }

  /* ---------- rise reveals ---------- */
  gsap.set(".rise", { autoAlpha: 0, y: 26 });

  /* hero is in view on load */
  var heroRise = gsap.utils.toArray(".hero .rise");
  gsap.to(heroRise, {
    autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.13, ease: "power2.out", delay: 0.15,
    onComplete: function () { heroRise.forEach(settle); }
  });

  /* everything else (except the pinned hub, handled separately) reveals on enter */
  gsap.utils.toArray(".rise").forEach(function (el) {
    if (el.closest(".hero") || el.closest(".hub")) return;
    gsap.to(el, {
      autoAlpha: 1, y: 0, duration: 0.9, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
      onComplete: function () { settle(el); }
    });
  });

  /* ---------- word-by-word brighten (HubX signature) ---------- */
  brightenEls.forEach(function (el) {
    gsap.to(el.querySelectorAll(".w"), {
      color: "#F4F1F5", ease: "none", stagger: 1,
      scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 58%", scrub: true }
    });
  });

  /* ---------- pinned medallion ---------- */
  var ribbons = gsap.utils.toArray(".ribbon");
  ribbons.forEach(function (p) {
    var len = p.getTotalLength();
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
  });
  gsap.set(".hub-core", { xPercent: -50, yPercent: -50, scale: 0.7, autoAlpha: 0.35 });
  gsap.set(".hub-card", { autoAlpha: 0, scale: 0.6, y: 24 });
  gsap.set(".hub-caption", { autoAlpha: 0, y: 26 });

  var hubTl = gsap.timeline({
    scrollTrigger: {
      trigger: ".hub", start: "top top", end: "+=150%",
      pin: ".hub-pin", scrub: 0.6, anticipatePin: 1
    }
  });
  hubTl
    .to(".hub-core", { scale: 1, autoAlpha: 1, duration: 0.4, ease: "power2.out" }, 0)
    .to(ribbons, { strokeDashoffset: 0, duration: 0.6, stagger: 0.12, ease: "power1.inOut" }, 0.18)
    .to(".hub-card", { autoAlpha: 1, scale: 1, y: 0, duration: 0.4, stagger: 0.16, ease: "back.out(1.5)" }, 0.42)
    .to(".hub-caption", { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" }, 0.62);

  /* subtle float on the icon images (separate element from the card reveal) */
  gsap.to(".card-osnote img", { y: 12, duration: 3.4, repeat: -1, yoyo: true, ease: "sine.inOut" });
  gsap.to(".card-sprout img", { y: -12, duration: 3.8, repeat: -1, yoyo: true, ease: "sine.inOut" });

  /* ---------- light mouse parallax on the medallion ---------- */
  if (matchMedia("(pointer: fine)").matches) {
    var cx = gsap.quickTo(".hub-core", "x", { duration: 1.1, ease: "power3.out" });
    var cy = gsap.quickTo(".hub-core", "y", { duration: 1.1, ease: "power3.out" });
    addEventListener("mousemove", function (e) {
      var nx = (e.clientX / innerWidth) * 2 - 1;
      var ny = (e.clientY / innerHeight) * 2 - 1;
      cx(nx * 14); cy(ny * 10);
    });
  }

  /* recalc after webfonts settle */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();
