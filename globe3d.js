/* 217 Products — real-time 3D sumi-e globe (Three.js, UMD global).
   A textured sphere with a warm ink-wash world map and a soft gold fresnel
   rim. It rotates on its own and can be grabbed and spun with any pointer —
   mouse, pen or touch (horizontal swipes spin it, vertical swipes keep
   scrolling the page). Renders only in view. */
(function () {
  "use strict";
  var mount = document.getElementById("globe3d");
  if (!mount || !window.THREE) return;

  /* Heavy WebGL setup is deferred until the section approaches the viewport,
     so it never competes with the hero's first paint (biggest win on phones). */
  function init() {
  var THREE = window.THREE;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) { return; } /* no WebGL — the fallback image stays visible */
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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
    new THREE.SphereGeometry(1, 128, 128),
    new THREE.MeshBasicMaterial({ color: 0xf3ecdc })
  );
  tilt.add(globe);
  globe.rotation.y = -1.9; /* open on the Americas, not the empty Pacific */

  /* gold fresnel rim — defines the sphere silhouette against the cream page */
  var rim = new THREE.Mesh(
    new THREE.SphereGeometry(1.02, 96, 96),
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

  new THREE.TextureLoader().load("assets/globe-map.webp?u=1", function (tex) {
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
    renderer.render(scene, camera);
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

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { var s = box(); renderer.setSize(s, s); camera.updateProjectionMatrix(); renderer.render(scene, camera); }, 150);
  });

  renderer.render(scene, camera);
  }

  if ("IntersectionObserver" in window) {
    var boot = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { boot.disconnect(); init(); }
    }, { rootMargin: "600px 0px" });
    boot.observe(mount);
  } else { init(); }
})();
