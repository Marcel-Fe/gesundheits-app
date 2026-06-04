/* Gesundheits-App — Kern-Logik (Phase 1)
   © 2026 Marcel Fehse. Alle Rechte vorbehalten.

   Reine Funktionen (keine DOM-Abhängigkeit) → in Node testbar.
   Single Source of Truth sind die Lebensmittel (content.foods): Nährwerte UND
   Kosten der Rezepte werden hier aus den Zutaten berechnet, nie doppelt gepflegt. */

(function (root) {
  const foodById = (content, id) => content.foods.find(f => f.id === id);

  // Menge einer Zutat in Gramm (für Nährwerte). stueck → über gramPerPiece.
  const gramsOf = (food, amount, unit) =>
    unit === 'stueck' ? amount * (food.gramPerPiece || 0) : amount;

  // Kosten einer Menge (in Basiseinheit) in €.
  const costOf = (food, amount) => {
    if (food.base === 'stueck') return amount * food.unitPrice;       // €/Stück
    return (amount / 1000) * food.unitPrice;                          // €/kg bzw. €/L
  };

  function recipeNutrients(content, recipe) {
    const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    for (const ingr of recipe.ingredients) {
      const food = foodById(content, ingr.foodId);
      if (!food) continue;
      const g = gramsOf(food, ingr.amount, ingr.unit);
      for (const k in t) t[k] += food.nutr[k] * g / 100;
    }
    const per = {};
    for (const k in t) per[k] = t[k] / recipe.baseServings;
    return { total: t, perServing: per };
  }

  function recipeCost(content, recipe) {
    let total = 0;
    for (const ingr of recipe.ingredients) {
      const food = foodById(content, ingr.foodId);
      if (food) total += costOf(food, ingr.amount);
    }
    return { total, perServing: total / recipe.baseServings };
  }

  // Portionsrechner: Zutaten auf Ziel-Portionen skalieren.
  function scaleIngredients(content, recipe, servings) {
    const factor = servings / recipe.baseServings;
    return recipe.ingredients.map(i => ({
      food: foodById(content, i.foodId),
      amount: i.amount * factor,
      unit: i.unit
    }));
  }

  const budgetMax = b => (b === 'low' ? 2.5 : b === 'medium' ? 4.5 : Infinity);
  const dietAllowed = (dietType, recipeDiet) =>
    dietType === 'vegetarian' ? (recipeDiet === 'vegan' || recipeDiet === 'vegetarian') : true;

  const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const pick = (pool, i) => pool[((i % pool.length) + pool.length) % pool.length];

  // Ernährungs-Generator: 7-Tage-Plan (Frühstück/Mittag/Abend).
  function generateWeek(content, profile) {
    const servings = profile.householdSize || 2;
    const max = budgetMax(profile.budget);
    const ok = r => dietAllowed(profile.dietType, r.diet) && recipeCost(content, r).perServing <= max;
    const all = content.recipes.filter(ok);
    const bfPool = (all.filter(r => r.category === 'breakfast')).length
      ? all.filter(r => r.category === 'breakfast') : all;
    const mains = all.filter(r => r.category === 'lunch' || r.category === 'dinner');
    const vegMains = mains.filter(r => r.diet === 'vegan' || r.diet === 'vegetarian');
    const meatMains = mains.filter(r => r.diet === 'meat' || r.diet === 'fish');
    const vegPool = vegMains.length ? vegMains : mains;

    const totalMains = 14;
    const seq = [];
    if (profile.dietType === 'omnivore') {
      for (let i = 0; i < totalMains; i++) seq.push(pick(mains.length ? mains : all, i));
    } else if (profile.dietType === 'lowMeat') {
      const maxMeat = Math.floor(totalMains * 0.2); // ≥80 % fleischfrei
      const meatAt = new Set();
      if (meatMains.length) for (let k = 0; k < maxMeat; k++) meatAt.add(Math.floor((k + 0.5) * totalMains / maxMeat));
      let mi = 0, vi = 0;
      for (let i = 0; i < totalMains; i++) {
        if (meatAt.has(i) && meatMains.length) seq.push(pick(meatMains, mi++));
        else seq.push(pick(vegPool, vi++));
      }
    } else { // vegetarian (Pool ist bereits fleischfrei)
      for (let i = 0; i < totalMains; i++) seq.push(pick(vegPool, i));
    }

    const days = [];
    for (let d = 0; d < 7; d++) {
      days.push({ meals: [
        { slot: 'breakfast', recipeId: pick(bfPool, d).id, servings },
        { slot: 'lunch', recipeId: seq[d * 2].id, servings },
        { slot: 'dinner', recipeId: seq[d * 2 + 1].id, servings }
      ] });
    }
    return { weekStart: startOfToday(), servings, days };
  }

  const todayIndex = plan => {
    const diff = Math.floor((Date.now() - plan.weekStart) / 86400000);
    return ((diff % 7) + 7) % 7;
  };

  // Einkaufsliste: gleiche Lebensmittel über alle Mahlzeiten zusammenführen.
  function aggregateShopping(content, items) {
    const map = new Map();
    for (const it of items) {
      const recipe = content.recipes.find(r => r.id === it.recipeId);
      if (!recipe) continue;
      const factor = it.servings / recipe.baseServings;
      for (const ingr of recipe.ingredients) {
        const food = foodById(content, ingr.foodId);
        if (!food) continue;
        if (!map.has(food.id)) map.set(food.id, { foodId: food.id, name: food.name, emoji: food.emoji, cat: food.cat, unit: food.base, amount: 0 });
        map.get(food.id).amount += ingr.amount * factor;
      }
    }
    const rows = [...map.values()].map(r => {
      r.price = costOf(foodById(content, r.foodId), r.amount);
      r.checked = false;
      return r;
    });
    rows.sort((a, b) => a.cat.localeCompare(b.cat, 'de') || a.name.localeCompare(b.name, 'de'));
    return rows;
  }

  function formatAmount(a, unit) {
    if (unit === 'stueck') { const n = Math.round(a * 10) / 10; return `${n % 1 === 0 ? n : n.toFixed(1)} Stück`; }
    if (unit === 'ml') return a >= 1000 ? `${(a / 1000).toFixed(a % 1000 ? 1 : 0)} l` : `${Math.round(a)} ml`;
    return a >= 1000 ? `${(a / 1000).toFixed(a % 1000 ? 1 : 0)} kg` : `${Math.round(a)} g`;
  }

  // ===== Training (Phase 2) =====
  const exerciseById = (content, id) => content.exercises.find(e => e.id === id);
  const LEVEL = { beginner: 1, intermediate: 2, advanced: 3 };

  // Übungsanzahl aus Zeitbudget (5–45 Min → 3–8 Übungen)
  const workoutSize = timePerDay => Math.max(3, Math.min(8, Math.round(timePerDay / 5) + 2));

  // aktueller Ziel-Stand einer Übung (Defaults + gespeicherte Progression)
  function exerciseTarget(store, ex) {
    const p = (store && store.progress && store.progress[ex.id]) || {};
    return {
      reps: ex.type === 'hold' ? null : (p.reps != null ? p.reps : ex.reps),
      hold: ex.type === 'hold' ? (p.hold != null ? p.hold : ex.hold) : null,
      sets: p.sets != null ? p.sets : ex.sets
    };
  }

  function generateWorkout(content, profile, energy, store, variation) {
    store = store || { progress: {}, history: [] };
    const v = variation || 0;
    const userRank = LEVEL[profile.fitnessLevel] || 1;
    let usable = content.exercises.filter(e => (e.equipment === 'none' || e.equipment === 'minimal') && LEVEL[e.level] <= userRank);
    if (!usable.length) usable = content.exercises.filter(e => LEVEL[e.level] === 1);
    const byGroup = g => usable.filter(e => e.group === g);

    const n = workoutSize(profile.timePerDay);
    const cardioFirst = ['lose', 'health', 'family'].includes(profile.goal);
    const order = cardioFirst ? ['legs', 'push', 'core', 'cardio', 'back'] : ['legs', 'push', 'core', 'back', 'cardio'];

    const chosen = [], used = {};
    const take = g => { const list = byGroup(g); if (!list.length) return; const i = used[g] != null ? used[g] : v; const ex = list[i % list.length]; used[g] = i + 1; if (!chosen.find(c => c.id === ex.id)) chosen.push(ex); };
    for (const g of order) { if (chosen.length >= n) break; take(g); }
    const groups = ['legs', 'push', 'core', 'cardio', 'back'];
    let gi = 0, guard = 0;
    while (chosen.length < n && guard < 100) { take(groups[gi++ % groups.length]); guard++; }

    const setBonus = profile.goal === 'muscle' ? 1 : 0;
    const energyDelta = energy === 'low' ? -1 : 0;
    const items = chosen.slice(0, n).map(ex => {
      const t = exerciseTarget(store, ex);
      return { exerciseId: ex.id, name: ex.name, emoji: ex.emoji, grad: ex.grad, group: ex.group, type: ex.type, sets: Math.max(1, t.sets + setBonus + energyDelta), reps: t.reps, hold: t.hold };
    });
    return { date: startOfToday(), energy: energy || 'normal', items };
  }

  // nach abgeschlossenem Workout: Wiederholungen/Haltezeit hochzählen, dann Sätze
  function advanceProgress(content, store, items) {
    const prog = { ...((store && store.progress) || {}) };
    for (const it of items) {
      const ex = exerciseById(content, it.exerciseId);
      if (!ex) continue;
      const cur = prog[ex.id] || {};
      if (ex.type === 'hold') {
        let hold = (cur.hold != null ? cur.hold : ex.hold) + 10;
        let sets = cur.sets != null ? cur.sets : ex.sets;
        if (hold > 60) { hold = ex.hold; sets = Math.min(sets + 1, 4); }
        prog[ex.id] = { hold, sets };
      } else {
        let reps = (cur.reps != null ? cur.reps : ex.reps) + 2;
        let sets = cur.sets != null ? cur.sets : ex.sets;
        if (reps > ex.reps + 8) { reps = ex.reps; sets = Math.min(sets + 1, 4); }
        prog[ex.id] = { reps, sets };
      }
    }
    return { progress: prog, history: [...((store && store.history) || []), { date: Date.now(), count: items.length }] };
  }

  // Sessions + Matching (Phase 2+)
  const sessionById = (content, id) => (content.sessions || []).find(s => s.id === id);
  // Empfohlene Sessions zum Ziel; passende zuerst, Rest danach
  function recommendedSessions(content, goal) {
    const all = content.sessions || [];
    const fit = all.filter(s => s.goals.includes(goal));
    const rest = all.filter(s => !s.goals.includes(goal));
    return { fit, rest, ordered: [...fit, ...rest] };
  }

  const GLOGIC = {
    foodById, gramsOf, costOf, recipeNutrients, recipeCost, scaleIngredients,
    budgetMax, dietAllowed, generateWeek, todayIndex, aggregateShopping, formatAmount,
    exerciseById, workoutSize, exerciseTarget, generateWorkout, advanceProgress,
    sessionById, recommendedSessions
  };
  if (typeof window !== 'undefined') window.GLOGIC = GLOGIC;
  if (typeof module !== 'undefined' && module.exports) module.exports = GLOGIC;
})(typeof window !== 'undefined' ? window : globalThis);
