/* ============================================================
   SKULL ANATOMY — main.js
   ============================================================ */

(function () {
  'use strict';

  /* ── DOM refs ─────────────────────────────────────────────── */
  var loadingScreen = document.getElementById('loading-screen');
  var progressBar   = document.getElementById('progress-bar');
  var fireGlow      = document.getElementById('fire-glow');
  var annotations   = document.getElementById('annotations');
  var cursorDot     = document.getElementById('cursor-dot');
  var cursorRing    = document.getElementById('cursor-ring');

  /* ── State ────────────────────────────────────────────────── */
  var mouseX = 0, mouseY = 0;
  var mouseNX = 0, mouseNY = 0;
  var ringX = 0, ringY = 0;
  var parallaxX = 0, parallaxY = 0;
  var clock, scene, camera, renderer, controls;
  var skull = null;
  var fireLights = [];
  var fireTarget = 0;
  var autoRotate = false;
  var annotationsVisible = true;

  /* ── Three.js init ───────────────────────────────────────── */
  function initThree() {
    var container = document.getElementById('canvas-container');

    clock = new THREE.Clock();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080604);
    scene.fog = new THREE.FogExp2(0x080604, 0.045);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding    = THREE.sRGBEncoding;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping   = true;
    controls.dampingFactor   = 0.06;
    controls.minDistance     = 2.2;
    controls.maxDistance     = 9;
    controls.autoRotateSpeed = 0.8;
    controls.enablePan       = false;
    controls.target.set(0, 0, 0);

    buildLights();
    loadModel();
    animate();
  }

  /* ── Lights ──────────────────────────────────────────────── */
  function buildLights() {
    scene.add(new THREE.AmbientLight(0x1a1008, 2.2));

    var key = new THREE.DirectionalLight(0xfff4de, 2.8);
    key.position.set(3, 5, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);

    var fill = new THREE.DirectionalLight(0xd4c4a0, 0.8);
    fill.position.set(-4, 1, 2);
    scene.add(fill);

    var rim = new THREE.DirectionalLight(0x8ab4d4, 1.2);
    rim.position.set(-1, -2, -5);
    scene.add(rim);

    var fire1 = new THREE.PointLight(0xff6a00, 0, 3.5);
    fire1.position.set(1.2, -0.5, 1.5);
    scene.add(fire1);

    var fire2 = new THREE.PointLight(0xff3000, 0, 3);
    fire2.position.set(-1, 0.3, 1.2);
    scene.add(fire2);

    fireLights = [fire1, fire2];
  }

  /* ── Model loading ───────────────────────────────────────── */
  function loadModel() {
    var dracoLoader = new THREE.DRACOLoader();
    dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/libs/draco/');

    var loader = new THREE.GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      'assets/Craneo.glb',
      function (gltf) {
        skull = gltf.scene;

        var box    = new THREE.Box3().setFromObject(skull);
        var center = box.getCenter(new THREE.Vector3());
        var size   = box.getSize(new THREE.Vector3());
        var scale  = 2.4 / Math.max(size.x, size.y, size.z);

        skull.position.sub(center.multiplyScalar(scale));
        skull.scale.setScalar(scale);

        skull.traverse(function (child) {
          if (child.isMesh) {
            child.castShadow    = true;
            child.receiveShadow = true;
          }
        });

        scene.add(skull);
        hideLoading();
        showAnnotations();
      },
      function (xhr) {
        if (xhr.lengthComputable) {
          progressBar.style.width = ((xhr.loaded / xhr.total) * 100) + '%';
        }
      },
      function (err) {
        console.warn('GLB no encontrado — placeholder.', err);
        buildPlaceholder();
        hideLoading();
        showAnnotations();
      }
    );
  }

  function buildPlaceholder() {
    var geo  = new THREE.SphereGeometry(1, 32, 32);
    var mat  = new THREE.MeshStandardMaterial({ color: 0xc4b49a, roughness: 0.65, metalness: 0.1 });
    skull = new THREE.Mesh(geo, mat);
    skull.castShadow = true;
    scene.add(skull);
  }

  function hideLoading() {
    progressBar.style.width = '100%';
    setTimeout(function () { loadingScreen.classList.add('hidden'); }, 600);
  }

  function showAnnotations() {
    var items = document.querySelectorAll('.annotation');
    items.forEach(function (el, i) {
      setTimeout(function () { el.classList.add('visible'); }, 800 + i * 170);
    });
  }

  /* ── Render loop ─────────────────────────────────────────── */
  function animate() {
    requestAnimationFrame(animate);
    var t = clock.getElapsedTime();

    controls.autoRotate = autoRotate;
    controls.update();

    /* Parallax */
    parallaxX += (mouseNX * 0.18 - parallaxX) * 0.04;
    parallaxY += (mouseNY * 0.12 - parallaxY) * 0.04;

    if (skull) {
      skull.rotation.y += (parallaxX - skull.rotation.y) * 0.03;
      skull.position.y   = Math.sin(t * 0.6) * 0.06 + parallaxY * 0.2;
    }

    /* Fire flicker */
    fireLights[0].intensity += (fireTarget * (2.8 + Math.sin(t * 7.3)  * 0.8) - fireLights[0].intensity) * 0.08;
    fireLights[1].intensity += (fireTarget * (2.2 + Math.sin(t * 11.7 + 1.3) * 0.6) - fireLights[1].intensity) * 0.08;

    /* Cursor ring lag */
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    cursorRing.style.left = ringX + 'px';
    cursorRing.style.top  = ringY + 'px';

    renderer.render(scene, camera);
  }

  /* ── Mouse ───────────────────────────────────────────────── */
  document.addEventListener('mousemove', function (e) {
    mouseX  = e.clientX;
    mouseY  = e.clientY;
    mouseNX = (e.clientX / window.innerWidth)  * 2 - 1;
    mouseNY = (e.clientY / window.innerHeight) * 2 - 1;
    cursorDot.style.left = mouseX + 'px';
    cursorDot.style.top  = mouseY + 'px';
  });

  /* ── Resize ──────────────────────────────────────────────── */
  window.addEventListener('resize', function () {
    if (!camera || !renderer) return;
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
