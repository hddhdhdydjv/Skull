/* ============================================================
   SKULL ANATOMY — main.js
   ============================================================ */

(function () {
  'use strict';

  /* ── DOM refs ─────────────────────────────────────────────── */
  const loadingScreen = document.getElementById('loading-screen');
  const progressBar   = document.getElementById('progress-bar');
  const fireGlow      = document.getElementById('fire-glow');
  const annotations   = document.getElementById('annotations');
  const cursorDot     = document.getElementById('cursor-dot');
  const cursorRing    = document.getElementById('cursor-ring');

  /* ── State ────────────────────────────────────────────────── */
  let mouseX = 0, mouseY = 0;          // raw px
  let mouseNX = 0, mouseNY = 0;        // normalised -1..1
  let ringX = 0, ringY = 0;            // cursor ring (lagged)
  let parallaxX = 0, parallaxY = 0;    // lerped parallax
  let clock, scene, camera, renderer, controls;
  let skull = null;
  let fireLights = [];
  let fireTarget = 0;                  // 0 = off, 1 = on
  let autoRotate = false;
  let annotationsVisible = true;
  let frameId;

  /* ── Three.js init ───────────────────────────────────────── */
  function initThree() {
    const container = document.getElementById('canvas-container');

    // Clock
    clock = new THREE.Clock();

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080604);
    scene.fog = new THREE.FogExp2(0x080604, 0.045);

    // Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 5);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding   = THREE.sRGBEncoding;
    renderer.toneMapping      = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.06;
    controls.minDistance    = 2.2;
    controls.maxDistance    = 9;
    controls.autoRotateSpeed = 0.8;
    controls.enablePan      = false;
    controls.target.set(0, 0, 0);

    buildLights();
    loadModel();
    animate();
  }

  /* ── Lights ──────────────────────────────────────────────── */
  function buildLights() {
    // Ambient — warm
    const ambient = new THREE.AmbientLight(0x1a1008, 2.2);
    scene.add(ambient);

    // Key — warm top-right
    const key = new THREE.DirectionalLight(0xfff4de, 2.8);
    key.position.set(3, 5, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);

    // Fill — left
    const fill = new THREE.DirectionalLight(0xd4c4a0, 0.8);
    fill.position.set(-4, 1, 2);
    scene.add(fill);

    // Rim — cool back
    const rim = new THREE.DirectionalLight(0x8ab4d4, 1.2);
    rim.position.set(-1, -2, -5);
    scene.add(rim);

    // Fire point lights (start off)
    const fire1 = new THREE.PointLight(0xff6a00, 0, 3.5);
    fire1.position.set(1.2, -0.5, 1.5);
    scene.add(fire1);

    const fire2 = new THREE.PointLight(0xff3000, 0, 3);
    fire2.position.set(-1, 0.3, 1.2);
    scene.add(fire2);

    fireLights = [fire1, fire2];
  }

  /* ── Model loading ───────────────────────────────────────── */
  function loadModel() {
    const dracoLoader = new THREE.DRACOLoader();
    dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/libs/draco/');

    const loader = new THREE.GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      'assets/Craneo.glb',

      // onLoad
      function (gltf) {
        skull = gltf.scene;

        // Auto-center & scale
        const box    = new THREE.Box3().setFromObject(skull);
        const center = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale  = 2.4 / maxDim;

        skull.position.sub(center.multiplyScalar(scale));
        skull.scale.setScalar(scale);

        // Shadows & materials
        skull.traverse(function (child) {
          if (child.isMesh) {
            child.castShadow    = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.envMapIntensity = 0.4;
            }
          }
        });

        scene.add(skull);
        hideLoading();
        showAnnotations();
      },

      // onProgress
      function (xhr) {
        if (xhr.lengthComputable) {
          const pct = (xhr.loaded / xhr.total) * 100;
          progressBar.style.width = pct + '%';
        }
      },

      // onError
      function (err) {
        console.warn('GLB not found — showing placeholder.', err);
        buildPlaceholder();
        hideLoading();
        showAnnotations();
      }
    );
  }

  /* Placeholder geometry when GLB is missing */
  function buildPlaceholder() {
    const geo  = new THREE.SphereGeometry(1, 32, 32);
    const mat  = new THREE.MeshStandardMaterial({
      color: 0xc4b49a, roughness: 0.65, metalness: 0.1
    });
    skull = new THREE.Mesh(geo, mat);
    skull.castShadow = true;
    scene.add(skull);
  }

  /* ── Loading UI ──────────────────────────────────────────── */
  function hideLoading() {
    progressBar.style.width = '100%';
    setTimeout(function () {
      loadingScreen.classList.add('hidden');
    }, 600);
  }

  /* ── Annotations staggered reveal ───────────────────────── */
  function showAnnotations() {
    const items = document.querySelectorAll('.annotation');
    items.forEach(function (el, i) {
      setTimeout(function () {
        el.classList.add('visible');
      }, 800 + i * 170);
    });
  }

  /* ── Render loop ─────────────────────────────────────────── */
  function animate() {
    frameId = requestAnimationFrame(animate);
    const t    = clock.getElapsedTime();
    const delta = clock.getDelta ? 0.016 : 0.016; // fallback

    controls.autoRotate = autoRotate;
    controls.update();

    /* Parallax lerp */
    parallaxX += (mouseNX * 0.18 - parallaxX) * 0.04;
    parallaxY += (mouseNY * 0.12 - parallaxY) * 0.04;

    /* Skull animation */
    if (skull) {
      skull.rotation.y += (parallaxX - skull.rotation.y) * 0.03;
      skull.position.y   = Math.sin(t * 0.6) * 0.06 + parallaxY * 0.2;
    }

    /* Fire flicker */
    const currentIntensity = fireLights[0].intensity;
    const targetIntensity  = fireTarget;
    fireLights[0].intensity += (targetIntensity * (2.8 + Math.sin(t * 7.3) * 0.8) - fireLights[0].intensity) * 0.08;
    fireLights[1].intensity += (targetIntensity * (2.2 + Math.sin(t * 11.7 + 1.3) * 0.6) - fireLights[1].intensity) * 0.08;

    renderer.render(scene, camera);
  }

  /* ── Mouse / cursor ──────────────────────────────────────── */
  document.addEventListener('mousemove', function (e) {
    mouseX  = e.clientX;
    mouseY  = e.clientY;
    mouseNX = (e.clientX / window.innerWidth)  * 2 - 1;
    mouseNY = (e.clientY / window.innerHeight) * 2 - 1;

    cursorDot.style.left = mouseX + 'px';
    cursorDot.style.top  = mouseY + 'px';
  });

  /* Cursor ring lag via rAF */
  function updateRing() {
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    cursorRing.style.left = ringX + 'px';
    cursorRing.style.top  = ringY + 'px';
    requestAnimationFrame(updateRing);
  }
  updateRing();

  /* ── Resize ──────────────────────────────────────────────── */
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ── Control buttons ─────────────────────────────────────── */
  document.getElementById('btn-lava').addEventListener('click', function () {
    fireTarget = 1;
    fireGlow.classList.add('active');
    this.classList.add('active');
    document.getElementById('btn-dark').classList.remove('active');
  });

  document.getElementById('btn-dark').addEventListener('click', function () {
    fireTarget = 0;
    fireGlow.classList.remove('active');
    this.classList.add('active');
    document.getElementById('btn-lava').classList.remove('active');
  });

  document.getElementById('btn-rotate').addEventListener('click', function () {
    autoRotate = !autoRotate;
    this.classList.toggle('active', autoRotate);
  });

  document.getElementById('btn-annotations').addEventListener('click', function () {
    annotationsVisible = !annotationsVisible;
    annotations.classList.toggle('hidden', !annotationsVisible);
    this.classList.toggle('active', annotationsVisible);
  });

  /* ── Boot ─────────────────────────────────────────────────── */
  initThree();

})();
