# Troubleshooting

## Students

| Problem | What to do |
|---|---|
| **"Loading the C++ compiler…" stays at 0 % or fails** | The first visit downloads about 27 MB. Check the internet connection and reload. Some school networks block large downloads or `*.github.io`; ask IT to allow `https://<your-user>.github.io`. |
| **"This browser cannot run the compiler"** | Use a current Chrome, Edge or Firefox. Very old browsers and Internet Explorer are not supported. |
| **Run does nothing / button says "Waiting…"** | The compiler is still loading. The program starts automatically when it is ready. |
| **Compilation failed** | Read the red box in the Output panel. It shows the line number, Clang's message and a 💡 hint. Click the box to jump to the line. Common causes: missing `;`, misspelled names (`glVertex2F` instead of `glVertex2f`), missing `}`. |
| **"Your program stopped responding and was stopped."** | The program got stuck in an endless loop. Use `glutTimerFunc` or `glutIdleFunc` for animation instead of `while (true)`. |
| **Runtime error: memory access out of bounds** | An array index went past the end of the array, or a pointer was not set. |
| **Keyboard keys do nothing** | Click the picture first. Keyboard input goes to the program only while the picture has focus. |
| **The picture is blank (black)** | Check that `display()` calls `glClear`, draws between `glBegin`/`glEnd`, and that the coordinates fit the coordinate system. With default settings x and y must be between -1 and 1; turn on **Grid** to see the range. Read the yellow warnings in the Output panel. |
| **Text from `cin`/`scanf` is empty** | Click **Program input**, type the input there, then press Run. |
| **`#include <conio.h>` (or another Windows header) not found** | Windows-only headers do not exist in the browser. Remove them; `getch()` is not available. `<windows.h>` is accepted. |
| **`void main()` is an error** | Use `int main()` and `return 0;`. |
| **My code disappeared** | Code is saved in this browser only. A different computer or a private window starts fresh. Use **Download** to keep your work. **Reset** can be undone with Ctrl+Z. |

## Teacher / deployment

| Problem | What to do |
|---|---|
| **Actions tab: workflow not running** | Check that `.github/workflows/deploy.yml` is in the repository on the `main` branch, then **Actions → Build and deploy to GitHub Pages → Run workflow**. |
| **`deploy` job fails with "Pages not enabled" or a 404** | **Settings → Pages → Source** must be **GitHub Actions**. Then re-run the workflow. |
| **`npm ci` fails** | `package-lock.json` must be committed together with `package.json`. |
| **Site shows the old version** | Students' browsers may cache for up to 10 minutes; a hard reload (Ctrl+F5) fixes it. The compiler cache is renamed automatically when the compiler version changes. |
| **`verify` job fails but the site works** | The test job runs headless Chromium on GitHub's servers. Open the run's summary to see which check failed. A failed `verify` does not unpublish the site. |
| **Repository is private** | GitHub Pages on free accounts needs a public repository. The code contains no secrets. |
| **Hosting somewhere else** | Run `npm run build` and copy the `dist/` folder to any static web host. Only static files are needed; no special HTTP headers. |
| **Very slow compiles on lab PCs** | The first compile after loading includes warm-up. Programs with `<iostream>` take longer; the precompiled header makes later ones faster. Close other heavy tabs; the compiler needs ~500 MB of RAM. |

## Developers

* `npm run build -- --no-pch` skips building the precompiled header (faster builds; `<iostream>` programs then compile in ~4–5 s instead of ~1–2 s).
* The PCH is cached in `node_modules/.cache/`; delete it to force a rebuild.
* If you change `js/compile-flags.js` or the headers, rebuild so that the PCH matches.
* `npm test` needs a Chromium: either set `CHROME_PATH` or run `npx playwright-core install chromium`.
* The browser cache key is in `dist/js/build-info.js` (compiler version + PCH hash).
