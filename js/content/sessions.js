/* Gesundheits-App — Inhalte: Kuratierte Trainings-Sessions
   © 2026 Marcel Fehse. Alle Rechte vorbehalten. */
(function (root) {
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
      [si('bird_dog', 3, 12), si('glute_bridge', 3, 12), si('wall_sit', 3, null, 20), si('plank', 3, null, 20)]),

    // ===== Erweiterung: mehr Sessions =====
    S('core_advanced', 'Bauch Intensiv', '🔥', 'terracotta', ['lose', 'muscle'], 18, 'intermediate',
      'Fordert die Körpermitte aus allen Winkeln – für sichtbar mehr Rumpfkraft.',
      [si('sit_ups', 4, 15), si('bicycle_crunch', 4, 20), si('russian_twist', 4, 20), si('leg_raises', 3, 12), si('reverse_crunch', 3, 15), si('side_plank', 3, null, 20)]),
    S('push_progression', 'Liegestütz-Programm', '💪', 'amber', ['muscle'], 20, 'intermediate',
      'Vom Einstieg bis fordernd – baut die Druckkraft Schritt für Schritt auf.',
      [si('incline_pushups', 3, 12), si('pushups', 4, 12), si('wide_pushups', 3, 12), si('decline_pushups', 3, 8), si('chest_stretch', 2, 10)]),
    S('back_core', 'Rücken & Mitte', '🌄', 'sage', ['health', 'muscle'], 15, 'beginner',
      'Stärkt Rücken und Rumpf – gut gegen die Folgen von langem Sitzen.',
      [si('good_morning', 3, 12), si('superman', 3, 12), si('bird_dog', 3, 12), si('side_plank', 3, null, 20), si('toe_touches', 2, 12)]),
    S('warmup_mobility', 'Aufwärmen & Mobilität', '🤸', 'sunrise', ['health', 'family'], 8, 'beginner',
      'Kurz mobilisieren, bevor es losgeht – macht locker und beugt Verspannungen vor.',
      [si('hip_circles', 2, 12), si('chest_stretch', 2, 10), si('toe_touches', 2, 12), si('jumping_jacks', 3, 30)]),
    S('full_advanced', 'Ganzkörper Fortgeschritten', '⚡', 'terracotta', ['lose', 'muscle'], 30, 'advanced',
      'Intensives Ganzkörper-Workout für alle, die schon fitter sind.',
      [si('burpees', 4, 10), si('decline_pushups', 3, 10), si('jump_squats', 4, 12), si('jackknife', 3, 12), si('mountain_climbers', 4, 20), si('side_plank', 3, null, 25)])
  ];

  root.GCPARTS = root.GCPARTS || {};
  root.GCPARTS.sessions = sessions;
  if (typeof module !== 'undefined' && module.exports) module.exports = sessions;
})(typeof window !== 'undefined' ? window : globalThis);
