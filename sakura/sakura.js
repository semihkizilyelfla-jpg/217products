/* 217 Products — washi edition
   HubX mechanics on a bright canvas: word-by-word scroll-brighten
   text and a pinned brush "217" medallion where an ensō circle draws
   itself, ribbons ink outward and product seals settle in.
   Stack: Lenis + GSAP ScrollTrigger (CDN, guarded). */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- gentle ambient petals ---------- */
  function startPetals() {
    var canvas = document.getElementById("petals");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var COLORS = ["#E4A28C", "#AFbf95", "#E2B24B"];
    var petals = [];
    function resize() { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; }
    resize(); addEventListener("resize", resize);
    var COUNT = innerWidth < 720 ? 6 : 12;
    function spawn(any) {
      return {
        color: COLORS[(Math.random() * COLORS.length) | 0],
        x: Math.random() * canvas.width,
        y: any ? Math.random() * canvas.height : -30 * dpr,
        vy: (0.18 + Math.random() * 0.4) * dpr,
        size: (3.5 + Math.random() * 5) * dpr,
        rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.02,
        phase: Math.random() * Math.PI * 2, sway: 0.3 + Math.random() * 0.5,
        squish: 0.55 + Math.random() * 0.3, alpha: 0.16 + Math.random() * 0.22
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
      ctx.restore();
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

  /* split brighten paragraphs into words */
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
  var heroRise = gsap.utils.toArray(".hero .rise");
  gsap.to(heroRise, {
    autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.12, ease: "power2.out", delay: 0.12,
    onComplete: function () { heroRise.forEach(settle); }
  });
  gsap.utils.toArray(".rise").forEach(function (el) {
    if (el.closest(".hero") || el.closest(".hub")) return;
    gsap.to(el, {
      autoAlpha: 1, y: 0, duration: 0.9, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
      onComplete: function () { settle(el); }
    });
  });

  /* ---------- word-by-word brighten ---------- */
  brightenEls.forEach(function (el) {
    gsap.to(el.querySelectorAll(".w"), {
      color: getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#1E1A16",
      ease: "none", stagger: 1,
      scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 58%", scrub: true }
    });
  });

  /* ---------- pinned medallion ---------- */
  var enso = document.querySelector(".enso-path");
  var ribbons = gsap.utils.toArray(".ribbon");
  if (enso) {
    var el = enso.getTotalLength();
    enso.style.strokeDasharray = el; enso.style.strokeDashoffset = el;
  }
  ribbons.forEach(function (p) {
    var len = p.getTotalLength();
    p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
  });
  gsap.set(".hub-core", { xPercent: -50, yPercent: -50, scale: 0.72, autoAlpha: 0.3 });
  gsap.set(".hub-seal", { autoAlpha: 0, scale: 0.6, y: 22 });
  gsap.set(".hub-caption", { autoAlpha: 0, y: 26 });

  var hubTl = gsap.timeline({
    scrollTrigger: { trigger: ".hub", start: "top top", end: "+=160%", pin: ".hub-pin", scrub: 0.6, anticipatePin: 1 }
  });
  hubTl
    .to(enso, { strokeDashoffset: 0, duration: 0.55, ease: "power1.inOut" }, 0)
    .to(".hub-core", { scale: 1, autoAlpha: 1, duration: 0.4, ease: "power2.out" }, 0.28)
    .to(ribbons, { strokeDashoffset: 0, duration: 0.5, stagger: 0.12, ease: "power1.inOut" }, 0.5)
    .to(".hub-seal", { autoAlpha: 1, scale: 1, y: 0, duration: 0.4, stagger: 0.16, ease: "back.out(1.5)" }, 0.68)
    .to(".hub-caption", { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" }, 0.86);

  gsap.to(".seal-osnote", { y: 10, duration: 3.4, repeat: -1, yoyo: true, ease: "sine.inOut" });
  gsap.to(".seal-next", { y: -10, duration: 3.8, repeat: -1, yoyo: true, ease: "sine.inOut" });

  /* ---------- light mouse parallax ---------- */
  if (matchMedia("(pointer: fine)").matches) {
    var cx = gsap.quickTo(".hub-core", "x", { duration: 1.1, ease: "power3.out" });
    var cy = gsap.quickTo(".hub-core", "y", { duration: 1.1, ease: "power3.out" });
    addEventListener("mousemove", function (e) {
      var nx = (e.clientX / innerWidth) * 2 - 1;
      var ny = (e.clientY / innerHeight) * 2 - 1;
      cx(nx * 12); cy(ny * 9);
    });
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();
