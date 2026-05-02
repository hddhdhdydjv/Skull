/* ============================================================
   ANATOMY UNVEILED — main.js
   ============================================================ */

(function () {
  'use strict';

  /* ── Bone definitions ───────────────────────────────────────
     bonePos: set from bounding-box after model loads (see computeBonePositions)
     pivotX:  desktop — skull offset on X (+ = right, text on left)
     pivotY:  mobile  — skull offset on Y (+ = up, text below)
     side:    annotation panel side ('left' | 'right' | null)
  ─────────────────────────────────────────────────────────── */
  var BONES = [
    {
      id: 'intro', label: null, side: null,
      rotY: 0, rotX: 0, camZ: 5.5, camY: 0,
      pivotX: 0, pivotY: 0,
      spotPos: { x: 2, y: 5, z: 4 }, spotTgt: { x: 0, y: 0, z: 0 },
      spotInt: 2.5, ambInt: 0.9,
      bonePos: new THREE.Vector3(),
    },
    {
      id: 'frontal', label: 'Hueso Frontal', side: 'left',
      rotY: 0, rotX: -0.08, camZ: 3.9, camY: 0.35,
      pivotX: 1.05, pivotY: 0.75,
      spotPos: { x: 0.3, y: 5, z: 6 }, spotTgt: { x: 0.1, y: 0.8, z: 0 },
      spotInt: 14, ambInt: 0.22,
      bonePos: new THREE.Vector3(),
    },
    {
      id: 'parietal', label: 'Hueso Parietal', side: 'right',
      rotY: -0.45, rotX: -0.25, camZ: 4.1, camY: 0.5,
      pivotX: -1.05, pivotY: 0.7,
      spotPos: { x: -4, y: 6, z: 2 }, spotTgt: { x: -0.2, y: 0.9, z: 0 },
      spotInt: 14, ambInt: 0.22,
      bonePos: new THREE.Vector3(),
    },
    {
      id: 'occipital', label: 'Hueso Occipital', side: 'left',
      rotY: -2.8, rotX: 0.1, camZ: 4.3, camY: 0.15,
      pivotX: 1.05, pivotY: 0.65,
      spotPos: { x: 0, y: 3.5, z: -6 }, spotTgt: { x: 0, y: 0.1, z: -0.1 },
      spotInt: 14, ambInt: 0.22,
      bonePos: new THREE.Vector3(),
    },
    {
      id: 'temporal', label: 'Hueso Temporal', side: 'right',
      rotY: -1.1, rotX: 0, camZ: 3.8, camY: 0.1,
      pivotX: -1.05, pivotY: 0.65,
      spotPos: { x: 6, y: 1, z: 3 }, spotTgt: { x: 0.5, y: 0.1, z: 0 },
      spotInt: 14, ambInt: 0.22,
      bonePos: new THREE.Vector3(),
    },
    {
      id: 'orbital', label: 'Cavidad Orbital', side: 'left',
      rotY: 0.2, rotX: -0.05, camZ: 3.5, camY: 0.25,
      pivotX: 1.05, pivotY: 0.7,
      spotPos: { x: 1.5, y: 2.5, z: 6 }, spotTgt: { x: 0.3, y: 0.4, z: 0 },
      spotInt: 14, ambInt: 0.22,
      bonePos: new THREE.Vector3(),
    },
    {
      id: 'cigomatico', label: 'Arco Cigomático', side: 'right',
      rotY: -0.75, rotX: 0.05, camZ: 3.9, camY: -0.1,
      pivotX: -1.05, pivotY: 0.65,
      spotPos: { x: 5, y: -0.5, z: 4 }, spotTgt: { x: 0.5, y: -0.1, z: 0 },
      spotInt: 14, ambInt: 0.22,
      bonePos: new THREE.Vector3(),
    },
  ];

  /* ── DOM refs ───────────────────────────────────────────── */
  var loadingEl   = document.getElementById('loading-screen');
  var progressEl  = document.getElementById('progress-bar');
  var scrollHint  = document.getElementById('scroll-hint');
  var introBgText = document.getElementById('intro-bg-text');
  var header      = document.getElementById('header');
  var sectionFade = document.getElementById('section-fade');
  var tooltip     = document.getElementById('tooltip');
  var tooltipText = document.getElementById('tooltip-text');
  var cursorDot   = document.getElementById('cursor-dot');
  var cursorRing  = document.getElementById('cursor-ring');
  var sections    = document.querySelectorAll('.bone-section');
  /* SVG */
  var svgConn      = document.getElementById('svg-connectors');
  var connGlow     = document.getElementById('conn-glow');
  var connPath     = document.getElementById('conn-path');
  var connBoneGlow = document.getElementById('conn-bone-glow');
  var connBoneDot  = document.getElementById('conn-bone-dot');

  /* ── Three.js state ─────────────────────────────────────── */
  var scene, camera, renderer, clock;
  var skullGroup, skullMesh;
  var loadingPlaceholder;   /* esfera spinning durante carga */
  var spotLight, ambientLight;
  var raycaster, mouse2D;

  /* ── Animation targets ──────────────────────────────────── */
  var tCamZ = 5.5, tCamY = 0;
  var tRotY = 0,   tRotX = 0;
  var tPivotX = 0, tPivotY = 0;
  var tSpotPos = new THREE.Vector3(2, 5, 4);
  var tSpotTgt = new THREE.Vector3(0, 0, 0);
  var tSpotInt = 2.5, tAmbInt = 0.9;

  /* ── Current (lerped) ───────────────────────────────────── */
  var cRotY = 0, cRotX = 0;
  var cPivotX = 0, cPivotY = 0;
  var cCamZ = 5.5, cCamY = 0;

  /* ── Input ──────────────────────────────────────────────── */
  var mouseX = 0, mouseY = 0;
  var mouseNX = 0, mouseNY = 0;
  var ringX = 0, ringY = 0;

  /* ── State ──────────────────────────────────────────────── */
  var activeIndex = 0;
  var isMobile    = window.innerWidth <= 768;
  var hovered     = false;
  var scrolled    = false;

  /* ── Temp vector ────────────────────────────────────────── */
  var _v3 = new THREE.Vector3();

  /* ─────────────────────────────────────────────────────────
     INIT
  ───────────────────────────────────────────────────────── */
  function init() {
    var container = document.getElementById('canvas-container');
    clock = new THREE.Clock();

    scene = new THREE.Scene();
    /* Sin background: el canvas es transparente → intro text visible detrás */
    scene.background = null;

    camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 5.5);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);        /* fondo transparente */
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding     = THREE.sRGBEncoding;
    renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    renderer.shadowMap.enabled  = true;
    renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    skullGroup = new THREE.Group();
    scene.add(skullGroup);

    raycaster = new THREE.Raycaster();
    mouse2D   = new THREE.Vector2();

    buildLights();
    addLoadingPlaceholder();
    loadModel();
    setupScroll();
    setupEvents();
    animate();
  }

  /* ─────────────────────────────────────────────────────────
     LOADING PLACEHOLDER
     Esfera que rota durante la carga — visible a través del
     centro transparente del loading screen.
  ───────────────────────────────────────────────────────── */
  function addLoadingPlaceholder() {
    var geo = new THREE.SphereGeometry(0.9, 48, 48);
    var mat = new THREE.MeshStandardMaterial({
      color: 0xc4b49a, roughness: 0.55, metalness: 0.08
    });
    loadingPlaceholder = new THREE.Mesh(geo, mat);
    loadingPlaceholder.castShadow = true;
    scene.add(loadingPlaceholder);
  }

  /* ─────────────────────────────────────────────────────────
     LIGHTS
  ───────────────────────────────────────────────────────── */
  function buildLights() {
    ambientLight = new THREE.AmbientLight(0x1a1208, 0.9);
    scene.add(ambientLight);

    var fill = new THREE.DirectionalLight(0x607080, 0.35);
    fill.position.set(-5, 1, 2);
    scene.add(fill);

    spotLight = new THREE.SpotLight(0xfff3d0, 2.5);
    spotLight.position.set(2, 5, 4);
    spotLight.angle    = Math.PI / 9;
    spotLight.penumbra = 0.35;
    spotLight.decay    = 1.8;
    spotLight.distance = 22;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.set(1024, 1024);
    scene.add(spotLight);
    scene.add(spotLight.target);
  }

  /* ─────────────────────────────────────────────────────────
     MODEL
  ───────────────────────────────────────────────────────── */
  function loadModel() {
    var draco = new THREE.DRACOLoader();
    draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/libs/draco/');

    var loader = new THREE.GLTFLoader();
    loader.setDRACOLoader(draco);

    loader.load(
      'assets/Craneo.glb',
      function (gltf) {
        skullMesh = gltf.scene;

        var box    = new THREE.Box3().setFromObject(skullMesh);
        var center = box.getCenter(new THREE.Vector3());
        var size   = box.getSize(new THREE.Vector3());
        var scale  = 2.5 / Math.max(size.x, size.y, size.z);

        skullMesh.position.sub(center.multiplyScalar(scale));
        skullMesh.scale.setScalar(scale);

        skullMesh.traverse(function (child) {
          if (child.isMesh) {
            child.castShadow    = true;
            child.receiveShadow = true;
          }
        });

        skullGroup.add(skullMesh);

        /* Quitar placeholder */
        if (loadingPlaceholder) {
          scene.remove(loadingPlaceholder);
          loadingPlaceholder.geometry.dispose();
          loadingPlaceholder = null;
        }

        /* Compute bone positions from bbox in local GLB space */
        computeBonePositions(box, center.divideScalar(scale), size);

        hideLoading();
      },
      function (xhr) {
        if (xhr.lengthComputable) {
          progressEl.style.width = ((xhr.loaded / xhr.total) * 100) + '%';
        }
      },
      function (err) {
        console.warn('GLB no encontrado — placeholder.', err);
        var geo = new THREE.SphereGeometry(1, 48, 48);
        var mat = new THREE.MeshStandardMaterial({ color: 0xc4b49a, roughness: 0.6 });
        skullMesh = new THREE.Mesh(geo, mat);
        skullMesh.castShadow = true;
        skullGroup.add(skullMesh);
        /* Fallback bone positions for sphere */
        BONES[1].bonePos.set( 0,    0.8,   0.85);
        BONES[2].bonePos.set(-0.6,  0.7,   0.2 );
        BONES[3].bonePos.set( 0,    0.2,  -0.95);
        BONES[4].bonePos.set( 0.85, 0.05,  0.2 );
        BONES[5].bonePos.set( 0.5,  0.4,   0.75);
        BONES[6].bonePos.set( 0.75,-0.1,   0.55);
        hideLoading();
      }
    );
  }

  /* ── Compute bone positions relative to GLB local space ── */
  function computeBonePositions(worldBox, origCenter, worldSize) {
    /* Get the bounding box of the skull's child meshes in
       skullMesh's OWN local space (the GLB coordinate system).
       We use the original world bbox before centering,
       then un-apply the scale to get local-space extents. */
    var localBox = new THREE.Box3();
    skullMesh.traverse(function (child) {
      if (!child.isMesh || !child.geometry || !child.geometry.attributes.position) return;
      var posAttr = child.geometry.attributes.position;
      var tmp = new THREE.Vector3();
      for (var i = 0; i < posAttr.count; i++) {
        tmp.fromBufferAttribute(posAttr, i);
        child.localToWorld(tmp); /* world space */
        localBox.expandByPoint(tmp);
      }
    });

    /* Convert world bbox to skullMesh local space using inverse matrixWorld.
       At this point skullMesh is already in skullGroup (position set),
       so matrixWorld includes our centering. */
    var invMat = new THREE.Matrix4().copy(skullMesh.matrixWorld).invert();
    var lMin = localBox.min.clone().applyMatrix4(invMat);
    var lMax = localBox.max.clone().applyMatrix4(invMat);

    var lb = new THREE.Box3(
      new THREE.Vector3(Math.min(lMin.x, lMax.x), Math.min(lMin.y, lMax.y), Math.min(lMin.z, lMax.z)),
      new THREE.Vector3(Math.max(lMin.x, lMax.x), Math.max(lMin.y, lMax.y), Math.max(lMin.z, lMax.z))
    );
    var c = lb.getCenter(new THREE.Vector3());
    var s = lb.getSize(new THREE.Vector3());

    /* Bone positions as fractions of the local bounding box.
       Assumes Y-up, Z toward camera (standard GLTF / Three.js). */
    BONES[1].bonePos.set(c.x + s.x * 0.02,  c.y + s.y * 0.30,  c.z + s.z * 0.38); // frontal
    BONES[2].bonePos.set(c.x - s.x * 0.22,  c.y + s.y * 0.38,  c.z + s.z * 0.04); // parietal
    BONES[3].bonePos.set(c.x + s.x * 0.00,  c.y + s.y * 0.06,  c.z - s.z * 0.40); // occipital
    BONES[4].bonePos.set(c.x + s.x * 0.42,  c.y + s.y * 0.02,  c.z + s.z * 0.08); // temporal
    BONES[5].bonePos.set(c.x + s.x * 0.20,  c.y + s.y * 0.14,  c.z + s.z * 0.44); // orbital
    BONES[6].bonePos.set(c.x + s.x * 0.38,  c.y - s.y * 0.06,  c.z + s.z * 0.26); // cigomatico

    console.log('[Skull] Bone positions computed:', c, s);
  }

  function hideLoading() {
    progressEl.style.width = '100%';
    setTimeout(function () { loadingEl.classList.add('hidden'); }, 700);
  }

  /* ─────────────────────────────────────────────────────────
     SCROLL / SECTION ACTIVATION
  ───────────────────────────────────────────────────────── */
  function activateBone(index) {
    if (index === activeIndex) return;
    var prev = activeIndex;
    activeIndex = index;

    /* Flash fade between sections */
    if (prev !== index) {
      sectionFade.classList.add('flash');
      setTimeout(function () { sectionFade.classList.remove('flash'); }, 220);
    }

    var bone = BONES[index];

    tCamZ   = bone.camZ;
    tCamY   = bone.camY;
    tRotY   = bone.rotY;
    tRotX   = bone.rotX;
    tPivotX = bone.pivotX;
    tPivotY = bone.pivotY;
    tSpotPos.set(bone.spotPos.x, bone.spotPos.y, bone.spotPos.z);
    tSpotTgt.set(bone.spotTgt.x, bone.spotTgt.y, bone.spotTgt.z);
    tSpotInt = bone.spotInt;
    tAmbInt  = bone.ambInt;

    /* Section text */
    sections.forEach(function (s, i) {
      s.classList.toggle('active', i === index);
    });

    /* Intro text ↔ small header dissolve */
    if (index === 0) {
      introBgText.classList.remove('hidden');
      header.classList.remove('visible');
      scrollHint.classList.remove('hidden');
    } else {
      introBgText.classList.add('hidden');
      header.classList.add('visible');
      scrollHint.classList.add('hidden');
    }

    /* SVG connector */
    svgConn.classList.toggle('visible', index > 0);
  }

  function setupScroll() {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          activateBone(parseInt(entry.target.dataset.index, 10));
        }
      });
    }, { threshold: 0.45 });

    sections.forEach(function (s) { observer.observe(s); });
    sections[0].classList.add('active');
  }

  /* ─────────────────────────────────────────────────────────
     EVENTS
  ───────────────────────────────────────────────────────── */
  function setupEvents() {
    document.addEventListener('mousemove', function (e) {
      mouseX  = e.clientX;
      mouseY  = e.clientY;
      mouseNX = (e.clientX / window.innerWidth)  * 2 - 1;
      mouseNY = (e.clientY / window.innerHeight) * 2 - 1;
      cursorDot.style.left = mouseX + 'px';
      cursorDot.style.top  = mouseY + 'px';
      tooltip.style.left   = mouseX + 'px';
      tooltip.style.top    = mouseY + 'px';
      mouse2D.set(mouseNX, -mouseNY);
    });

    window.addEventListener('scroll', function () {
      if (!scrolled) { scrolled = true; }
    }, { passive: true });

    window.addEventListener('resize', function () {
      isMobile = window.innerWidth <= 768;
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  /* ─────────────────────────────────────────────────────────
     SVG CONNECTOR
  ───────────────────────────────────────────────────────── */
  function buildCurvedPath(px, py, bx, by, side) {
    var dx  = bx - px;
    var dy  = by - py;
    var adx = Math.abs(dx);
    var arm = Math.min(adx * 0.55, 140); /* control arm length */

    var cp1x, cp1y, cp2x, cp2y;
    if (side === 'left') {
      /* Panel on left, bone on right: extend right from panel, arc toward bone */
      cp1x = px + arm;   cp1y = py;
      cp2x = bx - arm * 0.3; cp2y = by;
    } else if (side === 'right') {
      /* Panel on right, bone on left */
      cp1x = px - arm;   cp1y = py;
      cp2x = bx + arm * 0.3; cp2y = by;
    } else {
      /* Mobile: vertical */
      var ady = Math.abs(dy);
      var varm = Math.min(ady * 0.55, 100);
      cp1x = px; cp1y = py - varm;
      cp2x = bx; cp2y = by + varm * 0.3;
    }
    return 'M ' + px.toFixed(1) + ',' + py.toFixed(1) +
           ' C ' + cp1x.toFixed(1) + ',' + cp1y.toFixed(1) +
           ' '  + cp2x.toFixed(1) + ',' + cp2y.toFixed(1) +
           ' '  + bx.toFixed(1)   + ',' + by.toFixed(1);
  }

  function updateConnector() {
    if (activeIndex === 0 || !skullMesh) {
      svgConn.classList.remove('visible');
      return;
    }

    var bone = BONES[activeIndex];

    /* Project bone local position → world → screen.
       applyMatrix4(matrixWorld) already includes skullGroup transform. */
    _v3.copy(bone.bonePos).applyMatrix4(skullMesh.matrixWorld);
    var ndc = _v3.clone().project(camera);
    if (ndc.z >= 1) { svgConn.classList.remove('visible'); return; }

    var W = window.innerWidth;
    var H = window.innerHeight;
    var bx = ( ndc.x + 1) * 0.5 * W;
    var by = (-ndc.y + 1) * 0.5 * H;

    /* Panel connector-origin dot position */
    var originEl = sections[activeIndex] && sections[activeIndex].querySelector('.ann-connector-origin');
    if (!originEl) { svgConn.classList.remove('visible'); return; }

    var rect = originEl.getBoundingClientRect();
    var px   = rect.left + rect.width  * 0.5;
    var py   = rect.top  + rect.height * 0.5;

    /* Build curved path */
    var pathSide = isMobile ? null : bone.side;
    var d = buildCurvedPath(px, py, bx, by, pathSide);

    connPath.setAttribute('d', d);
    connGlow.setAttribute('d', d);
    connBoneDot.setAttribute('cx', bx.toFixed(1));
    connBoneDot.setAttribute('cy', by.toFixed(1));
    connBoneGlow.setAttribute('cx', bx.toFixed(1));
    connBoneGlow.setAttribute('cy', by.toFixed(1));

    svgConn.classList.add('visible');
  }

  /* ─────────────────────────────────────────────────────────
     LERP HELPER
  ───────────────────────────────────────────────────────── */
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ─────────────────────────────────────────────────────────
     RENDER LOOP
  ───────────────────────────────────────────────────────── */
  function animate() {
    requestAnimationFrame(animate);
    var t = clock.getElapsedTime();

    /* Placeholder rotation during loading */
    if (loadingPlaceholder) {
      loadingPlaceholder.rotation.y = t * 0.6;
      loadingPlaceholder.position.y = Math.sin(t * 0.8) * 0.06;
    }

    /* Skull rotation */
    cRotY = lerp(cRotY, tRotY, 0.028);
    cRotX = lerp(cRotX, tRotX, 0.028);

    /* Skull pivot */
    var tx = isMobile ? 0       : tPivotX;
    var ty = isMobile ? tPivotY : 0;
    cPivotX = lerp(cPivotX, tx, 0.035);
    cPivotY = lerp(cPivotY, ty, 0.035);
    skullGroup.position.x = cPivotX;
    skullGroup.position.y = cPivotY;

    /* Skull mesh rotation + gentle float */
    if (skullMesh) {
      skullMesh.rotation.y = cRotY + mouseNX * 0.035;
      skullMesh.rotation.x = cRotX + mouseNY * 0.018;
      skullMesh.position.y = Math.sin(t * 0.55) * 0.04;
    }

    /* Camera */
    cCamZ = lerp(cCamZ, tCamZ, 0.032);
    cCamY = lerp(cCamY, tCamY, 0.032);
    camera.position.z = cCamZ;
    camera.position.y = cCamY;
    camera.lookAt(cPivotX * 0.45, cPivotY * 0.25 + cCamY * 0.25, 0);

    /* Spotlight */
    spotLight.position.lerp(tSpotPos, 0.035);
    spotLight.target.position.lerp(tSpotTgt, 0.035);
    spotLight.target.updateMatrixWorld();
    spotLight.intensity    = lerp(spotLight.intensity,    tSpotInt, 0.04);
    ambientLight.intensity = lerp(ambientLight.intensity, tAmbInt,  0.04);

    /* Hover raycasting — solo cambia cursor, sin tooltip de texto */
    if (skullMesh) {
      raycaster.setFromCamera(mouse2D, camera);
      var hits = raycaster.intersectObject(skullGroup, true);
      if (hits.length > 0) {
        if (!hovered) { hovered = true;  document.body.classList.add('hovering'); }
      } else if (hovered) {
        hovered = false; document.body.classList.remove('hovering');
      }
    }

    /* Cursor ring */
    ringX = lerp(ringX, mouseX, 0.1);
    ringY = lerp(ringY, mouseY, 0.1);
    cursorRing.style.left = ringX + 'px';
    cursorRing.style.top  = ringY + 'px';

    renderer.render(scene, camera);

    /* SVG connector — after render so matrices are current */
    updateConnector();
  }

  /* ── Boot ─────────────────────────────────────────────── */
  init();

})();
