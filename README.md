# 3D Horror Prototype (HTML - Three.js)

This branch contains a minimal, lightweight 3D horror prototype built with Three.js that runs in a browser (desktop recommended).

Files added:
- index.html — entry page
- js/main.js — main game code (Three.js + controls + simple AI)
- css/styles.css — minimal HUD & message styling
- README.md — instructions

How to run locally:
1. Serve this directory with a static file server (browsers block some features if opened via file://).
   - Python 3: `python -m http.server 8000`
   - Node: `npx serve .`
2. Open http://localhost:8000 in a modern browser.

Controls:
- Click the center message to lock mouse and play.
- Mouse to look, WASD to move.
- F to toggle flashlight.

Notes & next steps:
- This is a small scaffold: replace placeholder enemy/level with models, add audio assets, and polish movement/AI.
- To publish on GitHub Pages, merge this branch into your default branch (for MarvellousVv.github.io the site is served from the repository root on the default branch).

