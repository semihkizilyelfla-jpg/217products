/* 217 Products — sakura (cinematic edition)
   The tree video is scrubbed by page scroll: scroll down and the
   camera recedes + rotates; scroll up and it returns. Night lifts
   into a warm dawn near the end. Text resolves from blur to sharp.
   Stack: Lenis + GSAP ScrollTrigger (CDN, guarded). */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var video = document.getElementById("tree");

  /* lighter clip on small screens */
  if (video && window.matchMedia("(max-width: 820px)").matches) {
    var src = document.getElementById("treeSrc");
    if (src) { src.src = "assets/tree-mobile.mp4"; video.load(); }
  }

  /* ---------- petals: soft foreground drift ---------- */
  function startPetals() {
    var canvas = document.getElementById("petals");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var COLORS = ["#F4A6C1", "#FFE1EA", "#EFA44F"];
    var petals = [];

    function resize() { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; }
    resize();
    addEventListener("resize", resize);

    var COUNT = innerWidth < 720 ? 10 : 20;
    function spawn(any) {
      return {
        color: COLORS[(Math.random() * COLORS.length) | 0],
        x: Math.random() * canvas.width,
        y: any ? Math.random() * canvas.height : -30 * dpr,
        vy: (0.25 + Math.random() * 0.55) * dpr,
        size: (4 + Math.random() * 7) * dpr,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.025,
        phase: Math.random() * Math.PI * 2,
        sway: 0.3 + Math.random() * 0.5,
        squish: 0.55 + Math.random() * 0.3,
        alpha: 0.4 + Math.random() * 0.45
      };
    }
    for (var i = 0; i < COUNT; i++) petals.push(spawn(true));

    function draw(p) {
      var s = p.size;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, p.squish);
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * 0.9, -s * 0.5, s * 0.7, s * 0.6, 0, s);
      ctx.bezierCurveTo(-s * 0.7, s * 0.6, -s * 0.9, -s * 0.5, 0, -s);
      ctx.closePath();
      ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha; ctx.fill();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath(); ctx.arc(0, -s, s * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();
    }

    var t = 0;
    function tick() {
      requestAnimationFrame(tick);
      if (document.hidden) return;
      t += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < petals.length; i++) {
        var p = petals[i];
        p.y += p.vy;
        p.x += Math.sin(t * p.sway + p.phase) * 0.5 * dpr;
        p.rot += p.vr;
        if (p.y > canvas.height + 40 * dpr) petals[i] = spawn(false);
        draw(p);
      }
    }
    tick();
  }

  if (!reduced) startPetals();

  /* without the animation libs, content is already visible — stop here */
  if (reduced || !window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.09 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------- scroll-scrubbed tree video ---------- */
  var dur = 0, target = 0, cur = 0, ready = false;

  if (video) {
    video.addEventListener("loadedmetadata", function () { dur = video.duration || 5; });
    video.addEventListener("canplay", function () { ready = true; }, { once: true });
    /* prime iOS/Safari so seeking works without a visible play */
    var prime = function () {
      var pr = video.play();
      if (pr && pr.then) pr.then(function () { video.pause(); }).catch(function () {});
      else { try { video.pause(); } catch (e) {} }
    };
    if (video.readyState >= 1) { dur = video.duration || 5; prime(); }
    else video.addEventListener("loadeddata", prime, { once: true });

    ScrollTrigger.create({
      trigger: "main", start: "top top", end: "bottom bottom",
      onUpdate: function (self) { target = self.progress; }
    });

    /* ease toward the scroll target for a buttery seek */
    gsap.ticker.add(function () {
      if (!ready || !dur) return;
      cur += (target - cur) * 0.12;
      var tt = cur * (dur - 0.05);
      if (Math.abs(video.currentTime - tt) > 0.008) {
        try { video.currentTime = tt; } catch (e) {}
      }
    });

    /* amplify the pull-back: the tree also scales down as you scroll,
       so the recede reads clearly on top of the video's own dolly */
    gsap.fromTo(".tree", { scale: 1.22 }, {
      scale: 1.0, ease: "none",
      scrollTrigger: { trigger: "main", start: "top top", end: "bottom bottom", scrub: 0.6 }
    });
  }

  /* ---------- night -> dawn ---------- */
  var dawn = document.getElementById("dawn");
  if (dawn) {
    ScrollTrigger.create({
      trigger: ".final", start: "top bottom", end: "bottom bottom",
      onUpdate: function (self) { dawn.style.opacity = (self.progress * 0.95).toFixed(3); }
    });
  }

  /* ---------- reveals: blur -> sharp ---------- */
  function settle(el) { el.style.filter = ""; el.style.willChange = "auto"; }

  gsap.set(".reveal", { autoAlpha: 0, y: 24, filter: "blur(14px)" });

  /* hero copy is already in view — play it in on load */
  var heroReveals = gsap.utils.toArray(".hero .reveal");
  gsap.to(heroReveals, {
    autoAlpha: 1, y: 0, filter: "blur(0px)",
    duration: 1.2, stagger: 0.14, ease: "power2.out", delay: 0.15,
    onComplete: function () { heroReveals.forEach(settle); }
  });

  /* below-fold copy resolves as each element enters */
  gsap.utils.toArray(".reveal").forEach(function (el) {
    if (el.closest(".hero")) return;
    gsap.to(el, {
      autoAlpha: 1, y: 0, filter: "blur(0px)",
      duration: 1.0, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
      onComplete: function () { settle(el); }
    });
  });

  /* ---------- light mouse parallax on the stage ---------- */
  if (matchMedia("(pointer: fine)").matches) {
    var tx = gsap.quickTo(".tree", "x", { duration: 1.2, ease: "power3.out" });
    var ty = gsap.quickTo(".tree", "y", { duration: 1.2, ease: "power3.out" });
    addEventListener("mousemove", function (e) {
      var nx = (e.clientX / innerWidth) * 2 - 1;
      var ny = (e.clientY / innerHeight) * 2 - 1;
      tx(nx * -18); ty(ny * -12);
    });
  }
})();
