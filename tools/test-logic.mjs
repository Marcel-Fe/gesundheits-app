// Node-Tests für die Kern-Logik. Lauf: node tools/test-logic.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const content = require('../js/content.js');
const L = require('../js/logic.js');

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; } else { fail++; console.error('  ✗ ' + name); } };
const near = (a, b, t = 1) => Math.abs(a - b) <= t;

// 1) Inhalts-Integrität: jede Rezept-Zutat existiert als Lebensmittel
let allIngredientsExist = true;
for (const r of content.recipes)
  for (const i of r.ingredients)
    if (!L.foodById(content, i.foodId)) { allIngredientsExist = false; console.error('  fehlt:', i.foodId, 'in', r.id); }
ok('Alle Rezept-Zutaten existieren', allIngredientsExist);

// 2) Nährwerte plausibel (Linsen-Eintopf hat Protein > 0, kcal in sinnvollem Bereich)
const stew = content.recipes.find(r => r.id === 'lentil_stew');
const stewN = L.recipeNutrients(content, stew).perServing;
ok('Eintopf-Protein > 10 g/Portion', stewN.protein > 10);
ok('Eintopf-kcal 200–800/Portion', stewN.kcal > 200 && stewN.kcal < 800);

// 3) Kosten: günstiges Rezept unter Low-Budget-Grenze
ok('Eintopf günstig (< 2,50 €/Portion)', L.recipeCost(content, stew).perServing < 2.5);

// 4) Portionsrechner: doppelte Portionen → doppelte Mengen
const base = L.scaleIngredients(content, stew, stew.baseServings);
const dbl = L.scaleIngredients(content, stew, stew.baseServings * 2);
ok('Portionsrechner verdoppelt Mengen', near(dbl[0].amount, base[0].amount * 2, 0.01));

// 5) Generator: vegetarisch → kein Fleisch/Fisch im Plan
const week = L.generateWeek(content, { dietType: 'vegetarian', budget: 'medium', householdSize: 4 });
ok('Plan hat 7 Tage', week.days.length === 7);
let vegClean = true;
for (const d of week.days) for (const m of d.meals) {
  const r = content.recipes.find(x => x.id === m.recipeId);
  if (r.diet === 'meat' || r.diet === 'fish') vegClean = false;
}
ok('Vegetarischer Plan ohne Fleisch/Fisch', vegClean);
ok('Generator nutzt Haushaltsgröße als Portionen', week.days[0].meals[0].servings === 4);

// 6) lowMeat: ≥ 80 % der Hauptmahlzeiten fleischfrei
const wk2 = L.generateWeek(content, { dietType: 'lowMeat', budget: 'medium', householdSize: 2 });
let mains = 0, meat = 0;
for (const d of wk2.days) for (const m of d.meals) {
  if (m.slot === 'breakfast') continue;
  mains++;
  const r = content.recipes.find(x => x.id === m.recipeId);
  if (r.diet === 'meat' || r.diet === 'fish') meat++;
}
ok('lowMeat: ≥ 80 % fleischfrei', (mains - meat) / mains >= 0.8);

// 7) Aggregation: dasselbe Lebensmittel aus 2 Rezepten → 1 Zeile mit Summe
const items = [{ recipeId: 'veggie_pasta', servings: 2 }, { recipeId: 'bolognese', servings: 2 }];
const list = L.aggregateShopping(content, items);
const pastaRows = list.filter(r => r.foodId === 'pasta');
ok('Nudeln aus 2 Rezepten zu 1 Zeile zusammengeführt', pastaRows.length === 1);
ok('Nudel-Menge summiert (320 g)', near(pastaRows[0].amount, 320, 0.01));

// 8) Einheiten-Anzeige
ok('1500 g → 1.5 kg', L.formatAmount(1500, 'g') === '1.5 kg');
ok('300 ml bleibt ml', L.formatAmount(300, 'ml') === '300 ml');
ok('2 Stück', L.formatAmount(2, 'stueck') === '2 Stück');

console.log(`\n${fail === 0 ? '✅' : '❌'} Tests: ${pass} grün, ${fail} rot`);
process.exit(fail === 0 ? 0 : 1);
