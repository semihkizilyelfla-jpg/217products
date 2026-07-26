/* 217 Products — real-time 3D sumi-e globe (Three.js, ES module build).
   A textured sphere with a warm ink-wash world map and a soft gold fresnel
   rim. It rotates on its own and can be grabbed and spun with any pointer —
   mouse, pen or touch (horizontal swipes spin it, vertical swipes keep
   scrolling the page). Renders only in view.

   Loading contract:
   1. WebGL capability is probed FIRST on a throwaway canvas — if the machine
      can't produce a context, the static fallback shows immediately and
      Three.js is never fetched (no renderer construction, no retries).
   2. Three.js is self-hosted and arrives lazily via dynamic import()
      when the section approaches. The deprecated UMD three.min.js is gone. */
(function () {
  "use strict";
  var mount = document.getElementById("globe3d");
  if (!mount) return;

  var THREE_URL = "vendor/three.module.min.js?v=0.160.1";

  /* The still globe is only fetched when the live one can't run — otherwise
     it is dead weight on every visit, since the canvas covers it anyway.
     When it takes over, the "drag to spin" cue would be a lie, so it goes,
     and the region is relabelled as the still illustration it now is. */
  function showFallback() {
    var img = mount.querySelector(".globe-fallback");
    if (img && !img.getAttribute("src")) img.src = img.getAttribute("data-src");
    mount.classList.remove("gl-ok");
    var panel = mount.closest(".globe-panel");
    var hint = panel && panel.querySelector(".globe-hint");
    if (hint) hint.hidden = true;
    mount.setAttribute("aria-label", document.documentElement.lang === "tr"
      ? "Mürekkep dünya illüstrasyonu" : "Ink illustration of the globe");
  }

  /* cheap capability probe, no renderer involved */
  function webglAvailable() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext &&
        (c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }

  function boot() {
    if (!webglAvailable()) { showFallback(); return; }
    import(THREE_URL).then(function (THREE) { init(THREE); }, showFallback);
  }

  /* Heavy WebGL setup is deferred until the section approaches the viewport,
     so it never competes with the hero's first paint (biggest win on phones). */
  function init(THREE) {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
                /[?&]motion=reduce/.test(location.search);

  var isSmall = window.matchMedia("(max-width: 820px)").matches;
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      /* phones: skip MSAA (the 1.5x pixel ratio already resolves the edge),
         keep the GPU in its normal power state, and let shaders run at medium
         precision — this globe is soft ink, it needs none of the extra cost */
      antialias: !isSmall,
      alpha: true,
      powerPreference: isSmall ? "default" : "high-performance",
      precision: isSmall ? "mediump" : "highp"
    });
  } catch (e) { showFallback(); return; } /* context refused after all — one attempt, then the still image */
  /* A soft ink globe gains nothing from 2x supersampling, and the fragment
     cost scales with the square of this number: 1.5 on desktop, 1 on phones. */
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1 : 1.5));
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  if ("toneMapping" in renderer) renderer.toneMapping = THREE.NoToneMapping;
  function box() { return Math.max(1, Math.min(mount.clientWidth, mount.clientHeight)); }
  renderer.setSize(box(), box());
  mount.appendChild(renderer.domElement);
  mount.classList.add("gl-ok");
  renderer.domElement.style.cursor = "grab";
  renderer.domElement.style.touchAction = "pan-y"; /* let vertical scroll pass through on touch */

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 4.3);

  var tilt = new THREE.Group();
  tilt.rotation.set(0.32, 0, 0.05);
  scene.add(tilt);

  var globe = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 48),
    new THREE.MeshBasicMaterial({ color: 0xf3ecdc })
  );
  tilt.add(globe);
  globe.rotation.y = -1.9; /* open on the Americas, not the empty Pacific */

  /* gold fresnel rim — defines the sphere silhouette against the cream page */
  var rim = new THREE.Mesh(
    new THREE.SphereGeometry(1.02, 48, 32),
    new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xc39a46) },
        uPower: { value: 3.0 },
        uIntensity: { value: 1.0 }
      },
      vertexShader:
        "varying vec3 vN; varying vec3 vP;" +
        "void main(){ vN = normalize(normalMatrix * normal);" +
        " vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz;" +
        " gl_Position = projectionMatrix * mv; }",
      fragmentShader:
        "varying vec3 vN; varying vec3 vP; uniform vec3 uColor; uniform float uPower; uniform float uIntensity;" +
        "void main(){ vec3 v = normalize(-vP); float f = pow(1.0 - abs(dot(vN, v)), uPower);" +
        " gl_FragColor = vec4(uColor, f * uIntensity); }",
      transparent: true, side: THREE.BackSide, depthWrite: false
    })
  );
  scene.add(rim);

  /* faint ink limb (front-side fresnel) — shades the sphere's edge so it still
     reads as a 3D globe even when a mostly-ocean, light hemisphere faces us,
     instead of vanishing into the cream page. */
  var limb = new THREE.Mesh(
    new THREE.SphereGeometry(1.004, 48, 32),
    new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0x2b2219) },
        uPower: { value: 2.4 },
        uIntensity: { value: 0.34 }
      },
      vertexShader:
        "varying vec3 vN; varying vec3 vP;" +
        "void main(){ vN = normalize(normalMatrix * normal);" +
        " vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz;" +
        " gl_Position = projectionMatrix * mv; }",
      fragmentShader:
        "varying vec3 vN; varying vec3 vP; uniform vec3 uColor; uniform float uPower; uniform float uIntensity;" +
        "void main(){ vec3 v = normalize(-vP); float f = pow(1.0 - abs(dot(vN, v)), uPower);" +
        " gl_FragColor = vec4(uColor, f * uIntensity); }",
      transparent: true, side: THREE.FrontSide, depthWrite: false
    })
  );
  scene.add(limb);

  new THREE.TextureLoader().load("assets/globe-map.webp?u=2", function (tex) {
    if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.wrapS = THREE.RepeatWrapping;
    globe.material.map = tex;
    globe.material.color.set(0xffffff);
    globe.material.needsUpdate = true;
    renderer.render(scene, camera);
  });

  /* ---------- motion: continuous idle spin + pointer drag ---------- */
  var AUTO = reduced ? 0 : 0.0016;
  var velY = AUTO, velX = 0;          /* momentum while free-spinning */
  var dragging = false, lastX = 0, lastY = 0, resumeAt = 0;
  var inView = false, running = false;

  function clampTilt() { globe.rotation.x = Math.max(-0.9, Math.min(0.9, globe.rotation.x)); }

  var rframe = 0;
  function loop(ts) {
    if (!inView) { running = false; return; }
    if (!dragging) {
      globe.rotation.y += velY;
      globe.rotation.x += velX;
      clampTilt();
      /* ease residual drag momentum back toward the gentle idle spin */
      if (ts > resumeAt) {
        velY += (AUTO - velY) * 0.03;
        velX += (0 - velX) * 0.06;
      }
    }
    /* Full frame-rate while dragging or momentum is settling; the gentle idle
       spin only needs ~30fps, so render every other frame — halves GPU work
       (a big win on phones) with no visible change to the slow rotation. */
    var busy = dragging || Math.abs(velY - AUTO) > 0.0004 || Math.abs(velX) > 0.0004;
    if (busy || (rframe++ & 1) === 0) renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  function start() { if (running || !inView) return; running = true; requestAnimationFrame(loop); }

  var el = renderer.domElement;
  el.addEventListener("pointerdown", function (e) {
    /* touch spins too: touch-action pan-y hands VERTICAL swipes to the page
       (the browser fires pointercancel when it claims the scroll, which ends
       the drag) while HORIZONTAL swipes stay here and spin the globe */
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    el.style.cursor = "grabbing";
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    start();
  });
  el.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    globe.rotation.y += dx * 0.006;
    globe.rotation.x += dy * 0.006;
    clampTilt();
    velY = dx * 0.006; velX = dy * 0.006;        /* carry momentum on release */
  });
  function endDrag(e) {
    if (!dragging) return;
    dragging = false; el.style.cursor = "grab";
    resumeAt = (e && e.timeStamp || 0) + 900;    /* free-spin briefly, then ease back */
    try { el.releasePointerCapture(e.pointerId); } catch (_) {}
  }
  el.addEventListener("pointerup", endDrag);
  el.addEventListener("pointercancel", endDrag);
  el.addEventListener("pointerleave", endDrag);

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { inView = e.isIntersecting; if (inView) { renderer.render(scene, camera); start(); } });
  }, { threshold: 0.01 });
  io.observe(mount);

  /* a hidden tab must cost nothing, and the loop resumes cleanly on return */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { inView = false; running = false; }
    else if (io.takeRecords && !running) { /* re-arm through the observer */
      io.unobserve(mount); io.observe(mount);
    }
  });

  /* A lost context (GPU reset, driver sleep, tab discard) must degrade to the
     still image once — never spin retrying a renderer that cannot come back. */
  el.addEventListener("webglcontextlost", function (ev) {
    ev.preventDefault();
    inView = false; running = false;
    try { el.remove(); } catch (_) {}
    showFallback();
  }, { once: true });

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { var s = box(); renderer.setSize(s, s); camera.updateProjectionMatrix(); renderer.render(scene, camera); }, 150);
  });

  renderer.render(scene, camera);
  }

  if ("IntersectionObserver" in window) {
    var watcher = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { watcher.disconnect(); boot(); }
    }, { rootMargin: "600px 0px" });
    watcher.observe(mount);
  } else { boot(); }
})();
