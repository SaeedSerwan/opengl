// OpenGL Classroom — page controller (editor, lessons, compiler, runner, viewport, output).
import { LESSONS, BLANK, REFERENCE } from './lessons.js';
import { hintFor } from './hints.js';

const $ = (id) => document.getElementById(id);
const MAX_SOURCE = 200 * 1024;
const WATCHDOG_MS = 5000;
const store = {
  get(k, d = null) { try { const v = localStorage.getItem('oglc:' + k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('oglc:' + k, v); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem('oglc:' + k); } catch { /* ignore */ } },
};

// ------------------------------------------------------------------ editor
const ALL = [...LESSONS, BLANK];
const byId = Object.fromEntries(ALL.map((l) => [l.id, l]));
let current = byId[store.get('lesson', 'l01')] || LESSONS[0];
const docs = new Map();

const cm = CodeMirror($('editor-host'), {
  mode: 'text/x-c++src',
  theme: 'oglc',
  lineNumbers: true,
  indentUnit: 4,
  tabSize: 4,
  indentWithTabs: false,
  matchBrackets: true,
  autoCloseBrackets: true,
  styleActiveLine: true,
  gutters: ['gutter-marks', 'CodeMirror-linenumbers'],
  extraKeys: {
    'Ctrl-Enter': () => run(), 'Cmd-Enter': () => run(), 'F5': () => run(),
    'Ctrl-S': () => download(), 'Cmd-S': () => download(),
    'Ctrl-/': 'toggleComment', 'Cmd-/': 'toggleComment',
    Tab: (c) => (c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('    ', 'end')),
    'Shift-Tab': (c) => c.indentSelection('subtract'),
  },
});
// Highlight OpenGL names: gl*/glu*/glut* functions and GL_* constants.
cm.addOverlay({
  token(stream) {
    if (stream.match(/^(?:glut|glu|gl)[A-Z]\w*/)) return 'gl';
    if (stream.match(/^(?:GLUT|GLU|GL)_\w+/)) return 'glconst';
    if (stream.match(/^\w+/)) return null;
    stream.next();
    return null;
  },
});

function docFor(lesson) {
  let d = docs.get(lesson.id);
  if (!d) {
    const saved = store.get('code:' + lesson.id);
    d = CodeMirror.Doc(saved !== null ? saved : lesson.code, 'text/x-c++src');
    docs.set(lesson.id, d);
  }
  return d;
}
let saveTimer = 0;
cm.on('change', () => {
  clearTimeout(saveTimer);
  const id = current.id;
  saveTimer = setTimeout(() => {
    const code = cm.getValue();
    if (code === current.code) store.del('code:' + id); else store.set('code:' + id, code);
  }, 400);
  updateDirty();
  clearMarks();
});
function updateDirty() { $('dirty-dot').hidden = cm.getValue() === current.code; }

function openLesson(lesson, { load = true } = {}) {
  current = lesson;
  store.set('lesson', lesson.id);
  if (load) cm.swapDoc(docFor(lesson));
  $('file-name').textContent = fileName();
  updateDirty();
  clearMarks();
  renderLessonList();
  renderLesson();
}
function fileName() {
  if (current.id === 'blank') return 'main.cpp';
  if (current.id === 'shared') return 'shared.cpp';
  const n = current.id.startsWith('l') ? 'lesson-' + current.id.slice(1) : 'extra-' + current.id.slice(1);
  return n + '-' + current.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.cpp';
}

// ------------------------------------------------------------------ lessons sidebar
function renderLessonList() {
  const list = $('lesson-list');
  list.innerHTML = '';
  let group = '';
  let n = 0;
  for (const l of [...LESSONS, BLANK]) {
    if (l.group !== group) {
      group = l.group;
      const g = document.createElement('li'); g.className = 'group'; g.textContent = group; list.appendChild(g);
    }
    const li = document.createElement('li');
    const b = document.createElement('button');
    if (l.id === current.id) b.classList.add('current');
    const num = l.id.startsWith('l') ? String(++n) : l.id === 'blank' ? '+' : '★';
    b.innerHTML = `<span class="num">${num}</span><span><span class="ltitle"></span><span class="lsub"></span></span>`;
    b.querySelector('.ltitle').textContent = l.title;
    b.querySelector('.lsub').textContent = l.sub || 'Start from an empty program';
    b.addEventListener('click', () => { openLesson(l); showLessonView(true); });
    li.appendChild(b);
    list.appendChild(li);
  }
}
function showLessonView(on) {
  $('lesson-list').hidden = on && current.id !== 'blank';
  $('lesson-view').hidden = !on || current.id === 'blank';
  if (on) $('pane-lessons').scrollTop = 0;
}
function renderLesson() {
  const l = current, v = $('lesson-view');
  if (!l.explain) { v.innerHTML = ''; return; }
  const idx = LESSONS.indexOf(l);
  const prev = LESSONS[idx - 1], next = LESSONS[idx + 1];
  const kicker = l.id.startsWith('l') ? `Lesson ${idx + 1} of 12` : 'Extra lesson';
  v.innerHTML = `
    <button class="back" id="lesson-back">← All lessons</button>
    <div class="kicker">${kicker}</div>
    <h2></h2>
    <div class="objective"><b>Learning objective:</b> ${l.objective}</div>
    ${l.explain}
    <h3>Expected result</h3>
    <figure><img alt="" loading="lazy" src="img/lessons/${l.id}.png" onerror="this.remove()"><figcaption>${escapeHtml(l.expected)}</figcaption></figure>
    <h3>Exercise</h3>
    <div class="exercise">${l.exercise}</div>
    <h3>Try these changes</h3>
    <ul>${l.mods.map((m) => `<li>${m}</li>`).join('')}</ul>
    <p style="color:var(--text-2);font-size:12.5px">Your changes are saved in this browser. <b>Reset</b> brings back the original example.</p>
    <div class="nav">
      ${prev ? '<button class="btn" id="lesson-prev">← Previous</button>' : '<span></span>'}
      ${next ? '<button class="btn" id="lesson-next">Next →</button>' : ''}
    </div>`;
  v.querySelector('h2').textContent = l.title;
  $('lesson-back').onclick = () => showLessonView(false);
  if (prev) $('lesson-prev').onclick = () => openLesson(prev);
  if (next) $('lesson-next').onclick = () => openLesson(next);
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

document.querySelectorAll('.side-tab').forEach((t) => t.addEventListener('click', () => {
  document.querySelectorAll('.side-tab').forEach((x) => x.classList.toggle('active', x === t));
  $('pane-lessons').hidden = t.dataset.tab !== 'lessons';
  $('pane-reference').hidden = t.dataset.tab !== 'reference';
}));
$('pane-reference').innerHTML = REFERENCE;
$('btn-lessons').addEventListener('click', () => {
  const ws = $('workspace');
  ws.classList.toggle('no-sidebar');
  store.set('sidebar', ws.classList.contains('no-sidebar') ? '0' : '1');
  layoutCanvas();
});
if (store.get('sidebar') === '0' || window.innerWidth <= 1100) $('workspace').classList.add('no-sidebar');

// ------------------------------------------------------------------ output panel
const log = $('out-log');
function out(text, cls = 'stdout') {
  const atBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 8;
  const last = log.lastElementChild;
  if (last && last.classList.contains(cls) && last.classList.contains('line') && (cls === 'stdout' || cls === 'warning' || cls === 'stderr')) {
    last.textContent += text;
  } else {
    const d = document.createElement('div');
    d.className = 'line ' + cls;
    d.textContent = text;
    log.appendChild(d);
  }
  while (log.childElementCount > 2000) log.firstElementChild.remove();
  if (atBottom) log.scrollTop = log.scrollHeight;
}
function outNode(node) { log.appendChild(node); log.scrollTop = log.scrollHeight; }
function sys(text, cls = 'sys') { const d = document.createElement('div'); d.className = 'line ' + cls; d.textContent = text; outNode(d); }
function clearOutput() { log.innerHTML = ''; }
function setStatus(kind, text) { $('status').dataset.kind = kind; $('status-text').textContent = text; }
$('btn-clear').addEventListener('click', clearOutput);
$('btn-out-toggle').addEventListener('click', () => {
  const o = $('output'); o.classList.toggle('collapsed');
  $('btn-out-toggle').setAttribute('aria-expanded', String(!o.classList.contains('collapsed')));
  layoutCanvas();
});
$('btn-stdin').addEventListener('click', () => {
  const box = $('stdin-box'); box.hidden = !box.hidden;
  $('btn-stdin').setAttribute('aria-pressed', String(!box.hidden));
  if ($('output').classList.contains('collapsed')) $('btn-out-toggle').click();
});
$('stdin').value = store.get('stdin', '');
$('stdin').addEventListener('input', () => store.set('stdin', $('stdin').value));

// ------------------------------------------------------------------ diagnostics
let marks = [];
function clearMarks() {
  if (!marks.length) return;
  cm.operation(() => {
    for (const m of marks) { cm.removeLineClass(m, 'background', 'cm-error-line'); cm.removeLineClass(m, 'background', 'cm-warn-line'); }
    cm.clearGutter('gutter-marks');
  });
  marks = [];
}
function parseDiagnostics(text) {
  const lines = text.split('\n');
  const diags = [];
  let cur = null;
  const head = /^(.+?):(\d+):(\d+): (fatal error|error|warning|note): (.*)$/;
  for (const line of lines) {
    const m = line.match(head);
    if (m) {
      const d = { file: m[1], line: +m[2], col: +m[3], kind: m[4] === 'fatal error' ? 'error' : m[4], msg: m[5], snippet: [] };
      if (d.kind === 'note' && cur) { cur.notes.push(d); continue; }
      d.notes = [];
      diags.push(d); cur = d; continue;
    }
    const lm = line.match(/wasm-ld: error: (?:.*?: )?(undefined symbol: .*)$/) || line.match(/wasm-ld: error: (.*)$/);
    if (lm) { cur = { file: '', line: 0, col: 0, kind: 'error', msg: lm[1], snippet: [], notes: [], linker: true }; diags.push(cur); continue; }
    if (/^\d+ (error|warning)s? generated\.?$/.test(line.trim()) || /^clang\S*: error: linker command failed/.test(line)) { cur = null; continue; }
    if (cur && line.trim()) (cur.notes.length ? cur.notes[cur.notes.length - 1].snippet : cur.snippet).push(line);
  }
  return diags;
}
function showDiagnostics(diags, raw) {
  const errs = diags.filter((d) => d.kind === 'error');
  cm.operation(() => {
    for (const d of diags) {
      if (d.file !== 'main.cpp' || d.line < 1 || d.line > cm.lineCount()) continue;
      const ln = d.line - 1;
      cm.addLineClass(ln, 'background', d.kind === 'error' ? 'cm-error-line' : 'cm-warn-line');
      const g = document.createElement('div');
      g.className = 'gmark ' + d.kind; g.title = d.msg;
      cm.setGutterMarker(ln, 'gutter-marks', g);
      marks.push(ln);
    }
  });
  for (const d of diags) {
    const box = document.createElement('div');
    box.className = 'diag ' + d.kind;
    const where = d.linker ? 'Linker' : d.file === 'main.cpp' ? `Line ${d.line}, column ${d.col}` : `${d.file.replace(/^include\//, '')}:${d.line}`;
    box.innerHTML = `<div class="loc"></div><div class="msg"></div>`;
    box.querySelector('.loc').textContent = (d.kind === 'error' ? 'Error · ' : 'Warning · ') + where;
    box.querySelector('.msg').textContent = d.msg;
    const h = hintFor(d);
    if (h) { const hd = document.createElement('div'); hd.className = 'hint'; hd.innerHTML = h; box.appendChild(hd); }
    if (d.snippet.length) { const pre = document.createElement('pre'); pre.textContent = d.snippet.join('\n'); box.appendChild(pre); }
    for (const n of d.notes) {
      const pre = document.createElement('pre');
      pre.textContent = `note (line ${n.line}): ${n.msg}` + (n.snippet.length ? '\n' + n.snippet.join('\n') : '');
      box.appendChild(pre);
    }
    if (d.file === 'main.cpp' && d.line > 0) {
      box.title = 'Click to go to this line';
      box.addEventListener('click', () => { cm.focus(); cm.setCursor({ line: d.line - 1, ch: Math.max(0, d.col - 1) }); cm.scrollIntoView(null, 80); });
    }
    outNode(box);
  }
  if (raw && raw.trim()) {
    const det = document.createElement('details'); det.className = 'raw';
    det.innerHTML = '<summary>Full compiler output</summary><pre></pre>';
    det.querySelector('pre').textContent = raw;
    outNode(det);
  }
  if (errs[0] && errs[0].file === 'main.cpp') { cm.scrollIntoView({ line: errs[0].line - 1, ch: 0 }, 80); }
}

// ------------------------------------------------------------------ compiler
let compiler = null, compilerReady = false, compilerFailed = false, pendingRun = false;
let compileId = 0, compileStarted = 0, compileTimer = 0;
const compileWaiters = new Map();

function startCompiler() {
  compilerReady = false; compilerFailed = false;
  try {
    compiler = new Worker('js/compiler-worker.js', { type: 'module' });
  } catch (e) {
    compilerFailed = true;
    setStatus('error', 'This browser cannot run the compiler');
    sys('Your browser does not support module Web Workers. Please use a current version of Chrome, Edge, Firefox or Safari.', 'err');
    return;
  }
  compiler.onerror = (e) => {
    compilerFailed = true;
    setStatus('error', 'The compiler could not be loaded');
    sys('The C++ compiler failed to start' + (e.message ? ': ' + e.message : '') + '. Use a current version of Chrome, Edge or Firefox, and check that the site files (vendor/yowasp-clang) were deployed.', 'err');
    updateRunButton();
  };
  compiler.onmessage = (e) => {
    const m = e.data;
    if (m.type === 'progress') {
      if (m.phase === 'download') {
        const pct = m.total > 1 ? Math.min(100, Math.round(100 * m.done / m.total)) : 0;
        setStatus('busy', `Loading the C++ compiler… ${pct}% (about 27 MB, only the first time)`);
      } else setStatus('busy', 'Starting the C++ compiler…');
    } else if (m.type === 'ready') {
      compilerReady = true;
      prepareRunner();
      setStatus('ok', 'Ready — edit the code and press Run (Ctrl+Enter)');
      updateRunButton();
      window.__oglc.compilerReadyMs = m.ms;
      if (pendingRun) { pendingRun = false; run(); }
    } else if (m.type === 'load-error') {
      compilerFailed = true;
      setStatus('error', 'The compiler could not be loaded');
      sys('Could not load the C++ compiler: ' + m.message + '\nCheck your internet connection and reload the page.', 'err');
      updateRunButton();
    } else if (m.type === 'compiled') {
      const w = compileWaiters.get(m.id);
      if (w) { compileWaiters.delete(m.id); w(m); }
    }
  };
  compiler.postMessage({ type: 'load' });
}
function compile(source) {
  const id = ++compileId;
  return new Promise((resolve) => {
    compileWaiters.set(id, resolve);
    compiler.postMessage({ type: 'compile', id, source });
    clearTimeout(compileTimer);
    compileTimer = setTimeout(() => {
      if (!compileWaiters.has(id)) return;
      compileWaiters.delete(id);
      compiler.terminate();
      startCompiler();
      resolve({ ok: false, internal: true, diagnostics: 'The compiler took longer than 90 seconds and was restarted.' });
    }, 90000);
  });
}

// ------------------------------------------------------------------ runner
let runner = null;        // { worker | program, canvas, ... }
let running = false, compiling = false;
let canvasW = 500, canvasH = 500;
let snap = null;          // last projection/viewport snapshot from the program
let menus = { menus: {}, attached: {} };
let pingTimer = 0, lastPong = 0, pingId = 0;
const OFFSCREEN = typeof HTMLCanvasElement !== 'undefined' && 'transferControlToOffscreen' in HTMLCanvasElement.prototype && typeof OffscreenCanvas !== 'undefined';

function updateRunButton() {
  const b = $('btn-run');
  b.disabled = compiling || compilerFailed;
  b.classList.toggle('busy', compiling || (!compilerReady && pendingRun));
  $('run-label').textContent = compiling ? 'Compiling…' : (!compilerReady && pendingRun) ? 'Waiting…' : 'Run';
  $('btn-stop').disabled = !running;
}

function stopProgram(reason) {
  clearInterval(pingTimer);
  hideMenu();
  if (runner) {
    if (runner.worker) runner.worker.terminate();
    if (runner.program) { try { runner.program.stop(); } catch { /* ignore */ } }
    if (runner.mainGL) { try { runner.mainGL.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* ignore */ } }
  }
  const wasRunning = running;
  running = false;
  updateRunButton();
  if (reason && wasRunning) { sys(reason); setStatus('idle', reason); }
}

// Frames copied from a program that animates inside one function (draw, glFlush, Sleep, ...).
let blitGen = 0;
function showBlit(m) {
  blitGen++;
  const c = $('blit');
  if (c.width !== m.width || c.height !== m.height) { c.width = m.width; c.height = m.height; }
  const ctx = c.getContext('2d');
  const img = new ImageData(new Uint8ClampedArray(m.pixels.buffer || m.pixels), m.width, m.height);
  // WebGL rows start at the bottom: draw the image upside down.
  if (!showBlit.tmp) showBlit.tmp = document.createElement('canvas');
  const t = showBlit.tmp; t.width = m.width; t.height = m.height;
  t.getContext('2d').putImageData(img, 0, 0);
  ctx.save(); ctx.setTransform(1, 0, 0, -1, 0, m.height); ctx.drawImage(t, 0, 0); ctx.restore();
  c.hidden = false;
}
function hideBlit() {
  const gen = blitGen;
  requestAnimationFrame(() => requestAnimationFrame(() => { if (gen === blitGen) $('blit').hidden = true; }));
}

function removeCanvas() {
  $('blit').hidden = true;
  if (runner && runner.canvas) runner.canvas.remove();
  runner = null;
}

function handleRunnerMessage(m) {
  switch (m.type) {
    case 'pong': lastPong = performance.now(); break;
    case 'blit': showBlit(m); window.__oglc.blits = (window.__oglc.blits || 0) + 1; break;
    case 'blit-end': hideBlit(); break;
    case 'output': out(m.text, m.stream); break;
    case 'size':
      canvasW = m.width; canvasH = m.height;
      $('canvas-size').textContent = `${canvasW} × ${canvasH}`;
      if (runner && runner.canvas && !OFFSCREEN) { /* main-thread canvas already resized */ }
      layoutCanvas();
      break;
    case 'title': $('win-title').textContent = m.title; break;
    case 'status': if (m.state === 'running') setStatus('ok', 'Running' + (window.__oglc.lastCompileMs != null ? ` · compiled in ${(window.__oglc.lastCompileMs / 1000).toFixed(1)} s` : '')); break;
    case 'frame': if (m.snap) { snap = m.snap; drawOverlay(); } window.__oglc.frames = m.n; break;
    case 'menus': menus = m; break;
    case 'exit':
      stopProgram();
      if (m.note) sys(m.note);
      sys(`Program finished (exit code ${m.code}).`, m.code === 0 ? 'ok' : 'warning');
      setStatus(m.code === 0 ? 'ok' : 'warn', `Program finished (exit code ${m.code})`);
      window.__oglc.lastExit = m.code;
      break;
    case 'runtime-error': {
      stopProgram();
      const box = document.createElement('div');
      box.className = 'box err';
      box.innerHTML = '<b>Runtime error</b> — your program compiled, but crashed while running.<div class="m"></div>';
      box.querySelector('.m').textContent = m.message + (m.functions && m.functions.length ? `\nIt happened in: ${m.functions.slice(0, 4).join(' ← ')}()` : '');
      box.querySelector('.m').style.whiteSpace = 'pre-wrap';
      outNode(box);
      if (m.raw && m.raw !== m.message) { const det = document.createElement('details'); det.className = 'raw'; det.innerHTML = '<summary>Technical details</summary><pre></pre>'; det.querySelector('pre').textContent = m.raw; outNode(det); }
      setStatus('error', 'Runtime error — see the Output panel');
      window.__oglc.lastRuntimeError = m.message;
      break;
    }
  }
}

function startProgram(wasm) {
  stopProgram();
  removeCanvas();
  snap = null; menus = { menus: {}, attached: {} };
  $('win-title').textContent = '';
  const canvas = document.createElement('canvas');
  canvas.className = 'gl';
  canvas.tabIndex = 0;
  canvas.width = 500; canvas.height = 500;
  canvas.setAttribute('aria-label', 'Graphics output of your program');
  $('canvas-box').insertBefore(canvas, $('blit'));
  $('placeholder').hidden = true;
  attachInput(canvas);
  buttons = 0;
  running = true;
  updateRunButton();
  window.__oglc.frames = 0;
  window.__oglc.lastExit = null;
  window.__oglc.lastRuntimeError = null;

  if (OFFSCREEN) {
    const worker = spareRunner || new Worker('js/runner-worker.js', { type: 'module' });
    spareRunner = null;
    setTimeout(prepareRunner, 800);
    runner = { worker, canvas };
    worker.onmessage = (e) => { if (runner && runner.worker === worker) { lastPong = performance.now(); handleRunnerMessage(e.data); } };
    worker.onerror = (e) => { if (runner && runner.worker === worker) handleRunnerMessage({ type: 'runtime-error', message: 'The program runner failed: ' + (e.message || 'unknown error'), functions: [] }); };
    const off = canvas.transferControlToOffscreen();
    worker.postMessage({ type: 'start', canvas: off, wasm, stdin: $('stdin').value }, [off, wasm.buffer]);
    lastPong = performance.now();
    pingTimer = setInterval(() => {
      if (!running) return;
      worker.postMessage({ type: 'ping', id: ++pingId });
      if (performance.now() - lastPong > WATCHDOG_MS) {
        stopProgram();
        const box = document.createElement('div');
        box.className = 'box err';
        box.innerHTML = '<b>Your program stopped responding and was stopped.</b><div>It was probably stuck in an infinite loop (for example <code>while (true) { … }</code> or a <code>for</code> loop that never ends). In GLUT programs, use <code>glutTimerFunc</code> or <code>glutIdleFunc</code> for animation instead of your own endless loop.</div>';
        outNode(box);
        setStatus('error', 'Stopped: the program was not responding (infinite loop?)');
        window.__oglc.lastRuntimeError = 'watchdog';
      }
    }, 1000);
  } else {
    // Fallback: run on the page itself (no protection against infinite loops).
    sys('Note: this browser cannot run programs in the background, so an infinite loop would freeze the page.', 'warning');
    import('./runtime/program.js').then(({ Program }) => {
      const post = (m) => { if (runner && runner.program === program) handleRunnerMessage(m); };
      let program;
      try {
        program = new Program({ canvas, post, stdin: $('stdin').value });
      } catch (err) { handleRunnerMessage({ type: 'runtime-error', message: String(err.message || err), functions: [] }); return; }
      runner = { program, canvas, mainGL: program.gl.gl };
      program.start(wasm).catch((err) => post({ type: 'runtime-error', message: String(err.message || err), functions: [] }));
    });
    runner = { canvas };
  }
}

// A runner worker is started in advance so that the next Run starts faster.
let spareRunner = null;
function prepareRunner() {
  if (!OFFSCREEN || spareRunner) return;
  try { spareRunner = new Worker('js/runner-worker.js', { type: 'module' }); } catch { spareRunner = null; }
}

function send(msg) {
  if (!running || !runner) return;
  if (runner.worker) runner.worker.postMessage(msg);
  else if (runner.program) runner.program.onEvent(msg);
}

async function run() {
  if (compiling) return;
  if (compilerFailed) { startCompiler(); }
  if (!compilerReady) {
    pendingRun = true; updateRunButton();
    setStatus('busy', 'Waiting for the compiler to finish loading…');
    return;
  }
  const source = cm.getValue();
  clearMarks();
  clearOutput();
  if (new Blob([source]).size > MAX_SOURCE) {
    sys(`Your program is larger than ${MAX_SOURCE / 1024} KB and cannot be compiled here.`, 'err');
    setStatus('error', 'Program too large');
    return;
  }
  if (!source.trim()) { sys('The editor is empty — there is nothing to compile.', 'err'); setStatus('error', 'Nothing to compile'); return; }
  stopProgram();
  compiling = true; updateRunButton();
  setStatus('busy', 'Compiling…');
  sys('Compiling main.cpp with Clang (C++17)…');
  compileStarted = performance.now();
  const res = await compile(source);
  compiling = false; updateRunButton();
  window.__oglc.lastCompile = { ok: res.ok, diagnostics: res.diagnostics };
  window.__oglc.lastCompileMs = res.ms;
  if (!res.ok) {
    if (res.internal) {
      sys('Internal compiler problem: ' + res.diagnostics, 'err');
      setStatus('error', 'Compiler problem — see Output');
      return;
    }
    const diags = parseDiagnostics(res.diagnostics || '');
    const n = diags.filter((d) => d.kind === 'error').length;
    sys(`Compilation failed${n ? ` with ${n} error${n > 1 ? 's' : ''}` : ''}. Fix the problem below and press Run again.`, 'err');
    showDiagnostics(diags, res.diagnostics);
    log.scrollTop = 0;
    setStatus('error', `Compilation failed${n ? `: ${n} error${n > 1 ? 's' : ''}` : ''}`);
    return;
  }
  const diags = parseDiagnostics(res.diagnostics || '');
  sys(`Compiled successfully in ${(res.ms / 1000).toFixed(1)} s${diags.length ? ` with ${diags.length} warning${diags.length > 1 ? 's' : ''}` : ''}. Running…`, 'ok');
  if (diags.length) showDiagnostics(diags, '');
  startProgram(res.wasm);
}

$('btn-run').addEventListener('click', () => run());
$('btn-stop').addEventListener('click', () => { stopProgram('Stopped by you.'); });
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
  else if (e.key === 'F5' && !e.ctrlKey) { e.preventDefault(); run(); }
  else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); download(); }
});

// ------------------------------------------------------------------ input to the program
const SPECIAL = {
  F1: 1, F2: 2, F3: 3, F4: 4, F5: 5, F6: 6, F7: 7, F8: 8, F9: 9, F10: 10, F11: 11, F12: 12,
  ArrowLeft: 100, ArrowUp: 101, ArrowRight: 102, ArrowDown: 103, PageUp: 104, PageDown: 105,
  Home: 106, End: 107, Insert: 108,
};
const SPECIAL_CODE = { ShiftLeft: 0x70, ShiftRight: 0x71, ControlLeft: 0x72, ControlRight: 0x73, AltLeft: 0x74, AltRight: 0x75 };
function mods(e) { return (e.shiftKey ? 1 : 0) | (e.ctrlKey ? 2 : 0) | (e.altKey ? 4 : 0); }
let mouseX = 0, mouseY = 0, buttons = 0;
function toCanvas(e, c) {
  const r = c.getBoundingClientRect();
  return [Math.floor((e.clientX - r.left) * canvasW / r.width), Math.floor((e.clientY - r.top) * canvasH / r.height)];
}
function attachInput(c) {
  c.addEventListener('contextmenu', (e) => e.preventDefault());
  c.addEventListener('mousedown', (e) => {
    c.focus();
    const [x, y] = toCanvas(e, c);
    const b = e.button === 1 ? 1 : e.button === 2 ? 2 : 0;
    if (menus.attached && menus.attached[b] && menus.menus[menus.attached[b]]) { e.preventDefault(); showMenu(menus.attached[b], e); return; }
    buttons |= (1 << b);
    send({ type: 'mouse', button: b, state: 0, x, y, mods: mods(e) });
  });
  c.addEventListener('mousemove', (e) => {
    const [x, y] = toCanvas(e, c);
    mouseX = x; mouseY = y;
    showMouse(x, y);
    send({ type: 'motion', x, y, pressed: buttons !== 0 });
  });
  c.addEventListener('mouseenter', () => send({ type: 'entry', state: 1 }));
  c.addEventListener('mouseleave', () => { send({ type: 'entry', state: 0 }); $('mouse-pos').textContent = 'Mouse: —'; });
  c.addEventListener('wheel', (e) => { e.preventDefault(); const [x, y] = toCanvas(e, c); send({ type: 'wheel', dir: e.deltaY < 0 ? 1 : -1, x, y, mods: mods(e) }); }, { passive: false });
  const key = (e, up) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === 's')) return; // page shortcuts
    let msg = null;
    if (SPECIAL[e.key] && !(e.key === 'F5' && !up)) msg = { special: true, key: SPECIAL[e.key] };
    else if (SPECIAL_CODE[e.code]) msg = { special: true, key: SPECIAL_CODE[e.code] };
    else if (e.key === 'Enter') msg = { key: 13 };
    else if (e.key === 'Escape') msg = { key: 27 };
    else if (e.key === 'Backspace') msg = { key: 8 };
    else if (e.key === 'Tab') msg = { key: 9 };
    else if (e.key === 'Delete') msg = { key: 127 };
    else if (e.key.length === 1) {
      let k = e.key.charCodeAt(0);
      if (e.ctrlKey && /[a-z]/i.test(e.key)) k = e.key.toUpperCase().charCodeAt(0) & 0x1f;
      if (k > 255) return;
      msg = { key: k };
    }
    if (!msg) return;
    e.preventDefault();
    send({ type: 'key', up, repeat: e.repeat, x: mouseX, y: mouseY, mods: mods(e), ...msg });
  };
  c.addEventListener('keydown', (e) => key(e, false));
  c.addEventListener('keyup', (e) => key(e, true));
  c.addEventListener('focus', () => { $('focus-hint').textContent = 'Keyboard input goes to your program'; });
  c.addEventListener('blur', () => { $('focus-hint').textContent = 'Click the picture to send keyboard input to your program'; });
}

// One page-wide listener, so that releasing the button outside the picture still reaches the program.
window.addEventListener('mouseup', (e) => {
  const c = runner && runner.canvas;
  if (!c) return;
  const b = e.button === 1 ? 1 : e.button === 2 ? 2 : 0;
  if (!(buttons & (1 << b))) return;
  buttons &= ~(1 << b);
  const [x, y] = toCanvas(e, c);
  send({ type: 'mouse', button: b, state: 1, x, y, mods: mods(e) });
});

// GLUT menus (glutCreateMenu / glutAttachMenu)
function hideMenu() { $('menu-popup').hidden = true; $('menu-popup').innerHTML = ''; }
function buildMenu(id, el) {
  for (const item of menus.menus[id] || []) {
    const b = document.createElement('button');
    b.className = 'mi' + (item.submenu ? ' sub' : '');
    b.textContent = item.label;
    if (item.submenu) {
      const sub = document.createElement('div'); sub.className = 'menu-popup'; sub.hidden = true;
      buildMenu(item.submenu, sub);
      b.addEventListener('mouseenter', () => { el.querySelectorAll(':scope > .menu-popup').forEach((s) => { s.hidden = true; }); sub.hidden = false; sub.style.top = (b.offsetTop - 4) + 'px'; });
      el.appendChild(b); el.appendChild(sub);
    } else {
      b.addEventListener('click', () => { hideMenu(); send({ type: 'menu', menu: id, value: item.value }); });
      b.addEventListener('mouseenter', () => { el.querySelectorAll(':scope > .menu-popup').forEach((s) => { s.hidden = true; }); });
      el.appendChild(b);
    }
  }
}
function showMenu(id, e) {
  const p = $('menu-popup'), st = $('stage').getBoundingClientRect();
  p.innerHTML = ''; buildMenu(id, p); p.hidden = false;
  p.style.left = Math.min(e.clientX - st.left, st.width - 180) + 'px';
  p.style.top = Math.min(e.clientY - st.top, st.height - p.offsetHeight - 4) + 'px';
  const first = p.querySelector('.mi'); if (first) first.focus();
}
document.addEventListener('mousedown', (e) => { if (!$('menu-popup').contains(e.target) && !(e.target.classList && e.target.classList.contains('gl'))) hideMenu(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('menu-popup').hidden) hideMenu(); });

// ------------------------------------------------------------------ viewport layout & overlay
let fitMode = store.get('fit', '1') === '1';
let showGrid = store.get('grid', '0') === '1';
let showAxes = store.get('axes', '0') === '1';
function syncViewButtons() {
  $('btn-zoom').textContent = fitMode ? 'Fit' : '100%';
  $('btn-zoom').title = fitMode ? 'Showing the picture scaled to fit. Click for actual pixel size.' : 'Showing actual pixel size. Click to fit the panel.';
  $('btn-grid').setAttribute('aria-pressed', String(showGrid));
  $('btn-axes').setAttribute('aria-pressed', String(showAxes));
  $('stage').classList.toggle('actual', !fitMode);
}
$('btn-zoom').addEventListener('click', () => { fitMode = !fitMode; store.set('fit', fitMode ? '1' : '0'); syncViewButtons(); layoutCanvas(); });
$('btn-resetview').addEventListener('click', () => { fitMode = true; store.set('fit', '1'); syncViewButtons(); layoutCanvas(); $('stage').scrollTo(0, 0); });
$('btn-grid').addEventListener('click', () => { showGrid = !showGrid; store.set('grid', showGrid ? '1' : '0'); syncViewButtons(); drawOverlay(); });
$('btn-axes').addEventListener('click', () => { showAxes = !showAxes; store.set('axes', showAxes ? '1' : '0'); syncViewButtons(); drawOverlay(); });

function layoutCanvas() {
  const st = $('stage'), box = $('canvas-box');
  const aw = Math.max(50, st.clientWidth - 32), ah = Math.max(50, st.clientHeight - 32);
  let w = canvasW, h = canvasH;
  if (fitMode) { const s = Math.min(aw / w, ah / h); w = Math.floor(w * s); h = Math.floor(h * s); }
  box.style.width = w + 'px'; box.style.height = h + 'px';
  drawOverlay();
}
new ResizeObserver(() => layoutCanvas()).observe($('stage'));

function niceStep(range) {
  const raw = range / 10, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
}
// mapping between world (glOrtho) coordinates and canvas pixels (origin bottom-left)
function mapping() {
  const P = snap ? snap.proj : [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const vp = snap ? snap.viewport : [0, 0, canvasW, canvasH];
  const ortho = Math.abs(P[3]) < 1e-9 && Math.abs(P[7]) < 1e-9 && Math.abs(P[11]) < 1e-9 && Math.abs(P[15] - 1) < 1e-9 &&
    Math.abs(P[1]) < 1e-9 && Math.abs(P[4]) < 1e-9 && P[0] !== 0 && P[5] !== 0;
  const Q = ortho ? P : [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  return {
    ortho,
    toPx: (x, y) => [vp[0] + ((Q[0] * x + Q[12]) + 1) / 2 * vp[2], vp[1] + ((Q[5] * y + Q[13]) + 1) / 2 * vp[3]],
    toWorld: (px, py) => [(((px - vp[0]) / vp[2]) * 2 - 1 - Q[12]) / Q[0], (((py - vp[1]) / vp[3]) * 2 - 1 - Q[13]) / Q[5]],
  };
}
function fmt(v, step) {
  if (Math.abs(v) < step * 1e-6) v = 0;
  const d = step >= 1 ? 0 : Math.min(6, Math.ceil(-Math.log10(step) - 1e-9));
  const s = v.toFixed(d);
  return s === '-0' ? '0' : s;
}
function drawOverlay() {
  const ov = $('overlay'), box = $('canvas-box');
  const w = box.clientWidth, h = box.clientHeight, dpr = window.devicePixelRatio || 1;
  ov.width = Math.max(1, Math.round(w * dpr)); ov.height = Math.max(1, Math.round(h * dpr));
  const ctx = ov.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (!(showGrid || showAxes) || !runner) return;
  const m = mapping();
  const sx = w / canvasW, sy = h / canvasH;
  const css = (x, y) => { const [px, py] = m.toPx(x, y); return [px * sx, h - py * sy]; };
  const [wx0, wy0] = m.toWorld(0, 0), [wx1, wy1] = m.toWorld(canvasW, canvasH);
  const xmin = Math.min(wx0, wx1), xmax = Math.max(wx0, wx1), ymin = Math.min(wy0, wy1), ymax = Math.max(wy0, wy1);
  if (!isFinite(xmin + xmax + ymin + ymax)) return;
  ctx.font = '10px ui-monospace, Consolas, monospace';
  ctx.lineJoin = 'round';
  const label = (t, x, y, align = 'left', base = 'top') => {
    ctx.textAlign = align; ctx.textBaseline = base;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(t, x, y);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillText(t, x, y);
  };
  if (showGrid) {
    const stx = niceStep(xmax - xmin), sty = niceStep(ymax - ymin);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(140,150,170,.32)';
    ctx.beginPath();
    for (let x = Math.ceil(xmin / stx) * stx; x <= xmax + 1e-9; x += stx) { const [cx] = css(x, 0); ctx.moveTo(Math.round(cx) + 0.5, 0); ctx.lineTo(Math.round(cx) + 0.5, h); }
    for (let y = Math.ceil(ymin / sty) * sty; y <= ymax + 1e-9; y += sty) { const [, cy] = css(0, y); ctx.moveTo(0, Math.round(cy) + 0.5); ctx.lineTo(w, Math.round(cy) + 0.5); }
    ctx.stroke();
    const every = w / ((xmax - xmin) / stx) < 34 ? 2 : 1;
    let i = 0;
    for (let x = Math.ceil(xmin / stx) * stx; x <= xmax + 1e-9; x += stx, i++) { if (i % every) continue; const [cx] = css(x, 0); label(fmt(x, stx), cx + 2, h - 13); }
    i = 0;
    for (let y = Math.ceil(ymin / sty) * sty; y <= ymax + 1e-9; y += sty, i++) { if (i % every) continue; const [, cy] = css(0, y); if (cy > h - 22 || cy < 12) continue; label(fmt(y, sty), 3, cy - 12); }
    if (!m.ortho) label('3D view: grid shows normalised device coordinates (-1…1)', w / 2, 4, 'center');
  }
  if (showAxes) {
    const [ox, oy] = css(0, 0);
    ctx.lineWidth = 2;
    const arrow = (x1, y1, x2, y2, col, name) => {
      ctx.strokeStyle = col; ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const a = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath(); ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 10 * Math.cos(a - 0.4), y2 - 10 * Math.sin(a - 0.4));
      ctx.lineTo(x2 - 10 * Math.cos(a + 0.4), y2 - 10 * Math.sin(a + 0.4)); ctx.fill();
      ctx.font = 'bold 12px ui-monospace, Consolas, monospace';
      label(name, x2 + (name === 'x' ? -14 : 6), y2 + (name === 'x' ? 6 : 2));
      ctx.font = '10px ui-monospace, Consolas, monospace';
    };
    if (oy >= 0 && oy <= h) arrow(0, oy, w - 2, oy, '#ff6b6b', 'x');
    if (ox >= 0 && ox <= w) arrow(ox, h, ox, 2, '#51cf66', 'y');
    if (ox >= 0 && ox <= w && oy >= 0 && oy <= h) label('(0, 0)', ox + 4, oy + 4);
  }
}
function showMouse(x, y) {
  const m = mapping();
  const py = canvasH - y; // OpenGL window coordinates count from the bottom
  if (m.ortho) {
    const [wx, wy] = m.toWorld(x + 0.5, py - 0.5);
    const d = Math.abs((mapping().toWorld(1, 0)[0] - mapping().toWorld(0, 0)[0])) < 0.05 ? 3 : 1;
    $('mouse-pos').textContent = `Mouse (GLUT): ${x}, ${y}   ·   OpenGL: ${wx.toFixed(d)}, ${wy.toFixed(d)}`;
  } else {
    $('mouse-pos').textContent = `Mouse (GLUT): ${x}, ${y}`;
  }
}

// ------------------------------------------------------------------ splitters
function dragSplit(handle, onMove) {
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    handle.classList.add('dragging');
    document.body.style.userSelect = 'none';
    const move = (ev) => onMove(ev);
    const up = () => { handle.classList.remove('dragging'); document.body.style.userSelect = ''; handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); cm.refresh(); layoutCanvas(); };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
  });
}
dragSplit($('splitter-v'), (e) => {
  const r = $('panes').getBoundingClientRect();
  const pct = Math.max(20, Math.min(80, (e.clientX - r.left) / r.width * 100));
  $('editor-pane').style.flexBasis = pct + '%';
  store.set('split', String(pct));
});
dragSplit($('splitter-h'), (e) => {
  const r = $('main').getBoundingClientRect();
  const hgt = Math.max(36, Math.min(r.height - 160, r.bottom - e.clientY));
  $('output').style.height = hgt + 'px';
  $('output').classList.toggle('collapsed', hgt <= 40);
  store.set('outh', String(hgt));
});
if (store.get('split')) $('editor-pane').style.flexBasis = store.get('split') + '%';
if (store.get('outh')) $('output').style.height = store.get('outh') + 'px';

// ------------------------------------------------------------------ toolbar actions
function toast(msg, ms = 2600) {
  const t = $('toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, ms);
}
function download() {
  const blob = new Blob([cm.getValue()], { type: 'text/x-c++src' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName();
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Downloaded ' + a.download);
}
$('btn-download').addEventListener('click', download);
$('btn-reset').addEventListener('click', () => {
  const code = current.code;
  if (cm.getValue() === code) { toast('The code is already the original example.'); return; }
  cm.replaceRange(code, { line: 0, ch: 0 }, { line: cm.lastLine(), ch: cm.getLine(cm.lastLine()).length });
  cm.setCursor({ line: 0, ch: 0 });
  toast('The original example is back. Press Ctrl+Z to undo.');
});
$('btn-open').addEventListener('click', () => $('file-input').click());
$('file-input').addEventListener('change', async () => {
  const f = $('file-input').files[0];
  $('file-input').value = '';
  if (!f) return;
  if (f.size > MAX_SOURCE) { toast('That file is too large.'); return; }
  const text = await f.text();
  cm.replaceRange(text, { line: 0, ch: 0 }, { line: cm.lastLine(), ch: cm.getLine(cm.lastLine()).length });
  toast(`Opened ${f.name}. Press Ctrl+Z to go back to the previous code.`);
});
$('btn-theme').addEventListener('click', () => {
  const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  store.set('theme', t);
});

// share links: #code=<base64url(deflate(source))>
const b64u = (bytes) => { let s = ''; bytes.forEach((b) => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
async function encodeCode(src) {
  const bytes = new TextEncoder().encode(src);
  if (typeof CompressionStream === 'undefined') return 'b' + b64u(bytes);
  const z = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
  return 'z' + b64u(z);
}
async function decodeCode(s) {
  const bytes = unb64u(s.slice(1));
  if (s[0] === 'b') return new TextDecoder().decode(bytes);
  const out = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer();
  return new TextDecoder().decode(out);
}
$('btn-share').addEventListener('click', async () => {
  const url = location.href.split('#')[0] + '#code=' + await encodeCode(cm.getValue());
  try { await navigator.clipboard.writeText(url); toast('Link copied! Anyone who opens it will see this code.'); }
  catch { sys('Share this link (it contains your code):'); sys(url, 'stdout'); toast('Copy the link from the Output panel.'); }
});

// ------------------------------------------------------------------ start up
window.__oglc = { frames: 0, run, get code() { return cm.getValue(); }, set code(v) { cm.setValue(v); }, openLesson: (id) => openLesson(byId[id]), original: (id) => byId[id] && byId[id].code, lessons: ALL.map((l) => l.id), get running() { return running; }, get compiling() { return compiling; } };
syncViewButtons();
$('canvas-size').textContent = '500 × 500';

(async () => {
  const hash = location.hash.match(/#code=([\w-]+)/);
  if (hash) {
    try {
      const code = await decodeCode(hash[1]);
      const shared = { id: 'shared', group: 'Shared', title: 'Shared code', code };
      byId.shared = shared;
      docs.set('shared', CodeMirror.Doc(code, 'text/x-c++src'));
      openLesson(shared);
      showLessonView(false);
      toast('Loaded code from a shared link.');
      history.replaceState(null, '', location.pathname + location.search);
      return;
    } catch { toast('The shared link could not be read.'); }
  }
  openLesson(current);
  showLessonView(current.id !== 'blank');
})();
renderLessonList();
layoutCanvas();
startCompiler();
updateRunButton();
