# CAINA_Trail

Dieses Repository enthält nun eine direkt deploybare Web-Version von **Asteroids Arcade** für GitHub Pages.

## Warum die Seite vorher weiß blieb
Die bisherige Umsetzung lag nur in `asteroids_arcade_codepen.md` (Markdown mit Codeblöcken). GitHub Pages führt daraus kein Spiel aus, sondern rendert nur Markdown-Inhalt.

## Lösung
- `index.html` als Einstiegspunkt für GitHub Pages
- `style.css` für Layout/Design
- `script.js` mit der Spiellogik
- `asteroids_arcade_codepen.md` bleibt als CodePen-Variante erhalten

## Steuerung
- `←` / `→`: Drehen
- `↑`: Schub
- `Space`: Schießen
- `R`: Neustart
