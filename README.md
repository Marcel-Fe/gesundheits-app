# Gesundheits-App

Familien-taugliche PWA: günstige Ernährung, Home-Workouts ohne Geräte, Portionsrechner mit
automatischer Einkaufsliste, visuelles Lernsystem und wissenschaftliche Nährstoff-Aufklärung.

**Stack:** Vanilla HTML/CSS/JS · Service-Worker (PWA) · GitHub Pages · Cloudflare Worker + Google Gemini (KI).
Nutzerdaten liegen lokal (localStorage), Inhalte als JSON im Repo. Kein klassisches Backend.

## Lokal starten
```
npx serve .        # oder: python -m http.server
```
Dann im Browser öffnen. Auf dem Handy über „Zum Home-Bildschirm" installierbar.

## Icons neu erzeugen
```
node tools/gen-icons.mjs
```

## KI-Worker (Gemini) deployen
```
cd worker
npx wrangler login
npx wrangler secret put GEMINI_API_KEY     # Key von https://ai.google.dev
npx wrangler deploy
```
Danach die Worker-URL in `js/data.js` → `GDATA.kiEndpoint` eintragen.

## Status
- **Phase 0 (fertig):** PWA-Gerüst, Onboarding-Quiz, 5-Tab-Navigation, KI-Chat-Gerüst.
- Phase 1: Ernährung + Portionsrechner + Einkaufsliste
- Phase 2: Training · Phase 3: Lebensmittel-DB · Phase 4: Nährstoffwissen
- Phase 5: KI-Ausbau · Phase 6: Videos & Feinschliff

© 2026 Marcel Fehse. Alle Rechte vorbehalten. Kein Open Source.
