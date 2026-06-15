/* Gesundheits-App — Inhalte: Übungen (Home-Workout ohne Geräte) inkl. Foto-Demos
   © 2026 Marcel Fehse. Alle Rechte vorbehalten. */
(function (root) {
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
      'Kniebeuge → Liegestütz → Strecksprung. Ganzkörper, intensiv.', null),

    // ===== Erweiterung: mehr Vielfalt & Progression =====
    // Push
    E('incline_pushups', 'Erhöhte Liegestütze', '📐', 'sunrise', 'push', 'minimal', 'beginner', 'strength', 12, 3, null,
      'Hände erhöht auf Tisch oder Stuhl. Leichter als am Boden – ideal zum Reinkommen.', 'pushups'),
    E('wide_pushups', 'Breite Liegestütze', '🙌', 'amber', 'push', 'none', 'intermediate', 'strength', 12, 3, null,
      'Hände deutlich weiter als schulterbreit – betont die Brust.', 'decline_pushups'),
    E('decline_pushups', 'Erhöhte Füße-Liegestütze', '⛰️', 'terracotta', 'push', 'minimal', 'advanced', 'strength', 10, 3, null,
      'Füße erhöht auf einer Stufe. Mehr Gewicht auf Brust und Schultern – anspruchsvoll.', null),
    E('chest_stretch', 'Brust-Dehnung', '🤲', 'sage', 'push', 'none', 'beginner', 'mobility', 10, 2, null,
      'Arme öffnen und Brust dehnen, sanft im Wechsel – lockert nach dem Drücken.', null),
    // Legs
    E('step_ups', 'Step-Ups mit Kniehub', '🪜', 'peach', 'legs', 'minimal', 'beginner', 'cardio', 16, 3, null,
      'Auf eine Stufe steigen, das andere Knie hochziehen. Im Wechsel, zügig. Pro Bein zählen.', null),
    E('hip_circles', 'Hüftkreisen', '🔄', 'sage', 'legs', 'none', 'beginner', 'mobility', 12, 2, null,
      'Hände in die Hüfte, große Kreise mit dem Becken – mobilisiert vor dem Training.', null),
    // Back
    E('good_morning', 'Good Morning', '🌄', 'amber', 'back', 'none', 'beginner', 'strength', 12, 3, null,
      'Hände an den Kopf, Oberkörper mit geradem Rücken nach vorn beugen, wieder aufrichten.', null),
    E('toe_touches', 'Zehen berühren (Stehen)', '🤸', 'sunrise', 'back', 'none', 'beginner', 'mobility', 12, 2, null,
      'Im Stehen langsam zu den Zehen beugen, Rücken lang lassen – dehnt die Rückseite.', null),
    // Core
    E('sit_ups', 'Sit-Ups', '🛌', 'sage', 'core', 'none', 'beginner', 'strength', 15, 3, null,
      'Voll aufrichten bis der Oberkörper senkrecht ist, kontrolliert ablegen.', 'jackknife'),
    E('jackknife', 'Klappmesser', '🔪', 'terracotta', 'core', 'none', 'advanced', 'strength', 12, 3, null,
      'Arme und Beine gleichzeitig anheben, Hände Richtung Füße – starke Bauchspannung.', null),
    E('leg_raises', 'Beinheben', '🦵', 'amber', 'core', 'none', 'beginner', 'strength', 12, 3, null,
      'Auf dem Rücken, gestreckte Beine langsam heben und senken, ohne abzulegen.', null),
    E('reverse_crunch', 'Reverse Crunch', '🔁', 'peach', 'core', 'none', 'intermediate', 'strength', 15, 3, null,
      'Knie zur Brust ziehen und Becken leicht anheben – betont den unteren Bauch.', null),
    E('bicycle_crunch', 'Fahrrad-Crunch', '🚲', 'sunrise', 'core', 'none', 'intermediate', 'strength', 20, 3, null,
      'Ellbogen zum gegenüberliegenden Knie, Beine wie beim Radfahren – im Wechsel.', null),
    E('russian_twist', 'Russian Twist', '🌀', 'terracotta', 'core', 'none', 'intermediate', 'strength', 20, 3, null,
      'Leicht zurücklehnen, Oberkörper nach links und rechts drehen. Pro Seite zählen.', null),
    E('side_plank', 'Seitstütz', '📏', 'amber', 'core', 'none', 'intermediate', 'hold', null, 3, 20,
      'Auf einem Unterarm seitlich abstützen, Körper gerade halten. Pro Seite halten.', null)
  ];

  // Echte Foto-Demos einer Person (free-exercise-db, CC0, via jsDelivr – schlüssellos).
  // Je Übung 2 Frames (0.jpg/1.jpg), die der Player abwechselnd zeigt → Bewegung.
  // Varianten teilen sich die passende Grundübung. Ohne Treffer: Emoji-Karte.
  const EX_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/';
  // Alle 19 Übungen bekommen eine Foto-Demo derselben Person (gleiche Quelle/Figur).
  // Wo es die exakte Übung nicht gibt, die nächstpassende Bewegung der gleichen Person.
  const EX_PHOTO = {
    pushups: 'Pushups', knee_pushups: 'Pushups', diamond_pushups: 'Pushups', pike_pushups: 'Pushups',
    chair_dips: 'Bench_Dips',
    squats: 'Bodyweight_Squat', jump_squats: 'Bodyweight_Squat', wall_sit: 'Bodyweight_Squat', burpees: 'Bodyweight_Squat',
    lunges: 'Bodyweight_Walking_Lunge',
    calf_raises: 'Standing_Calf_Raises',
    plank: 'Plank', crunches: 'Crunches',
    mountain_climbers: 'Mountain_Climbers', high_knees: 'Mountain_Climbers',
    superman: 'Superman', bird_dog: 'Flutter_Kicks',
    glute_bridge: 'Bottoms_Up', jumping_jacks: 'Rope_Jumping',
    incline_pushups: 'Incline_Push-Up', wide_pushups: 'Push-Up_Wide', decline_pushups: 'Decline_Push-Up',
    chest_stretch: 'Dynamic_Chest_Stretch', step_ups: 'Step-up_with_Knee_Raise', hip_circles: 'Standing_Hip_Circles',
    good_morning: 'Good_Morning', toe_touches: 'Standing_Toe_Touches', sit_ups: 'Sit-Up', jackknife: 'Jackknife_Sit-Up',
    leg_raises: 'Flat_Bench_Lying_Leg_Raise', reverse_crunch: 'Reverse_Crunch', bicycle_crunch: 'Cross-Body_Crunch',
    russian_twist: 'Russian_Twist', side_plank: 'Side_Bridge'
  };
  exercises.forEach(e => { const f = EX_PHOTO[e.id]; if (f) e.anim = { a: `${EX_BASE}${f}/0.jpg`, b: `${EX_BASE}${f}/1.jpg` }; });

  // Übung → 3D-Animationsname (Datei: models/anim/<name>.glb). Der Coach macht die
  // Bewegung im Player als 3D-Figur vor; fehlt das GLB, greift die Foto-Demo oben.
  // Varianten teilen sich die passende Grundbewegung (analog EX_PHOTO).
  const EX_ANIM_3D = {
    pushups: 'pushup', knee_pushups: 'pushup', diamond_pushups: 'pushup', pike_pushups: 'pushup',
    incline_pushups: 'pushup', wide_pushups: 'pushup', decline_pushups: 'pushup', chair_dips: 'pushup',
    squats: 'squat', jump_squats: 'squat', wall_sit: 'squat',
    lunges: 'lunge', step_ups: 'lunge',
    jumping_jacks: 'jumping_jacks', high_knees: 'jumping_jacks',
    burpees: 'burpee', mountain_climbers: 'burpee',
    plank: 'plank', side_plank: 'plank',
    sit_ups: 'situp', crunches: 'situp', jackknife: 'situp', leg_raises: 'situp',
    reverse_crunch: 'situp', bicycle_crunch: 'situp', russian_twist: 'situp'
  };

  root.GCPARTS = root.GCPARTS || {};
  root.GCPARTS.exercises = exercises;
  root.EX_ANIM_3D = EX_ANIM_3D;
  if (typeof module !== 'undefined' && module.exports) module.exports = exercises;
})(typeof window !== 'undefined' ? window : globalThis);
