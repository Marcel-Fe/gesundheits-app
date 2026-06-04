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
  const STORE = { profile: 'gapp.profile', chat: 'gapp.chat', plan: 'gapp.plan', shop: 'gapp.shop', workout: 'gapp.workout' };

  const load = (key, fb) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; } };
  const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.warn('save fehlgeschlagen', e); } };

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
    voiceOut: load('gapp.voice', false), listening: false
  };
  let recog = null;
  let scanStream = null, scanReader = null, scanLoop = null;
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

  // ===== Fotos (LoremFlickr Keyword-Bilder, Emoji als Fallback) =====
  const PHOTO_KW = {
    // Rezepte
    oat_bowl: 'oatmeal,berries', quark_apple: 'quark,apple', scrambled: 'scrambled,eggs',
    lentil_stew: 'lentil,stew', chickpea_curry: 'chickpea,curry', veggie_pasta: 'vegetable,pasta',
    potato_pan: 'potato,vegetables', chicken_rice: 'chicken,rice', bolognese: 'spaghetti,bolognese',
    tuna_salad: 'tuna,salad', tofu_veg: 'tofu,vegetables', yogurt_snack: 'yogurt,berries',
    // Lebensmittel
    oats: 'oatmeal', rice: 'rice', pasta: 'pasta', potato: 'potatoes', bread: 'wholegrain,bread',
    egg: 'eggs', lentils: 'lentils', chickpeas: 'chickpeas', beans: 'kidney,beans', quark: 'quark,cheese',
    yogurt: 'yogurt', milk: 'milk', cheese: 'gouda,cheese', tofu: 'tofu', chicken: 'chicken,breast',
    mince: 'minced,meat', tuna: 'tuna,can', onion: 'onion', garlic: 'garlic', carrot: 'carrots',
    tomato: 'tomatoes', canned_tomato: 'tomato,sauce', pepper: 'bell,pepper', spinach: 'spinach',
    broccoli: 'broccoli', zucchini: 'zucchini', banana: 'banana', apple: 'apple', berries: 'berries',
    oil: 'olive,oil', walnuts: 'walnuts'
  };
  function photoUrl(id) {
    const kw = PHOTO_KW[id]; if (!kw) return null;
    let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return `https://loremflickr.com/400/300/${kw}?lock=${h % 100000}`;
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
    if (!state.profile) { renderOnboarding(); nav.hidden = true; return; }
    if (!state.plan) { state.plan = L.generateWeek(C, state.profile); save(STORE.plan, state.plan); }
    if (state.route === 'ki') { renderChat(); return; }
    if (state.route === 'recipe') { renderRecipe(); nav.hidden = false; renderNav(); return; }
    if (state.route === 'exercise') { renderExercise(); nav.hidden = false; renderNav(); return; }
    if (state.route === 'session') { renderSession(); nav.hidden = false; renderNav(); return; }
    if (state.route === 'wissen') { app.innerHTML = `<div class="screen">${renderWissen()}</div>`; nav.hidden = false; renderNav(); bindView(); return; }
    if (state.route === 'vitamin') { renderVitamin(); nav.hidden = false; renderNav(); return; }
    if (state.route === 'lebensmittel') { app.innerHTML = `<div class="screen">${renderLebensmittel()}</div>`; nav.hidden = false; renderNav(); bindView(); return; }
    if (state.route === 'food') { renderFood(); nav.hidden = false; renderNav(); return; }
    if (state.route === 'scan') { renderScan(); nav.hidden = false; renderNav(); return; }
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
    const dayKcal = Math.round(meals.reduce((s, x) => s + x.n.kcal, 0));
    const shopCount = L.aggregateShopping(C, state.shop.sources).length;
    const tip = tipOfDay();
    const wo = ensureWorkout();
    const woDone = doneToday();
    let i = 0; const di = () => `style="--i:${i++}"`;
    return `<div class="stagger">
      <div class="greet" ${di()}>
        <h1 class="greet-hi">${greeting()}! 👋</h1>
        <p class="greet-weather" id="greet-weather">📍 Wetter & Bewegungstipp laden…</p>
        <p class="greet-quote">„${esc(quoteOfHour())}"</p>
      </div>

      <div class="stats" ${di()}>
        <div class="stat"><div class="stat-ic">🔥</div><div class="stat-val">${dayKcal}</div><div class="stat-lbl">kcal heute</div></div>
        <div class="stat"><div class="stat-ic">⏱️</div><div class="stat-val">${esc(p.timePerDay)}′</div><div class="stat-lbl">Workout</div></div>
        <div class="stat"><div class="stat-ic">🛒</div><div class="stat-val">${shopCount}</div><div class="stat-lbl">Einkauf</div></div>
      </div>

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
      <div class="section-title" style="margin-top:0">Übungen</div>
      ${items}
      <button class="btn btn-green" id="ses-done" style="margin-top:8px">✅ Session abschließen</button>
    </div>`;
    document.getElementById('ses-back').onclick = () => { state.route = 'training'; render(); };
    app.querySelectorAll('[data-ex]').forEach(el => el.onclick = () => openExercise(el.dataset.ex));
    document.getElementById('ses-done').onclick = () => {
      state.workoutStore = { progress: state.workoutStore.progress || {}, history: [...(state.workoutStore.history || []), { date: Date.now(), count: s.items.length, session: s.id }] };
      save(STORE.workout, state.workoutStore);
      state.workout = null;
      state.route = 'training'; render();
    };
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
      <div class="card"><div class="card-title">💡 Tipps</div><ul class="steps-ol" style="list-style:disc">${n.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
    </div>`;
    document.getElementById('vit-back').onclick = () => { state.route = 'wissen'; render(); };
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
    app.innerHTML = `<div class="screen">
      <div class="page-head"><button class="btn btn-ghost" id="ex-back" style="width:auto;padding:8px 14px">← Zurück</button></div>
      <div class="recipe-hero g-${ex.grad}">${ex.emoji}</div>
      <h1 class="page-title">${esc(ex.name)}</h1>
      <p class="page-sub">${GROUP_LABEL[ex.group] || ''} · ${ex.equipment === 'none' ? 'ohne Geräte' : 'wenig Equipment'}</p>
      <div class="card" style="margin-top:12px"><div class="card-title">🎯 Heute</div><p class="muted">${target}</p></div>
      <div class="card"><div class="card-title">📋 So geht's</div><p class="muted">${esc(ex.technique)}</p></div>
      ${next ? `<p class="muted" style="text-align:center">Wird's zu leicht? Nächste Stufe: <b>${esc(next.name)}</b></p>` : ''}
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
        { ic: '📈', t: `Fortschritt (${total} Workouts)`, go: 'training' }
      ] },
      { head: '🛒 Einkaufen', items: [ { ic: '🧾', t: 'Einkaufsliste', go: 'einkauf' } ] },
      { head: '📘 Wissen', items: [
        { ic: '🔆', t: 'Vitamine & Nährstoffe', go: 'wissen' },
        { ic: '🧬', t: 'Kombinationen & Tipps', go: 'wissen' }
      ] },
      { head: '🤖 Coach', items: [ { ic: '💬', t: 'Gesundheits-Coach (KI)', go: 'ki' } ] },
      { head: '⚙️ Einstellungen', items: [ { ic: '🔄', t: 'Onboarding neu starten', reset: true } ] }
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
  function renderLebensmittel() {
    const cats = [...new Set(C.foods.map(f => f.cat))];
    let html = '';
    for (const cat of cats) {
      const list = C.foods.filter(f => f.cat === cat);
      html += `<div class="menu-head" style="margin-top:18px">${esc(cat)}</div>`;
      html += list.map(f => `<button class="row-card" data-foodopen="${f.id}">
        ${thumb('row-thumb', gradForCat(f.cat), f.emoji, f.id)}
        <div class="row-main"><div class="row-title">${esc(f.name)}</div>
          <div class="row-sub">${Math.round(f.nutr.kcal)} kcal · ${Math.round(f.nutr.protein)} g Eiweiß / 100 g</div></div>
        <div class="row-chev">›</div></button>`).join('');
    }
    return `<div class="page-head">
        <button class="btn btn-ghost" id="lm-back" style="width:auto;padding:8px 14px">← Zurück</button>
        <h1 class="page-title" style="margin-top:12px">Lebensmittel</h1>
        <p class="page-sub">${C.foods.length} Lebensmittel · Nährwerte, Preis & Sättigung</p></div>
      <button class="btn btn-green" id="lm-scan" style="margin-bottom:16px">📷 Produkt-Barcode scannen</button>
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

      ${recipeIdeas.length ? `<div class="section-title">Rezeptideen</div>${recipeIdeas.map(r => `<button class="row-card" data-recipe="${r.id}">${thumb('row-thumb', r.grad, r.emoji, r.id)}<div class="row-main"><div class="row-title">${esc(r.name)}</div><div class="row-sub">${r.prepMinutes} Min</div></div><div class="row-chev">›</div></button>`).join('')}` : ''}
    </div>`;
    document.getElementById('food-back').onclick = () => { state.route = 'lebensmittel'; render(); };
    app.querySelectorAll('[data-recipe]').forEach(el => el.onclick = () => openRecipe(el.dataset.recipe));
  }

  const CAT_GRAD = { 'Getreide': 'amber', 'Gemüse': 'sage', 'Obst': 'sunrise', 'Protein': 'terracotta', 'Milch': 'peach', 'Vorrat': 'amber' };
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
      ${supportsCam ? `<div class="scan-box"><video id="scan-video" playsinline muted></video><div class="scan-line"></div></div>
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
  async function startScan() {
    const video = document.getElementById('scan-video');
    if (!video) return;
    try { scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); video.srcObject = scanStream; await video.play(); }
    catch { setScanInfo('Kamera-Zugriff nicht möglich. Bitte Barcode eingeben.'); return; }
    setScanInfo('📷 Halte den Barcode in den Rahmen…');
    if ('BarcodeDetector' in window) {
      const det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
      scanLoop = setInterval(async () => {
        try { const codes = await det.detect(video); if (codes && codes.length) { const c = codes[0].rawValue; stopScan(); lookupBarcode(c); } } catch {}
      }, 600);
    } else {
      try {
        const mod = await import('https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm');
        scanReader = new mod.BrowserMultiFormatReader();
        scanReader.decodeFromVideoElement(video, result => { if (result) { const c = result.getText(); stopScan(); lookupBarcode(c); } });
      } catch { setScanInfo('Scanner konnte nicht geladen werden. Bitte Barcode eingeben.'); }
    }
  }
  function stopScan() {
    if (scanLoop) { clearInterval(scanLoop); scanLoop = null; }
    if (scanReader) { try { scanReader.reset(); } catch {} scanReader = null; }
    if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
  }
  async function lookupBarcode(code) {
    setScanInfo('🔎 Suche Produkt…');
    try {
      const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,nutriments,image_front_small_url,nutriscore_grade`);
      const j = await r.json();
      if (!j.product || j.status === 0) { setScanInfo('Kein Produkt gefunden. Bitte anderen Barcode versuchen.'); return; }
      renderScanResult(j.product);
    } catch { setScanInfo('Suche fehlgeschlagen – bitte Internet prüfen.'); }
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
        <button class="btn btn-green" id="scan-add">🛒 Zur Einkaufsliste</button>
      </div>`;
    document.getElementById('scan-add').onclick = () => {
      state.shop.extras.push({ name });
      save(STORE.shop, state.shop);
      setScanInfo('✓ Zur Einkaufsliste hinzugefügt.');
    };
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
  function speak(text) {
    if (!state.voiceOut || !ttsOk) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/\*\*/g, '').replace(/[#>*_`]/g, '').slice(0, 700));
      u.lang = 'de-DE'; u.rate = 1.0;
      const v = speechSynthesis.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith('de'));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch {}
  }

  // ===== KI-Chat =====
  function renderChat() {
    const msgs = state.chat;
    const list = msgs.length
      ? msgs.map(m => `<div class="bubble ${m.role === 'user' ? 'user' : 'ai'}">${m.role === 'user' ? esc(m.content) : mdLite(m.content)}</div>`).join('')
      : '<div class="empty-hint"><span class="eh-emoji">🤖</span>Frag mich zu Ernährung, Nährstoffen oder Training. Ich antworte einfach und faktenbasiert.</div>';
    const noEndpoint = !D.kiEndpoint;
    app.innerHTML = `
      <div class="screen">
        <div class="page-head">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <button class="btn btn-ghost" id="ki-back" style="width:auto;padding:8px 14px">← Zurück</button>
            ${ttsOk ? `<button class="btn btn-ghost" id="ki-speaker" style="width:auto;padding:8px 14px">${state.voiceOut ? '🔊 Vorlesen an' : '🔇 Vorlesen aus'}</button>` : ''}
          </div>
          <h1 class="page-title" style="margin-top:12px">Gesundheits-Coach</h1>
          ${SR ? '<p class="page-sub">Tippe aufs 🎤 und sprich – ich höre zu und antworte.</p>' : ''}
        </div>
        ${noEndpoint ? '<div class="warn-banner">KI noch nicht verbunden.</div>' : ''}
        <div class="warn-banner">Hinweis: Ich ersetze keine ärztliche Beratung. Bei Beschwerden bitte Arzt/Ärztin fragen.</div>
        <div class="chat-list" id="chat-list">${list}</div>
        <div class="chat-input-row">
          ${SR ? `<button class="chat-mic" id="chat-mic" ${noEndpoint ? 'disabled' : ''} aria-label="Sprechen">🎤</button>` : ''}
          <textarea class="chat-input" id="chat-input" rows="1" placeholder="Deine Frage…" ${noEndpoint ? 'disabled' : ''}></textarea>
          <button class="chat-send" id="chat-send" ${noEndpoint || state.chatBusy ? 'disabled' : ''}>➤</button>
        </div>
      </div>`;
    nav.hidden = true;
    document.getElementById('ki-back').onclick = () => { state.route = 'dashboard'; render(); };
    if (noEndpoint) return;
    const input = document.getElementById('chat-input'), send = document.getElementById('chat-send'), listEl = document.getElementById('chat-list');
    listEl.scrollTop = listEl.scrollHeight;
    input.oninput = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; };
    const fire = () => { const t = input.value.trim(); if (t && !state.chatBusy) sendToKI(t); };
    send.onclick = fire;
    input.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fire(); } };
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
      const res = await fetch(D.kiEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: state.chat.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.content })), systemInstruction: D.kiSystemPrompt + note })
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
    if (wb) wb.onclick = () => { state.route = 'dashboard'; render(); };
    const lb = document.getElementById('lm-back');
    if (lb) lb.onclick = () => { state.route = 'dashboard'; render(); };
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
