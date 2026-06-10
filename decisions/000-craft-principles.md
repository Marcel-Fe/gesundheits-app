# Craft-Principles — Gesundheits-App

Status: Active
Datum: 2026-06-10

Die unverhandelbaren handwerklichen Säulen dieses Projekts. Wenn eine
Entscheidung diese verletzt — Entscheidung anpassen, nicht Säulen.

## Säulen

1. **Kauf-App-Gefühl.** Nichts darf selbstgebaut wirken — jeder Screen wird poliert, bis er neben YAZIO bestehen kann.
2. **Offline-first ist heilig.** Jede Datei landet im Service-Worker-Cache, jede Änderung bumpt die Version — die App startet immer, auch ohne Netz.
3. **Vanilla bleibt Vanilla.** Kein Framework, kein Build-Schritt — die Einfachheit ist das Feature, nicht ein Provisorium.
4. **Daten gehören der Familie.** Nutzerdaten bleiben in localStorage auf dem Gerät — kein Konto, kein Server, kein Tracking.
5. **Bewiesen, nicht behauptet.** `node tools/test-logic.mjs` grün vor jedem Deploy; kritische Flows werden im Browser demonstriert.

## Wir würden lieber X als Y

- Wir würden lieber ein Feature eine Woche später liefern als einen Screen, der "selbstgebastelt" aussieht. (1)
- Wir würden lieber ein Bild lokal bundlen als eine externe Bild-URL, die offline ein kaputtes Icon zeigt. (2)
- Wir würden lieber 200 Zeilen Vanilla-JS schreiben als ein npm-Paket einführen. (3)
- Wir würden lieber auf Cloud-Sync verzichten als ein Nutzerkonto verlangen. (4)
- Wir würden lieber einen Test mehr schreiben als ein "müsste funktionieren" committen. (5)

## Anti-Beispiele — was passt NICHT zu uns

- Ein halbfertiger Screen "zum Ausprobieren" im Live-Stand. (1)
- Features, die ohne Internet kommentarlos kaputt sind. (2)
- "Lass uns auf React/Vite migrieren, dann wird alles einfacher." (3)
- Analytics-SDKs oder Server-Speicherung von Gesundheitsdaten. (4)
- Deploy direkt nach Code-Änderung ohne Testlauf und Cache-Bump. (5)
