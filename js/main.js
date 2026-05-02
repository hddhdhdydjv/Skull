/* ============================================================
   ANATOMY UNVEILED — main.js
   Scroll-driven spotlight + skull rotation per bone
   ============================================================ */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────
     BONE DATA
     pivotX  : desktop — skull shifts right (+) or left (-)
     pivotY  : mobile  — skull shifts up (+) to reveal space below
     rotY    : skull Y rotation to face camera toward that bone
     rotX    : skull X tilt
     camZ    : camera distance (zoom)
     camY    : camera height
     spotPos : world-space spotlight source position
     spotTgt : world-space spotlight target (on skull)
     spotInt : spotlight intensity
     side    : which side the annotation lives on desktop
  ───────────────────────────────────────────────────────── */
  /* bonePos: approximate position of the bone in skullMesh LOCAL space.
     The skull is auto-centered at origin and scaled to ~2.5 units max.
     These are updated via `applyMatrix4(skullMesh.matrixWorld)` each frame. */
  var BONES = [
    {
      id: 'intro',
      label: null,
      rotY:    0,
      rotX:    0,
      camZ:    5.5,
      camY:    0,
      pivotX:  0,
      pivotY:  0,
      spotPos: { x:  2,    y:  5,   z:  4   },
      spotTgt: { x:  0,    y:  0,   z:  0   },
      spotInt: 2.5,
      ambInt:  0.9,
      bonePos: new THREE.Vector3(0, 0, 0),
      side:    null,
    },
    {
      id: 'frontal',
      label: 'Hueso Frontal',
      rotY:    0,
      rotX:   -0.08,
      camZ:    3.9,
      camY:    0.35,
      pivotX:  1.05,
      pivotY:  0.75,
      spotPos: { x:  0.3,  y:  5,   z:  6   },
      spotTgt: { x:  0.1,  y:  0.8, z:  0   },
      spotInt: 14,
      ambInt:  0.25,
      bonePos: new THREE.Vector3( 0.05, 0.72,  0.52),  // forehead
      side:    'left',
    },
    {
      id: 'parietal',
      label: 'Hueso Parietal',
      rotY:   -0.45,
      rotX:   -0.25,
      camZ:    4.1,
      camY:    0.5,
      pivotX: -1.05,
      pivotY:  0.7,
      spotPos: { x: -4,    y:  6,   z:  2   },
      spotTgt: { x: -0.2,  y:  0.9, z:  0   },
      spotInt: 14,
      ambInt:  0.25,
      bonePos: new THREE.Vector3(-0.28, 0.90, -0.08),  // top-left
      side:    'right',
    },
    {
      id: 'occipital',
      label: 'Hueso Occipital',
      rotY:   -2.8,
      rotX:    0.1,
      camZ:    4.3,
      camY:    0.15,
      pivotX:  1.05,
      pivotY:  0.65,
      spotPos: { x:  0,    y:  3.5, z: -6   },
      spotTgt: { x:  0,    y:  0.1, z: -0.1 },
      spotInt: 14,
      ambInt:  0.25,
      bonePos: new THREE.Vector3( 0.0,  0.12, -0.88),  // back center
      side:    'left',
    },
    {
      id: 'temporal',
      label: 'Hueso Temporal',
      rotY:   -1.1,
      rotX:    0,
      camZ:    3.8,
      camY:    0.1,
      pivotX: -1.05,
      pivotY:  0.65,
      spotPos: { x:  6,    y:  1,   z:  3   },
      spotTgt: { x:  0.5,  y:  0.1, z:  0   },
      spotInt: 14,
      ambInt:  0.25,
      bonePos: new THREE.Vector3( 0.82,  0.05,  0.10),  // right side mid
      side:    'right',
    },
    {
      id: 'orbital',
      label: 'Cavidad Orbital',
      rotY:    0.2,
      rotX:   -0.05,
      camZ:    3.5,
      camY:    0.25,
      pivotX:  1.05,
      pivotY:  0.7,
      spotPos: { x:  1.5,  y:  2.5, z:  6   },
      spotTgt: { x:  0.3,  y:  0.4, z:  0   },
      spotInt: 14,
      ambInt:  0.25,
      bonePos: new THREE.Vector3( 0.38,  0.28,  0.60),  // right eye socket
      side:    'left',
    },
    {
      id: 'cigomatico',
      label: 'Arco Cigomático',
      rotY:   -0.75,
      rotX:    0.05,
      camZ:    3.9,
      camY:   -0.1,
      pivotX: -1.05,
      pivotY:  0.65,
      spotPos: { x:  5,    y: -0.5, z:  4   },
      spotTgt: { x:  0.5,  y: -0.1, z:  0   },
      spotInt: 14,
      ambInt:  0.25,
      bonePos: new THREE.Vector3( 0.70, -0.18,  0.42),  // right cheekbone
      side:    'right',
    },
  ];

  /* ── DOM refs ─────────────────────────────────────────── */
  var loadingEl      = document.getElementById('loading-screen');
  var progressEl     = document.getElementById('progress-bar');
  var scrollHint     = document.getElementById('scroll-hint');
  var tooltip        = document.getElementById('tooltip');
  var tooltipText    = document.getElementById('tooltip-text');
  var cursorDot      = document.getElementById('cursor-dot');
  var cursorRing     = document.getElementById('cursor-ring');
  var sections       = document.querySelectorAll('.bone-section');
  /* SVG connector */
  var svgConn        = document.getElementById('svg-connectors');
  var connLine       = document.getElementById('conn-line');
  var connLineGlow   = document.getElementById('conn-line-glow');
  var connDot        = document.getElementById('conn-dot');
  var connDotGlow    = document.getElementById('conn-dot-glow');
  var connDotPanel   = document.getElementById('conn-dot-panel');

  /* ── Three.js refs ────────────────────────────────────── */
  var scene, camera, renderer, clock;
  var skullGroup;        // pivot (shifts left/right or up/down)
  var skullMesh = null;  // actual loaded object (child of skullGroup)
  var spotLight, ambientLight;
  var raycaster, mouse2D;

  /* ── Animation targets (lerped each frame) ────────────── */
  var tCamZ     = 5.5;
  var tCamY     = 0;
  var tRotY     = 0;
  var tRotX     = 0;
  var tPivotX   = 0;
  var tPivotY   = 0;
  var tSpotPos  = new THREE.Vector3( 2, 5, 4);
  var tSpotTgt  = new THREE.Vector3( 0, 0, 0);
  var tSpotInt  = 2.5;
  var tAmbInt   = 0.9;

  /* ── Current (lerped) values ──────────────────────────── */
  var cRotY   = 0;
  var cRotX   = 0;
  var cPivotX = 0;
  var cPivotY = 0;
  var cCamZ   = 5.5;
  var cCamY   = 0;

  /* ── Mouse / cursor ───────────────────────────────────── */
  var mouseX = 0, mouseY = 0;
  var mouseNX = 0, mouseNY = 0;
  var ringX = 0, ringY = 0;

  /* ── State ────────────────────────────────────────────── */
  var activeIndex  = 0;
  var isMobile     = window.innerWidth <= 768;
  var hovered      = false;
  var scrolled     = false;

  /* ── Init ─────────────────────────────────────────────── */
  function init() {
    var container = document.getElementById('canvas-container');
    clock = new THREE.Clock();

    /* Scene */
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060607);
    scene.fog = new THREE.FogExp2(0x060607, 0.035);

    /* Camera */
    camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 5.5);

    /* Renderer */
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding     = THREE.sRGBEncoding;
    renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    renderer.shadowMap.enabled  = true;
    renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    /* Skull pivot group */
    skullGroup = new THREE.Group();
    scene.add(skullGroup);

    /* Raycaster */
    raycaster = new THREE.Raycaster();
    mouse2D   = new THREE.Vector2();

    buildLights();
    loadModel();
    setupScroll();
    setupEvents();
    animate();
  }

  /* ── Lights ───────────────────────────────────────────── */
  function buildLights() {
    /* Very dim ambient — spotlight creates all contrast */
    ambientLight = new THREE.AmbientLight(0x1a1208, 0.9);
    scene.add(ambientLight);

    /* Cold fill from left */
    var fill = new THREE.DirectionalLight(0x6080a0, 0.4);
    fill.position.set(-5, 1, 2);
    scene.add(fill);

    /* Main theatrical spotlight */
    spotLight = new THREE.SpotLight(0xfff3d0, 2.5);
    spotLight.position.set(2, 5, 4);
    spotLight.angle     = Math.PI / 9;   // 20°
    spotLight.penumbra  = 0.35;
    spotLight.decay     = 1.8;
    spotLight.distance  = 20;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.set(1024, 1024);
    scene.add(spotLight);
    scene.add(spotLight.target);
    spotLight.target.position.set(0, 0, 0);
  }

  /* ── Load model ───────────────────────────────────────── */
  function loadModel() {
    var draco = new THREE.DRACOLoader();
    draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/libs/draco/');

    var loader = new THREE.GLTFLoader();
    loader.setDRACOLoader(draco);

    loader.load(
      'assets/Craneo.glb',
      function (gltf) {
        skullMesh = gltf.scene;

        /* Auto-center + scale */
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
        hideLoading();
      },
      function (xhr) {
        if (xhr.lengthComputable) {
          progressEl.style.width = ((xhr.loaded / xhr.total) * 100) + '%';
        }
      },
      function (err) {
        console.warn('GLB no encontrado — placeholder.', err);
        buildPlaceholder();
        hideLoading();
      }
    );
  }

  function buildPlaceholder() {
    var geo = new THREE.SphereGeometry(1, 48, 48);
    var mat = new THREE.MeshStandardMaterial({ color: 0xc4b49a, roughness: 0.6, metalness: 0.05 });
    skullMesh = new THREE.Mesh(geo, mat);
    skullMesh.castShadow = true;
    skullGroup.add(skullMesh);
  }

  function hideLoading() {
    progressEl.style.width = '100%';
    setTimeout(function () { loadingEl.classList.add('hidden'); }, 700);
  }

  /* ── Activate bone by scroll index ───────────────────── */
  function activateBone(index) {
    if (index === activeIndex) return;
    activeIndex = index;

    var bone = BONES[index];

    /* Camera targets */
    tCamZ  = bone.camZ;
    tCamY  = bone.camY;

    /* Skull rotation targets */
    tRotY  = bone.rotY;
    tRotX  = bone.rotX;

    /* Skull pivot offset */
    tPivotX = bone.pivotX;
    tPivotY = bone.pivotY;

    /* Spotlight */
    tSpotPos.set(bone.spotPos.x, bone.spotPos.y, bone.spotPos.z);
    tSpotTgt.set(bone.spotTgt.x, bone.spotTgt.y, bone.spotTgt.z);
    tSpotInt = bone.spotInt;
    tAmbInt  = bone.ambInt;

    /* Section text */
    sections.forEach(function (s, i) {
      s.classList.toggle('active', i === index);
    });
  }

  /* ── Scroll setup ─────────────────────────────────────── */
  function setupScroll() {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          activateBone(parseInt(entry.target.dataset.index, 10));
        }
      });
    }, { threshold: 0.45 });

    sections.forEach(function (s) { observer.observe(s); });

    /* Intro active on load */
    sections[0].classList.add('active');
  }

  /* ── Events ───────────────────────────────────────────── */
  function setupEvents() {

    /* Mouse move — cursor + parallax + raycasting */
    document.addEventListener('mousemove', function (e) {
      mouseX  = e.clientX;
      mouseY  = e.clientY;
      mouseNX = (e.clientX / window.innerWidth)  * 2 - 1;
      mouseNY = (e.clientY / window.innerHeight) * 2 - 1;

      cursorDot.style.left = mouseX + 'px';
      cursorDot.style.top  = mouseY + 'px';
      tooltip.style.left   = mouseX + 'px';
      tooltip.style.top    = mouseY + 'px';

      /* Raycasting for hover */
      mouse2D.set(mouseNX, -mouseNY);
    });

    /* Scroll — hide scroll hint once */
    window.addEventListener('scroll', function () {
      if (!scrolled) {
        scrolled = true;
        scrollHint.classList.add('hidden');
      }
    }, { passive: true });

    /* Resize */
    window.addEventListener('resize', function () {
      isMobile = window.innerWidth <= 768;
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  /* ── Lerp helper ──────────────────────────────────────── */
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ── Render loop ──────────────────────────────────────── */
  function animate() {
    requestAnimationFrame(animate);
    var t = clock.getElapsedTime();

    /* ── Skull rotation lerp */
    cRotY = lerp(cRotY, tRotY, 0.028);
    cRotX = lerp(cRotX, tRotX, 0.028);

    /* ── Skull pivot lerp (desktop X, mobile Y) */
    var targetX = isMobile ? 0       : tPivotX;
    var targetY = isMobile ? tPivotY : 0;
    cPivotX = lerp(cPivotX, targetX, 0.035);
    cPivotY = lerp(cPivotY, targetY, 0.035);
    skullGroup.position.x = cPivotX;
    skullGroup.position.y = cPivotY;

    /* ── Apply skull rotation + subtle mouse parallax */
    if (skullMesh) {
      skullMesh.rotation.y = cRotY + mouseNX * 0.04;
      skullMesh.rotation.x = cRotX + mouseNY * 0.02;

      /* Gentle float */
      skullMesh.position.y = Math.sin(t * 0.55) * 0.04;
    }

    /* ── Camera lerp */
    cCamZ = lerp(cCamZ, tCamZ, 0.032);
    cCamY = lerp(cCamY, tCamY, 0.032);
    camera.position.z = cCamZ;
    camera.position.y = cCamY;
    camera.lookAt(cPivotX * 0.5, cPivotY * 0.3 + cCamY * 0.3, 0);

    /* ── Spotlight lerp */
    spotLight.position.lerp(tSpotPos, 0.035);
    spotLight.target.position.lerp(tSpotTgt, 0.035);
    spotLight.target.updateMatrixWorld();
    spotLight.intensity  = lerp(spotLight.intensity,  tSpotInt,  0.04);
    ambientLight.intensity = lerp(ambientLight.intensity, tAmbInt, 0.04);

    /* ── Raycasting hover */
    if (skullMesh && renderer) {
      raycaster.setFromCamera(mouse2D, camera);
      var hits = raycaster.intersectObject(skullGroup, true);
      if (hits.length > 0) {
        if (!hovered) {
          hovered = true;
          document.body.classList.add('hovering');
          var bone = BONES[activeIndex];
          tooltipText.textContent = bone.label || 'Explorá el cráneo';
          tooltip.classList.add('visible');
        }
      } else {
        if (hovered) {
          hovered = false;
          document.body.classList.remove('hovering');
          tooltip.classList.remove('visible');
        }
      }
    }

    /* ── Cursor ring lag */
    ringX = lerp(ringX, mouseX, 0.1);
    ringY = lerp(ringY, mouseY, 0.1);
    cursorRing.style.left = ringX + 'px';
    cursorRing.style.top  = ringY + 'px';

    renderer.render(scene, camera);

    /* SVG connector — updated after render so matrices are current */
    updateConnector();
  }

  /* ── Connector (SVG line bone ↔ panel) ───────────────── */
  var _worldPos = new THREE.Vector3();

  function updateConnector() {
    var bone = BONES[activeIndex];

    /* Hide during intro or if skull not loaded */
    if (activeIndex === 0 || !skullMesh) {
      svgConn.classList.remove('visible');
      return;
    }

    /* Project bone local position → world → NDC → screen */
    _worldPos.copy(bone.bonePos).applyMatrix4(skullMesh.matrixWorld);
    _worldPos.add(skullGroup.position); // account for pivot shift

    var ndc = _worldPos.clone().project(camera);

    /* Skip if behind camera */
    if (ndc.z >= 1) {
      svgConn.classList.remove('visible');
      return;
    }

    var W = window.innerWidth;
    var H = window.innerHeight;
    var bx = (ndc.x  + 1) / 2 * W;
    var by = (-ndc.y + 1) / 2 * H;

    /* Panel connection point */
    var panel = sections[activeIndex] && sections[activeIndex].querySelector('.ann-panel');
    if (!panel) { svgConn.classList.remove('visible'); return; }

    var rect = panel.getBoundingClientRect();
    var px, py;

    if (isMobile) {
      px = rect.left + rect.width * 0.5;
      py = rect.top + 8;
    } else if (bone.side === 'left') {
      px = rect.right - 4;
      py = rect.top + rect.height * 0.28; /* align near title */
    } else {
      px = rect.left + 4;
      py = rect.top + rect.height * 0.28;
    }

    /* Update all SVG elements */
    function setLine(el) {
      el.setAttribute('x1', px);
      el.setAttribute('y1', py);
      el.setAttribute('x2', bx);
      el.setAttribute('y2', by);
    }
    setLine(connLine);
    setLine(connLineGlow);

    connDot.setAttribute('cx', bx);
    connDot.setAttribute('cy', by);
    connDotGlow.setAttribute('cx', bx);
    connDotGlow.setAttribute('cy', by);
    connDotPanel.setAttribute('cx', px);
    connDotPanel.setAttribute('cy', py);

    svgConn.classList.add('visible');
  }

  /* ── Boot ─────────────────────────────────────────────── */
  init();

})();
