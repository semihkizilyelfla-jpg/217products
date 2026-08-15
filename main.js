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
    /* --hero-h IS CACHED, NOT RE-READ PER SCROLL EVENT. This used to call
       getComputedStyle(de).getPropertyValue("--hero-h") inside the handler.
       getComputedStyle flushes pending style, and on this page style is dirty
       on every frame of a scroll — GSAP writes the sun's transform, Lenis
       writes the scroll position — so the read could never be served from cache
       and each scroll event paid a full style recalc for a number that only
       changes on resize. The block above writes --hero-h on exactly three
       events; this listens to the same three. */
    var heroH = 0;
    function readHeroH() {
      heroH = parseInt(getComputedStyle(de).getPropertyValue("--hero-h"), 10) || 0;
    }
    function onScroll() {
      var y = window.scrollY || 0;
      var past = y > 40;
      if (nav) nav.classList.toggle("is-scrolled", past);
      de.classList.toggle("scrolled", past);
      /* the wordmark and the mist band belong to the opening screen and step
         away once the ink has taken the page; the capsule and the rail stay */
      de.classList.toggle("past-hero", y > (heroH || innerHeight) * 0.55);
    }
    readHeroH();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", function () { readHeroH(); onScroll(); }, { passive: true });
    addEventListener("load", function () { readHeroH(); onScroll(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(readHeroH);
    onScroll();
  })();

  /* ---------- mobile nav (hamburger) — runs regardless of GSAP ----------
     The drawer is a full-screen overlay, and an overlay that only LOOKS modal is
     the classic keyboard trap in reverse: measured, tabbing past the last link
     used to land on "Mürekkebi silkele" — a control sitting underneath the
     drawer, invisible and unreachable by mouse. Three things fix it, and all
     three are needed:
       inert on the rest of the page, so assistive tech cannot walk into content
         the drawer is covering;
       a wrap at both ends of the drawer's own focusables, so Tab and Shift+Tab
         cycle inside it;
       focus handed to the first link on open and RETURNED to the toggle on
         close, so a keyboard user is never dropped at the top of the document.
     `inert` is skipped where unsupported rather than polyfilled: the wrap and
     the scroll lock still hold, and the drawer paints over everything anyway. */
  (function () {
    var t = document.getElementById("navToggle"), n = document.getElementById("navLinks");
    if (!t || !n) return;
    /* .skip-link and .brand are in this list for the same reason #main is: the
       drawer is a full-screen sheet at z-index 50 and both of those sit UNDER
       it, so without inert they are focusable while invisible. Measured: click
       the drawer's empty ground, activeElement becomes <body>, the first/last
       wrap below never engages because activeElement is neither, and the next
       Tab walks out of the drawer into the skip link. */
    var main = document.getElementById("main"),
        rail = document.querySelector(".tate"),
        outside = [main, rail, document.querySelector(".skip-link"),
                   document.querySelector(".brand")].filter(Boolean),
        canInert = "inert" in HTMLElement.prototype;

    function focusables() {
      return [].filter.call(n.querySelectorAll("a[href], button:not([disabled])"), function (el) {
        return el.offsetWidth || el.offsetHeight || el.getClientRects().length;
      });
    }
    function setOpen(open, returnFocus) {
      n.classList.toggle("open", open);
      t.classList.toggle("is-open", open);
      t.setAttribute("aria-expanded", open ? "true" : "false");
      document.documentElement.classList.toggle("menu-open", open); /* scroll lock */
      if (canInert) outside.forEach(function (el) { el.inert = open; });
      if (open) { var f = focusables(); if (f.length) f[0].focus(); }
      else if (returnFocus) t.focus();
    }
    function close(returnFocus) { if (n.classList.contains("open")) setOpen(false, returnFocus); }

    t.addEventListener("click", function () { setOpen(!n.classList.contains("open"), false); });
    /* the link's own navigation still happens; this only tears the overlay down.
       No focus return here — the anchor target is where the user asked to go. */
    [].forEach.call(n.querySelectorAll("a"), function (a) {
      a.addEventListener("click", function () { close(false); });
    });
    addEventListener("keydown", function (e) {
      if (!n.classList.contains("open")) return;
      if (e.key === "Escape") { close(true); return; }
      if (e.key !== "Tab") return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    /* THE DRAWER HAD NO WAY OUT OF ITS OWN BREAKPOINT. Everything above is
       bound once, at load: a click, a per-link click, and a keydown. Nothing
       watches the width. So open the drawer on a narrow window — or on a tablet
       held in portrait — then widen it or rotate to landscape, and the media
       query takes the toggle away (`display: none` above 900px) while
       `menu-open` is still scroll-locking <html> and `inert` is still switched
       on across #main. The page is frozen, the control that would unfreeze it
       has been removed, and nothing the visitor can do brings it back except
       finding one of the drawer's own links.
       Same class of bug as the emaki pin further down: a decision taken at one
       width and never revisited. */
    var wide = matchMedia("(min-width: 901px)");
    var onWide = function () { if (wide.matches) close(false); };
    if (wide.addEventListener) wide.addEventListener("change", onWide);
    else if (wide.addListener) wide.addListener(onWide);
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
       resting state: the disc sits in its field, vermilion, and never burns. */
    document.documentElement.classList.add("no-motion");
    /* word-brighten scrub won't run → give the words full ink */
    [].forEach.call(document.querySelectorAll(".brighten .w"), function (el) {
      el.style.color = "var(--ink)";
    });
    /* the shelf head's staged offsets are scoped to :not(.is-in), so the class
       IS the release — set it here too or the reduced-motion page keeps the
       head shoved off to one side */
    [].forEach.call(document.querySelectorAll(".shelf-head"), function (h) { h.classList.add("is-in"); });
    /* same contract for the process strokes: the class is the release, so
       without it the four brush marks stay wiped to zero width forever */
    [].forEach.call(document.querySelectorAll(".steps li"), function (li) { li.classList.add("is-inked"); });
    /* and the same for the mended headline — the class IS the release */
    [].forEach.call(document.querySelectorAll(".kintsugi"), function (h) { h.classList.add("is-mended"); });
    [].forEach.call(document.querySelectorAll(".value"), function (v) { v.classList.add("is-spoked"); });
    /* The ink-shake is bound far below this early return, so on this path the
       button exists, takes hover, takes focus and announces itself — and does
       nothing at all. A visitor who asked for reduced motion is exactly the
       visitor least able to guess that a control is decorative. Remove it
       rather than leave a dead affordance; the foot row is already a
       two-element layout under 1080px, so nothing reflows oddly. */
    var deadTap = document.getElementById("inkTap");
    if (deadTap && deadTap.parentNode) deadTap.parentNode.removeChild(deadTap);
    document.documentElement.classList.add("js-live");
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
  /* SCROLLING IS NOT NAVIGATING. preventDefault kills the browser's own jump,
     and Lenis then moves the viewport — but the browser's jump also moves FOCUS
     and the sequential-focus starting point, and Lenis does neither. Measured:
     activating the skip link left document.activeElement on the skip link, the
     hash empty and scrollY at 0, so the one "skip to content" control on the
     site skipped nothing and the next Tab went straight back into the header.
     Every in-page link had the same hole: you could jump to a section and then
     Tab into whatever happened to sit next in the DOM.
     So the handler now finishes the job the default would have done — move the
     focus, and write the hash so Back still works and the URL is shareable.
     `tabindex="-1"` is set on demand rather than in the markup: it makes the
     target programmatically focusable without putting sections into the tab
     order, and the outline is suppressed only for these scroll targets, never
     for real controls. */
  [].forEach.call(document.querySelectorAll('a[href^="#"]'), function (a) {
    a.addEventListener("click", function (e) {
      var hash = a.getAttribute("href");
      if (hash === "#") return;
      var target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      function land() {
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
        try { history.replaceState(null, "", hash); } catch (_) { }
      }
      if (lenis) lenis.scrollTo(target, {
        duration: 1.35,
        easing: function (t) { return 1 - Math.pow(1 - t, 4); },
        onComplete: land
      });
      else { target.scrollIntoView({ behavior: "smooth" }); land(); }
    });
  });
  function settle(el){ el.style.willChange = "auto"; }

  /* flipped decorative image owned by GSAP — it also carries data-parallax, so
     the flip has to live on the same transform GSAP drives (`.pl-branch-r` went
     with the plate section and is no longer in either page) */
  gsap.set(".final-branch", { scaleX: -1 });

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

  /* ---------- park the chrome while the reader is reading ----------
     Measured before writing this: the opaque capsule ate letters out of seven
     headlines on the way down the page. Four were fixed by capping the measure;
     the last three reach the right edge for good reasons, so the menu yields
     instead of the type. Threshold and floor both matter — 6px of travel stops
     it flickering on trackpad jitter, and it never hides inside the hero, where
     it is the only navigation on screen. */
  /* scrollY IS READ IN THE LISTENER, NOT IN THE rAF. Reading it inside the
     animation frame is a forced style recalculation: by then GSAP's ticker has
     already written transforms for this frame, so the layout is dirty and the
     read has to flush it. Traced over a 5.2s full-page scroll at 1280x800, this
     callback was 277 forced-layout entries / 7.0ms — small next to Lenis's own
     211/26.2ms, but it is pure waste, and it is waste in the exact frames the
     page is least able to afford. In a passive scroll listener the value is
     already there and costs nothing. */
  (function () {
    var de = document.documentElement, last = 0, ticking = false, y = 0;
    function apply() {
      ticking = false;
      var d = y - last;
      if (Math.abs(d) < 6) return;
      if (y < 260 || de.classList.contains("menu-open")) de.classList.remove("nav-away");
      else de.classList.toggle("nav-away", d > 0);
      last = y;
    }
    window.addEventListener("scroll", function () {
      y = window.scrollY || 0;
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    }, { passive: true });
  })();

  /* ---------- the process inks itself in ----------
     The deck had exactly ONE bespoke mechanic in nine screens — the shelf — and
     every other section shared a single fade-up: 24 elements, same 1.2s, same
     power3.out, same trigger. That sameness is most of why the back half read
     as a template.
     This is the second mechanic, and deliberately not a new idea: the same
     generated brush and the same left-to-right clip-path wipe the shelf's rule
     uses, one per step, so the four strokes lay down in sequence as the list
     arrives. Stagger comes from each row having its own trigger rather than
     from a timeline — the reader controls the pace by scrolling, which is what
     makes it feel like the page is being written rather than played.
     The resting state in CSS is INKED; `.js .steps li:not(.is-inked)` is what
     stages them, so no-JS and reduced-motion both show four finished strokes
     and nothing can ever ship blank. */
  /* ---------- the wheel turns ----------
     Scrubbed and small: 26 degrees across the section, not a spin. A wheel a
     reader can SEE spinning is a loader; a wheel that has moved while you read
     is a wheel being worked. The ensō's open end makes the rotation legible at
     that amplitude — without it, a symmetrical ring turning 26 degrees would be
     invisible and the whole thing would be wasted work. */
  (function () {
    var ring = document.querySelector(".wheel-ring"), studio = document.querySelector(".studio");
    if (!ring || !studio) return;
    gsap.fromTo(ring, { rotate: -13 }, {
      rotate: 13, ease: "none",
      scrollTrigger: { trigger: studio, start: "top bottom", end: "bottom top", scrub: 0.8 }
    });
  })();

  /* each principle's spoke inks back toward the hub as it arrives */
  gsap.utils.toArray(".value").forEach(function (v) {
    ScrollTrigger.create({
      trigger: v, start: "top 88%", once: true,
      onEnter: function () { v.classList.add("is-spoked"); }
    });
  });

  /* the broken sentence pulls itself together and the seam runs along the join */
  gsap.utils.toArray(".kintsugi").forEach(function (h) {
    ScrollTrigger.create({
      trigger: h, start: "top 82%", once: true,
      onEnter: function () { h.classList.add("is-mended"); }
    });
  });

  (function () {
    var section = document.querySelector(".process"),
        emaki = document.querySelector(".emaki"),
        track = document.querySelector(".steps");
    if (!section || !emaki || !track) return;
    var items = gsap.utils.toArray(".steps li");

    /* PHONES KEEP THE NATIVE SWIPE ROW. Pinning fights the OS scroll on touch
       and the guidance is explicit about it, so the pin is desktop-only and the
       CSS default — a real overflow-x track — is what ships everywhere else.
       Same content, same gesture, none of the cost. */
    if (!matchMedia("(min-width: 901px)").matches) {
      items.forEach(function (li) {
        ScrollTrigger.create({ trigger: li, start: "top 86%", once: true,
          onEnter: function () { li.classList.add("is-inked"); } });
      });
      return;
    }

    document.documentElement.classList.add("emaki-pinned");
    /* measured at refresh, never cached: the track's width depends on fonts and
       on the viewport, and a stale number here is the classic pinned-horizontal
       bug where the last panel is unreachable or the scroll dead-ends early */
    function distance() { return Math.max(0, track.scrollWidth - emaki.clientWidth); }

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: section, start: "top top",
        end: function () { return "+=" + (distance() + innerHeight * 0.5); },
        pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true
      }
    });
    tl.to(track, { x: function () { return -distance(); }, ease: "none" }, 0);
    /* the strokes are on the same timeline rather than on their own triggers:
       inside a pinned horizontal track an element's viewport position no longer
       tracks the reader's progress, so a per-item trigger would fire all four at
       once. Positions on the scrub timeline are the honest measure of "how far
       has the scroll opened". */
    items.forEach(function (li, i) {
      var mark = li.querySelector(".step-mark");
      if (mark) tl.to(mark, { clipPath: "inset(0% 0% 0% 0%)", ease: "none", duration: 0.16 }, i * 0.2 + 0.04);
      tl.add(function () { li.classList.add("is-inked"); }, i * 0.2);
    });

    /* the pin's length is derived from a measured width, so it has to be
       recomputed once the webfonts land and the panels settle */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }

    /* THE PIN IS ENTERED ONCE AND WAS NEVER LEFT. `emaki-pinned` goes on the
       root above and nothing took it off, but the stylesheet reads it as
       `overflow: hidden; scroll-snap-type: none` on .emaki — which is exactly
       the state the note at the top of this block says touch must never be in.
       Load an iPad in landscape, rotate to portrait: the pin keeps driving the
       track from vertical scroll while the native swipe the phone layout
       depends on has been switched off, so the handscroll can only be moved by
       a gesture the layout no longer offers. */
    var wideEmaki = matchMedia("(min-width: 901px)");
    var onEmaki = function () {
      if (wideEmaki.matches) return;
      document.documentElement.classList.remove("emaki-pinned");
      if (tl.scrollTrigger) tl.scrollTrigger.kill(true);
      gsap.set(track, { clearProps: "transform,x" });
      items.forEach(function (li) { li.classList.add("is-inked"); });
      ScrollTrigger.refresh();
    };
    if (wideEmaki.addEventListener) wideEmaki.addEventListener("change", onEmaki);
    else if (wideEmaki.addListener) wideEmaki.addListener(onEmaki);
  })();

  /* ---------- word-by-word brighten ---------- */
  /* The fallback only fires if --ink fails to resolve, but it was still the
     retired warm-black from the cream palette — so the one path that runs when
     the stylesheet is missing would have brightened every word to a colour the
     site no longer uses. It matches --ink now. */
  var inkColor = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#111111";
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
     registers as a shape before it becomes a flood.
     RIDE is paired with .hero-run in the stylesheet — see the note there. Ride
     0.68 of a viewport, run 0.76, so the flood is finished and the page is
     black a comfortable 8% before the next section's shelf can reach the
     screen. Change one and you must change the other. */
  var INK_RIDE = 0.68;   /* fraction of a viewport the whole opening takes */
  /* 0.45, up from 0.30. The arc is no longer a 50px lift — it now carries the
     disc four hundred-odd pixels up and across to the top centre of the screen,
     and a journey that size needs the room to be read. At 0.30 the whole thing
     was over in 184px of scroll. */
  var INK_HOLD = 0.45;   /* fraction of that ride the disc spends on its arc */

  /* ---------- THE SUN ----------
     One gesture, three beats, all on the scroll:
       RISE   the sun climbs out from behind the range, at the column the plate
              itself nominates, and stops in open sky
       BURN   vermilion deepens to ink — the flood has to arrive BLACK, because
              what is inside it is the dark shelf of screen two, and a red
              screen handing over to a black one is a cut, not a transition
       FLOOD  it grows from its own centre until it swallows the viewport
     Every landmark is a fraction of the PAINTING, read off the plate's measured
     box rather than guessed in viewport units, so the geometry survives any
     window shape. */
  (function () {
    var sun = document.querySelector(".sun");
    var plate = document.querySelector(".hz");
    if (!sun || !plate) return;
    var fill = sun.querySelector(".sun-fill");
    var de = document.documentElement;

    /* Read off the PLATE, not written here. The drawing is the only thing that
       knows where its own skyline runs and which column stands high enough with
       solid ink under it to hide a sun; the build script measures both and
       stamps them on the tag. Swap the painting and the sun follows it — there
       is no constant here to forget. */
    var SUN_X = parseFloat(plate.dataset.sunX);
    var RIDGE_AT_X = parseFloat(plate.dataset.ridge);
    if (!(SUN_X >= 0 && SUN_X <= 1)) SUN_X = 0.105;
    if (!(RIDGE_AT_X >= 0 && RIDGE_AT_X <= 1)) RIDGE_AT_X = 0.126;
    var geo = null;

    /* WHERE THE PLATE IS, DERIVED — NOT MEASURED OFF THE SCREEN.
       This used to read plate.getBoundingClientRect(), and it shipped a sun
       parked 469px off the left edge. A rect is the LIVE box: the opening
       animates .hero-ground with scale(1.035), the pointer parallax writes
       xPercent on .hz, and the very first call runs while the page is still
       laying itself out — read at any of those moments the plate is somewhere
       it will not stay, and the number written into `left` is wrong for good.
       Nothing recomputed afterwards, so the error was permanent; only a manual
       ScrollTrigger.refresh() corrected it.
       These four numbers are the LAYOUT box — offsetLeft/Top/Width/Height —
       which is exactly the geometry the stylesheet produced and which no
       transform can perturb. It does not restate the CSS either, so the plate
       can be re-centred, left-aligned on phones, or resized in the stylesheet
       alone and this follows without being edited. */
    function plateBox() {
      var g = document.querySelector(".hero-ground");
      var gw = g.clientWidth, gh = g.clientHeight;
      var pw = plate.offsetWidth, ph = plate.offsetHeight;
      /* offsetHeight is right before the file arrives too: the tag carries
         width/height, so the browser reserves the aspect-ratio box up front and
         the first call is already correct rather than waiting on decode. */
      if (!gw || !gh || !pw || !ph) return null;
      return { left: plate.offsetLeft, top: plate.offsetTop, w: pw, h: ph, gw: gw, gh: gh };
    }

    function measure() {
      var b = plateBox();
      if (!b) return null;
      /* offsetWidth, not the rect: the layout width, unaffected by the scale
         GSAP is writing on this element every frame of the flood */
      var d = sun.offsetWidth;
      if (!d) return null;
      var ridgeY = b.top + b.h * RIDGE_AT_X;
      /* AT REST it is down behind the peak with only its crown showing. Just
         over two fifths of a diameter below the skyline: enough that what shows
         reads as a sun still in the range, not a disc parked on top of it. */
      var restY = ridgeY + d * 0.42;
      var restX = b.left + b.w * SUN_X;
      /* THE APEX — top centre of the screen, which is where a sun ends up, not
         straight above where it came out. Held clear of the header by a
         diameter, and off the very top by a sixth of the scene on a tall
         window, so the disc arrives in open sky rather than under the nav. */
      var apexX = b.gw / 2;
      var apexY = Math.max(d * 0.95, b.gh * 0.17);
      return { d: d, rest: restY, restX: restX, ridge: ridgeY,
               apexX: apexX, apexY: apexY, box: b };
    }

    /* Written once as a `top`/`left` in px; the whole arc rides on transform
       from there. Everything is in the SCENE's own coordinates — no screen
       positions, so it cannot be perturbed by scroll, parallax or the entrance
       settle. */
    function place() {
      geo = measure();
      if (!geo) return;
      var b = geo.box;
      sun.style.top = (geo.rest - geo.d / 2).toFixed(1) + "px";
      /* pinned to the PLATE's column, not the viewport's: the plate is wider
         than the screen, so anchoring the sun to a viewport percentage would
         drift it off its own peak on every window shape */
      sun.style.left = (geo.restX - geo.d / 2).toFixed(1) + "px";
      sun.style.visibility = "visible";
      /* THE CUT, registered to the painting. The mask is the plate's own alpha
         inverted, so it has to sit exactly where the plate sits — same width,
         same left edge, and its bottom band aligned to the plate's bottom. The
         image is three plate-heights tall with the top two thirds fully opaque,
         which is what lets the disc keep rising past the top of the painting
         instead of vanishing at its edge. */
      var clip = document.querySelector(".sun-clip");
      if (clip) {
        var size = b.w.toFixed(1) + "px " + (b.h * 3).toFixed(1) + "px";
        var pos  = b.left.toFixed(1) + "px " + (b.top - b.h * 2).toFixed(1) + "px";
        clip.style.webkitMaskSize = size; clip.style.maskSize = size;
        clip.style.webkitMaskPosition = pos; clip.style.maskPosition = pos;
      }
    }

    function neededScale() {
      /* the base diameter from LAYOUT, the centre from the live rect. Dividing
         the rect's width back out by the current scale worked but compounded
         rounding on every frame of the flood; offsetWidth is the same number,
         exactly, and never needs undoing. The centre does have to be live —
         that is where the disc actually sits after its climb — and scaling is
         about its own centre, so it holds still while the disc grows. */
      var w = sun.offsetWidth;
      if (!w) return 24;
      var r = sun.getBoundingClientRect();
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
        /* LINEAR along the arc, deliberately. This used to be power2-out, and
           measured on the page that put 71% of the whole climb inside the first
           6% of a viewport of scroll — the curve was there but nobody could see
           it go. The trig below already shapes the motion; easing the parameter
           on top of it only front-loads the same shape twice. */
        var r = Math.min(1, p / HOLD);
        /* FLOOD — nothing until the arc is done, then a straight ramp */
        var f = p <= HOLD ? 0 : (p - HOLD) / (1 - HOLD);
        /* IT TRAVELS THE WAY A SUN DOES: an ellipse quadrant from where it
           broke the skyline to the top centre of the screen, not a lift
           straight up.
           THE OFFSET IS THE POINT. Run the quadrant from 0 and the disc leaves
           the ridge dead vertical and only turns right at the end — a fountain,
           not a sunrise. Starting a third of the way into the quadrant and
           renormalising both axes back onto the endpoints keeps the arrival
           horizontal (which is what an apex is) while giving the departure a
           real diagonal: measured, it leaves the range about two and a half
           times steeper than it travels sideways, which is roughly what a sun
           does at this latitude. */
        var U0 = 0.35 * Math.PI / 2, U1 = Math.PI / 2;
        var u = U0 + (U1 - U0) * r;
        var x0 = 1 - Math.cos(U0), y0 = Math.sin(U0);
        var ax = (geo.apexX - geo.restX) * ((1 - Math.cos(u)) - x0) / (1 - x0);
        var ay = -(geo.rest - geo.apexY) * (Math.sin(u) - y0) / (1 - y0);
        /* neededScale() reads a LIVE rect, which forces layout. Its result is
           multiplied by f — and f is exactly 0 for the whole first HOLD (45%)
           of the ride, the stretch the disc spends climbing its arc. So during
           the climb every scrub frame was forcing a layout to compute a term
           that could not move the answer off 1. The disc is at rest size until
           the flood starts; ask for the measurement then. */
        gsap.set(sun, {
          x: ax, y: ay,
          scale: f > 0 ? 1 + (neededScale() - 1) * f : 1,
          force3D: true
        });
        /* BURN — the ink does not crossfade over the whole disc, it blooms out
           of the core: a soft-edged black spreading from the centre until it has
           taken the circle. It starts late and runs long, so the first beat of
           the growth is the disc getting bigger while it is still unmistakably
           vermilion — that is the shot the whole hero is built around. */
        if (fill) {
          var burn = Math.min(1, Math.max(0, (f - 0.16) / 0.48));
          burn = burn * burn * (3 - 2 * burn);   /* smoothstep */
          fill.style.opacity = Math.min(1, burn * 1.7).toFixed(3);
          fill.style.transform = "scale(" + (0.1 + 0.9 * burn).toFixed(4) + ")";
        }
        de.classList.toggle("sun-up", r > 0.98);
      }
    });

    /* RE-PLACE ON RESIZE, not just invalidate. Dropping `geo` alone left the
       last-written numbers on the element until something happened to call
       place() again — and with nothing scrolled, nothing did. Caught by
       measurement: after a window resize the mask was still sized 1080x1209 for
       the old layout while the plate had become 1510x564, so the silhouette and
       the drawing were registered to different boxes. One rAF of debounce keeps
       a drag-resize from writing on every intermediate width. */
    var replace = 0;
    addEventListener("resize", function () {
      geo = null;
      if (replace) cancelAnimationFrame(replace);
      replace = requestAnimationFrame(function () { replace = 0; place(); });
    }, { passive: true });
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
    var bodies = [], raf = 0, prev = 0, still = 0, floor = 0;

    /* The ink used to pile up along the painted ridge. With the painting gone
       the only line left on the sheet is the foot rule, so that is where it
       lands — which is better anyway: the marks settle ON the credo instead of
       on a horizon that was never quite where the pile ended up. */
    function floorY() {
      var hb = hero.getBoundingClientRect();
      var foot = document.querySelector(".hero-foot");
      if (foot) return foot.getBoundingClientRect().top - hb.top - 6;
      return hero.offsetHeight - 70;
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
      /* floorY() reads two bounding rects; at 60fps that is 120 forced layouts a
         second for a line that does not move while the marks fall. Measured once
         per burst instead, and re-measured on resize (see the handler below). */
      var W = hero.offsetWidth, F = floor, moving = 0, i, j;

      for (i = 0; i < bodies.length; i++) {
        var b = bodies[i];
        b.vy += G * dt; b.vx *= AIR; b.vy *= AIR;
        b.x += b.vx * dt; b.y += b.vy * dt;

        if (b.y + b.r > F) {
          if (b.vy > 260) splat(b);
          b.y = F - b.r;
          /* A REST THRESHOLD, or this never stops. Gravity adds 32/frame and the
             bounce returns 40% of it, so a mark lying on the floor settles into
             a fixed point at v = -0.4(v+32) = -9.14 — forever. Measured against
             SLEEP = 6 that reads as "still moving" on every frame, so `still`
             resets, the rAF loop never exits, and the page burns a frame budget
             on sixteen dots that are visually motionless. Below 40 the bounce
             is under half a pixel; take it as landed. */
          if (Math.abs(b.vy) < 40) { b.vy = 0; b.vx *= 0.5; }
          else { b.vy = -b.vy * BOUNCE; b.vx *= GRIP; }
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
      floor = floorY();                       /* once per burst, not per frame */
      if (!raf) raf = requestAnimationFrame(step);
    }

    if (btn) btn.addEventListener("click", shake);
    /* a resize invalidates every resting position; drop the world and let the
       marks fall back to their CSS places rather than freeze somewhere wrong */
    addEventListener("resize", function () {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      /* clearProps, not a raw transform wipe. shake() also writes an OPACITY
         (0.78-0.94, so a falling mark reads as real ink) and the old handler
         never took it back — the resting values in the stylesheet are 0.09-0.34.
         On a phone the resize that triggers this is the URL bar collapsing on
         the very next scroll, so tapping "shake the ink" once left sixteen
         specks about six times too dark for the rest of the visit.
         killTweensOf first, or an in-flight splat tween re-applies scale after
         the clear; and clearProps is what also drops GSAP's transform cache,
         which a raw style.transform = "" leaves stale. */
      bodies.forEach(function (b) {
        gsap.killTweensOf(b.el);
        gsap.set(b.el, { clearProps: "transform,opacity,scale,x,y" });
        delete b.el.__body;
      });
      bodies = []; floor = 0;
    }, { passive: true });
  })();

  /* ---------- screen two arrives out of the ink ----------
     THE HEAD MOVES THE WAY THE REFERENCE'S DOES, read out of its IX2 data
     rather than guessed at: two blocks start at opacity 0 and x -300 / +300 and
     travel to 0 over 500ms on `ease`, fired by SCROLL_INTO_VIEW. The marker
     comes in from the left, the text block from the right, and they close on
     each other. It is a CSS transition toggled by one class — the whole move is
     two properties, and GSAP has nothing to add to it.
     The per-line masked reveal that used to live here is gone with the layout
     that needed it. So is the third column: the statement and its paragraph
     were side by side, which is precisely what the reference does not do.
     The panels still land in the SAME language as the hover flick — a short
     overshoot past the resting position and a settle back — so the entrance and
     the interaction are obviously the same hand at work. */
  (function () {
    var sec = document.querySelector(".products");
    if (!sec) return;
    var head = sec.querySelector(".shelf-head"),
        slots= gsap.utils.toArray(sec.querySelectorAll(".slot"));
    if (!head) return;

    /* every .rise inside the shelf is ours to reveal now that it is out of the
       generic handler — miss one and it stays invisible forever, because the
       CSS gate hides it and nothing else is coming for it */
    var rest = gsap.utils.toArray(sec.querySelectorAll(".rise"));

    if (slots.length) gsap.set(slots, { autoAlpha: 0, y: 46 });
    if (rest.length) gsap.set(rest, { autoAlpha: 0 });

    /* the head is CSS's job; this only says when */
    ScrollTrigger.create({
      trigger: head, start: "top 82%", once: true,
      onEnter: function () { head.classList.add("is-in"); }
    });

    var tl = gsap.timeline({ scrollTrigger: { trigger: head, start: "top 82%", once: true } });
    /* Set onto the shelf, left to right, after the head has closed. The
       overshoot is small (a 5px dip past zero) — enough to feel like a hand
       placing something, not a bounce. */
    if (slots.length) {
      tl.to(slots, {
        keyframes: [
          { autoAlpha: 1, y: -5, duration: 0.52, ease: "power3.out" },
          { y: 0, duration: 0.26, ease: "power2.inOut" }
        ],
        stagger: 0.1
      }, 0.42);
    }
    if (rest.length) tl.fromTo(rest, { y: 22 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: "expo.out", stagger: 0.055 }, 0.6);
    /* hand the panels back to CSS once they are placed: a lingering will-change
       on six elements is not worth keeping for a one-shot entrance */
    tl.add(function () { slots.forEach(settle); }, 1.8);
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

    /* Light mouse parallax across the plate. Plain x now, with no special case:
       the plate's centring moved out of `transform` and into a negative margin
       (see .hz in the stylesheet), so the transform holds nothing but this
       offset. The old version had to write xPercent and carry a -50 base
       because GSAP had read the CSS translateX(-50%) as x = -897px and would
       otherwise have added to it — that bug shipped, and it is gone at the
       source rather than worked around here. */
    if (matchMedia("(pointer: fine)").matches) {
      var setters = gsap.utils.toArray(".hero-ground [data-depth]").map(function (el) {
        var d = parseFloat(el.dataset.depth) || 0.2;
        return { x: gsap.quickTo(el, "x", { duration: 1.0, ease: "power3.out" }),
                 y: gsap.quickTo(el, "y", { duration: 1.0, ease: "power3.out" }), d: d };
      });
      if (!setters.length) return;
      var onMove = function (e) {
        var nx = (e.clientX / innerWidth) * 2 - 1, ny = (e.clientY / innerHeight) * 2 - 1;
        setters.forEach(function (s) { s.x(nx * -18 * s.d); s.y(ny * -11 * s.d); });
      };
      addEventListener("mousemove", onMove);
      return function () { removeEventListener("mousemove", onMove); };
    }
  });

  /* recalc pins after big hero layers finish loading (kills layout shift) */
  addEventListener("load", function () { ScrollTrigger.refresh(); });

  /* Pre-decode every below-fold image during idle time after load. GitHub
     Pages caches assets for only 10 minutes, so revisits (especially right
     after a deploy) are effectively cold — without this, images downloaded
     and decoded MID-SCROLL, which read as the site "stuttering". After this
     warm-up, scrolling never waits on network or decode. */
  addEventListener("load", function () {
    /* WARMING THE WHOLE PAGE IS NOT A WARM-UP, it is an eager load with extra
       steps. Flipping every loading="lazy" to eager pulled 556 KB on every
       visit — osnote-card, kintsugi, zen, potter, branch — and decoding them
       all at once opened roughly 24 MB of RGBA at peak, on a phone, for images
       most visitors never scroll to.
       Now: skipped entirely on save-data or a 2G-class link, limited to what is
       within two screens of the viewport, and decoded ONE AT A TIME so the
       bitmap peak is a single image rather than five. */
    function warm() {
      var c = navigator.connection;
      if (c && (c.saveData || /(^|-)2g/.test(c.effectiveType || ""))) return;
      var near = [].filter.call(document.images, function (im) {
        var r = im.getBoundingClientRect();
        return r.top < innerHeight * 3 && r.bottom > -innerHeight;
      });
      (function next(i) {
        var im = near[i];
        if (!im) return;
        if (im.loading === "lazy") im.loading = "eager";
        var p = im.decode ? im.decode() : Promise.resolve();
        p.catch(function () {}).then(function () { next(i + 1); });
      })(0);
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
    /* paused:true is what makes the label above true. onToggle only fires on a
       CHANGE of state, and the marquee starts life off-screen — so the trigger
       was already inactive when it was created, no toggle ever fired, and the
       tween ran from load to unload no matter where the reader was. */
    var marqTween = gsap.to(marq, { xPercent: -50, duration: 26, ease: "none", repeat: -1, paused: true });
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

  /* ---------- nothing scrolled, so open the gates ----------
     A renderer that never scrolls never sees anything behind these gates. That
     is not a hypothetical: measured in headless Chrome with JS on and scrollY 0,
     294 of the English page's 444 words and 214 of the Turkish page's 341 stay
     hidden — about two thirds of the copy — and everything from `.products` down
     is 73-100% invisible. A tall viewport does NOT rescue it, which was the
     assumption worth testing: the pinned sections define their scroll distance
     in vh, so the document grows with the viewport and the first hidden `.rise`
     never comes closer than ~1.8 viewports while the trigger fires at 0.88.
     Raising the viewport from 800px to 30000px moved that ratio from 3.11 to
     1.81 and no further.
     This releases the SAME list the reduced-motion branch above already
     releases, and it keys on BEHAVIOUR — nothing scrolled, nothing touched,
     nothing moved — not on the user agent. A person and a crawler are held to
     one rule, so there is no cloaking here and no second version of the page.
     It touches nothing in the hero and adds no CSS animation or transition;
     the opening choreography stays in lang-redirect.js under WAAPI.
     FOUR SECONDS IS A JUDGEMENT SQUEEZED FROM BOTH SIDES, and it costs
     something. Below it: the hero's own opening runs to ~2.5s (the foot line
     lands last), and a reader watching it has not scrolled yet — the audit
     proposed 3s, which is half a second after the curtain and too eager. Above
     it: a rendering pipeline that snapshots the DOM around the five-second mark
     gains nothing from a release that fires at six, and that was the first
     version of this — measured at a 5s settle it still read 66.2% hidden, i.e.
     the timer was correct and useless. Four sits 1.5s past the opening and a
     second inside a 5s budget.
     The cost is real and only this: a visitor who lands and sits perfectly
     still for four seconds loses the entrance animations below the fold and
     scrolls down to content already in place. Nothing above the fold changes.
     Pointer motion counts as a person, which on a desktop cancels it for
     nearly everyone. */
  (function () {
    var touched = false;
    ["wheel", "scroll", "touchstart", "touchmove", "keydown", "pointerdown", "pointermove", "mousemove"]
      .forEach(function (t) {
        addEventListener(t, function () { touched = true; }, { once: true, passive: true });
      });
    setTimeout(function () {
      if (touched || (window.scrollY || 0) > 0) return;
      var below = gsap.utils.toArray(".rise").filter(function (el) { return !el.closest(".hero"); });
      gsap.set(below.concat(gsap.utils.toArray(".products .slot")), { autoAlpha: 1, y: 0 });
      /* for these four the CLASS is the release contract, exactly as in the
         reduced-motion branch — same selectors, same order */
      [].forEach.call(document.querySelectorAll(".shelf-head"), function (h) { h.classList.add("is-in"); });
      [].forEach.call(document.querySelectorAll(".steps li"), function (li) { li.classList.add("is-inked"); });
      [].forEach.call(document.querySelectorAll(".kintsugi"), function (h) { h.classList.add("is-mended"); });
      [].forEach.call(document.querySelectorAll(".value"), function (v) { v.classList.add("is-spoked"); });
    }, 4000);
  })();

  /* PROOF OF LIFE, and the reason it exists: three entrance gates in the
     stylesheet — `.js .rise`, `.js .brighten`, `.js .shelf-head [data-slide]` —
     hide content that only this file ever un-hides. If it 404s, is blocked, or
     throws on an engine that chokes on something here, every section below the
     hero stays at opacity 0 forever and the site is a blank scroll. Setting this
     as the LAST statement means it is only ever set by a clean, complete run;
     lang-redirect.js watches for it and tears the gates down if it never comes. */
  document.documentElement.classList.add("js-live");
})();
