// Captures docs/screenshot.png (used in README.md):  node tests/screenshot.mjs
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const srv = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: '8099' }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const exe = process.env.CHROME_PATH || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => fs.existsSync(p)) || undefined;
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
await page.goto('http://localhost:8099/');
await page.waitForFunction(() => /^Ready/.test(document.getElementById('status-text').textContent), null, { timeout: 120000 });
await page.evaluate(() => window.__oglc.openLesson('l03'));
await page.click('#btn-run');
await page.waitForFunction(() => window.__oglc.frames > 0, null, { timeout: 60000 });
await page.click('#btn-axes');
await page.waitForTimeout(800);
await page.screenshot({ path: 'docs/screenshot.png' });
await browser.close(); srv.kill();
