/* Gesundheits-App — App-Logik (Phase 1)
   © 2026 Marcel Fehse. Alle Rechte vorbehalten.

   Eine Zustandsmaschine (state) + render(). Inhalte: window.GCONTENT,
   Berechnungen: window.GLOGIC. Nutzerdaten in localStorage (offline-first). */

(function () {
  'use strict';

  const D = window.GDATA;
  const C = window.GCONTENT;
  const L = window.GLOGIC;
  const K = window.GKNOW;
  const STORE = { profile: 'gapp.profile', chat: 'gapp.chat', plan: 'gapp.plan', shop: 'gapp.shop', workout: 'gapp.workout', intake: 'gapp.intake', calGoal: 'gapp.calgoal', weight: 'gapp.weight', water: 'gapp.water' };
  const WATER_GOAL = 8; // Gläser à 250 ml = 2 L Tagesziel

  const load = (key, fb) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; } };
  const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.warn('save fehlgeschlagen', e); } };
  const dayKeyOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayKey = () => dayKeyOf(new Date());
  const todayIntake = () => state.intake[todayKey()] || [];
  let toastTimer = null;
  function toast(msg) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }
  function addFoodToShop(foodId) {
    const f = L.foodById(C, foodId); if (!f) return;
    if (!state.shop.extras) state.shop.extras = [];
    state.shop.extras.push({ name: f.name });
    save(STORE.shop, state.shop);
    toast(`✓ „${f.name}" zur Einkaufsliste`);
  }
  const MEAL_CATS = [
    { id: 'breakfast', label: 'Frühstück', emoji: '🌅' },
    { id: 'lunch', label: 'Mittagessen', emoji: '☀️' },
    { id: 'dinner', label: 'Abendessen', emoji: '🌙' },
    { id: 'snack', label: 'Snacks', emoji: '🍎' }
  ];
  const mealCatByTime = () => { const h = new Date().getHours(); return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 21 ? 'dinner' : 'snack'; };
  function addIntake(name, kcal, cat, macros) {
    const k = todayKey();
    if (!state.intake[k]) state.intake[k] = [];
    const m = macros || {};
    state.intake[k].push({ name, kcal: Math.round(kcal), c: Math.round(m.c || 0), p: Math.round(m.p || 0), f: Math.round(m.f || 0), cat: cat || mealCatByTime(), ts: Date.now() });
    save(STORE.intake, state.intake);
    toast(`✓ ${Math.round(kcal)} kcal zu heute`);
  }

  const state = {
    route: 'dashboard',
    profile: load(STORE.profile, null),
    plan: load(STORE.plan, null),
    shop: load(STORE.shop, { sources: [], checked: {} }),
    chat: load(STORE.chat, []),
    chatBusy: false,
    onbStep: 0, onbDraft: {},
    recipeId: null, recipeBack: 'ernaehrung', portions: 2,
    workoutStore: load(STORE.workout, { progress: {}, history: [] }),
    workout: null, energy: 'normal', exerciseId: null, woVariation: 0,
    vitaminId: null, sessionId: null, foodId: null,
    intake: load(STORE.intake, {}), calGoal: load(STORE.calGoal, null), foodQuery: '',
    voiceOut: load('gapp.voice', false), listening: false,
    coachAvatar: load('gapp.coachAvatar', null), coachConsent: load('gapp.coachConsent', false),
    weight: load(STORE.weight, []), water: load(STORE.water, {})
  };
  const coachAvatarById = id => (D.coachAvatars || []).find(a => a.id === id) || null;
  let recog = null;
  let scanStream = null, scanReader = null, scanLoop = null, scanControls = null, scanTimeout = null;
  if (!state.shop.extras) state.shop.extras = [];

  const GOAL_MATCH = {
    lose: 'Zum Abnehmen zählt vor allem Bewegung: viel Cardio/HIIT für den Kalorienverbrauch, dazu etwas Kraft, um Muskeln zu erhalten.',
    muscle: 'Für Muskelaufbau sind Kraftübungen mit Steigerung wichtig (3–4 Sätze), dazu genug Eiweiß und Erholung.',
    health: 'Für die Gesundheit ist ein Mix ideal: Kraft, Cardio und Beweglichkeit – lieber regelmäßig und moderat als selten und hart.',
    family: 'Für die Familie eignen sich kurze, einfache Einheiten, die Spaß machen und bei denen alle mitmachen können.'
  };

  const HEALTH_TIPS = [
    { ic: '🩸', t: 'Eisen + Vitamin C kombinieren: Linsen mit Paprika oder einem Spritzer Zitrone verbessern die Eisenaufnahme deutlich.' },
    { ic: '☕', t: 'Kaffee & schwarzer Tee hemmen die Eisenaufnahme — am besten erst ~1 Stunde nach dem Essen trinken.' },
    { ic: '🫘', t: 'Hülsenfrüchte sind günstig, sättigen lange und liefern viel pflanzliches Eiweiß.' },
    { ic: '🥦', t: 'Faustregel der DGE: 5 Portionen Gemüse & Obst am Tag — bunt gemischt.' },
    { ic: '🌾', t: 'Vollkorn statt Weißmehl: mehr Ballaststoffe, längere Sättigung, stabilerer Blutzucker.' },
    { ic: '💧', t: 'Genug trinken: rund 1,5 Liter Wasser am Tag, bei Sport entsprechend mehr.' },
    { ic: '☀️', t: 'Vitamin D ist im Winter oft knapp. Sonnenlicht hilft; ein Supplement nur faktenbasiert und in Maßen.' }
  ];
  const GROUP_LABEL = { push: 'Oberkörper', legs: 'Beine', core: 'Rumpf', cardio: 'Cardio', back: 'Rücken' };
  const LEVEL_LABEL = { beginner: 'Anfänger', intermediate: 'Geübt', advanced: 'Fortgeschritten' };

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mdLite = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const recipeById = id => C.recipes.find(r => r.id === id);
  const SLOT = { breakfast: 'Frühstück', lunch: 'Mittag', dinner: 'Abend' };

  // ===== Fotos (kuratiert über TheMealDB – garantiert Essen, nie Menschen) =====
  // Rezepte → echte Teller-Fotos (Meal-Thumbnails). Lebensmittel → Zutatenbilder.
  // Quelle stabil & kostenlos; bei Ladefehler greift der Emoji-Fallback (onerror).
  const RECIPE_PHOTO = {
    oat_bowl: 'sng9bm1765320170', quark_apple: '1543774956', scrambled: 'yvpuuy1511797244',
    lentil_stew: 'uwxqwy1483389553', chickpea_curry: 'xvnx8j1763287209', veggie_pasta: 'ustsqw1468250014',
    potato_pan: '0y6uvc1763258983', chicken_rice: 'fk80jp1763280767', bolognese: 'sutysw1468247559',
    tuna_salad: 'yypwwq1511304979', tofu_veg: '1525874812', yogurt_snack: 'gkcdpl1764441325',
    // Erweiterung: nur verifizierte TheMealDB-Treffer mit passender Optik
    pancakes: 'rwuyqx1511383174', omelette: 'hqaejl1695738653', ratatouille: 'wrpwuu1511786491',
    hummus_bowl: 'gpon5u1763801180', lentil_salad: 'vpxyqt1511464175', fried_rice: 'wuyd2h1765655837',
    couscous_salad: 'qxytrx1511304021', fish_potato: 'ysxwuq1487323065', pork_veg: 'lwsnkl1604181187',
    tofu_stirfry: '1525874812', spaghetti_aglio: '5fu4ew1760524857', chili_con_carne: 'uuqvwu1504629254',
    veggie_lasagne: 'rvxxuy1468312893', salmon_veg: '1548772327', stuffed_peppers: 'b66myb1683207208'
  };
  // Nur Rezepte bekommen echte Fotos. Lebensmittel nutzen die klaren Emoji-Kacheln
  // (Zutaten-Fotos waren uneinheitlich/teils unpassend).
  function photoUrl(id) {
    if (RECIPE_PHOTO[id]) return `https://www.themealdb.com/images/media/meals/${RECIPE_PHOTO[id]}.jpg`;
    return null;
  }
  function thumb(cls, gradId, emoji, id, badge) {
    const u = photoUrl(id);
    return `<div class="${cls} g-${gradId} thumb-photo">${u ? `<img src="${u}" alt="" loading="lazy" onerror="this.remove()">` : ''}<span class="thumb-emoji">${emoji}</span>${badge ? `<span class="thumb-badge">${esc(badge)}</span>` : ''}</div>`;
  }

  const app = document.getElementById('app');
  const nav = document.getElementById('bottom-nav');

  // ===== Dispatcher =====
  function render() {
    if (state.route !== 'scan') stopScan();
    if (state.route !== 'play') stopPlay();
    if (!state.profile) { renderOnboarding(); nav.hidden = true; return; }
    if (!state.plan) { state.plan = L.generateWeek(C, state.profile); save(STORE.plan, state.plan); }
    if (state.route === 'ki') { renderChat(); return; }
    if (state.route === 'recipe') { renderRecipe(); nav.hidden = false; renderNav(); return; }
    if (state.route === 'exercise') { renderExercise(); nav.hidden = false; renderNav(); return; }
    if (state.route === 'session') { renderSession(); nav.hidden = false; renderNav(); return; }
    if (state.route === 'play') { renderPlay(); nav.hidden = true; return; }
    if (state.route === 'wissen') { app.innerHTML = `<div class="screen">${renderWissen()}</div>`; nav.hidden = false; renderNav(); bindView(); return; }
    if (state.route === 'vitamin') { renderVitamin(); nav.hidden = false; renderNav(); return; }
    if (state.route === 'profil') { renderProfil(); nav.hidden = false; renderNav(); return; }
    if (state.route === 'lebensmittel') { app.innerHTML = `<div class="screen">${renderLebensmittel()}</div>`; nav.hidden = false; renderNav(); bindView(); return; }
    if (state.route === 'food') { renderFood(); nav.hidden = false; renderNav(); return; }
    if (state.route === 'scan') { renderScan(); nav.hidden = false; renderNav(); return; }
    if (state.route === 'tracker') { app.innerHTML = `<div class="screen">${renderTracker()}</div>`; nav.hidden = false; renderNav(); bindView(); return; }
    if (state.route === 'verlauf') { app.innerHTML = `<div class="screen">${renderVerlauf()}</div>`; nav.hidden = false; renderNav(); bindView(); return; }
    if (state.route === 'fortschritt') { app.innerHTML = `<div class="screen">${renderFortschritt()}</div>`; nav.hidden = false; renderNav(); bindView(); return; }
    nav.hidden = false;
    renderNav();
    const view = { dashboard: renderDashboard, ernaehrung: renderErnaehrung, training: renderTraining, einkauf: renderEinkauf }[state.route] || renderDashboard;
    app.innerHTML = `<div class="screen">${topbar()}${view()}</div>`;
    bindView();
  }

  // ===== Onboarding =====
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
    if (!state.workout || state.workout.date !== todayMs || state.workout.energy !== state.energy || state.workout._v !== state.woVariation) {
      state.workout = L.generateWorkout(C, state.profile, state.energy, state.workoutStore, state.woVariation);
      state.workout._v = state.woVariation;
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
  function renderErnaehrung() {
    const today = L.todayIndex(state.plan);
    const ws = state.plan.weekStart;
    const days = state.plan.days.map((day, i) => {
      const date = new Date(ws + i * 86400000);
      const wd = i === today ? 'Heute' : date.toLocaleDateString('de-DE', { weekday: 'long' });
      const rows = day.meals.map(m => {
        const r = recipeById(m.recipeId);
        const n = L.recipeNutrients(C, r).perServing;
        return `<button class="row-card" data-recipe="${r.id}">
          ${thumb('row-thumb', r.grad, r.emoji, r.id)}
          <div class="row-main"><div class="row-title">${esc(r.name)}</div>
            <div class="row-sub">${SLOT[m.slot]} · ${Math.round(n.kcal)} kcal · ${m.servings} Port.</div></div>
          <div class="row-chev">›</div></button>`;
      }).join('');
      return `<div class="day-block"><div class="day-label ${i === today ? 'today' : ''}">${esc(wd)}</div>${rows}</div>`;
    }).join('');
    return `
      <div class="page-head"><h1 class="page-title">Wochenplan</h1>
        <p class="page-sub">${esc(labelFor('dietType', state.profile.dietType))} · ${state.plan.servings} Portionen</p></div>
      <div class="btn-row" style="margin-bottom:16px">
        <button class="btn btn-green" id="make-shop">🛒 Wocheneinkauf erstellen</button>
        <button class="btn btn-ghost" id="regen" style="flex:0 0 52px">🔄</button>
      </div>
      ${days}`;
  }

  // ===== Rezept-Detail + Portionsrechner =====
  function renderRecipe() {
    const r = recipeById(state.recipeId);
    const n = L.recipeNutrients(C, r).perServing;
    const scaled = L.scaleIngredients(C, r, state.portions);
    const costPer = L.recipeCost(C, r).perServing;
    app.innerHTML = `<div class="screen">
      <div class="page-head">
        <button class="btn btn-ghost" id="rec-back" style="width:auto;padding:8px 14px">← Zurück</button>
      </div>
      ${thumb('recipe-hero', r.grad, r.emoji, r.id)}
      <h1 class="page-title">${esc(r.name)}</h1>
      <p class="page-sub">⏱️ ${r.prepMinutes} Min · 💶 ca. ${costPer.toFixed(2).replace('.', ',')} € pro Portion</p>

      <div class="nutri-grid">
        <div class="nutri"><div class="nutri-val">${Math.round(n.kcal)}</div><div class="nutri-lbl">kcal</div></div>
        <div class="nutri"><div class="nutri-val">${Math.round(n.protein)}g</div><div class="nutri-lbl">Eiweiß</div></div>
        <div class="nutri"><div class="nutri-val">${Math.round(n.carbs)}g</div><div class="nutri-lbl">Kohlenh.</div></div>
        <div class="nutri"><div class="nutri-val">${Math.round(n.fat)}g</div><div class="nutri-lbl">Fett</div></div>
      </div>
      <p class="muted" style="text-align:center">Werte je Portion</p>

      <div class="section-title">Portionen</div>
      <div class="stepper">
        <button id="por-minus">−</button>
        <span class="val">${state.portions} ${state.portions === 1 ? 'Portion' : 'Portionen'}</span>
        <button id="por-plus">+</button>
      </div>

      <div class="section-title">Zutaten</div>
      <div class="card">
        ${scaled.map(s => `<div class="ingr-row">
          <span class="ingr-name"><span class="emoji">${s.food.emoji}</span>${esc(s.food.name)}</span>
          <span class="ingr-amt">${L.formatAmount(s.amount, s.unit)}</span></div>`).join('')}
      </div>

      <div class="section-title">Zubereitung</div>
      <div class="card"><ol class="steps-ol">${r.steps.map(st => `<li>${esc(st)}</li>`).join('')}</ol></div>

      <button class="btn btn-green" id="rec-add" style="margin-top:8px">🛒 Zur Einkaufsliste hinzufügen</button>
    </div>`;

    document.getElementById('rec-back').onclick = () => { state.route = state.recipeBack; render(); };
    document.getElementById('por-minus').onclick = () => { if (state.portions > 1) { state.portions--; renderRecipe(); } };
    document.getElementById('por-plus').onclick = () => { if (state.portions < 12) { state.portions++; renderRecipe(); } };
    document.getElementById('rec-add').onclick = () => {
      state.shop.sources.push({ recipeId: r.id, servings: state.portions });
      save(STORE.shop, state.shop);
      state.route = 'einkauf'; render();
    };
  }

  // ===== Trainings-Session (Detail/Player) =====
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
  function renderWissen() {
    const heads = { Vitamin: '🔆 Vitamine', Mineralstoff: '⛏️ Mineralstoffe', 'Fettsäure': '🐟 Fettsäuren', Sonstiges: '🌿 Weitere Nährstoffe' };
    let html = '';
    for (const ty of Object.keys(heads)) {
      const list = K.nutrients.filter(n => n.type === ty);
      if (!list.length) continue;
      html += `<div class="menu-head" style="margin-top:18px">${heads[ty]}</div>`;
      html += list.map(n => `<button class="row-card" data-vit="${n.id}">
        <div class="row-thumb g-${n.grad}">${n.emoji}</div>
        <div class="row-main"><div class="row-title">${esc(n.name)}</div><div class="row-sub">${esc(n.short)}</div></div>
        <div class="row-chev">›</div></button>`).join('');
    }
    return `<div class="page-head">
        <button class="btn btn-ghost" id="wissen-back" style="width:auto;padding:8px 14px">← Zurück</button>
        <h1 class="page-title" style="margin-top:12px">Vitamine & Nährstoffe</h1>
        <p class="page-sub">Einfach erklärt, faktenbasiert</p></div>
      <div class="warn-banner">Allgemeine Infos, keine medizinische Beratung. Bei Beschwerden bitte Arzt/Ärztin fragen.</div>
      ${html}`;
  }

  function renderVitamin() {
    const n = K.nutrients.find(x => x.id === state.vitaminId);
    app.innerHTML = `<div class="screen">
      <div class="page-head"><button class="btn btn-ghost" id="vit-back" style="width:auto;padding:8px 14px">← Zurück</button></div>
      <div class="recipe-hero g-${n.grad}">${n.emoji}</div>
      <h1 class="page-title">${esc(n.name)}</h1>
      <p class="page-sub">${esc(n.type)} · ${esc(n.short)}</p>
      <div class="card" style="margin-top:12px"><div class="card-title">🧠 Wofür dein Körper es braucht</div><p class="muted">${esc(n.role)}</p></div>
      <div class="card"><div class="card-title">🥗 Gute (günstige) Quellen</div><div>${n.sources.map(s => `<span class="pill" style="background:var(--surface-2);color:var(--text-2)">${esc(s)}</span>`).join('')}</div></div>
      <div class="card"><div class="card-title">📏 Tagesbedarf (Richtwert)</div><p class="muted">${esc(n.need)}</p></div>
      <div class="card"><div class="card-title">⚠️ Bei Mangel</div><p class="muted">${esc(n.deficiency)}</p></div>
      ${n.combos ? `<div class="card"><div class="card-title">🔗 Beste Kombinationen</div><ul class="steps-ol" style="list-style:disc">${n.combos.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>` : ''}
      <div class="card"><div class="card-title">💡 Tipps</div><ul class="steps-ol" style="list-style:disc">${n.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
    </div>`;
    document.getElementById('vit-back').onclick = () => { state.route = 'wissen'; render(); };
  }

  // ===== Profil (jederzeit anpassbar) =====
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
  function renderEinkauf() {
    const rows = L.aggregateShopping(C, state.shop.sources);
    const extras = state.shop.extras || [];
    if (!rows.length && !extras.length) {
      return `<div class="page-head"><h1 class="page-title">Einkaufsliste</h1></div>
        <div class="empty-hint"><span class="eh-emoji">🛒</span>Noch leer. Erstelle im Wochenplan einen „Wocheneinkauf", füge ein Rezept hinzu oder scanne ein Produkt.</div>`;
    }
    rows.forEach(r => r.checked = !!state.shop.checked[r.foodId]);
    const total = rows.reduce((s, r) => s + r.price, 0);
    const open = rows.filter(r => !r.checked).reduce((s, r) => s + r.price, 0);
    let html = '', lastCat = null;
    for (const r of rows) {
      if (r.cat !== lastCat) { html += `<div class="shop-cat">${esc(r.cat)}</div>`; lastCat = r.cat; }
      html += `<div class="shop-item ${r.checked ? 'done' : ''}" data-food="${r.foodId}">
        <div class="shop-check ${r.checked ? 'on' : ''}">${r.checked ? '✓' : ''}</div>
        <span class="ingr-name" style="flex:1"><span class="emoji">${r.emoji}</span>${esc(r.name)}</span>
        <span class="ingr-amt">${L.formatAmount(r.amount, r.unit)}</span></div>`;
    }
    if (extras.length) {
      html += `<div class="shop-cat">📷 Gescannt / Extra</div>`;
      html += extras.map((e, i) => `<div class="shop-item ${state.shop.checked['x' + i] ? 'done' : ''}">
        <button class="shop-check ${state.shop.checked['x' + i] ? 'on' : ''}" data-xcheck="${i}">${state.shop.checked['x' + i] ? '✓' : ''}</button>
        <span class="ingr-name" style="flex:1">🏷️ ${esc(e.name)}</span>
        <button class="x-remove" data-xremove="${i}" aria-label="Entfernen">✕</button></div>`).join('');
    }
    return `
      <div class="page-head"><h1 class="page-title">Einkaufsliste</h1>
        <p class="page-sub">${rows.length + extras.length} Artikel · gleiche Produkte zusammengeführt</p></div>
      ${rows.length ? `<div class="budget-bar"><div><div class="muted">Geschätzte Kosten</div><b>${total.toFixed(2).replace('.', ',')} €</b></div>
        <div style="text-align:right"><div class="muted">noch offen</div><b style="color:var(--green)">${open.toFixed(2).replace('.', ',')} €</b></div></div>` : ''}
      ${html}
      <button class="btn btn-ghost" id="shop-clear" style="margin-top:20px">Liste leeren</button>`;
  }

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

  function menuGroups() {
    const total = (state.workoutStore.history || []).length;
    return [
      { head: '🥗 Ernährung', items: [
        { ic: '🗓️', t: 'Wochenplan', go: 'ernaehrung' },
        { ic: '🍳', t: 'Rezepte durchstöbern', go: 'ernaehrung' },
        { ic: '🥫', t: 'Lebensmittel-Datenbank', go: 'lebensmittel' },
        { ic: '⚖️', t: 'Portionsrechner', hint: 'im Rezept' }
      ] },
      { head: '💪 Training', items: [
        { ic: '🔥', t: 'Heutiges Workout', go: 'training' },
        { ic: '📚', t: 'Übungs-Bibliothek', go: 'training' },
        { ic: '📈', t: `Fortschritt (${total} Workouts)`, go: 'fortschritt' }
      ] },
      { head: '🛒 Einkaufen', items: [
        { ic: '🧾', t: 'Einkaufsliste', go: 'einkauf' },
        { ic: '🥗', t: 'Lebensmittel & Suche', go: 'lebensmittel' }
      ] },
      { head: '🔥 Kalorien', items: [
        { ic: '📊', t: 'Kalorien-Tracker', go: 'tracker' },
        { ic: '📷', t: 'Barcode scannen', go: 'scan' }
      ] },
      { head: '📘 Wissen', items: [
        { ic: '🔆', t: 'Vitamine & Nährstoffe', go: 'wissen' },
        { ic: '🧬', t: 'Kombinationen & Tipps', go: 'wissen' }
      ] },
      { head: '🤖 Coach', items: [
        { ic: '💬', t: 'Gesundheits-Coach (KI)', go: 'ki' },
        { ic: '🕘', t: 'Mein Verlauf', go: 'verlauf' }
      ] },
      { head: '⚙️ Einstellungen', items: [
        { ic: '👤', t: 'Mein Profil bearbeiten', go: 'profil' },
        { ic: '🔄', t: 'Onboarding neu starten', reset: true }
      ] }
    ];
  }
  function drawerRow(it) {
    const attr = it.go ? `data-go="${it.go}"` : it.reset ? 'id="reset-profile"' : it.soon ? `data-soon="${it.soon}"` : '';
    const right = it.soon ? `<span class="menu-badge">${it.soon}</span>` : it.hint ? `<span class="menu-badge">${it.hint}</span>` : '<div class="row-chev">›</div>';
    return `<button class="row-card ${it.soon ? 'soon' : ''}" ${attr}><div class="row-thumb plain">${it.ic}</div><div class="row-main"><div class="row-title">${esc(it.t)}</div></div>${right}</button>`;
  }
  function buildDrawer() {
    const drawer = document.getElementById('drawer');
    drawer.innerHTML = `
      <div class="drawer-head">
        <div class="drawer-logo">＋</div>
        <div class="drawer-id"><div class="drawer-title">Gesundheits-App</div><div class="drawer-sub">Menü</div></div>
        <button class="drawer-x" id="drawer-x" aria-label="Menü schließen">✕</button>
      </div>
      <div class="drawer-body">
        ${menuGroups().map(g => `<div class="menu-group"><div class="menu-head">${g.head}</div>${g.items.map(drawerRow).join('')}</div>`).join('')}
        <p class="muted" style="text-align:center;margin:8px 0 4px">© 2026 Marcel Fehse</p>
      </div>`;
    document.getElementById('drawer-x').onclick = closeDrawer;
    drawer.querySelectorAll('[data-go]').forEach(el => el.onclick = () => { closeDrawer(); state.route = el.dataset.go; render(); });
    drawer.querySelectorAll('[data-soon]').forEach(el => el.onclick = () => alert(`„${el.querySelector('.row-title').textContent}" kommt in ${el.dataset.soon}. 🙂`));
    const r = drawer.querySelector('#reset-profile');
    if (r) r.onclick = () => { closeDrawer(); if (confirm('Profil zurücksetzen und Onboarding neu starten?')) { state.profile = null; state.plan = null; state.onbStep = 0; state.onbDraft = {}; localStorage.removeItem(STORE.profile); localStorage.removeItem(STORE.plan); render(); } };
  }
  function openDrawer() { buildDrawer(); const d = document.getElementById('drawer'), s = document.getElementById('drawer-scrim'); s.hidden = false; requestAnimationFrame(() => { d.classList.add('open'); s.classList.add('show'); }); d.setAttribute('aria-hidden', 'false'); }
  function closeDrawer() { const d = document.getElementById('drawer'), s = document.getElementById('drawer-scrim'); d.classList.remove('open'); s.classList.remove('show'); d.setAttribute('aria-hidden', 'true'); setTimeout(() => { s.hidden = true; }, 260); }

  // ===== Phase 3: Lebensmittel-Datenbank =====
  const PRICE_LABEL = ['', '€ günstig', '€€ mittel', '€€€ höher'];
  const priceLevel = f => f.base === 'stueck'
    ? (f.unitPrice <= 0.4 ? 1 : f.unitPrice <= 1 ? 2 : 3)
    : (f.unitPrice <= 2.5 ? 1 : f.unitPrice <= 6 ? 2 : 3);
  function foodRow(f) {
    return `<div class="row-card" data-foodopen="${f.id}" data-name="${esc(f.name.toLowerCase())}" data-cat="${esc(f.cat)}">
        ${thumb('row-thumb', gradForCat(f.cat), f.emoji, f.id)}
        <div class="row-main"><div class="row-title">${esc(f.name)}</div>
          <div class="row-sub">${Math.round(f.nutr.kcal)} kcal · ${Math.round(f.nutr.protein)} g Eiweiß / 100 g</div></div>
        <button class="lm-add" data-foodadd="${f.id}" aria-label="Zur Einkaufsliste">＋</button></div>`;
  }
  function renderLebensmittel() {
    const cats = [...new Set(C.foods.map(f => f.cat))];
    let html = '';
    for (const cat of cats) {
      const list = C.foods.filter(f => f.cat === cat);
      html += `<div class="menu-head" style="margin-top:18px" data-cathead="${esc(cat)}">${esc(cat)}</div>`;
      html += list.map(foodRow).join('');
    }
    return `<div class="page-head">
        <button class="btn btn-ghost" id="lm-back" style="width:auto;padding:8px 14px">← Zurück</button>
        <h1 class="page-title" style="margin-top:12px">Lebensmittel</h1>
        <p class="page-sub">${C.foods.length} Lebensmittel · Nährwerte, Preis & Sättigung</p></div>
      <input class="lm-search" id="lm-search" type="search" placeholder="🔍 Lebensmittel suchen…" value="${esc(state.foodQuery)}" />
      <button class="btn btn-green" id="lm-scan" style="margin:8px 0 16px">📷 Produkt-Barcode scannen</button>
      <p class="muted" id="lm-empty" style="text-align:center;display:none">Nichts gefunden.</p>
      ${html}`;
  }

  function renderFood() {
    const f = L.foodById(C, state.foodId);
    const satWidth = Math.max(6, Math.min(100, f.satiety));
    const recipeIdeas = C.recipes.filter(r => r.ingredients.some(i => i.foodId === f.id)).slice(0, 4);
    app.innerHTML = `<div class="screen">
      <div class="page-head"><button class="btn btn-ghost" id="food-back" style="width:auto;padding:8px 14px">← Zurück</button></div>
      ${thumb('recipe-hero', gradForCat(f.cat), f.emoji, f.id)}
      <h1 class="page-title">${esc(f.name)}</h1>
      <p class="page-sub">${esc(f.cat)} · ${PRICE_LABEL[priceLevel(f)]}</p>

      <div class="nutri-grid">
        <div class="nutri"><div class="nutri-val">${Math.round(f.nutr.kcal)}</div><div class="nutri-lbl">kcal</div></div>
        <div class="nutri"><div class="nutri-val">${Math.round(f.nutr.protein)}g</div><div class="nutri-lbl">Eiweiß</div></div>
        <div class="nutri"><div class="nutri-val">${Math.round(f.nutr.carbs)}g</div><div class="nutri-lbl">Kohlenh.</div></div>
        <div class="nutri"><div class="nutri-val">${Math.round(f.nutr.fiber)}g</div><div class="nutri-lbl">Ballast.</div></div>
      </div>
      <p class="muted" style="text-align:center">Werte je 100 g/ml</p>

      <div class="card" style="margin-top:12px"><div class="card-title">🍽️ Sättigung</div>
        <div class="sat-bar"><span style="width:${satWidth}%"></span></div>
        <p class="muted" style="margin-top:6px">${f.satiety >= 70 ? 'Hält lange satt' : f.satiety >= 45 ? 'Mittlere Sättigung' : 'Sättigt eher wenig'}</p></div>

      <div class="card"><div class="card-title">🏷️ Eigenschaften</div>
        <div>${f.tags.map(t => `<span class="pill" style="background:var(--surface-2);color:var(--text-2)">${esc(tagLabel(t))}</span>`).join('') || '<span class="muted">—</span>'}</div></div>

      <div class="card"><div class="card-title">➕ Hinzufügen</div>
        <div class="kcal-portion"><label>Portion</label><input id="food-grams" inputmode="numeric" value="100" /><span>g</span></div>
        <button class="btn btn-green" id="food-eat" style="margin-top:8px">🔥 Zu heute (Kalorien)</button>
        <button class="btn btn-ghost" id="food-shop" style="margin-top:8px">🛒 Zur Einkaufsliste</button></div>

      ${recipeIdeas.length ? `<div class="section-title">Rezeptideen</div>${recipeIdeas.map(r => `<button class="row-card" data-recipe="${r.id}">${thumb('row-thumb', r.grad, r.emoji, r.id)}<div class="row-main"><div class="row-title">${esc(r.name)}</div><div class="row-sub">${r.prepMinutes} Min</div></div><div class="row-chev">›</div></button>`).join('')}` : ''}
    </div>`;
    document.getElementById('food-back').onclick = () => { state.route = 'lebensmittel'; render(); };
    app.querySelectorAll('[data-recipe]').forEach(el => el.onclick = () => openRecipe(el.dataset.recipe));
    document.getElementById('food-shop').onclick = () => addFoodToShop(f.id);
    document.getElementById('food-eat').onclick = () => {
      const g = Number(document.getElementById('food-grams').value) || 100;
      const r = g / 100;
      addIntake(`${f.name} (${g} g)`, f.nutr.kcal * r, state.trackerCat || mealCatByTime(),
        { c: f.nutr.carbs * r, p: f.nutr.protein * r, f: f.nutr.fat * r });
      state.route = 'tracker'; render();
    };
  }

  const CAT_GRAD = {
    'Getreide': 'amber', 'Gemüse': 'sage', 'Obst': 'sunrise', 'Protein': 'terracotta', 'Milch': 'peach', 'Vorrat': 'amber',
    'Hülsenfrüchte': 'sage', 'Nüsse & Samen': 'amber', 'Fleisch': 'terracotta', 'Fisch': 'terracotta',
    'Süßes & Snacks': 'peach', 'Getränke': 'sage', 'Gewürze & Kräuter': 'sage', 'Backwaren': 'amber', 'Fertig & Sonstiges': 'peach'
  };
  const gradForCat = cat => CAT_GRAD[cat] || 'sage';
  const TAG_LABEL = { cheap: 'günstig', vegan: 'vegan', vegetarian: 'vegetarisch', protein: 'eiweißreich', fiber: 'ballaststoffreich', iron: 'eisenreich', vitaminC: 'Vitamin C', meat: 'Fleisch', fish: 'Fisch' };
  const tagLabel = t => TAG_LABEL[t] || t;

  // ===== Barcode-Scanner (Open Food Facts) =====
  function renderScan() {
    const supportsCam = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    app.innerHTML = `<div class="screen">
      <div class="page-head"><button class="btn btn-ghost" id="scan-back" style="width:auto;padding:8px 14px">← Zurück</button>
        <h1 class="page-title" style="margin-top:12px">Barcode scannen</h1>
        <p class="page-sub">Produktdaten kommen von Open Food Facts</p></div>
      ${supportsCam ? `<div class="scan-box"><video id="scan-video" playsinline autoplay muted></video><div class="scan-line"></div></div>
        <button class="btn" id="scan-start">📷 Kamera starten</button>` : '<div class="warn-banner">Kamera nicht verfügbar – bitte den Barcode unten eingeben.</div>'}
      <div class="section-title">Oder Barcode eingeben</div>
      <div class="chat-input-row">
        <input class="chat-input" id="scan-code" inputmode="numeric" placeholder="z. B. 3017620422003" />
        <button class="chat-send" id="scan-lookup">🔍</button>
      </div>
      <div id="scan-result" style="margin-top:16px"></div>
    </div>`;
    document.getElementById('scan-back').onclick = () => { stopScan(); state.route = 'lebensmittel'; render(); };
    const sb = document.getElementById('scan-start');
    if (sb) sb.onclick = startScan;
    document.getElementById('scan-lookup').onclick = () => { const c = document.getElementById('scan-code').value.trim(); if (c) lookupBarcode(c); };
    document.getElementById('scan-code').onkeydown = e => { if (e.key === 'Enter') { const c = e.target.value.trim(); if (c) lookupBarcode(c); } };
  }
  function setScanInfo(msg) { const el = document.getElementById('scan-result'); if (el) el.innerHTML = `<p class="muted" style="text-align:center">${esc(msg)}</p>`; }
  // Native BarcodeDetector (Android Chrome/Edge) wird bevorzugt; sonst ZXing als
  // Fallback (iOS Safari, Firefox), das die Rückkamera selbst öffnet und verwaltet.
  // Übersetzt Kamera-Fehler in einen verständlichen Hinweis.
  function camErrorText(err) {
    const n = err && err.name;
    if (n === 'NotAllowedError' || n === 'SecurityError') return 'Kamera-Zugriff wurde abgelehnt. Bitte in den Browser-Einstellungen erlauben – oder den Barcode unten eingeben.';
    if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'Keine passende Kamera gefunden. Bitte den Barcode unten eingeben.';
    if (n === 'NotReadableError') return 'Die Kamera ist gerade durch eine andere App belegt. Schließe sie und versuche es erneut – oder gib den Barcode unten ein.';
    return 'Kamera-Scan nicht möglich – bitte den Barcode unten eingeben.';
  }
  // Sanfter Hinweis, falls nach einer Weile kein Code erkannt wurde (Scanner läuft weiter).
  function armScanTimeout() {
    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = setTimeout(() => setScanInfo('Noch nichts erkannt – Barcode ruhig und gut beleuchtet in den Rahmen halten. Alternativ unten eingeben.'), 20000);
  }
  async function startScan() {
    const video = document.getElementById('scan-video');
    if (!video) return;
    const sb = document.getElementById('scan-start');
    if (sb) sb.disabled = true;
    const hasDetector = 'BarcodeDetector' in window;
    if (hasDetector) {
      try {
        scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = scanStream; await video.play();
      } catch (err) { setScanInfo(camErrorText(err)); if (sb) sb.disabled = false; return; }
      setScanInfo('📷 Halte den Barcode in den Rahmen…');
      try {
        const det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
        scanLoop = setInterval(async () => {
          try { const codes = await det.detect(video); if (codes && codes.length) { const c = codes[0].rawValue; stopScan(); lookupBarcode(c); } } catch {}
        }, 400);
        armScanTimeout();
        return;
      } catch { /* Detector da, aber Formate nicht unterstützt → ZXing versuchen */ }
    }
    // ZXing-Fallback: öffnet & verwaltet die Rückkamera selbst, liefert controls zum Stoppen.
    setScanInfo('📷 Scanner wird geladen…');
    try {
      const mod = await import('https://esm.sh/@zxing/browser@0.1.5');
      scanReader = new mod.BrowserMultiFormatReader();
      scanControls = await scanReader.decodeFromConstraints(
        { video: { facingMode: 'environment' } }, video,
        (result) => { if (result) { const c = result.getText(); stopScan(); lookupBarcode(c); } }
      );
      setScanInfo('📷 Halte den Barcode in den Rahmen…');
      armScanTimeout();
    } catch (err) {
      setScanInfo(err && err.name ? camErrorText(err) : 'Scanner konnte nicht geladen werden – bitte Internet prüfen oder den Barcode unten eingeben.');
      if (sb) sb.disabled = false;
    }
  }
  function stopScan() {
    if (scanTimeout) { clearTimeout(scanTimeout); scanTimeout = null; }
    if (scanLoop) { clearInterval(scanLoop); scanLoop = null; }
    if (scanControls) { try { scanControls.stop(); } catch {} scanControls = null; }
    if (scanReader) { scanReader = null; }
    if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
    const sb = document.getElementById('scan-start');
    if (sb) sb.disabled = false;
  }
  async function lookupBarcode(code) {
    const clean = String(code).replace(/\D/g, '');
    if (clean.length < 8) { setScanInfo('Bitte einen gültigen Barcode eingeben (mindestens 8 Ziffern).'); return; }
    setScanInfo('🔎 Suche Produkt…');
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 12000);
    try {
      const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(clean)}.json?fields=product_name,brands,nutriments,image_front_small_url,nutriscore_grade`, { signal: ctrl.signal });
      const j = await r.json();
      if (!j.product || j.status === 0) { setScanInfo('Kein Produkt gefunden. Bitte den Barcode prüfen oder ein anderes Produkt versuchen.'); return; }
      renderScanResult(j.product);
    } catch (err) {
      setScanInfo(err && err.name === 'AbortError' ? 'Zeitüberschreitung bei der Suche – bitte Internetverbindung prüfen und erneut versuchen.' : 'Suche fehlgeschlagen – bitte Internet prüfen.');
    } finally { clearTimeout(to); }
  }
  function renderScanResult(p) {
    const n = p.nutriments || {};
    const name = p.product_name || 'Unbekanntes Produkt';
    const val = k => Math.round((n[k] || 0) * 10) / 10;
    const grade = (p.nutriscore_grade || '').toUpperCase();
    const el = document.getElementById('scan-result');
    el.innerHTML = `
      <div class="card">
        <div style="display:flex;gap:12px;align-items:center">
          ${p.image_front_small_url ? `<img src="${esc(p.image_front_small_url)}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:12px;flex:none" onerror="this.remove()">` : ''}
          <div><div class="card-title" style="margin:0">${esc(name)}</div>${p.brands ? `<div class="muted">${esc(p.brands)}</div>` : ''}</div>
        </div>
        <div class="nutri-grid" style="margin-top:12px">
          <div class="nutri"><div class="nutri-val">${Math.round(n['energy-kcal_100g'] || 0)}</div><div class="nutri-lbl">kcal</div></div>
          <div class="nutri"><div class="nutri-val">${val('proteins_100g')}g</div><div class="nutri-lbl">Eiweiß</div></div>
          <div class="nutri"><div class="nutri-val">${val('carbohydrates_100g')}g</div><div class="nutri-lbl">Kohlenh.</div></div>
          <div class="nutri"><div class="nutri-val">${val('fat_100g')}g</div><div class="nutri-lbl">Fett</div></div>
        </div>
        <p class="muted" style="text-align:center">Werte je 100 g${grade ? ` · Nutri-Score <b>${esc(grade)}</b>` : ''}</p>
        <div class="kcal-portion"><label>Portion</label>
          <input id="scan-grams" inputmode="numeric" value="100" /><span>g</span></div>
        <button class="btn btn-green" id="scan-eat">🔥 Zu heute (Kalorien)</button>
        <button class="btn btn-ghost" id="scan-add" style="margin-top:8px">🛒 Zur Einkaufsliste</button>
      </div>`;
    const kcal100 = Math.round(n['energy-kcal_100g'] || 0);
    document.getElementById('scan-add').onclick = () => {
      if (!state.shop.extras) state.shop.extras = [];
      state.shop.extras.push({ name });
      save(STORE.shop, state.shop);
      toast('✓ Zur Einkaufsliste');
    };
    document.getElementById('scan-eat').onclick = () => {
      const g = Number(document.getElementById('scan-grams').value) || 100;
      const r = g / 100;
      addIntake(`${name} (${g} g)`, Math.round(kcal100 * r), state.trackerCat || mealCatByTime(),
        { c: (n['carbohydrates_100g'] || 0) * r, p: (n['proteins_100g'] || 0) * r, f: (n['fat_100g'] || 0) * r });
      stopScan();
      state.route = 'tracker'; render();
    };
  }

  // ===== Kalorien-Tracker (heute gegessen) =====
  const MEAL_GRAD = { breakfast: 'sunrise', lunch: 'amber', dinner: 'terracotta', snack: 'sage' };
  const MEAL_SHARE = { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snack: 0.10 };

  function renderWaterCard() {
    const count = state.water[todayKey()] || 0;
    const liters = (count * 0.25).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const glasses = Array.from({ length: WATER_GOAL }, (_, i) =>
      `<button class="glass ${i < count ? 'full' : ''}" data-glass="${i}" aria-label="Glas ${i + 1}"></button>`).join('');
    return `<div class="card">
      <div class="card-title">💧 Wasser <span class="muted" style="font-weight:600">· ${count} / ${WATER_GOAL} Gläser · ${liters} L</span></div>
      <div class="water-glasses">${glasses}</div>
      <p class="muted" style="margin-top:8px">${count >= WATER_GOAL ? '🎉 Tagesziel erreicht – stark!' : 'Tippe ein Glas an, wenn du getrunken hast (250 ml).'}</p>
    </div>`;
  }

  function renderTracker() {
    const items = todayIntake();
    const goal = state.calGoal;
    const cat = state.trackerCat || mealCatByTime();
    const head = `<div class="page-head">
        <button class="btn btn-ghost" id="simple-back" style="width:auto;padding:8px 14px">← Zurück</button>
        <h1 class="page-title" style="margin-top:12px">Kalorien heute</h1>
        <p class="page-sub">${new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>`;

    // Ohne Ziel: erst Tagesziel abfragen.
    if (!goal) {
      return `${head}
        <div class="card">
          <div class="card-title">🎯 Tagesziel setzen</div>
          <p class="muted">Wie viele Kalorien möchtest du pro Tag essen? (z. B. 2000)</p>
          <div class="chat-input-row" style="margin-top:8px">
            <input class="chat-input" id="cal-goal-input" inputmode="numeric" placeholder="kcal/Tag" />
            <button class="chat-send" id="cal-goal-save">✓</button>
          </div>
        </div>`;
    }

    const sum = items.reduce((a, it) => ({ kcal: a.kcal + (it.kcal || 0), c: a.c + (it.c || 0), p: a.p + (it.p || 0), f: a.f + (it.f || 0) }), { kcal: 0, c: 0, p: 0, f: 0 });
    const eaten = Math.round(sum.kcal);
    const rest = goal - eaten;
    const over = rest < 0;
    const circ = 327; // 2·π·52
    const offset = Math.round(circ * (1 - Math.min(1, eaten / goal)));
    const ringColor = over ? '#E2725B' : 'var(--green)';

    // Makro-Ziele aus dem Kalorienziel (50 % KH, 20 % Eiweiß, 30 % Fett).
    const macros = [
      { label: 'Kohlenhydrate', g: sum.c, target: goal * 0.5 / 4, color: '#E8A33D' },
      { label: 'Eiweiß', g: sum.p, target: goal * 0.2 / 4, color: '#16A34A' },
      { label: 'Fett', g: sum.f, target: goal * 0.3 / 9, color: '#5B8DEF' }
    ].map(m => {
      const tg = Math.round(m.target), gv = Math.round(m.g);
      const p = tg ? Math.min(100, Math.round(gv / tg * 100)) : 0;
      return `<div class="macro">
        <div class="macro-top"><span>${m.label}</span><span class="muted">${gv} / ${tg} g</span></div>
        <div class="macro-bar"><span style="width:${p}%;background:${m.color}"></span></div></div>`;
    }).join('');

    // Mahlzeiten-Karten mit eigenem Budget und „+".
    const meals = MEAL_CATS.map(c => {
      const group = items.filter(it => (it.cat || 'snack') === c.id);
      const sub = Math.round(group.reduce((s, it) => s + (it.kcal || 0), 0));
      const tgt = Math.round(goal * (MEAL_SHARE[c.id] || 0));
      const rows = group.map(it => `<div class="meal-item">
          <span class="meal-item-name">${esc(it.name)}</span>
          <span class="meal-item-kcal">${Math.round(it.kcal)} kcal</span>
          <button class="x-remove" data-intakedel="${it.ts}" aria-label="Entfernen">✕</button></div>`).join('');
      return `<div class="meal-card">
        <div class="meal-head">
          <div class="meal-ic g-${MEAL_GRAD[c.id]}">${c.emoji}</div>
          <div class="meal-info"><div class="meal-name">${c.label}</div><div class="meal-sub">${sub} / ${tgt} kcal</div></div>
          <button class="meal-add" data-mealadd="${c.id}" aria-label="${esc(c.label)} hinzufügen">+</button>
        </div>${rows}</div>`;
    }).join('');

    return `${head}
      <div class="cal-hero card">
        <div class="cal-hero-row">
          <div class="cal-side"><b>${eaten}</b><span>Gegessen</span></div>
          <div class="cal-ring-wrap">
            <svg viewBox="0 0 120 120" class="cal-ring" aria-hidden="true">
              <circle class="cal-ring-bg" cx="60" cy="60" r="52"/>
              <circle class="cal-ring-fg" cx="60" cy="60" r="52" stroke-dasharray="${circ}" stroke-dashoffset="${offset}" style="stroke:${ringColor}"/>
            </svg>
            <div class="cal-ring-center"><b style="${over ? 'color:#E2725B' : ''}">${over ? '+' + Math.abs(rest) : rest}</b><span>${over ? 'kcal zu viel' : 'kcal übrig'}</span></div>
          </div>
          <div class="cal-side"><b>${goal}</b><span>Ziel</span></div>
        </div>
        <div class="cal-macros">${macros}</div>
        <button class="link-btn" id="cal-goal-edit" style="display:block;margin:12px auto 0">Ziel ändern</button>
        <div id="cal-goal-editor" hidden>
          <div class="chat-input-row" style="margin-top:10px">
            <input class="chat-input" id="cal-goal-input" inputmode="numeric" value="${goal}" />
            <button class="chat-send" id="cal-goal-save">✓</button></div></div>
      </div>

      ${renderWaterCard()}

      <div class="track-actions">
        <button class="btn btn-green" data-go="scan">📷 Barcode</button>
        <button class="btn btn-ghost" data-go="lebensmittel">🔍 Suchen</button>
        <button class="btn btn-ghost" id="manual-toggle">✏️ Selbst</button>
      </div>
      <div id="manual-form" ${state.manualOpen ? '' : 'hidden'}>
        <div class="card">
          <div class="pchips">${MEAL_CATS.map(c => `<button class="chip ${cat === c.id ? 'sel' : ''}" data-trackcat="${c.id}">${c.emoji} ${c.label}</button>`).join('')}</div>
          <input class="lm-search" id="manual-name" placeholder="Was hast du gegessen?" style="margin-top:10px" />
          <div class="kcal-portion" style="margin-top:8px">
            <input id="manual-kcal" inputmode="numeric" placeholder="kcal" />
            <span>kcal</span>
            <button class="chat-send" id="manual-add">✓</button>
          </div>
        </div>
      </div>

      <div class="section-title">Mahlzeiten</div>
      ${meals}
      ${items.length ? `<button class="btn btn-ghost" id="intake-clear" style="margin-top:16px">Heute leeren</button>` : ''}`;
  }

  // ===== KI-Verlauf (gespeicherte Fragen & Antworten) =====
  function renderVerlauf() {
    const pairs = [];
    for (let i = 0; i < state.chat.length; i++) {
      if (state.chat[i].role === 'user') {
        const a = (state.chat[i + 1] && state.chat[i + 1].role === 'assistant') ? state.chat[i + 1] : null;
        pairs.push({ i, q: state.chat[i].content, a: a ? a.content : null });
      }
    }
    const list = pairs.length
      ? pairs.slice().reverse().map(p => `<div class="card">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:start">
            <div class="card-title" style="margin:0">❓ ${esc(p.q)}</div>
            <button class="x-remove" data-verlaufdel="${p.i}" aria-label="Löschen">🗑️</button>
          </div>
          ${p.a ? `<div class="muted" style="margin-top:8px">${mdLite(p.a)}</div>` : '<div class="muted" style="margin-top:8px">—</div>'}
        </div>`).join('')
      : '<div class="empty-hint"><span class="eh-emoji">🕘</span>Noch kein Verlauf. Stelle dem Coach eine Frage – sie wird hier gespeichert.</div>';
    return `<div class="page-head">
        <button class="btn btn-ghost" id="simple-back" style="width:auto;padding:8px 14px">← Zurück</button>
        <h1 class="page-title" style="margin-top:12px">Mein Verlauf</h1>
        <p class="page-sub">${pairs.length} gespeicherte ${pairs.length === 1 ? 'Frage' : 'Fragen'}</p></div>
      ${list}
      ${pairs.length ? `<button class="btn btn-ghost" id="verlauf-clear" style="margin-top:16px">🧹 Alles löschen</button>` : ''}`;
  }

  // ===== Fortschritt (Gewichtsverlauf, Streak, Statistiken) =====
  function activeDayKeys() {
    const set = new Set();
    (state.workoutStore.history || []).forEach(h => set.add(dayKeyOf(new Date(h.date))));
    Object.keys(state.intake || {}).forEach(k => set.add(k));
    (state.weight || []).forEach(w => set.add(w.date));
    return set;
  }
  function currentStreak() {
    const set = activeDayKeys();
    const d = new Date();
    if (!set.has(dayKeyOf(d))) d.setDate(d.getDate() - 1); // heute ist optional, bricht die Serie nicht
    let streak = 0;
    while (set.has(dayKeyOf(d))) { streak++; d.setDate(d.getDate() - 1); }
    return streak;
  }
  function weightChart(entries) {
    if (entries.length < 2) return '<p class="muted" style="text-align:center;margin-top:8px">Trage an mehreren Tagen dein Gewicht ein, um den Verlauf zu sehen.</p>';
    const data = entries.slice(-20);
    const W = 320, H = 120, pad = 24, n = data.length;
    const kgs = data.map(e => e.kg), min = Math.min(...kgs), max = Math.max(...kgs), range = (max - min) || 1;
    const x = i => pad + (n === 1 ? 0 : i * (W - 2 * pad) / (n - 1));
    const y = kg => pad + (H - 2 * pad) * (1 - (kg - min) / range);
    const pts = data.map((e, i) => `${x(i).toFixed(1)},${y(e.kg).toFixed(1)}`).join(' ');
    const dots = data.map((e, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(e.kg).toFixed(1)}" r="3" fill="var(--green)"/>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" class="wt-chart" aria-hidden="true">
      <polyline points="${pts}" fill="none" stroke="var(--green)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}
      <text x="2" y="${pad + 4}" class="wt-ax">${max.toFixed(1)}</text>
      <text x="2" y="${H - pad + 4}" class="wt-ax">${min.toFixed(1)}</text></svg>`;
  }
  function renderFortschritt() {
    const w = (state.weight || []).slice().sort((a, b) => a.date < b.date ? -1 : 1);
    const last = w[w.length - 1], first = w[0];
    const change = w.length >= 2 ? Math.round((last.kg - first.kg) * 10) / 10 : null;
    const workouts = (state.workoutStore.history || []).length;
    const days = Object.keys(state.intake || {}).length;
    const streak = currentStreak();
    const todayW = w.find(e => e.date === todayKey());
    const changeStr = change === null ? '—' : `${change > 0 ? '+' : ''}${change} kg`;
    const changeColor = change === null ? '' : change <= 0 ? 'var(--green)' : '#E2725B';
    const recent = (state.workoutStore.history || []).slice(-6).reverse().map(h => {
      const s = L.sessionById(C, h.session);
      const dt = new Date(h.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
      return `<div class="meal-item"><span class="meal-item-name">${s ? esc(s.emoji + ' ' + s.name) : '💪 Workout'}</span><span class="meal-item-kcal">${dt}</span></div>`;
    }).join('');
    return `<div class="page-head">
        <button class="btn btn-ghost" id="simple-back" style="width:auto;padding:8px 14px">← Zurück</button>
        <h1 class="page-title" style="margin-top:12px">Mein Fortschritt</h1>
        <p class="page-sub">Dranbleiben zahlt sich aus – Schritt für Schritt.</p></div>

      <div class="nutri-grid">
        <div class="nutri"><div class="nutri-val">${last ? last.kg : '—'}${last ? '<span style="font-size:13px"> kg</span>' : ''}</div><div class="nutri-lbl">Gewicht</div></div>
        <div class="nutri"><div class="nutri-val" style="color:${changeColor}">${changeStr}</div><div class="nutri-lbl">Veränderung</div></div>
        <div class="nutri"><div class="nutri-val">🔥 ${streak}</div><div class="nutri-lbl">Tage-Serie</div></div>
        <div class="nutri"><div class="nutri-val">${workouts}</div><div class="nutri-lbl">Workouts</div></div>
      </div>

      <div class="card" style="margin-top:12px">
        <div class="card-title">⚖️ Gewicht</div>
        ${weightChart(w)}
        <div class="kcal-portion" style="margin-top:10px">
          <label>Heute</label>
          <input id="wt-input" inputmode="decimal" value="${todayW ? todayW.kg : ''}" placeholder="kg" />
          <span>kg</span>
          <button class="chat-send" id="wt-save">✓</button>
        </div>
        <p class="muted" style="margin-top:6px">${days} ${days === 1 ? 'Tag' : 'Tage'} mit Kalorien getrackt.</p>
      </div>

      <div class="section-title">Letzte Workouts</div>
      ${recent ? `<div class="card">${recent}</div>` : '<div class="empty-hint"><span class="eh-emoji">💪</span>Noch keine Workouts abgeschlossen. Starte im Training!</div>'}`;
  }

  // ===== Sprachfunktion (Web Speech API, kostenlos, im Browser) =====
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const ttsOk = 'speechSynthesis' in window;

  function startListening() {
    if (!SR) { alert('Spracheingabe wird von diesem Browser nicht unterstützt. Tipp: Chrome oder Safari.'); return; }
    if (state.listening) { stopListening(); return; }
    if (ttsOk) speechSynthesis.cancel();
    const r = new SR();
    recog = r;
    r.lang = 'de-DE'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    state.listening = true;
    const input = document.getElementById('chat-input');
    const mic = document.getElementById('chat-mic');
    if (mic) mic.classList.add('listening');
    if (input) input.placeholder = '🎤 Ich höre zu…';
    r.onresult = e => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; if (input) input.value = t; };
    r.onerror = () => stopListening();
    r.onend = () => {
      const input2 = document.getElementById('chat-input');
      const t = (input2 && input2.value || '').trim();
      state.listening = false;
      const m = document.getElementById('chat-mic'); if (m) m.classList.remove('listening');
      if (input2) input2.placeholder = 'Deine Frage…';
      if (t && !state.chatBusy) sendToKI(t);
    };
    try { r.start(); } catch { stopListening(); }
  }
  function stopListening() {
    state.listening = false;
    const m = document.getElementById('chat-mic'); if (m) m.classList.remove('listening');
    try { recog && recog.stop(); } catch {}
  }
  // Beste deutsche Stimme passend zum Avatar-Geschlecht (best-effort, je nach Gerät).
  function pickVoice(gender) {
    const de = speechSynthesis.getVoices().filter(x => x.lang && x.lang.toLowerCase().startsWith('de'));
    if (!de.length) return null;
    const female = /(anna|petra|hedda|vicki|katja|marlene|female|frau)/i;
    const male = /(yannick|markus|conrad|stefan|male|mann|hans|klaus)/i;
    const re = gender === 'w' ? female : male;
    return de.find(v => re.test(v.name)) || de[0];
  }
  function speak(text) {
    if (!state.voiceOut || !ttsOk) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/\*\*/g, '').replace(/[#>*_`]/g, '').slice(0, 700));
      u.lang = 'de-DE'; u.rate = 1.0;
      const av = coachAvatarById(state.coachAvatar);
      const v = pickVoice(av ? av.gender : 'm');
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch {}
  }

  // ===== KI-Chat =====
  const COACH_SUGGESTIONS = [
    '💪 Erstell mir einen Trainingsplan für diese Woche',
    '🥗 Was soll ich heute essen?',
    '⚖️ Wie nehme ich gesund ab?',
    '🔋 Tipps für mehr Energie im Alltag',
    '🧬 Welche Nährstoffe sind für mich wichtig?'
  ];
  function renderCoachPicker() {
    app.innerHTML = `<div class="screen">
      <div class="page-head">
        <button class="btn btn-ghost" id="ki-back" style="width:auto;padding:8px 14px">← Zurück</button>
        <h1 class="page-title" style="margin-top:12px">Wähle deinen Coach</h1>
        <p class="page-sub">Jeder Coach hat einen eigenen Stil. Du kannst später jederzeit wechseln.</p>
      </div>
      <div class="avatar-grid">
        ${D.coachAvatars.map(a => `<button class="avatar-card" data-avatar="${a.id}">
          <span class="avatar-face g-${a.grad}">${a.emoji}</span>
          <span class="avatar-name">${esc(a.name)}</span>
          <span class="avatar-tag">${esc(a.tag)}</span>
        </button>`).join('')}
      </div></div>`;
    nav.hidden = true;
    document.getElementById('ki-back').onclick = () => { state.route = 'dashboard'; render(); };
    app.querySelectorAll('[data-avatar]').forEach(el => el.onclick = () => {
      state.coachAvatar = el.dataset.avatar; save('gapp.coachAvatar', state.coachAvatar); renderChat();
    });
  }

  function renderChat() {
    const noEndpoint = !D.kiEndpoint;
    // Ohne gewählten Avatar zuerst die Auswahl zeigen.
    if (!state.coachAvatar) { renderCoachPicker(); return; }
    const av = coachAvatarById(state.coachAvatar) || D.coachAvatars[0];
    const msgs = state.chat;
    const list = msgs.length
      ? msgs.map(m => `<div class="bubble ${m.role === 'user' ? 'user' : 'ai'}">${m.role === 'user' ? esc(m.content) : mdLite(m.content)}</div>`).join('')
      : `<div class="empty-hint"><span class="eh-emoji">${av.emoji}</span>Hi, ich bin ${esc(av.name)} – dein Coach für ${esc(av.focus)}. Frag mich zu Training, Ernährung, Nährstoffen oder Motivation.</div>`;
    app.innerHTML = `
      <div class="screen">
        <div class="page-head">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <button class="btn btn-ghost" id="ki-back" style="width:auto;padding:8px 14px">← Zurück</button>
            <div style="display:flex;gap:6px">
              <button class="btn btn-ghost" id="ki-verlauf" style="width:auto;padding:8px 14px">🕘 Verlauf</button>
              ${ttsOk ? `<button class="btn btn-ghost" id="ki-speaker" style="width:auto;padding:8px 14px">${state.voiceOut ? '🔊' : '🔇'}</button>` : ''}
            </div>
          </div>
          <div class="coach-bar">
            <span class="coach-face g-${av.grad}">${av.emoji}</span>
            <div class="coach-meta"><div class="coach-name">${esc(av.name)}</div><div class="coach-tag">${esc(av.tag)}</div></div>
            <button class="link-btn" id="coach-switch">wechseln</button>
          </div>
        </div>
        ${noEndpoint ? '<div class="warn-banner">KI noch nicht verbunden.</div>' : ''}
        ${state.coachConsent ? '' : `<div class="consent-card">
          <div class="card-title">⚕️ Kurz bestätigen</div>
          <p class="muted">Diese App ist <b>kein Arzt</b> und bietet nur Coaching. Für detaillierte Tipps zu Vitalwerten, Vitaminen & Supplements bitte einmal zustimmen.</p>
          <button class="btn btn-green" id="coach-consent" style="margin-top:10px">Ich verstehe – zustimmen</button>
        </div>`}
        <div class="chat-list" id="chat-list">${list}</div>
        ${!msgs.length && !noEndpoint ? `<div class="coach-suggest">${COACH_SUGGESTIONS.map(s => `<button class="suggest-chip" data-suggest="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}
        <div class="chat-input-row">
          ${SR ? `<button class="chat-mic" id="chat-mic" ${noEndpoint ? 'disabled' : ''} aria-label="Sprechen">🎤</button>` : ''}
          <textarea class="chat-input" id="chat-input" rows="1" placeholder="Frag ${esc(av.name)}…" ${noEndpoint ? 'disabled' : ''}></textarea>
          <button class="chat-send" id="chat-send" ${noEndpoint || state.chatBusy ? 'disabled' : ''}>➤</button>
        </div>
      </div>`;
    nav.hidden = true;
    document.getElementById('ki-back').onclick = () => { state.route = 'dashboard'; render(); };
    const kvl = document.getElementById('ki-verlauf');
    if (kvl) kvl.onclick = () => { state.route = 'verlauf'; render(); };
    const csw = document.getElementById('coach-switch');
    if (csw) csw.onclick = () => { state.coachAvatar = null; save('gapp.coachAvatar', null); renderChat(); };
    const cc = document.getElementById('coach-consent');
    if (cc) cc.onclick = () => { state.coachConsent = true; save('gapp.coachConsent', true); renderChat(); };
    if (noEndpoint) return;
    const input = document.getElementById('chat-input'), send = document.getElementById('chat-send'), listEl = document.getElementById('chat-list');
    listEl.scrollTop = listEl.scrollHeight;
    input.oninput = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; };
    const fire = () => { const t = input.value.trim(); if (t && !state.chatBusy) sendToKI(t); };
    send.onclick = fire;
    input.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fire(); } };
    app.querySelectorAll('[data-suggest]').forEach(el => el.onclick = () => { if (!state.chatBusy) sendToKI(el.dataset.suggest); });
    const speaker = document.getElementById('ki-speaker');
    if (speaker) speaker.onclick = () => { state.voiceOut = !state.voiceOut; save('gapp.voice', state.voiceOut); if (!state.voiceOut && ttsOk) speechSynthesis.cancel(); renderChat(); };
    const mic = document.getElementById('chat-mic');
    if (mic) mic.onclick = () => startListening();
    if (state.listening && mic) mic.classList.add('listening');
  }

  async function sendToKI(text) {
    state.chat.push({ role: 'user', content: text });
    state.chatBusy = true; save(STORE.chat, state.chat); renderChat();
    try {
      const p = state.profile;
      const note = p ? `\n\nKontext zum Nutzer: Ziel=${p.goal}, Ernährung=${p.dietType}, Budget=${p.budget}, Zeit/Tag=${p.timePerDay}min, Fitness=${p.fitnessLevel}, Haushalt=${p.householdSize}.` : '';
      const av = coachAvatarById(state.coachAvatar);
      const persona = av ? av.persona + '\n\n' : '';
      const consent = state.coachConsent
        ? '\n\nDer Nutzer hat der Coaching-Einwilligung zugestimmt (App ist kein Arzt, nur Coaching).'
        : '\n\nWICHTIG: Der Nutzer hat der Coaching-Einwilligung NOCH NICHT zugestimmt. Gib daher KEINE detaillierten medizinischen oder Vitalstoff-/Supplement-Empfehlungen. Bleibe bei allgemeinen, sicheren Tipps zu Bewegung und Ernährung und weise freundlich darauf hin, dass detailliertes Vital-Coaching erst nach der Zustimmung oben im Coach möglich ist.';
      const res = await fetch(D.kiEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: state.chat.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.content })), systemInstruction: persona + D.kiSystemPrompt + consent + note })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const reply = data.text || data.reply || 'Keine Antwort erhalten.';
      state.chat.push({ role: 'assistant', content: reply });
      speak(reply);
    } catch {
      state.chat.push({ role: 'assistant', content: '⚠️ Verbindung zur KI fehlgeschlagen. Bitte später nochmal versuchen.' });
    } finally {
      state.chatBusy = false; save(STORE.chat, state.chat); renderChat();
    }
  }

  // ===== Navigation =====
  function renderNav() {
    const active = state.route === 'recipe' ? 'ernaehrung' : state.route;
    nav.innerHTML = D.tabs.map(t => `<button class="nav-item ${active === t.id ? 'active' : ''}" data-tab="${t.id}"><span class="nav-ic">${t.icon}</span>${t.label}</button>`).join('');
    nav.querySelectorAll('.nav-item').forEach(b => b.onclick = () => { state.route = b.dataset.tab; render(); });
  }

  function openRecipe(id) { state.recipeId = id; state.portions = state.plan.servings || state.profile.householdSize || 2; state.recipeBack = state.route; state.route = 'recipe'; render(); }

  function openExercise(id) { state.exerciseId = id; state.route = 'exercise'; render(); }
  function openSession(id) { state.sessionId = id; state.route = 'session'; render(); }
  function openVitamin(id) { state.vitaminId = id; state.route = 'vitamin'; render(); }
  function openFood(id) { state.foodId = id; state.route = 'food'; render(); }

  function bindView() {
    loadWeather();
    const mb = document.getElementById('menu-btn');
    if (mb) mb.onclick = openDrawer;
    app.querySelectorAll('[data-recipe]').forEach(el => el.onclick = () => openRecipe(el.dataset.recipe));
    app.querySelectorAll('[data-ex]').forEach(el => el.onclick = () => openExercise(el.dataset.ex));
    app.querySelectorAll('[data-session]').forEach(el => el.onclick = () => openSession(el.dataset.session));
    app.querySelectorAll('[data-vit]').forEach(el => el.onclick = () => openVitamin(el.dataset.vit));
    app.querySelectorAll('[data-foodopen]').forEach(el => el.onclick = () => openFood(el.dataset.foodopen));
    const wb = document.getElementById('wissen-back');
    if (wb) wb.onclick = () => { state.route = 'dashboard'; render(); openDrawer(); };
    const lb = document.getElementById('lm-back');
    if (lb) lb.onclick = () => { state.route = 'dashboard'; render(); openDrawer(); };
    const sbk = document.getElementById('simple-back');
    if (sbk) sbk.onclick = () => { state.route = 'dashboard'; render(); };
    app.querySelectorAll('[data-go]').forEach(el => el.onclick = () => { state.route = el.dataset.go; render(); });
    app.querySelectorAll('[data-soon]').forEach(el => el.onclick = () => alert(`„${el.querySelector('.row-title').textContent}" kommt in ${el.dataset.soon}. 🙂`));
    const hb = document.getElementById('health-banner');
    if (hb) hb.onclick = () => { state.route = 'wissen'; render(); };
    const energy = app.querySelectorAll('[data-energy]');
    energy.forEach(el => el.onclick = () => { state.energy = el.dataset.energy; render(); });
    const woDone = document.getElementById('wo-done');
    if (woDone) woDone.onclick = () => {
      const wo = ensureWorkout();
      state.workoutStore = L.advanceProgress(C, state.workoutStore, wo.items);
      save(STORE.workout, state.workoutStore);
      state.workout = null;
      render();
    };
    const woRegen = document.getElementById('wo-regen');
    if (woRegen) woRegen.onclick = () => { state.woVariation++; render(); };
    const mk = document.getElementById('make-shop');
    if (mk) mk.onclick = () => {
      const sources = [];
      state.plan.days.forEach(d => d.meals.forEach(m => sources.push({ recipeId: m.recipeId, servings: m.servings })));
      state.shop = { sources, checked: {} }; save(STORE.shop, state.shop);
      state.route = 'einkauf'; render();
    };
    const rg = document.getElementById('regen');
    if (rg) rg.onclick = () => { state.plan = L.generateWeek(C, state.profile); save(STORE.plan, state.plan); render(); };
    const clr = document.getElementById('shop-clear');
    if (clr) clr.onclick = () => { state.shop = { sources: [], checked: {}, extras: [] }; save(STORE.shop, state.shop); render(); };
    app.querySelectorAll('[data-food]').forEach(el => el.onclick = () => {
      const id = el.dataset.food; state.shop.checked[id] = !state.shop.checked[id]; save(STORE.shop, state.shop); render();
    });
    app.querySelectorAll('[data-xcheck]').forEach(el => el.onclick = e => {
      e.stopPropagation(); const k = 'x' + el.dataset.xcheck; state.shop.checked[k] = !state.shop.checked[k]; save(STORE.shop, state.shop); render();
    });
    app.querySelectorAll('[data-xremove]').forEach(el => el.onclick = e => {
      e.stopPropagation(); state.shop.extras.splice(Number(el.dataset.xremove), 1); save(STORE.shop, state.shop); render();
    });
    const scanBtn = document.getElementById('lm-scan');
    if (scanBtn) scanBtn.onclick = () => { state.route = 'scan'; render(); };
    app.querySelectorAll('[data-foodadd]').forEach(el => el.onclick = e => {
      e.stopPropagation(); addFoodToShop(el.dataset.foodadd);
    });
    const search = document.getElementById('lm-search');
    if (search) {
      const apply = () => {
        const q = search.value.trim().toLowerCase();
        state.foodQuery = search.value;
        const catCount = {};
        app.querySelectorAll('[data-foodopen]').forEach(row => {
          const hit = !q || row.dataset.name.includes(q);
          row.style.display = hit ? '' : 'none';
          if (hit) catCount[row.dataset.cat] = (catCount[row.dataset.cat] || 0) + 1;
        });
        app.querySelectorAll('[data-cathead]').forEach(h => { h.style.display = catCount[h.dataset.cathead] ? '' : 'none'; });
        const empty = document.getElementById('lm-empty');
        if (empty) empty.style.display = Object.keys(catCount).length ? 'none' : 'block';
      };
      search.oninput = apply;
      if (state.foodQuery) apply();
    }
    app.querySelectorAll('[data-intakedel]').forEach(el => el.onclick = () => {
      const k = todayKey(); const arr = state.intake[k] || [];
      const ts = Number(el.dataset.intakedel);
      const idx = arr.findIndex(it => it.ts === ts);
      if (idx >= 0) arr.splice(idx, 1);
      if (!arr.length) delete state.intake[k];
      save(STORE.intake, state.intake); render();
    });
    app.querySelectorAll('[data-glass]').forEach(el => el.onclick = () => {
      const i = Number(el.dataset.glass), k = todayKey(), cur = state.water[k] || 0;
      const next = (i + 1 === cur) ? i : i + 1; // erneutes Tippen aufs letzte volle Glas leert es wieder
      if (next > 0) state.water[k] = next; else delete state.water[k];
      save(STORE.water, state.water); render();
    });
    const wtSave = document.getElementById('wt-save');
    if (wtSave) wtSave.onclick = () => {
      const v = parseFloat((document.getElementById('wt-input').value || '').replace(',', '.'));
      if (!v || v <= 0 || v > 400) { toast('Bitte gültiges Gewicht eingeben'); return; }
      const k = todayKey();
      state.weight = (state.weight || []).filter(e => e.date !== k);
      state.weight.push({ date: k, kg: Math.round(v * 10) / 10 });
      save(STORE.weight, state.weight);
      toast('✓ Gewicht gespeichert'); render();
    };
    const manualToggle = document.getElementById('manual-toggle');
    if (manualToggle) manualToggle.onclick = () => { state.manualOpen = !state.manualOpen; render(); };
    app.querySelectorAll('[data-trackcat]').forEach(el => el.onclick = () => { state.trackerCat = el.dataset.trackcat; state.manualOpen = true; render(); });
    app.querySelectorAll('[data-mealadd]').forEach(el => el.onclick = () => {
      state.trackerCat = el.dataset.mealadd; state.manualOpen = true; render();
      const mf = document.getElementById('manual-form'); if (mf) mf.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    const manualAdd = document.getElementById('manual-add');
    if (manualAdd) manualAdd.onclick = () => {
      const name = (document.getElementById('manual-name').value || '').trim();
      const kcal = Number(document.getElementById('manual-kcal').value);
      if (!name || !kcal || kcal <= 0) { toast('Bitte Name und kcal eingeben'); return; }
      addIntake(name, kcal, state.trackerCat || mealCatByTime());
      state.manualOpen = false; state.trackerCat = null; render();
    };
    const goalBtn = document.getElementById('cal-goal-save');
    if (goalBtn) goalBtn.onclick = () => {
      const v = Number(document.getElementById('cal-goal-input').value);
      state.calGoal = (v && v > 0) ? Math.round(v) : null;
      save(STORE.calGoal, state.calGoal); render();
    };
    const goalEdit = document.getElementById('cal-goal-edit');
    if (goalEdit) goalEdit.onclick = () => { const ed = document.getElementById('cal-goal-editor'); if (ed) { ed.hidden = !ed.hidden; if (!ed.hidden) ed.querySelector('input').focus(); } };
    const trackerClear = document.getElementById('intake-clear');
    if (trackerClear) trackerClear.onclick = () => {
      if (confirm('Heutige Einträge löschen?')) { delete state.intake[todayKey()]; save(STORE.intake, state.intake); render(); }
    };
    app.querySelectorAll('[data-verlaufdel]').forEach(el => el.onclick = () => {
      const i = Number(el.dataset.verlaufdel);
      state.chat.splice(i, 2); // Frage + Antwort-Paar entfernen
      save(STORE.chat, state.chat); render();
    });
    const verlaufClear = document.getElementById('verlauf-clear');
    if (verlaufClear) verlaufClear.onclick = () => {
      if (confirm('Gesamten KI-Verlauf löschen?')) { state.chat = []; save(STORE.chat, state.chat); render(); }
    };
  }

  // ===== Start =====
  function boot() {
    render();
    const scrim = document.getElementById('drawer-scrim');
    if (scrim) scrim.onclick = closeDrawer;
    const splash = document.getElementById('splash');
    setTimeout(() => { splash.classList.add('hide'); setTimeout(() => splash.remove(), 500); }, 900);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
