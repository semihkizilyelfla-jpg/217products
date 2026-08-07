/* 217 Products — ukiyo-e maximalist edition
   Layered 3D-parallax hero (scroll + mouse), section parallax, an
   infinite marquee, word-by-word scroll-brighten text and a pinned
   self-drawing ensō medallion. Stack: Lenis + GSAP ScrollTrigger. */

(function () {
  "use strict";
  /* ?motion=reduce mirrors the OS setting for testing — same code path */
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
                /[?&]motion=reduce/.test(location.search);

  /* ---------- contact e-mail: ONE place to change ----------
     When the corporate mailbox on the domain is ready, update this constant —
     every a[data-mail] link (nav, closing CTA, footer) and the printed address
     (a[data-mail][data-mail-text]) follow automatically. The mailto in the
     HTML is only the no-JS fallback. */
  var CONTACT_EMAIL = "destek217product@gmail.com";
  [].forEach.call(document.querySelectorAll("a[data-mail]"), function (a) {
    a.href = "mailto:" + CONTACT_EMAIL;
    if (a.hasAttribute("data-mail-text")) a.textContent = CONTACT_EMAIL;
  });

  /* ---------- deck backdrop offset ----------
     The paper sheet that slides over the parked hero starts exactly at the
     hero's bottom. 100svh is only a first guess — on short landscape screens
     the hero can be taller, and a fixed guess would cover its last rows. */
  (function () {
    var hero = document.querySelector(".hero");
    if (!hero) return;
    function sync() {
      document.documentElement.style.setProperty("--hero-h", Math.round(hero.offsetHeight) + "px");
    }
    sync();
    addEventListener("load", sync);
    addEventListener("resize", sync, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync);
  })();

  /* ---------- nav: scrolled "washi ribbon" state — runs regardless of GSAP ----------
     Also flags <html>. The ensō is only clickable while the hero is at rest:
     once the ink starts growing it covers the viewport, and a full-screen
     click target would swallow every link on the page under it. */
  (function () {
    var nav = document.querySelector(".nav");
    var de = document.documentElement;
    function onScroll() {
      var y = window.scrollY || 0;
      var past = y > 40;
      if (nav) nav.classList.toggle("is-scrolled", past);
      de.classList.toggle("scrolled", past);
      /* the wordmark and the mist band belong to the opening screen and step
         away once the ink has taken the page; the capsule and the rail stay */
      de.classList.toggle("past-hero", y > (parseInt(getComputedStyle(de).getPropertyValue("--hero-h"), 10) || innerHeight) * 0.55);
    }
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  })();

  /* ---------- mobile nav (hamburger) — runs regardless of GSAP ---------- */
  (function () {
    var t = document.getElementById("navToggle"), n = document.getElementById("navLinks");
    if (!t || !n) return;
    function close() {
      n.classList.remove("open"); t.classList.remove("is-open");
      t.setAttribute("aria-expanded", "false");
      document.documentElement.classList.remove("menu-open");
    }
    t.addEventListener("click", function () {
      var open = n.classList.toggle("open");
      t.classList.toggle("is-open", open);
      t.setAttribute("aria-expanded", open ? "true" : "false");
      document.documentElement.classList.toggle("menu-open", open); /* scroll lock */
    });
    [].forEach.call(n.querySelectorAll("a"), function (a) { a.addEventListener("click", close); });
    addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  })();

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

  /* No animation path (reduced-motion or GSAP unavailable): reveal any entrance
     elements the CSS hid up front, so content is never stuck invisible. */
  if (reduced || !window.gsap || !window.ScrollTrigger) {
    [].forEach.call(document.querySelectorAll(".rise"), function (el) {
      el.style.opacity = "1"; el.style.transform = "none";
    });
    /* no scroll animation → the ensō stays a ring, and the hero keeps its
       resting state. The plate layers are revealed by the boot script. */
    document.documentElement.classList.add("no-motion");
    /* word-brighten scrub won't run → give the words full ink */
    [].forEach.call(document.querySelectorAll(".brighten .w"), function (el) {
      el.style.color = "var(--ink)";
    });
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  /* Phones hide/show the browser chrome while scrolling, which fires resize and
     made ScrollTrigger recalc everything MID-SCROLL — the page visibly jumped.
     This tells it to ignore those height-only mobile resizes (GSAP's official
     cure); real orientation/width changes still refresh normally. */
  ScrollTrigger.config({ ignoreMobileResize: true });

  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.12 }); /* tighter, more responsive glide */
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* in-page anchors glide with Lenis instead of teleporting */
  [].forEach.call(document.querySelectorAll('a[href^="#"]'), function (a) {
    a.addEventListener("click", function (e) {
      var target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.35, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
      else target.scrollIntoView({ behavior: "smooth" });
    });
  });
  function settle(el){ el.style.willChange = "auto"; }

  /* flipped decorative images owned by GSAP */
  gsap.set(".pl-branch-r, .final-branch", { scaleX: -1 });

  /* ---------- rise reveals ----------
     The hero entrance is pure CSS (it starts with the first paint, before any
     CDN script arrives) — GSAP only drives the below-fold, scroll-gated reveals. */
  /* The shelf is excluded: it is the first thing you see after the ink lands,
     and it gets its own choreography further down rather than the generic
     fade-up every other block uses. */
  var belowRise = gsap.utils.toArray(".rise").filter(function (el) {
    return !el.closest(".hero") && !el.closest(".products");
  });
  gsap.set(belowRise, { autoAlpha: 0, y: 26 });
  belowRise.forEach(function (el) {
    gsap.to(el, { autoAlpha: 1, y: 0, duration: 1.2, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true }, onComplete: function(){ settle(el); } });
  });

  /* ---------- word-by-word brighten ---------- */
  var inkColor = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#1E1A16";
  brightenEls.forEach(function (el) {
    gsap.to(el.querySelectorAll(".w"), { color: inkColor, ease: "none", stagger: 1,
      scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 58%", scrub: true } });
  });

  /* ---------- hero: scene 1 loads with the site; sky + torii assemble on scroll ----------
     Scene 1 (the landscape) fades in on load with the copy, so the site never
     opens blank. Scrolling then builds scene 2 (sky) and scene 3 (torii),
     evenly paced. Reduced pin distance keeps the first scroll gentle. */
  /* Desktop and touch setups live in gsap.matchMedia so crossing the 820px
     boundary (window narrowed then restored, device rotation, snap layouts)
     tears one mode down cleanly and builds the other — the pin no longer
     depends on the width the page happened to LOAD at. */
  var mm = gsap.matchMedia();

  /* ---------- THE INK ----------
     The whole opening gesture. The ensō sitting in the sentence fills solid,
     then is scaled from its own centre until it floods the screen and the dark
     shelf below takes over inside that ink. Runs on every width — it IS the
     transition, not an enhancement.
     The scale needed is derived, not guessed: the disc has to reach the far
     corner of the viewport from wherever the sentence happens to put it. */
  (function () {
    var blot = document.querySelector(".blot");
    if (!blot) return;
    var ring = blot.querySelectorAll(".blot-ink, .blot-figure");
    var fill = blot.querySelector(".blot-fill");

    function neededScale() {
      var r = blot.getBoundingClientRect();
      if (!r.width) return 24;
      /* getBoundingClientRect already includes the live scroll transform, so
         divide it back out — otherwise every refresh mid-flood reads a huge
         width and collapses the target scale. */
      var s = gsap.getProperty(blot, "scaleX") || 1;
      var w = r.width / s;
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var far = Math.max(
        Math.hypot(cx, cy),
        Math.hypot(innerWidth - cx, cy),
        Math.hypot(cx, innerHeight - cy),
        Math.hypot(innerWidth - cx, innerHeight - cy));
      return (far * 2) / w * 1.06; /* +6% so no rim shows at the corner */
    }

    /* ---- timing, measured off the reference rather than guessed ----
       Its circle holds at 1:1 for the first ~80px of scroll (9% of a viewport),
       then grows on a dead-straight linear ramp, and has swallowed the whole
       screen by scrollY ~205 — under a quarter of one screen.
       Ours used to finish at ~519px. Two and a half times too slow is not a
       slower version of the same gesture; it turns a flood into a black ball
       you sit and watch expand. Same shape now: hold, then go.
         hold  = 0.37 * 0.26vh = ~87px on a 900-tall screen
         cover = ~218px */
    var RIDE = 0.26, HOLD = 0.37;
    function inkEase(p) { return p < HOLD ? 0 : (p - HOLD) / (1 - HOLD); }

    gsap.fromTo(blot, { scale: 1 }, {
      scale: function () { return neededScale() * 1.12; },
      ease: inkEase, force3D: true,
      scrollTrigger: { start: 0, end: function () { return window.innerHeight * RIDE; },
                       scrub: true, invalidateOnRefresh: true }
    });
    /* the ring closes into a solid disc INSIDE the hold, so growth always
       starts from a finished circle and never from a half-drawn one */
    if (fill) gsap.to(fill, { opacity: 1, ease: "power1.in", scrollTrigger: {
      start: 0, end: function () { return window.innerHeight * 0.075; }, scrub: true, invalidateOnRefresh: true } });
    /* the painted rim and the figure both dissolve inside the hold, so what
       actually floods the page is the flat disc and nothing else */
    if (ring.length) gsap.to(ring, { opacity: 0, ease: "none", scrollTrigger: {
      start: function () { return window.innerHeight * 0.04; },
      end: function () { return window.innerHeight * 0.085; }, scrub: true, invalidateOnRefresh: true } });

    /* No fade on the hero copy. GSAP would capture its start opacity while the
       WAAPI entrance is still mid-flight and animate 0 -> 0, blanking the hero.
       It isn't needed either: the ink sits above the copy in the stack, so the
       growing disc covers the words on its own. */
  })();

  /* ---------- the figure in the ink ----------
     The reference parks an animated mascot inside its circle, and that is what
     stops the circle reading as a placeholder. Ours is a Choju-giga rabbit with
     a calligraphy brush — the lineage that Japanese cartooning actually comes
     from, and a brush because writing is what we build.
     Two motions: a slow idle so it is alive at rest, and a hop when the circle
     is touched. The hop pauses the idle rather than tweening the same property
     from two places, which would fight frame by frame. */
  (function () {
    var fig = document.querySelector(".blot-figure");
    var blot = document.querySelector(".blot");
    if (!fig || !blot) return;
    gsap.set(fig, { transformOrigin: "50% 100%" });
    var idle = gsap.to(fig, { y: -6, rotation: 1.1, duration: 2.2,
      ease: "sine.inOut", yoyo: true, repeat: -1 });
    var hopping = false;
    function hop() {
      if (hopping) return;
      hopping = true; idle.pause();
      gsap.timeline({ onComplete: function () { hopping = false; idle.restart(); } })
        .to(fig, { y: -34, rotation: 0, scaleY: 1.06, duration: 0.24, ease: "power2.out" })
        .to(fig, { y: 0, scaleY: 1, duration: 0.62, ease: "bounce.out" });
    }
    blot.addEventListener("mouseenter", hop);
    blot.addEventListener("click", hop);
  })();

  /* ============================================================
     THE FLIGHT — the momonga comes at you, and the ink is its wake
     ------------------------------------------------------------
     It does not travel across the screen; it travels toward you. That single
     decision fixes the thing that made the earlier build look cheap — a sprite
     sliding around a page always looks like a sticker on a slide — and it
     solves a real constraint at the same time: the animal is cream and so is
     the paper, so anything moving sideways over the hero would vanish until
     the ink caught up. Growing from the SAME centre as the flood, it is
     silhouetted on black from the first frame to the last, because the ink is
     always opening faster than it is.
     It starts the instant you touch the wheel, while the ink is still holding
     its shape — the squirrel is the cause, the flood is the effect.
     ============================================================ */
  (function () {
    var flier = document.querySelector(".flier");
    var rush = document.querySelector(".rush");
    var blot = document.querySelector(".blot");
    var seat = document.querySelector(".blot-figure");
    if (!flier || !blot) return;

    var near = flier.querySelector(".pose-near");
    var flare = flier.querySelector(".pose-flare");
    var de = document.documentElement;

    var geo = null;
    function measure() {
      /* the disc's box grows with the flood but its CENTRE never moves — the
         hero is sticky, so this is one fixed point on the screen */
      var b = blot.getBoundingClientRect();
      var bs = Math.abs(gsap.getProperty(blot, "scaleX") || 1);
      /* The flier is sized from the figure ALREADY SITTING IN THE DISC, not
         from a viewport clamp. A clamp is right at one width and wrong at every
         other: on a phone it came out 15% larger than the disc, so the handoff
         on the first frame was a visible jump. Taken from the seat, scale 1 is
         the seat, exactly, at every viewport. */
      var w = 240;
      if (seat) {
        var sr = seat.getBoundingClientRect();
        if (sr.width) w = sr.width / bs;
      }
      flier.style.width = w.toFixed(1) + "px";
      return { cx: b.left + b.width / 2, cy: b.top + b.height / 2,
               fw: w, fh: w * (986 / 1160) };
    }

    /* The ink HOLDS its shape for the first stretch — that pause is the whole
       reason you register it as a circle before it becomes a flood. The animal
       has to hold with it, or it outgrows the disc it is sitting in and its
       cream edges spill onto cream paper, which just reads as a clipped
       sprite. Measured: without this it was 16% wider than the ink at the
       moment the flood finally opened.
       HOLD is the ink's own hold expressed in this trigger's units:
       0.37 of a 0.26vh ride, inside a 0.42vh flight. */
    var HOLD = 0.229;
    /* Distance in a straight line looks like a lift, not an approach. Real
       approach is exponential: almost nothing for a long time, then the last
       third eats the screen. */
    function depth(p) {
      if (p <= HOLD) return 0;
      return Math.pow((p - HOLD) / (1 - HOLD), 2.35);
    }

    function place(p) {
      if (!geo) geo = measure();
      var d = depth(p);
      /* during the hold it only gathers itself — a couple of percent, enough
         that the screen answers your finger without breaking the circle */
      var tense = Math.min(1, p / HOLD);
      var scale = 1 + tense * 0.07 + d * 9.4;
      /* it does not come at your eye but just past your shoulder, so the drift
         grows with the approach instead of being a straight zoom */
      var dx = -d * geo.fw * 1.15;
      var dy = -d * geo.fh * 0.62;
      gsap.set(flier, {
        x: geo.cx - geo.fw / 2 + dx,
        y: geo.cy - geo.fh / 2 + dy,
        scale: scale,
        rotation: -tense * 1.5 - d * 16,
        /* it passes the lens and is gone — held to full opacity until the very
           end, because a slow fade would read as a ghost rather than a body */
        opacity: p < 0.02 ? p / 0.02 : (p > 0.80 ? Math.max(0, 1 - (p - 0.80) / 0.20) : 1)
      });
      /* the membrane flares open the moment before it passes */
      var flaring = p > 0.72;
      if (flare && flare.__on !== flaring) {
        flare.__on = flaring;
        gsap.to(flare, { opacity: flaring ? 1 : 0, duration: 0.34, ease: "power2.out", overwrite: true });
        gsap.to(near, { opacity: flaring ? 0 : 1, duration: 0.34, ease: "power2.out", overwrite: true });
      }
      /* shuchusen — the converging speed lines a woodblock uses for something
         moving fast at the viewer. They open with the animal and outrun it. */
      if (rush) {
        gsap.set(rush, {
          x: geo.cx, y: geo.cy,
          scale: 0.18 + d * 13,
          opacity: p < HOLD ? 0 : Math.min(1, (p - HOLD) / 0.16) * (1 - Math.max(0, (p - 0.78) / 0.22)) * 0.5
        });
      }
    }

    ScrollTrigger.create({
      start: 0,
      end: function () { return innerHeight * 0.42; },
      scrub: true, invalidateOnRefresh: true,
      onRefresh: function () { geo = null; },
      onUpdate: function (self) {
        var p = self.progress;
        var on = p > 0.001 && p < 0.999;
        de.classList.toggle("in-flight", on);
        /* the seat in the disc hands over on the first frame and takes the
           figure back if you scroll all the way home */
        if (seat) gsap.set(seat, { opacity: p > 0.004 ? 0 : 1 });
        if (p > 0.001) place(p);
      }
    });

    addEventListener("resize", function () { geo = null; }, { passive: true });
  })();

  /* ---------- the ink comes alive ----------
     The reference's toy takes the decorations already scattered on its hero and
     drops them into a physics world, where they tumble and pile up. That is why
     it lands: it doesn't spawn a separate effect, it makes the page you are
     already looking at fall over.
     Ours does the same with the sumi specks. Tap the ink and every mark on the
     sheet lets go, falls, bounces off the others and settles along the ridge.
     Hand-rolled instead of pulling in a physics library: every mark here is a
     circle, and circle-against-circle is the one collision case that is three
     lines of maths. Tap again and they get thrown back up. */
  (function () {
    var hero = document.querySelector(".hero");
    var wrap = document.querySelector(".specks");
    var btn = document.getElementById("inkTap");
    if (!hero || !wrap) return;

    var G = 2000, AIR = 0.9985, BOUNCE = 0.4, GRIP = 0.72, SLEEP = 6;
    var bodies = [], raf = 0, prev = 0, still = 0;

    function floorY() {
      var g = document.querySelector(".hero-ground");
      var hb = hero.getBoundingClientRect();
      return g ? g.getBoundingClientRect().bottom - hb.top : hero.offsetHeight - 70;
    }

    /* Read a mark's resting place ONCE and keep driving it with a transform
       delta from there. Rewriting left/top per frame would run layout on every
       mark on every frame; a transform stays on the compositor. */
    function adopt(el) {
      if (el.__body) return el.__body;
      if (getComputedStyle(el).display === "none") return null;
      var hb = hero.getBoundingClientRect(), r = el.getBoundingClientRect();
      var grow = 1.7 + Math.random() * 0.9;   /* a resting speck is a whisper; a
                                                 falling one has to be real ink */
      var b = {
        el: el, r: (r.width / 2) * grow, grow: grow,
        hx: r.left - hb.left + r.width / 2, hy: r.top - hb.top + r.height / 2,
        vx: 0, vy: 0, hit: 0
      };
      b.x = b.hx; b.y = b.hy;
      el.__body = b; bodies.push(b);
      return b;
    }

    /* a drop that lands hard flattens for a moment, the way ink does */
    function splat(b) {
      if (b.hit) return;
      b.hit = 1;
      gsap.fromTo(b.el, { scaleX: b.grow * 1.34, scaleY: b.grow * 0.62 },
        { scaleX: b.grow, scaleY: b.grow, duration: 0.42, ease: "elastic.out(1, 0.55)",
          onComplete: function () { b.hit = 0; } });
    }

    function step(t) {
      var dt = Math.min(0.032, (t - prev) / 1000 || 0.016);
      prev = t;
      var W = hero.offsetWidth, F = floorY(), moving = 0, i, j;

      for (i = 0; i < bodies.length; i++) {
        var b = bodies[i];
        b.vy += G * dt; b.vx *= AIR; b.vy *= AIR;
        b.x += b.vx * dt; b.y += b.vy * dt;

        if (b.y + b.r > F) {
          if (b.vy > 260) splat(b);
          b.y = F - b.r; b.vy = -b.vy * BOUNCE; b.vx *= GRIP;
        }
        if (b.x - b.r < 0) { b.x = b.r; b.vx = -b.vx * BOUNCE; }
        if (b.x + b.r > W) { b.x = W - b.r; b.vx = -b.vx * BOUNCE; }
      }
      /* separate overlapping pairs so they stack instead of merging into one
         black dot at the bottom of the screen */
      for (i = 0; i < bodies.length; i++) {
        for (j = i + 1; j < bodies.length; j++) {
          var a = bodies[i], c = bodies[j];
          var dx = c.x - a.x, dy = c.y - a.y, d2 = dx * dx + dy * dy;
          var min = a.r + c.r + 1;
          if (d2 > 0 && d2 < min * min) {
            var d = Math.sqrt(d2), push = (min - d) / 2, nx = dx / d, ny = dy / d;
            a.x -= nx * push; a.y -= ny * push; c.x += nx * push; c.y += ny * push;
            var p = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;
            if (p > 0) {
              a.vx -= p * nx * BOUNCE; a.vy -= p * ny * BOUNCE;
              c.vx += p * nx * BOUNCE; c.vy += p * ny * BOUNCE;
            }
          }
        }
      }
      /* Position is written on the transform, scale is left to GSAP's splat
         tween — so the translate goes through gsap.set on x/y rather than a
         raw style write, or the two would overwrite each other. */
      for (i = 0; i < bodies.length; i++) {
        var m = bodies[i];
        gsap.set(m.el, { x: m.x - m.hx, y: m.y - m.hy });
        if (Math.abs(m.vx) + Math.abs(m.vy) > SLEEP) moving++;
      }

      still = moving ? 0 : still + 1;
      if (still > 26) {                       /* everything has come to rest */
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(step);
    }

    function shake() {
      [].forEach.call(wrap.children, adopt);
      [].forEach.call(hero.querySelectorAll(".ink-drop"), adopt);
      bodies = bodies.filter(Boolean);
      if (!bodies.length) return;
      bodies.forEach(function (b) {
        b.vx = (Math.random() - 0.5) * 460;
        b.vy = -160 - Math.random() * 520;
        gsap.to(b.el, { opacity: 0.78 + Math.random() * 0.16, scale: b.grow,
                        duration: 0.28, ease: "power2.out" });
      });
      still = 0; prev = performance.now();
      if (!raf) raf = requestAnimationFrame(step);
    }

    if (btn) btn.addEventListener("click", shake);
    /* a resize invalidates every resting position; drop the world and let the
       marks fall back to their CSS places rather than freeze somewhere wrong */
    addEventListener("resize", function () {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      bodies.forEach(function (b) { b.el.style.transform = ""; delete b.el.__body; });
      bodies = [];
    }, { passive: true });
  })();

  /* ---------- screen two arrives out of the ink ----------
     Measured off the reference: once the circle has flooded the screen and its
     dark section rises into it, the section's two halves slide in from OPPOSITE
     sides and fade up — caught mid-flight at -8px on the left and +62.6px on
     the right, so the right half lags. That convergence is what makes screen
     two "appear" rather than merely scroll into place.
     Ours maps onto the shelf: the slogan comes in from the left, the shelf
     marker and its counter converge, the rule under them draws itself, then the
     product follows. It fires while the ink still owns the screen, so the shelf
     reads as something surfacing in it. */
  (function () {
    var sec = document.querySelector(".products");
    if (!sec) return;
    var line = sec.querySelector(".shelf-line"),
        head = sec.querySelector(".shelf-head"),
        eb   = sec.querySelector(".shelf-eyebrow"),
        num  = sec.querySelector(".shelf-num"),
        perch= sec.querySelector(".perch"),
        art  = sec.querySelector(".product-art"),
        body = sec.querySelectorAll(".product-body > *");
    if (!line) return;

    /* every .rise inside the shelf is ours to reveal now that it is out of the
       generic handler — miss one and it stays invisible forever, because the
       CSS gate hides it and nothing else is coming for it */
    var claimed = [line, head, art].concat([].slice.call(body));
    var rest = gsap.utils.toArray(sec.querySelectorAll(".rise")).filter(function (el) {
      return claimed.indexOf(el) < 0;
    });

    gsap.set([line, head, art], { autoAlpha: 0 });
    gsap.set(body, { autoAlpha: 0 });
    if (rest.length) gsap.set(rest, { autoAlpha: 0 });
    gsap.set(head, { "--rule": 0 });

    var tl = gsap.timeline({ scrollTrigger: { trigger: line, start: "top 78%", once: true } });
    tl.fromTo(line, { x: -96 }, { x: 0, autoAlpha: 1, duration: 1.05, ease: "expo.out" })
      .to(head, { autoAlpha: 1, duration: 0.4 }, 0.16)
      .fromTo(eb,  { x: -44 }, { x: 0, duration: 0.9, ease: "expo.out" }, 0.16)
      .fromTo(num, { x:  44 }, { x: 0, duration: 0.9, ease: "expo.out" }, 0.28)
      .to(head, { "--rule": 1, duration: 0.9, ease: "expo.out" }, 0.3)
      .fromTo(art, { y: 46 }, { y: 0, autoAlpha: 1, duration: 1.1, ease: "expo.out" }, 0.34)
      .fromTo(body, { y: 30 }, { y: 0, autoAlpha: 1, duration: 0.85, ease: "expo.out", stagger: 0.075 }, 0.46);
    if (rest.length) tl.fromTo(rest, { y: 22 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: "expo.out", stagger: 0.055 }, 0.62);
    /* it beat you here. It drops the last few pixels onto the rule and settles,
       so arriving on the shelf reads as a landing rather than a fade-in. */
    if (perch) {
      gsap.set(perch, { autoAlpha: 0 });
      tl.fromTo(perch, { y: -26, scaleX: 1.1, scaleY: 0.86, transformOrigin: "50% 100%" },
        { y: 0, scaleX: 1, scaleY: 1, autoAlpha: 1, duration: 0.72, ease: "back.out(2.2)" }, 0.5);
    }
    tl.add(function () { [line, head, art].forEach(settle); }, 1.6);
  })();

  mm.add("(min-width: 821px)", function () {
    /* section parallax (desktop only) */
    gsap.utils.toArray("[data-parallax]").forEach(function (el) {
      var f = parseFloat(el.dataset.parallax) || 0.12;
      /* force3D pins these onto their own GPU layer up front, so the first
         scroll doesn't pay a promotion hitch mid-motion */
      gsap.fromTo(el, { yPercent: -f * 100 }, { yPercent: f * 100, ease: "none", force3D: true,
        scrollTrigger: { trigger: el.closest("section") || el, start: "top bottom", end: "bottom top", scrub: true } });
    });

    /* light mouse parallax across the plate. The .hz layers already carry a
       translateX(-50%) centring transform, so their pointer offset rides on
       xPercent instead of x — writing to x would fight the centring. */
    if (matchMedia("(pointer: fine)").matches) {
      var setters = gsap.utils.toArray(".hero-ground [data-depth]").map(function (el) {
        var d = parseFloat(el.dataset.depth) || 0.2;
        var centred = el.classList.contains("hz");
        return { x: gsap.quickTo(el, centred ? "xPercent" : "x", { duration: 1.0, ease: "power3.out" }),
                 y: gsap.quickTo(el, "y", { duration: 1.0, ease: "power3.out" }),
                 d: d, base: centred ? -50 : 0, unit: centred ? 0.14 : 1 };
      });
      var onMove = function (e) {
        var nx = (e.clientX / innerWidth) * 2 - 1, ny = (e.clientY / innerHeight) * 2 - 1;
        setters.forEach(function (s) { s.x(s.base + nx * -18 * s.d * s.unit); s.y(ny * -11 * s.d); });
      };
      addEventListener("mousemove", onMove);
      return function () { removeEventListener("mousemove", onMove); };
    }
  });

  mm.add("(max-width: 820px)", function () {
    /* phones: the plate layers drift at their own depths as the hero scrolls
       away, so the print keeps its dimensionality on touch too. Transform-only,
       scrubbed, cheap. Absolute offsets, like the desktop branch: the hero is
       sticky, so its box never travels and "bottom top" would never fire. */
    gsap.utils.toArray(".hero-ground [data-depth]").forEach(function (el) {
      var d = parseFloat(el.dataset.depth) || 0.2;
      gsap.to(el, { y: -(d * 46), ease: "none", force3D: true,
        scrollTrigger: { start: 0, end: function () { return window.innerHeight; }, scrub: true, invalidateOnRefresh: true } });
    });
  });

  /* recalc pins after big hero layers finish loading (kills layout shift) */
  addEventListener("load", function () { ScrollTrigger.refresh(); });

  /* Pre-decode every below-fold image during idle time after load. GitHub
     Pages caches assets for only 10 minutes, so revisits (especially right
     after a deploy) are effectively cold — without this, images downloaded
     and decoded MID-SCROLL, which read as the site "stuttering". After this
     warm-up, scrolling never waits on network or decode. */
  addEventListener("load", function () {
    function warm() {
      [].forEach.call(document.images, function (im) {
        if (im.loading === "lazy") im.loading = "eager";
        if (im.decode) im.decode().catch(function () {});
      });
    }
    if ("requestIdleCallback" in window) requestIdleCallback(warm, { timeout: 2500 });
    else setTimeout(warm, 1200);
  });

  /* ---------- reading-progress ink line (transform-only, cheap) ---------- */
  var ink = document.querySelector(".scroll-ink");
  if (ink) ScrollTrigger.create({ start: 0, end: "max",
    onUpdate: function (self) { ink.style.transform = "scaleX(" + self.progress.toFixed(4) + ")"; } });

  /* ---------- marquee (paused while off-screen to save compositing) ---------- */
  var marq = document.getElementById("marqRow");
  if (marq) {
    var marqTween = gsap.to(marq, { xPercent: -50, duration: 26, ease: "none", repeat: -1 });
    ScrollTrigger.create({ trigger: ".marquee", start: "top bottom", end: "bottom top",
      onToggle: function (self) { self.isActive ? marqTween.play() : marqTween.pause(); } });
  }

  /* The globe just auto-rotates (and can be dragged) — no scroll pinning. Its
     reach copy rides the shared `.rise` reveal like every other section. */

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }

  /* Absolute failsafe: nothing in the hero stays invisible past ~2.6s, whatever
     happens with GSAP timing, decode, or an initially-hidden tab. Plain inline
     styles — no dependency on the animation ticker. */
  setTimeout(function () {
    document.querySelectorAll(".hero .rise").forEach(function (el) {
      if (parseFloat(getComputedStyle(el).opacity) < 0.05) {
        el.style.opacity = "1"; el.style.visibility = "visible"; el.style.transform = "none";
      }
    });
  }, 2600);
})();
