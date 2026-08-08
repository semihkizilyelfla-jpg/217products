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
    /* the hero's empty scroll-run counts as part of the hero here: the deck's
       paper sheet must not start sliding up until the run is spent, or it would
       paint over the pinned hero while the sun is still climbing it */
    var run = document.querySelector(".hero-run");
    function sync() {
      var h = hero.offsetHeight + (run ? run.offsetHeight : 0);
      document.documentElement.style.setProperty("--hero-h", Math.round(h) + "px");
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

  /* ---------- the opening's clock ----------
     Slower than the reference on purpose: its circle covers in 205px, which is
     a snap you feel rather than read. Ours holds a beat longer so the disc
     registers as a shape before it becomes a flood. */
  var INK_RIDE = 0.82;   /* fraction of a viewport the whole opening takes */
  var INK_HOLD = 0.52;   /* fraction of that ride the sun spends climbing */

  /* ---------- THE SUN ----------
     One gesture, three beats, all on the scroll:
       RISE   the sun climbs out from behind the near pine ridge, through the
              valley the range opens at dead centre, and stops in open sky
       BURN   vermilion deepens to ink — the flood has to arrive BLACK, because
              what is inside it is the dark shelf of screen two, and a red
              screen handing over to a black one is a cut, not a transition
       FLOOD  it grows from its own centre until it swallows the viewport
     The rise costs nothing in scroll distance: the old opening already spent
     its first 37% holding the disc still, and that dead hold is now the climb.
     Every landmark it needs is a fraction of the PAINTING (the ridge line sits
     at 58.1% up the plate, the valley at its centre), so the geometry is read
     off the plate's measured box rather than guessed in viewport units. */
  (function () {
    var sun = document.querySelector(".sun");
    var plate = document.querySelector(".hz-back");
    if (!sun || !plate) return;
    var skin = sun.querySelector(".sun-ink");
    var fill = sun.querySelector(".sun-fill");
    var de = document.documentElement;

    /* Where the front ridge is actually SOLID enough to hide something, as a
       fraction of the plate's height from its bottom. Not the split row: the
       handover is a long ramp, so the pine tops are mist the sentence can be
       read through, and the layer only reaches 0.88 alpha at 81% down. This is
       that line, measured off the layer's own alpha profile. */
    var RIDGE = 0.20;
    var geo = null;

    function measure() {
      var pr = plate.getBoundingClientRect();
      var sr = sun.getBoundingClientRect();
      var s = Math.abs(gsap.getProperty(sun, "scaleX") || 1);
      var d = sr.width / s;                       /* the sun's own diameter */
      if (!pr.height || !d) return null;
      var ridgeY = pr.bottom - pr.height * RIDGE; /* screen y of the ridge line */

      /* THE SKY IT HAS TO FIT IN. Everything else on this screen is fixed — the
         mist band at the top, the sentence below it — and the only genuinely
         empty stretch is between them. Rather than pick a landing height and
         then discover the sun collides with the type at some window size, the
         gap is measured first and the sun is sized to it. It ends up as large
         as the sheet can hold and never lands on a word. */
      var head = document.querySelector(".hero-head");
      var kasumi = document.querySelector(".kasumi");
      var headTop = head ? head.getBoundingClientRect().top : pr.top;
      var mistBottom = kasumi ? kasumi.getBoundingClientRect().bottom : 0;
      /* the mist is pale and the sun reads beautifully behind it, so it is
         allowed to sit up into the band — only the TYPE is a hard edge */
      var gapTop = mistBottom - 46, gapBot = headTop - 10;
      var gap = gapBot - gapTop;
      if (gap > 60 && gap < d) {
        d = Math.max(120, gap * 0.94);
        sun.style.width = d.toFixed(1) + "px";
      }
      var topY = (gapTop + gapBot) / 2;

      /* AT REST roughly a third of it stands clear of the pines. Buried deeper
         it stopped reading as a sun and became a red mark among the trees. */
      var restY = ridgeY + d * 0.16;
      return { d: d, rest: restY, climb: Math.max(0, restY - topY) };
    }

    /* the sun is bottom-anchored in the scene, so its resting offset is written
       once as a `bottom` in px and the rise rides on transform from there */
    function place() {
      geo = measure();
      if (!geo) return;
      var groundBottom = document.querySelector(".hero-ground").getBoundingClientRect().bottom;
      sun.style.bottom = (groundBottom - geo.rest - geo.d / 2).toFixed(1) + "px";
      sun.style.marginLeft = (-geo.d / 2).toFixed(1) + "px";
      sun.style.visibility = "visible";
    }

    function neededScale() {
      var r = sun.getBoundingClientRect();
      if (!r.width) return 24;
      /* getBoundingClientRect already includes the live scroll transform, so
         divide it back out — otherwise every refresh mid-flood reads a huge
         width and collapses the target scale. */
      var s = Math.abs(gsap.getProperty(sun, "scaleX") || 1);
      var w = r.width / s;
      /* the rect already carries the live transform, so this is where the sun
         actually is — and the flood only ever starts once the climb is over,
         which means it is already at its final height when this is read */
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var far = Math.max(
        Math.hypot(cx, cy),
        Math.hypot(innerWidth - cx, cy),
        Math.hypot(cx, innerHeight - cy),
        Math.hypot(innerWidth - cx, innerHeight - cy));
      /* x1.75, not x1.06. The burn gradient's SOLID ink only reaches 62% of the
         disc's radius — beyond that it is still oxblood cooling to a hot rim.
         Sized for the outer edge, the viewport corners would have finished on
         red. Sized so the ink CORE clears the far corner, the page hands over
         black and the rim is off-screen where it belongs. */
      return (far * 2) / w * 1.75;
    }

    var RIDE = INK_RIDE, HOLD = INK_HOLD;
    /* one scrubbed trigger for the whole gesture: three beats read off a single
       progress value, so the hands can never drift apart */
    ScrollTrigger.create({
      start: 0,
      end: function () { return window.innerHeight * RIDE; },
      scrub: true, invalidateOnRefresh: true,
      onRefresh: function () { place(); },
      onUpdate: function (self) {
        if (!geo) place();
        if (!geo) return;
        var p = self.progress;
        /* RISE — 45% of the ride, roughly 205px of scroll. It was 109px and
           read as a jump rather than a climb. Ease is power2-out, not cubic:
           the harder curve put most of the travel in the first few pixels,
           which is what made it feel fast even before the distance changed. */
        var r = Math.min(1, p / HOLD);
        r = 1 - Math.pow(1 - r, 2);
        /* FLOOD — nothing until the climb is done, then a straight ramp */
        var f = p <= HOLD ? 0 : (p - HOLD) / (1 - HOLD);
        gsap.set(sun, {
          y: -geo.climb * r,
          scale: 1 + (neededScale() * 1.12 - 1) * f,
          force3D: true
        });
        /* BURN — the ink no longer crossfades over the whole disc, it blooms
           out of the core: a soft-edged black spreading from the centre until
           it has taken the whole sun. Over 55% of the growth rather than 34%,
           so you can actually watch the colour go. */
        if (fill) {
          var burn = Math.min(1, f / 0.55);
          burn = burn * burn * (3 - 2 * burn);   /* smoothstep */
          fill.style.opacity = Math.min(1, burn * 2.4).toFixed(3);
          fill.style.transform = "scale(" + (0.1 + 0.9 * burn).toFixed(4) + ")";
        }
        de.classList.toggle("sun-up", r > 0.98);
      }
    });

    addEventListener("resize", function () { geo = null; }, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    addEventListener("load", place);
    place();

    /* No fade on the hero copy. GSAP would capture its start opacity while the
       WAAPI entrance is still mid-flight and animate 0 -> 0, blanking the hero.
       It isn't needed either: the sun sits above the copy once it floods. */
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
     The sideways slide is gone. Sliding a block of type in from the left is the
     move every scroll library ships with, and next to a shelf being loaded it
     read as a different hand entirely — which is what "the text animation is
     bad" was pointing at.
     What replaces it: the statement rides UP from behind its own edge, one line
     at a time, each line clipped by its own box (see .shelf-line .ln). Nothing
     travels sideways, nothing crosses the marker, and the eye ends where the
     reading starts. The marker and the note only breathe in — they are margin
     notes, they should not perform.
     Then the panels are set onto the shelf, and they land in the SAME language
     as the hover flick: a short overshoot past the resting position and a
     settle back, so the entrance and the interaction are obviously the same
     hand at work. */
  (function () {
    var sec = document.querySelector(".products");
    if (!sec) return;
    var head = sec.querySelector(".shelf-head"),
        eb   = sec.querySelector(".shelf-eyebrow"),
        note = sec.querySelector(".shelf-note"),
        lines= gsap.utils.toArray(sec.querySelectorAll(".shelf-line .ln > span")),
        slots= gsap.utils.toArray(sec.querySelectorAll(".slot")),
        open = sec.querySelector(".shelf-open"),
        art  = sec.querySelector(".product-art"),
        body = sec.querySelectorAll(".product-body > *");
    if (!head) return;

    /* every .rise inside the shelf is ours to reveal now that it is out of the
       generic handler — miss one and it stays invisible forever, because the
       CSS gate hides it and nothing else is coming for it */
    var claimed = [head, open, art].concat([].slice.call(body));
    var rest = gsap.utils.toArray(sec.querySelectorAll(".rise")).filter(function (el) {
      return claimed.indexOf(el) < 0;
    });

    /* the head itself is shown immediately — only its PARTS are staged, so a
       half-built headline is never on screen */
    gsap.set(head, { autoAlpha: 1 });
    gsap.set(art, { autoAlpha: 0 });
    gsap.set(body, { autoAlpha: 0 });
    if (lines.length) gsap.set(lines, { yPercent: 108 });
    if (eb) gsap.set(eb, { autoAlpha: 0, y: 10 });
    if (note) gsap.set(note, { autoAlpha: 0, y: 14 });
    if (open) gsap.set(open, { autoAlpha: 0 });
    if (slots.length) gsap.set(slots, { autoAlpha: 0, y: 46 });
    if (rest.length) gsap.set(rest, { autoAlpha: 0 });

    var tl = gsap.timeline({ scrollTrigger: { trigger: head, start: "top 82%", once: true } });
    if (eb) tl.to(eb, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" }, 0);
    /* 108, not 100: the clip box carries a little padding for the descenders,
       so a flat 100% leaves the tail of a g showing above the edge */
    if (lines.length) {
      tl.to(lines, { yPercent: 0, duration: 0.95, ease: "expo.out", stagger: 0.09 }, 0.06);
    }
    if (note) tl.to(note, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out" }, 0.34);
    /* Set onto the shelf, left to right. The overshoot is small (a 4px dip past
       zero) — enough to feel like a hand placing something, not a bounce. */
    if (slots.length) {
      tl.to(slots, {
        keyframes: [
          { autoAlpha: 1, y: -5, duration: 0.52, ease: "power3.out" },
          { y: 0, duration: 0.26, ease: "power2.inOut" }
        ],
        stagger: 0.1
      }, 0.42);
    }
    if (open) tl.to(open, { autoAlpha: 1, duration: 0.6, ease: "power2.out" }, 1.0);
    tl.fromTo(art, { y: 46 }, { y: 0, autoAlpha: 1, duration: 1.1, ease: "expo.out" }, 1.06)
      .fromTo(body, { y: 30 }, { y: 0, autoAlpha: 1, duration: 0.85, ease: "expo.out", stagger: 0.075 }, 1.16);
    if (rest.length) tl.fromTo(rest, { y: 22 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: "expo.out", stagger: 0.055 }, 1.3);
    /* hand the panels back to CSS once they are placed: a lingering will-change
       on six elements is not worth keeping for a one-shot entrance */
    tl.add(function () { [head, art].concat(slots).concat(lines).forEach(settle); }, 2.6);
  })();

  /* ---------- the flick ----------
     Lifted from the reference's own interaction data, stage for stage:
       0ms          scale 0, rotate 0, opacity 1
       +100ms 200ms scale -> 1.1, rotate -> 5deg
       +300ms 100ms scale -> 1,   rotate -> 10deg
     Three chained stages with an overshoot in the middle is not something a CSS
     transition can express, so it lives here. One paused timeline per panel,
     played on enter and reversed on leave — reversing (rather than firing a
     second timeline) is what makes a fast in-out-in sweep pick up from wherever
     it actually is instead of snapping.
     Bound only on a real hover pointer: on touch there is no enter/leave pair
     at all, and the CSS resting state already shows the art behind the copy.
     BOTH widths are driven from here, differing only in how far the sheet
     turns. That is deliberate. Handing the narrow width to a CSS :hover rule
     instead looked tidier and did not work: a paused GSAP timeline renders its
     start state immediately, so `opacity: 0` is sitting INLINE on the element,
     and an inline value beats any stylesheet rule — the panel simply never
     opened once the window had been wide at any point. One owner, no race. */
  function bindFlick(midTurn, endTurn) {
    return function () {
      var bound = [];
      gsap.utils.toArray(".slot").forEach(function (slot) {
        var media = slot.querySelector(".slot-media");
        if (!media) return;
        /* NO LEAD-IN. The reference waits 100ms before anything moves, which
           reads as composure on its own site and as lag on ours — the cursor is
           on the panel and the panel has not answered. The SHAPE of the move is
           untouched (overshoot past 1, settle back, the turn carrying on
           through both stages); only the pause in front of it is gone, and the
           whole flick is a shade quicker at 260ms against 400. */
        var tl = gsap.timeline({ paused: true })
          .set(media, { scale: 0, rotation: 0 })
          /* opacity is its own, shorter tween — on the way back out it
             dissolves the sheet while it is still shrinking, instead of
             collapsing a solid dot into nothing */
          .fromTo(media, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "none" }, 0)
          .to(media, { scale: 1.1, rotation: midTurn, duration: 0.17, ease: "power2.out" }, 0)
          .to(media, { scale: 1, rotation: endTurn, duration: 0.09, ease: "power1.inOut" }, 0.17);
        var open = function () { tl.play(); };
        var shut = function () { tl.reverse(); };
        var blur = function (e) { if (!slot.contains(e.relatedTarget)) shut(); };
        slot.addEventListener("mouseenter", open);
        slot.addEventListener("mouseleave", shut);
        /* keyboard reaches the panel through the link stretched over it */
        slot.addEventListener("focusin", open);
        slot.addEventListener("focusout", blur);
        bound.push([slot, open, shut, blur, tl]);
      });
      return function () {
        bound.forEach(function (b) {
          b[0].removeEventListener("mouseenter", b[1]);
          b[0].removeEventListener("mouseleave", b[2]);
          b[0].removeEventListener("focusin", b[1]);
          b[0].removeEventListener("focusout", b[3]);
          b[4].kill();
        });
        bound = [];
      };
    };
  }
  /* Wide: the full 10deg, and the sheet is allowed to hang over its neighbours.
     Narrow: the panels are stacked, and a full-width sheet at 10deg throws 70px
     past its own box — right over the panel above and below — so it keeps the
     overshoot and drops the turn. */
  mm.add("(hover: hover) and (pointer: fine) and (min-width: 861px)", bindFlick(5, 10));
  mm.add("(hover: hover) and (pointer: fine) and (max-width: 860px)", bindFlick(0, 0));

  mm.add("(min-width: 821px)", function () {
    /* section parallax (desktop only) */
    gsap.utils.toArray("[data-parallax]").forEach(function (el) {
      var f = parseFloat(el.dataset.parallax) || 0.12;
      /* force3D pins these onto their own GPU layer up front, so the first
         scroll doesn't pay a promotion hitch mid-motion */
      gsap.fromTo(el, { yPercent: -f * 100 }, { yPercent: f * 100, ease: "none", force3D: true,
        scrollTrigger: { trigger: el.closest("section") || el, start: "top bottom", end: "bottom top", scrub: true } });
    });

    /* Light mouse parallax across the plate.
       THE TRAP, and it cost a live page: .hz is centred in CSS with
       translateX(-50%), and GSAP cannot see that it was a PERCENTAGE — it reads
       the computed matrix and records x = -897px. Writing xPercent on top does
       not replace that, it ADDS to it, so the first mouse move shifted the plate
       a full extra width to the left and half the horizon walked off screen.
       It never showed in a headless check because nothing had moved the pointer
       over the hero. Handing the centring to xPercent and zeroing x makes the
       two live in the same unit, so the pointer offset is the only thing left
       moving. */
    if (matchMedia("(pointer: fine)").matches) {
      var setters = gsap.utils.toArray(".hero-ground [data-depth]").map(function (el) {
        var d = parseFloat(el.dataset.depth) || 0.2;
        var centred = el.classList.contains("hz");
        if (centred) gsap.set(el, { x: 0, xPercent: -50 });
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

  /* The reach section has no moving part of its own — its copy rides the shared
     `.rise` reveal like every other section. */

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
