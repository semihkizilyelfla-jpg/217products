/* 217 Products — sakura experiment
   Night-to-day sky scrub, drifting petal canvas, gentle reveals.
   Stack: Lenis + GSAP ScrollTrigger (CDN, guarded). */

(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis();
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------- sky: night fades through dawn into day ---------- */
  var skyTl = gsap.timeline({
    scrollTrigger: { trigger: "main", start: "top top", end: "bottom bottom", scrub: 0.4 }
  });
  skyTl
    .to(".sky-dawn", { opacity: 1, duration: 0.3 }, 0.12)
    .to(".sky-night", { opacity: 0, duration: 0.3 }, 0.18)
    .to(".sky-day", { opacity: 1, duration: 0.3 }, 0.38)
    .to(".sky-dawn", { opacity: 0, duration: 0.3 }, 0.44);

  /* hero copy drifts up and thins out as the night passes */
  gsap.to(".hero-copy", {
    yPercent: -30,
    autoAlpha: 0,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 30%", scrub: true }
  });

  /* intro */
  gsap.timeline({ defaults: { ease: "power3.out" } })
    .from(".hero h1", { y: 60, autoAlpha: 0, duration: 1.6 }, 0.2)
    .from(".hero-sub", { y: 20, autoAlpha: 0, duration: 1 }, "-=0.8")
    .from(".vlabel, .corner-hint, .top", { autoAlpha: 0, duration: 1 }, "-=0.5");

  /* reveals */
  gsap.set(".reveal", { y: 36, autoAlpha: 0 });
  ScrollTrigger.batch(".reveal", {
    start: "top 85%",
    once: true,
    onEnter: function (els) {
      gsap.to(els, { y: 0, autoAlpha: 1, duration: 1, stagger: 0.12, ease: "power2.out" });
    }
  });

  /* branch sways almost imperceptibly */
  gsap.to(".branch-top", {
    rotation: 6,
    transformOrigin: "10% 90%",
    duration: 6,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  });

  /* ---------- petal canvas ---------- */
  var canvas = document.getElementById("petalCanvas");
  var ctx = canvas.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var petals = [];
  var wind = 0;
  var lastMouseX = null;
  var sprites = [];
  var loaded = 0;

  for (var i = 1; i <= 6; i++) {
    var img = new Image();
    img.src = "assets/petal-" + i + ".png";
    img.onload = function () { loaded++; };
    sprites.push(img);
  }

  function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
  }
  resize();
  window.addEventListener("resize", resize);

  var COUNT = window.innerWidth < 720 ? 12 : 22;

  function spawn(anywhere) {
    return {
      sprite: sprites[Math.floor(Math.random() * sprites.length)],
      x: Math.random() * canvas.width,
      y: anywhere ? Math.random() * canvas.height : -60 * dpr,
      vy: (0.35 + Math.random() * 0.7) * dpr,
      size: (14 + Math.random() * 22) * dpr,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.02,
      phase: Math.random() * Math.PI * 2,
      sway: 0.3 + Math.random() * 0.5
    };
  }
  for (var p = 0; p < COUNT; p++) petals.push(spawn(true));

  window.addEventListener("mousemove", function (e) {
    if (lastMouseX !== null) {
      var dx = e.clientX - lastMouseX;
      wind += Math.max(-2.5, Math.min(2.5, dx * 0.02));
    }
    lastMouseX = e.clientX;
  });

  var t = 0;
  function tick() {
    if (document.hidden) { requestAnimationFrame(tick); return; }
    t += 0.016;
    wind *= 0.96;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (loaded === sprites.length) {
      for (var i = 0; i < petals.length; i++) {
        var pt = petals[i];
        pt.y += pt.vy;
        pt.x += Math.sin(t * pt.sway + pt.phase) * 0.6 * dpr + wind * dpr;
        pt.rot += pt.vr + wind * 0.002;
        if (pt.y > canvas.height + 80 * dpr) petals[i] = spawn(false);
        if (pt.x > canvas.width + 80 * dpr) pt.x = -60 * dpr;
        if (pt.x < -80 * dpr) pt.x = canvas.width + 60 * dpr;
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rot);
        ctx.globalAlpha = 0.85;
        ctx.drawImage(pt.sprite, -pt.size / 2, -pt.size / 2, pt.size, pt.size);
        ctx.restore();
      }
    }
    requestAnimationFrame(tick);
  }
  tick();
})();
