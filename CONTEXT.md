---
last_updated: 2026-06-10
review_after_days: 30
---

# Kontext — Gesundheits-App

## Worum geht es
Eine PWA, die Familien gesünder macht, ohne Geld zu kosten: günstige Rezepte mit
Portionsrechner und Einkaufsliste, Home-Workouts ohne Geräte mit Mitmach-Player,
Kalorien-/Wasser-Tracking und ein KI-Coach. Läuft komplett im Browser, Daten
bleiben auf dem Gerät.

## Excellence-Anchor

### Output-Vision
Die App fühlt sich an wie eine Kauf-App — niemand merkt, dass sie selbstgebaut
ist. Jemand installiert sie vom Home-Bildschirm, nutzt sie und fragt nicht
"was ist das für eine App?", sondern "was kostet die?".

### Mess-Anker
- **YAZIO** — Tracking-Politur: Kalorien/Wasser loggen so flüssig und hübsch.
- **Gymondo** — Workout-Führung: der Mitmach-Player leitet wie ein echter Trainer.
- **Apple Health** — Klarheit: Gesundheitsdaten ruhig und vertrauenswürdig dargestellt.

### Detail-Beweis
**Offline perfekt.** Die App startet sofort auch ohne Netz — keine kaputten
Bilder, kein Ladeflackern. Wenn das stimmt, ist Meisterklasse erreicht.

## Stakeholder/Mitwirkende
Marcel (Solo-Entwickler, Anfänger) + Claude als Sparringspartner.
Nutzer: die eigene Familie; später ggf. Veröffentlichung.

## Erfolgskriterien
- Flugmodus-Test: App öffnen ohne Netz → alles Wesentliche da, keine Fehlanzeigen.
- Tracking-Flow: Mahlzeit erfassen fühlt sich an wie YAZIO, nicht wie ein Formular.
- `node tools/test-logic.mjs` bleibt grün (31 Tests, Stand Juni 2026).

## Aktueller Stand
2026-06-16 — Prozeduraler 3D-Coach (Cache v36): `js/app/figure3d.js` baut eine
geriggte Figur aus Primitiven (in Coach-Farbe) und animiert die Übungen per Code
(squat, jumping_jacks, pushup, plank, situp, lunge, burpee, march-Fallback) — ganz
OHNE externe Assets/Login. Standard-Weg im Player; hat ein Coach ein `model` (GLB),
läuft stattdessen `play3d.js` (Ready-Player-Me + Mixamo-FBX, Retarget). Fallback-Kette:
GLB → prozedurale Figur → Foto-Demo (kein WebGL/reduced-motion). Studio-Look (ACES,
Schatten). Design auf Horizon-Look (kühl, Glas, weiche Schatten) umgestellt.
Sprach-Freischaltung gehärtet (Audio + Web Speech in der Geste, iOS).
Davor: `js/app/play3d.js` (GLB-Weg), Service-Worker selbstheilend (Network-First).
Davor (v25): Struktur-Refactor app.js/content.js → 12 Module; Tracker, 500+
Lebensmittel, Mitmach-Player, sprechender KI-Coach mit Avataren.
