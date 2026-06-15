# ADR-002: 3D-Coach macht Übungen im Player vor (three.js, lazy)

Status: Active
Datum: 2026-06-15

## Context
Der gewählte Coach spricht und führt das Workout bereits, machte die Übung aber
nicht sichtbar vor — gezeigt wurde eine 2-Frame-Foto-Demo einer fremden Person
(free-exercise-db). Wir wollten den Coach die Bewegung als animierte 3D-Figur
selbst ausführen lassen, ohne unsere Architektur-Grundsätze zu verletzen:
kein Build-Step, keine npm-Runtime-Abhängigkeit, Offline-Tauglichkeit, und ein
heiliger Fallback (kein WebGL / kein Asset / reduced-motion → Foto-Demo).

## Decision
Ein leichtgewichtiger three.js-Renderer (`js/app/play3d.js`) wird **nur auf dem
Play-Screen** lazy per CDN-`import()` von esm.sh geladen — gleiches Muster wie der
ZXing-Scanner. three.js ist NICHT global in index.html eingebunden.

- API: `play3dSupported()`, `play3dMount(container, modelUrl)`, `play3dPlay(spec)`,
  `play3dActive()`, `play3dAttach(container)`, `play3dDispose()`.
- Daten: pro Coach optionales Feld `model` (GLB, Konvention `models/coach/<id>.glb`,
  Ready-Player-Me); Mapping Übung→Animation `EX_ANIM_3D` in `exercises.js`
  (Datei `models/anim/<name>.glb`, Mixamo).
- `play3dPlay(spec)` akzeptiert einen eingebetteten Clip-Namen ODER eine `.glb`-URL;
  schlägt das externe Laden fehl, fällt es auf einen eingebetteten Clip zurück.
- Der Player baut sein HTML pro Schritt neu auf: der Renderer wird **einmal**
  gemountet und danach nur umgehängt (`play3dAttach`) + der Clip gewechselt — kein
  Remount, kein Flackern, ein einziger WebGL-Kontext.
- `stopPlay()` und der „Geschafft"-Screen rufen `play3dDispose()` → kein Context-Leak.
- Assets: GLBs liegen lokal unter `models/`. Sie gehören **nicht** in den
  Install-Cache (`CORE_ASSETS`), sondern werden über den bestehenden Runtime-Cache
  des Service Workers (cache-first für gleiche Origin) nach dem ersten Laden offline
  verfügbar — so bleibt die Installation klein und der Flugmodus-Test heil.

## Consequences
- Leichter: Der Coach wird zur echten Figur; sobald der Nutzer die GLB-Dateien
  ablegt (`models/coach/*.glb`, `models/anim/*.glb`), schaltet 3D sich automatisch zu.
- Bleibt heil: Ohne `model`-Feld (heutiger Stand) verhält sich der Player exakt wie
  bisher — Foto-Demo. Vanilla/kein-Build (ADR-001/000) bleibt unangetastet.
- Schwerer / zu beachten:
  - Echte Avatare (RPM) + Animationen (Mixamo) erfordern einmaligen Login/Export
    durch den Nutzer — nicht automatisierbar. Siehe `models/README.md`.
  - Riskanteste Annahme: Die Knochennamen der Mixamo-Clips müssen zum RPM-Skelett
    passen, sonst spielt der Clip, aber die Figur bewegt sich nicht (kein Crash).
    Beim Konvertieren das Mixamo-Naming beibehalten.
  - three.js & das Test-GLB kommen von fremder Origin (esm.sh/jsDelivr) und werden
    nicht vom Service Worker gecacht — der erste 3D-Start braucht Netz; danach greift
    der HTTP-Cache des Browsers. Foto-Fallback deckt den Offline-Erstfall ab.
