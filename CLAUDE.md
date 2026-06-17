# CLAUDE.md

Leitfaden für die Arbeit an diesem Projekt mit Claude Code. Bitte vor Änderungen lesen.

## Was ist THRONERUSH?

Ein süchtig machendes Neon-Synthwave-Arcade-Spiel im Browser. Man steuert per Maus/Finger einen leuchtenden Kern, weicht Hindernissen aus, sammelt Orbs und baut Combos über „Near-Misses" auf. Es ist eine installierbare **PWA** (läuft auf Android & iOS) mit prozeduraler Chiptune-Musik, Level-System, Boss-Wellen, Roguelite-Upgrades, Power-Ups und Herzensystem.

## Tech-Stack & Grundprinzipien

- **Vanilla JavaScript, HTML5 Canvas, Web Audio API, CSS.** Kein Framework, kein Build-Schritt, keine Abhängigkeiten zur Laufzeit (außer Google Fonts via CDN).
- **Keine ES-Module.** `js/game.js` ist ein klassisches Script (eine große IIFE). Das ist Absicht: So läuft das Spiel auch ohne Bundler. Bitte nicht ungefragt auf `import/export` umstellen.
- **Sprache der gesamten Spiel-UI ist Deutsch.** Alle sichtbaren Texte, Sprüche und Kommentare auf Deutsch halten.
- **Kein `localStorage` in Sandboxes**, aber in der echten App schon: Persistenz ist mit `try/catch` gekapselt (`loadScores`/`saveScores`), fällt sonst auf In-Memory zurück. Diese Robustheit beibehalten.
- Funktioniert offline (Service Worker). Bei neuen Assets die `ASSETS`-Liste in `service-worker.js` ergänzen **und** die `CACHE`-Version hochzählen (z. B. `thronerush-v4`).

## Dateistruktur

```
index.html              HTML-Gerüst, lädt CSS + JS, PWA-Meta-Tags
css/style.css           Gesamtes Styling (Menü, HUD, Overlays, Animationen)
js/game.js              Die komplette Spiellogik (eine IIFE) – hier passiert ~alles
js/pwa.js               Service-Worker-Registrierung, Install-Prompt, Wake Lock
service-worker.js       Offline-Cache (Asset-Liste + Cache-Version pflegen!)
manifest.webmanifest    PWA-Manifest (Name, Icons, Standalone)
icons/                  App-Icons (192/512/maskable/apple-touch/favicon)
```

## Architektur von `js/game.js`

Eine IIFE mit gemeinsamem Scope. Grobe Reihenfolge im Code:

1. **State & globale Variablen** – `state` (State-Machine: `S.MENU/PLAY/UPGRADE/OVER/PAUSE`), `mode` (`normal/hardcore/zen`), Spielobjekte (`player, obstacles, orbs, powerups, lasers, particles, floaters`), `mods` (Run-Modifikatoren), `effects`, `shields`, `lives`.
2. **Audio** – `beep()` (SFX) und die **Chiptune-Engine**: `SONGS` (3 Songs mit Lead-Phrasen, Akkorden, Drum-Flags), `scheduleStep()` als Step-Sequencer, `startMusic()`/`scheduler()` mit Web-Audio-Lookahead. Songs wechseln pro Level + rotieren im Menü.
3. **Eingabe** – Maus/Touch setzen `tgt`; der Spieler folgt per Lerp.
4. **Spawning** – `spawnObstacle()` (Bewegungsmuster: `straight/sine/drift/orbit/zigzag/pendulum`), `spawnOrb()`, `spawnPowerup()`.
5. **Boss** – `startBoss/endBoss/spawnLaserWave` (telegrafierte Laser).
6. **Level & Upgrades** – `levelUp()` (schaltet neue Formen + Hintergrund-Theme + Song frei), `openUpgrade/chooseUpgrade` (Roguelite-Karten aus `UPGRADES`).
7. **`update(dt)`** – die gesamte Spielsimulation pro Frame (Bewegung, Kollision, Near-Miss, Scoring, Timer).
8. **`draw()`** – Rendering: Hintergrund-Themes (`THEMES`, weicher Crossfade via `lerpBg`), Grid, Objekte, Partikel, Floating-Texts, HUD, Vignette.
9. **Game Over** – `gameOver()` + Spruch-Pools.
10. **Loop & DOM-Verdrahtung** – `loop()`, Button-Listener, Tasten (`ESC`, Easteregg).

## Wo ändere ich was? (häufige Aufgaben)

| Aufgabe | Stelle |
|---|---|
| Neue Musik / Song anpassen | `SONGS`-Array (je Song `leads:[…]` mit 3 Phrasen + `groove`/`bassPat`/`staccato`/`leadEcho`/`leadOct`) + Lead-Arrays (`LEAD1`, `LEADB1`, …). Schlagzeug-Pattern (Kick/Snare/Hat/Swing) in `GROOVES`. |
| Schwierigkeit / Tempo | `spawnObstacle()` (Formel `sp`), `update()` (`difficulty`, Spawn-Interval) |
| **Auto-Balance** | `BAL`-Block (oben in `game.js`, Marker `=== AUTO-BALANCE ===`): Knöpfe `difficulty`/`spawnRate`/`eliteChance`, die der tägliche Director (`tools/auto-balance.mjs`) Telemetrie-gesteuert setzt. **Block-Inhalt nicht von Hand pflegen** – Doku: `tuning/README.md`. Neue Mechanik → ggf. Knopf + KPI ergänzen. |
| Endgame-Druck (DDA) | `ddaPush()`/`difSpd()`/`difDen()` – Zusatzdruck nur bei hohem `director` (souveränes Spiel), Grund-Cap schützt schwache Spieler |
| Elite-/Panzer-Gegner | `eliteChance()` (skaliert mit `coverage()` = Waffen+Fusionen) + Elite-Block in `spawnObstacle()`, Telegraph in `draw()` |
| Crowd-Control (Slow/Freeze) | **zentral** über `applySlow()` – mit CC-Sättigung (`o.ccSat`) + Elite-Widerstand (`o.ccRes`). Nicht direkt `o.slow`/`o.slowAmt` setzen. |
| Neue Hindernis-Form | Muster in `spawnObstacle()` + Bewegung in `update()` + Form in `shapePath()` |
| Upgrade-Karten | `UPGRADES`-Array (jeweils mit `apply()`) |
| Upgrade-Häufigkeit | `upStep` (Reset = Startwert, `chooseUpgrade` = Wachstumsfaktor) |
| Power-Ups | `PUP`/`PUPINFO` + `collectPup()` |
| Hintergründe | `THEMES`-Array |
| Sprüche / Humor / Jugendsprache | Übersetzungs-Pools `quips`/`insults`/`dumb`/`crazy`/`near`/`combo` im `TR`-Objekt (je Sprache `de`/`en`/`fr`) |
| Easteregg | `trigger67()` / `sfx67()` |
| Leben | `lives` in `reset()`, Logik in `hitPlayer()` |

## Entwicklung & Test

PWAs brauchen einen echten Server (Service Worker & Manifest laufen nicht über `file://`):

```bash
npm run dev          # startet einen lokalen Server auf http://localhost:8000
# oder:
python3 -m http.server 8000
```

Nach Änderungen am Service Worker im Browser „Hard Reload" bzw. den alten SW unter DevTools → Application → Service Workers entfernen, sonst wird gecachte Version geladen.

## Plattform-Hinweise / bekannte Grenzen

- **iOS**: keine Vibration (Apple deaktiviert die Web-Vibration-API). `vibe()` ist mit Guard/try-catch gekapselt – nicht „reparieren".
- **PWA-Installation** nur über HTTPS (lokale Datei → kein Install-Prompt).
- **Audio** startet erst nach der ersten Nutzergeste (Browser-Autoplay-Politik) – Unlock ist bereits implementiert.

## Konventionen

- Kompakter, funktionaler Vanilla-Stil wie im Bestand (keine großen Refactors ohne Anlass).
- Defensive Guards bei allem, was im Menü-State schon läuft (`draw()` greift z. B. auf Werte zu, die erst beim Spielstart gesetzt werden → mit `|| 0` / Existenzprüfung absichern).
- Nach jeder JS-Änderung Syntax prüfen: `node --check js/game.js`.
