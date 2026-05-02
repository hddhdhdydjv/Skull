/* ============================================================
   ANATOMY UNVEILED — main.js
   Scroll-driven 3D skull with per-bone highlight + explode
   ============================================================ */

(function () {
  'use strict';

  /* ── Bone data ────────────────────────────────────────────── */
  var BONES = [
    {
      id: 'intro',
      keywords: [],
      camPos:   { x:  0.6, y:  0.1, z: 5.5 },
      lookAt:   { x:  0.6, y:  0,   z: 0   },
      keyLight: { x:  2,   y:  4,   z: 3   },
      explode:  { x:  0,   y:  0,   z: 0   },
    },
    {
      id: 'frontal',
      keywords: ['frontal','front','frente','fron'],
      camPos:   { x:  0.4, y:  0.6, z: 4.2 },
      lookAt:   { x:  0.4, y:  0.3, z: 0   },
      keyLight: { x:  0.5, y:  2.5, z: 3   },
      explode:  { x:  0,   y:  0.5, z: 1   },
    },
    {
      id: 'parietal',
      keywords: ['parietal','pari'],
      camPos:   { x: -0.3, y:  1,   z: 4.4 },
      lookAt:   { x:  0,   y:  0.5, z: 0   },
      keyLight: { x: -1,   y:  3.5, z: 1.5 },
      explode:  { x: -0.4, y:  0.8, z: 0.5 },
    },
    {
      id: 'occipital',
      keywords: ['occipital','occip'],
      camPos:   { x: -1.2, y: -0.1, z: 4.6 },
      lookAt:   { x: -0.3, y: -0.2, z: 0   },
      keyLight: { x: -2.5, y:  1,   z:-2   },
      explode:  { x: -0.6, y: -0.2, z:-1   },
    },
    {
      id: 'temporal',
      keywords: ['temporal','temp','mast'],
      camPos:   { x:  1.2, y:  0,   z: 4   },
      lookAt:   { x:  0.4, y: -0.1, z: 0   },
      keyLight: { x:  2.5, y:  0.5, z: 2   },
      explode:  { x:  1,   y:  0,   z: 0.5 },
    },
    {
      id: 'orbital',
      keywords: ['orbital','orbita','orbit','eye','ojo','nasal','ethmoid'],
      camPos:   { x:  0.8, y:  0.4, z: 3.7 },
      lookAt:   { x:  0.5, y:  0.2, z: 0   },
      keyLight: { x:  1.5, y:  1,   z: 3   },
      explode:  { x:  0.7, y:  0.3, z: 0.9 },
    },
    {
      id: 'cigomatico',
      keywords: ['cigom','zigom','zygomat','cheek','pomo'],
      camPos:   { x:  1.1, y: -0.2, z: 4   },
      lookAt:   { x:  0.5, y: -0.2, z: 0   },
      keyLight: { x:  2,   y: -0.5, z: 2.5 },
      explode:  { x:  1.1, y: -0.2, z: 0.7 },
    },
  ];

  /* ── DOM refs ─────────────────────────────────────────────── */
  var loadingEl  = document.getElementById('loading-screen');
  var progressEl = document.getElementById('progress-bar');
  var boneGlow   = document.getElementById('bone-glow');
  var cursorDot  = document.getElementById('cursor-dot');
  var cursorRing = document.getElementById('cursor-ring');
  var sections   = document.querySelectorAll('.bone-section');
  var tDots      = document.querySelectorAll('.t-dot');

  /* ── Three.js state ──────────────────────────────────────── */
  var scene, camera, renderer, controls, clock;
  var skullRoot = null;
  var allMeshes = [];           // { mesh, origPos, origMat, highlightMat }
  var activeMeshes = [];        // currently highlighted mesh objects
  var activeIndex = 0;

  /* Camera lerp targets */
  var targetCamPos  = new THREE.Vector3(0.6, 0.1, 5.5);
  var targetLookAt  = new THREE.Vector3(0.6, 0,   0);
  var currentLookAt = new THREE.Vector3(0.6, 0,   0);

  /* Key highlight light */
  var highlightLight;

  /* Mouse for cursor */
  var mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

  /* ── Init Three.js ───────────────────────────────────────── */
  function init() {
    var container = document.getElementById('canvas-container');
    clock = new THREE.Clock();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060607);
    scene.fog = new THREE.FogExp2(0x060607, 0.04);

    camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0.6, 0.1, 5.5);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding    = THREE.sRGBEncoding;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    /* Disable OrbitControls interaction — camera is scroll-driven */
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enabled     = false;
    controls.enableZoom  = false;
    controls.enablePan   = false;
    controls.enableRotate = false;
    controls.target.set(0.6, 0, 0);

    buildLights();
    loadModel();
    setupScroll();
    setupEvents();
    animate();
  }

  /* ── Lights ──────────────────────────────────────────────── */
  function buildLights() {
    scene.add(new THREE.AmbientLight(0x1a1008, 1.8));

    var fill = new THREE.DirectionalLight(0xd4c4a0, 0.7);
    fill.position.set(-4, 1, 2);
    scene.add(fill);

    var rim = new THREE.DirectionalLight(0x8ab4d4, 0.9);
    rim.position.set(-1, -2, -5);
    scene.add(rim);

    /* Key/highlight — animated per bone */
    highlightLight = new THREE.DirectionalLight(0xfff4de, 2.5);
    highlightLight.position.set(2, 4, 3);
    highlightLight.castShadow = true;
    highlightLight.shadow.mapSize.set(1024, 1024);
    scene.add(highlightLight);
  }

  /* ── Load model ──────────────────────────────────────────── */
  function loadModel() {
    var draco = new THREE.DRACOLoader();
    draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/libs/draco/');

    var loader = new THREE.GLTFLoader();
    loader.setDRACOLoader(draco);

    loader.load(
      'assets/Craneo.glb',
      onModelLoad,
      function (xhr) {
        if (xhr.lengthComputable) {
          progressEl.style.width = ((xhr.loaded / xhr.total) * 100) + '%';
        }
      },
      function (err) {
        console.warn('GLB no encontrado — usando placeholder.', err);
        buildPlaceholder();
        hideLoading();
      }
    );
  }

  function onModelLoad(gltf) {
    skullRoot = gltf.scene;

    /* Auto center + scale */
    var box    = new THREE.Box3().setFromObject(skullRoot);
    var center = box.getCenter(new THREE.Vector3());
    var size   = box.getSize(new THREE.Vector3());
    var scale  = 2.6 / Math.max(size.x, size.y, size.z);

    skullRoot.position.sub(center.multiplyScalar(scale));
    skullRoot.scale.setScalar(scale);

    /* Collect all meshes */
    skullRoot.traverse(function (child) {
      if (!child.isMesh) return;
      child.castShadow    = true;
      child.receiveShadow = true;

      var origMat = child.material.clone();

      var hlMat = child.material.clone();
      hlMat.emissive    = new THREE.Color(0xff4400);
      hlMat.emissiveIntensity = 0.35;
      if (hlMat.color) hlMat.color.multiplyScalar(1.15);

      allMeshes.push({
        mesh:         child,
        origPos:      child.position.clone(),
        origMat:      origMat,
        highlightMat: hlMat,
        targetOffset: new THREE.Vector3(),
        currentOffset: new THREE.Vector3(),
      });
    });

    console.log('[Skull] Meshes encontrados:', allMeshes.length);
    allMeshes.forEach(function (m, i) {
      console.log('  [' + i + ']', m.mesh.name || '(sin nombre)');
    });

    scene.add(skullRoot);
    hideLoading();
  }

  function buildPlaceholder() {
    var geo = new THREE.SphereGeometry(1, 48, 48);
    var mat = new THREE.MeshStandardMaterial({ color: 0xc4b49a, roughness: 0.6, metalness: 0.1 });
    skullRoot = new THREE.Mesh(geo, mat);
    skullRoot.castShadow = true;
    allMeshes.push({
      mesh: skullRoot,
      origPos: skullRoot.position.clone(),
      origMat: mat,
      highlightMat: mat.clone(),
      targetOffset: new THREE.Vector3(),
      currentOffset: new THREE.Vector3(),
    });
    scene.add(skullRoot);
  }

  function hideLoading() {
    progressEl.style.width = '100%';
    setTimeout(function () { loadingEl.classList.add('hidden'); }, 700);
  }

  /* ── Find meshes for a bone ──────────────────────────────── */
  function findMeshesForBone(bone) {
    if (!bone.keywords.length) return [];
    var found = [];
    allMeshes.forEach(function (m) {
      var name = (m.mesh.name || '').toLowerCase();
      for (var i = 0; i < bone.keywords.length; i++) {
        if (name.indexOf(bone.keywords[i]) !== -1) {
          found.push(m);
          break;
        }
      }
    });
    /* Fallback: if no name match and there are multiple meshes,
       use index cycling so something always highlights */
    if (!found.length && allMeshes.length > 1) {
      var boneIdx = BONES.indexOf(bone);
      var meshIdx = (boneIdx - 1 + allMeshes.length) % allMeshes.length;
      found = [allMeshes[meshIdx]];
    } else if (!found.length && allMeshes.length === 1) {
      found = allMeshes; /* single-mesh skull: highlight whole thing */
    }
    return found;
  }

  /* ── Activate a bone section ─────────────────────────────── */
  function activateBone(index) {
    if (index === activeIndex) return;
    activeIndex = index;

    var bone = BONES[index];

    /* Camera target */
    targetCamPos.set(bone.camPos.x, bone.camPos.y, bone.camPos.z);
    targetLookAt.set(bone.lookAt.x, bone.lookAt.y, bone.lookAt.z);

    /* Key light */
    highlightLight.position.set(bone.keyLight.x, bone.keyLight.y, bone.keyLight.z);

    /* Timeline dots */
    tDots.forEach(function (d, i) {
      d.classList.toggle('active', i === index);
    });

    /* Sections */
    sections.forEach(function (s, i) {
      s.classList.toggle('active', i === index);
    });

    /* Bone glow */
    boneGlow.classList.toggle('active', index > 0);

    /* Reset all meshes */
    allMeshes.forEach(function (m) {
      m.mesh.material = m.origMat;
      m.targetOffset.set(0, 0, 0);
    });
    activeMeshes = [];

    /* Highlight new bone */
    if (index > 0) {
      var found = findMeshesForBone(bone);
      found.forEach(function (m) {
        m.mesh.material = m.highlightMat;
        m.targetOffset.set(
          bone.explode.x * 0.18,
          bone.explode.y * 0.18,
          bone.explode.z * 0.18
        );
        activeMeshes.push(m);
      });
    }
  }

  /* ── Scroll detection ────────────────────────────────────── */
  function setupScroll() {
    /* IntersectionObserver — fires when section hits 50% visibility */
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var idx = parseInt(entry.target.dataset.index, 10);
          activateBone(idx);
        }
      });
    }, { threshold: 0.5 });

    sections.forEach(function (s) { observer.observe(s); });

    /* Activate intro on load */
    activateBone(0);
    sections[0].classList.add('active');
  }

  /* ── Events ──────────────────────────────────────────────── */
  function setupEvents() {
    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.left = mouseX + 'px';
      cursorDot.style.top  = mouseY + 'px';
    });

    window.addEventListener('resize', function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  /* ── Render loop ─────────────────────────────────────────── */
  function animate() {
    requestAnimationFrame(animate);
    var t = clock.getElapsedTime();

    /* Camera lerp */
    camera.position.lerp(targetCamPos, 0.032);
    currentLookAt.lerp(targetLookAt, 0.032);
    camera.lookAt(currentLookAt);

    /* Subtle float on skull root */
    if (skullRoot && activeIndex === 0) {
      skullRoot.position.y = Math.sin(t * 0.5) * 0.05;
    }

    /* Mesh explode lerp */
    allMeshes.forEach(function (m) {
      m.currentOffset.lerp(m.targetOffset, 0.06);
      m.mesh.position.x = m.origPos.x + m.currentOffset.x;
      m.mesh.position.y = m.origPos.y + m.currentOffset.y;
      m.mesh.position.z = m.origPos.z + m.currentOffset.z;
    });

    /* Emissive pulse on active meshes */
    activeMeshes.forEach(function (m) {
      m.highlightMat.emissiveIntensity = 0.28 + Math.sin(t * 2.5) * 0.08;
    });

    /* Cursor ring lag */
    ringX += (mouseX - ringX) * 0.1;
    ringY += (mouseY - ringY) * 0.1;
    cursorRing.style.left = ringX + 'px';
    cursorRing.style.top  = ringY + 'px';

    renderer.render(scene, camera);
  }

  /* ── Boot ─────────────────────────────────────────────────── */
  init();

})();
