/* Gesundheits-App — Prozeduraler 3D-Coach: stilisierte Figur macht Übungen vor
   © 2026 Marcel Fehse. Alle Rechte vorbehalten.

   Braucht KEINE externen Assets/Logins: eine geriggte Figur aus Primitiven wird
   per Code animiert (Gelenkwinkel über die Zeit). Läuft nur im Mitmach-Player,
   three.js lazy per CDN (wie der Scanner). Bei kein-WebGL/reduced-motion liefern
   die Funktionen false → der Player fällt auf die Foto-Demo zurück. */
'use strict';

(function (root) {
  const THREE_URL = 'https://esm.sh/three@0.160.0';
  let THREE = null;
  let renderer = null, scene = null, camera = null, clock = null;
  let rig = null, J = null, baseY = 0, host = null;
  let rafId = null, resizeObs = null, poseFn = null, t0 = 0;

  // Coach-Farbe aus dem Avatar-Gradienten ableiten (Figur „gehört" dem Coach).
  const GRAD_COLOR = { terracotta: 0xCf6b54, amber: 0xF2A53C, sage: 0x46A86F, peach: 0xFF8E7A, sunrise: 0xF77E5C };

  function play3dSupportedLike() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch { return false; }
  }
  async function ensureLib() {
    if (THREE) return true;
    try { THREE = await import(THREE_URL); return !!THREE; } catch { THREE = null; return false; }
  }

  // Ein Glied: Pivot-Group am Gelenk + Kapsel-Mesh, das von dort nach unten reicht.
  // Kind-Gelenke hängen bei (0,-len,0). So dreht die Group sauber um das Gelenk.
  function limb(parent, x, y, z, len, rad, mat) {
    const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(rad, len, 6, 12), mat);
    m.position.y = -len / 2; m.castShadow = true; g.add(m);
    return g;
  }
  function ball(parent, x, y, z, rad, mat) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(rad, 20, 16), mat);
    m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
  }

  function buildRig(coach) {
    const body = new THREE.MeshStandardMaterial({ color: (coach && GRAD_COLOR[coach.grad]) || 0x16A34A, roughness: 0.65, metalness: 0.05 });
    const head = new THREE.MeshStandardMaterial({ color: 0xF3C9A8, roughness: 0.7 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2B3252, roughness: 0.7 });

    const r = new THREE.Group();
    const hips = new THREE.Group(); hips.position.set(0, 0.92, 0); r.add(hips);
    ball(hips, 0, 0, 0, 0.13, body); // Becken

    // Rumpf (dreht an der Hüfte)
    const torso = new THREE.Group(); hips.add(torso);
    const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.42, 6, 12), body);
    chest.position.y = 0.27; chest.castShadow = true; torso.add(chest);
    ball(torso, 0, 0.5, 0, 0.055, body);           // Hals
    const headM = ball(torso, 0, 0.64, 0, 0.125, head);

    // Arme (Schulter → Ellbogen → Hand)
    const armL = limb(torso, 0.2, 0.46, 0, 0.28, 0.05, body);
    const foreL = limb(armL, 0, -0.28, 0, 0.26, 0.045, head);
    ball(foreL, 0, -0.26, 0, 0.05, head);
    const armR = limb(torso, -0.2, 0.46, 0, 0.28, 0.05, body);
    const foreR = limb(armR, 0, -0.28, 0, 0.26, 0.045, head);
    ball(foreR, 0, -0.26, 0, 0.05, head);

    // Beine (Hüfte → Knie → Fuß)
    const thighL = limb(hips, 0.1, -0.05, 0, 0.42, 0.065, body);
    const shinL = limb(thighL, 0, -0.42, 0, 0.42, 0.055, body);
    const footL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.2), dark);
    footL.position.set(0, -0.44, 0.05); footL.castShadow = true; shinL.add(footL);
    const thighR = limb(hips, -0.1, -0.05, 0, 0.42, 0.065, body);
    const shinR = limb(thighR, 0, -0.42, 0, 0.42, 0.055, body);
    const footR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.2), dark);
    footR.position.set(0, -0.44, 0.05); footR.castShadow = true; shinR.add(footR);

    J = { r, hips, torso, head: headM, armL, foreL, armR, foreR, thighL, shinL, thighR, shinR };
    return r;
  }

  // ===== Übungs-Choreografien (Zeit t in Sekunden, Endlosschleife) =====
  const wave = (t, period, lo, hi) => lo + (hi - lo) * (1 - Math.cos((t / period) * Math.PI * 2)) / 2;
  const tri = (t, period) => (1 - Math.cos((t / period) * Math.PI * 2)) / 2; // 0→1→0

  function reset() {
    J.r.rotation.set(0, 0, 0); J.r.position.set(0, 0, 0);
    ['hips', 'torso', 'armL', 'foreL', 'armR', 'foreR', 'thighL', 'shinL', 'thighR', 'shinR'].forEach(k => J[k].rotation.set(0, 0, 0));
    J.r.position.y = baseY;
  }

  const POSES = {
    squat(t) {
      const k = tri(t, 2.2);
      J.thighL.rotation.x = J.thighR.rotation.x = k * 1.25;
      J.shinL.rotation.x = J.shinR.rotation.x = -k * 1.5;
      J.torso.rotation.x = -k * 0.45;
      J.armL.rotation.x = J.armR.rotation.x = -k * 1.5 - 0.15;
      J.r.position.y = baseY - k * 0.32;
    },
    jumping_jacks(t) {
      const k = tri(t, 1.0);
      J.armL.rotation.z = -k * 2.6; J.armR.rotation.z = k * 2.6;
      J.armL.rotation.x = J.armR.rotation.x = -k * 0.2;
      J.thighL.rotation.z = k * 0.4; J.thighR.rotation.z = -k * 0.4;
      J.r.position.y = baseY + Math.abs(Math.sin(t / 1.0 * Math.PI * 2)) * 0.04;
    },
    march(t) { // generischer Fallback: Knie heben im Wechsel
      const s = Math.sin(t * 3.4);
      J.thighL.rotation.x = Math.max(0, s) * 1.1;
      J.shinL.rotation.x = -Math.max(0, s) * 0.9;
      J.thighR.rotation.x = Math.max(0, -s) * 1.1;
      J.shinR.rotation.x = -Math.max(0, -s) * 0.9;
      J.armR.rotation.x = Math.max(0, s) * 0.9; J.armL.rotation.x = Math.max(0, -s) * 0.9;
    },
    lunge(t) {
      const k = tri(t, 2.0);
      J.thighL.rotation.x = k * 1.1; J.shinL.rotation.x = -k * 1.2;   // vorderes Bein beugt
      J.thighR.rotation.x = -k * 0.9; J.shinR.rotation.x = k * 1.3;    // hinteres Bein
      J.torso.rotation.x = -k * 0.1;
      J.r.position.y = baseY - k * 0.22;
      J.armL.rotation.x = J.armR.rotation.x = -k * 0.3;
    },
    pushup(t) {
      // Liegestütz: ganzer Körper waagerecht (Gesicht nach unten), Ellbogen beugen.
      J.r.rotation.x = -Math.PI / 2; J.r.position.y = 0.42;
      J.armL.rotation.x = J.armR.rotation.x = 1.55; // Arme zum Boden
      J.thighL.rotation.x = J.thighR.rotation.x = 0;
      const k = tri(t, 1.8);
      J.foreL.rotation.x = J.foreR.rotation.x = -k * 1.0;
      J.r.position.y = 0.42 - k * 0.12;
      J.torso.rotation.x = 0;
    },
    plank(t) {
      J.r.rotation.x = -Math.PI / 2; J.r.position.y = 0.36;
      J.armL.rotation.x = J.armR.rotation.x = 1.55;
      J.foreL.rotation.x = J.foreR.rotation.x = -0.9; // Unterarmstütz
      J.r.position.y = 0.36 + Math.sin(t * 1.6) * 0.006; // leichtes Atmen
    },
    situp(t) {
      // Auf dem Rücken liegen, Oberkörper aufrollen.
      J.r.rotation.x = Math.PI / 2; J.r.position.y = 0.2;
      J.thighL.rotation.x = J.thighR.rotation.x = -1.1;  // Knie angestellt
      J.shinL.rotation.x = J.shinR.rotation.x = 1.4;
      const k = tri(t, 2.0);
      J.torso.rotation.x = -k * 1.2;                     // Aufrollen
      J.armL.rotation.x = J.armR.rotation.x = -1.4;
    },
    burpee(t) {
      // Vereinfacht: Kniebeuge → Strecksprung im Wechsel.
      const c = t % 2.4;
      if (c < 1.4) { POSES.squat(c * (2.2 / 1.4)); }
      else {
        reset();
        const j = tri(c - 1.4, 1.0);
        J.r.position.y = baseY + j * 0.18;
        J.armL.rotation.z = -j * 2.8; J.armR.rotation.z = j * 2.8;
      }
    }
  };
  // Mehrere Übungs-Animationsnamen teilen sich eine Choreografie.
  const ALIAS = { high_knees: 'march', mountain_climbers: 'plank', side_plank: 'plank', wall_sit: 'squat', jump_squats: 'squat', step_ups: 'march' };

  function renderLoop() {
    rafId = requestAnimationFrame(renderLoop);
    if (poseFn) { reset(); try { poseFn(clock.getElapsedTime() - t0); } catch {} }
    if (renderer && scene && camera) renderer.render(scene, camera);
  }
  function resize() {
    if (!renderer || !camera || !host) return;
    const w = host.clientWidth || 320, h = host.clientHeight || 240;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  function figure3dSupported() { return play3dSupportedLike(); }

  async function figure3dMount(container, coach) {
    if (!container || !figure3dSupported()) return false;
    if (!(await ensureLib())) return false;
    try {
      figure3dDispose();
      host = container;
      const w = container.clientWidth || 320, h = container.clientHeight || 240;
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
      if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
      Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block' });
      container.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
      camera.position.set(0.6, 1.15, 3.7); camera.lookAt(0, 0.85, 0);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7488, 1.0));
      const key = new THREE.DirectionalLight(0xffffff, 2.0);
      key.position.set(2.5, 5, 3); key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = 0.5; key.shadow.camera.far = 20;
      key.shadow.camera.left = -3; key.shadow.camera.right = 3; key.shadow.camera.top = 3; key.shadow.camera.bottom = -1;
      key.shadow.bias = -0.0004; key.shadow.radius = 4; scene.add(key);
      const fill = new THREE.DirectionalLight(0xdfe7ff, 0.5); fill.position.set(-3, 2, -2); scene.add(fill);
      const ground = new THREE.Mesh(new THREE.CircleGeometry(3.5, 48).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.22 }));
      ground.receiveShadow = true; scene.add(ground);

      baseY = 0; rig = buildRig(coach); scene.add(rig);
      clock = new THREE.Clock(); t0 = 0;
      renderLoop();
      try { resizeObs = new ResizeObserver(resize); resizeObs.observe(container); } catch {}
      return true;
    } catch { figure3dDispose(); return false; }
  }

  // exId = Übungs-ID; wird über EX_ANIM_3D bzw. ALIAS auf eine Choreografie gemappt.
  function figure3dPlay(exId) {
    if (!J) return false;
    const base = (window.EX_ANIM_3D && window.EX_ANIM_3D[exId]) || ALIAS[exId] || exId;
    poseFn = POSES[base] || POSES.march;
    t0 = clock ? clock.getElapsedTime() : 0; // sauberer Neustart der Bewegung
    return true;
  }
  function figure3dActive() { return !!renderer; }
  function figure3dAttach(container) {
    if (!renderer || !container) return false;
    container.appendChild(renderer.domElement); host = container; resize();
    if (resizeObs) { try { resizeObs.disconnect(); } catch {} }
    try { resizeObs = new ResizeObserver(resize); resizeObs.observe(container); } catch {}
    return true;
  }
  function figure3dDispose() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (resizeObs) { try { resizeObs.disconnect(); } catch {} resizeObs = null; }
    if (scene) {
      scene.traverse(o => {
        if (o.geometry) { try { o.geometry.dispose(); } catch {} }
        const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
        mats.forEach(m => { try { m.dispose(); } catch {} });
      });
    }
    if (renderer) {
      try { renderer.dispose(); } catch {}
      try { renderer.forceContextLoss(); } catch {}
      if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      renderer = null;
    }
    scene = camera = clock = rig = J = host = poseFn = null;
  }

  root.figure3dSupported = figure3dSupported;
  root.figure3dMount = figure3dMount;
  root.figure3dPlay = figure3dPlay;
  root.figure3dActive = figure3dActive;
  root.figure3dAttach = figure3dAttach;
  root.figure3dDispose = figure3dDispose;
})(typeof window !== 'undefined' ? window : globalThis);
