// Automated acceptance tests for OpenGL Classroom.
//
//   npm run build && npm test                      (tests ./dist on a local server)
//   npm test -- --url https://<user>.github.io/<repo>/   (tests the deployed site)
//
// Uses a real Chromium browser (Playwright). Pixel colours are read from
// screenshots of the graphics canvas, so the tests verify what the compiled
// C++ program actually drew.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argUrl = process.argv.indexOf('--url');
const saveThumbs = process.argv.includes('--thumbs');
let base = argUrl > 0 ? process.argv[argUrl + 1] : null;
let srv = null;
if (!base) {
  srv = spawn(process.execPath, [path.join(root, 'scripts', 'serve.mjs')], { env: { ...process.env, PORT: '8097' }, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 500));
  base = 'http://localhost:8097/';
}
const origin = new URL(base).origin;
// Uses CHROME_PATH if set, otherwise Playwright's own Chromium (npx playwright-core install chromium).
const exe = process.env.CHROME_PATH || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => fs.existsSync(p)) || undefined;
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

const results = [];
function record(id, name, pass, detail) {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}  ${name}${detail ? '  — ' + detail : ''}`);
}

async function newPage({ blockExternal = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });   // a clean session: no cache, no storage
  const page = await ctx.newPage();
  page.external = [];
  page.errors = [];
  await page.route('**/*', (route) => {
    const u = route.request().url();
    if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) {
      page.external.push(u);
      return blockExternal ? route.abort() : route.continue();
    }
    return route.continue();
  });
  page.on('pageerror', (e) => page.errors.push(e.message));
  return page;
}
async function waitReady(page) {
  await page.waitForFunction(() => /^Ready/.test(document.getElementById('status-text').textContent), null, { timeout: 180000 });
}
async function runCode(page, code, { waitFrames = 1, timeout = 60000 } = {}) {
  await page.evaluate((c) => { window.__oglc.code = c; }, code);
  const before = await page.evaluate(() => window.__oglc.runs = (window.__oglc.runs || 0) + 1);
  await page.click('#btn-run');
  await page.waitForFunction((n) => {
    const o = window.__oglc;
    if (o.compiling) return false;
    if (o.lastCompile && !o.lastCompile.ok) return true;
    return o.frames >= n || o.lastRuntimeError || o.lastExit != null;
  }, waitFrames, { timeout }).catch(async (e) => {
    const st = await page.evaluate(() => ({ frames: window.__oglc.frames, compiling: window.__oglc.compiling, status: document.getElementById('status-text').textContent, log: document.getElementById('out-log').textContent.slice(-300) }));
    throw new Error('timeout waiting for the program: ' + JSON.stringify(st));
  });
  await page.waitForTimeout(250);
  return page.evaluate(() => ({ compile: window.__oglc.lastCompile, ms: window.__oglc.lastCompileMs, frames: window.__oglc.frames, err: window.__oglc.lastRuntimeError, exit: window.__oglc.lastExit, status: document.getElementById('status-text').textContent }));
}
async function grab(page) {
  const buf = await page.locator('#canvas-box canvas.gl').screenshot();
  const png = PNG.sync.read(buf);
  png.at = (nx, ny) => { // nx, ny in OpenGL normalised coordinates (-1..1, y up)
    const x = Math.min(png.width - 1, Math.max(0, Math.round((nx + 1) / 2 * png.width)));
    const y = Math.min(png.height - 1, Math.max(0, Math.round((1 - ny) / 2 * png.height)));
    const i = (y * png.width + x) * 4;
    return [png.data[i], png.data[i + 1], png.data[i + 2]];
  };
  return png;
}
const isRed = (c) => c[0] > 200 && c[1] < 60 && c[2] < 60;
const isGreen = (c) => c[1] > 200 && c[0] < 60 && c[2] < 60;
const isBlack = (c) => c[0] < 30 && c[1] < 30 && c[2] < 30;
const fmt = (c) => `rgb(${c.join(',')})`;

const STARTER = (opts = {}) => `#include <GL/glut.h>

void display()
{
    glClear(GL_COLOR_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    ${opts.transform || ''}
    glColor3f(${opts.color || '1.0f, 0.0f, 0.0f'});
    glBegin(GL_TRIANGLES);
        glVertex2f(-0.5f, -0.5f);
        glVertex2f( 0.5f, -0.5f);
        glVertex2f( 0.0f, ${opts.top || '0.5f'})${opts.noSemicolon ? '' : ';'}
    glEnd();
    glFlush();
}

int main(int argc, char** argv)
{
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_SINGLE | GLUT_RGB);
    glutInitWindowSize(500, 500);
    glutCreateWindow("Test");
    glutDisplayFunc(display);
    glutMainLoop();
    return 0;
}
`;

try {
  // ---------------------------------------------------------------- TEST 1
  const page = await newPage();
  const t0 = Date.now();
  await page.goto(base);
  await waitReady(page);
  const loadS = ((Date.now() - t0) / 1000).toFixed(1);
  record('TEST 1', 'Open the site in a clean browser session; compiler loads', true, `ready after ${loadS} s (clean profile, no cache)`);
  await page.click('#btn-zoom'); // 100% pixel size for exact sampling
  await page.waitForTimeout(100);

  // ---------------------------------------------------------------- TEST 2 + 3 (actual starter program of Lesson 1)
  const lesson1 = await page.evaluate(() => window.__oglc.code);
  let r = await runCode(page, lesson1);
  record('TEST 2', 'Load the starter C++ program and compile it', r.compile.ok, `compiled in ${(r.ms / 1000).toFixed(2)} s`);
  let img = await grab(page);
  const c0 = img.at(0, 0), cCorner = img.at(-0.9, 0.9), cAbove = img.at(0, 0.7);
  record('TEST 3', 'A real red triangle appears in the viewport', isRed(c0) && isBlack(cCorner) && isBlack(cAbove) && img.width === 500,
    `centre ${fmt(c0)}, corner ${fmt(cCorner)}, above apex ${fmt(cAbove)}, canvas ${img.width}x${img.height}`);

  // ---------------------------------------------------------------- TEST 4
  r = await runCode(page, STARTER({ top: '0.9f' }));
  img = await grab(page);
  record('TEST 4', 'Change a vertex coordinate: the triangle changes shape', r.compile.ok && isRed(img.at(0, 0.75)), `pixel at (0, 0.75) is now ${fmt(img.at(0, 0.75))} (was black)`);

  // ---------------------------------------------------------------- TEST 5
  r = await runCode(page, STARTER({ color: '0.0f, 1.0f, 0.0f' }));
  img = await grab(page);
  record('TEST 5', 'Change the colour to green', r.compile.ok && isGreen(img.at(0, 0)), `centre ${fmt(img.at(0, 0))}`);

  // ---------------------------------------------------------------- TEST 6
  r = await runCode(page, STARTER({ transform: 'glTranslatef(0.5f, 0.0f, 0.0f);' }));
  img = await grab(page);
  record('TEST 6', 'glTranslatef moves the triangle', r.compile.ok && isRed(img.at(0.5, 0)) && isBlack(img.at(-0.4, -0.4)),
    `(0.5,0) ${fmt(img.at(0.5, 0))}, (-0.4,-0.4) ${fmt(img.at(-0.4, -0.4))}`);

  // ---------------------------------------------------------------- TEST 7
  r = await runCode(page, STARTER({ transform: 'glRotatef(90.0f, 0.0f, 0.0f, 1.0f);' }));
  img = await grab(page);
  record('TEST 7', 'glRotatef rotates the triangle', r.compile.ok && isRed(img.at(0.4, 0.3)) && isBlack(img.at(-0.3, -0.45)),
    `(0.4,0.3) ${fmt(img.at(0.4, 0.3))} (black before rotation), (-0.3,-0.45) ${fmt(img.at(-0.3, -0.45))} (red before)`);

  // ---------------------------------------------------------------- TEST 8
  r = await runCode(page, STARTER({ transform: 'glScalef(0.3f, 0.3f, 1.0f);' }));
  img = await grab(page);
  record('TEST 8', 'glScalef scales the triangle', r.compile.ok && isRed(img.at(0, 0)) && isBlack(img.at(0, -0.3)) && isBlack(img.at(-0.3, -0.4)),
    `centre ${fmt(img.at(0, 0))}, (0,-0.3) ${fmt(img.at(0, -0.3))} (red before scaling)`);

  // ---------------------------------------------------------------- TEST 9
  r = await runCode(page, STARTER({ noSemicolon: true }));
  const log9 = await page.textContent('#out-log');
  const marked = await page.locator('.cm-error-line').count();
  record('TEST 9', 'A compilation error is shown instead of success', !r.compile.ok && /Compilation failed/.test(log9) && !/Compiled successfully/.test(log9) && /Line 1[34]/.test(log9) && marked > 0,
    `status "${r.status}"; message: ${(log9.match(/Line \d+, column \d+[^·]*?expected[^\n]*?(?=A semicolon|$)/) || [''])[0].slice(0, 80)}; editor line highlighted: ${marked > 0}`);

  // ---------------------------------------------------------------- TEST 10
  const anim = await page.evaluate(() => { window.__oglc.openLesson('l12'); return window.__oglc.original('l12'); });
  r = await runCode(page, anim, { waitFrames: 20 });
  const framesA = r.frames;
  const progs = [STARTER({ color: '0.0f, 0.0f, 1.0f' }), STARTER({ transform: 'glTranslatef(-0.5f,0,0);' }), lesson1];
  let ok10 = framesA >= 20;
  for (const p of progs) { r = await runCode(page, p); ok10 = ok10 && r.compile.ok; }
  await page.waitForTimeout(700);
  const framesAfter = await page.evaluate(() => window.__oglc.frames);
  const canvases = await page.locator('#canvas-box canvas.gl').count();
  img = await grab(page);
  ok10 = ok10 && canvases === 1 && framesAfter <= 2 && isRed(img.at(0, 0)) && isBlack(img.at(-0.6, 0.6));
  record('TEST 10', 'Several programs in a row do not interfere', ok10,
    `animation drew ${framesA} frames, then 3 more programs; ${canvases} canvas in the page, last program drew ${framesAfter} frame(s) (old animation stopped), final picture correct`);

  // ---------------------------------------------------------------- TEST 11 / 12 (static, no external services)
  record('TEST 11', 'No installation or developer server needed (static files only)', page.external.length === 0,
    page.external.length ? `external requests: ${page.external.slice(0, 3).join(', ')}` : `all requests went to ${origin}; every other host was blocked and nothing broke`);
  const distFiles = [];
  if (fs.existsSync(path.join(root, 'dist'))) (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else distFiles.push(p); } })(path.join(root, 'dist'));
  const suspicious = distFiles.filter((f) => /\.(js|html|json)$/.test(f) && !f.includes('yowasp-clang')).filter((f) => /api[_-]?key|localhost|127\.0\.0\.1|Authorization:/i.test(fs.readFileSync(f, 'utf8')));
  record('TEST 12', 'No paid services, API keys, backend or localhost dependency', suspicious.length === 0 && page.external.length === 0,
    suspicious.length ? suspicious.join(', ') : `${distFiles.length} static files; no API keys, no server endpoints, no localhost references`);

  // ---------------------------------------------------------------- extra checks
  r = await runCode(page, `#include <GL/glut.h>
void display(){ glClear(GL_COLOR_BUFFER_BIT); glFlush(); }
int main(int argc, char** argv){ glutInit(&argc, argv); glutCreateWindow("loop"); glutDisplayFunc(display);
  volatile long long i = 0; while (true) { i++; } glutMainLoop(); return 0; }`, { timeout: 30000 });
  const wd = await page.evaluate(() => window.__oglc.lastRuntimeError);
  record('EXTRA A', 'Infinite loop is stopped by the watchdog', wd === 'watchdog', `status "${r.status}"`);

  r = await runCode(page, `#include <GL/glut.h>
int *volatile p = 0;
volatile int k = 100000000;
int sink;
void display(){ glClear(GL_COLOR_BUFFER_BIT); sink = p[k]; glFlush(); }
int main(int argc, char** argv){ glutInit(&argc, argv); glutCreateWindow("crash"); glutDisplayFunc(display); glutMainLoop(); return 0; }`);
  const rtLog = await page.textContent('#out-log');
  record('EXTRA B', 'Runtime crash gives a readable message', /Runtime error/.test(rtLog) && /out of bounds/i.test(rtLog), (rtLog.match(/Memory access[^.]*\./) || [''])[0]);

  r = await runCode(page, `#include <iostream>
#include <string>
#include <GL/glut.h>
using namespace std;
void display(){ glClear(GL_COLOR_BUFFER_BIT); glFlush(); }
int main(int argc, char** argv){ string name; int n = 0; cin >> name >> n; cout << "Hello " << name << " " << n * 2 << endl;
  glutInit(&argc, argv); glutCreateWindow("io"); glutDisplayFunc(display); glutMainLoop(); return 0; }`.replace('cin >> name >> n;', 'name = "student"; n = 21;'));
  const ioLog = await page.textContent('#out-log');
  record('EXTRA C', '<iostream> program compiles (precompiled header) and cout works', r.compile.ok && /Hello student 42/.test(ioLog), `compiled in ${(r.ms / 1000).toFixed(2)} s`);

  // keyboard: lesson x01 — arrow key moves the square
  r = await runCode(page, await page.evaluate(() => { window.__oglc.openLesson('x01'); return window.__oglc.original('x01'); }));
  img = await grab(page);
  const beforeKey = img.at(0, 0);
  await page.click('#canvas-box canvas.gl', { position: { x: 20, y: 20 } });
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  img = await grab(page);
  const afterKey = img.at(0, 0), moved = img.at(0.4, 0);
  const dot = img.at(20 / 250 - 1, 1 - 20 / 250);
  record('EXTRA D', 'Keyboard and mouse callbacks (glutSpecialFunc, glutMouseFunc)', beforeKey[2] > 200 && afterKey[2] < 60 && moved[2] > 200 && dot[0] > 200 && dot[1] > 180,
    `square centre before ${fmt(beforeKey)}, after 10×→ ${fmt(afterKey)}, new position ${fmt(moved)}, clicked dot ${fmt(dot)}`);

  // many more API functions in one program (display lists, quadrics, stipple, text, menus, blending, glGet...)
  r = await runCode(page, fs.readFileSync(path.join(root, 'tests', 'kitchen-sink.cpp'), 'utf8'));
  img = await grab(page);
  const sinkLog = await page.textContent('#out-log');
  const warnText = await page.locator('#out-log .warning').allTextContents();
  const unexpected = warnText.join(' ').replace(/Note: glutStrokeCharacter\(\)[^.]*\./g, '').trim();
  await page.click('#canvas-box canvas.gl', { button: 'right', position: { x: 300, y: 200 } });
  await page.click('#menu-popup .mi >> text=Green');
  await page.waitForTimeout(300);
  const menuLog = await page.textContent('#out-log');
  record('EXTRA G', 'Wider API: display lists, GLU quadrics, stipple, wide lines, text, blending, glGet, menus', r.compile.ok && !r.err && img.width === 600 && img.height === 400 && /reshape 600 400/.test(sinkLog) && !/gl error/.test(sinkLog) && /menu 2/.test(menuLog) && !unexpected,
    `canvas ${img.width}x${img.height}; reshape callback ${/reshape 600 400/.test(sinkLog)}; menu callback ${/menu 2/.test(menuLog)}; unexpected warnings: ${unexpected || 'none'}`);
  if (saveThumbs) fs.writeFileSync(path.join(root, 'docs', 'kitchen-sink.png'), PNG.sync.write(img));
  await page.click('#btn-stop');

  // desktop-style animation: a loop inside display() with glFlush() + Sleep()
  r = await runCode(page, `#include <windows.h>
#include <GL/glut.h>
void display() {
    for (float x = -0.9f; x <= 0.9f; x += 0.05f) {
        glClear(GL_COLOR_BUFFER_BIT);
        glColor3f(1, 0, 0);
        glRectf(x - 0.1f, -0.1f, x + 0.1f, 0.1f);
        glFlush();
        Sleep(30);
    }
}
int main(int argc, char** argv) { glutInit(&argc, argv); glutInitWindowSize(500, 500); glutCreateWindow("loop"); glutDisplayFunc(display); glutMainLoop(); }`, { waitFrames: 0 });
  await page.waitForTimeout(1500);
  const loopInfo = await page.evaluate(() => ({ blits: window.__oglc.blits || 0, visible: !document.getElementById('blit').hidden }));
  record('EXTRA H', 'Animation inside one function (loop + glFlush + Sleep) is shown frame by frame', r.compile.ok && loopInfo.blits >= 5, `${loopInfo.blits} intermediate frames shown`);
  await page.click('#btn-stop');

  // idle speed: a single-buffered idle function runs about as often as on a desktop PC
  r = await runCode(page, `#include <GL/glut.h>
#include <cstdio>
long calls = 0;
void display() { glClear(GL_COLOR_BUFFER_BIT); glFlush(); }
void idle() { calls++; if (calls % 500 == 0) printf("calls=%ld\\n", calls); glutPostRedisplay(); }
int main(int argc, char** argv) { glutInit(&argc, argv); glutCreateWindow("idle"); glutDisplayFunc(display); glutIdleFunc(idle); glutMainLoop(); }`);
  await page.waitForTimeout(1500);
  const idleLog = await page.textContent('#out-log');
  const maxCalls = Math.max(0, ...[...idleLog.matchAll(/calls=(\d+)/g)].map((m) => +m[1]));
  record('EXTRA I', 'glutIdleFunc runs at desktop-like speed (single buffer)', maxCalls >= 500, `${maxCalls} idle calls in about 1.5 s`);
  await page.click('#btn-stop');

  // all lessons compile and draw something
  const ids = await page.evaluate(() => window.__oglc.lessons.filter((x) => x !== 'blank'));
  const failed = [];
  const thumbDir = path.join(root, 'img', 'lessons');
  if (saveThumbs) fs.mkdirSync(thumbDir, { recursive: true });
  for (const id of ids) {
    const code = await page.evaluate((x) => { window.__oglc.openLesson(x); return window.__oglc.original(x); }, id);
    process.stdout.write(`  lesson ${id}… `);
    r = await runCode(page, code, { waitFrames: /l0[789]|l1[02]|x03/.test(id) ? 30 : 1 });
    console.log(`compiled in ${(r.ms / 1000).toFixed(2)} s, ${r.frames} frame(s)`);
    img = await grab(page);
    let lit = 0;
    for (let i = 0; i < img.data.length; i += 4 * 97) if (img.data[i] + img.data[i + 1] + img.data[i + 2] > 60) lit++;
    const warn = await page.locator('#out-log .warning').count();
    if (!r.compile.ok || r.err || lit < 20 || warn) failed.push(`${id}${!r.compile.ok ? ' (compile)' : ''}${r.err ? ' (runtime)' : ''}${lit < 20 ? ' (blank)' : ''}${warn ? ' (warnings)' : ''}`);
    if (saveThumbs) {
      const out = new PNG({ width: img.width / 2, height: img.height / 2 });
      for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) for (let k = 0; k < 4; k++) {
        const s = (yy, xx) => img.data[((y * 2 + yy) * img.width + (x * 2 + xx)) * 4 + k];
        out.data[(y * out.width + x) * 4 + k] = k === 3 ? 255 : (s(0, 0) + s(0, 1) + s(1, 0) + s(1, 1)) >> 2;
      }
      fs.writeFileSync(path.join(thumbDir, id + '.png'), PNG.sync.write(out));
    }
  }
  record('EXTRA E', `All ${ids.length} lesson examples compile, run and draw (no warnings)`, failed.length === 0, failed.length ? 'failed: ' + failed.join(', ') : ids.join(', '));
  record('EXTRA F', 'No JavaScript errors on the page', page.errors.length === 0, page.errors.slice(0, 3).join(' | '));
} catch (e) {
  record('ERROR', 'Test run aborted', false, String(e && e.stack || e));
} finally {
  await browser.close();
  if (srv) srv.kill();
}

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} checks passed`);
const md = [`# Test results`, '', `Target: \`${base}\` · Browser: Chromium (headless, SwiftShader WebGL) · ${new Date().toISOString()}`, '',
  '| Test | Description | Result | Details |', '|---|---|---|---|',
  ...results.map((r) => `| ${r.id} | ${r.name} | ${r.pass ? '✅ PASS' : '❌ FAIL'} | ${String(r.detail || '').replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`), '',
  `**${passed}/${results.length} checks passed.**`, ''].join('\n');
fs.writeFileSync(path.join(root, 'docs', 'TEST-RESULTS.md'), md);
process.exit(passed === results.length ? 0 : 1);
