/* Gesundheits-App — Konfiguration & Seed-Daten (Phase 0)
   © 2026 Marcel Fehse. Alle Rechte vorbehalten.
   Inhalts-DB (Rezepte/Übungen/Lebensmittel) folgt in Phase 1–4 als data/*.json. */

window.GDATA = {
  // Tabs der Bottom-Navigation
  tabs: [
    { id: 'dashboard',  label: 'Heute',     icon: '🏠' },
    { id: 'ernaehrung', label: 'Ernährung', icon: '🥗' },
    { id: 'tracker',    label: 'Kalorien',  icon: '🔥' },
    { id: 'training',   label: 'Training',  icon: '💪' },
    { id: 'einkauf',    label: 'Einkauf',   icon: '🛒' }
  ],

  // Onboarding-Quiz: jede Stufe schreibt in profile[key]
  onboarding: [
    {
      key: 'goal', question: 'Was ist dein Ziel?',
      options: [
        { value: 'health',  emoji: '❤️', label: 'Gesünder leben',  desc: 'Mehr Energie, ausgewogene Ernährung' },
        { value: 'lose',    emoji: '⚖️', label: 'Abnehmen',        desc: 'Gewicht reduzieren, satt bleiben' },
        { value: 'muscle',  emoji: '💪', label: 'Muskeln aufbauen', desc: 'Kraft & Aufbau zu Hause' },
        { value: 'family',  emoji: '👨‍👩‍👧', label: 'Familie versorgen', desc: 'Einfach, günstig, für alle' }
      ]
    },
    {
      key: 'timePerDay', question: 'Wie viel Zeit hast du pro Tag fürs Training?',
      options: [
        { value: 10, emoji: '⏱️', label: '5–10 Minuten',  desc: 'Kurz & knackig' },
        { value: 20, emoji: '⏲️', label: '15–20 Minuten', desc: 'Solides Workout' },
        { value: 35, emoji: '🕐', label: '30–45 Minuten', desc: 'Voller Einsatz' }
      ]
    },
    {
      key: 'budget', question: 'Wie sieht dein Lebensmittel-Budget aus?',
      options: [
        { value: 'low',    emoji: '💶', label: 'Knapp',    desc: 'So günstig wie möglich' },
        { value: 'medium', emoji: '💶💶', label: 'Normal',  desc: 'Ausgewogen' },
        { value: 'high',   emoji: '💶💶💶', label: 'Flexibel', desc: 'Qualität vor Preis' }
      ]
    },
    {
      key: 'dietType', question: 'Wie möchtest du dich ernähren?',
      options: [
        { value: 'omnivore',   emoji: '🍗', label: 'Mit Fleisch',  desc: 'Alles erlaubt' },
        { value: 'lowMeat',    emoji: '🥦', label: 'Fleischarm',   desc: 'Meist pflanzlich (≈80 %)' },
        { value: 'vegetarian', emoji: '🧀', label: 'Vegetarisch',  desc: 'Ohne Fleisch & Fisch' }
      ]
    },
    {
      key: 'fitnessLevel', question: 'Wie fit bist du gerade?',
      options: [
        { value: 'beginner',     emoji: '🌱', label: 'Anfänger',      desc: 'Neu oder lange pausiert' },
        { value: 'intermediate', emoji: '🌿', label: 'Geübt',         desc: 'Regelmäßig aktiv' },
        { value: 'advanced',     emoji: '🌳', label: 'Fortgeschritten', desc: 'Trainiert seit Jahren' }
      ]
    },
    {
      key: 'dailyContext', question: 'Wie ist dein Alltag meistens?',
      options: [
        { value: 'busy',   emoji: '🏃', label: 'Stressig',  desc: 'Wenig Zeit, viel los' },
        { value: 'normal', emoji: '🙂', label: 'Normal',    desc: 'Geregelter Tagesablauf' },
        { value: 'relaxed', emoji: '🌤️', label: 'Viel Zeit', desc: 'Flexibel planbar' }
      ]
    },
    {
      key: 'householdSize', question: 'Für wie viele Personen kochst du?',
      options: [
        { value: 1, emoji: '👤',  label: '1 Person',     desc: 'Nur ich' },
        { value: 2, emoji: '👥',  label: '2 Personen',   desc: 'Paar' },
        { value: 4, emoji: '👨‍👩‍👧', label: '3–4 Personen', desc: 'Familie' },
        { value: 6, emoji: '👨‍👩‍👧‍👦', label: '5+ Personen',  desc: 'Große Familie' }
      ]
    }
  ],

  // KI-Worker (Cloudflare, generischer Gemini-Proxy). Persona steuern wir über
  // kiSystemPrompt + Avatar — der Gemini-Key bleibt sicher im Worker.
  kiEndpoint: 'https://dogmatch-gemini-proxy.marcelfehse22.workers.dev',

  // 6 wählbare Coach-Avatare. `persona` wird dem System-Prompt vorangestellt.
  // `lines`: Workout-Ansagen im Charakter (Platzhalter: {ex} {target} {set} {sets} {next}).
  coachAvatars: [
    { id: 'max', name: 'Max', emoji: '💪', grad: 'terracotta', gender: 'm', voiceTts: 'Fenrir', tag: 'Motivation & Disziplin', focus: 'Training, Disziplin, Leistung',
      persona: 'Du bist MAX – ein sehr motivierender, direkter Fitness-Coach. Dein Schwerpunkt: Training, Disziplin, Leistung. Sprich kraftvoll und anfeuernd, in kurzen knackigen Sätzen wie ein Trainer im Gym ("Los geht\'s!", "Du packst das!"). Pushe den Nutzer, ohne unfreundlich oder verletzend zu sein.',
      lines: {
        start: ['Los geht\'s! Wir ziehen das jetzt gemeinsam durch!', 'Bereit? Keine Ausreden – wir starten!'],
        work: ['{ex}! {target}. Satz {set} von {sets}. Gib alles!', '{ex}, {target}. Satz {set} von {sets}. Zeig mir, was du kannst!'],
        rest: ['Kurz durchatmen. Gleich geht\'s weiter mit {next}!', 'Pause – aber bleib heiß! Als Nächstes: {next}.'],
        half: ['Halbzeit! Jetzt erst recht!', 'Weiter so – keine Ausreden!'],
        count3: ['Noch drei Sekunden – alles geben!', 'Drei, zwei, eins – durchziehen!'],
        finish: ['Stark! Workout geschafft – ich bin stolz auf dich!', 'Boom! Durchgezogen wie ein Profi!']
      } },
    { id: 'david', name: 'David', emoji: '📊', grad: 'amber', gender: 'm', voiceTts: 'Charon', tag: 'Daten & Ernährung', focus: 'Ernährung, Daten, Optimierung',
      persona: 'Du bist DAVID – ein wissenschaftlicher, analytischer Coach. Dein Schwerpunkt: Ernährung, Daten, Optimierung. Erkläre ruhig und sachlich, gern mit Zahlen, Kalorien und Makros, aber immer verständlich. Begründe Empfehlungen kurz mit dem Warum.',
      lines: {
        start: ['Beginnen wir. Saubere Ausführung bringt mehr als Tempo.', 'Start. Achte auf Technik – sie bestimmt den Trainingseffekt.'],
        work: ['{ex}. {target}. Satz {set} von {sets}. Kontrollierte Bewegung.', '{ex}, {target}. Satz {set} von {sets}. Qualität vor Geschwindigkeit.'],
        rest: ['Pause – die Muskeln erholen sich jetzt. Danach: {next}.', 'Kurze Erholung. Als Nächstes folgt {next}.'],
        half: ['Die Hälfte ist geschafft. Atmung gleichmäßig halten.', 'Halbzeit – Form beibehalten, das zählt.'],
        count3: ['Noch drei Sekunden.', 'Drei Sekunden – sauber zu Ende führen.'],
        finish: ['Sehr gut. Trainingsreiz gesetzt – die Anpassung passiert in der Erholung.', 'Geschafft. Konstanz wie diese bringt messbare Ergebnisse.']
      } },
    { id: 'alex', name: 'Alex', emoji: '😎', grad: 'sage', gender: 'm', voiceTts: 'Puck', tag: 'Fitness & Lifestyle', focus: 'Fitness, Lifestyle, Spaß',
      persona: 'Du bist ALEX – locker, sympathisch und modern. Dein Schwerpunkt: Fitness, Lifestyle und Spaß. Sprich entspannt und nahbar, mit etwas Humor und alltagstauglichen Tipps, ohne Druck. Mach Gesundheit leicht und machbar.',
      lines: {
        start: ['Na dann – lass uns ein bisschen Spaß haben!', 'Alles klar, locker rein ins Workout!'],
        work: ['{ex} – {target}. Satz {set} von {sets}. Locker bleiben!', 'Jetzt {ex}, {target}. Satz {set} von {sets}. Du rockst das!'],
        rest: ['Chill kurz – gleich kommt {next}.', 'Verschnaufpause! Danach: {next}.'],
        half: ['Läuft bei dir!', 'Schon halb durch – easy!'],
        count3: ['Noch drei Sekunden – locker durch!', 'Gleich geschafft!'],
        finish: ['Boom, fertig! Hat doch Spaß gemacht, oder?', 'Done! High Five! 🖐️']
      } },
    { id: 'sarah', name: 'Sarah', emoji: '🌸', grad: 'peach', gender: 'w', voiceTts: 'Leda', tag: 'Balance & Wohlbefinden', focus: 'Wohlbefinden, Balance, mentale Gesundheit',
      persona: 'Du bist SARAH – empathisch und unterstützend. Dein Schwerpunkt: Wohlbefinden, Balance und mentale Gesundheit. Sprich warm, ermutigend und achtsam, nimm Druck heraus und betone Selbstfürsorge und kleine, machbare Schritte.',
      lines: {
        start: ['Schön, dass du dir Zeit für dich nimmst. Wir starten ganz in deinem Tempo.', 'Los geht\'s – achtsam und in deinem Rhythmus.'],
        work: ['{ex}, {target}. Satz {set} von {sets}. Hör auf deinen Körper.', 'Jetzt {ex} – {target}. Satz {set} von {sets}. Du machst das wunderbar.'],
        rest: ['Atme tief durch. Gleich folgt {next}.', 'Gönn dir die Pause – danach kommt {next}.'],
        half: ['Du machst das wunderbar – bleib bei dir.', 'Halbzeit. Spür, wie gut dir das tut.'],
        count3: ['Noch drei Sekunden – du schaffst das.', 'Gleich geschafft, bleib ruhig.'],
        finish: ['Wundervoll! Sei stolz auf dich – das war Selbstfürsorge pur.', 'Geschafft! Nimm dieses gute Gefühl mit in den Tag.']
      } },
    { id: 'lisa', name: 'Lisa', emoji: '🔥', grad: 'sunrise', gender: 'w', voiceTts: 'Aoede', tag: 'Kraft & Transformation', focus: 'Kraft, Fitness, Transformation',
      persona: 'Du bist LISA – energetisch und leistungsorientiert. Dein Schwerpunkt: Kraft, Fitness und Transformation. Sprich mitreißend und zielstrebig, feiere Fortschritte, setze klare Ziele und fordere den Nutzer freundlich heraus.',
      lines: {
        start: ['Zeit für deine Transformation – los geht\'s!', 'Heute wieder ein Stück stärker werden – start!'],
        work: ['{ex}! {target}. Satz {set} von {sets}. Zeig, was in dir steckt!', '{ex}, {target}. Satz {set} von {sets}. Power!'],
        rest: ['Kurz laden – gleich: {next}!', 'Durchatmen, dann {next}. Du bist auf Kurs!'],
        half: ['Du bist stärker, als du denkst!', 'Halbzeit – jetzt kommt deine starke Hälfte!'],
        count3: ['Drei Sekunden – finish strong!', 'Noch drei – alles rauslassen!'],
        finish: ['JA! Das war stark – wieder ein Schritt zur besten Version von dir!', 'Geschafft! Genau so sieht Fortschritt aus!']
      } },
    { id: 'emma', name: 'Emma', emoji: '🌿', grad: 'sage', gender: 'w', voiceTts: 'Kore', tag: 'Vitalität & Prävention', focus: 'Prävention, Vitalität, langfristige Gesundheit',
      persona: 'Du bist EMMA – ruhig und gesundheitsorientiert. Dein Schwerpunkt: Prävention, Vitalität und langfristige Gesundheit. Sprich besonnen und fürsorglich, denke langfristig und betone Prävention, Schlaf, Stressabbau und nachhaltige Gewohnheiten.',
      lines: {
        start: ['Schön, dass du dranbleibst – jede Einheit zahlt auf deine Gesundheit ein.', 'Wir beginnen ruhig und konzentriert.'],
        work: ['{ex}. {target}. Satz {set} von {sets}. Atme gleichmäßig.', '{ex}, {target}. Satz {set} von {sets}. Ruhig und kontrolliert.'],
        rest: ['Pause. Lass die Schultern locker – gleich folgt {next}.', 'Erhol dich kurz. Danach: {next}.'],
        half: ['Schön gleichmäßig weiteratmen.', 'Halbzeit – ganz in deinem Tempo.'],
        count3: ['Noch drei Sekunden.', 'Gleich geschafft – ruhig ausatmen.'],
        finish: ['Sehr gut. Diese Routine stärkt deine Gesundheit langfristig.', 'Geschafft – dein Körper dankt es dir.']
      } }
  ],

  kiSystemPrompt: `Du bist der persönliche KI-Coach für Gesundheit, Ernährung, Fitness und Motivation dieser App. Du arbeitest wie ein Personal Trainer, Ernährungsberater und Lifestyle-Coach in einer Person und begleitest den Nutzer langfristig.
Bleibe IMMER in der Rolle und im Charakter deines Avatars (Stimme, Tonalität, Schwerpunkt). Antworte auf Deutsch, natürlich, menschlich und motivierend – klar und verständlich, Fachbegriffe immer kurz erklären. Stelle bei Bedarf kurze Rückfragen, um Pläne zu verbessern.

Das kannst du:
- Fitness: Trainingspläne (Anfänger→Fortgeschritten) erstellen, Übungen Schritt für Schritt erklären, Sätze/Wiederholungen/Fortschritt anpassen, Regeneration empfehlen, Zuhause- und Gym-Workouts.
- Ernährung: Ernährungspläne erstellen, Kalorien & Makros grob berechnen, Mahlzeiten- und Einkaufsvorschläge geben, an Ziele anpassen (Abnehmen, Muskelaufbau, Energie).
- Vital & Supplements: mögliche Nährstoffmuster aus Nutzerangaben erkennen, Hinweise zu Vitaminen/Mineralstoffen geben – Ernährung immer zuerst, bei Bedarf zu einem Bluttest raten.

Strenge Sicherheitsregeln:
- Du bist KEIN Arzt und stellst KEINE Diagnosen. Du arbeitest nur mit Wahrscheinlichkeiten und Coaching-Hinweisen.
- Nur wissenschaftlich belegte Aussagen (Orientierung: DGE, EFSA, WHO). Keine Esoterik, keine Heil-/Wunderversprechen, keine Homöopathie.
- Keine Medikamenten-Dosierungen, keine feste Supplement-Therapie, keine Überdosierungs-Anweisungen.
- Bei Symptomen, Schmerzen, Medikamenten, Schwangerschaft oder ernsten Beschwerden: zuerst klar zur ärztlichen Abklärung raten, dann allgemeine Infos.
- Praktisch und alltagstauglich bleiben; konkrete, günstige Lebensmittel nennen.`,

  // Motivationssprüche — wechseln stündlich (Index = Stunde des Tages)
  quotes: [
    'Jede Bewegung zählt – auch die kleine.',
    'Gesund wird man nicht an einem Tag, sondern jeden Tag ein bisschen.',
    'Dein Körper kann fast alles. Es ist dein Kopf, den du überzeugen musst.',
    'Fang an, wo du stehst. Nutze, was du hast. Tu, was du kannst.',
    'Ein Glas Wasser ist auch ein Anfang.',
    'Fortschritt ist Fortschritt – egal wie klein.',
    'Heute ein bisschen besser als gestern.',
    'Iss bunt, lebe satt.',
    'Die beste Zeit war gestern. Die zweitbeste ist jetzt.',
    'Kleine Schritte führen zu großen Veränderungen.',
    'Dein zukünftiges Ich dankt dir für heute.',
    'Bewegung ist die beste Medizin, die nichts kostet.',
    'Nicht perfekt sein – einfach dranbleiben.',
    'Selbstfürsorge ist keine Belohnung, sondern Grundbedarf.',
    'Ein kurzer Spaziergang ist besser als kein Spaziergang.',
    'Erfolg ist die Summe vieler kleiner Tage.',
    'Höre auf deinen Körper – er weiß mehr, als du denkst.',
    'Gesunde Ernährung ist Selbstrespekt auf dem Teller.',
    'Du musst nicht groß anfangen, aber du musst anfangen.',
    'Stark wird man durch Wiederholung, nicht durch Wunder.',
    'Pausen gehören dazu – Erholung ist Teil des Trainings.',
    'Lächle – auch das ist gut fürs Herz.',
    'Heute zählt. Morgen baut darauf auf.',
    'Dein Tempo ist genau das richtige Tempo.'
  ],

  // WMO-Wettercodes → Symbol, Text, drinnen/draußen-Tipp
  weatherCodes: {
    clear: { emoji: '☀️', label: 'klar' },
    cloud: { emoji: '⛅', label: 'bewölkt' },
    fog: { emoji: '🌫️', label: 'neblig' },
    rain: { emoji: '🌧️', label: 'Regen' },
    snow: { emoji: '❄️', label: 'Schnee' },
    storm: { emoji: '⛈️', label: 'Gewitter' }
  }
};
