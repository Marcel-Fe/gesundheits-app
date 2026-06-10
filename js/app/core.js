/* Gesundheits-App — Kern: State, Storage, Helfer, Render-Dispatcher
   © 2026 Marcel Fehse. Alle Rechte vorbehalten. */
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
