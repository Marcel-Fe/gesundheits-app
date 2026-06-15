# 3D-Assets für den Coach-Player

Hier liegen die GLB-Dateien, mit denen der Coach im Mitmach-Player die Übungen als
animierte 3D-Figur vormacht. **Solange hier nichts liegt, funktioniert die App
normal weiter** — der Player zeigt dann die Foto-Demo. Die 3D-Pipeline schaltet sich
automatisch zu, sobald die Dateien da sind.

```
models/
  coach/   <id>.glb     ← ein Avatar je Coach (max, david, alex, sarah, lisa, emma)
  anim/    <name>.glb   ← eine Animation je Bewegung (pushup, squat, …)
```

## Schritt 1 — Coach-Avatare (Ready Player Me)
1. Auf https://readyplayer.me einen Ganzkörper-Avatar erstellen (oder 6, je Coach einen).
2. Den GLB-Link holen (endet auf `.glb`). Datei herunterladen.
3. Als `models/coach/<id>.glb` ablegen, z. B. `models/coach/max.glb`.
4. In `js/data.js` beim jeweiligen Coach das Feld setzen:
   `model: 'models/coach/max.glb'` (Feld ist sonst `null`).

## Schritt 2 — Animationen (Mixamo)
1. Auf https://www.mixamo.com einloggen (kostenloses Adobe-Konto).
2. Diese Bewegungen suchen und herunterladen (Format **FBX, ohne Skin / „Without Skin"**):
   `Push Up`, `Air Squat`, `Jumping Jacks`, `Burpee`, `Sit Up`, `Plank`, `Lunge`.
3. Jede FBX in **GLB** umwandeln (z. B. mit Blender: FBX importieren → als glTF 2.0
   `.glb` exportieren). **Wichtig:** beim Import die Mixamo-Knochennamen
   (`mixamorig…`) beibehalten — sonst bewegt sich der Avatar nicht.
4. Als `models/anim/<name>.glb` ablegen. Die Namen müssen zum Mapping in
   `js/content/exercises.js` (`EX_ANIM_3D`) passen:

   | Bewegung      | Dateiname            |
   |---------------|----------------------|
   | Push Up       | `models/anim/pushup.glb`        |
   | Air Squat     | `models/anim/squat.glb`         |
   | Jumping Jacks | `models/anim/jumping_jacks.glb` |
   | Burpee        | `models/anim/burpee.glb`        |
   | Sit Up        | `models/anim/situp.glb`         |
   | Plank         | `models/anim/plank.glb`         |
   | Lunge         | `models/anim/lunge.glb`         |

## Hinweise
- Dateien klein halten (Avatare ~1–3 MB, Animationen wenige 100 KB). Große Binaries
  nicht unnötig committen — sie werden zur Laufzeit gecacht (siehe
  `decisions/002-3d-coach-player.md`).
- Test ohne eigene Assets: ein animiertes Beispiel-GLB ist
  `https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/gltf/RobotExpressive/RobotExpressive.glb`
  — als `model` bei einem Coach eintragen, um die Render-Pipeline zu sehen.
