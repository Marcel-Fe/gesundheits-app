/* Gesundheits-App — Ernährung: Wochenplan, Rezepte, Einkauf & Lebensmittel-DB
   © 2026 Marcel Fehse. Alle Rechte vorbehalten. */
'use strict';

function renderErnaehrung() {
  const today = L.todayIndex(state.plan);
  const ws = state.plan.weekStart;
  const days = state.plan.days.map((day, i) => {
    const date = new Date(ws + i * 86400000);
    const wd = i === today ? 'Heute' : date.toLocaleDateString('de-DE', { weekday: 'long' });
    const rows = day.meals.map(m => {
      const r = recipeById(m.recipeId);
      const n = L.recipeNutrients(C, r).perServing;
      return `<div class="swap-row">
        <button class="row-card" data-recipe="${r.id}">
          ${thumb('row-thumb', r.grad, r.emoji, r.id)}
          <div class="row-main"><div class="row-title">${esc(r.name)}</div>
            <div class="row-sub">${SLOT[m.slot]} · ${Math.round(n.kcal)} kcal · ${m.servings} Port.</div></div>
          <div class="row-chev">›</div></button>
        <button class="swap-btn" data-swapday="${i}" data-swapslot="${m.slot}" aria-label="${esc(r.name)} tauschen">🔄</button>
      </div>`;
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

function shoppingListText() {
  const rows = L.aggregateShopping(C, state.shop.sources).filter(r => !state.shop.checked[r.foodId]);
  const extras = (state.shop.extras || []).filter((e, i) => !state.shop.checked['x' + i]);
  const lines = [];
  let lastCat = null;
  for (const r of rows) {
    if (r.cat !== lastCat) { lines.push(`${lines.length ? '\n' : ''}${r.cat}:`); lastCat = r.cat; }
    lines.push(`• ${r.name} – ${L.formatAmount(r.amount, r.unit)}`);
  }
  if (extras.length) {
    lines.push(`${lines.length ? '\n' : ''}Extra:`);
    extras.forEach(e => lines.push(`• ${e.name}`));
  }
  if (!lines.length) return null;
  return `🛒 Einkaufsliste (${rows.length + extras.length} Artikel)\n\n${lines.join('\n')}`;
}
async function shareShoppingList() {
  const text = shoppingListText();
  if (!text) { toast('Alles abgehakt – nichts zu teilen 🎉'); return; }
  if (navigator.share) {
    try { await navigator.share({ title: 'Einkaufsliste', text }); return; } catch { /* abgebrochen → Fallback */ }
  }
  try { await navigator.clipboard.writeText(text); toast('✓ Liste kopiert'); }
  catch { toast('Teilen nicht möglich'); }
}
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
    <button class="btn btn-green" id="shop-share" style="margin-top:20px">📤 Liste teilen</button>
    <button class="btn btn-ghost" id="shop-clear" style="margin-top:10px">Liste leeren</button>`;
}

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
