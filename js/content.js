/* Gesundheits-App — Inhalts-DB (Phase 1): Lebensmittel & Rezepte
   © 2026 Marcel Fehse. Alle Rechte vorbehalten.

   Einheiten-Konvention: Zutaten nutzen immer die Basiseinheit des Lebensmittels
   (g | ml | stueck). Das macht Nährwert-, Kosten- und Einkaufsberechnung exakt.
   Nährwerte je 100 g/ml. unitPrice = € pro kg (g), pro L (ml) oder pro Stück. */

(function (root) {
  // n = [kcal, protein, carbs, fat, fiber] je 100 g/ml
  const F = (id, name, emoji, cat, base, n, unitPrice, satiety, tags, gramPerPiece) => ({
    id, name, emoji, cat, base,
    nutr: { kcal: n[0], protein: n[1], carbs: n[2], fat: n[3], fiber: n[4] },
    unitPrice, satiety, tags, gramPerPiece: gramPerPiece || null,
    micros: tags.includes('iron') ? { iron: true } : {}
  });

  const foods = [
    // Getreide & Sättigungsbeilagen
    F('oats', 'Haferflocken', '🥣', 'Getreide', 'g', [370, 13, 60, 7, 10], 1.8, 75, ['cheap', 'vegan', 'fiber']),
    F('rice', 'Reis', '🍚', 'Getreide', 'g', [350, 7, 77, 1, 2], 1.6, 60, ['cheap', 'vegan']),
    F('pasta', 'Vollkornnudeln', '🍝', 'Getreide', 'g', [350, 13, 62, 3, 8], 1.8, 70, ['cheap', 'vegan', 'fiber']),
    F('potato', 'Kartoffeln', '🥔', 'Gemüse', 'g', [77, 2, 17, 0.1, 2], 1.0, 80, ['cheap', 'vegan']),
    F('bread', 'Vollkornbrot', '🍞', 'Getreide', 'g', [250, 9, 42, 3, 7], 3.0, 65, ['cheap', 'vegan', 'fiber']),
    // Protein
    F('egg', 'Eier', '🥚', 'Protein', 'stueck', [155, 13, 1, 11, 0], 0.35, 70, ['vegetarian', 'protein'], 60),
    F('lentils', 'Linsen (getrocknet)', '🫘', 'Protein', 'g', [350, 25, 50, 1, 17], 2.5, 85, ['cheap', 'vegan', 'protein', 'iron', 'fiber']),
    F('chickpeas', 'Kichererbsen (Dose)', '🫛', 'Protein', 'g', [120, 7, 16, 2, 6], 2.0, 75, ['cheap', 'vegan', 'protein', 'fiber']),
    F('beans', 'Kidneybohnen (Dose)', '🫘', 'Protein', 'g', [110, 7, 14, 0.5, 6], 2.0, 78, ['cheap', 'vegan', 'protein', 'iron', 'fiber']),
    F('quark', 'Magerquark', '🥛', 'Milch', 'g', [67, 12, 4, 0.3, 0], 2.8, 80, ['vegetarian', 'protein']),
    F('yogurt', 'Naturjoghurt', '🥛', 'Milch', 'g', [60, 4, 5, 3, 0], 1.8, 55, ['vegetarian']),
    F('milk', 'Milch', '🥛', 'Milch', 'ml', [48, 3.4, 4.8, 1.5, 0], 1.1, 40, ['vegetarian']),
    F('cheese', 'Gouda', '🧀', 'Milch', 'g', [350, 25, 0, 27, 0], 8.0, 60, ['vegetarian']),
    F('tofu', 'Tofu', '◻️', 'Protein', 'g', [130, 14, 3, 8, 1], 6.0, 65, ['vegan', 'protein']),
    F('chicken', 'Hähnchenbrust', '🍗', 'Protein', 'g', [165, 31, 0, 3.6, 0], 8.0, 80, ['meat', 'protein']),
    F('mince', 'Hackfleisch (gemischt)', '🥩', 'Protein', 'g', [250, 18, 0, 20, 0], 7.0, 75, ['meat', 'protein']),
    F('tuna', 'Thunfisch (Dose)', '🐟', 'Protein', 'g', [110, 24, 0, 1, 0], 9.0, 75, ['fish', 'protein']),
    // Gemüse & Obst
    F('onion', 'Zwiebel', '🧅', 'Gemüse', 'g', [40, 1, 9, 0, 2], 1.2, 30, ['cheap', 'vegan']),
    F('garlic', 'Knoblauch', '🧄', 'Gemüse', 'stueck', [149, 6, 33, 0.5, 2], 0.05, 20, ['vegan'], 4),
    F('carrot', 'Möhren', '🥕', 'Gemüse', 'g', [41, 1, 10, 0, 3], 1.0, 50, ['cheap', 'vegan']),
    F('tomato', 'Tomaten', '🍅', 'Gemüse', 'g', [18, 1, 4, 0, 1], 2.5, 40, ['vegan', 'vitaminC']),
    F('canned_tomato', 'Tomaten (Dose)', '🥫', 'Gemüse', 'g', [32, 1.5, 5, 0.3, 1.5], 1.2, 40, ['cheap', 'vegan']),
    F('pepper', 'Paprika', '🫑', 'Gemüse', 'g', [31, 1, 6, 0, 2], 3.5, 45, ['vegan', 'vitaminC']),
    F('spinach', 'Spinat (TK)', '🥬', 'Gemüse', 'g', [23, 3, 1, 0.4, 2], 2.5, 50, ['vegan', 'iron']),
    F('broccoli', 'Brokkoli', '🥦', 'Gemüse', 'g', [34, 3, 7, 0.4, 3], 2.5, 60, ['vegan', 'vitaminC']),
    F('zucchini', 'Zucchini', '🥒', 'Gemüse', 'g', [17, 1, 3, 0, 1], 2.0, 45, ['vegan']),
    F('banana', 'Banane', '🍌', 'Obst', 'stueck', [89, 1, 23, 0.3, 3], 0.30, 60, ['vegan'], 120),
    F('apple', 'Apfel', '🍎', 'Obst', 'stueck', [52, 0.3, 14, 0.2, 2], 0.40, 55, ['vegan', 'vitaminC'], 150),
    F('berries', 'Beeren (TK)', '🫐', 'Obst', 'g', [50, 1, 10, 0.4, 4], 4.0, 50, ['vegan', 'vitaminC']),
    // Fett & Nüsse
    F('oil', 'Olivenöl', '🫒', 'Vorrat', 'ml', [884, 0, 0, 100, 0], 8.0, 0, ['vegan']),
    F('walnuts', 'Walnüsse', '🌰', 'Vorrat', 'g', [654, 15, 14, 65, 7], 12.0, 65, ['vegan'])
  ];

  // diet: 'vegan' | 'vegetarian' | 'meat' | 'fish'
  const R = (id, name, emoji, grad, category, diet, baseServings, prepMinutes, ingredients, steps) =>
    ({ id, name, emoji, grad, category, diet, baseServings, prepMinutes, ingredients, steps });
  const ing = (foodId, amount, unit) => ({ foodId, amount, unit });

  const recipes = [
    R('oat_bowl', 'Haferflocken-Beeren-Bowl', '🥣', 'sunrise', 'breakfast', 'vegetarian', 2, 5,
      [ing('oats', 100, 'g'), ing('milk', 300, 'ml'), ing('banana', 1, 'stueck'), ing('berries', 100, 'g')],
      ['Haferflocken mit Milch 2 Min. quellen lassen.', 'Banane in Scheiben schneiden.', 'Mit Beeren toppen.']),
    R('quark_apple', 'Magerquark mit Apfel & Hafer', '🍎', 'peach', 'breakfast', 'vegetarian', 2, 5,
      [ing('quark', 300, 'g'), ing('apple', 1, 'stueck'), ing('oats', 60, 'g')],
      ['Quark cremig rühren.', 'Apfel klein würfeln.', 'Mit Haferflocken mischen.']),
    R('scrambled', 'Rührei mit Vollkornbrot', '🍳', 'amber', 'breakfast', 'vegetarian', 2, 10,
      [ing('egg', 4, 'stueck'), ing('bread', 120, 'g'), ing('tomato', 150, 'g'), ing('oil', 10, 'ml')],
      ['Eier verquirlen, salzen.', 'In Öl bei mittlerer Hitze stocken lassen.', 'Mit Brot und Tomaten servieren.']),
    R('lentil_stew', 'Linsen-Eintopf', '🍲', 'terracotta', 'dinner', 'vegan', 2, 30,
      [ing('lentils', 150, 'g'), ing('carrot', 150, 'g'), ing('potato', 200, 'g'), ing('onion', 100, 'g'), ing('canned_tomato', 200, 'g'), ing('oil', 15, 'ml')],
      ['Zwiebel in Öl andünsten.', 'Möhren, Kartoffeln, Linsen zugeben.', 'Mit Tomaten + Wasser 25 Min. köcheln.']),
    R('chickpea_curry', 'Kichererbsen-Curry mit Reis', '🍛', 'amber', 'dinner', 'vegan', 2, 25,
      [ing('chickpeas', 240, 'g'), ing('canned_tomato', 200, 'g'), ing('onion', 100, 'g'), ing('garlic', 2, 'stueck'), ing('rice', 120, 'g'), ing('spinach', 100, 'g'), ing('oil', 15, 'ml')],
      ['Reis kochen.', 'Zwiebel + Knoblauch anbraten.', 'Kichererbsen, Tomaten, Spinat zugeben, 15 Min. köcheln.']),
    R('veggie_pasta', 'Gemüse-Nudeln', '🍝', 'sage', 'lunch', 'vegan', 2, 20,
      [ing('pasta', 160, 'g'), ing('zucchini', 200, 'g'), ing('pepper', 150, 'g'), ing('tomato', 150, 'g'), ing('garlic', 2, 'stueck'), ing('oil', 15, 'ml')],
      ['Nudeln kochen.', 'Gemüse in Öl anbraten.', 'Mit Nudeln mischen, würzen.']),
    R('potato_pan', 'Kartoffel-Gemüse-Pfanne mit Ei', '🥔', 'terracotta', 'dinner', 'vegetarian', 2, 25,
      [ing('potato', 400, 'g'), ing('pepper', 150, 'g'), ing('onion', 100, 'g'), ing('egg', 2, 'stueck'), ing('oil', 15, 'ml')],
      ['Kartoffeln würfeln, anbraten.', 'Paprika + Zwiebel zugeben.', 'Eier darüber stocken lassen.']),
    R('chicken_rice', 'Hähnchen-Reis-Pfanne', '🍗', 'amber', 'dinner', 'meat', 2, 25,
      [ing('chicken', 250, 'g'), ing('rice', 120, 'g'), ing('broccoli', 200, 'g'), ing('carrot', 100, 'g'), ing('oil', 15, 'ml')],
      ['Reis kochen.', 'Hähnchen anbraten.', 'Gemüse zugeben, garen, mischen.']),
    R('bolognese', 'Spaghetti Bolognese', '🍝', 'terracotta', 'dinner', 'meat', 2, 30,
      [ing('pasta', 160, 'g'), ing('mince', 250, 'g'), ing('canned_tomato', 200, 'g'), ing('onion', 100, 'g'), ing('carrot', 100, 'g'), ing('garlic', 2, 'stueck')],
      ['Hackfleisch anbraten.', 'Zwiebel, Möhre, Tomaten zugeben, 20 Min. köcheln.', 'Mit Nudeln servieren.']),
    R('tuna_salad', 'Thunfisch-Bohnen-Salat', '🥗', 'sage', 'lunch', 'fish', 2, 10,
      [ing('tuna', 150, 'g'), ing('beans', 240, 'g'), ing('tomato', 150, 'g'), ing('onion', 60, 'g'), ing('oil', 15, 'ml')],
      ['Bohnen abspülen.', 'Alles mischen.', 'Mit Öl, Salz, Pfeffer abschmecken.']),
    R('tofu_veg', 'Tofu-Gemüse-Reis', '🍚', 'sage', 'dinner', 'vegan', 2, 25,
      [ing('tofu', 250, 'g'), ing('rice', 120, 'g'), ing('broccoli', 200, 'g'), ing('pepper', 150, 'g'), ing('garlic', 2, 'stueck'), ing('oil', 15, 'ml')],
      ['Reis kochen.', 'Tofu würfeln, knusprig braten.', 'Gemüse zugeben, garen.']),
    R('yogurt_snack', 'Joghurt-Beeren-Becher', '🫐', 'peach', 'breakfast', 'vegetarian', 2, 5,
      [ing('yogurt', 300, 'g'), ing('berries', 120, 'g'), ing('oats', 40, 'g'), ing('walnuts', 30, 'g')],
      ['Joghurt einfüllen.', 'Beeren, Haferflocken, Nüsse darüber.'])
  ];

  const GCONTENT = { foods, recipes };
  if (typeof window !== 'undefined') window.GCONTENT = GCONTENT;
  if (typeof module !== 'undefined' && module.exports) module.exports = GCONTENT;
})(typeof window !== 'undefined' ? window : globalThis);
