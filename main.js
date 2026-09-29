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
     When the mailbox on the domain is ready, update this constant —
     every a[data-mail] link (nav, closing CTA, footer) and the printed address
     (a[data-mail][data-mail-text]) follow automatically. The mailto in the
     HTML is only the no-JS fallback. */
  var CONTACT_EMAIL = "destek217product@gmail.com";
  [].forEach.call(document.querySelectorAll("a[data-mail]"), function (a) {
    a.href = "mailto:" + CONTACT_EMAIL;
    if (a.hasAttribute("data-mail-text")) a.textContent = CONTACT_EMAIL;
  });

  /* ---------- a window being dragged is not a reader acting ----------
     Both of these run before anything else listens for resize, so every other
     handler measures a page already in its new state. */
  (function () {
    var de = document.documentElement;
    /* THE SHORT-WINDOW RULE WITHOUT THE STEP. style.css shrinks the opening's
       headline and padding in windows 660px tall or less, and as a media query
       that is a step: a window dragged across 660px watched the headline lose a
       third of its size in one frame (108 -> 72px at 1440 wide). This writes
       how far the window is between the two layouts — 0 at 650px of height or
       less, 1 at 670 or more, a straight line between — and the stylesheet
       blends the two with it (html.tall-js). Outside that 20px band both are
       exactly what they were; without this script the step stays.
       clientHeight, not innerHeight: it is the height the media query itself
       reads, and a phone's address bar does not move it. */
    function tall() {
      var t = (de.clientHeight - 650) / 20;
      de.style.setProperty("--tall", (t <= 0 ? 0 : t >= 1 ? 1 : t).toFixed(3));
    }
    tall();
    de.classList.add("tall-js");
    /* TRANSITIONS ANSWER THE READER, NOT THE WINDOW. A breakpoint crossed in
       the middle of a drag started the nav capsule's 0.45s fade, so the links
       dissolved and came back while the edge was still moving. For as long as
       the window keeps changing, html.resizing turns every transition off; a
       change of state that happens under it simply lands. */
    var lastW = window.innerWidth, off = 0;
    function coarse() { return !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches); }
    addEventListener("resize", function () {
      tall();
      var w = window.innerWidth;
      /* a phone's address bar sliding is not a window being dragged */
      if (w === lastW && coarse()) return;
      lastW = w;
      de.classList.add("resizing");
      clearTimeout(off);
      off = setTimeout(function () { de.classList.remove("resizing"); }, 300);
    }, { passive: true });
  })();

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

    /* THE CLOSE BUTTON IS PART OF THE DRAWER even though it lives outside
       #navLinks. Querying only `n` dropped it from the cycle: measured with real
       key events, forward Tab looped the six links and never reached the X —
       a visible control a keyboard user could not get to unless they already
       knew Escape. It goes LAST, after the links. */
    function focusables() {
      var list = [].slice.call(n.querySelectorAll("a[href], button:not([disabled])"));
      list.push(t);
      return list.filter(function (el) {
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
      /* Tab is driven explicitly, not left to DOM order: the toggle sits BEFORE
         the nav in the document, so a native Tab from the last link would walk
         forward into the inert page and out to the browser chrome instead of
         reaching the X. */
      var f = focusables();
      if (!f.length) return;
      var i = f.indexOf(document.activeElement);
      e.preventDefault();
      var next = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1)
                            : (i < 0 || i === f.length - 1 ? 0 : i + 1);
      f[next].focus();
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
    [].forEach.call(document.querySelectorAll(".value"), function (v) { v.classList.add("is-spoked"); });
    /* The hero's third foot slot used to hold the ink-shake, which had to be
       torn out on this path because it did nothing without GSAP. It is a plain
       anchor to #products now, so it works on every path and nothing needs
       removing. */
    /* The band's hold control still does: the marquee is driven by GSAP,
       which never starts on this path, so the band is already still. A pause
       button over motionless type is a control that answers nothing. */
    var deadHold = document.getElementById("marqHold");
    if (deadHold && deadHold.parentNode) deadHold.parentNode.removeChild(deadHold);
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
    /* LERP IS THE "IT STUTTERS ON FAST SCROLL" DIAL, and it was set too loose.
       Reported as jank; measured, it is not jank at all — frame intervals held a
       flat 18ms with 1 dropped frame in 358. What the eye reads as a stall is
       INPUT LAG: flick the wheel twelve times in 200ms and at the moment your
       hand stops the page has travelled 1841px, then keeps coasting on its own
       for another 5359px and does not come to rest for 1218ms. A page still
       sliding more than a second after you stopped asking it to does not feel
       smooth, it feels like it is not listening.
       Measured settle time after the wheel stops: lerp 0.12 -> 1218ms,
       0.20 -> 801ms, 0.28 -> 850ms, 0.40 -> 534ms. 0.25 is the middle of that
       curve: it roughly halves the coast while keeping the glide the design
       wants. This is one number — if it should feel silkier, lower it; if it
       should feel welded to the wheel, raise it. */
    lenis = new Lenis({ lerp: 0.25 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    /* THE SCROLLBAR WINS. While Lenis glides a wheel turn out (about half a
       second at this lerp) it ignores every native scroll and keeps writing its
       own position — so a scrollbar grabbed inside that half second was fought
       frame by frame. Measured: three wheel notches, then the thumb dragged
       down; the page jumped 70 to 250px back and forth five times before the
       glide ran out. A touchpad makes that the common case, because its
       momentum keeps the glide alive after the fingers lift. Any scroll Lenis
       did not write itself (the scrollbar, the keyboard, find-in-page, a text
       selection pulling the page) now ends the glide where the page actually
       is, and Lenis follows the native scroll from there, as it does when idle. */
    addEventListener("scroll", function () {
      if (lenis.isScrolling !== "smooth") return;
      if (Math.abs((window.scrollY || 0) - lenis.animatedScroll) < 2) return;
      lenis.scrollTo(window.scrollY || 0, { immediate: true, force: true });
    }, { passive: true });
  }

  /* ---------- the reader stays where they were when the window changes ----------
     RESIZING THREW THE READER OUT OF THE PAGE. ScrollTrigger re-measures by
     scrolling to 0, laying the page out and scrolling back to the same PIXEL —
     and across a breakpoint it does not even do that: a gsap.matchMedia context
     changing (821px for the parallax, 861px for the flick) reverts its triggers
     first, the next refresh then skips recording the position, and the page is
     left at the top. Measured: parked at 3605px on an 800px window, widened past
     821 — scrollY 0. Even when it does restore, a pixel is the wrong unit: the
     sections above grow or shrink with the width, so the same pixel is a
     different paragraph.
     So the position is kept as CONTENT: which block is at the top of the screen
     and how far into it. It is read while the reader scrolls (never during a
     refresh, when the page is momentarily at 0), held still for the length of a
     window drag, and written back after every refresh. The opening — the sticky
     hero plus its empty run — is kept as the sun's own progress while the sun
     is riding, and as a fraction of the opening's length in the black stretch
     after it, so the sun picks up at the same point of its climb. */
  /* While a window drag holds the reader on the sun's ride, this is the ride's
     progress they are held at, unrounded. The scroll written back is a whole
     pixel, and in the flood one pixel is 3% of the disc's size — redrawn from
     the rounded scroll on every frame of a drag, the sun visibly breathed. */
  var rideHold = null;
  /* Layout decisions that have to be taken for the new window BEFORE the page is
     re-measured on a resize (see below) — the process band registers its pin
     decision here. */
  var layoutHooks = [];
  (function () {
    var run = document.querySelector(".hero-run");
    var blocks = [].slice.call(document.querySelectorAll("main > section:not(.hero), main > .marquee, body > footer"));
    /* a pinned section's real extent is its spacer: the section itself sits at
       top 0 for the whole pin */
    function box(el) { var p = el.parentElement; return p && p.classList.contains("pin-spacer") ? p : el; }
    function read() {
      var y = window.scrollY || 0;
      if (run) {
        var end = run.getBoundingClientRect().bottom + y;
        if (y < end) {
          /* on the sun's ride the place IS the sun's progress (see liveP) */
          var ride = innerHeight * INK_RIDE;
          if (y <= ride) return { el: null, p: ride > 0 ? y / ride : 0 };
          return { el: null, f: end > 0 ? y / end : 0 };
        }
      }
      for (var i = 0; i < blocks.length; i++) {
        var r = box(blocks[i]).getBoundingClientRect();
        if (r.bottom > 0 && r.height > 0) return { el: blocks[i], f: -r.top / r.height };
      }
      return null;
    }
    function write() {
      if (!anchor) return;
      var y = window.scrollY || 0, t;
      if (!anchor.el) {
        if (!run) return;
        t = anchor.p != null ? anchor.p * innerHeight * INK_RIDE
          : anchor.f * (run.getBoundingClientRect().bottom + y);
      } else {
        if (!anchor.el.isConnected) return;
        var r = box(anchor.el).getBoundingClientRect();
        t = r.top + y + anchor.f * r.height;
      }
      t = Math.round(Math.max(0, Math.min(t, document.documentElement.scrollHeight - innerHeight)));
      if (Math.abs(t - y) < 2) return;
      /* Lenis re-measures the page 250ms after a resize; until then it clamps a
         target to the OLD page's length, so a window grown taller near the end
         of the page would be put back short of where the reader was */
      if (lenis) { lenis.resize(); lenis.scrollTo(t, { immediate: true, force: true }); }
      else window.scrollTo(0, t);
    }
    var anchor = null, held = false, raf = 0, calm = 0;
    addEventListener("scroll", function () {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        if (!held && !ScrollTrigger.isRefreshing) anchor = read();
      });
    }, { passive: true });
    /* a drag delivers dozens of resize events and several refreshes; the anchor
       taken before the first one is the only honest one.
       AND IT IS WRITTEN IN EVERY ONE OF THEM, not only after the refresh. The
       refresh waits until 0.2s after the last resize event, so the page slid for
       the whole of a drag and jumped when it was let go. Measured with the top
       edge pulled down from 804 to 504px and the shelf at the top of the screen:
       the shelf slid 528px up, then came back in one jump 0.2s after release;
       mid-page the jump was 800px. The browser runs resize handlers before it
       paints the frame, so writing here keeps the reader still while the window
       moves.
       AND THE PAGE IS RE-MEASURED IN EVERY ONE OF THEM TOO. Keeping the reader
       still was not enough while everything ScrollTrigger had measured — the
       process band's pin and its spacer, every scrubbed position — stayed as the
       OLD window had it until the same 0.2s after release. Filmed: the process
       track slid 130px sideways after the hand let go, and at the foot of the
       page the reader drifted 337px during the drag and snapped back after it.
       A refresh costs 3-10ms on this page (measured), well inside a frame, so
       the page is laid out, decided (layoutHooks: the process band's pin) and
       measured for the new window before that window is ever painted. */
    var lastW = window.innerWidth;
    addEventListener("resize", function () {
      var w = window.innerWidth;
      /* a phone's address bar sliding away is a height-only resize in the middle
         of a swipe: ScrollTrigger ignores it (ignoreMobileResize) and so does
         this, or the page would be pulled back under the finger */
      if (w === lastW && window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return;
      lastW = w;
      held = true;
      if (anchor && anchor.p != null) rideHold = anchor.p;
      clearTimeout(calm);
      calm = setTimeout(release, 900);
      layoutHooks.forEach(function (fn) { fn(); });
      ScrollTrigger.refresh();   /* fires "refresh", which writes the anchor */
      write();
    }, { passive: true });
    function release() { held = false; rideHold = null; }
    /* the reader taking the scroll back ends the hold at once */
    ["wheel", "touchstart", "keydown", "pointerdown"].forEach(function (t) {
      addEventListener(t, release, { passive: true });
    });
    ScrollTrigger.addEventListener("refresh", write);
  })();

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

  /* IF THE WATCHDOG ALREADY GAVE UP, DO NOT PUT THE CURTAINS BACK.
     lang-redirect.js removes `.js` after six seconds without `js-live`, which
     tears every CSS entrance gate down and leaves the page in its readable
     no-JS presentation. That is the right call — but this file used to arrive
     afterwards and stage everything again, so on a slow connection the page
     filled in at 6.6s and then EMPTIED, and stayed empty until the unrelated
     4-second no-scroll failsafe happened to release it. Measured on slow 3G
     (400 kbps / 400ms RTT) with 6x CPU: 26 of 29 blocks visible at 6596ms, then
     hidden again a beat later. A failsafe that fires and is then quietly undone
     is worse than no failsafe, because it teaches you the page recovered.
     If the watchdog has fired, the entrance is forfeit and the content stays. */
  var watchdogFired = !document.documentElement.classList.contains("js");

  /* ---------- rise reveals ----------
     The hero entrance is pure CSS (it starts with the first paint, before any
     CDN script arrives) — GSAP only drives the below-fold, scroll-gated reveals. */
  /* The shelf is excluded: it is the first thing you see after the ink lands,
     and it gets its own choreography further down rather than the generic
     fade-up every other block uses. */
  var belowRise = gsap.utils.toArray(".rise").filter(function (el) {
    return !el.closest(".hero") && !el.closest(".products");
  });
  if (!watchdogFired) gsap.set(belowRise, { autoAlpha: 0, y: 26 });
  belowRise.forEach(function (el) {
    gsap.to(el, { autoAlpha: 1, y: 0, duration: 1.2, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true }, onComplete: function(){ settle(el); } });
  });

  /* THE CHROME NO LONGER PARKS ITSELF. It used to slide the capsule and the
     hamburger off the top whenever the reader scrolled down, and bring them
     back on the way up. The reason was real — the opaque capsule was measured
     eating letters out of headlines that run to the right edge — but the cure
     cost more than the disease: navigation that vanishes on the gesture people
     use most, and on a phone the hamburger IS the only navigation, so the one
     control they were reaching for was the one that left. Reported as a bug,
     which is the honest verdict on any control that hides while you use it.
     The overlap is handled where it belongs, in the type's own measure, and is
     re-checked after this change rather than assumed. Removing it also stops a
     class from being toggled on <html> during scroll, which invalidated style
     for the whole document every time it flipped. */

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

  /* The kintsugi headline's mend animation lived here and is gone with it — the
     broken-sentence treatment read as a stray word above a rule rather than as a
     repair, and it is one sentence now. See the note in style.css. */

  (function () {
    var section = document.querySelector(".process"),
        emaki = document.querySelector(".emaki"),
        track = document.querySelector(".steps");
    if (!section || !emaki || !track) return;
    var items = gsap.utils.toArray(".steps li");

    /* TOUCH KEEPS THE NATIVE SWIPE ROW — and "touch" is asked, not guessed from
       width. The note here always said pinning fights the OS scroll on touch,
       but the gate only checked min-width: 901px, so a phone held sideways
       (932x430) and every iPad in landscape got the pin anyway. Measured with
       real touch events: the horizontal drag did nothing, and on a 430px-tall
       screen the step texts sat below the fold for the whole pin. The pointer
       query is the question the comment was always asking.
       AND THE WIDTH GATE IS GONE FROM IT. A mouse cannot drag a row sideways,
       and the row hides its scrollbar, so a desktop window narrower than 901px
       got a handscroll whose last two panels no pointer could reach. The pin is
       the only way a mouse reads the whole sequence, so it runs at any width a
       mouse can be at. */
    var PIN_MQ = "(hover: hover) and (pointer: fine)";
    var root = document.documentElement;
    var tl = null, rowTriggers = [];
    function nativeRow() {
      if (rowTriggers.length) return;
      rowTriggers = items.map(function (li) {
        return ScrollTrigger.create({ trigger: li, start: "top 86%", once: true,
          onEnter: function () { li.classList.add("is-inked"); } });
      });
    }
    /* THE CONTENT BOX, NOT clientWidth. clientWidth includes padding, but the
       track starts at padding-left, so the old sum stopped the scroll exactly
       padding-left short and never honoured padding-right at all — the inset
       the stylesheet put there, by measurement, to keep the last panel out from
       under the tate rail. Measured end positions before this: the last panel's
       right edge 38px off-screen at 1280, 44px at 1440, 46px at 1920 —
       padding-left every time, to the pixel.
       Measured at refresh, never cached: the width depends on fonts and on the
       viewport, and a stale number is the classic pinned-horizontal bug. */
    function distance() {
      var cs = getComputedStyle(emaki);
      var inner = emaki.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      return Math.max(0, track.scrollWidth - inner);
    }
    /* NO JOURNEY, NO PIN. The panels saturate at their clamp() maximum, so the
       track stops growing at 2520px; on screens that wide there is nothing to
       travel, yet the pin still claimed distance + half a viewport of scroll.
       Measured at 2560 and 3440: 720px of scrolling during which the page did
       not move and the track's transform read 0 at all seven samples. A short
       travel is not worth a long freeze either, hence a floor, not zero. */
    function pin() {
      rowTriggers.forEach(function (t) { t.kill(); });
      rowTriggers = [];
      root.classList.add("emaki-pinned");
      tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          /* A SECTION TALLER THAN THE WINDOW PINS BY ITS FOOT. Pinned by its top,
             a short window held the heading on screen and the moving track
             below the fold for the whole pin — the only part of the section
             that does anything, out of sight while it did it. */
          start: function () { return section.offsetHeight > innerHeight ? "bottom bottom" : "top top"; },
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
    }
    /* Leaving the pin hands the row back finished: the track to its resting
       place, every stroke inked, and no inline clip-path left behind to
       out-rank the stylesheet's own resting state. */
    function unpin() {
      root.classList.remove("emaki-pinned");
      if (tl) {
        if (tl.scrollTrigger) tl.scrollTrigger.kill(true);
        tl.kill();
        tl = null;
      }
      gsap.set(track, { clearProps: "transform,x" });
      items.forEach(function (li) {
        li.classList.add("is-inked");
        var mark = li.querySelector(".step-mark");
        if (mark) gsap.set(mark, { clearProps: "clipPath" });
      });
    }
    /* THE DECISION IS TAKEN AGAIN WHENEVER THE WINDOW CHANGES, both ways. It used
       to be taken once, at load: a window opened narrow never got the pin when
       widened (measured: 1694px of pin missing, the row stuck as a hidden
       scroller), and the tear-down only ran in one direction. Returns whether
       the page's geometry changed, so the caller knows to re-measure. */
    function decide() {
      var want = matchMedia(PIN_MQ).matches && distance() >= 240;
      if (want && !tl) { pin(); return true; }
      if (!want && tl) { unpin(); nativeRow(); return true; }
      if (!want) nativeRow();
      return false;
    }
    decide();

    /* the pin's length is derived from a measured width, so it has to be
       recomputed once the webfonts land and the panels settle */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { decide(); ScrollTrigger.refresh(); });
    }

    function reconsider() { if (decide()) ScrollTrigger.refresh(); }
    var pointerMQ = matchMedia(PIN_MQ);
    if (pointerMQ.addEventListener) pointerMQ.addEventListener("change", reconsider);
    else if (pointerMQ.addListener) pointerMQ.addListener(reconsider);
    /* the travel depends on the width: a window widened until the track fits
       drops the pin, one narrowed again takes it back — decided in the same
       frame as the resize, just before the page is re-measured (the anchor's
       resize handler runs the hooks, then refreshes). It used to wait 120ms
       after the drag ended, so the band switched modes after the hand let go. */
    layoutHooks.push(decide);
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
    var heroBox = document.querySelector(".hero");
    var placedOnce = false;   /* the disc's entrance runs once — see place() */

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
      /* THE CUT COVERS THE CLIMB, NOT THE WINDOW. A mask over a layer that
         moves is drawn as its own offscreen pass on every frame the disc moves,
         and `.sun-clip` was the whole scene, so that pass was window-sized for a
         disc a fifth of the window across. Measured at glide speed on an
         integrated GPU: dropping the mask outright took the climb from 3.0% to
         0.4% late frames. The mask has to stay (it IS the ridge), so the box
         shrinks to where the masked disc can ever be: the rectangle spanned by
         its rest and its apex, since the arc is monotonic on both axes and the
         disc is unscaled until the mask is lifted (sun-up, r > 0.98; the flood
         starts at HOLD). Every position below is written relative to that box
         — disc, mask size, mask offset — so on screen nothing moves. */
      var rad = geo.d / 2, dpr = window.devicePixelRatio || 1;
      function snap(v, up) { return (up ? Math.ceil(v * dpr) : Math.floor(v * dpr)) / dpr; }
      var cl = snap(Math.min(geo.restX, geo.apexX) - rad - 2, false);
      var ct = snap(geo.apexY - rad - 2, false);
      var cw = snap(Math.max(geo.restX, geo.apexX) + rad + 2, true) - cl;
      var ch = snap(geo.rest + rad + 2, true) - ct;
      sun.style.top = (geo.rest - rad - ct).toFixed(2) + "px";
      /* pinned to the PLATE's column, not the viewport's: the plate is wider
         than the screen, so anchoring the sun to a viewport percentage would
         drift it off its own peak on every window shape */
      sun.style.left = (geo.restX - rad - cl).toFixed(2) + "px";
      /* THE DISC FADES IN WHEN IT BECOMES VISIBLE, NOT WHEN THE PLATE DECODES,
         and that is the whole difference between arriving and appearing.
         The fade used to be started in lang-redirect.js alongside the plate's,
         which is the right tempo but the wrong clock: the disc is
         `visibility: hidden` until this function has measured the plate and
         written its resting top/left, and an opacity animation on a hidden
         element still runs — it just runs where nobody can see it. Measured on
         slow 4G with 4x CPU: the fade started at 2.7s and this line ran at
         4.0s, by which point the animation was at opacity 0.95. The disc
         therefore snapped into existence at almost full strength while the
         mountain beside it had faded in over a second and a half. Reported as
         "the sun arrives with a bang".
         Same duration and same curve as the plate's fade in lang-redirect.js —
         they are one arrival, so if you change one, change both. Guarded by a
         flag because place() also runs on resize, and a window drag must not
         restage the opening. */
      sun.style.visibility = "visible";
      if (!placedOnce) {
        placedOnce = true;
        if (sun.animate) {
          sun.animate([{ opacity: 0 }, { opacity: 1 }],
            { duration: 1800, easing: "cubic-bezier(0.45, 0.05, 0.25, 1)", fill: "backwards" });
        }
      }
      /* THE CUT, registered to the painting. The mask is the plate's own alpha
         inverted, so it has to sit exactly where the plate sits — same width,
         same left edge, and its bottom band aligned to the plate's bottom. The
         image is three plate-heights tall with the top two thirds fully opaque,
         which is what lets the disc keep rising past the top of the painting
         instead of vanishing at its edge. */
      var clip = document.querySelector(".sun-clip");
      if (clip) {
        clip.style.right = clip.style.bottom = "auto";
        clip.style.left = cl + "px"; clip.style.top = ct + "px";
        clip.style.width = cw + "px"; clip.style.height = ch + "px";
        var size = b.w.toFixed(1) + "px " + (b.h * 3).toFixed(1) + "px";
        var pos  = (b.left - cl).toFixed(2) + "px " + (b.top - b.h * 2 - ct).toFixed(2) + "px";
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
      /* MEASURED AGAINST THE WINDOW AS THE PARKED HERO SEES IT. The hero is
         parked at top 0 only for its own stage (see .hero-stage); past it the
         hero scrolls away, and a refresh down the page (a late image, a resize)
         would read the disc thousands of px above the window and size the flood
         for that: measured 19x at scrollY 6000 and 128x after a resize, one
         composited layer tens of thousands of px across. On the laptop's
         integrated GPU that starved everything else: back at the top the nav
         capsule was not drawn at all and the disc only in part. Taking the
         hero's own offset back out gives the parked answer from anywhere on the
         page; while the hero IS parked the offset is 0 and nothing changes. */
      var lift = heroBox ? heroBox.getBoundingClientRect().top : 0;
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2 - lift;
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
    function render(p) {
      if (!geo) place();
      if (!geo) return;
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
      /* POSITION FIRST, THEN MEASURE. neededScale() reads where the disc sits,
         and asking it before the new x/y are written measured last frame's
         position. While scrolling that is one frame behind and nobody sees it;
         after a jump — a resize, the reader's position being restored — there is
         no next frame to catch up in, and the flood froze at the wrong size:
         measured 2.80 on screen against the 3.24 the same scroll gives when
         loaded fresh. */
      gsap.set(sun, { x: ax, y: ay, force3D: true });
      gsap.set(sun, { scale: f > 0 ? 1 + (neededScale() - 1) * f : 1 });
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
    /* THE RIDE'S PROGRESS IS READ LIVE, from the scroll and the window as they
       are now, not from the trigger. Between a resize and ScrollTrigger's
       refresh — held until 0.2s after a drag ends — the trigger still divides by
       the OLD window's height: pulling the top edge of the window down, the disc
       slid back along its arc for the whole drag and leapt forward on release.
       With start 0 and end innerHeight * RIDE this is the trigger's own formula,
       so between resizes the two are the same number. During a drag it is the
       progress the reader is held at (rideHold), not the rounded scroll. */
    function liveP() {
      if (rideHold != null) return rideHold;
      var end = window.innerHeight * RIDE;
      return end > 0 ? Math.min(1, Math.max(0, (window.scrollY || 0) / end)) : 0;
    }
    /* one scrubbed trigger for the whole gesture: three beats read off a single
       progress value, so the hands can never drift apart */
    ScrollTrigger.create({
      start: 0,
      end: function () { return window.innerHeight * RIDE; },
      scrub: true, invalidateOnRefresh: true,
      /* DRAWN AGAIN FOR THE NEW WINDOW, not only re-placed. place() moves the
         disc's resting box, but the arc offset and the flood scale on its
         transform were written for the old window, and nothing redrew them
         until the next scroll. Measured after a 1440x900 -> 1100x760 drag with
         the flood under way: scale 5.61 on screen where the new window needs
         6.75, so the ink stopped short of the corners. */
      onRefresh: function () { place(); render(liveP()); },
      onUpdate: function () { render(liveP()); }
    });

    /* RE-PLACE ON RESIZE, not just invalidate. Dropping `geo` alone left the
       last-written numbers on the element until something happened to call
       place() again — and with nothing scrolled, nothing did. Caught by
       measurement: after a window resize the mask was still sized 1080x1209 for
       the old layout while the plate had become 1510x564, so the silhouette and
       the drawing were registered to different boxes. One rAF of debounce keeps
       a drag-resize from writing on every intermediate width, and the disc is
       redrawn in the same frame so it follows the drag instead of waiting for
       the release. */
    var replace = 0;
    addEventListener("resize", function () {
      geo = null;
      if (replace) cancelAnimationFrame(replace);
      replace = requestAnimationFrame(function () {
        replace = 0; place();
        render(liveP());
      });
    }, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    addEventListener("load", place);
    place();

    /* No fade on the hero copy. GSAP would capture its start opacity while the
       WAAPI entrance is still mid-flight and animate 0 -> 0, blanking the hero.
       It isn't needed either: the sun sits above the copy once it floods. */
  })();

  /* THE INK-SHAKE IS GONE, AND SO IS ITS PHYSICS ENGINE. A tap on the hero used
     to let every sumi speck fall, bounce off its neighbours and pile along the
     foot rule — 160 lines of hand-rolled circle collision. It was a toy: it
     said nothing about what this studio does, and it was the one control on
     the opening screen, which made the most prominent affordance on the page
     the least useful one. Its slot now carries a link into the work itself.
     Removing it also retires 16 permanently composited layers: `.specks i`
     carried will-change for the sake of this animation and nothing else.

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

    if (!watchdogFired && slots.length) gsap.set(slots, { autoAlpha: 0, y: 46 });
    if (!watchdogFired && rest.length) gsap.set(rest, { autoAlpha: 0 });

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
  /* A PANEL THE PAGE CARRIES UNDER A STILL POINTER IS NOT BEING POINTED AT.
     Chrome re-hit-tests the pointer while the page scrolls, so a wheel read
     down the shelf fired mouseenter/mouseleave on whichever panel slid under
     the cursor — measured: enter at scrollY 1582, leave at 2104, mid-scroll —
     and each one flicked its sheet open and shut again on the way past: a
     layer promoted, a 90px shadow rastered, a seven-second zoom started, all
     for a card that was gone 300ms later. Measured in a real window at 165 Hz
     that was the worst stretch left on the page (7.2% late frames in the shelf
     band against 0.4-0.6% everywhere else below the hero).
     So while the page is moving, entering a panel only marks it; when the
     scroll has been still for a beat, the panel under the pointer opens. A
     pointer that actually moves over a panel, or keyboard focus, opens it at
     once, exactly as before. The hover styles follow the same state
     (.slot.is-lit), because :hover itself cannot tell the two apart. */
  var lastScrollAt = -1e9, pointerX = -1, pointerY = -1, flickSets = 0;
  addEventListener("scroll", function () { lastScrollAt = performance.now(); }, { passive: true });
  function notePointer(e) { pointerX = e.clientX; pointerY = e.clientY; }
  /* the wheel and the panel's own enter carry the pointer's place too, so a
     cursor that has not moved since the page loaded is still known */
  addEventListener("mousemove", notePointer, { passive: true });
  addEventListener("wheel", notePointer, { passive: true });
  document.addEventListener("mouseout", function (e) { if (!e.relatedTarget) pointerX = pointerY = -1; });
  function bindFlick(midTurn, endTurn) {
    return function () {
      var bound = [], waiting = null, settle = 0;
      var root = document.documentElement;
      root.classList.toggle("flick", ++flickSets > 0);
      function moving() { return performance.now() - lastScrollAt < 150; }
      /* re-armed by every scroll while a panel is waiting; fires once the page
         has been still for 160ms and opens the panel the pointer is really on */
      function arm() {
        clearTimeout(settle);
        settle = setTimeout(function () {
          var s = waiting;
          waiting = null;
          if (!s || moving()) { if (s && moving()) { waiting = s; arm(); } return; }
          var at = pointerX >= 0 ? document.elementFromPoint(pointerX, pointerY) : null;
          for (var i = 0; i < bound.length; i++) {
            if (bound[i][0] === s && at && s.contains(at)) bound[i][5]();
          }
        }, 160);
      }
      function onScroll() { if (waiting) arm(); }
      addEventListener("scroll", onScroll, { passive: true });
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
        var lit = false;
        var open = function () {
          if (waiting === slot) waiting = null;
          if (!lit) { lit = true; slot.classList.add("is-lit"); }
          tl.play();
        };
        var shut = function () {
          if (waiting === slot) waiting = null;
          if (lit) { lit = false; slot.classList.remove("is-lit"); }
          tl.reverse();
        };
        var enter = function (e) { notePointer(e); if (moving()) { waiting = slot; arm(); } else open(); };
        var move = function () { if (!lit && !moving()) open(); };
        var blur = function (e) { if (!slot.contains(e.relatedTarget)) shut(); };
        slot.addEventListener("mouseenter", enter);
        slot.addEventListener("mousemove", move, { passive: true });
        slot.addEventListener("mouseleave", shut);
        /* keyboard reaches the panel through the link stretched over it */
        slot.addEventListener("focusin", open);
        slot.addEventListener("focusout", blur);
        bound.push([slot, enter, shut, blur, tl, open, move]);
      });
      return function () {
        clearTimeout(settle);
        removeEventListener("scroll", onScroll);
        root.classList.toggle("flick", --flickSets > 0);
        bound.forEach(function (b) {
          b[0].removeEventListener("mouseenter", b[1]);
          b[0].removeEventListener("mousemove", b[6]);
          b[0].removeEventListener("mouseleave", b[2]);
          b[0].removeEventListener("focusin", b[5]);
          b[0].removeEventListener("focusout", b[3]);
          b[0].classList.remove("is-lit");
          b[4].kill();
        });
        bound = [];
        waiting = null;
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
    /* `held` outranks the scroll trigger. Without it the visitor's pause would
       last only until the band left the screen and came back, because onToggle
       would call play() on the way in — the control would look broken rather
       than be broken, which is worse. */
    var held = false;
    var marqST = ScrollTrigger.create({ trigger: ".marquee", start: "top bottom", end: "bottom top",
      onToggle: function (self) { if (held) return; self.isActive ? marqTween.play() : marqTween.pause(); } });
    /* Both labels come off the element. This file has no language branch in it
       anywhere else and should not gain its first one for two strings — the
       site's copy lives in the two HTML files, and that is where the translator
       looks. */
    var hold = document.getElementById("marqHold");
    if (hold) {
      var labelPause = hold.getAttribute("aria-label");
      var labelPlay = hold.getAttribute("data-label-play") || labelPause;
      hold.addEventListener("click", function () {
        held = !held;
        hold.setAttribute("aria-pressed", held ? "true" : "false");
        hold.setAttribute("aria-label", held ? labelPlay : labelPause);
        if (held) marqTween.pause();
        else if (marqST.isActive) marqTween.play();
      });
    }
  }

  /* The reach section has no moving part of its own — its copy rides the shared
     `.rise` reveal like every other section. */

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }

  /* ---------- the page grows late: re-measure ----------
     Every trigger below a block is measured against that block's height, and
     some blocks only learn their height late — a lazy image decoding mid-scroll,
     a face that lands after the fonts-ready refresh. The studio's figure was
     the one caught (fixed at its source in style.css), but it was caught only
     because a window resize happened to re-measure the page; nothing else would
     have. This watches main's own height and re-measures when it moves.
     Its own refreshes do not re-trigger it (the height is recorded after each
     one), and a window resize is left to ScrollTrigger, which already handles
     that event. */
  (function () {
    var main = document.getElementById("main");
    if (!main || !window.ResizeObserver) return;
    var lastH = main.offsetHeight, sizedAt = 0, t = 0;
    addEventListener("resize", function () { sizedAt = Date.now(); }, { passive: true });
    ScrollTrigger.addEventListener("refresh", function () { lastH = main.offsetHeight; });
    new ResizeObserver(function () {
      if (ScrollTrigger.isRefreshing || Date.now() - sizedAt < 600) return;
      if (Math.abs(main.offsetHeight - lastH) < 2) return;
      clearTimeout(t);
      t = setTimeout(function () { ScrollTrigger.refresh(); }, 150);
    }).observe(main);
  })();

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
      /* for these three the CLASS is the release contract, exactly as in the
         reduced-motion branch — same selectors, same order */
      [].forEach.call(document.querySelectorAll(".shelf-head"), function (h) { h.classList.add("is-in"); });
      [].forEach.call(document.querySelectorAll(".steps li"), function (li) { li.classList.add("is-inked"); });
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
