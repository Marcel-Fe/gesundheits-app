/* Gesundheits-App — Onboarding, Dashboard & Profil
   © 2026 Marcel Fehse. Alle Rechte vorbehalten. */
'use strict';

function renderOnboarding() {
  const steps = D.onboarding, step = steps[state.onbStep];
  const pct = Math.round((state.onbStep / steps.length) * 100);
  const sel = state.onbDraft[step.key];
  app.innerHTML = `
    <div class="screen ob-wrap">
      <div class="ob-progress"><span style="width:${pct}%"></span></div>
      <div class="ob-step">Schritt ${state.onbStep + 1} von ${steps.length}</div>
      <h1 class="ob-question">${esc(step.question)}</h1>
      <div class="ob-options">
        ${step.options.map(o => `
          <button class="ob-option ${String(sel) === String(o.value) ? 'sel' : ''}" data-val="${esc(o.value)}">
            <span class="emoji">${o.emoji}</span>
            <span><span>${esc(o.label)}</span><span class="ob-desc">${esc(o.desc)}</span></span>
          </button>`).join('')}
      </div>
      <div class="ob-nav">
        ${state.onbStep > 0 ? '<button class="btn btn-ghost" id="ob-back">Zurück</button>' : ''}
        <button class="btn" id="ob-next" ${sel === undefined ? 'disabled' : ''}>${state.onbStep === steps.length - 1 ? 'Plan erstellen' : 'Weiter'}</button>
      </div>
    </div>`;
  app.querySelectorAll('.ob-option').forEach(btn => btn.onclick = () => {
    const raw = btn.dataset.val, num = Number(raw);
    state.onbDraft[step.key] = (raw !== '' && !isNaN(num)) ? num : raw;
    renderOnboarding();
  });
  const back = document.getElementById('ob-back');
  if (back) back.onclick = () => { state.onbStep--; renderOnboarding(); };
  document.getElementById('ob-next').onclick = () => {
    if (state.onbDraft[step.key] === undefined) return;
    if (state.onbStep < steps.length - 1) { state.onbStep++; renderOnboarding(); }
    else finishOnboarding();
  };
}

function finishOnboarding() {
  state.profile = { ...state.onbDraft, createdAt: Date.now() };
  state.plan = L.generateWeek(C, state.profile);
  save(STORE.profile, state.profile);
  save(STORE.plan, state.plan);
  state.route = 'dashboard';
  render();
}

function labelFor(key, value) {
  const step = D.onboarding.find(s => s.key === key);
  const opt = step && step.options.find(o => String(o.value) === String(value));
  return opt ? opt.label : value;
}

// ===== Dashboard =====
function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Guten Morgen';
  if (h < 18) return 'Guten Tag';
  return 'Guten Abend';
}

function ensureWorkout() {
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const av = coachAvatarById(state.coachAvatar);
  const coachId = av ? av.id : '';
  if (!state.workout || state.workout.date !== todayMs || state.workout.energy !== state.energy || state.workout._v !== state.woVariation || state.workout._coach !== coachId) {
    state.workout = L.generateWorkout(C, state.profile, state.energy, state.workoutStore, state.woVariation, av && av.train);
    state.workout._v = state.woVariation;
    state.workout._coach = coachId;
  }
  return state.workout;
}
const doneToday = () => (state.workoutStore.history || []).some(h => new Date(h.date).setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0));
const tipOfDay = () => HEALTH_TIPS[Math.floor((Date.now() / 86400000)) % HEALTH_TIPS.length];
const quoteOfHour = () => D.quotes[new Date().getHours() % D.quotes.length];

// ===== Wetter (Open-Meteo, kostenlos, kein Key) =====
function weatherCategory(code) {
  if (code === 0) return 'clear';
  if (code <= 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'cloud';
}
function weatherText(code, temp) {
  const cat = weatherCategory(code);
  const w = D.weatherCodes[cat] || D.weatherCodes.cloud;
  const outdoor = (cat === 'clear' || cat === 'cloud') && temp >= 8;
  const tip = outdoor ? 'Perfekt für Bewegung an der frischen Luft 🚶' : 'Ideal für ein Home-Workout drinnen 💪';
  return `${w.emoji} ${temp}° · ${tip}`;
}
const weatherFallback = () => 'Egal ob drinnen oder draußen – jede Bewegung tut dir heute gut. 💪';

function loadWeather() {
  const el = document.getElementById('greet-weather');
  if (!el) return;
  try { const c = JSON.parse(localStorage.getItem('gapp.weather') || 'null'); if (c && Date.now() - c.ts < 3600000) { el.textContent = c.text; return; } } catch {}
  if (!navigator.geolocation) { el.textContent = weatherFallback(); return; }
  navigator.geolocation.getCurrentPosition(async pos => {
    try {
      const { latitude, longitude } = pos.coords;
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(2)}&longitude=${longitude.toFixed(2)}&current=temperature_2m,weather_code`);
      const j = await r.json();
      const text = weatherText(j.current.weather_code, Math.round(j.current.temperature_2m));
      el.textContent = text;
      localStorage.setItem('gapp.weather', JSON.stringify({ ts: Date.now(), text }));
    } catch { el.textContent = weatherFallback(); }
  }, () => { el.textContent = weatherFallback(); }, { timeout: 8000, maximumAge: 1800000 });
}

// Coach-Begrüßung auf der Startseite: fragt nach dem Befinden,
// die Antwort startet einen persönlichen Dialog im Coach-Chat.
function coachHello() {
  const av = coachAvatarById(state.coachAvatar);
  if (!av) {
    return `<button class="coach-hello" data-go="ki">
      <span class="coach-face g-sage">🤖</span>
      <span class="ch-main"><b>Wähle deinen persönlichen Coach</b>
        <span class="muted">6 Coaches mit eigenem Stil – für Training, Ernährung & Motivation.</span></span>
      <span class="row-chev">›</span>
    </button>`;
  }
  const face = `<span class="coach-face g-${av.grad}">${av.emoji}<img src="icons/coach/${av.id}.png" alt="" onerror="this.remove()"></span>`;
  const mood = state.mood[todayKey()];
  if (mood) {
    const lbl = { super: 'voller Energie 💪', okay: 'ganz okay 🙂', tired: 'eher müde 😴' }[mood] || mood;
    return `<div class="coach-hello">
      ${face}
      <span class="ch-main"><b>${esc(av.name)}</b>
        <span class="muted">Du fühlst dich heute ${lbl} – dein Workout ist darauf abgestimmt.</span>
        <button class="btn btn-ghost ch-talk" id="coach-talk">💬 Mit ${esc(av.name)} sprechen</button></span>
    </div>`;
  }
  return `<div class="coach-hello">
    ${face}
    <span class="ch-main"><b>${esc(av.name)} fragt:</b>
      <span>Wie geht's dir heute? Wie kann ich dir helfen?</span>
      <span class="ch-moods">
        <button class="chip" data-mood="super">😄 Super</button>
        <button class="chip" data-mood="okay">🙂 Okay</button>
        <button class="chip" data-mood="tired">😴 Müde</button>
      </span>
      <button class="link-btn" id="coach-talk" style="text-align:left">… oder direkt mit ${esc(av.name)} sprechen 💬</button></span>
  </div>`;
}

function renderDashboard() {
  const p = state.profile;
  const idx = L.todayIndex(state.plan);
  const day = state.plan.days[idx];
  const meals = day.meals.map(m => ({ m, r: recipeById(m.recipeId), n: L.recipeNutrients(C, recipeById(m.recipeId)).perServing }));
  const calEaten = todayIntake().reduce((s, it) => s + (it.kcal || 0), 0);
  const calGoal = state.calGoal;
  const calPct = calGoal ? Math.min(100, Math.round(calEaten / calGoal * 100)) : (calEaten ? 100 : 0);
  const calOver = calGoal && calEaten > calGoal;
  const tip = tipOfDay();
  const wo = ensureWorkout();
  const woDone = doneToday();
  const streak = currentStreak();
  let i = 0; const di = () => `style="--i:${i++}"`;
  return `<div class="stagger">
    <div class="greet" ${di()}>
      <h1 class="greet-hi">${greeting()}! 👋</h1>
      <p class="greet-weather" id="greet-weather">📍 Wetter & Bewegungstipp laden…</p>
      <p class="greet-quote">„${esc(quoteOfHour())}"</p>
    </div>

    <div ${di()}>${coachHello()}</div>

    <div class="stats" ${di()}>
      <button class="stat" data-go="fortschritt"><div class="stat-ic">🔥</div><div class="stat-val">${streak}</div><div class="stat-lbl">${streak === 1 ? 'Tag' : 'Tage'}-Serie</div></button>
      <button class="stat" data-go="tracker"><div class="stat-ic">🍽️</div><div class="stat-val">${calGoal ? Math.max(0, calGoal - calEaten) : calEaten}</div><div class="stat-lbl">${calGoal ? 'kcal übrig' : 'kcal heute'}</div></button>
      <button class="stat" data-go="training"><div class="stat-ic">${woDone ? '✅' : '💪'}</div><div class="stat-val">${wo.items.length}</div><div class="stat-lbl">${woDone ? 'erledigt' : 'Übungen'}</div></button>
    </div>

    <button class="cal-card" data-go="tracker" ${di()}>
      <div class="cal-card-head">
        <span class="cal-card-title">🔥 Kalorien heute</span>
        <span class="cal-card-num">${calEaten}${calGoal ? ` <span class="cal-card-goal">/ ${calGoal}</span>` : ''} kcal</span>
      </div>
      <div class="sat-bar"><span style="width:${calPct}%;background:${calOver ? '#E2725B' : ''}"></span></div>
      <div class="cal-card-sub">${calGoal ? (calOver ? `${calEaten - calGoal} kcal über dem Ziel` : `Noch ${calGoal - calEaten} kcal übrig`) : 'Tippen, um Essen einzutragen & Ziel zu setzen'} ›</div>
    </button>

    <button class="health-banner" id="health-banner" ${di()}>
      <span class="hb-ic">${tip.ic}</span>
      <span><span class="hb-label">Gesundheits-Wissen</span><span class="hb-text">${esc(tip.t)}</span></span>
    </button>

    <div ${di()}>
      <div class="section-title">Heute essen</div>
      <div class="h-scroll">
        ${meals.map(x => `
          <button class="meal-card" data-recipe="${x.r.id}">
            ${thumb('meal-thumb', x.r.grad, x.r.emoji, x.r.id, SLOT[x.m.slot])}
            <div class="meal-body">
              <div class="meal-name">${esc(x.r.name)}</div>
              <div class="meal-kcal">${Math.round(x.n.kcal)} kcal · ${Math.round(x.n.protein)} g Eiweiß</div>
            </div>
          </button>`).join('')}
      </div>
    </div>

    <div ${di()}>
      <div class="section-title">Schnellzugriff</div>
      <div class="quick">
        <button class="quick-btn" data-go="ernaehrung"><span class="quick-ic">🗓️</span>Wochenplan</button>
        <button class="quick-btn" data-go="einkauf"><span class="quick-ic">🛒</span>Einkauf</button>
        <button class="quick-btn" data-go="ki"><span class="quick-ic">🤖</span>Coach</button>
      </div>
    </div>

    <button class="row-card" data-go="training" ${di()} style="margin-top:16px;align-items:flex-start">
      <div class="row-thumb g-terracotta">💪</div>
      <div class="row-main">
        <div class="row-title">Heutiges Workout ${woDone ? '✅' : ''}</div>
        <div class="row-sub">${wo.items.length} Übungen · ${esc(labelFor('timePerDay', p.timePerDay))} · ${woDone ? 'heute geschafft' : 'jetzt starten'}</div>
      </div>
      <div class="row-chev">›</div>
    </button>
  </div>`;
}

// ===== Ernährung: Wochenplan =====

function renderProfil() {
  const p = state.profile;
  const blocks = D.onboarding.map(step => `
    <div class="card">
      <div class="card-title">${esc(step.question)}</div>
      <div class="pchips">
        ${step.options.map(o => `<button class="chip ${String(p[step.key]) === String(o.value) ? 'sel' : ''}" data-pkey="${step.key}" data-pval="${esc(o.value)}">${o.emoji} ${esc(o.label)}</button>`).join('')}
      </div>
    </div>`).join('');
  app.innerHTML = `<div class="screen">
    <div class="page-head">
      <button class="btn btn-ghost" id="profil-back" style="width:auto;padding:8px 14px">← Zurück</button>
      <h1 class="page-title" style="margin-top:12px">Mein Profil</h1>
      <p class="page-sub">Jederzeit anpassbar – dein Plan passt sich automatisch an</p></div>
    ${blocks}
    <p class="muted" style="text-align:center;margin-top:8px">Änderungen werden sofort gespeichert.</p>`;
  document.getElementById('profil-back').onclick = () => { state.route = 'dashboard'; render(); openDrawer(); };
  app.querySelectorAll('[data-pkey]').forEach(el => el.onclick = () => {
    const key = el.dataset.pkey, raw = el.dataset.pval, num = Number(raw);
    state.profile[key] = (raw !== '' && !isNaN(num)) ? num : raw;
    save(STORE.profile, state.profile);
    state.plan = L.generateWeek(C, state.profile); save(STORE.plan, state.plan);
    state.workout = null;
    renderProfil();
  });
}

// ===== Einkaufsliste =====
// Offene (nicht abgehakte) Artikel als Klartext – zum Teilen/Kopieren.
