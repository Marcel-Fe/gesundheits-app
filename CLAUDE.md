# Gesundheits-App — Familien-PWA für Ernährung, Training & Einkauf

@CONTEXT.md
@REFERENCES.md

Günstige Ernährung, Home-Workouts ohne Geräte, Portionsrechner mit Einkaufsliste,
Kalorien-/Wasser-Tracker und KI-Coach — für die ganze Familie, gebaut von einem
Anfänger mit Claude als Sparringspartner.

## Project Understanding
- Stack: Vanilla HTML/CSS/JS, PWA (Service Worker), GitHub Pages, Cloudflare Worker + Gemini (KI).
- Kein Backend: Nutzerdaten in localStorage, Inhalte als JS-Daten im Repo.
- Kein Build-Schritt, kein npm-Projekt — bewusste Entscheidung, bleibt so.
- Nicht Open Source; Veröffentlichung/Vermarktung kommt später.

## Architektur-Regeln (projektspezifisch)
- Klassische Scripts, KEINE ES-Module: `js/app/*.js` teilen sich den globalen
  Scope. Keine doppelten Top-Level-Namen über Dateigrenzen anlegen.
- Script-Reihenfolge in index.html ist tragend: `data → content/* → content.js
  → knowledge → logic → app/core … app/main` (main.js bootet, MUSS zuletzt).
- Neue JS/CSS-Datei ⇒ in index.html einbinden UND in sw.js `CORE_ASSETS` eintragen.
- Jede Asset-Änderung ⇒ `CACHE_VERSION` in sw.js UND alle `?v=`-Buster in
  index.html + sw.js gemeinsam hochzählen (eine Versionsnummer für alles).
- Inhalte (Lebensmittel/Rezepte/Übungen/Sessions) gehören nach `js/content/*`,
  Screen-Logik nach `js/app/*` — nicht mischen.

## People Context
- Solo: Marcel (Anfänger) + Claude als Sparringspartner. Zielgruppe: Familien.

## Working Preferences
- Vor jedem Commit: `node tools/test-logic.mjs` muss grün sein.
- CONTEXT.md ist Living-Doc — wenn `last_updated` >30 Tage: "Aktueller Stand" review.

## Aktueller Fokus (Stand: 2026-06-10)
- Modul-Struktur frisch aufgeteilt (v25): app.js → js/app/, content.js → js/content/.
- KI-Coach läuft über wiederverwendeten Gemini-Proxy; Persona kommt aus dem Frontend.
- Nächster Qualitäts-Hebel: Offline-Perfektion (Detail-Beweis aus CONTEXT.md).

## Dokument-Index
- `js/app/` — Screen-/Feature-Logik (core, start, ernaehrung, wissen, training, tracker, coach, main)
- `js/content/` — Inhalts-Daten (foods, recipes, exercises, sessions)
- `css/` — ein zentrales Stylesheet
- `icons/` — PWA-Icons (Neuerzeugung: `node tools/gen-icons.mjs`)
- `tools/` — Node-Helfer: Tests + Icon-Generator
- `worker/` — Cloudflare Worker für KI-Anfragen (Gemini)
- `decisions/` — ADRs; Nummerierung fortlaufend

Craft-Principles: siehe `decisions/000-craft-principles.md` — bei Konflikt mit
einer Säule: Entscheidung anpassen, nicht Säulen.

## IMPORTANT — Critical Rules
- DO NOT commit Geheimnisse — alles in `.env`, `.env` ist in `.gitignore`.
- Keine Frameworks, kein Build-Tooling einführen — Vanilla ist Architektur-Entscheidung.
- Medizinische KI-Antworten: Sicherheits-Leitplanken im Prompt nie entfernen.
