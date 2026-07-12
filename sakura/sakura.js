/* 217 Products — ukiyo-e maximalist edition
   Layered 3D-parallax hero (scroll + mouse), section parallax, an
   infinite marquee, word-by-word scroll-brighten text and a pinned
   self-drawing ensō medallion. Stack: Lenis + GSAP ScrollTrigger. */

(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- ambient petals ---------- */
  function startPetals() {
    var canvas = document.getElementById("petals");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var COLORS = ["#E4A28C", "#C39A46", "#AFBF95", "#E2B24B"];
    var petals = [];
    function resize() { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; }
    resize(); addEventListener("resize", resize);
    var COUNT = innerWidth < 720 ? 8 : 16;
    function spawn(any) {
      return { color: COLORS[(Math.random()*COLORS.length)|0], x: Math.random()*canvas.width,
        y: any ? Math.random()*canvas.height : -30*dpr, vy: (0.2+Math.random()*0.5)*dpr,
        size: (3.5+Math.random()*6)*dpr, rot: Math.random()*Math.PI*2, vr: (Math.random()-0.5)*0.02,
        phase: Math.random()*Math.PI*2, sway: 0.3+Math.random()*0.5, squish: 0.55+Math.random()*0.3,
        alpha: 0.14+Math.random()*0.22 };
    }
    for (var i=0;i<COUNT;i++) petals.push(spawn(true));
    function draw(p){ var s=p.size; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.scale(1,p.squish);
      ctx.beginPath(); ctx.moveTo(0,-s); ctx.bezierCurveTo(s*0.9,-s*0.5,s*0.7,s*0.6,0,s);
      ctx.bezierCurveTo(-s*0.7,s*0.6,-s*0.9,-s*0.5,0,-s); ctx.closePath();
      ctx.fillStyle=p.color; ctx.globalAlpha=p.alpha; ctx.fill(); ctx.restore(); }
    var t=0;
    function tick(){ requestAnimationFrame(tick); if(document.hidden) return; t+=0.016;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      for(var i=0;i<petals.length;i++){ var p=petals[i]; p.y+=p.vy;
        p.x+=Math.sin(t*p.sway+p.phase)*0.4*dpr; p.rot+=p.vr;
        if(p.y>canvas.height+40*dpr) petals[i]=spawn(false); draw(p); } }
    tick();
  }
  if (!reduced) startPetals();

  /* split brighten paragraphs into words */
  var brightenEls = [].slice.call(document.querySelectorAll("[data-brighten]"));
  brightenEls.forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    words.forEach(function (word, i) {
      var s = document.createElement("span"); s.className = "w"; s.textContent = word;
      el.appendChild(s); if (i < words.length-1) el.appendChild(document.createTextNode(" "));
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
  function settle(el){ el.style.willChange = "auto"; }

  /* flipped decorative images owned by GSAP */
  gsap.set(".pl-branch-r, .final-branch", { scaleX: -1 });

  /* ---------- rise reveals ---------- */
  gsap.set(".rise", { autoAlpha: 0, y: 26 });
  var heroRise = gsap.utils.toArray(".hero .rise");
  gsap.to(heroRise, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.12, ease: "power2.out", delay: 0.15,
    onComplete: function(){ heroRise.forEach(settle); } });
  gsap.utils.toArray(".rise").forEach(function (el) {
    if (el.closest(".hero") || el.closest(".hub")) return;
    gsap.to(el, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true }, onComplete: function(){ settle(el); } });
  });

  /* ---------- word-by-word brighten ---------- */
  var inkColor = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#1E1A16";
  brightenEls.forEach(function (el) {
    gsap.to(el.querySelectorAll(".w"), { color: inkColor, ease: "none", stagger: 1,
      scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 58%", scrub: true } });
  });

  /* ---------- hero scroll-assemble (photo builds element by element) ---------- */
  var scene = document.getElementById("scene");
  gsap.set(".pl-sky", { autoAlpha: 0 });
  gsap.set(".pl-mount", { autoAlpha: 0, yPercent: 15 });
  gsap.set(".pl-fore", { autoAlpha: 0, yPercent: 22 });
  gsap.set(".pl-torii", { autoAlpha: 0, yPercent: -16 });

  gsap.timeline({
    scrollTrigger: { trigger: ".hero", start: "top top", end: "+=230%", pin: true, scrub: 0.5, anticipatePin: 1 }
  })
    .to(".pl-mount", { autoAlpha: 1, yPercent: 0, ease: "power2.out", duration: 0.22 }, 0.06)   /* 1 · mountains */
    .to(".pl-sky",   { autoAlpha: 1, ease: "power2.out", duration: 0.22 }, 0.30)                 /* 2 · sky */
    .to(".pl-fore",  { autoAlpha: 1, yPercent: 0, ease: "power2.out", duration: 0.22 }, 0.52)    /* 3 · path + foreground */
    .to(".pl-torii", { autoAlpha: 1, yPercent: 0, ease: "power2.out", duration: 0.26 }, 0.74);   /* 4 · torii */

  /* light mouse parallax on the assembled layers */
  if (matchMedia("(pointer: fine)").matches) {
    var setters = gsap.utils.toArray(".hero-scene .pl").map(function (el) {
      var d = parseFloat(el.dataset.depth) || 0.2;
      return { x: gsap.quickTo(el, "x", { duration: 0.9, ease: "power3.out" }),
               y: gsap.quickTo(el, "y", { duration: 0.9, ease: "power3.out" }), d: d };
    });
    var rotY = gsap.quickTo(scene, "rotationY", { duration: 1.0, ease: "power3.out" });
    var rotX = gsap.quickTo(scene, "rotationX", { duration: 1.0, ease: "power3.out" });
    addEventListener("mousemove", function (e) {
      var nx = (e.clientX / innerWidth) * 2 - 1, ny = (e.clientY / innerHeight) * 2 - 1;
      setters.forEach(function (s) { s.x(nx * -18 * s.d); s.y(ny * -11 * s.d); });
      rotY(nx * 3.0); rotX(-ny * 2.0);
    });
  }

  /* ---------- section parallax ---------- */
  gsap.utils.toArray("[data-parallax]").forEach(function (el) {
    var f = parseFloat(el.dataset.parallax) || 0.12;
    gsap.fromTo(el, { yPercent: -f * 100 }, { yPercent: f * 100, ease: "none",
      scrollTrigger: { trigger: el.closest("section") || el, start: "top bottom", end: "bottom top", scrub: true } });
  });

  /* ---------- marquee ---------- */
  var marq = document.getElementById("marqRow");
  if (marq) gsap.to(marq, { xPercent: -50, duration: 26, ease: "none", repeat: -1 });

  /* ---------- pinned medallion ---------- */
  var enso = document.querySelector(".enso-path");
  var ribbons = gsap.utils.toArray(".ribbon");
  if (enso) { var el0 = enso.getTotalLength(); enso.style.strokeDasharray = el0; enso.style.strokeDashoffset = el0; }
  ribbons.forEach(function (p) { var len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len; });
  gsap.set(".hub-core", { xPercent: -50, yPercent: -50, scale: 0.72, autoAlpha: 0.3 });
  gsap.set(".hub-seal", { autoAlpha: 0, scale: 0.6, y: 22 });
  gsap.set(".hub-caption", { autoAlpha: 0, y: 26 });

  var hubTl = gsap.timeline({
    scrollTrigger: { trigger: ".hub", start: "top top", end: "+=170%", pin: ".hub-pin", scrub: 0.6, anticipatePin: 1 }
  });
  hubTl
    .to(enso, { strokeDashoffset: 0, duration: 0.5, ease: "power1.inOut" }, 0)
    .to(".hub-core", { scale: 1, autoAlpha: 1, duration: 0.4, ease: "power2.out" }, 0.26)
    .to(ribbons, { strokeDashoffset: 0, duration: 0.5, stagger: 0.1, ease: "power1.inOut" }, 0.46)
    .to(".hub-seal", { autoAlpha: 1, scale: 1, y: 0, duration: 0.4, stagger: 0.12, ease: "back.out(1.5)" }, 0.62)
    .to(".hub-caption", { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" }, 0.85);

  gsap.to(".seal-osnote", { y: 10, duration: 3.4, repeat: -1, yoyo: true, ease: "sine.inOut" });
  gsap.to(".seal-next", { y: -10, duration: 3.8, repeat: -1, yoyo: true, ease: "sine.inOut" });
  gsap.to(".seal-idea", { y: 8, duration: 4.2, repeat: -1, yoyo: true, ease: "sine.inOut" });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();
