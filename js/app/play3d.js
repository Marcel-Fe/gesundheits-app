/* Gesundheits-App — 3D-Player: Coach-Avatar macht Übungen vor (three.js, lazy)
   © 2026 Marcel Fehse. Alle Rechte vorbehalten.

   Leichtgewichtiger 3D-Renderer NUR für den Mitmach-Player. three.js wird per
   dynamischem CDN-Import (esm.sh) erst hier geladen – kein Build-Step, nicht global.
   Lädt ein Coach-GLB (Ready-Player-Me) und spielt die zur Übung passende Animation.
   Bei fehlendem WebGL / reduced-motion / Ladefehler liefern die Funktionen `false`,
   damit der Player auf die bestehende Foto-Demo zurückfällt. */
'use strict';

(function (root) {
  const THREE_URL = 'https://esm.sh/three@0.160.0';
  const GLTF_URL = 'https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

  let THREE = null, GLTFLoader = null;       // lazy geladene Lib-Referenzen
  let renderer = null, scene = null, camera = null, clock = null;
  let mixer = null, modelRoot = null, current = null;   // current = laufende Action
  let rafId = null, resizeObs = null, host = null;
  const embedded = new Map();                 // Name → AnimationClip (im Coach-GLB enthalten)
  const externalClips = new Map();            // anim-URL → AnimationClip (Mixamo o. Ä.)

  // WebGL + Bewegungs-Präferenz prüfen. false ⇒ Aufrufer nutzt Foto-Demo.
  function play3dSupported() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch { return false; }
  }

  async function ensureLib() {
    if (THREE && GLTFLoader) return true;
    try {
      THREE = await import(THREE_URL);
      const mod = await import(GLTF_URL);
      GLTFLoader = mod.GLTFLoader;
      return !!(THREE && GLTFLoader);
    } catch { THREE = GLTFLoader = null; return false; }
  }

  // Modell mittig & komplett ins Bild rücken (Größe der Avatare variiert).
  function frameModel(obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const h = size.y || 1;
    const s = 1.6 / h;                         // auf ~1.6 Einheiten Höhe normieren
    obj.scale.setScalar(s);
    obj.position.x = -center.x * s;
    obj.position.z = -center.z * s;
    obj.position.y = -box.min.y * s;           // Füße auf Boden (y=0)
  }

  function renderLoop() {
    rafId = requestAnimationFrame(renderLoop);
    const dt = clock ? clock.getDelta() : 0;
    if (mixer) mixer.update(dt);
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  function resize() {
    if (!renderer || !camera || !host) return;
    const w = host.clientWidth || 320, hgt = host.clientHeight || 240;
    renderer.setSize(w, hgt, false);
    camera.aspect = w / hgt;
    camera.updateProjectionMatrix();
  }

  // Coach-Avatar in `container` mounten. Gibt true zurück, wenn 3D bereit ist.
  async function play3dMount(container, modelUrl) {
    if (!container || !modelUrl || !play3dSupported()) return false;
    if (!(await ensureLib())) return false;
    try {
      play3dDispose();                          // evtl. alten Kontext sicher freigeben
      host = container;
      const w = container.clientWidth || 320, hgt = container.clientHeight || 240;
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, hgt, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      container.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(40, w / hgt, 0.1, 100);
      camera.position.set(0, 1.0, 3.2);
      camera.lookAt(0, 0.9, 0);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x666677, 1.6));
      const dir = new THREE.DirectionalLight(0xffffff, 1.1);
      dir.position.set(2, 4, 3);
      scene.add(dir);

      const gltf = await new GLTFLoader().loadAsync(modelUrl);
      modelRoot = gltf.scene;
      frameModel(modelRoot);
      scene.add(modelRoot);
      mixer = new THREE.AnimationMixer(modelRoot);
      embedded.clear();
      (gltf.animations || []).forEach(clip => embedded.set(clip.name, clip));

      clock = new THREE.Clock();
      renderLoop();
      try { resizeObs = new ResizeObserver(resize); resizeObs.observe(container); } catch {}
      return true;
    } catch {
      play3dDispose();
      return false;
    }
  }

  function fadeTo(clip) {
    if (!mixer || !clip) return false;
    const action = mixer.clipAction(clip);
    action.reset();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.enabled = true;
    action.fadeIn(0.3).play();
    if (current && current !== action) current.crossFadeTo(action, 0.3, false);
    current = action;
    return true;
  }

  // Animation abspielen. `spec` = Clip-Name (im Coach-GLB) ODER .glb-URL (externe
  // Mixamo-Animation; Knochennamen müssen zum Avatar passen). null = erster Clip.
  async function play3dPlay(spec) {
    if (!mixer) return false;
    // 1) Eingebetteter Clip per Name (selbst-animiertes Coach-GLB)
    if (spec && embedded.has(spec)) return fadeTo(embedded.get(spec));
    // 2) Externe Animations-Datei (.glb, z. B. Mixamo). Schlägt das Laden fehl,
    //    fällt es unten auf einen eingebetteten Clip zurück (kein harter Abbruch).
    if (spec && /\.glb($|\?)/i.test(spec)) {
      try {
        let clip = externalClips.get(spec);
        if (!clip) {
          const g = await new GLTFLoader().loadAsync(spec);
          clip = (g.animations || [])[0];
          if (clip) externalClips.set(spec, clip);
        }
        if (clip) return fadeTo(clip);
      } catch { /* unten weiter */ }
    }
    // 3) Fallback: erster eingebetteter Clip (sonst bewegungslos, aber sichtbar)
    const first = embedded.values().next().value;
    return first ? fadeTo(first) : false;
  }

  // Läuft schon ein Renderer? (Player baut sein HTML pro Schritt neu auf.)
  function play3dActive() { return !!renderer; }

  // Bestehenden Canvas in einen neuen Container hängen, statt neu zu mounten –
  // so bleiben WebGL-Kontext & Modell über Schrittwechsel hinweg erhalten.
  function play3dAttach(container) {
    if (!renderer || !container) return false;
    container.appendChild(renderer.domElement);
    host = container;
    resize();
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
