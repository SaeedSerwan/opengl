// Program — loads a compiled student program (WebAssembly), connects it to
// WASI, the LegacyGL implementation and the GLUT event loop, and runs it.
//
// Works both inside a Web Worker (with an OffscreenCanvas; the normal mode)
// and on the main thread (fallback for browsers without OffscreenCanvas).

import { createWasi, ExitStatus } from './wasi.js';
import { LegacyGL, GLC } from './legacygl.js';
import './shapes.js';

const MAIN_LOOP = Symbol('glutMainLoop');
class LeaveMainLoop extends Error {}

const RAF = typeof requestAnimationFrame === 'function'
  ? (f) => requestAnimationFrame(f)
  : (f) => setTimeout(() => f(performance.now()), 16);

export function demangle(name) {
  // Minimal Itanium demangler for function names in stack traces: _Z7displayv -> display
  if (!name.startsWith('_Z')) return name;
  let i = 2;
  const readName = () => {
    let n = 0;
    while (i < name.length && name[i] >= '0' && name[i] <= '9') n = n * 10 + (name.charCodeAt(i++) - 48);
    const s = name.substr(i, n); i += n; return s;
  };
  if (name[i] === 'N') {
    i++; const parts = [];
    while (i < name.length && name[i] !== 'E') {
      if (name[i] >= '0' && name[i] <= '9') parts.push(readName()); else i++;
    }
    return parts.join('::') || name;
  }
  if (name[i] >= '0' && name[i] <= '9') return readName();
  return name;
}

export function explainTrap(err) {
  const m = String(err && err.message || err);
  if (/out of bounds|index out of bounds|offset is out of bounds/i.test(m))
    return 'Memory access out of bounds — the program read or wrote memory it does not own. Usually an array index past the end of the array, or an uninitialised / null pointer.';
  if (/unreachable/i.test(m))
    return 'The program stopped at an "unreachable" point. Common causes: a function that should return a value reached its end without "return", a failed assert(), or abort().';
  if (/divi(de|sion) by zero|remainder by zero/i.test(m))
    return 'Integer division by zero (x / 0 or x % 0 with whole numbers).';
  if (/call stack|too much recursion|stack size/i.test(m))
    return 'Stack overflow — probably a function that calls itself forever (infinite recursion), or a very large local array.';
  if (/signature mismatch|function signature/i.test(m))
    return 'A function was called through a pointer of the wrong type (check the parameters of your callback functions).';
  if (/float unrepresentable|integer overflow|invalid conversion/i.test(m))
    return 'A floating-point number was too large (or NaN) to convert to an integer.';
  if (/memory/i.test(m)) return 'The program ran out of memory.';
  return m;
}

export function functionsFromStack(err) {
  const out = [];
  const stack = String(err && err.stack || '');
  for (const line of stack.split('\n')) {
    // Chrome: "at display (wasm://wasm/xyz:wasm-function[12]:0x1a)"; Firefox: "display@wasm://..."
    let m = line.match(/at (?:.*\.)?([\w$]+) \(wasm:/) || line.match(/^\s*([\w$]+)@.*wasm-function/) || line.match(/\$([\w$]+)@/);
    if (m) {
      const n = demangle(m[1]);
      if (!/^(__|_start|__original_main|main\.command_export)/.test(n) && !out.includes(n)) out.push(n);
    }
  }
  return out;
}

export class Program {
  /**
   * @param {object} o
   * @param {OffscreenCanvas|HTMLCanvasElement} o.canvas
   * @param {(msg:object)=>void} o.post  sends messages to the page
   * @param {string} o.stdin
   */
  constructor({ canvas, post, stdin = '' }) {
    this.canvas = canvas;
    this.post = post;
    this.stdin = stdin;
    this.cb = {};
    this.state = 'loading';
    this.redisplay = false;
    this.frameScheduled = false;
    this.timers = new Set();
    this.mods = 0;
    this.menus = new Map();
    this.curMenu = 0;
    this.nextMenu = 1;
    this.attached = {};
    this.ignoreRepeat = false;
    this.startTime = performance.now();
    this.decoders = [null, new TextDecoder(), new TextDecoder()];
    this.outBuf = '';
    this.outBytes = 0;
    this.outTimer = 0;
    this.lastSnap = '';
    this.frames = 0;
    this.windowCreated = false;
    canvas.width = 500; canvas.height = 500;
    this.gl = new LegacyGL(canvas, {
      warn: (m) => this.emit('warning', m + '\n'),
    });
  }

  // ---------- output ----------
  emit(stream, text) {
    if (this.outBytes > 2_000_000) return;
    this.outBytes += text.length;
    if (this.outBytes > 2_000_000) text += '\n[Output limit reached: further output from the program is not shown.]\n';
    if (stream === 'stdout') {
      this.outBuf += text;
      if (!this.outTimer) this.outTimer = setTimeout(() => this.flushOut(), 50);
    } else {
      this.flushOut();
      this.post({ type: 'output', stream, text });
    }
  }
  flushOut() {
    if (this.outTimer) { clearTimeout(this.outTimer); this.outTimer = 0; }
    if (this.outBuf) { this.post({ type: 'output', stream: 'stdout', text: this.outBuf }); this.outBuf = ''; }
  }
  write(fd, bytes) {
    const text = this.decoders[fd === 2 ? 2 : 1].decode(bytes, { stream: true });
    this.emit(fd === 2 ? 'stderr' : 'stdout', text);
  }

  // ---------- memory helpers ----------
  get mem() { return this.instance.exports.memory; }
  dv() { return new DataView(this.mem.buffer); }
  f32(p, n) { const d = this.dv(); return Array.from({ length: n }, (_, i) => d.getFloat32(p + i * 4, true)); }
  f64(p, n) { const d = this.dv(); return Array.from({ length: n }, (_, i) => d.getFloat64(p + i * 8, true)); }
  i32(p, n) { const d = this.dv(); return Array.from({ length: n }, (_, i) => d.getInt32(p + i * 4, true)); }
  u8(p, n) { return Array.from(new Uint8Array(this.mem.buffer, p, n)); }
  str(p) {
    if (!p) return '';
    const b = new Uint8Array(this.mem.buffer);
    let e = p; while (e < b.length && b[e] !== 0) e++;
    return new TextDecoder().decode(b.subarray(p, e));
  }
  fn(idx) {
    if (!idx) return null;
    const f = this.instance.exports.__indirect_function_table.get(idx);
    return f || null;
  }

  // ---------- imports ----------
  buildGLImports(module) {
    const g = this.gl;
    const d = (name, ...args) => g.dispatch(name, args);
    const ub = (x) => (x & 255) / 255;
    const glImports = {
      glBegin: (m) => d('glBegin', m),
      glEnd: () => d('glEnd'),
      glVertex2f: (x, y) => d('glVertex4f', x, y, 0, 1),
      glVertex2d: (x, y) => d('glVertex4f', x, y, 0, 1),
      glVertex2i: (x, y) => d('glVertex4f', x, y, 0, 1),
      glVertex2s: (x, y) => d('glVertex4f', x, y, 0, 1),
      glVertex3f: (x, y, z) => d('glVertex4f', x, y, z, 1),
      glVertex3d: (x, y, z) => d('glVertex4f', x, y, z, 1),
      glVertex3i: (x, y, z) => d('glVertex4f', x, y, z, 1),
      glVertex3s: (x, y, z) => d('glVertex4f', x, y, z, 1),
      glVertex4f: (x, y, z, w) => d('glVertex4f', x, y, z, w),
      glVertex4d: (x, y, z, w) => d('glVertex4f', x, y, z, w),
      glVertex4i: (x, y, z, w) => d('glVertex4f', x, y, z, w),
      glVertex2fv: (p) => d('glVertex4f', ...this.f32(p, 2), 0, 1),
      glVertex2dv: (p) => d('glVertex4f', ...this.f64(p, 2), 0, 1),
      glVertex2iv: (p) => d('glVertex4f', ...this.i32(p, 2), 0, 1),
      glVertex3fv: (p) => d('glVertex4f', ...this.f32(p, 3), 1),
      glVertex3dv: (p) => d('glVertex4f', ...this.f64(p, 3), 1),
      glVertex3iv: (p) => d('glVertex4f', ...this.i32(p, 3), 1),
      glVertex4fv: (p) => d('glVertex4f', ...this.f32(p, 4)),

      glColor3f: (r, gg, b) => d('glColor4f', r, gg, b, 1),
      glColor3d: (r, gg, b) => d('glColor4f', r, gg, b, 1),
      glColor3ub: (r, gg, b) => d('glColor4f', ub(r), ub(gg), ub(b), 1),
      glColor3i: (r, gg, b) => d('glColor4f', Math.max(0, r / 2147483647), Math.max(0, gg / 2147483647), Math.max(0, b / 2147483647), 1),
      glColor4f: (r, gg, b, a) => d('glColor4f', r, gg, b, a),
      glColor4d: (r, gg, b, a) => d('glColor4f', r, gg, b, a),
      glColor4ub: (r, gg, b, a) => d('glColor4f', ub(r), ub(gg), ub(b), ub(a)),
      glColor3fv: (p) => d('glColor4f', ...this.f32(p, 3), 1),
      glColor3dv: (p) => d('glColor4f', ...this.f64(p, 3), 1),
      glColor3ubv: (p) => d('glColor4f', ...this.u8(p, 3).map(ub), 1),
      glColor4fv: (p) => d('glColor4f', ...this.f32(p, 4)),
      glColor4dv: (p) => d('glColor4f', ...this.f64(p, 4)),
      glColor4ubv: (p) => d('glColor4f', ...this.u8(p, 4).map(ub)),

      glNormal3f: (x, y, z) => d('glNormal3f', x, y, z),
      glNormal3d: (x, y, z) => d('glNormal3f', x, y, z),
      glNormal3fv: (p) => d('glNormal3f', ...this.f32(p, 3)),
      glNormal3dv: (p) => d('glNormal3f', ...this.f64(p, 3)),

      glRectf: (a, b, c, e) => d('glRectf', a, b, c, e),
      glRectd: (a, b, c, e) => d('glRectf', a, b, c, e),
      glRecti: (a, b, c, e) => d('glRectf', a, b, c, e),
      glRects: (a, b, c, e) => d('glRectf', a, b, c, e),

      glClear: (m) => d('glClear', m),
      glClearColor: (r, gg, b, a) => d('glClearColor', r, gg, b, a),
      glClearDepth: (x) => d('glClearDepth', x),
      glFlush: () => {},
      glFinish: () => {},
      glColorMask: (r, gg, b, a) => d('glColorMask', r, gg, b, a),
      glDepthMask: (f) => d('glDepthMask', f),
      glDepthFunc: (f) => d('glDepthFunc', f),
      glBlendFunc: (s, t) => d('glBlendFunc', s, t),
      glViewport: (x, y, w, h) => d('glViewport', x, y, w, h),
      glScissor: (x, y, w, h) => d('glScissor', x, y, w, h),

      glMatrixMode: (m) => d('glMatrixMode', m),
      glLoadIdentity: () => d('glLoadIdentity'),
      glPushMatrix: () => d('glPushMatrix'),
      glPopMatrix: () => d('glPopMatrix'),
      glTranslatef: (x, y, z) => d('glTranslatef', x, y, z),
      glTranslated: (x, y, z) => d('glTranslatef', x, y, z),
      glRotatef: (a, x, y, z) => d('glRotatef', a, x, y, z),
      glRotated: (a, x, y, z) => d('glRotatef', a, x, y, z),
      glScalef: (x, y, z) => d('glScalef', x, y, z),
      glScaled: (x, y, z) => d('glScalef', x, y, z),
      glOrtho: (...a) => d('glOrtho', ...a),
      glFrustum: (...a) => d('glFrustum', ...a),
      glLoadMatrixf: (p) => d('glLoadMatrix', this.f32(p, 16)),
      glLoadMatrixd: (p) => d('glLoadMatrix', this.f64(p, 16)),
      glMultMatrixf: (p) => d('glMultMatrix', this.f32(p, 16)),
      glMultMatrixd: (p) => d('glMultMatrix', this.f64(p, 16)),
      gluOrtho2D: (...a) => d('gluOrtho2D', ...a),
      gluPerspective: (...a) => d('gluPerspective', ...a),
      gluLookAt: (...a) => d('gluLookAt', ...a),

      glEnable: (c) => d('glEnable', c),
      glDisable: (c) => d('glDisable', c),
      glIsEnabled: (c) => g.glIsEnabled(c),
      glPointSize: (s) => d('glPointSize', s),
      glLineWidth: (w) => d('glLineWidth', w),
      glLineStipple: (f, p) => d('glLineStipple', f, p),
      glPolygonMode: (f, m) => d('glPolygonMode', f, m),
      glShadeModel: (m) => d('glShadeModel', m),
      glCullFace: (m) => d('glCullFace', m),
      glFrontFace: (m) => d('glFrontFace', m),
      glHint: () => {},
      glPushAttrib: (m) => d('glPushAttrib', m),
      glPopAttrib: () => d('glPopAttrib'),
      glPolygonOffset: (f, u) => d('glPolygonOffset', f, u),
      glGetError: () => g.glGetError(),
      glGetFloatv: (pn, p) => { const v = g.getValues(pn), dv = this.dv(); v.forEach((x, i) => dv.setFloat32(p + i * 4, x, true)); },
      glGetDoublev: (pn, p) => { const v = g.getValues(pn), dv = this.dv(); v.forEach((x, i) => dv.setFloat64(p + i * 8, x, true)); },
      glGetIntegerv: (pn, p) => { const v = g.getValues(pn), dv = this.dv(); v.forEach((x, i) => dv.setInt32(p + i * 4, Math.round(x), true)); },
      glGetBooleanv: (pn, p) => { const v = g.getValues(pn), dv = this.dv(); v.forEach((x, i) => dv.setUint8(p + i, x ? 1 : 0)); },

      glLightf: (l, pn, v) => d('glLightfv', l, pn, [v]),
      glLighti: (l, pn, v) => d('glLightfv', l, pn, [v]),
      glLightfv: (l, pn, p) => d('glLightfv', l, pn, this.f32(p, pn === GLC.SPOT_DIRECTION ? 3 : pn >= 0x1205 ? 1 : 4)),
      glLightiv: (l, pn, p) => d('glLightfv', l, pn, this.i32(p, pn === GLC.SPOT_DIRECTION ? 3 : pn >= 0x1205 ? 1 : 4)),
      glLightModelf: (pn, v) => d('glLightModelfv', pn, [v]),
      glLightModeli: (pn, v) => d('glLightModelfv', pn, [v]),
      glLightModelfv: (pn, p) => d('glLightModelfv', pn, this.f32(p, pn === GLC.LIGHT_MODEL_AMBIENT ? 4 : 1)),
      glMaterialf: (f, pn, v) => d('glMaterialfv', f, pn, [v]),
      glMateriali: (f, pn, v) => d('glMaterialfv', f, pn, [v]),
      glMaterialfv: (f, pn, p) => d('glMaterialfv', f, pn, this.f32(p, pn === GLC.SHININESS ? 1 : 4)),
      glMaterialiv: (f, pn, p) => d('glMaterialfv', f, pn, this.i32(p, pn === GLC.SHININESS ? 1 : 4)),
      glColorMaterial: (f, m) => d('glColorMaterial', f, m),

      glRasterPos2f: (x, y) => d('glRasterPos4f', x, y, 0, 1),
      glRasterPos2d: (x, y) => d('glRasterPos4f', x, y, 0, 1),
      glRasterPos2i: (x, y) => d('glRasterPos4f', x, y, 0, 1),
      glRasterPos3f: (x, y, z) => d('glRasterPos4f', x, y, z, 1),
      glRasterPos3d: (x, y, z) => d('glRasterPos4f', x, y, z, 1),
      glRasterPos3i: (x, y, z) => d('glRasterPos4f', x, y, z, 1),
      glWindowPos2i: (x, y) => d('glWindowPos2f', x, y),
      glWindowPos2f: (x, y) => d('glWindowPos2f', x, y),

      glGenLists: (n) => g.glGenLists(n),
      glNewList: (id, m) => g.glNewList(id, m),
      glEndList: () => g.glEndList(),
      glCallList: (id) => d('glCallList', id),
      glDeleteLists: (id, n) => g.glDeleteLists(id, n),
      glIsList: (id) => g.glIsList(id),

      // ---- GLU quadrics ----
      gluNewQuadric: () => g.gluNewQuadric(),
      gluDeleteQuadric: (q) => g.gluDeleteQuadric(q),
      gluQuadricDrawStyle: (q, s) => g.gluQuadricDrawStyle(q, s),
      gluQuadricNormals: () => {},
      gluQuadricOrientation: () => {},
      gluQuadricTexture: () => {},
      gluSphere: (q, r, a, b) => d('gluSphere', q, r, a, b),
      gluCylinder: (q, b, t, h, s, st) => d('gluCylinder', q, b, t, h, s, st),
      gluDisk: (q, i, o, s, l) => d('gluDisk', q, i, o, s, l),
      gluPartialDisk: (q, i, o, s, l, st, sw) => d('gluPartialDisk', q, i, o, s, l, st, sw),
    };

    // ---- GLUT shapes and text (recorded into display lists like GL calls) ----
    for (const n of ['glutWireCube', 'glutSolidCube', 'glutWireSphere', 'glutSolidSphere', 'glutWireCone', 'glutSolidCone',
      'glutWireTorus', 'glutSolidTorus', 'glutWireTeapot', 'glutSolidTeapot', 'glutWireTetrahedron', 'glutSolidTetrahedron',
      'glutWireOctahedron', 'glutSolidOctahedron', 'glutWireIcosahedron', 'glutSolidIcosahedron', 'glutWireCylinder', 'glutSolidCylinder']) {
      glImports[n] = (...a) => d(n, ...a);
    }
    glImports.glutBitmapCharacter = (f, c) => d('glutBitmapCharacter', f, c);
    glImports.glutBitmapString = (f, p) => d('glutBitmapString', f, this.str(p));
    glImports.glutBitmapWidth = (f, c) => g.bitmapWidth(f, c);
    glImports.glutBitmapLength = (f, p) => [...this.str(p)].reduce((n, ch) => n + g.bitmapWidth(f, ch.charCodeAt(0)), 0);
    glImports.glutBitmapHeight = (f) => g.bitmapHeight(f);
    glImports.glutStrokeCharacter = (f, c) => d('glutStrokeCharacter', f, c);
    glImports.glutStrokeString = (f, p) => d('glutStrokeString', f, this.str(p));
    glImports.glutStrokeWidth = (f, c) => Math.round(g.strokeWidth(f, c));

    Object.assign(glImports, this.glutImports());

    // ---- explicitly unsupported functions ----
    const unsupported = {
      glGenTextures: 'Texture mapping is not available.', glBindTexture: '', glDeleteTextures: '', glTexImage2D: '',
      glTexParameteri: '', glTexParameterf: '', glTexEnvi: '', glTexEnvf: '', glTexCoord2f: '', glTexCoord2d: '',
      glFogf: 'Fog is not available.', glFogi: '', glFogfv: '', glPixelStorei: '', glReadPixels: '', glDrawPixels: '',
      glPolygonStipple: '', glutStrokeCharacter_: '',
    };
    for (const [n, hint] of Object.entries(unsupported)) if (!glImports[n]) glImports[n] = () => { g.unsupported(n, hint); return 0; };

    // Any import the program needs that we do not know about.
    for (const imp of WebAssembly.Module.imports(module)) {
      if (imp.module === 'gl' && imp.kind === 'function' && !glImports[imp.name]) {
        glImports[imp.name] = () => { g.unsupported(imp.name); return 0; };
      }
    }
    return glImports;
  }

  glutImports() {
    const g = this.gl;
    const setCb = (name) => (idx) => { this.cb[name] = idx ? this.fn(idx) : null; if (name === 'idle') this.schedule(); };
    return {
      glutInit: () => { this.startTime = performance.now(); },
      glutInitDisplayMode: () => {},
      glutInitWindowSize: (w, h) => this.resize(w, h),
      glutInitWindowPosition: () => {},
      glutCreateWindow: (p) => {
        if (this.windowCreated) { g.warnOnce('2win', 'Only one window is supported; glutCreateWindow() was called again and the same window is reused.'); }
        this.windowCreated = true;
        this.post({ type: 'title', title: this.str(p) });
        return 1;
      },
      glutDestroyWindow: () => { throw new LeaveMainLoop(); },
      glutSetWindowTitle: (p) => this.post({ type: 'title', title: this.str(p) }),
      glutReshapeWindow: (w, h) => { this.resize(w, h); if (this.state === 'running') this.callReshape(); },
      glutPositionWindow: () => {},
      glutFullScreen: () => { g.warnOnce('fs', 'glutFullScreen() is ignored; use the "Fit" button above the canvas to enlarge the view.'); },
      glutSetCursor: () => {},
      glutGetWindow: () => 1,
      glutSetWindow: () => {},
      glutMainLoop: () => {
        if (this.state === 'running') { g.warnOnce('ml2', 'glutMainLoop() was called again from inside a callback; ignored.'); return; }
        throw MAIN_LOOP;
      },
      glutLeaveMainLoop: () => { throw new LeaveMainLoop(); },
      glutPostRedisplay: () => { this.redisplay = true; this.schedule(); },
      glutSwapBuffers: () => {},
      glutDisplayFunc: setCb('display'),
      glutReshapeFunc: setCb('reshape'),
      glutKeyboardFunc: setCb('keyboard'),
      glutKeyboardUpFunc: setCb('keyboardUp'),
      glutSpecialFunc: setCb('special'),
      glutSpecialUpFunc: setCb('specialUp'),
      glutMouseFunc: setCb('mouse'),
      glutMotionFunc: setCb('motion'),
      glutPassiveMotionFunc: setCb('passive'),
      glutMouseWheelFunc: setCb('wheel'),
      glutEntryFunc: setCb('entry'),
      glutIdleFunc: setCb('idle'),
      glutVisibilityFunc: () => {},
      glutCloseFunc: setCb('close'),
      glutTimerFunc: (ms, idx, value) => {
        const f = this.fn(idx);
        if (!f) return;
        const id = setTimeout(() => { this.timers.delete(id); this.invoke(f, value); }, Math.max(0, ms));
        this.timers.add(id);
      },
      glutGet: (q) => {
        switch (q) {
          case 100: case 101: return 0;
          case 102: case 502: return this.canvas.width;
          case 103: case 503: return this.canvas.height;
          case 200: return 1920;
          case 201: return 1080;
          case 115: return 1;
          case 116: return 1;
          case 700: return Math.floor(performance.now() - this.startTime);
          default: return 0;
        }
      },
      glutGetModifiers: () => this.mods,
      glutIgnoreKeyRepeat: (v) => { this.ignoreRepeat = !!v; },

      glutCreateMenu: (idx) => { const id = this.nextMenu++; this.menus.set(id, { cb: this.fn(idx), items: [] }); this.curMenu = id; this.sendMenus(); return id; },
      glutSetMenu: (id) => { if (this.menus.has(id)) this.curMenu = id; },
      glutGetMenu: () => this.curMenu,
      glutDestroyMenu: (id) => { this.menus.delete(id); this.sendMenus(); },
      glutAddMenuEntry: (p, value) => { const m = this.menus.get(this.curMenu); if (m) { m.items.push({ label: this.str(p), value }); this.sendMenus(); } },
      glutAddSubMenu: (p, sub) => { const m = this.menus.get(this.curMenu); if (m) { m.items.push({ label: this.str(p), submenu: sub }); this.sendMenus(); } },
      glutChangeToMenuEntry: (item, p, value) => { const m = this.menus.get(this.curMenu); if (m && m.items[item - 1]) { m.items[item - 1] = { label: this.str(p), value }; this.sendMenus(); } },
      glutRemoveMenuItem: (item) => { const m = this.menus.get(this.curMenu); if (m) { m.items.splice(item - 1, 1); this.sendMenus(); } },
      glutAttachMenu: (button) => { this.attached[button] = this.curMenu; this.sendMenus(); },
      glutDetachMenu: (button) => { delete this.attached[button]; this.sendMenus(); },
    };
  }

  sendMenus() {
    const menus = {};
    for (const [id, m] of this.menus) menus[id] = m.items;
    this.post({ type: 'menus', menus, attached: { ...this.attached } });
  }

  resize(w, h) {
    w = Math.max(16, Math.min(2048, w | 0)); h = Math.max(16, Math.min(2048, h | 0));
    if (this.canvas.width === w && this.canvas.height === h) return;
    this.canvas.width = w; this.canvas.height = h;
    // Resizing a WebGL canvas resets the drawing buffer but keeps GL state.
    this.gl.viewport = [0, 0, w, h];
    this.gl.gl.viewport(0, 0, w, h);
    this.post({ type: 'size', width: w, height: h });
  }

  // ---------- running ----------
  async start(wasmBytes) {
    this.post({ type: 'size', width: this.canvas.width, height: this.canvas.height });
    const module = await WebAssembly.compile(wasmBytes);
    const wasi = createWasi({ getMemory: () => this.mem, write: (fd, b) => this.write(fd, b), stdinText: this.stdin });
    const imports = { wasi_snapshot_preview1: wasi, gl: this.buildGLImports(module) };
    // A program could also import from "env" if it declares functions without bodies.
    for (const imp of WebAssembly.Module.imports(module)) {
      if (imp.module !== 'gl' && imp.module !== 'wasi_snapshot_preview1') {
        throw new Error(`The program needs "${imp.name}" from "${imp.module}", which does not exist here.`);
      }
    }
    this.instance = await WebAssembly.instantiate(module, imports);
    this.state = 'main';
    this.post({ type: 'status', state: 'running' });
    try {
      this.instance.exports._start();
      this.finish(0);
    } catch (e) {
      if (e === MAIN_LOOP) this.enterMainLoop();
      else this.handleError(e);
    }
  }

  enterMainLoop() {
    this.flushStdio();
    this.state = 'running';
    if (!this.cb.display) {
      this.emit('warning', 'Warning: glutMainLoop() was called but no display function was registered with glutDisplayFunc(). Nothing will be drawn.\n');
    }
    this.callReshape();
    this.redisplay = true;
    this.schedule();
  }

  callReshape() {
    if (this.cb.reshape) this.invoke(this.cb.reshape, this.canvas.width, this.canvas.height);
    else this.gl.glViewport(0, 0, this.canvas.width, this.canvas.height);
  }

  schedule() {
    if (this.frameScheduled || this.state !== 'running') return;
    if (!this.redisplay && !this.cb.idle) return;
    this.frameScheduled = true;
    RAF(() => this.frame());
  }

  frame() {
    this.frameScheduled = false;
    if (this.state !== 'running') return;
    if (this.cb.idle) this.invoke(this.cb.idle);
    if (this.state !== 'running') return;
    if (this.redisplay) {
      this.redisplay = false;
      if (this.cb.display) {
        const g = this.gl;
        this.invoke(this.cb.display);
        if (g.prim !== -1) { g.warnOnce('noend', 'The display function ended inside glBegin() without calling glEnd().'); g.glEnd(); }
        this.frames++;
        const sn = g.snapshot(), key = JSON.stringify(sn);
        const changed = key !== this.lastSnap;
        this.lastSnap = key;
        this.post({ type: 'frame', n: this.frames, snap: changed ? sn : null });
      }
    }
    this.schedule();
  }

  invoke(f, ...args) {
    if (!f || (this.state !== 'running' && this.state !== 'main')) return;
    try {
      f(...args);
      this.flushStdio();
    } catch (e) {
      if (e === MAIN_LOOP) return;
      this.handleError(e);
    }
  }

  flushStdio() {
    try { if (this.instance && this.instance.exports.fflush) this.instance.exports.fflush(0); } catch { /* ignore */ }
    this.flushOut();
  }

  handleError(e) {
    if (e instanceof ExitStatus) { this.flushStdio(); this.finish(e.code); return; }
    if (e instanceof LeaveMainLoop) { this.flushStdio(); this.finish(0, 'The program left the main loop.'); return; }
    this.flushOut();
    const fns = functionsFromStack(e);
    const isTrap = e instanceof WebAssembly.RuntimeError || /Maximum call stack|too much recursion/.test(String(e && e.message));
    this.stop();
    this.post({
      type: 'runtime-error',
      message: isTrap ? explainTrap(e) : String(e && e.message || e),
      raw: String(e && e.message || e),
      functions: fns,
    });
  }

  finish(code, note) {
    this.flushOut();
    this.stop();
    this.post({ type: 'exit', code, note });
  }

  stop() {
    this.state = 'stopped';
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
  }

  // ---------- input events from the page ----------
  onEvent(ev) {
    if (this.state !== 'running') return;
    this.mods = ev.mods || 0;
    switch (ev.type) {
      case 'key':
        if (ev.repeat && this.ignoreRepeat) return;
        if (ev.special) this.invoke(ev.up ? this.cb.specialUp : this.cb.special, ev.key, ev.x, ev.y);
        else this.invoke(ev.up ? this.cb.keyboardUp : this.cb.keyboard, ev.key, ev.x, ev.y);
        break;
      case 'mouse': this.invoke(this.cb.mouse, ev.button, ev.state, ev.x, ev.y); break;
      case 'motion': this.invoke(ev.pressed ? this.cb.motion : this.cb.passive, ev.x, ev.y); break;
      case 'wheel':
        if (this.cb.wheel) this.invoke(this.cb.wheel, 0, ev.dir, ev.x, ev.y);
        else if (this.cb.mouse) { const b = ev.dir > 0 ? 3 : 4; this.invoke(this.cb.mouse, b, 0, ev.x, ev.y); this.invoke(this.cb.mouse, b, 1, ev.x, ev.y); }
        break;
      case 'entry': this.invoke(this.cb.entry, ev.state); break;
      case 'menu': {
        const m = this.menus.get(ev.menu);
        if (m && m.cb) this.invoke(m.cb, ev.value);
        break;
      }
      case 'redraw': this.redisplay = true; break;
    }
    this.schedule();
  }
}
