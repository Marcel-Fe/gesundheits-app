/* Gesundheits-App — App-Logik (Phase 0: Fundament)
   © 2026 Marcel Fehse. Alle Rechte vorbehalten.

   Aufbau: eine Zustandsmaschine (state) + render(). Jede Aktion ändert state
   und ruft render() auf. localStorage hält die Nutzerdaten (offline-first). */

(function () {
  'use strict';

  const D = window.GDATA;
  const STORE = {
    profile: 'gapp.profile',
    chat: 'gapp.chat'
  };

  // ===== Persistenz =====
  const load = (key, fallback) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  };
  const save = (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.warn('save fehlgeschlagen', e); }
  };

  // ===== Zustand =====
  const state = {
    route: 'dashboard',                 // aktiver Tab
    profile: load(STORE.profile, null), // null => Onboarding nötig
    onbStep: 0,
    onbDraft: {},
    chat: load(STORE.chat, []),
    chatBusy: false
  };

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Leichte Markdown-Darstellung für KI-Antworten (nur **fett**, sicher escaped)
  const mdLite = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  const app = document.getElementById('app');
  const nav = document.getElementById('bottom-nav');

  // ===== Render-Dispatcher =====
  function render() {
    if (!state.profile) { renderOnboarding(); nav.hidden = true; return; }
    if (state.route === 'ki') { renderChat(); return; }
    nav.hidden = false;
    renderNav();
    const view = {
      dashboard: renderDashboard,
      ernaehrung: renderErnaehrung,
      training: renderTraining,
      einkauf: renderEinkauf,
      mehr: renderMehr
    }[state.route] || renderDashboard;
    app.innerHTML = `<div class="screen">${view()}</div>`;
    bindView();
  }

  // ===== Onboarding =====
  function renderOnboarding() {
    const steps = D.onboarding;
    const step = steps[state.onbStep];
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
          <button class="btn" id="ob-next" ${sel === undefined ? 'disabled' : ''}>
            ${state.onbStep === steps.length - 1 ? 'Plan erstellen' : 'Weiter'}
          </button>
        </div>
      </div>`;

    app.querySelectorAll('.ob-option').forEach(btn => {
      btn.onclick = () => {
        const raw = btn.dataset.val;
        const num = Number(raw);
        state.onbDraft[step.key] = (raw !== '' && !isNaN(num)) ? num : raw;
        renderOnboarding();
      };
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
    save(STORE.profile, state.profile);
    state.route = 'dashboard';
    render();
  }

  // ===== Profil-Hilfen (Labels für Anzeige) =====
  function labelFor(key, value) {
    const step = D.onboarding.find(s => s.key === key);
    const opt = step && step.options.find(o => String(o.value) === String(value));
    return opt ? opt.label : value;
  }

  // ===== Tab-Views =====
  function renderDashboard() {
    const p = state.profile;
    return `
      <div class="page-head">
        <h1 class="page-title">Hallo! 👋</h1>
        <p class="page-sub">Dein Plan ist auf dich zugeschnitten.</p>
      </div>
      <div class="card hero">
        <div class="card-title">Dein Profil</div>
        <div>
          <span class="pill">${esc(labelFor('goal', p.goal))}</span>
          <span class="pill">${esc(labelFor('dietType', p.dietType))}</span>
          <span class="pill">${esc(labelFor('timePerDay', p.timePerDay))}</span>
          <span class="pill">${esc(labelFor('budget', p.budget))}</span>
          <span class="pill">${esc(labelFor('householdSize', p.householdSize))}</span>
        </div>
      </div>
      <div class="card">
        <div class="card-title">🥗 Heutige Mahlzeiten</div>
        <p class="muted">Kommt in <b>Phase 1</b>: persönlicher Wochenplan mit Bildern, Nährwerten und Einkaufsliste.</p>
      </div>
      <div class="card">
        <div class="card-title">💪 Heutiges Workout</div>
        <p class="muted">Kommt in <b>Phase 2</b>: Home-Workout nach deiner Zeit (${esc(labelFor('timePerDay', p.timePerDay))}) und Energie.</p>
      </div>
      <button class="btn" id="go-ki">🤖 Frag den Gesundheits-Coach</button>`;
  }

  function placeholder(emoji, title, text) {
    return `
      <div class="page-head"><h1 class="page-title">${title}</h1></div>
      <div class="empty-hint"><span class="eh-emoji">${emoji}</span>${esc(text)}</div>`;
  }

  function renderErnaehrung() {
    return placeholder('🥗', 'Ernährung', 'Wochenplan, Rezepte & Portionsrechner kommen in Phase 1.');
  }
  function renderTraining() {
    return placeholder('💪', 'Training', 'Home-Workout-Generator mit Bildern kommt in Phase 2.');
  }
  function renderEinkauf() {
    return placeholder('🛒', 'Einkaufen', 'Automatische Einkaufsliste mit Budget kommt in Phase 1.');
  }

  function renderMehr() {
    return `
      <div class="page-head"><h1 class="page-title">Mehr</h1></div>
      <button class="btn" id="go-ki">🤖 Gesundheits-Coach (KI)</button>
      <div style="height:12px"></div>
      <div class="card">
        <div class="card-title">⚙️ Profil zurücksetzen</div>
        <p class="muted">Startet das Onboarding neu.</p>
        <div style="height:8px"></div>
        <button class="btn btn-ghost" id="reset-profile">Onboarding neu starten</button>
      </div>
      <p class="muted" style="text-align:center;margin-top:24px">Gesundheits-App · Phase 0 · © 2026 Marcel Fehse</p>`;
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
        ${noEndpoint ? '<div class="warn-banner">KI noch nicht verbunden — der Cloudflare-Worker wird gleich eingerichtet, dann antwortet der Coach live.</div>' : ''}
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

    const input = document.getElementById('chat-input');
    const send = document.getElementById('chat-send');
    const listEl = document.getElementById('chat-list');
    listEl.scrollTop = listEl.scrollHeight;
    input.oninput = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; };
    const fire = () => { const t = input.value.trim(); if (t && !state.chatBusy) sendToKI(t); };
    send.onclick = fire;
    input.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fire(); } };
  }

  async function sendToKI(text) {
    state.chat.push({ role: 'user', content: text });
    state.chatBusy = true;
    save(STORE.chat, state.chat);
    renderChat();
    try {
      const p = state.profile;
      const profileNote = p ? `\n\nKontext zum Nutzer: Ziel=${p.goal}, Ernährung=${p.dietType}, Budget=${p.budget}, Zeit/Tag=${p.timePerDay}min, Fitness=${p.fitnessLevel}, Haushalt=${p.householdSize}.` : '';
      const res = await fetch(D.kiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: state.chat.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.content })),
          systemInstruction: D.kiSystemPrompt + profileNote
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const reply = data.text || data.reply || 'Keine Antwort erhalten.';
      state.chat.push({ role: 'assistant', content: reply });
    } catch (e) {
      state.chat.push({ role: 'assistant', content: '⚠️ Verbindung zur KI fehlgeschlagen. Bitte später nochmal versuchen.' });
    } finally {
      state.chatBusy = false;
      save(STORE.chat, state.chat);
      renderChat();
    }
  }

  // ===== Navigation =====
  function renderNav() {
    nav.innerHTML = D.tabs.map(t => `
      <button class="nav-item ${state.route === t.id ? 'active' : ''}" data-tab="${t.id}">
        <span class="nav-ic">${t.icon}</span>${t.label}
      </button>`).join('');
    nav.querySelectorAll('.nav-item').forEach(b => {
      b.onclick = () => { state.route = b.dataset.tab; render(); };
    });
  }

  function bindView() {
    const ki = document.getElementById('go-ki');
    if (ki) ki.onclick = () => { state.route = 'ki'; renderChat(); };
    const reset = document.getElementById('reset-profile');
    if (reset) reset.onclick = () => {
      if (confirm('Profil wirklich zurücksetzen und Onboarding neu starten?')) {
        state.profile = null; state.onbStep = 0; state.onbDraft = {};
        localStorage.removeItem(STORE.profile);
        render();
      }
    };
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
