/* Gesundheits-App — Navigation, Drawer, Event-Binding & Boot
   © 2026 Marcel Fehse. Alle Rechte vorbehalten. */
'use strict';

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
  // Coach-Begrüßung: Stimmung wählen → Workout anpassen + persönlichen Dialog starten
  const ct = document.getElementById('coach-talk');
  if (ct) ct.onclick = () => { ttsUnlock(); state.route = 'ki'; render(); };
  app.querySelectorAll('[data-mood]').forEach(el => el.onclick = () => {
    const mood = el.dataset.mood;
    state.mood[todayKey()] = mood; save(STORE.mood, state.mood);
    state.energy = mood === 'tired' ? 'low' : mood === 'super' ? 'high' : 'normal';
    state.workout = null; // Workout an die Tagesform anpassen
    ttsUnlock();
    state.route = 'ki'; render();
    const msg = {
      super: 'Mir geht es heute super und ich bin voller Energie! Wie nutze ich den Schwung heute am besten?',
      okay: 'Mir geht es heute ganz okay. Was empfiehlst du mir für heute?',
      tired: 'Ich bin heute ziemlich müde und schlapp. Was kann ich heute trotzdem Gutes für mich tun?'
    }[mood];
    if (D.kiEndpoint && msg && !state.chatBusy) sendToKI(msg);
  });
  const mb = document.getElementById('menu-btn');
  if (mb) mb.onclick = openDrawer;
  app.querySelectorAll('[data-recipe]').forEach(el => el.onclick = () => openRecipe(el.dataset.recipe));
  app.querySelectorAll('[data-logrecipe]').forEach(el => el.onclick = () => {
    const r = recipeById(el.dataset.logrecipe); if (!r) return;
    const n = L.recipeNutrients(C, r).perServing;
    const cat = (r.category === 'breakfast' || r.category === 'lunch' || r.category === 'dinner') ? r.category : mealCatByTime();
    addIntake(r.name, n.kcal, cat, { c: n.carbs, p: n.protein, f: n.fat });
    render(); // Cockpit (kcal übrig) sofort aktualisieren
  });
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
  app.querySelectorAll('[data-swapday]').forEach(el => el.onclick = () => {
    const id = L.swapMeal(C, state.profile, state.plan, Number(el.dataset.swapday), el.dataset.swapslot);
    if (!id) { toast('Kein anderes Rezept verfügbar'); return; }
    save(STORE.plan, state.plan); render();
    toast(`🔄 ${recipeById(id).name}`);
  });
  const clr = document.getElementById('shop-clear');
  if (clr) clr.onclick = () => { state.shop = { sources: [], checked: {}, extras: [] }; save(STORE.shop, state.shop); render(); };
  const shr = document.getElementById('shop-share');
  if (shr) shr.onclick = shareShoppingList;
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
