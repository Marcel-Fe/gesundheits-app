/* Gesundheits-App — KI-Coach: Chat, Spracheingabe & Avatare
   © 2026 Marcel Fehse. Alle Rechte vorbehalten. */
'use strict';

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const ttsOk = 'speechSynthesis' in window;

// Mikrofon-Status auf allen Sprech-Buttons (oben + Eingabezeile) anzeigen.
function setMicVisual(on) {
  ['chat-mic', 'ki-talk'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.toggle('listening', on); });
}

function startListening() {
  if (!SR) { alert('Spracheingabe wird von diesem Browser nicht unterstützt. Tipp: Chrome oder Safari.'); return; }
  if (state.listening) { stopListening(); return; }
  if (ttsOk) speechSynthesis.cancel();
  const r = new SR();
  recog = r;
  r.lang = 'de-DE'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
  state.listening = true;
  const input = document.getElementById('chat-input');
  setMicVisual(true);
  if (input) input.placeholder = '🎤 Ich höre zu…';
  r.onresult = e => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; if (input) input.value = t; };
  r.onerror = () => stopListening();
  r.onend = () => {
    const input2 = document.getElementById('chat-input');
    const t = (input2 && input2.value || '').trim();
    state.listening = false;
    setMicVisual(false);
    if (input2) input2.placeholder = 'Deine Frage…';
    if (t && !state.chatBusy) sendToKI(t);
  };
  try { r.start(); } catch { stopListening(); }
}
function stopListening() {
  state.listening = false;
  setMicVisual(false);
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
  if (!state.voiceOut) return;
  // Markdown entfernen; für TTS auf ~280 Zeichen kürzen (am Satzende abschneiden).
  let clean = text.replace(/\*\*/g, '').replace(/[#>*_`]/g, '').trim();
  if (clean.length > 280) {
    const cut = clean.slice(0, 280);
    const end = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
    clean = end > 80 ? cut.slice(0, end + 1) : cut;
  }
  const face = () => document.querySelector('.coach-bar .coach-face');
  const hooks = {
    onstart: () => { const f = face(); if (f) f.classList.add('face-talking'); },
    onend: () => { const f = face(); if (f) f.classList.remove('face-talking'); }
  };
  const fallback = () => {
    if (!ttsOk) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean.slice(0, 700));
      u.lang = 'de-DE'; u.rate = 1.0;
      const av = coachAvatarById(state.coachAvatar);
      const v = pickVoice(av ? av.gender : 'm');
      if (v) u.voice = v;
      u.onstart = hooks.onstart; u.onend = hooks.onend; u.onerror = hooks.onend;
      speechSynthesis.speak(u);
    } catch {}
  };
  if (ttsOk) { try { speechSynthesis.cancel(); } catch {} }
  stopNatural();
  const av = coachAvatarById(state.coachAvatar);
  naturalSpeak(clean, (av && av.voiceTts) || 'Kore', hooks).then(ok => { if (!ok) fallback(); });
}

// ===== KI-Chat =====
// Avatar-Gesicht: echtes Porträt (icons/coach/) mit Emoji-Fallback bei Ladefehler.
const coachFace = (av, cls) =>
  `<span class="${cls} g-${av.grad}">${av.emoji}<img src="icons/coach/${av.id}.png" alt="" loading="lazy" onerror="this.remove()"></span>`;
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
        ${coachFace(a, 'avatar-face')}
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
    : `<div class="empty-hint"><span class="eh-face">${coachFace(av, 'coach-face eh-portrait')}</span>Hi, ich bin ${esc(av.name)} – dein Coach für ${esc(av.focus)}. Frag mich zu Training, Ernährung, Nährstoffen oder Motivation.</div>`;
  app.innerHTML = `
    <div class="screen">
      <div class="page-head">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <button class="btn btn-ghost" id="ki-back" style="width:auto;padding:8px 14px">← Zurück</button>
          <button class="btn btn-ghost" id="ki-verlauf" style="width:auto;padding:8px 14px">🕘 Verlauf</button>
        </div>
        <div class="coach-bar">
          ${coachFace(av, 'coach-face')}
          <div class="coach-meta"><div class="coach-name">${esc(av.name)}</div><div class="coach-tag">${esc(av.tag)}</div></div>
          <button class="link-btn" id="coach-switch">wechseln</button>
        </div>
        <div class="coach-voicebar">
          ${ttsOk ? `<button class="voice-pill ${state.voiceOut ? 'on' : ''}" id="ki-voice">${state.voiceOut ? '🔊 Stimme an' : '🔇 Stimme aus'}</button>` : ''}
          ${SR ? `<button class="voice-pill talk" id="ki-talk" ${noEndpoint ? 'disabled' : ''}>🎤 Sprechen</button>` : ''}
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
  const fire = () => { const t = input.value.trim(); if (t && !state.chatBusy) { ttsUnlock(); sendToKI(t); } };
  send.onclick = fire;
  input.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fire(); } };
  app.querySelectorAll('[data-suggest]').forEach(el => el.onclick = () => { if (!state.chatBusy) { ttsUnlock(); sendToKI(el.dataset.suggest); } });
  const voiceBtn = document.getElementById('ki-voice');
  if (voiceBtn) voiceBtn.onclick = () => { state.voiceOut = !state.voiceOut; save('gapp.voice', state.voiceOut); if (!state.voiceOut) { if (ttsOk) speechSynthesis.cancel(); stopNatural(); } else ttsUnlock(); renderChat(); };
  const talk = document.getElementById('ki-talk');
  if (talk) talk.onclick = () => { ttsUnlock(); startListening(); };
  const mic = document.getElementById('chat-mic');
  if (mic) mic.onclick = () => { ttsUnlock(); startListening(); };
  if (state.listening) setMicVisual(true);
}

async function sendToKI(text) {
  state.chat.push({ role: 'user', content: text });
  state.chatBusy = true; save(STORE.chat, state.chat); renderChat();
  try {
    const p = state.profile;
    let note = p ? `\n\nKontext zum Nutzer: Ziel=${p.goal}, Ernährung=${p.dietType}, Budget=${p.budget}, Zeit/Tag=${p.timePerDay}min, Fitness=${p.fitnessLevel}, Haushalt=${p.householdSize}.` : '';
    // Tageswerte mitgeben → der Coach kann sich persönlich darauf beziehen.
    const kcalToday = todayIntake().reduce((s, it) => s + (it.kcal || 0), 0);
    const moodToday = state.mood[todayKey()] || 'unbekannt';
    note += `\nHeute: Stimmung=${moodToday}, gegessen=${kcalToday} kcal${state.calGoal ? ` (Ziel ${state.calGoal})` : ''}, Wasser=${state.water[todayKey()] || 0} Gläser, Workout=${doneToday() ? 'schon erledigt' : 'noch offen'}. Beziehe dich darauf, wenn es zur Frage passt.`;
    const av = coachAvatarById(state.coachAvatar);
    const persona = av ? av.persona + '\n\n' : '';
    const consent = state.coachConsent
      ? '\n\nDer Nutzer hat der Coaching-Einwilligung zugestimmt (App ist kein Arzt, nur Coaching).'
      : '\n\nWICHTIG: Der Nutzer hat der Coaching-Einwilligung NOCH NICHT zugestimmt. Gib daher KEINE detaillierten medizinischen oder Vitalstoff-/Supplement-Empfehlungen. Bleibe bei allgemeinen, sicheren Tipps zu Bewegung und Ernährung und weise freundlich darauf hin, dass detailliertes Vital-Coaching erst nach der Zustimmung oben im Coach möglich ist.';
    const body = JSON.stringify({ messages: state.chat.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.content })), systemInstruction: persona + D.kiSystemPrompt + consent + note });
    // Bis zu 2 Versuche – ein kurzer Netz-Aussetzer soll den Coach nicht verstummen lassen.
    let res = null, lastErr = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await fetch(D.kiEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        break;
      } catch (e) { lastErr = e; res = null; if (attempt === 0) await new Promise(r => setTimeout(r, 900)); }
    }
    if (!res) throw lastErr || new Error('no response');
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
