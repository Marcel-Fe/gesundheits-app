/* Gesundheits-App — Konfiguration & Seed-Daten (Phase 0)
   © 2026 Marcel Fehse. Alle Rechte vorbehalten.
   Inhalts-DB (Rezepte/Übungen/Lebensmittel) folgt in Phase 1–4 als data/*.json. */

window.GDATA = {
  // Tabs der Bottom-Navigation
  tabs: [
    { id: 'dashboard',  label: 'Heute',     icon: '🏠' },
    { id: 'ernaehrung', label: 'Ernährung', icon: '🥗' },
    { id: 'training',   label: 'Training',  icon: '💪' },
    { id: 'einkauf',    label: 'Einkauf',   icon: '🛒' },
    { id: 'mehr',       label: 'Mehr',      icon: '⋯'  }
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

  // KI-Worker-Endpunkt (Cloudflare). Wird nach dem Deploy hier eingetragen.
  kiEndpoint: ''
};
