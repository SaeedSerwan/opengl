# Test results

Target: `http://localhost:8097/` · Browser: Chromium (headless, SwiftShader WebGL) · 2026-10-27T14:19:59.150Z

| Test | Description | Result | Details |
|---|---|---|---|
| TEST 1 | Open the site in a clean browser session; compiler loads | ✅ PASS | ready after 2.2 s (clean profile, no cache) |
| TEST 2 | Load the starter C++ program and compile it | ✅ PASS | compiled in 0.74 s |
| TEST 3 | A real red triangle appears in the viewport | ✅ PASS | centre rgb(255,0,0), corner rgb(0,0,0), above apex rgb(0,0,0), canvas 500x500 |
| TEST 4 | Change a vertex coordinate: the triangle changes shape | ✅ PASS | pixel at (0, 0.75) is now rgb(255,0,0) (was black) |
| TEST 5 | Change the colour to green | ✅ PASS | centre rgb(0,255,0) |
| TEST 6 | glTranslatef moves the triangle | ✅ PASS | (0.5,0) rgb(255,0,0), (-0.4,-0.4) rgb(0,0,0) |
| TEST 7 | glRotatef rotates the triangle | ✅ PASS | (0.4,0.3) rgb(255,0,0) (black before rotation), (-0.3,-0.45) rgb(0,0,0) (red before) |
| TEST 8 | glScalef scales the triangle | ✅ PASS | centre rgb(255,0,0), (0,-0.3) rgb(0,0,0) (red before scaling) |
| TEST 9 | A compilation error is shown instead of success | ✅ PASS | status "Compilation failed: 1 error"; message: Line 13, column 32expected ';' after expression; editor line highlighted: true |
| TEST 10 | Several programs in a row do not interfere | ✅ PASS | animation drew 35 frames, then 3 more programs; 1 canvas in the page, last program drew 1 frame(s) (old animation stopped), final picture correct |
| TEST 11 | No installation or developer server needed (static files only) | ✅ PASS | all requests went to http://localhost:8097; every other host was blocked and nothing broke |
| TEST 12 | No paid services, API keys, backend or localhost dependency | ✅ PASS | 50 static files; no API keys, no server endpoints, no localhost references |
| EXTRA A | Infinite loop is stopped by the watchdog | ✅ PASS | status "Stopped: the program was not responding (infinite loop?)" |
| EXTRA B | Runtime crash gives a readable message | ✅ PASS | Memory access out of bounds — the program read or wrote memory it does not own. |
| EXTRA C | <iostream> program compiles (precompiled header) and cout works | ✅ PASS | compiled in 1.72 s |
| EXTRA D | Keyboard and mouse callbacks (glutSpecialFunc, glutMouseFunc) | ✅ PASS | square centre before rgb(51,128,255), after 10×→ rgb(0,0,0), new position rgb(51,128,255), clicked dot rgb(255,230,26) |
| EXTRA G | Wider API: display lists, GLU quadrics, stipple, wide lines, text, blending, glGet, menus | ✅ PASS | canvas 600x400; reshape callback true; menu callback true; unexpected warnings: none |
| EXTRA H | Animation inside one function (loop + glFlush + Sleep) is shown frame by frame | ✅ PASS | 21 intermediate frames shown |
| EXTRA I | glutIdleFunc runs at desktop-like speed (single buffer) | ✅ PASS | 1500 idle calls in about 1.5 s |
| EXTRA E | All 15 lesson examples compile, run and draw (no warnings) | ✅ PASS | l01, l02, l03, l04, l05, l06, l07, l08, l09, l10, l11, l12, x01, x02, x03 |
| EXTRA F | No JavaScript errors on the page | ✅ PASS |  |

**21/21 checks passed.**
