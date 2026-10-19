// Compiles C++ to WebAssembly inside the browser using Clang/LLD
// (LLVM compiled to WebAssembly by the YoWASP project).
// Nothing is sent to a server: the compiler itself runs in this worker.
import { COMPILE_FLAGS, LINK_FLAGS, PCH_TRIGGER } from './compile-flags.js';
import { BUILD } from './build-info.js';

const BASE = new URL('../', import.meta.url);
const CLANG_DIR = new URL('vendor/yowasp-clang/', BASE);
const CACHE_NAME = `oglc-${BUILD.clang}-${BUILD.pch}`;

let runClang = null;
let headers = null;
let loading = null;
const post = (m, transfer) => self.postMessage(m, transfer || []);

// The large compiler files are stored gzip-compressed (~27 MB instead of
// ~105 MB) and cached in the browser after the first visit. We intercept the
// compiler's own fetch() calls and transparently decompress.
const realFetch = self.fetch.bind(self);
// Remove caches left by older versions of the site.
(async () => {
  try { for (const k of await caches.keys()) if (k.startsWith('oglc-') && k !== CACHE_NAME) await caches.delete(k); } catch { /* ignore */ }
})();

// GitHub Pages serves .gz files as they are; if a server decompresses them
// on the fly instead, the data arrives uncompressed and is passed through.
async function gunzipIfNeeded(stream) {
  const [peek, body] = stream.tee();
  const reader = peek.getReader();
  const { value } = await reader.read();
  reader.cancel().catch(() => {});
  const isGzip = value && value[0] === 0x1f && value[1] === 0x8b;
  return isGzip ? body.pipeThrough(new DecompressionStream('gzip')) : body;
}

async function cachedFetch(url) {
  let cache = null;
  try { cache = await caches.open(CACHE_NAME); } catch { /* Cache API unavailable */ }
  if (cache) {
    const hit = await cache.match(url);
    if (hit) return hit;
  }
  const resp = await realFetch(url);
  if (resp.ok && cache) { try { await cache.put(url, resp.clone()); } catch { /* quota */ } }
  return resp;
}
self.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : (input.url || String(input));
  if (url.startsWith(CLANG_DIR.href) && /\.(wasm|tar)$/.test(url) && typeof DecompressionStream !== 'undefined') {
    const gz = await cachedFetch(url + '.gz');
    if (gz.ok) {
      const body = await gunzipIfNeeded(gz.body);
      const type = url.endsWith('.wasm') ? 'application/wasm' : 'application/x-tar';
      return new Response(body, { status: 200, headers: { 'content-type': type } });
    }
    return cachedFetch(url);
  }
  return realFetch(input, init);
};

async function load() {
  if (loading) return loading;
  loading = (async () => {
    const t0 = performance.now();
    post({ type: 'progress', phase: 'download', done: 0, total: 1 });
    const [mod, hdr] = await Promise.all([
      import(new URL('bundle.js', CLANG_DIR).href),
      realFetch(new URL('sysroot/headers.json', BASE)).then((r) => {
        if (!r.ok) throw new Error('Could not load the OpenGL headers (sysroot/headers.json).');
        return r.json();
      }),
    ]);
    runClang = mod.runClang;
    headers = hdr;
    let last = 0;
    await runClang(null, {}, {
      fetchProgress: ({ totalLength, doneLength }) => {
        const now = performance.now();
        if (now - last > 100 || doneLength >= totalLength) { last = now; post({ type: 'progress', phase: 'download', done: doneLength, total: totalLength }); }
      },
    });
    post({ type: 'progress', phase: 'warmup' });
    // Warm up: the first compile initialises the compiler (and checks it works).
    await runClang(['clang++', '-c', 'warm.cpp', '-o', 'warm.o'], { 'warm.cpp': 'int main(){return 0;}' }, { stdout: () => {}, stderr: () => {} });
    post({ type: 'ready', ms: Math.round(performance.now() - t0) });
  })();
  loading.catch((e) => { loading = null; post({ type: 'load-error', message: String(e && e.message || e) }); });
  return loading;
}



// Precompiled header for <iostream>/<string>/<vector> (downloaded only when needed).
let pch = null;
async function loadPch() {
  if (pch) return pch;
  try {
    const [bin, text] = await Promise.all([
      cachedFetch(new URL(`sysroot/prelude.h.pch.gz?v=${BUILD.pch}`, BASE).href).then(async (r) => {
        if (!r.ok) throw new Error('no pch');
        return new Uint8Array(await new Response(await gunzipIfNeeded(r.body)).arrayBuffer());
      }),
      realFetch(new URL('sysroot/prelude.h', BASE)).then((r) => r.text()),
    ]);
    pch = { bin, text };
  } catch { pch = false; }
  return pch;
}

async function runCompiler(source, usePch) {
  let stderr = '';
  const dec = new TextDecoder();
  const capture = (b) => { if (b) stderr += dec.decode(b, { stream: true }); };
  const files = { 'main.cpp': source, include: headers };
  const extra = [];
  if (usePch) {
    files['prelude.h'] = usePch.text;
    files['prelude.h.pch'] = usePch.bin;
    extra.push('-include-pch', 'prelude.h.pch', '-Xclang', '-fno-validate-pch');
  }
  try {
    const out = await runClang(['clang++', ...COMPILE_FLAGS, ...extra, 'main.cpp', '-o', 'program.wasm', ...LINK_FLAGS],
      files, { stdout: capture, stderr: capture });
    return { out, stderr };
  } catch (e) {
    e.stderr = stderr;
    throw e;
  }
}

async function compile(id, source) {
  await load();
  const t0 = performance.now();
  let stderr = '';
  try {
    let usePch = PCH_TRIGGER.test(source) && typeof DecompressionStream !== 'undefined' ? await loadPch() : null;
    let res;
    try {
      res = await runCompiler(source, usePch);
    } catch (e) {
      // If the precompiled header itself is the problem, compile normally.
      if (usePch && /precompiled|\.pch|AST file/i.test(e.stderr || '')) { pch = false; usePch = null; res = await runCompiler(source, null); }
      else throw e;
    }
    stderr = res.stderr;
    const out = res.out;
    const wasm = out['program.wasm'];
    if (!(wasm instanceof Uint8Array)) throw new Error('The compiler did not produce a program.');
    post({ type: 'compiled', id, ok: true, wasm, diagnostics: stderr, ms: Math.round(performance.now() - t0) }, [wasm.buffer]);
  } catch (e) {
    stderr = e.stderr || stderr;
    const isExit = e && typeof e.code === 'number';
    post({
      type: 'compiled', id, ok: false,
      diagnostics: stderr || (isExit ? '' : String(e && e.message || e)),
      internal: !isExit,
      ms: Math.round(performance.now() - t0),
    });
  }
}

self.onmessage = (e) => {
  const m = e.data;
  if (m.type === 'load') load();
  else if (m.type === 'compile') compile(m.id, m.source);
};
