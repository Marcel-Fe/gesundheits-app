/* Gesundheits-App — Inhalts-DB: setzt die Teil-Module zu GCONTENT zusammen.
   © 2026 Marcel Fehse. Alle Rechte vorbehalten.

   Browser: die Teil-Module (js/content/*.js) laufen vor dieser Datei und
   legen ihre Daten in root.GCPARTS ab. Node (Tests): require lädt sie direkt. */
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const p = isNode ? {
    foods: require('./content/foods.js'),
    recipes: require('./content/recipes.js'),
    exercises: require('./content/exercises.js'),
    sessions: require('./content/sessions.js')
  } : (root.GCPARTS || {});

  const GCONTENT = { foods: p.foods, recipes: p.recipes, exercises: p.exercises, sessions: p.sessions };
  if (typeof window !== 'undefined') window.GCONTENT = GCONTENT;
  if (isNode) module.exports = GCONTENT;
})(typeof window !== 'undefined' ? window : globalThis);
