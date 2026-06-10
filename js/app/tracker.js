/* Gesundheits-App — Tracker: Kalorien, Wasser, Barcode-Scanner & Fortschritt
   © 2026 Marcel Fehse. Alle Rechte vorbehalten. */
'use strict';

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
