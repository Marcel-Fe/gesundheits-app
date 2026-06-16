/* Gesundheits-App — Training: Sessions, Mitmach-Player & Übungen
   © 2026 Marcel Fehse. Alle Rechte vorbehalten. */
'use strict';

function renderSession() {
  const s = L.sessionById(C, state.sessionId);
  const items = s.items.map(it => {
    const ex = L.exerciseById(C, it.exerciseId);
    const target = it.hold ? `${it.sets} × ${it.hold} Sek` : `${it.sets} × ${it.reps}`;
    return `<button class="row-card" data-ex="${ex.id}">
      <div class="row-thumb g-${ex.grad}">${ex.emoji}</div>
      <div class="row-main"><div class="row-title">${esc(ex.name)}</div><div class="row-sub">${target} · ${GROUP_LABEL[ex.group] || ''}</div></div>
      <div class="row-chev">›</div></button>`;
  }).join('');
  app.innerHTML = `<div class="screen">
    <div class="page-head"><button class="btn btn-ghost" id="ses-back" style="width:auto;padding:8px 14px">← Zurück</button></div>
    <div class="recipe-hero g-${s.grad}">${s.emoji}</div>
    <h1 class="page-title">${esc(s.name)}</h1>
    <p class="page-sub">⏱️ ${s.minutes} Min · ${esc(LEVEL_LABEL[s.level] || '')} · ${s.items.length} Übungen</p>
    <p class="muted" style="margin:8px 0 12px">${esc(s.blurb)}</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
      <span class="pill" style="background:var(--surface-2);color:var(--text-2)">🔥 Aufwärmen</span>
      <span class="pill" style="background:var(--surface-2);color:var(--text-2)">💪 ${s.items.length} Übungen</span>
      <span class="pill" style="background:var(--surface-2);color:var(--text-2)">🧘 Abkühlen</span>
    </div>
    <button class="btn btn-green" id="ses-play" style="margin:4px 0 16px;font-size:17px;padding:16px">▶️ Geführt mitmachen</button>
    <div class="section-title" style="margin-top:0">Übungen</div>
    ${items}
    <button class="btn btn-ghost" id="ses-done" style="margin-top:8px">✅ Als erledigt markieren</button>
  </div>`;
  document.getElementById('ses-back').onclick = () => { state.route = 'training'; render(); };
  document.getElementById('ses-play').onclick = () => startPlay(s.id);
  app.querySelectorAll('[data-ex]').forEach(el => el.onclick = () => openExercise(el.dataset.ex));
  document.getElementById('ses-done').onclick = () => {
    state.workoutStore = { progress: state.workoutStore.progress || {}, history: [...(state.workoutStore.history || []), { date: Date.now(), count: s.items.length, session: s.id }] };
    save(STORE.workout, state.workoutStore);
    state.workout = null;
    state.route = 'training'; render();
  };
}

// ===== Mitmach-Workout-Player (geführt, mit Timer & Sprachansage) =====
// Struktur wie ein echtes Training: Aufwärmen → Hauptteil → Abkühlen.
let playTimer = null;
const WARMUP_IDS = ['hip_circles', 'jumping_jacks', 'toe_touches'];
const COOLDOWN_IDS = ['chest_stretch', 'toe_touches'];
function framePhase(ids, phase, dur, label, count) {
  return ids.map(id => L.exerciseById(C, id)).filter(Boolean).slice(0, count)
    .map(ex => ({ kind: 'work', phase, ex, set: 1, sets: 1, isHold: false, reps: null, hold: null, dur, targetText: label }));
}
function buildPlaySteps(s) {
  const steps = framePhase(WARMUP_IDS, 'warmup', 25, '25 Sekunden locker', 2);
  s.items.forEach((it, ii) => {
    const ex = L.exerciseById(C, it.exerciseId);
    const sets = it.sets || 1;
    for (let set = 1; set <= sets; set++) {
      const isHold = !!it.hold;
      const dur = isHold ? it.hold : Math.min(60, Math.max(20, Math.round((it.reps || 10) * 2.5)));
      steps.push({ kind: 'work', phase: 'main', ex, set, sets, isHold, reps: it.reps, hold: it.hold, dur, itemNum: ii + 1 });
      const last = ii === s.items.length - 1 && set === sets;
      if (!last) steps.push({ kind: 'rest', phase: 'main', dur: 20, ex, itemNum: ii + 1 });
    }
  });
  steps.push(...framePhase(COOLDOWN_IDS, 'cooldown', 25, '25 Sekunden ruhig dehnen', 2));
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].kind === 'rest') { const n = steps[i + 1]; steps[i].nextEx = n ? n.ex : null; steps[i].nextSet = n ? n.set : null; if (n && n.itemNum) steps[i].itemNum = n.itemNum; }
  }
  return steps;
}
// Neutrale Ansagen, falls (noch) kein Coach gewählt ist.
const PLAY_LINES_DEFAULT = {
  start: ['Los geht\'s!'],
  work: ['{ex}. {target}. Satz {set} von {sets}. Los!'],
  rest: ['Pause. Als Nächstes: {next}.'],
  half: ['Die Hälfte ist geschafft!'],
  count3: ['Noch drei Sekunden'],
  finish: ['Stark! Workout geschafft.']
};
// Ansage im Charakter des gewählten Coaches (zufällige Variante, Platzhalter füllen).
function coachLine(kind, vars) {
  const av = coachAvatarById(state.coachAvatar);
  const pool = (av && av.lines && av.lines[kind]) || PLAY_LINES_DEFAULT[kind];
  let t = pool[Math.floor(Math.random() * pool.length)] || '';
  for (const k in (vars || {})) t = t.split('{' + k + '}').join(vars[k]);
  return t;
}
const coachTtsVoice = () => { const av = coachAvatarById(state.coachAvatar); return (av && av.voiceTts) || 'Kore'; };
// Geräte-Stimme (Web Speech) – Fallback, wenn die natürliche Stimme nicht verfügbar ist.
function deviceSpeak(text, hooks) {
  if (!ttsOk) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE'; u.rate = 1.05;
    const av = coachAvatarById(state.coachAvatar);
    const v = av ? pickVoice(av.gender)
      : speechSynthesis.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith('de'));
    if (v) u.voice = v;
    if (hooks) { u.onstart = hooks.onstart; u.onend = hooks.onend; u.onerror = hooks.onend; }
    speechSynthesis.speak(u);
  } catch {}
}
// instant=true: keine Wartezeit erlaubt (z. B. Countdown) – natürliche Stimme nur aus dem Cache.
function playSpeak(text, instant) {
  // Sprechblase immer aktualisieren – so "spricht" der Coach auch ohne Ton.
  const line = document.getElementById('coach-line');
  if (line) line.textContent = text;
  if (!state.playVoice) return;
  const hooks = {
    onstart: () => { const p = document.getElementById('play-coach'); if (p) p.classList.add('talking'); },
    onend: () => { const p = document.getElementById('play-coach'); if (p) p.classList.remove('talking'); }
  };
  if (ttsOk) { try { speechSynthesis.cancel(); } catch {} }
  stopNatural();
  const voice = coachTtsVoice();
  if (instant && !ttsCached(text, voice)) {
    ttsFetch(text, voice); // fürs nächste Mal vorwärmen
    deviceSpeak(text, hooks);
    return;
  }
  naturalSpeak(text, voice, hooks).then(ok => { if (!ok) deviceSpeak(text, hooks); });
}
// Alle Ansagen des Workouts im Hintergrund vorab laden (max. 2 parallel).
function prefetchPlayLines() {
  const voice = coachTtsVoice();
  const texts = [];
  state.playSteps.forEach(st => { if (st.line) texts.push(st.line); });
  ['half', 'count3', 'finish'].forEach(kind => {
    const av = coachAvatarById(state.coachAvatar);
    const pool = (av && av.lines && av.lines[kind]) || PLAY_LINES_DEFAULT[kind];
    pool.forEach(t => texts.push(t));
  });
  let i = 0;
  const next = () => { if (i >= texts.length) return; const t = texts[i++]; ttsFetch(t, voice).then(next); };
  next(); next();
}
function startPlay(sessionId) {
  const s = L.sessionById(C, sessionId);
  if (!s || !s.items.length) return;
  if (state.playVoice === undefined) state.playVoice = true;
  ttsUnlock(); // im Klick-Kontext: schaltet Audio-Wiedergabe frei (iOS/Android)
  state.playSession = sessionId;
  state.playSteps = buildPlaySteps(s);
  // Ansagen jetzt festlegen (Zufallsvariante je Schritt) → vorab ladbar
  let firstMain = true, firstCool = true;
  state.playSteps.forEach((st, i) => {
    const intro = i === 0 ? coachLine('start') + ' ' : '';
    if (st.kind === 'rest') {
      st.line = coachLine('rest', { next: st.nextEx ? st.nextEx.name : 'fertig' });
    } else if (st.phase === 'warmup') {
      st.line = intro + `Aufwärmen: ${st.ex.name}, ${st.targetText}.`;
    } else if (st.phase === 'cooldown') {
      st.line = (firstCool ? 'Geschafft! Zum Abschluss locker machen. ' : '') + `${st.ex.name}, ${st.targetText}.`;
      firstCool = false;
    } else {
      const target = st.isHold ? `${st.hold} Sekunden halten` : `${st.reps} Wiederholungen`;
      st.line = intro + (firstMain ? 'Aufwärmen fertig – jetzt geht\'s richtig los! ' : '') +
        coachLine('work', { ex: st.ex.name, target, set: st.set, sets: st.sets });
      firstMain = false;
    }
  });
  prefetchPlayLines();
  state.playIdx = 0;
  state.playRemaining = state.playSteps[0].dur;
  state.playPaused = false;
  state.playDone = false;
  state.route = 'play';
  render();
  announceStep();
}
function stopPlay() {
  if (playTimer) { clearInterval(playTimer); playTimer = null; }
  if (ttsOk) { try { speechSynthesis.cancel(); } catch {} }
  stopNatural();
  if (window.play3dDispose) play3dDispose();     // WebGL-Kontext sauber freigeben
  if (window.figure3dDispose) figure3dDispose();
}
function announceStep() {
  const st = state.playSteps[state.playIdx];
  if (!st) return;
  playSpeak(st.line || '');
}
function playTick() {
  if (state.playPaused || state.playDone) return;
  state.playRemaining--;
  const t = document.getElementById('play-time');
  if (t) t.textContent = Math.max(0, state.playRemaining);
  const st = state.playSteps[state.playIdx];
  // Motivations-Zwischenruf zur Halbzeit längerer Arbeits-Sätze
  if (st && st.kind === 'work' && st.dur >= 24 && state.playRemaining === Math.floor(st.dur / 2)) playSpeak(coachLine('half'), true);
  if (state.playRemaining === 3) playSpeak(coachLine('count3'), true);
  if (state.playRemaining <= 0) advanceStep();
}
function advanceStep() {
  state.playIdx++;
  if (state.playIdx >= state.playSteps.length) {
    state.playDone = true;
    if (playTimer) { clearInterval(playTimer); playTimer = null; }
    const s = L.sessionById(C, state.playSession);
    if (s) {
      state.workoutStore = { progress: state.workoutStore.progress || {}, history: [...(state.workoutStore.history || []), { date: Date.now(), count: s.items.length, session: s.id }] };
      save(STORE.workout, state.workoutStore); state.workout = null;
    }
    const fin = coachLine('finish');
    renderPlay();
    playSpeak(fin);
    return;
  }
  state.playRemaining = state.playSteps[state.playIdx].dur;
  renderPlay();
  announceStep();
}
// Coach-Streifen im Player: animiertes Porträt + Sprechblase (Text der letzten Ansage).
function playCoachStrip() {
  const av = coachAvatarById(state.coachAvatar);
  if (!av) return '';
  return `<div class="play-coach" id="play-coach">
    <span class="coach-face g-${av.grad}">${av.emoji}<img src="icons/coach/${av.id}.png" alt="" onerror="this.remove()"></span>
    <div class="play-coach-line" id="coach-line">${esc(av.name)} begleitet dich…</div>
  </div>`;
}
// ===== 3D-Coach: Übung als animierte Figur vormachen (Fallback: Foto-Demo) =====
function anim3dSpec(ex) {
  const name = ex && window.EX_ANIM_3D ? window.EX_ANIM_3D[ex.id] : null;
  return name ? `models/anim/${name}.fbx` : null; // Mixamo-FBX direkt (keine Konvertierung)
}
function canPlay3d(ex) {
  // 3D ist verfügbar, sobald WebGL/Bewegung ok ist – die prozedurale Coach-Figur
  // braucht keine Assets. Ein gesetztes coach.model nutzt zusätzlich den GLB-Weg.
  return !!(ex && typeof figure3dSupported === 'function' && figure3dSupported());
}
// Die bisherige Foto-Demo (free-exercise-db) – auch der 3D-Fallback.
function exMediaHTML(ex) {
  return (ex && ex.anim)
    ? `<div class="play-media ex-anim"><span class="anim-emoji g-${ex.grad}">${ex.emoji}</span><img class="anim-fr" src="${esc(ex.anim.a)}" alt="" onerror="this.style.display='none'"><img class="anim-fr b" src="${esc(ex.anim.b)}" alt="" onerror="this.style.display='none'"></div>`
    : `<div class="play-media play-emoji g-${ex ? ex.grad : 'sage'}">${ex ? ex.emoji : '🏁'}</div>`;
}
// Renderer einmal mounten, danach nur noch umhängen + Bewegung wechseln (kein Flackern).
// Hat der Coach ein GLB-Modell (Ready-Player-Me), läuft der echte Avatar-Weg (play3d);
// sonst macht die prozedurale Figur (figure3d) die Übung vor – ganz ohne Assets.
function setupPlay3d(ex) {
  const box = document.getElementById('play3d');
  if (!box) return;
  const coach = coachAvatarById(state.coachAvatar);
  const spec = anim3dSpec(ex);
  const useGlb = !!(coach && coach.model && spec && typeof play3dSupported === 'function' && play3dSupported());
  if (useGlb) {
    if (window.play3dActive && play3dActive()) { play3dAttach(box); play3dPlay(spec); return; }
    play3dMount(box, coach.model).then(ok => {
      if (state.route !== 'play') { play3dDispose(); return; }
      if (ok) play3dPlay(spec); else setupFigure(ex, box); // GLB-Fehler → Figur
    });
    return;
  }
  setupFigure(ex, box);
}
function setupFigure(ex, box) {
  if (window.figure3dActive && figure3dActive()) { figure3dAttach(box); figure3dPlay(ex.id); return; }
  const coach = coachAvatarById(state.coachAvatar);
  figure3dMount(box, coach).then(ok => {
    if (state.route !== 'play') { figure3dDispose(); return; } // Player inzwischen verlassen
    if (ok) figure3dPlay(ex.id);
    else if (box.isConnected) box.outerHTML = exMediaHTML(ex);  // kein WebGL → Foto-Demo
  });
}
function renderPlay() {
  if (state.playDone) {
    if (window.play3dDispose) play3dDispose();
    if (window.figure3dDispose) figure3dDispose();
    const s = L.sessionById(C, state.playSession);
    app.innerHTML = `<div class="screen play-screen done">
      <div class="play-done">
        <div class="play-done-emoji">🎉</div>
        <h1 class="page-title">Geschafft!</h1>
        <p class="page-sub">Du hast „${esc(s ? s.name : 'das Workout')}" komplett mitgemacht. Stark!</p>
        ${playCoachStrip()}
        <button class="btn btn-green" id="play-finish" style="margin-top:20px">Fertig</button>
      </div></div>`;
    document.getElementById('play-finish').onclick = () => { stopPlay(); state.route = 'training'; render(); };
    return;
  }
  const st = state.playSteps[state.playIdx];
  const totalItems = (L.sessionById(C, state.playSession) || { items: [] }).items.length;
  const overallPct = Math.round((state.playIdx) / state.playSteps.length * 100);
  const isRest = st.kind === 'rest';
  const ex = isRest ? st.nextEx : st.ex;
  const use3d = canPlay3d(ex);
  const media = use3d
    ? `<div class="play-media" id="play3d"></div>`
    : exMediaHTML(ex);
  const target = isRest ? '' : (st.targetText || (st.isHold ? `${st.hold} Sekunden halten` : `${st.reps} Wiederholungen`));
  const phaseLabel = st.phase === 'warmup' ? '🔥 Aufwärmen' : st.phase === 'cooldown' ? '🧘 Abkühlen' : null;
  app.innerHTML = `<div class="screen play-screen ${isRest ? 'rest' : 'work'}">
    <div class="play-top">
      <button class="play-x" id="play-quit" aria-label="Beenden">✕</button>
      <div class="play-progress-text">${st.itemNum ? `Übung ${st.itemNum}/${totalItems}` : (st.phase === 'warmup' ? 'Aufwärmen' : 'Abkühlen')}</div>
      <button class="play-x" id="play-sound" aria-label="Ton">${state.playVoice ? '🔊' : '🔇'}</button>
    </div>
    <div class="play-bar"><span style="width:${overallPct}%"></span></div>
    <div class="play-label">${isRest ? '⏸️ Pause' : (phaseLabel || `Satz ${st.set}/${st.sets}`)}</div>
    ${media}
    <h1 class="play-name">${isRest ? 'Als Nächstes' : esc(ex.name)}</h1>
    <p class="play-target">${isRest ? (st.nextEx ? esc(st.nextEx.name) : 'Gleich fertig') : target}</p>
    ${playCoachStrip()}
    <div class="play-timer"><span id="play-time">${Math.max(0, state.playRemaining)}</span><small>Sek.</small></div>
    <div class="play-controls">
      <button class="btn btn-ghost" id="play-pause">${state.playPaused ? '▶️ Weiter' : '⏸️ Pause'}</button>
      <button class="btn btn-ghost" id="play-skip">⏭️ Überspringen</button>
    </div>
  </div>`;
  if (!playTimer && !state.playDone) playTimer = setInterval(playTick, 1000);
  document.getElementById('play-quit').onclick = () => { stopPlay(); state.route = 'session'; render(); };
  document.getElementById('play-sound').onclick = () => { state.playVoice = !state.playVoice; if (!state.playVoice) { if (ttsOk) speechSynthesis.cancel(); stopNatural(); } renderPlay(); };
  document.getElementById('play-pause').onclick = () => { state.playPaused = !state.playPaused; if (state.playPaused) { if (ttsOk) speechSynthesis.cancel(); stopNatural(); } renderPlay(); };
  document.getElementById('play-skip').onclick = () => { if (ttsOk) speechSynthesis.cancel(); stopNatural(); advanceStep(); };
  if (use3d) setupPlay3d(ex);
}

// ===== Wissen: Vitamine & Nährstoffe =====

function sessionCard(s) {
  return `<button class="meal-card" data-session="${s.id}">
    <div class="meal-thumb g-${s.grad}">${s.emoji}</div>
    <div class="meal-body"><div class="meal-slot">${s.minutes} Min</div><div class="meal-name">${esc(s.name)}</div><div class="meal-kcal">${s.items.length} Übungen · ${esc(LEVEL_LABEL[s.level] || '')}</div></div>
  </button>`;
}
function sessionRow(s) {
  return `<button class="row-card" data-session="${s.id}">
    <div class="row-thumb g-${s.grad}">${s.emoji}</div>
    <div class="row-main"><div class="row-title">${esc(s.name)}</div><div class="row-sub">⏱️ ${s.minutes} Min · ${s.items.length} Übungen · ${esc(LEVEL_LABEL[s.level] || '')}</div></div>
    <div class="row-chev">›</div></button>`;
}

function renderTraining() {
  const p = state.profile;
  const wo = ensureWorkout();
  const done = doneToday();
  const total = (state.workoutStore.history || []).length;
  const rec = L.recommendedSessions(C, p.goal);
  const chips = [['low', '😴 Müde'], ['normal', '🙂 Normal'], ['high', '💪 Fit']];
  const items = wo.items.map(it => {
    const target = it.type === 'hold' ? `${it.sets} × ${it.hold} Sek` : `${it.sets} × ${it.reps}`;
    return `<button class="row-card" data-ex="${it.exerciseId}">
      <div class="row-thumb g-${it.grad}">${it.emoji}</div>
      <div class="row-main"><div class="row-title">${esc(it.name)}</div>
        <div class="row-sub">${target} · ${GROUP_LABEL[it.group] || ''}</div></div>
      <div class="row-chev">›</div></button>`;
  }).join('');
  const av = coachAvatarById(state.coachAvatar);
  const coachBanner = av && av.train ? `<div class="coach-hello" style="margin-bottom:16px">
      <span class="coach-face g-${av.grad}">${av.emoji}<img src="icons/coach/${av.id}.png" alt="" onerror="this.remove()"></span>
      <span class="ch-main"><b>${esc(av.name)} stellt dir dein Workout zusammen</b>
        <span class="muted">Stil: ${esc(av.train.style)} · ${esc(av.name)} macht mit und sagt dir alles an.</span></span>
    </div>` : '';
  return `
    <div class="page-head"><h1 class="page-title">Training</h1>
      <p class="page-sub">${esc(labelFor('fitnessLevel', p.fitnessLevel))} · ${total} Workouts geschafft</p></div>
    ${coachBanner}
    <div class="section-title" style="margin-top:0">Wie fühlst du dich?</div>
    <div class="chips">${chips.map(([v, l]) => `<button class="chip ${state.energy === v ? 'sel' : ''}" data-energy="${v}">${l}</button>`).join('')}</div>
    <div class="section-title">Dein Workout heute</div>
    ${items}
    ${done
      ? '<div class="row-card" style="justify-content:center;color:var(--green);font-weight:700">✅ Heute geschafft — stark!</div>'
      : '<button class="btn btn-green" id="wo-done" style="margin-top:8px">✅ Workout abschließen</button>'}
    <button class="btn btn-ghost" id="wo-regen" style="margin-top:10px">🔄 Anderes Workout</button>
    <button class="btn btn-ghost" data-go="fortschritt" style="margin-top:10px">📈 Mein Fortschritt</button>

    <div class="health-banner" style="background:linear-gradient(135deg,#A78BFA,#7C5CFC);margin-top:24px">
      <span class="hb-ic">🎯</span>
      <span><span class="hb-label">Passt zu deinem Ziel</span><span class="hb-text">${esc(GOAL_MATCH[p.goal] || GOAL_MATCH.health)}</span></span>
    </div>

    <div class="section-title">Sessions für dich</div>
    <div class="h-scroll">${rec.fit.map(sessionCard).join('') || rec.ordered.slice(0, 4).map(sessionCard).join('')}</div>

    <div class="section-title">Alle Sessions</div>
    ${rec.rest.map(sessionRow).join('')}`;
}

function renderExercise() {
  const ex = L.exerciseById(C, state.exerciseId);
  const wo = ensureWorkout();
  const it = wo.items.find(x => x.exerciseId === ex.id);
  const t = it || L.exerciseTarget(state.workoutStore, ex);
  const target = ex.type === 'hold'
    ? `${t.sets} Sätze × ${t.hold} Sekunden halten`
    : `${t.sets} Sätze × ${t.reps} Wiederholungen`;
  const next = ex.nextVariantId ? L.exerciseById(C, ex.nextVariantId) : null;
  const media = ex.anim
    ? `<div class="recipe-hero ex-anim"><span class="anim-emoji g-${ex.grad}">${ex.emoji}</span><img class="anim-fr" src="${esc(ex.anim.a)}" alt="${esc(ex.name)}" onerror="this.style.display='none'"><img class="anim-fr b" src="${esc(ex.anim.b)}" alt="" onerror="this.style.display='none'"></div>`
    : `<div class="recipe-hero g-${ex.grad}">${ex.emoji}</div>`;
  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' richtig ausführen')}`;
  const av = coachAvatarById(state.coachAvatar);
  const coachCard = av ? `<div class="card"><div class="coach-bar" style="margin:0">
      ${coachFace(av, 'coach-face')}
      <div class="coach-meta"><div class="coach-name">${esc(av.name)} erklärt dir die Übung</div><div class="coach-tag">Tippe auf „Vormachen" – ich sag dir, worauf es ankommt.</div></div>
    </div>
    <button class="btn btn-green" id="ex-coach-demo" style="margin-top:12px">▶️ ${esc(av.name)} macht's vor</button></div>` : '';
  app.innerHTML = `<div class="screen">
    <div class="page-head"><button class="btn btn-ghost" id="ex-back" style="width:auto;padding:8px 14px">← Zurück</button></div>
    ${media}
    <h1 class="page-title">${esc(ex.name)}</h1>
    <p class="page-sub">${GROUP_LABEL[ex.group] || ''} · ${ex.equipment === 'none' ? 'ohne Geräte' : 'wenig Equipment'}${ex.anim ? ' · 📷 Demo' : ''}</p>
    <div class="card" style="margin-top:12px"><div class="card-title">🎯 Heute</div><p class="muted">${target}</p></div>
    <div class="card"><div class="card-title">📋 So geht's</div><p class="muted">${esc(ex.technique)}</p></div>
    ${coachCard}
    ${next ? `<p class="muted" style="text-align:center">Wird's zu leicht? Nächste Stufe: <b>${esc(next.name)}</b></p>` : ''}
    <a class="btn btn-ghost" href="${ytUrl}" target="_blank" rel="noopener" style="margin-top:8px">▶️ Video-Tutorial auf YouTube</a>
  </div>`;
  document.getElementById('ex-back').onclick = () => { if (ttsOk) { try { speechSynthesis.cancel(); } catch {} } stopNatural(); state.route = 'training'; render(); };
  const demo = document.getElementById('ex-coach-demo');
  if (demo) demo.onclick = () => {
    ttsUnlock();
    const intro = coachLine('start');
    const text = `${intro} ${ex.name}: ${ex.technique} ${target}.`;
    coachSpeakEx(text);
  };
}
// Coach erklärt eine Übung mit Stimme + pulsierendem Porträt (eigene Stelle außerhalb des Players).
function coachSpeakEx(text) {
  const face = () => document.querySelector('#ex-coach-demo')?.closest('.card')?.querySelector('.coach-face');
  const hooks = {
    onstart: () => { const f = face(); if (f) f.classList.add('face-talking'); },
    onend: () => { const f = face(); if (f) f.classList.remove('face-talking'); }
  };
  if (ttsOk) { try { speechSynthesis.cancel(); } catch {} }
  stopNatural();
  const av = coachAvatarById(state.coachAvatar);
  naturalSpeak(text, (av && av.voiceTts) || 'Kore', hooks).then(ok => {
    if (ok || !ttsOk) return;
    try {
      const u = new SpeechSynthesisUtterance(text); u.lang = 'de-DE'; u.rate = 1.0;
      const v = pickVoice(av ? av.gender : 'm'); if (v) u.voice = v;
      u.onstart = hooks.onstart; u.onend = hooks.onend; u.onerror = hooks.onend;
      speechSynthesis.speak(u);
    } catch {}
  });
}

// ===== Linkes Menü (Drawer) =====
const topbar = () => `<div class="topbar"><button class="menu-btn" id="menu-btn" aria-label="Menü öffnen">☰</button></div>`;
