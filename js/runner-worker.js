// Runs one compiled student program in its own Web Worker.
// The page terminates this worker to stop the program (Stop button,
// re-run, or an infinite loop), which frees all of its memory, timers and
// its WebGL context at once.
import { Program } from './runtime/program.js';

let program = null;
const post = (m) => self.postMessage(m);

self.onmessage = async (e) => {
  const msg = e.data;
  if (msg.type === 'start') {
    try {
      program = new Program({ canvas: msg.canvas, post, stdin: msg.stdin || '' });
      await program.start(msg.wasm);
    } catch (err) {
      post({ type: 'runtime-error', message: String(err && err.message || err), raw: String(err && err.stack || err), functions: [] });
    }
  } else if (msg.type === 'ping') {
    post({ type: 'pong', id: msg.id });
  } else if (program) {
    program.onEvent(msg);
  }
};
post({ type: 'ready' });
