/* 217 Products — real-time 3D sumi-e globe (Three.js, UMD global).
   A textured sphere with a warm ink-wash world map, a thin gold equator
   band, soft warm lighting and a slow idle rotation. Each scroll step calls
   OSGlobe.spin() for a quick eased spin burst. Renders only while in view. */
(function () {
  "use strict";
  var mount = document.getElementById("globe3d");
  if (!mount || !window.THREE) return;
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

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 4.3);

  var tilt = new THREE.Group();
  tilt.rotation.set(0.34, 0, 0.06);
  scene.add(tilt);

  /* unlit material shows the washi/ink texture at true colour (no PBR
     darkening); roundness reads from the spherical projection, the curved
     gold band, the fresnel rim and the rotation. */
  var globe = new THREE.Mesh(
    new THREE.SphereGeometry(1, 128, 128),
    new THREE.MeshBasicMaterial({ color: 0xf3ecdc })
  );
  tilt.add(globe);

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

  /* thin gold equator band — stays put while the globe turns inside it */
  var band = new THREE.Mesh(
    new THREE.TorusGeometry(1.055, 0.004, 16, 240),
    new THREE.MeshBasicMaterial({ color: 0xc39a46, transparent: true, opacity: 0.9 })
  );
  band.rotation.x = Math.PI / 2;
  tilt.add(band);

  var state = { vel: reduced ? 0 : 0.0015 };
  var idle = state.vel;
  var inView = false, running = false;

  function renderOnce() { renderer.render(scene, camera); }
  function loop() {
    if (!inView || reduced) { running = false; return; }
    globe.rotation.y += state.vel;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  function start() { if (running || reduced || !inView) return; running = true; requestAnimationFrame(loop); }

  new THREE.TextureLoader().load("assets/globe-map.webp?u=1", function (tex) {
    if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.wrapS = THREE.RepeatWrapping;
    globe.material.map = tex;
    globe.material.color.set(0xffffff);
    globe.material.needsUpdate = true;
    renderOnce();
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      inView = e.isIntersecting;
      if (inView) { renderOnce(); start(); }
    });
  }, { threshold: 0.01 });
  io.observe(mount);

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var s = box(); renderer.setSize(s, s); camera.updateProjectionMatrix(); renderOnce();
    }, 150);
  });

  window.OSGlobe = {
    spin: function () {
      if (reduced || !window.gsap) return;
      start();
      window.gsap.fromTo(state, { vel: 0.30 }, { vel: idle, duration: 1.15, ease: "power3.out", overwrite: true });
    }
  };

  renderOnce();
})();
