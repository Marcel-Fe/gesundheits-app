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
    F('walnuts', 'Walnüsse', '🌰', 'Vorrat', 'g', [654, 15, 14, 65, 7], 12.0, 65, ['vegan']),

    // ===== Erweiterte Datenbank =====
    // Getreide, Beilagen & Backwaren
    F('oats_steel', 'Haferkleie', '🥣', 'Getreide', 'g', [246, 17, 50, 7, 15], 3.0, 80, ['vegan', 'fiber']),
    F('quinoa', 'Quinoa', '🌾', 'Getreide', 'g', [368, 14, 64, 6, 7], 6.0, 75, ['vegan', 'protein', 'fiber']),
    F('bulgur', 'Bulgur', '🌾', 'Getreide', 'g', [342, 12, 76, 1, 18], 2.5, 70, ['vegan', 'fiber']),
    F('couscous', 'Couscous', '🌾', 'Getreide', 'g', [376, 13, 77, 1, 5], 2.5, 65, ['vegan']),
    F('rice_brown', 'Vollkornreis', '🍚', 'Getreide', 'g', [360, 8, 76, 3, 4], 2.5, 70, ['vegan', 'fiber']),
    F('rice_basmati', 'Basmatireis', '🍚', 'Getreide', 'g', [350, 8, 78, 1, 1], 2.5, 60, ['vegan']),
    F('millet', 'Hirse', '🌾', 'Getreide', 'g', [378, 11, 73, 4, 9], 3.0, 65, ['vegan', 'fiber']),
    F('spelt', 'Dinkel', '🌾', 'Getreide', 'g', [338, 15, 70, 2, 9], 3.0, 70, ['vegan', 'fiber']),
    F('cornmeal', 'Polenta (Maisgrieß)', '🌽', 'Getreide', 'g', [358, 8, 79, 1, 4], 2.0, 60, ['vegan']),
    F('semolina', 'Hartweizengrieß', '🌾', 'Getreide', 'g', [350, 12, 73, 1, 3], 1.8, 60, ['vegan']),
    F('noodles_egg', 'Eiernudeln', '🍜', 'Getreide', 'g', [360, 13, 71, 4, 3], 2.5, 65, ['vegetarian']),
    F('rice_noodles', 'Reisnudeln', '🍜', 'Getreide', 'g', [360, 6, 83, 1, 2], 3.0, 55, ['vegan']),
    F('cornflakes', 'Cornflakes', '🥣', 'Getreide', 'g', [378, 7, 84, 1, 3], 4.0, 40, ['vegetarian']),
    F('muesli', 'Müsli', '🥣', 'Getreide', 'g', [360, 10, 60, 7, 8], 4.0, 65, ['vegetarian', 'fiber']),
    F('granola', 'Granola', '🥣', 'Getreide', 'g', [450, 9, 64, 16, 7], 6.0, 60, ['vegetarian', 'fiber']),
    F('rice_cake', 'Reiswaffeln', '🍘', 'Backwaren', 'g', [387, 8, 81, 3, 4], 5.0, 35, ['vegan']),
    F('crispbread', 'Knäckebrot', '🍞', 'Backwaren', 'g', [350, 11, 65, 2, 16], 4.0, 60, ['vegan', 'fiber']),
    F('toast', 'Toastbrot', '🍞', 'Backwaren', 'g', [270, 9, 49, 4, 3], 2.5, 45, ['vegetarian']),
    F('roll', 'Brötchen', '🥖', 'Backwaren', 'stueck', [270, 9, 53, 2, 3], 0.35, 50, ['vegetarian'], 60),
    F('baguette', 'Baguette', '🥖', 'Backwaren', 'g', [274, 9, 55, 2, 3], 2.5, 45, ['vegetarian']),
    F('rye_bread', 'Roggenbrot', '🍞', 'Backwaren', 'g', [230, 7, 45, 1, 8], 3.0, 70, ['vegan', 'fiber']),
    F('tortilla_wrap', 'Tortilla-Wrap', '🌯', 'Backwaren', 'stueck', [310, 8, 50, 8, 3], 0.40, 50, ['vegetarian'], 60),
    F('flour', 'Weizenmehl', '🌾', 'Vorrat', 'g', [340, 10, 72, 1, 3], 1.0, 40, ['vegan']),
    F('flour_whole', 'Vollkornmehl', '🌾', 'Vorrat', 'g', [320, 13, 60, 2, 10], 1.5, 50, ['vegan', 'fiber']),

    // Hülsenfrüchte
    F('beans_white', 'Weiße Bohnen', '🫘', 'Hülsenfrüchte', 'g', [110, 7, 16, 0.5, 6], 2.0, 80, ['cheap', 'vegan', 'protein', 'fiber']),
    F('beans_black', 'Schwarze Bohnen', '🫘', 'Hülsenfrüchte', 'g', [132, 9, 24, 0.5, 9], 2.5, 80, ['vegan', 'protein', 'iron', 'fiber']),
    F('peas', 'Erbsen (TK)', '🟢', 'Hülsenfrüchte', 'g', [81, 5, 14, 0.4, 5], 2.0, 70, ['cheap', 'vegan', 'protein', 'fiber']),
    F('lentils_red', 'Rote Linsen', '🔴', 'Hülsenfrüchte', 'g', [352, 24, 56, 1, 11], 3.0, 80, ['vegan', 'protein', 'iron', 'fiber']),
    F('edamame', 'Edamame', '🫛', 'Hülsenfrüchte', 'g', [121, 12, 9, 5, 5], 5.0, 75, ['vegan', 'protein', 'fiber']),
    F('soybeans', 'Sojabohnen', '🫘', 'Hülsenfrüchte', 'g', [173, 17, 10, 9, 6], 3.0, 80, ['vegan', 'protein', 'iron', 'fiber']),
    F('hummus', 'Hummus', '🥣', 'Hülsenfrüchte', 'g', [177, 8, 14, 10, 6], 7.0, 65, ['vegan', 'protein', 'fiber']),
    F('peanut_butter', 'Erdnussbutter', '🥜', 'Nüsse & Samen', 'g', [588, 25, 20, 50, 6], 8.0, 70, ['vegan', 'protein']),

    // Nüsse, Kerne & Samen
    F('almonds', 'Mandeln', '🌰', 'Nüsse & Samen', 'g', [579, 21, 22, 50, 12], 14.0, 70, ['vegan', 'protein', 'fiber']),
    F('cashews', 'Cashewkerne', '🌰', 'Nüsse & Samen', 'g', [553, 18, 30, 44, 3], 15.0, 65, ['vegan', 'protein']),
    F('hazelnuts', 'Haselnüsse', '🌰', 'Nüsse & Samen', 'g', [628, 15, 17, 61, 10], 14.0, 65, ['vegan', 'fiber']),
    F('peanuts', 'Erdnüsse', '🥜', 'Nüsse & Samen', 'g', [567, 26, 16, 49, 9], 6.0, 70, ['vegan', 'protein', 'fiber']),
    F('pistachios', 'Pistazien', '🌰', 'Nüsse & Samen', 'g', [562, 20, 28, 45, 10], 18.0, 65, ['vegan', 'protein', 'fiber']),
    F('sunflower_seeds', 'Sonnenblumenkerne', '🌻', 'Nüsse & Samen', 'g', [584, 21, 20, 51, 9], 5.0, 60, ['vegan', 'protein']),
    F('pumpkin_seeds', 'Kürbiskerne', '🎃', 'Nüsse & Samen', 'g', [559, 30, 11, 49, 6], 9.0, 60, ['vegan', 'protein', 'iron']),
    F('chia', 'Chiasamen', '⚫', 'Nüsse & Samen', 'g', [486, 17, 42, 31, 34], 12.0, 70, ['vegan', 'fiber']),
    F('flaxseed', 'Leinsamen', '🟤', 'Nüsse & Samen', 'g', [534, 18, 29, 42, 27], 4.0, 65, ['vegan', 'fiber']),
    F('sesame', 'Sesam', '⚪', 'Nüsse & Samen', 'g', [573, 18, 23, 50, 12], 6.0, 50, ['vegan']),

    // Gemüse
    F('cucumber', 'Gurke', '🥒', 'Gemüse', 'g', [12, 0.6, 2, 0.1, 0.5], 1.5, 35, ['cheap', 'vegan']),
    F('lettuce', 'Kopfsalat', '🥬', 'Gemüse', 'g', [14, 1, 2, 0.2, 1], 2.0, 30, ['vegan']),
    F('cauliflower', 'Blumenkohl', '🥦', 'Gemüse', 'g', [25, 2, 5, 0.3, 2], 2.0, 55, ['vegan', 'vitaminC']),
    F('cabbage', 'Weißkohl', '🥬', 'Gemüse', 'g', [25, 1, 6, 0.1, 2], 1.0, 50, ['cheap', 'vegan', 'vitaminC']),
    F('kale', 'Grünkohl', '🥬', 'Gemüse', 'g', [49, 4, 9, 0.9, 4], 3.0, 55, ['vegan', 'iron', 'vitaminC']),
    F('mushrooms', 'Champignons', '🍄', 'Gemüse', 'g', [22, 3, 3, 0.3, 1], 4.0, 45, ['vegan']),
    F('eggplant', 'Aubergine', '🍆', 'Gemüse', 'g', [25, 1, 6, 0.2, 3], 2.5, 45, ['vegan']),
    F('pumpkin', 'Kürbis', '🎃', 'Gemüse', 'g', [26, 1, 6, 0.1, 1], 2.0, 55, ['vegan', 'vitaminC']),
    F('sweet_potato', 'Süßkartoffel', '🍠', 'Gemüse', 'g', [86, 1.6, 20, 0.1, 3], 2.5, 75, ['vegan', 'fiber', 'vitaminC']),
    F('beetroot', 'Rote Bete', '🟣', 'Gemüse', 'g', [43, 1.6, 10, 0.2, 3], 2.0, 55, ['vegan', 'fiber']),
    F('celery', 'Sellerie', '🥬', 'Gemüse', 'g', [16, 0.7, 3, 0.2, 2], 2.0, 35, ['vegan']),
    F('leek', 'Lauch', '🧅', 'Gemüse', 'g', [61, 1.5, 14, 0.3, 2], 2.5, 45, ['vegan']),
    F('green_beans', 'Grüne Bohnen', '🫛', 'Gemüse', 'g', [31, 2, 7, 0.1, 3], 2.5, 55, ['vegan', 'fiber']),
    F('asparagus', 'Spargel', '🥬', 'Gemüse', 'g', [20, 2, 4, 0.1, 2], 8.0, 50, ['vegan', 'fiber']),
    F('corn', 'Mais', '🌽', 'Gemüse', 'g', [86, 3, 19, 1, 3], 2.0, 55, ['vegan', 'fiber']),
    F('avocado', 'Avocado', '🥑', 'Obst', 'stueck', [160, 2, 9, 15, 7], 1.20, 70, ['vegan', 'fiber'], 170),
    F('radish', 'Radieschen', '🔴', 'Gemüse', 'g', [16, 0.7, 3, 0.1, 1.6], 2.5, 35, ['vegan', 'vitaminC']),
    F('ginger', 'Ingwer', '🫚', 'Gewürze & Kräuter', 'g', [80, 2, 18, 0.8, 2], 6.0, 20, ['vegan']),
    F('chili', 'Chili', '🌶️', 'Gewürze & Kräuter', 'g', [40, 2, 9, 0.4, 1.5], 8.0, 20, ['vegan', 'vitaminC']),

    // Obst
    F('orange', 'Orange', '🍊', 'Obst', 'stueck', [47, 1, 12, 0.1, 2], 0.50, 55, ['vegan', 'vitaminC'], 180),
    F('lemon', 'Zitrone', '🍋', 'Obst', 'stueck', [29, 1, 9, 0.3, 3], 0.40, 25, ['vegan', 'vitaminC'], 100),
    F('pear', 'Birne', '🍐', 'Obst', 'stueck', [57, 0.4, 15, 0.1, 3], 0.45, 55, ['vegan', 'fiber'], 170),
    F('grapes', 'Weintrauben', '🍇', 'Obst', 'g', [69, 0.7, 18, 0.2, 1], 3.0, 45, ['vegan']),
    F('strawberry', 'Erdbeeren', '🍓', 'Obst', 'g', [32, 0.7, 8, 0.3, 2], 6.0, 45, ['vegan', 'vitaminC']),
    F('blueberry', 'Heidelbeeren', '🫐', 'Obst', 'g', [57, 0.7, 14, 0.3, 2.4], 8.0, 45, ['vegan', 'vitaminC', 'fiber']),
    F('raspberry', 'Himbeeren', '🍓', 'Obst', 'g', [52, 1.2, 12, 0.7, 7], 9.0, 50, ['vegan', 'fiber', 'vitaminC']),
    F('pineapple', 'Ananas', '🍍', 'Obst', 'g', [50, 0.5, 13, 0.1, 1.4], 2.5, 45, ['vegan', 'vitaminC']),
    F('mango', 'Mango', '🥭', 'Obst', 'stueck', [60, 0.8, 15, 0.4, 1.6], 1.50, 50, ['vegan', 'vitaminC'], 200),
    F('kiwi', 'Kiwi', '🥝', 'Obst', 'stueck', [61, 1.1, 15, 0.5, 3], 0.50, 45, ['vegan', 'vitaminC'], 75),
    F('watermelon', 'Wassermelone', '🍉', 'Obst', 'g', [30, 0.6, 8, 0.2, 0.4], 1.5, 40, ['vegan', 'vitaminC']),
    F('peach', 'Pfirsich', '🍑', 'Obst', 'stueck', [39, 0.9, 10, 0.3, 1.5], 0.50, 45, ['vegan', 'vitaminC'], 150),
    F('plum', 'Pflaume', '🟣', 'Obst', 'stueck', [46, 0.7, 11, 0.3, 1.4], 0.30, 40, ['vegan', 'fiber'], 60),
    F('cherry', 'Kirschen', '🍒', 'Obst', 'g', [63, 1, 16, 0.2, 2], 6.0, 45, ['vegan', 'vitaminC']),
    F('grapefruit', 'Grapefruit', '🍊', 'Obst', 'stueck', [42, 0.8, 11, 0.1, 1.6], 0.80, 50, ['vegan', 'vitaminC'], 250),
    F('dates', 'Datteln', '🟤', 'Obst', 'g', [282, 2.5, 75, 0.4, 8], 8.0, 55, ['vegan', 'fiber']),
    F('raisins', 'Rosinen', '🟤', 'Obst', 'g', [299, 3, 79, 0.5, 4], 4.0, 45, ['vegan']),
    F('coconut', 'Kokosnuss', '🥥', 'Obst', 'g', [354, 3, 15, 33, 9], 5.0, 60, ['vegan', 'fiber']),

    // Milch & Alternativen
    F('butter', 'Butter', '🧈', 'Milch', 'g', [717, 0.7, 0.7, 81, 0], 9.0, 10, ['vegetarian']),
    F('cream', 'Sahne', '🥛', 'Milch', 'ml', [292, 2.4, 3, 30, 0], 2.5, 20, ['vegetarian']),
    F('creme_fraiche', 'Crème fraîche', '🥛', 'Milch', 'g', [292, 2.4, 3, 30, 0], 3.0, 20, ['vegetarian']),
    F('mozzarella', 'Mozzarella', '🧀', 'Milch', 'g', [253, 18, 1, 20, 0], 8.0, 55, ['vegetarian', 'protein']),
    F('feta', 'Feta', '🧀', 'Milch', 'g', [264, 14, 4, 21, 0], 9.0, 55, ['vegetarian', 'protein']),
    F('parmesan', 'Parmesan', '🧀', 'Milch', 'g', [392, 36, 0, 27, 0], 18.0, 60, ['vegetarian', 'protein']),
    F('cottage', 'Hüttenkäse', '🥛', 'Milch', 'g', [98, 11, 3, 4, 0], 4.0, 70, ['vegetarian', 'protein']),
    F('skyr', 'Skyr', '🥛', 'Milch', 'g', [63, 11, 4, 0.2, 0], 3.5, 80, ['vegetarian', 'protein']),
    F('greek_yogurt', 'Griechischer Joghurt', '🥛', 'Milch', 'g', [97, 9, 4, 5, 0], 3.5, 70, ['vegetarian', 'protein']),
    F('soy_milk', 'Sojadrink', '🥛', 'Milch', 'ml', [42, 3.3, 2.5, 1.8, 0.6], 1.5, 40, ['vegan', 'protein']),
    F('oat_milk', 'Haferdrink', '🥛', 'Milch', 'ml', [46, 1, 7, 1.5, 0.8], 1.5, 35, ['vegan']),
    F('almond_milk', 'Mandeldrink', '🥛', 'Milch', 'ml', [24, 0.5, 3, 1.1, 0.4], 2.0, 30, ['vegan']),

    // Fleisch & Wurst
    F('beef', 'Rindersteak', '🥩', 'Fleisch', 'g', [217, 26, 0, 12, 0], 18.0, 80, ['meat', 'protein', 'iron']),
    F('pork', 'Schweineschnitzel', '🥩', 'Fleisch', 'g', [242, 27, 0, 14, 0], 8.0, 80, ['meat', 'protein']),
    F('turkey', 'Putenbrust', '🍗', 'Fleisch', 'g', [114, 24, 0, 1.7, 0], 9.0, 80, ['meat', 'protein']),
    F('chicken_thigh', 'Hähnchenschenkel', '🍗', 'Fleisch', 'g', [177, 24, 0, 8, 0], 6.0, 75, ['meat', 'protein']),
    F('ham', 'Kochschinken', '🍖', 'Fleisch', 'g', [107, 18, 1, 3, 0], 12.0, 60, ['meat', 'protein']),
    F('salami', 'Salami', '🍖', 'Fleisch', 'g', [378, 22, 1, 32, 0], 14.0, 55, ['meat', 'protein']),
    F('bacon', 'Speck', '🥓', 'Fleisch', 'g', [541, 37, 1, 42, 0], 12.0, 50, ['meat', 'protein']),
    F('sausage', 'Bratwurst', '🌭', 'Fleisch', 'g', [301, 13, 2, 27, 0], 8.0, 60, ['meat', 'protein']),

    // Fisch & Meeresfrüchte
    F('salmon', 'Lachs', '🐟', 'Fisch', 'g', [208, 20, 0, 13, 0], 22.0, 80, ['fish', 'protein']),
    F('herring', 'Hering', '🐟', 'Fisch', 'g', [158, 18, 0, 9, 0], 9.0, 75, ['fish', 'protein']),
    F('mackerel', 'Makrele', '🐟', 'Fisch', 'g', [205, 19, 0, 14, 0], 10.0, 75, ['fish', 'protein']),
    F('cod', 'Kabeljau', '🐟', 'Fisch', 'g', [82, 18, 0, 0.7, 0], 16.0, 75, ['fish', 'protein']),
    F('pollock', 'Seelachs', '🐟', 'Fisch', 'g', [81, 18, 0, 0.9, 0], 12.0, 75, ['fish', 'protein']),
    F('shrimp', 'Garnelen', '🦐', 'Fisch', 'g', [99, 24, 0.2, 0.3, 0], 20.0, 70, ['fish', 'protein']),
    F('salmon_smoked', 'Räucherlachs', '🐟', 'Fisch', 'g', [177, 18, 0, 12, 0], 30.0, 70, ['fish', 'protein']),
    F('sardines', 'Sardinen (Dose)', '🐟', 'Fisch', 'g', [208, 25, 0, 11, 0], 8.0, 75, ['fish', 'protein']),

    // Öle & Fette
    F('rapeseed_oil', 'Rapsöl', '🛢️', 'Vorrat', 'ml', [884, 0, 0, 100, 0], 3.0, 0, ['vegan']),
    F('sunflower_oil', 'Sonnenblumenöl', '🛢️', 'Vorrat', 'ml', [884, 0, 0, 100, 0], 2.5, 0, ['vegan']),
    F('coconut_oil', 'Kokosöl', '🥥', 'Vorrat', 'ml', [862, 0, 0, 100, 0], 9.0, 0, ['vegan']),
    F('margarine', 'Margarine', '🧈', 'Vorrat', 'g', [717, 0.2, 0.7, 80, 0], 3.0, 10, ['vegan']),

    // Süßes, Snacks & Aufstriche
    F('honey', 'Honig', '🍯', 'Süßes & Snacks', 'g', [304, 0.3, 82, 0, 0], 12.0, 20, ['vegetarian']),
    F('jam', 'Marmelade', '🍓', 'Süßes & Snacks', 'g', [250, 0.5, 60, 0.1, 1], 4.0, 20, ['vegan']),
    F('nutella', 'Nuss-Nougat-Creme', '🍫', 'Süßes & Snacks', 'g', [539, 6, 57, 31, 4], 7.0, 25, ['vegetarian']),
    F('chocolate_dark', 'Zartbitterschokolade', '🍫', 'Süßes & Snacks', 'g', [546, 8, 46, 31, 11], 10.0, 35, ['vegan', 'iron']),
    F('chocolate_milk', 'Vollmilchschokolade', '🍫', 'Süßes & Snacks', 'g', [535, 8, 59, 30, 3], 8.0, 30, ['vegetarian']),
    F('sugar', 'Zucker', '🍚', 'Süßes & Snacks', 'g', [400, 0, 100, 0, 0], 1.0, 5, ['vegan']),
    F('chips', 'Kartoffelchips', '🍟', 'Süßes & Snacks', 'g', [536, 6, 53, 34, 4], 8.0, 35, ['vegan']),
    F('pretzel', 'Salzbrezel', '🥨', 'Süßes & Snacks', 'g', [380, 10, 79, 3, 3], 5.0, 40, ['vegan']),
    F('cookies', 'Kekse', '🍪', 'Süßes & Snacks', 'g', [480, 6, 65, 21, 2], 5.0, 25, ['vegetarian']),
    F('protein_bar', 'Proteinriegel', '🍫', 'Süßes & Snacks', 'stueck', [350, 30, 35, 9, 5], 1.50, 55, ['vegetarian', 'protein'], 60),
    F('icecream', 'Vanilleeis', '🍨', 'Süßes & Snacks', 'g', [207, 3.5, 24, 11, 0.7], 5.0, 25, ['vegetarian']),

    // Getränke
    F('water', 'Mineralwasser', '💧', 'Getränke', 'ml', [0, 0, 0, 0, 0], 0.4, 10, ['vegan']),
    F('coffee', 'Kaffee (schwarz)', '☕', 'Getränke', 'ml', [2, 0.1, 0, 0, 0], 0.5, 5, ['vegan']),
    F('tea', 'Tee (ungesüßt)', '🍵', 'Getränke', 'ml', [1, 0, 0, 0, 0], 0.5, 5, ['vegan']),
    F('orange_juice', 'Orangensaft', '🧃', 'Getränke', 'ml', [45, 0.7, 10, 0.2, 0.2], 1.5, 25, ['vegan', 'vitaminC']),
    F('apple_juice', 'Apfelsaft', '🧃', 'Getränke', 'ml', [46, 0.1, 11, 0.1, 0.1], 1.2, 20, ['vegan']),
    F('cola', 'Cola', '🥤', 'Getränke', 'ml', [42, 0, 11, 0, 0], 1.2, 10, ['vegan']),
    F('beer', 'Bier', '🍺', 'Getränke', 'ml', [43, 0.5, 3.6, 0, 0], 2.0, 15, ['vegan']),
    F('wine_red', 'Rotwein', '🍷', 'Getränke', 'ml', [85, 0.1, 2.6, 0, 0], 6.0, 10, ['vegan']),
    F('smoothie', 'Smoothie', '🥤', 'Getränke', 'ml', [55, 0.7, 13, 0.2, 1], 3.0, 35, ['vegan', 'vitaminC']),
    F('whey', 'Proteinpulver (Whey)', '🥛', 'Getränke', 'g', [375, 75, 8, 5, 1], 25.0, 60, ['vegetarian', 'protein']),

    // Gewürze, Saucen & Sonstiges
    F('salt', 'Salz', '🧂', 'Gewürze & Kräuter', 'g', [0, 0, 0, 0, 0], 0.5, 0, ['vegan']),
    F('pepper_spice', 'Pfeffer', '🧂', 'Gewürze & Kräuter', 'g', [251, 10, 64, 3, 25], 20.0, 0, ['vegan']),
    F('basil', 'Basilikum', '🌿', 'Gewürze & Kräuter', 'g', [23, 3, 3, 0.6, 1.6], 30.0, 5, ['vegan']),
    F('parsley', 'Petersilie', '🌿', 'Gewürze & Kräuter', 'g', [36, 3, 6, 0.8, 3], 20.0, 5, ['vegan', 'vitaminC']),
    F('ketchup', 'Ketchup', '🍅', 'Fertig & Sonstiges', 'g', [112, 1.3, 26, 0.2, 0.3], 3.0, 15, ['vegan']),
    F('mustard', 'Senf', '🟡', 'Fertig & Sonstiges', 'g', [100, 6, 9, 4, 4], 3.0, 10, ['vegan']),
    F('mayo', 'Mayonnaise', '🥚', 'Fertig & Sonstiges', 'g', [680, 1, 2, 75, 0], 5.0, 15, ['vegetarian']),
    F('soy_sauce', 'Sojasauce', '🍶', 'Fertig & Sonstiges', 'ml', [53, 8, 5, 0.1, 0.8], 6.0, 5, ['vegan']),
    F('pesto', 'Pesto', '🌿', 'Fertig & Sonstiges', 'g', [450, 5, 6, 45, 2], 12.0, 30, ['vegetarian']),
    F('tomato_passata', 'Passierte Tomaten', '🥫', 'Fertig & Sonstiges', 'g', [35, 1.6, 6, 0.3, 1.5], 1.5, 40, ['cheap', 'vegan']),
    F('coconut_milk', 'Kokosmilch', '🥥', 'Fertig & Sonstiges', 'ml', [197, 2, 3, 20, 0], 3.0, 30, ['vegan']),
    F('broth', 'Gemüsebrühe', '🍲', 'Fertig & Sonstiges', 'ml', [4, 0.2, 0.5, 0.1, 0], 1.0, 10, ['vegan']),

    // ===== Erweiterung 2 =====
    // Getreide & Backwaren
    F('buckwheat', 'Buchweizen', '🌾', 'Getreide', 'g', [343, 13, 72, 3, 10], 4.0, 70, ['vegan', 'fiber']),
    F('barley', 'Graupen (Gerste)', '🌾', 'Getreide', 'g', [352, 10, 73, 2, 17], 2.5, 70, ['vegan', 'fiber']),
    F('amaranth', 'Amarant', '🌾', 'Getreide', 'g', [371, 14, 65, 7, 7], 7.0, 70, ['vegan', 'protein', 'fiber']),
    F('gnocchi', 'Gnocchi', '🥟', 'Getreide', 'g', [160, 4, 33, 1, 2], 3.0, 60, ['vegetarian']),
    F('ravioli', 'Ravioli', '🥟', 'Getreide', 'g', [180, 7, 27, 5, 2], 4.0, 60, ['vegetarian']),
    F('lasagne', 'Lasagneplatten', '🍝', 'Getreide', 'g', [355, 12, 71, 2, 3], 2.5, 60, ['vegan']),
    F('breadcrumbs', 'Semmelbrösel', '🍞', 'Backwaren', 'g', [395, 13, 72, 5, 4], 2.5, 30, ['vegetarian']),
    F('pita', 'Pita-Brot', '🫓', 'Backwaren', 'stueck', [275, 9, 55, 1, 2], 0.50, 50, ['vegan'], 60),
    F('pumpernickel', 'Pumpernickel', '🍞', 'Backwaren', 'g', [250, 8, 46, 2, 9], 3.5, 70, ['vegan', 'fiber']),
    F('bagel', 'Bagel', '🥯', 'Backwaren', 'stueck', [250, 10, 48, 2, 2], 0.70, 55, ['vegetarian'], 85),
    F('croissant', 'Croissant', '🥐', 'Backwaren', 'stueck', [406, 8, 45, 21, 2], 0.80, 40, ['vegetarian'], 60),
    F('pancake', 'Pfannkuchen', '🥞', 'Backwaren', 'stueck', [227, 6, 28, 9, 1], 0.60, 50, ['vegetarian'], 80),
    F('waffle', 'Waffel', '🧇', 'Backwaren', 'stueck', [290, 6, 33, 14, 1], 0.70, 45, ['vegetarian'], 75),
    F('popcorn', 'Popcorn', '🍿', 'Süßes & Snacks', 'g', [387, 12, 78, 4, 15], 4.0, 45, ['vegan', 'fiber']),
    F('naan', 'Naan-Brot', '🫓', 'Backwaren', 'stueck', [310, 9, 50, 8, 2], 0.80, 50, ['vegetarian'], 90),

    // Hülsenfrüchte & pflanzliches Protein
    F('butter_beans', 'Butterbohnen', '🫘', 'Hülsenfrüchte', 'g', [115, 7, 20, 0.4, 7], 2.5, 80, ['vegan', 'protein', 'fiber']),
    F('pinto_beans', 'Pintobohnen', '🫘', 'Hülsenfrüchte', 'g', [143, 9, 26, 0.7, 9], 2.5, 80, ['vegan', 'protein', 'iron', 'fiber']),
    F('mung_beans', 'Mungbohnen', '🟢', 'Hülsenfrüchte', 'g', [105, 7, 19, 0.4, 8], 4.0, 75, ['vegan', 'protein', 'fiber']),
    F('fava_beans', 'Dicke Bohnen', '🫘', 'Hülsenfrüchte', 'g', [88, 8, 12, 0.7, 5], 3.0, 75, ['vegan', 'protein', 'fiber']),
    F('falafel', 'Falafel', '🧆', 'Hülsenfrüchte', 'g', [333, 13, 32, 18, 5], 6.0, 65, ['vegan', 'protein', 'fiber']),
    F('tempeh', 'Tempeh', '🟫', 'Hülsenfrüchte', 'g', [193, 19, 9, 11, 6], 9.0, 75, ['vegan', 'protein', 'fiber']),
    F('tvp', 'Sojaschnetzel (TVP)', '🟤', 'Hülsenfrüchte', 'g', [333, 50, 30, 1, 18], 6.0, 80, ['vegan', 'protein', 'iron', 'fiber']),
    F('miso', 'Miso-Paste', '🍶', 'Fertig & Sonstiges', 'g', [199, 12, 26, 6, 5], 12.0, 20, ['vegan', 'protein']),

    // Gemüse
    F('brussels_sprouts', 'Rosenkohl', '🥬', 'Gemüse', 'g', [43, 3.4, 9, 0.3, 4], 3.0, 60, ['vegan', 'vitaminC', 'fiber']),
    F('fennel', 'Fenchel', '🥬', 'Gemüse', 'g', [31, 1.2, 7, 0.2, 3], 3.5, 50, ['vegan', 'fiber']),
    F('parsnip', 'Pastinake', '🥕', 'Gemüse', 'g', [75, 1.2, 18, 0.3, 5], 3.0, 65, ['vegan', 'fiber']),
    F('turnip', 'Steckrübe', '🥬', 'Gemüse', 'g', [38, 1.1, 9, 0.2, 2], 1.5, 55, ['vegan']),
    F('kohlrabi', 'Kohlrabi', '🥬', 'Gemüse', 'g', [27, 1.7, 6, 0.1, 4], 2.0, 50, ['vegan', 'vitaminC', 'fiber']),
    F('chard', 'Mangold', '🥬', 'Gemüse', 'g', [19, 1.8, 4, 0.2, 2], 3.0, 50, ['vegan', 'iron']),
    F('rocket', 'Rucola', '🥬', 'Gemüse', 'g', [25, 2.6, 4, 0.7, 1.6], 8.0, 35, ['vegan', 'iron', 'vitaminC']),
    F('spring_onion', 'Frühlingszwiebel', '🧅', 'Gemüse', 'g', [32, 1.8, 7, 0.2, 2.6], 3.0, 30, ['vegan', 'vitaminC']),
    F('shallot', 'Schalotte', '🧅', 'Gemüse', 'g', [72, 2.5, 17, 0.1, 3], 4.0, 30, ['vegan']),
    F('olives', 'Oliven', '🫒', 'Gemüse', 'g', [145, 1, 6, 15, 3], 9.0, 40, ['vegan']),
    F('sauerkraut', 'Sauerkraut', '🥬', 'Gemüse', 'g', [19, 0.9, 4, 0.1, 3], 2.0, 45, ['vegan', 'fiber', 'vitaminC']),
    F('pickles', 'Gewürzgurken', '🥒', 'Gemüse', 'g', [11, 0.5, 2, 0.2, 1], 2.5, 30, ['vegan']),
    F('artichoke', 'Artischocke', '🌿', 'Gemüse', 'g', [47, 3.3, 11, 0.2, 5], 6.0, 60, ['vegan', 'fiber']),
    F('okra', 'Okra', '🥬', 'Gemüse', 'g', [33, 1.9, 7, 0.2, 3], 6.0, 50, ['vegan', 'fiber']),
    F('sundried_tomato', 'Getrocknete Tomaten', '🍅', 'Gemüse', 'g', [258, 14, 56, 3, 12], 12.0, 45, ['vegan', 'fiber']),

    // Obst
    F('apricot', 'Aprikose', '🍑', 'Obst', 'stueck', [48, 1.4, 11, 0.4, 2], 0.30, 45, ['vegan', 'vitaminC'], 40),
    F('fig', 'Feige', '🟣', 'Obst', 'stueck', [74, 0.8, 19, 0.3, 3], 0.60, 45, ['vegan', 'fiber'], 50),
    F('pomegranate', 'Granatapfel', '🔴', 'Obst', 'stueck', [83, 1.7, 19, 1.2, 4], 2.00, 50, ['vegan', 'vitaminC', 'fiber'], 280),
    F('papaya', 'Papaya', '🟠', 'Obst', 'g', [43, 0.5, 11, 0.3, 1.7], 3.5, 45, ['vegan', 'vitaminC']),
    F('honeydew', 'Honigmelone', '🍈', 'Obst', 'g', [36, 0.5, 9, 0.1, 0.8], 2.0, 40, ['vegan', 'vitaminC']),
    F('clementine', 'Clementine', '🍊', 'Obst', 'stueck', [47, 0.9, 12, 0.2, 1.7], 0.30, 50, ['vegan', 'vitaminC'], 75),
    F('cranberry', 'Cranberrys', '🔴', 'Obst', 'g', [46, 0.4, 12, 0.1, 4.6], 9.0, 45, ['vegan', 'vitaminC', 'fiber']),
    F('blackberry', 'Brombeeren', '🫐', 'Obst', 'g', [43, 1.4, 10, 0.5, 5], 9.0, 50, ['vegan', 'fiber', 'vitaminC']),
    F('lychee', 'Litschi', '⚪', 'Obst', 'g', [66, 0.8, 17, 0.4, 1.3], 8.0, 40, ['vegan', 'vitaminC']),
    F('nectarine', 'Nektarine', '🍑', 'Obst', 'stueck', [44, 1.1, 11, 0.3, 1.7], 0.50, 45, ['vegan', 'vitaminC'], 140),
    F('prunes', 'Trockenpflaumen', '🟤', 'Obst', 'g', [240, 2.2, 64, 0.4, 7], 6.0, 55, ['vegan', 'fiber']),
    F('dried_apricot', 'Trockenaprikosen', '🟠', 'Obst', 'g', [241, 3.4, 63, 0.5, 7], 8.0, 55, ['vegan', 'fiber', 'iron']),

    // Nüsse, Kerne & Mus
    F('brazil_nuts', 'Paranüsse', '🌰', 'Nüsse & Samen', 'g', [659, 14, 12, 67, 8], 16.0, 65, ['vegan', 'protein']),
    F('macadamia', 'Macadamia', '🌰', 'Nüsse & Samen', 'g', [718, 8, 14, 76, 9], 25.0, 65, ['vegan', 'fiber']),
    F('pine_nuts', 'Pinienkerne', '🌰', 'Nüsse & Samen', 'g', [673, 14, 13, 68, 4], 50.0, 55, ['vegan']),
    F('pecans', 'Pekannüsse', '🌰', 'Nüsse & Samen', 'g', [691, 9, 14, 72, 10], 20.0, 60, ['vegan', 'fiber']),
    F('hemp_seeds', 'Hanfsamen', '🌱', 'Nüsse & Samen', 'g', [553, 32, 9, 49, 4], 18.0, 60, ['vegan', 'protein']),
    F('tahini', 'Tahini (Sesammus)', '🥣', 'Nüsse & Samen', 'g', [595, 17, 21, 54, 9], 9.0, 55, ['vegan', 'protein']),
    F('almond_butter', 'Mandelmus', '🥣', 'Nüsse & Samen', 'g', [614, 21, 19, 56, 10], 16.0, 65, ['vegan', 'protein']),

    // Milch & Käse
    F('ricotta', 'Ricotta', '🧀', 'Milch', 'g', [174, 11, 3, 13, 0], 6.0, 55, ['vegetarian', 'protein']),
    F('mascarpone', 'Mascarpone', '🧀', 'Milch', 'g', [430, 5, 4, 44, 0], 8.0, 25, ['vegetarian']),
    F('cream_cheese', 'Frischkäse', '🧀', 'Milch', 'g', [253, 6, 4, 24, 0], 6.0, 40, ['vegetarian']),
    F('camembert', 'Camembert', '🧀', 'Milch', 'g', [300, 20, 0.5, 24, 0], 9.0, 55, ['vegetarian', 'protein']),
    F('brie', 'Brie', '🧀', 'Milch', 'g', [334, 21, 0.5, 28, 0], 10.0, 55, ['vegetarian', 'protein']),
    F('emmental', 'Emmentaler', '🧀', 'Milch', 'g', [380, 28, 0, 30, 0], 11.0, 60, ['vegetarian', 'protein']),
    F('blue_cheese', 'Blauschimmelkäse', '🧀', 'Milch', 'g', [353, 21, 2, 29, 0], 14.0, 55, ['vegetarian', 'protein']),
    F('halloumi', 'Halloumi', '🧀', 'Milch', 'g', [321, 22, 2, 25, 0], 14.0, 60, ['vegetarian', 'protein']),
    F('buttermilk', 'Buttermilch', '🥛', 'Milch', 'ml', [40, 3.4, 4.8, 0.5, 0], 1.2, 45, ['vegetarian', 'protein']),
    F('kefir', 'Kefir', '🥛', 'Milch', 'ml', [55, 3.3, 4, 3, 0], 2.5, 50, ['vegetarian', 'protein']),

    // Fleisch & Wurst
    F('lamb', 'Lammfleisch', '🐑', 'Fleisch', 'g', [294, 25, 0, 21, 0], 18.0, 80, ['meat', 'protein', 'iron']),
    F('veal', 'Kalbfleisch', '🥩', 'Fleisch', 'g', [172, 24, 0, 8, 0], 16.0, 80, ['meat', 'protein']),
    F('duck', 'Entenbrust', '🦆', 'Fleisch', 'g', [201, 23, 0, 12, 0], 14.0, 75, ['meat', 'protein']),
    F('liver', 'Leber', '🥩', 'Fleisch', 'g', [135, 20, 4, 4, 0], 7.0, 70, ['meat', 'protein', 'iron']),
    F('chicken_wings', 'Hähnchenflügel', '🍗', 'Fleisch', 'g', [203, 30, 0, 8, 0], 5.0, 70, ['meat', 'protein']),
    F('chorizo', 'Chorizo', '🌭', 'Fleisch', 'g', [455, 24, 2, 38, 0], 14.0, 55, ['meat', 'protein']),
    F('frankfurter', 'Wiener Würstchen', '🌭', 'Fleisch', 'g', [290, 12, 2, 26, 0], 8.0, 55, ['meat', 'protein']),
    F('leberkaese', 'Leberkäse', '🍖', 'Fleisch', 'g', [280, 13, 1, 24, 0], 8.0, 55, ['meat', 'protein']),
    F('prosciutto', 'Parmaschinken', '🍖', 'Fleisch', 'g', [195, 28, 0, 9, 0], 30.0, 60, ['meat', 'protein']),

    // Fisch & Meeresfrüchte
    F('trout', 'Forelle', '🐟', 'Fisch', 'g', [119, 21, 0, 4, 0], 14.0, 75, ['fish', 'protein']),
    F('tilapia', 'Tilapia', '🐟', 'Fisch', 'g', [96, 20, 0, 2, 0], 12.0, 75, ['fish', 'protein']),
    F('plaice', 'Scholle', '🐟', 'Fisch', 'g', [86, 17, 0, 1.5, 0], 14.0, 70, ['fish', 'protein']),
    F('crab', 'Krabben', '🦀', 'Fisch', 'g', [97, 19, 0, 1.5, 0], 22.0, 70, ['fish', 'protein']),
    F('mussels', 'Miesmuscheln', '🦪', 'Fisch', 'g', [86, 12, 4, 2, 0], 8.0, 65, ['fish', 'protein', 'iron']),
    F('squid', 'Tintenfisch', '🦑', 'Fisch', 'g', [92, 16, 3, 1.4, 0], 14.0, 65, ['fish', 'protein']),
    F('anchovies', 'Sardellen', '🐟', 'Fisch', 'g', [131, 20, 0, 5, 0], 14.0, 60, ['fish', 'protein']),
    F('fish_fingers', 'Fischstäbchen', '🐟', 'Fertig & Sonstiges', 'g', [200, 12, 18, 9, 1], 7.0, 60, ['fish', 'protein']),

    // Öle & Fette
    F('sesame_oil', 'Sesamöl', '🛢️', 'Vorrat', 'ml', [884, 0, 0, 100, 0], 9.0, 0, ['vegan']),
    F('ghee', 'Butterschmalz (Ghee)', '🧈', 'Vorrat', 'g', [900, 0, 0, 100, 0], 8.0, 0, ['vegetarian']),
    F('lard', 'Schweineschmalz', '🧈', 'Vorrat', 'g', [902, 0, 0, 100, 0], 4.0, 0, ['meat']),

    // Süßes, Snacks & Aufstriche
    F('gummy_bears', 'Gummibärchen', '🐻', 'Süßes & Snacks', 'g', [343, 7, 77, 0.2, 0], 6.0, 15, ['vegetarian']),
    F('marzipan', 'Marzipan', '🍬', 'Süßes & Snacks', 'g', [479, 9, 50, 27, 5], 12.0, 25, ['vegetarian']),
    F('trail_mix', 'Studentenfutter', '🥜', 'Süßes & Snacks', 'g', [484, 14, 38, 30, 6], 9.0, 55, ['vegetarian', 'protein']),
    F('crackers', 'Cracker', '🍘', 'Süßes & Snacks', 'g', [430, 9, 68, 13, 3], 5.0, 35, ['vegetarian']),
    F('tortilla_chips', 'Tortilla-Chips', '🌽', 'Süßes & Snacks', 'g', [497, 7, 63, 24, 5], 7.0, 35, ['vegan']),
    F('muesli_bar', 'Müsliriegel', '🍫', 'Süßes & Snacks', 'stueck', [400, 7, 64, 13, 5], 0.80, 45, ['vegetarian', 'fiber'], 30),
    F('donut', 'Donut', '🍩', 'Süßes & Snacks', 'stueck', [452, 5, 51, 25, 1], 1.00, 30, ['vegetarian'], 60),
    F('cake', 'Kuchen', '🍰', 'Süßes & Snacks', 'g', [350, 5, 50, 15, 1], 8.0, 30, ['vegetarian']),
    F('pudding', 'Pudding', '🍮', 'Süßes & Snacks', 'g', [110, 3, 18, 3, 0], 2.5, 35, ['vegetarian']),

    // Getränke
    F('green_tea', 'Grüner Tee', '🍵', 'Getränke', 'ml', [1, 0, 0, 0, 0], 0.6, 5, ['vegan']),
    F('hot_chocolate', 'Kakao (Getränk)', '☕', 'Getränke', 'ml', [80, 3.4, 11, 2.5, 0], 2.0, 25, ['vegetarian']),
    F('energy_drink', 'Energydrink', '🥫', 'Getränke', 'ml', [45, 0, 11, 0, 0], 3.0, 10, ['vegan']),
    F('lemonade', 'Limonade', '🥤', 'Getränke', 'ml', [38, 0, 9, 0, 0], 1.0, 10, ['vegan']),
    F('iced_tea', 'Eistee', '🧉', 'Getränke', 'ml', [30, 0, 7, 0, 0], 1.0, 10, ['vegan']),
    F('milkshake', 'Milchshake', '🥤', 'Getränke', 'ml', [112, 3.5, 18, 3, 0], 3.0, 35, ['vegetarian']),
    F('cappuccino', 'Cappuccino', '☕', 'Getränke', 'ml', [40, 2.2, 4, 1.8, 0], 2.0, 15, ['vegetarian']),
    F('sparkling_wine', 'Sekt', '🥂', 'Getränke', 'ml', [80, 0.2, 1.5, 0, 0], 8.0, 10, ['vegan']),

    // Gewürze, Kräuter, Backzutaten
    F('cinnamon', 'Zimt', '🟤', 'Gewürze & Kräuter', 'g', [247, 4, 81, 1.2, 53], 20.0, 0, ['vegan']),
    F('paprika_powder', 'Paprikapulver', '🌶️', 'Gewürze & Kräuter', 'g', [282, 14, 54, 13, 35], 15.0, 0, ['vegan']),
    F('curry_powder', 'Currypulver', '🍛', 'Gewürze & Kräuter', 'g', [325, 13, 56, 14, 33], 12.0, 0, ['vegan']),
    F('cumin', 'Kreuzkümmel', '🟤', 'Gewürze & Kräuter', 'g', [375, 18, 44, 22, 11], 18.0, 0, ['vegan', 'iron']),
    F('turmeric', 'Kurkuma', '🟡', 'Gewürze & Kräuter', 'g', [354, 8, 65, 10, 21], 14.0, 0, ['vegan']),
    F('oregano', 'Oregano', '🌿', 'Gewürze & Kräuter', 'g', [265, 9, 69, 4, 43], 20.0, 0, ['vegan']),
    F('vanilla_sugar', 'Vanillezucker', '🍦', 'Gewürze & Kräuter', 'g', [400, 0, 99, 0, 0], 10.0, 0, ['vegan']),
    F('cocoa_powder', 'Kakaopulver', '🍫', 'Gewürze & Kräuter', 'g', [228, 20, 58, 14, 33], 8.0, 5, ['vegan', 'iron', 'fiber']),
    F('yeast', 'Hefe', '🟤', 'Gewürze & Kräuter', 'g', [105, 11, 13, 2, 6], 8.0, 0, ['vegan']),
    F('baking_powder', 'Backpulver', '⚪', 'Gewürze & Kräuter', 'g', [53, 0, 28, 0, 0], 6.0, 0, ['vegan']),
    F('vinegar', 'Essig', '🍶', 'Gewürze & Kräuter', 'ml', [18, 0, 0.6, 0, 0], 1.5, 0, ['vegan']),
    F('balsamic', 'Balsamico', '🍶', 'Gewürze & Kräuter', 'ml', [88, 0.5, 17, 0, 0], 5.0, 0, ['vegan']),

    // Fertig & Sonstiges
    F('tomato_paste', 'Tomatenmark', '🥫', 'Fertig & Sonstiges', 'g', [82, 4, 19, 0.5, 4], 3.0, 25, ['vegan', 'fiber']),
    F('salsa', 'Salsa', '🍅', 'Fertig & Sonstiges', 'g', [36, 1.5, 7, 0.2, 1.8], 4.0, 25, ['vegan']),
    F('guacamole', 'Guacamole', '🥑', 'Fertig & Sonstiges', 'g', [150, 2, 8, 13, 6], 9.0, 45, ['vegan', 'fiber']),
    F('tzatziki', 'Tzatziki', '🥒', 'Fertig & Sonstiges', 'g', [120, 4, 4, 10, 0.5], 5.0, 35, ['vegetarian']),
    F('bbq_sauce', 'BBQ-Sauce', '🍖', 'Fertig & Sonstiges', 'g', [172, 0.8, 41, 0.5, 0.7], 4.0, 15, ['vegan']),
    F('curry_paste', 'Currypaste', '🍛', 'Fertig & Sonstiges', 'g', [130, 3, 14, 7, 3], 8.0, 15, ['vegan']),
    F('bouillon_cube', 'Brühwürfel', '🧊', 'Fertig & Sonstiges', 'g', [230, 9, 19, 14, 1], 6.0, 5, ['vegan']),
    F('instant_noodles', 'Instant-Nudeln', '🍜', 'Fertig & Sonstiges', 'g', [440, 9, 60, 18, 3], 4.0, 45, ['vegetarian']),
    F('frozen_pizza', 'Tiefkühlpizza', '🍕', 'Fertig & Sonstiges', 'g', [250, 11, 30, 9, 2], 5.0, 55, ['vegetarian']),
    F('baked_beans', 'Baked Beans', '🫘', 'Fertig & Sonstiges', 'g', [94, 5, 15, 0.5, 4], 2.5, 70, ['vegan', 'protein', 'fiber']),
    F('sushi', 'Sushi', '🍣', 'Fertig & Sonstiges', 'g', [150, 6, 28, 2, 1], 12.0, 60, ['fish']),
    F('protein_pudding', 'Protein-Pudding', '🍮', 'Fertig & Sonstiges', 'g', [70, 10, 5, 1, 0], 5.0, 60, ['vegetarian', 'protein'])
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

  // ===== Übungen (Phase 2: Home-Workout ohne Geräte) =====
  // group: push | legs | core | cardio | back ; type: strength | hold | cardio | mobility
  const E = (id, name, emoji, grad, group, equipment, level, type, reps, sets, hold, technique, nextVariantId) =>
    ({ id, name, emoji, grad, group, equipment, level, type, reps, sets, hold, technique, nextVariantId: nextVariantId || null });

  const exercises = [
    // Push
    E('knee_pushups', 'Knie-Liegestütze', '🤸', 'sunrise', 'push', 'none', 'beginner', 'strength', 10, 3, null,
      'Auf den Knien abstützen, Körper gerade. Langsam absenken, kraftvoll hochdrücken.', 'pushups'),
    E('pushups', 'Liegestütze', '💪', 'terracotta', 'push', 'none', 'intermediate', 'strength', 12, 3, null,
      'Hände schulterbreit, Körper bildet eine Linie. Bis kurz über den Boden absenken.', 'diamond_pushups'),
    E('diamond_pushups', 'Diamant-Liegestütze', '🔥', 'terracotta', 'push', 'none', 'advanced', 'strength', 10, 3, null,
      'Hände unter der Brust zu einem Dreieck. Trizeps-betont absenken.', null),
    E('pike_pushups', 'Pike-Liegestütze', '🔺', 'amber', 'push', 'none', 'intermediate', 'strength', 8, 3, null,
      'Hüfte hoch (umgekehrtes V), Kopf Richtung Boden senken — trainiert die Schultern.', null),
    E('chair_dips', 'Trizeps-Dips (Stuhl)', '🪑', 'amber', 'push', 'minimal', 'beginner', 'strength', 10, 3, null,
      'Hände auf eine Stuhlkante, Körper absenken, mit den Armen hochdrücken.', null),
    // Legs
    E('squats', 'Kniebeugen', '🦵', 'sage', 'legs', 'none', 'beginner', 'strength', 15, 3, null,
      'Füße schulterbreit, Po nach hinten, Knie über den Füßen. Tief gehen, dann hoch.', 'jump_squats'),
    E('jump_squats', 'Sprung-Kniebeugen', '⚡', 'terracotta', 'legs', 'none', 'intermediate', 'cardio', 12, 3, null,
      'Aus der Kniebeuge kraftvoll abspringen, weich landen.', null),
    E('lunges', 'Ausfallschritte', '🚶', 'sage', 'legs', 'none', 'beginner', 'strength', 12, 3, null,
      'Großer Schritt nach vorn, beide Knie 90°. Pro Bein zählen.', null),
    E('glute_bridge', 'Beckenheben', '🌉', 'peach', 'legs', 'none', 'beginner', 'strength', 15, 3, null,
      'Auf dem Rücken, Füße aufgestellt, Becken hochdrücken, Po anspannen.', null),
    E('wall_sit', 'Wandsitz', '🧱', 'sage', 'legs', 'none', 'beginner', 'hold', null, 3, 30,
      'Rücken an die Wand, Oberschenkel waagerecht — halten.', null),
    E('calf_raises', 'Wadenheben', '🦶', 'peach', 'legs', 'none', 'beginner', 'strength', 20, 3, null,
      'Auf die Zehenspitzen hoch, langsam absenken.', null),
    // Core
    E('plank', 'Unterarmstütz (Plank)', '🪵', 'amber', 'core', 'none', 'beginner', 'hold', null, 3, 30,
      'Unterarme und Zehen, Körper bildet eine gerade Linie. Bauch anspannen, halten.', null),
    E('crunches', 'Crunches', '🌀', 'sunrise', 'core', 'none', 'beginner', 'strength', 15, 3, null,
      'Auf dem Rücken, Schultern leicht anheben, Bauch anspannen.', null),
    E('mountain_climbers', 'Mountain Climbers', '⛰️', 'terracotta', 'core', 'none', 'intermediate', 'cardio', 20, 3, null,
      'Im Liegestütz die Knie abwechselnd zur Brust ziehen — zügig.', null),
    E('bird_dog', 'Bird-Dog', '🐦', 'sage', 'core', 'none', 'beginner', 'mobility', 12, 3, null,
      'Im Vierfüßler gegenüberliegenden Arm + Bein strecken, kurz halten, wechseln.', null),
    E('superman', 'Superman', '🦸', 'sunrise', 'back', 'none', 'beginner', 'strength', 12, 3, null,
      'Bäuchlings Arme und Beine anheben, kurz halten — stärkt den unteren Rücken.', null),
    // Cardio
    E('jumping_jacks', 'Hampelmänner', '🤾', 'peach', 'cardio', 'none', 'beginner', 'cardio', 30, 3, null,
      'Arme und Beine gleichzeitig auf und zu — gleichmäßiger Rhythmus.', null),
    E('high_knees', 'Knieheben', '🏃', 'amber', 'cardio', 'none', 'beginner', 'cardio', 30, 3, null,
      'Auf der Stelle laufen, Knie hoch zur Hüfte.', null),
    E('burpees', 'Burpees', '💥', 'terracotta', 'cardio', 'none', 'advanced', 'cardio', 10, 3, null,
      'Kniebeuge → Liegestütz → Strecksprung. Ganzkörper, intensiv.', null)
  ];

  // Kurzvideos (Wikimedia Commons, frei, schlüssellos) – wo eine korrekte
  // Körpergewichts-Demonstration verfügbar ist.
  const EX_VIDEO = {
    jumping_jacks: 'https://upload.wikimedia.org/wikipedia/commons/0/02/Jumping_jack_Animation.gif',
    squats: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Squat_-_exercise_demonstration_video.webm',
    jump_squats: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Squats.gif',
    lunges: 'https://upload.wikimedia.org/wikipedia/commons/a/af/Lunge-CDC_strength_training_for_older_adults.gif',
    crunches: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Situps.gif',
    pushups: 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Pushups.gif',
    knee_pushups: 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Pushups.gif',
    diamond_pushups: 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Pushups.gif',
    high_knees: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/High_knees.gif',
    burpees: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Burpee.gif'
  };
  exercises.forEach(e => { if (EX_VIDEO[e.id]) e.video = EX_VIDEO[e.id]; });

  // ===== Kuratierte Trainings-Sessions (schön, einfach, motivierend) =====
  // goals: lose | muscle | health | family ; items verweisen auf Übungs-IDs
  const si = (exerciseId, sets, reps, hold) => ({ exerciseId, sets, reps: reps || null, hold: hold || null });
  const S = (id, name, emoji, grad, goals, minutes, level, blurb, items) => ({ id, name, emoji, grad, goals, minutes, level, blurb, items });

  const sessions = [
    S('gentle_start', 'Sanfter Einstieg', '🌱', 'sage', ['health', 'family'], 10, 'beginner',
      'Ruhig starten – ideal für den Wiedereinstieg ohne Überforderung.',
      [si('knee_pushups', 3, 8), si('squats', 3, 12), si('glute_bridge', 3, 12), si('bird_dog', 3, 10), si('wall_sit', 3, null, 20)]),
    S('morning_energy', 'Energie am Morgen', '🌅', 'sunrise', ['health', 'family'], 10, 'beginner',
      'Wach werden und mit Schwung in den Tag starten.',
      [si('jumping_jacks', 3, 30), si('squats', 3, 12), si('high_knees', 3, 30), si('glute_bridge', 3, 12)]),
    S('fatburn_hiit', 'Fettverbrennung HIIT', '🔥', 'terracotta', ['lose'], 20, 'intermediate',
      'Intensiv und kurz – kurbelt den Kalorienverbrauch ordentlich an.',
      [si('jumping_jacks', 4, 30), si('jump_squats', 4, 12), si('mountain_climbers', 4, 20), si('high_knees', 4, 30), si('burpees', 3, 8)]),
    S('cardio_blast', 'Cardio Kickstart', '⚡', 'amber', ['lose', 'health'], 15, 'beginner',
      'Herz-Kreislauf sanft in Fahrt bringen – gut für Ausdauer & Abnehmen.',
      [si('jumping_jacks', 3, 30), si('high_knees', 3, 30), si('mountain_climbers', 3, 20), si('jump_squats', 3, 12)]),
    S('strength_full', 'Kraft Ganzkörper', '💪', 'terracotta', ['muscle'], 30, 'intermediate',
      'Ganzkörper-Kraft mit Steigerung – baut Muskeln zu Hause auf.',
      [si('pushups', 4, 12), si('squats', 4, 15), si('lunges', 4, 12), si('pike_pushups', 3, 8), si('superman', 3, 12), si('plank', 3, null, 40)]),
    S('upper_body', 'Oberkörper Kraft', '🦾', 'amber', ['muscle'], 15, 'intermediate',
      'Brust, Schultern, Arme und Rücken gezielt fordern.',
      [si('pushups', 4, 12), si('pike_pushups', 3, 10), si('chair_dips', 3, 10), si('superman', 3, 12)]),
    S('legs_glutes', 'Beine & Po', '🍑', 'peach', ['muscle', 'health'], 15, 'beginner',
      'Kräftige Beine und ein starker Po – spürbar nach wenigen Einheiten.',
      [si('squats', 4, 15), si('lunges', 4, 12), si('glute_bridge', 4, 15), si('wall_sit', 3, null, 30), si('calf_raises', 3, 20)]),
    S('core_special', 'Bauch-Spezial', '🌀', 'sunrise', ['lose', 'health'], 12, 'beginner',
      'Fokus auf die Körpermitte – für einen stabilen Rumpf.',
      [si('crunches', 4, 15), si('plank', 3, null, 30), si('mountain_climbers', 3, 20), si('bird_dog', 3, 12)]),
    S('mobility', 'Beweglichkeit & Entspannung', '🧘', 'sage', ['health', 'family'], 10, 'beginner',
      'Locker werden und Verspannungen lösen – auch als Ausgleich zum Sitzen.',
      [si('bird_dog', 3, 12), si('glute_bridge', 3, 12), si('wall_sit', 3, null, 20), si('plank', 3, null, 20)])
  ];

  const GCONTENT = { foods, recipes, exercises, sessions };
  if (typeof window !== 'undefined') window.GCONTENT = GCONTENT;
  if (typeof module !== 'undefined' && module.exports) module.exports = GCONTENT;
})(typeof window !== 'undefined' ? window : globalThis);
