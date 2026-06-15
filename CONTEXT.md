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
2026-06-15 — 3D-Coach im Player (Cache v31): `js/app/play3d.js` lädt three.js lazy
per CDN und lässt den Coach die Übung als 3D-Figur vormachen, mit hartem Fallback
auf die Foto-Demo (kein WebGL/kein GLB/reduced-motion). GLBs liegen lokal unter
`models/` (Runtime-Cache, nicht Install-Cache) — Avatare/Animationen stellt der
Nutzer bereit (Anleitung: `models/README.md`, Entscheidung: ADR-002). Aktuell ist
für keinen Coach ein `model` gesetzt → Verhalten wie zuvor.
Davor (v25): Struktur-Refactor app.js/content.js → 12 Module; Tracker, 500+
Lebensmittel, Mitmach-Player, sprechender KI-Coach mit Avataren.
