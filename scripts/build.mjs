// Builds the static website into ./dist (ready for GitHub Pages or any static host).
//
//   npm install
//   npm run build
//
// What it does:
//   1. copies the site (index.html, css, js, lessons)
//   2. bundles the OpenGL/GLUT headers into sysroot/headers.json
//   3. copies the Clang/LLD WebAssembly toolchain from node_modules/@yowasp/clang
//      and gzip-compresses the large files (~105 MB -> ~27 MB download)
//   4. copies CodeMirror 5 (the code editor)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const rel = (...p) => path.join(root, ...p);

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

function copyDir(src, dst, filter = () => true) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d, filter);
    else if (filter(s)) fs.copyFileSync(s, d);
  }
}

// 1. site files
for (const f of ['index.html', 'favicon.svg']) if (fs.existsSync(rel(f))) fs.copyFileSync(rel(f), path.join(dist, f));
copyDir(rel('css'), path.join(dist, 'css'));
copyDir(rel('js'), path.join(dist, 'js'));
if (fs.existsSync(rel('img'))) copyDir(rel('img'), path.join(dist, 'img'));
fs.writeFileSync(path.join(dist, '.nojekyll'), '');

// 2. headers
function tree(dir) {
  const t = {};
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    t[e.name] = e.isDirectory() ? tree(p) : fs.readFileSync(p, 'utf8');
  }
  return t;
}
fs.mkdirSync(path.join(dist, 'sysroot'), { recursive: true });
fs.writeFileSync(path.join(dist, 'sysroot', 'headers.json'), JSON.stringify(tree(rel('sysroot', 'include'))));

// 3. compiler
const clangSrc = rel('node_modules', '@yowasp', 'clang', 'gen');
if (!fs.existsSync(clangSrc)) {
  console.error('node_modules/@yowasp/clang is missing. Run "npm install" first.');
  process.exit(1);
}
const clangDst = path.join(dist, 'vendor', 'yowasp-clang');
fs.mkdirSync(clangDst, { recursive: true });
let total = 0;
for (const f of fs.readdirSync(clangSrc)) {
  const s = path.join(clangSrc, f);
  if (f.endsWith('.js')) { fs.copyFileSync(s, path.join(clangDst, f)); continue; }
  if (/\.(wasm|tar)$/.test(f)) {
    const gz = zlib.gzipSync(fs.readFileSync(s), { level: 9 });
    fs.writeFileSync(path.join(clangDst, f + '.gz'), gz);
    total += gz.length;
    console.log(`  ${f}.gz  ${(gz.length / 1e6).toFixed(1)} MB`);
  }
}
const lic = rel('node_modules', '@yowasp', 'clang', 'README.md');
if (fs.existsSync(lic)) fs.copyFileSync(lic, path.join(clangDst, 'README.md'));
console.log(`compiler download size: ${(total / 1e6).toFixed(1)} MB`);

// 3b. precompiled header for <iostream>/<string>/<vector> (built with the same compiler and flags)
if (!process.argv.includes('--no-pch')) {
  const { runClang } = await import('@yowasp/clang');
  const { COMPILE_FLAGS } = await import(pathToFileURL(rel('js', 'compile-flags.js')).href);
  const prelude = fs.readFileSync(rel('sysroot', 'prelude', 'prelude.h'), 'utf8');
  const t0 = Date.now();
  const crypto = await import('node:crypto');
  const key = crypto.createHash('sha256').update(JSON.stringify([prelude, COMPILE_FLAGS, tree(rel('sysroot', 'include')),
    JSON.parse(fs.readFileSync(rel('node_modules', '@yowasp', 'clang', 'package.json'), 'utf8')).version])).digest('hex').slice(0, 16);
  const cacheFile = rel('node_modules', '.cache', `prelude-${key}.pch.gz`);
  let gzCached = fs.existsSync(cacheFile) ? fs.readFileSync(cacheFile) : null;
  let err = '';
  const out = gzCached ? null : await runClang(['clang++', ...COMPILE_FLAGS, '-Xclang', '-fno-pch-timestamp', '-x', 'c++-header', 'prelude.h', '-o', 'prelude.h.pch'],
    { 'prelude.h': prelude, include: tree(rel('sysroot', 'include')) },
    { stderr: (b) => { if (b) err += Buffer.from(b).toString(); }, fetchProgress: () => {} }).catch((e) => { console.error(err); throw e; });
  const gz = gzCached || zlib.gzipSync(out['prelude.h.pch'], { level: 9 });
  if (!gzCached) { fs.mkdirSync(path.dirname(cacheFile), { recursive: true }); fs.writeFileSync(cacheFile, gz); }
  fs.writeFileSync(path.join(dist, 'sysroot', 'prelude.h.pch.gz'), gz);
  fs.writeFileSync(path.join(dist, 'sysroot', 'prelude.h'), prelude);
  console.log(`  prelude.h.pch.gz  ${(gz.length / 1e6).toFixed(1)} MB  (built in ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}

// 3c. version information (used to name the browser cache of the compiler files)
{
  const clangVersion = JSON.parse(fs.readFileSync(rel('node_modules', '@yowasp', 'clang', 'package.json'), 'utf8')).version;
  const pchFile = path.join(dist, 'sysroot', 'prelude.h.pch.gz');
  const crypto = await import('node:crypto');
  const pchHash = fs.existsSync(pchFile) ? crypto.createHash('sha256').update(fs.readFileSync(pchFile)).digest('hex').slice(0, 12) : 'none';
  fs.writeFileSync(path.join(dist, 'js', 'build-info.js'),
    `// Generated by scripts/build.mjs\nexport const BUILD = ${JSON.stringify({ clang: clangVersion, pch: pchHash, built: new Date().toISOString() })};\n`);
}

// 4. CodeMirror 5
const cm = rel('node_modules', 'codemirror');
const cmDst = path.join(dist, 'vendor', 'codemirror');
for (const f of ['lib/codemirror.js', 'lib/codemirror.css', 'mode/clike/clike.js',
  'addon/edit/matchbrackets.js', 'addon/edit/closebrackets.js', 'addon/selection/active-line.js',
  'addon/comment/comment.js', 'LICENSE']) {
  fs.mkdirSync(path.dirname(path.join(cmDst, f)), { recursive: true });
  fs.copyFileSync(path.join(cm, f), path.join(cmDst, f));
}

console.log('Built ./dist');
