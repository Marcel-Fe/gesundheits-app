/* Gesundheits-App — App-Logik (Phase 1)
   © 2026 Marcel Fehse. Alle Rechte vorbehalten.

   Eine Zustandsmaschine (state) + render(). Inhalte: window.GCONTENT,
   Berechnungen: window.GLOGIC. Nutzerdaten in localStorage (offline-first). */

(function () {
  'use strict';

  const D = window.GDATA;
  const C = window.GCONTENT;
  const L = window.GLOGIC;
  const STORE = { profile: 'gapp.profile', chat: 'gapp.chat', plan: 'gapp.plan', shop: 'gapp.shop' };

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
    recipeId: null, recipeBack: 'ernaehrung', portions: 2
  };

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mdLite = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const recipeById = id => C.recipes.find(r => r.id === id);
  const SLOT = { breakfast: 'Frühstück', lunch: 'Mittag', dinner: 'Abend' };

  const app = document.getElementById('app');
  const nav = document.getElementById('bottom-nav');

  // ===== Dispatcher =====
  function render() {
    if (!state.profile) { renderOnboarding(); nav.hidden = true; return; }
    if (!state.plan) { state.plan = L.generateWeek(C, state.profile); save(STORE.plan, state.plan); }
    if (state.route === 'ki') { renderChat(); return; }
    if (state.route === 'recipe') { renderRecipe(); nav.hidden = false; renderNav(); return; }
    nav.hidden = false;
    renderNav();
    const view = { dashboard: renderDashboard, ernaehrung: renderErnaehrung, training: renderTraining, einkauf: renderEinkauf, mehr: renderMehr }[state.route] || renderDashboard;
    app.innerHTML = `<div class="screen">${view()}</div>`;
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

  function renderDashboard() {
    const p = state.profile;
    const idx = L.todayIndex(state.plan);
    const day = state.plan.days[idx];
    const meals = day.meals.map(m => ({ m, r: recipeById(m.recipeId), n: L.recipeNutrients(C, recipeById(m.recipeId)).perServing }));
    const dayKcal = Math.round(meals.reduce((s, x) => s + x.n.kcal, 0));
    const shopCount = L.aggregateShopping(C, state.shop.sources).length;
    let i = 0; const di = () => `style="--i:${i++}"`;
    return `<div class="stagger">
      <div class="greet" ${di()}>
        <h1 class="greet-hi">${greeting()}! 👋</h1>
        <p class="greet-sub">Dein Tag für „${esc(labelFor('goal', p.goal))}" — einfach, günstig, machbar.</p>
      </div>

      <div class="stats" ${di()}>
        <div class="stat"><div class="stat-ic">🔥</div><div class="stat-val">${dayKcal}</div><div class="stat-lbl">kcal heute</div></div>
        <div class="stat"><div class="stat-ic">⏱️</div><div class="stat-val">${esc(p.timePerDay)}′</div><div class="stat-lbl">Workout</div></div>
        <div class="stat"><div class="stat-ic">🛒</div><div class="stat-val">${shopCount}</div><div class="stat-lbl">Einkauf</div></div>
      </div>

      <div ${di()}>
        <div class="section-title">Heute essen</div>
        <div class="h-scroll">
          ${meals.map(x => `
            <button class="meal-card" data-recipe="${x.r.id}">
              <div class="meal-thumb g-${x.r.grad}">${x.r.emoji}</div>
              <div class="meal-body">
                <div class="meal-slot">${SLOT[x.m.slot]}</div>
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

      <div class="card" ${di()} style="margin-top:16px">
        <div class="card-title">💪 Heutiges Workout</div>
        <p class="muted">Dein Home-Workout (${esc(labelFor('timePerDay', p.timePerDay))}) kommt in <b>Phase 2</b> — mit Bildern und Technik.</p>
      </div>
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
          <div class="row-thumb g-${r.grad}">${r.emoji}</div>
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
      <div class="recipe-hero g-${r.grad}">${r.emoji}</div>
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

  // ===== Einkaufsliste =====
  function renderEinkauf() {
    const rows = L.aggregateShopping(C, state.shop.sources);
    if (!rows.length) {
      return `<div class="page-head"><h1 class="page-title">Einkaufsliste</h1></div>
        <div class="empty-hint"><span class="eh-emoji">🛒</span>Noch leer. Erstelle im Wochenplan einen „Wocheneinkauf" oder füge ein Rezept hinzu.</div>`;
    }
    rows.forEach(r => r.checked = !!state.shop.checked[r.foodId]);
    const total = rows.reduce((s, r) => s + r.price, 0);
    const open = rows.filter(r => !r.checked).reduce((s, r) => s + r.price, 0);
    // nach Kategorie gruppieren (rows sind bereits sortiert)
    let html = '', lastCat = null;
    for (const r of rows) {
      if (r.cat !== lastCat) { html += `<div class="shop-cat">${esc(r.cat)}</div>`; lastCat = r.cat; }
      html += `<div class="shop-item ${r.checked ? 'done' : ''}" data-food="${r.foodId}">
        <div class="shop-check ${r.checked ? 'on' : ''}">${r.checked ? '✓' : ''}</div>
        <span class="ingr-name" style="flex:1"><span class="emoji">${r.emoji}</span>${esc(r.name)}</span>
        <span class="ingr-amt">${L.formatAmount(r.amount, r.unit)}</span></div>`;
    }
    return `
      <div class="page-head"><h1 class="page-title">Einkaufsliste</h1>
        <p class="page-sub">${rows.length} Artikel · gleiche Produkte zusammengeführt</p></div>
      <div class="budget-bar"><div><div class="muted">Geschätzte Kosten</div><b>${total.toFixed(2).replace('.', ',')} €</b></div>
        <div style="text-align:right"><div class="muted">noch offen</div><b style="color:var(--green)">${open.toFixed(2).replace('.', ',')} €</b></div></div>
      ${html}
      <button class="btn btn-ghost" id="shop-clear" style="margin-top:20px">Liste leeren</button>`;
  }

  function renderTraining() {
    return `<div class="page-head"><h1 class="page-title">Training</h1></div>
      <div class="empty-hint"><span class="eh-emoji">💪</span>Der Home-Workout-Generator mit Bildern kommt in Phase 2.</div>`;
  }

  function renderMehr() {
    return `<div class="page-head"><h1 class="page-title">Mehr</h1></div>
      <button class="btn" id="go-ki">🤖 Gesundheits-Coach (KI)</button>
      <div style="height:12px"></div>
      <div class="card"><div class="card-title">⚙️ Profil & Plan</div>
        <p class="muted">Onboarding neu starten erzeugt auch einen neuen Plan.</p>
        <div style="height:10px"></div>
        <button class="btn btn-ghost" id="reset-profile">Onboarding neu starten</button></div>
      <p class="muted" style="text-align:center;margin-top:24px">Gesundheits-App · Phase 1 · © 2026 Marcel Fehse</p>`;
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
          <button class="btn btn-ghost" id="ki-back" style="width:auto;padding:8px 14px">← Zurück</button>
          <h1 class="page-title" style="margin-top:12px">Gesundheits-Coach</h1>
        </div>
        ${noEndpoint ? '<div class="warn-banner">KI noch nicht verbunden.</div>' : ''}
        <div class="warn-banner">Hinweis: Ich ersetze keine ärztliche Beratung. Bei Beschwerden bitte Arzt/Ärztin fragen.</div>
        <div class="chat-list" id="chat-list">${list}</div>
        <div class="chat-input-row">
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
      state.chat.push({ role: 'assistant', content: data.text || data.reply || 'Keine Antwort erhalten.' });
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

  function bindView() {
    app.querySelectorAll('[data-recipe]').forEach(el => el.onclick = () => openRecipe(el.dataset.recipe));
    app.querySelectorAll('[data-go]').forEach(el => el.onclick = () => { state.route = el.dataset.go; render(); });
    const ki = document.getElementById('go-ki');
    if (ki) ki.onclick = () => { state.route = 'ki'; renderChat(); };
    const reset = document.getElementById('reset-profile');
    if (reset) reset.onclick = () => {
      if (confirm('Profil zurücksetzen und Onboarding neu starten?')) {
        state.profile = null; state.plan = null; state.onbStep = 0; state.onbDraft = {};
        localStorage.removeItem(STORE.profile); localStorage.removeItem(STORE.plan);
        render();
      }
    };
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
    if (clr) clr.onclick = () => { state.shop = { sources: [], checked: {} }; save(STORE.shop, state.shop); render(); };
    app.querySelectorAll('[data-food]').forEach(el => el.onclick = () => {
      const id = el.dataset.food; state.shop.checked[id] = !state.shop.checked[id]; save(STORE.shop, state.shop); render();
    });
  }

  // ===== Start =====
  function boot() {
    render();
    const splash = document.getElementById('splash');
    setTimeout(() => { splash.classList.add('hide'); setTimeout(() => splash.remove(), 500); }, 900);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
