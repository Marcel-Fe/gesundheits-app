/* Gesundheits-App — Wissen: Nährstoffe & Vitamine
   © 2026 Marcel Fehse. Alle Rechte vorbehalten. */
'use strict';

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
