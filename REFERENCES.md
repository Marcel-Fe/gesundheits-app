# Referenzen — Gesundheits-App

## Externe Systeme
- **GitHub Pages** — Hosting (Deploy = Push auf `main`).
- **Cloudflare Worker** (`worker/ki.js`) — Proxy zur Google-Gemini-API für den
  KI-Coach; Endpoint steht in `js/data.js` → `GDATA.kiEndpoint`. Key via
  `npx wrangler secret put GEMINI_API_KEY` (https://ai.google.dev).
- **Open Food Facts** — Barcode-Lookup im Scanner (schlüssellos).
- **Open-Meteo** — Wetter fürs Dashboard (schlüssellos).
- **free-exercise-db via jsDelivr** — Foto-Demos der Übungen (CC0, schlüssellos).
- **TheMealDB** — Zutaten-/Rezeptbilder ohne Personen.

## Inspirations-Quellen (Mess-Anker)
- **YAZIO** (https://www.yazio.com) — Messlatte für Tracking-Politur: schnelles,
  schönes Loggen von Mahlzeiten und Wasser.
- **Gymondo** (https://www.gymondo.com) — Messlatte für Workout-Führung: der
  Mitmach-Player soll wie ein Trainer anleiten.
- **Apple Health** — Messlatte für Klarheit: ruhige, vertrauenswürdige
  Darstellung von Gesundheitsdaten.
