# 3D-Assets für den Coach-Player

Hier liegen die Dateien, mit denen der Coach im Mitmach-Player die Übungen als
animierte 3D-Figur vormacht. **Solange hier nichts liegt, läuft die App normal
weiter** — der Player zeigt dann die Foto-Demo. Sobald die Dateien da sind, schaltet
sich 3D automatisch zu.

```
models/
  coach/  <id>.glb     ← ein Avatar je Coach: max, david, alex, sarah, lisa, emma
  anim/   <name>.fbx   ← eine Animation je Bewegung (pushup, squat, …)
```

> **Keine Konvertierung nötig.** Avatare lädst du direkt als **GLB** von Ready Player Me,
> Animationen direkt als **FBX** von Mixamo. Die App lädt beides und passt das
> Mixamo-Skelett automatisch an den Avatar an.

## Schritt 1 — Coach-Avatare (Ready Player Me) → `.glb`
1. Auf https://readyplayer.me einloggen und einen **Ganzkörper-Avatar** erstellen
   (für je einen Coach einen eigenen — gern passend zu Typ/Geschlecht, siehe Tabelle).
2. Den **GLB-Download-Link** holen (Datei endet auf `.glb`) und herunterladen.
3. Datei als `models/coach/<id>.glb` ablegen, z. B. `models/coach/max.glb`.
4. In `js/data.js` beim Coach das Feld setzen: `model: 'models/coach/max.glb'`
   (ist sonst `null`). **→ Diesen Schritt mache ich für dich, wenn die Dateien liegen.**

| Coach  | id      | Typ (Vorschlag)        |
|--------|---------|------------------------|
| Max    | `max`   | männlich, sportlich    |
| David  | `david` | männlich, ruhig        |
| Alex   | `alex`  | männlich, locker       |
| Sarah  | `sarah` | weiblich, freundlich   |
| Lisa   | `lisa`  | weiblich, energetisch  |
| Emma   | `emma`  | weiblich, natürlich    |

## Schritt 2 — Animationen (Mixamo) → `.fbx`
1. Auf https://www.mixamo.com einloggen (kostenloses Adobe-Konto).
2. Diese 7 Bewegungen suchen und je herunterladen — **Download-Einstellungen:**
   - Format: **FBX Binary (.fbx)**
   - Skin: **Without Skin** (kleiner; wir brauchen nur die Bewegung)
   - Frames per Second: **30**, Keyframe Reduction: **none**
3. Jede Datei als `models/anim/<name>.fbx` ablegen — **Namen genau so:**

   | Mixamo-Suche      | Dateiname                       |
   |-------------------|---------------------------------|
   | Push Up           | `models/anim/pushup.fbx`        |
   | Air Squat         | `models/anim/squat.fbx`         |
   | Jumping Jacks     | `models/anim/jumping_jacks.fbx` |
   | Burpee            | `models/anim/burpee.fbx`        |
   | Sit Up            | `models/anim/situp.fbx`         |
   | Plank             | `models/anim/plank.fbx`         |
   | Lunge / Lunges    | `models/anim/lunge.fbx`         |

## Danach
Sag mir Bescheid (oder leg die Dateien einfach ab) — ich übernehme den Rest:
`model`-Felder eintragen, im Browser testen, Cache-Bump und Deploy.

## Hinweise
- Dateien bleiben klein (Avatare ~1–3 MB, Animationen ohne Skin meist < 1 MB).
  Sie werden zur Laufzeit gecacht (Offline) — siehe `decisions/002-3d-coach-player.md`.
- Test ohne eigene Assets: ein animiertes Beispiel-GLB ist
  `https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/gltf/RobotExpressive/RobotExpressive.glb`.
