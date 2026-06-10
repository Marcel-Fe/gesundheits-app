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
    <p class="muted" style="margin:8px 0 16px">${esc(s.blurb)}</p>
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
let playTimer = null;
function buildPlaySteps(s) {
  const steps = [];
  s.items.forEach((it, ii) => {
    const ex = L.exerciseById(C, it.exerciseId);
    const sets = it.sets || 1;
    for (let set = 1; set <= sets; set++) {
      const isHold = !!it.hold;
      const dur = isHold ? it.hold : Math.min(60, Math.max(20, Math.round((it.reps || 10) * 2.5)));
      steps.push({ kind: 'work', ex, set, sets, isHold, reps: it.reps, hold: it.hold, dur, itemNum: ii + 1 });
      const last = ii === s.items.length - 1 && set === sets;
      if (!last) steps.push({ kind: 'rest', dur: 20, ex, itemNum: ii + 1 });
    }
  });
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].kind === 'rest') { const n = steps[i + 1]; steps[i].nextEx = n ? n.ex : null; steps[i].nextSet = n ? n.set : null; if (n) steps[i].itemNum = n.itemNum; }
  }
  return steps;
}
function playSpeak(text) {
  if (!state.playVoice || !ttsOk) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE'; u.rate = 1.0;
    const v = speechSynthesis.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith('de'));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch {}
}
function startPlay(sessionId) {
  const s = L.sessionById(C, sessionId);
  if (!s || !s.items.length) return;
  if (state.playVoice === undefined) state.playVoice = true;
  state.playSession = sessionId;
  state.playSteps = buildPlaySteps(s);
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
}
function announceStep() {
  const st = state.playSteps[state.playIdx];
  if (!st) return;
  if (st.kind === 'work') {
    const target = st.isHold ? `${st.hold} Sekunden halten` : `${st.reps} Wiederholungen`;
    playSpeak(`${st.ex.name}. ${target}. Satz ${st.set} von ${st.sets}. Los!`);
  } else {
    playSpeak(`Pause. Als Nächstes: ${st.nextEx ? st.nextEx.name : 'fertig'}.`);
  }
}
function playTick() {
  if (state.playPaused || state.playDone) return;
  state.playRemaining--;
  const t = document.getElementById('play-time');
  if (t) t.textContent = Math.max(0, state.playRemaining);
  if (state.playRemaining === 3) playSpeak('Noch drei Sekunden');
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
    playSpeak('Stark! Workout geschafft.');
    renderPlay();
    return;
  }
  state.playRemaining = state.playSteps[state.playIdx].dur;
  renderPlay();
  announceStep();
}
function renderPlay() {
  if (state.playDone) {
    const s = L.sessionById(C, state.playSession);
    app.innerHTML = `<div class="screen play-screen done">
      <div class="play-done">
        <div class="play-done-emoji">🎉</div>
        <h1 class="page-title">Geschafft!</h1>
        <p class="page-sub">Du hast „${esc(s ? s.name : 'das Workout')}" komplett mitgemacht. Stark!</p>
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
  const media = (ex && ex.anim)
    ? `<div class="play-media ex-anim"><span class="anim-emoji g-${ex.grad}">${ex.emoji}</span><img class="anim-fr" src="${esc(ex.anim.a)}" alt="" onerror="this.style.display='none'"><img class="anim-fr b" src="${esc(ex.anim.b)}" alt="" onerror="this.style.display='none'"></div>`
    : `<div class="play-media play-emoji g-${ex ? ex.grad : 'sage'}">${ex ? ex.emoji : '🏁'}</div>`;
  const target = isRest ? '' : (st.isHold ? `${st.hold} Sekunden halten` : `${st.reps} Wiederholungen`);
  app.innerHTML = `<div class="screen play-screen ${isRest ? 'rest' : 'work'}">
    <div class="play-top">
      <button class="play-x" id="play-quit" aria-label="Beenden">✕</button>
      <div class="play-progress-text">Übung ${st.itemNum}/${totalItems}</div>
      <button class="play-x" id="play-sound" aria-label="Ton">${state.playVoice ? '🔊' : '🔇'}</button>
    </div>
    <div class="play-bar"><span style="width:${overallPct}%"></span></div>
    <div class="play-label">${isRest ? '⏸️ Pause' : `Satz ${st.set}/${st.sets}`}</div>
    ${media}
    <h1 class="play-name">${isRest ? 'Als Nächstes' : esc(ex.name)}</h1>
    <p class="play-target">${isRest ? (st.nextEx ? esc(st.nextEx.name) : 'Gleich fertig') : target}</p>
    <div class="play-timer"><span id="play-time">${Math.max(0, state.playRemaining)}</span><small>Sek.</small></div>
    <div class="play-controls">
      <button class="btn btn-ghost" id="play-pause">${state.playPaused ? '▶️ Weiter' : '⏸️ Pause'}</button>
      <button class="btn btn-ghost" id="play-skip">⏭️ Überspringen</button>
    </div>
  </div>`;
  if (!playTimer && !state.playDone) playTimer = setInterval(playTick, 1000);
  document.getElementById('play-quit').onclick = () => { stopPlay(); state.route = 'session'; render(); };
  document.getElementById('play-sound').onclick = () => { state.playVoice = !state.playVoice; if (!state.playVoice && ttsOk) speechSynthesis.cancel(); renderPlay(); };
  document.getElementById('play-pause').onclick = () => { state.playPaused = !state.playPaused; if (state.playPaused && ttsOk) speechSynthesis.cancel(); renderPlay(); };
  document.getElementById('play-skip').onclick = () => { if (ttsOk) speechSynthesis.cancel(); advanceStep(); };
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
  return `
    <div class="page-head"><h1 class="page-title">Training</h1>
      <p class="page-sub">${esc(labelFor('fitnessLevel', p.fitnessLevel))} · ${total} Workouts geschafft</p></div>
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
  app.innerHTML = `<div class="screen">
    <div class="page-head"><button class="btn btn-ghost" id="ex-back" style="width:auto;padding:8px 14px">← Zurück</button></div>
    ${media}
    <h1 class="page-title">${esc(ex.name)}</h1>
    <p class="page-sub">${GROUP_LABEL[ex.group] || ''} · ${ex.equipment === 'none' ? 'ohne Geräte' : 'wenig Equipment'}${ex.anim ? ' · 📷 Demo' : ''}</p>
    <div class="card" style="margin-top:12px"><div class="card-title">🎯 Heute</div><p class="muted">${target}</p></div>
    <div class="card"><div class="card-title">📋 So geht's</div><p class="muted">${esc(ex.technique)}</p></div>
    ${next ? `<p class="muted" style="text-align:center">Wird's zu leicht? Nächste Stufe: <b>${esc(next.name)}</b></p>` : ''}
    <a class="btn btn-ghost" href="${ytUrl}" target="_blank" rel="noopener" style="margin-top:8px">▶️ Video-Tutorial auf YouTube</a>
  </div>`;
  document.getElementById('ex-back').onclick = () => { state.route = 'training'; render(); };
}

// ===== Linkes Menü (Drawer) =====
const topbar = () => `<div class="topbar"><button class="menu-btn" id="menu-btn" aria-label="Menü öffnen">☰</button></div>`;
