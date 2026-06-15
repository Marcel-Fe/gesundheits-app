/* Gesundheits-App — 3D-Player: Coach-Avatar macht Übungen vor (three.js, lazy)
   © 2026 Marcel Fehse. Alle Rechte vorbehalten.

   Leichtgewichtiger 3D-Renderer NUR für den Mitmach-Player. three.js wird per
   dynamischem CDN-Import (esm.sh) erst hier geladen – kein Build-Step, nicht global.
   Lädt ein Coach-GLB (Ready-Player-Me) und spielt die zur Übung passende Animation
   (Mixamo-FBX, direkt – ohne Konvertierung). Das Mixamo-Skelett wird zur Laufzeit
   auf den Avatar gemappt (mixamorig-Präfix), daher passt die Bewegung zur Figur.
   Bei fehlendem WebGL / reduced-motion / Ladefehler liefern die Funktionen `false`,
   damit der Player auf die bestehende Foto-Demo zurückfällt. */
'use strict';

(function (root) {
  const V = '0.160.0';
  const THREE_URL = `https://esm.sh/three@${V}`;
  const GLTF_URL = `https://esm.sh/three@${V}/examples/jsm/loaders/GLTFLoader.js`;
  const FBX_URL = `https://esm.sh/three@${V}/examples/jsm/loaders/FBXLoader.js`;

  let THREE = null, GLTFLoader = null, FBXLoader = null;
  let renderer = null, scene = null, camera = null, clock = null;
  let mixer = null, modelRoot = null, current = null;
  let rafId = null, resizeObs = null, host = null;
  const embedded = new Map();        // Name → AnimationClip (im Coach-GLB enthalten)
  const externalRaw = new Map();     // anim-URL → roher AnimationClip (vor Retarget)

  // WebGL + Bewegungs-Präferenz prüfen. false ⇒ Aufrufer nutzt Foto-Demo.
  function play3dSupported() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch { return false; }
  }

  async function ensureCore() {
    if (THREE && GLTFLoader) return true;
    try {
      THREE = await import(THREE_URL);
      GLTFLoader = (await import(GLTF_URL)).GLTFLoader;
      return !!(THREE && GLTFLoader);
    } catch { THREE = GLTFLoader = null; return false; }
  }
  async function ensureFbx() {
    if (FBXLoader) return true;
    try { FBXLoader = (await import(FBX_URL)).FBXLoader; return !!FBXLoader; } catch { return false; }
  }

  // Modell mittig & komplett ins Bild rücken, Füße auf den Boden (y=0).
  function frameModel(obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = 1.6 / (size.y || 1);
    obj.scale.setScalar(s);
    obj.position.x = -center.x * s;
    obj.position.z = -center.z * s;
    obj.position.y = -box.min.y * s;
    obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  }

  // Mixamo-Clip auf das Avatar-Skelett umhängen: nur Rotationen (glitchfrei, kein
  // Wegfliegen durch cm-Translationen), Knochennamen tolerant mappen (mit/ohne Präfix).
  function retargetClip(clip, target) {
    const names = new Set();
    target.traverse(o => names.add(o.name));
    const strip = n => n.replace(/^mixamorig[:_]?/i, '');
    const out = [];
    clip.tracks.forEach(t => {
      if (!/\.quaternion$/.test(t.name)) return;
      const node = t.name.slice(0, t.name.lastIndexOf('.'));
      const cand = names.has(node) ? node
        : names.has(strip(node)) ? strip(node)
        : names.has('mixamorig' + strip(node)) ? 'mixamorig' + strip(node) : null;
      if (!cand) return;
      t.name = cand + '.quaternion';
      out.push(t);
    });
    clip.tracks = out;
    return clip;
  }

  function renderLoop() {
    rafId = requestAnimationFrame(renderLoop);
    if (mixer) mixer.update(clock ? clock.getDelta() : 0);
    if (renderer && scene && camera) renderer.render(scene, camera);
  }
  function resize() {
    if (!renderer || !camera || !host) return;
    const w = host.clientWidth || 320, h = host.clientHeight || 240;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  // Coach-Avatar in `container` mounten. true ⇒ 3D bereit.
  async function play3dMount(container, modelUrl) {
    if (!container || !modelUrl || !play3dSupported()) return false;
    if (!(await ensureCore())) return false;
    try {
      play3dDispose();
      host = container;
      const w = container.clientWidth || 320, h = container.clientHeight || 240;

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
      Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block' });
      container.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
      camera.position.set(0.35, 1.3, 3.4);
      camera.lookAt(0, 0.9, 0);

      // Weiches Studio-Licht: Himmel/Boden-Ambiente + Key mit Schatten + Fill.
      scene.add(new THREE.HemisphereLight(0xffffff, 0x5b6472, 1.05));
      const key = new THREE.DirectionalLight(0xffffff, 2.0);
      key.position.set(2.5, 5, 3);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.near = 0.5; key.shadow.camera.far = 20;
      key.shadow.camera.left = -2.5; key.shadow.camera.right = 2.5;
      key.shadow.camera.top = 3; key.shadow.camera.bottom = -0.5;
      key.shadow.bias = -0.0004; key.shadow.radius = 4;
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xdfe7ff, 0.5);
      fill.position.set(-3, 2, -2);
      scene.add(fill);

      // Eleganter Kontaktschatten am Boden (kein sichtbarer Boden, nur der Schatten).
      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(3, 48).rotateX(-Math.PI / 2),
        new THREE.ShadowMaterial({ opacity: 0.22 })
      );
      ground.receiveShadow = true;
      scene.add(ground);

      const gltf = await new GLTFLoader().loadAsync(modelUrl);
      modelRoot = gltf.scene;
      frameModel(modelRoot);
      scene.add(modelRoot);
      mixer = new THREE.AnimationMixer(modelRoot);
      embedded.clear();
      (gltf.animations || []).forEach(c => embedded.set(c.name, c));

      clock = new THREE.Clock();
      renderLoop();
      try { resizeObs = new ResizeObserver(resize); resizeObs.observe(container); } catch {}
      return true;
    } catch { play3dDispose(); return false; }
  }

  function fadeTo(clip) {
    if (!mixer || !clip) return false;
    const action = mixer.clipAction(clip);
    action.reset(); action.enabled = true;
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.fadeIn(0.35).play();
    if (current && current !== action) current.crossFadeTo(action, 0.35, false);
    current = action;
    return true;
  }

  async function loadExternalClip(spec) {
    if (externalRaw.has(spec)) return externalRaw.get(spec);
    const isFbx = /\.fbx($|\?)/i.test(spec);
    let anims;
    if (isFbx) {
      if (!(await ensureFbx())) return null;
      anims = (await new FBXLoader().loadAsync(spec)).animations;
    } else {
      anims = (await new GLTFLoader().loadAsync(spec)).animations;
    }
    const clip = (anims || [])[0] || null;
    if (clip) externalRaw.set(spec, clip);
    return clip;
  }

  // Animation abspielen. `spec` = Clip-Name (im Coach-GLB) ODER .fbx/.glb-URL.
  async function play3dPlay(spec) {
    if (!mixer) return false;
    if (spec && embedded.has(spec)) return fadeTo(embedded.get(spec));
    if (spec && /\.(fbx|glb)($|\?)/i.test(spec)) {
      try {
        const raw = await loadExternalClip(spec);
        if (raw && modelRoot) return fadeTo(retargetClip(raw.clone(), modelRoot));
      } catch { /* unten weiter */ }
    }
    const first = embedded.values().next().value;
    return first ? fadeTo(first) : false;
  }

  function play3dActive() { return !!renderer; }

  function play3dAttach(container) {
    if (!renderer || !container) return false;
    container.appendChild(renderer.domElement);
    host = container; resize();
    if (resizeObs) { try { resizeObs.disconnect(); } catch {} }
    try { resizeObs = new ResizeObserver(resize); resizeObs.observe(container); } catch {}
    return true;
  }

  // Alles freigeben – kein WebGL-Context-Leak beim Verlassen des Players.
  function play3dDispose() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (resizeObs) { try { resizeObs.disconnect(); } catch {} resizeObs = null; }
    if (mixer) { try { mixer.stopAllAction(); mixer.uncacheRoot(modelRoot); } catch {} mixer = null; }
    if (scene) {
      scene.traverse(o => {
        if (o.geometry) { try { o.geometry.dispose(); } catch {} }
        const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
        mats.forEach(m => {
          for (const k in m) { const v = m[k]; if (v && v.isTexture) { try { v.dispose(); } catch {} } }
          try { m.dispose(); } catch {}
        });
      });
    }
    if (renderer) {
      try { renderer.dispose(); } catch {}
      try { renderer.forceContextLoss(); } catch {}
      if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      renderer = null;
    }
    scene = camera = clock = modelRoot = current = host = null;
    embedded.clear();
  }

  root.play3dSupported = play3dSupported;
  root.play3dMount = play3dMount;
  root.play3dPlay = play3dPlay;
  root.play3dActive = play3dActive;
  root.play3dAttach = play3dAttach;
  root.play3dDispose = play3dDispose;
})(typeof window !== 'undefined' ? window : globalThis);
