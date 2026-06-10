# ADR-001: Monolithen in Feature-Module aufteilen (klassische Scripts, kein Build)

Status: Active
Datum: 2026-06-10

## Context
`js/app.js` (1641 Zeilen) und `js/content.js` (939 Zeilen) waren Monolithen —
jede Änderung fand in einer Riesendatei statt. ES-Module oder ein Bundler
würden die Säule "Vanilla bleibt Vanilla" verletzen und den No-Build-Deploy
auf GitHub Pages verkomplizieren.

## Decision
Aufteilung in klassische Scripts, die sich den globalen Scope teilen:
- `js/app/` — 8 Feature-Module; `core.js` lädt zuerst (State + Helfer),
  `main.js` zuletzt (Event-Binding + Boot).
- `js/content/` — 4 Daten-Module, die sich in `root.GCPARTS` registrieren;
  `js/content.js` setzt daraus `GCONTENT` zusammen (Browser) bzw. lädt sie
  per `require` (Node-Tests).

## Consequences
- Leichter: Features finden und ändern; kleinere Diffs; Inhalte getrennt von Logik.
- Zu beachten: Top-Level-Namen sind global über alle `js/app/*`-Dateien — keine
  Duplikate anlegen; Script-Reihenfolge in index.html ist tragend; neue Dateien
  müssen in index.html UND sw.js `CORE_ASSETS` eingetragen werden.
- Die Tests laden weiterhin nur `js/content.js` und `js/logic.js` — der
  Node-Pfad bleibt stabil.
