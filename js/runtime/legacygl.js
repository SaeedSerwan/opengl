// LegacyGL — an implementation of the OpenGL 1.x fixed-function pipeline
// (glBegin/glEnd immediate mode, matrix stacks, simple lighting, display
// lists, bitmap text) on top of WebGL.
//
// The compiled student program calls these functions through WebAssembly
// imports. Vertices are transformed on the CPU exactly as the fixed-function
// pipeline specifies (object -> eye -> clip), then the assembled primitives
// are rasterised by WebGL. Nothing here draws anything on its own: every
// pixel comes from a GL call made by the student's compiled program.

import * as M from './mat4.js';

const GLC = {
  POINTS: 0, LINES: 1, LINE_LOOP: 2, LINE_STRIP: 3, TRIANGLES: 4, TRIANGLE_STRIP: 5,
  TRIANGLE_FAN: 6, QUADS: 7, QUAD_STRIP: 8, POLYGON: 9,
  MODELVIEW: 0x1700, PROJECTION: 0x1701, TEXTURE: 0x1702,
  COLOR_BUFFER_BIT: 0x4000, DEPTH_BUFFER_BIT: 0x100, STENCIL_BUFFER_BIT: 0x400,
  POINT_SMOOTH: 0x0B10, LINE_SMOOTH: 0x0B20, LINE_STIPPLE: 0x0B24, POLYGON_SMOOTH: 0x0B41,
  CULL_FACE: 0x0B44, LIGHTING: 0x0B50, COLOR_MATERIAL: 0x0B57, FOG: 0x0B60, DEPTH_TEST: 0x0B71,
  STENCIL_TEST: 0x0B90, NORMALIZE: 0x0BA1, ALPHA_TEST: 0x0BC0, DITHER: 0x0BD0, BLEND: 0x0BE2,
  SCISSOR_TEST: 0x0C11, TEXTURE_1D: 0x0DE0, TEXTURE_2D: 0x0DE1, RESCALE_NORMAL: 0x803A,
  MULTISAMPLE: 0x809D, POLYGON_OFFSET_FILL: 0x8037, POLYGON_STIPPLE: 0x0B42,
  LIGHT0: 0x4000,
  FRONT: 0x404, BACK: 0x405, FRONT_AND_BACK: 0x408, CW: 0x900, CCW: 0x901,
  POINT: 0x1B00, LINE: 0x1B01, FILL: 0x1B02, FLAT: 0x1D00, SMOOTH: 0x1D01,
  AMBIENT: 0x1200, DIFFUSE: 0x1201, SPECULAR: 0x1202, POSITION: 0x1203, SPOT_DIRECTION: 0x1204,
  SPOT_EXPONENT: 0x1205, SPOT_CUTOFF: 0x1206, CONSTANT_ATTENUATION: 0x1207,
  LINEAR_ATTENUATION: 0x1208, QUADRATIC_ATTENUATION: 0x1209, EMISSION: 0x1600, SHININESS: 0x1601,
  AMBIENT_AND_DIFFUSE: 0x1602, LIGHT_MODEL_LOCAL_VIEWER: 0x0B51, LIGHT_MODEL_TWO_SIDE: 0x0B52,
  LIGHT_MODEL_AMBIENT: 0x0B53,
  CURRENT_COLOR: 0x0B00, POINT_SIZE: 0x0B11, LINE_WIDTH: 0x0B21, VIEWPORT: 0x0BA2,
  MODELVIEW_MATRIX: 0x0BA6, PROJECTION_MATRIX: 0x0BA7, COLOR_CLEAR_VALUE: 0x0C22,
  MATRIX_MODE: 0x0BA0, MAX_LIGHTS: 0x0D31, MAX_TEXTURE_SIZE: 0x0D33,
  MODELVIEW_STACK_DEPTH: 0x0BA3, PROJECTION_STACK_DEPTH: 0x0BA4,
  COMPILE: 0x1300, COMPILE_AND_EXECUTE: 0x1301,
  INVALID_ENUM: 0x500, INVALID_VALUE: 0x501, INVALID_OPERATION: 0x502,
  STACK_OVERFLOW: 0x503, STACK_UNDERFLOW: 0x504, OUT_OF_MEMORY: 0x505,
};
export { GLC };

const PRIM_NAMES = ['GL_POINTS', 'GL_LINES', 'GL_LINE_LOOP', 'GL_LINE_STRIP', 'GL_TRIANGLES',
  'GL_TRIANGLE_STRIP', 'GL_TRIANGLE_FAN', 'GL_QUADS', 'GL_QUAD_STRIP', 'GL_POLYGON'];

// Calls that are recorded into display lists (everything that draws or
// changes state). Queries and list management are executed immediately.
const NOT_LISTABLE = new Set(['glGenLists', 'glNewList', 'glEndList', 'glDeleteLists', 'glIsList',
  'glGetError', 'glGetFloatv', 'glGetDoublev', 'glGetIntegerv', 'glGetBooleanv', 'glIsEnabled',
  'glFlush', 'glFinish']);

const VS = `
attribute vec4 aPos;
attribute vec4 aCol;
varying vec4 vCol;
void main() { gl_Position = aPos; gl_PointSize = 1.0; vCol = aCol; }`;
const FS = `
precision mediump float;
varying vec4 vCol;
void main() { gl_FragColor = vCol; }`;
const VS_TEX = `
attribute vec4 aPos;
attribute vec2 aUV;
varying vec2 vUV;
void main() { gl_Position = aPos; vUV = aUV; }`;
const FS_TEX = `
precision mediump float;
uniform sampler2D uTex;
uniform vec4 uColor;
varying vec2 vUV;
void main() { gl_FragColor = vec4(uColor.rgb, uColor.a * texture2D(uTex, vUV).a); }`;

// GLUT bitmap fonts mapped to browser fonts: [css font, fixed advance or 0, line height]
const BITMAP_FONTS = {
  2: ['15px "Courier New", monospace', 9, 15],
  3: ['13px "Courier New", monospace', 8, 13],
  4: ['10px "Times New Roman", serif', 0, 13],
  5: ['24px "Times New Roman", serif', 0, 26],
  6: ['10px Helvetica, Arial, sans-serif', 0, 13],
  7: ['12px Helvetica, Arial, sans-serif', 0, 15],
  8: ['18px Helvetica, Arial, sans-serif', 0, 22],
};

function makeCanvas2D(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

function defaultLight(i) {
  const on = i === 0;
  return {
    enabled: false,
    ambient: [0, 0, 0, 1],
    diffuse: on ? [1, 1, 1, 1] : [0, 0, 0, 1],
    specular: on ? [1, 1, 1, 1] : [0, 0, 0, 1],
    position: [0, 0, 1, 0],        // stored in eye coordinates
    spotDirection: [0, 0, -1],
    spotExponent: 0, spotCutoff: 180,
    attenuation: [1, 0, 0],
  };
}
const defaultMaterial = () => ({
  ambient: [0.2, 0.2, 0.2, 1], diffuse: [0.8, 0.8, 0.8, 1], specular: [0, 0, 0, 1],
  emission: [0, 0, 0, 1], shininess: 0,
});

export class LegacyGL {
  constructor(canvas, host) {
    this.canvas = canvas;
    this.host = host; // { warn(msg), info(msg) }
    const opts = { preserveDrawingBuffer: true, antialias: true, depth: true, stencil: false, alpha: false };
    const gl = canvas.getContext('webgl2', opts) || canvas.getContext('webgl', opts);
    if (!gl) throw new Error('WebGL is not available in this browser, so graphics cannot be shown.');
    this.gl = gl;
    this.warned = new Set();
    this.error = 0;
    this._initGL();
    this.reset();
  }

  _initGL() {
    const gl = this.gl;
    const compile = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const link = (vs, fs, attrs) => {
      const p = gl.createProgram();
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
      attrs.forEach((a, i) => gl.bindAttribLocation(p, i, a));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      return p;
    };
    this.prog = link(VS, FS, ['aPos', 'aCol']);
    this.progTex = link(VS_TEX, FS_TEX, ['aPos', 'aUV']);
    this.uTex = gl.getUniformLocation(this.progTex, 'uTex');
    this.uColor = gl.getUniformLocation(this.progTex, 'uColor');
    this.vbo = gl.createBuffer();
    this.glyphs = new Map();
  }

  reset() {
    const gl = this.gl;
    this.mode = GLC.MODELVIEW;
    this.stacks = { [GLC.MODELVIEW]: [M.ident()], [GLC.PROJECTION]: [M.ident()], [GLC.TEXTURE]: [M.ident()] };
    this.color = [1, 1, 1, 1];
    this.normal = [0, 0, 1];
    this.prim = -1;
    this.verts = [];
    this.pointSize = 1;
    this.lineWidth = 1;
    this.stipple = { factor: 1, pattern: 0xFFFF };
    this.polyMode = { front: GLC.FILL, back: GLC.FILL };
    this.shade = GLC.SMOOTH;
    this.cull = { face: GLC.BACK, front: GLC.CCW };
    this.enabled = new Set([GLC.DITHER, GLC.MULTISAMPLE]);
    this.clearColor = [0, 0, 0, 0];
    this.blend = [1, 0];
    this.depthFunc = 0x201;
    this.viewport = [0, 0, this.canvas.width, this.canvas.height];
    this.lights = Array.from({ length: 8 }, (_, i) => defaultLight(i));
    this.material = { front: defaultMaterial(), back: defaultMaterial() };
    this.lightModel = { ambient: [0.2, 0.2, 0.2, 1], localViewer: false, twoSide: false };
    this.colorMaterial = { face: GLC.FRONT_AND_BACK, mode: GLC.AMBIENT_AND_DIFFUSE };
    this.raster = { x: 0, y: 0, z: 0, valid: true, color: [1, 1, 1, 1] };
    this.lists = new Map();
    this.nextList = 1;
    this.recording = null;   // { id, mode, cmds }
    this.callDepth = 0;
    this.attribStack = [];
    this.quadrics = new Map();
    this.nextQuadric = 1;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.SCISSOR_TEST); gl.disable(gl.CULL_FACE);
    gl.depthFunc(gl.LESS); gl.blendFunc(gl.ONE, gl.ZERO);
    gl.clearColor(0, 0, 0, 1);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  warnOnce(key, msg) {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    this.host.warn(msg);
  }
  setError(code, msg) {
    if (!this.error) this.error = code;
    if (msg) this.warnOnce('err:' + msg, msg);
  }
  insideBegin(fn) {
    if (this.prim !== -1) {
      this.setError(GLC.INVALID_OPERATION, `${fn}() was called between glBegin() and glEnd(). Only glVertex, glColor and glNormal are allowed there.`);
      return true;
    }
    return false;
  }

  // ---------- dispatcher (display list aware) ----------
  dispatch(name, args) {
    const rec = this.recording;
    if (rec && !NOT_LISTABLE.has(name)) {
      rec.cmds.push([name, args]);
      if (rec.mode !== GLC.COMPILE_AND_EXECUTE) return undefined;
    }
    return this[name](...args);
  }

  // ---------- matrices ----------
  get top() { const s = this.stacks[this.mode]; return s[s.length - 1]; }
  set top(m) { const s = this.stacks[this.mode]; s[s.length - 1] = m; }
  get mv() { const s = this.stacks[GLC.MODELVIEW]; return s[s.length - 1]; }
  get proj() { const s = this.stacks[GLC.PROJECTION]; return s[s.length - 1]; }

  glMatrixMode(mode) {
    if (this.insideBegin('glMatrixMode')) return;
    if (!this.stacks[mode]) { this.setError(GLC.INVALID_ENUM, `glMatrixMode(): unknown mode ${mode}. Use GL_PROJECTION or GL_MODELVIEW.`); return; }
    if (mode === GLC.TEXTURE) this.warnOnce('texmat', 'GL_TEXTURE matrix mode is accepted but textures are not supported.');
    this.mode = mode;
  }
  glLoadIdentity() { if (!this.insideBegin('glLoadIdentity')) this.top = M.ident(); }
  glPushMatrix() {
    if (this.insideBegin('glPushMatrix')) return;
    const s = this.stacks[this.mode];
    if (s.length >= 32) { this.setError(GLC.STACK_OVERFLOW, 'glPushMatrix(): matrix stack overflow (more than 32 pushes without a matching glPopMatrix).'); return; }
    s.push(M.copy(this.top));
  }
  glPopMatrix() {
    if (this.insideBegin('glPopMatrix')) return;
    const s = this.stacks[this.mode];
    if (s.length <= 1) { this.setError(GLC.STACK_UNDERFLOW, 'glPopMatrix(): matrix stack underflow (glPopMatrix called more times than glPushMatrix).'); return; }
    s.pop();
  }
  _mult(m, fn) { if (!this.insideBegin(fn)) this.top = M.mul(this.top, m); }
  glTranslatef(x, y, z) { this._mult(M.translate(x, y, z), 'glTranslatef'); }
  glRotatef(a, x, y, z) {
    if (x === 0 && y === 0 && z === 0) this.warnOnce('rot0', 'glRotatef(): the rotation axis (x, y, z) is (0, 0, 0), so nothing rotates. For 2D rotation use glRotatef(angle, 0, 0, 1).');
    this._mult(M.rotate(a, x, y, z), 'glRotatef');
  }
  glScalef(x, y, z) { this._mult(M.scale(x, y, z), 'glScalef'); }
  glOrtho(l, r, b, t, n, f) {
    if (l === r || b === t || n === f) { this.setError(GLC.INVALID_VALUE, 'glOrtho(): left/right, bottom/top and near/far must be different values.'); return; }
    this._mult(M.ortho(l, r, b, t, n, f), 'glOrtho');
  }
  glFrustum(l, r, b, t, n, f) {
    if (n <= 0 || f <= 0 || l === r || b === t || n === f) { this.setError(GLC.INVALID_VALUE, 'glFrustum(): near and far must be positive and all ranges non-empty.'); return; }
    this._mult(M.frustum(l, r, b, t, n, f), 'glFrustum');
  }
  gluOrtho2D(l, r, b, t) { this.glOrtho(l, r, b, t, -1, 1); }
  gluPerspective(fovy, aspect, n, f) {
    if (n <= 0) { this.setError(GLC.INVALID_VALUE, 'gluPerspective(): zNear must be greater than 0.'); return; }
    this._mult(M.perspective(fovy, aspect, n, f), 'gluPerspective');
  }
  gluLookAt(...a) { this._mult(M.lookAt(...a), 'gluLookAt'); }
  glLoadMatrix(m) { if (!this.insideBegin('glLoadMatrix')) this.top = new Float64Array(m); }
  glMultMatrix(m) { this._mult(new Float64Array(m), 'glMultMatrix'); }

  // ---------- current attributes ----------
  glColor4f(r, g, b, a) { this.color = [r, g, b, a]; }
  glNormal3f(x, y, z) { this.normal = [x, y, z]; }

  // ---------- vertices ----------
  glBegin(mode) {
    if (this.prim !== -1) { this.setError(GLC.INVALID_OPERATION, 'glBegin() was called twice without glEnd() in between.'); return; }
    if (mode < 0 || mode > 9) { this.setError(GLC.INVALID_ENUM, `glBegin(): unknown primitive ${mode}. Use GL_POINTS, GL_LINES, GL_TRIANGLES, GL_QUADS, GL_POLYGON, ...`); return; }
    this.prim = mode;
    this.verts = [];
  }

  glVertex4f(x, y, z, w) {
    if (this.prim === -1) {
      this.warnOnce('vtxout', 'glVertex*() was called outside glBegin()/glEnd(); that vertex is ignored.');
      return;
    }
    const eye = M.xform(this.mv, x, y, z, w);
    const clip = M.xform(this.proj, eye[0], eye[1], eye[2], eye[3]);
    let col = this.color;
    if (this.enabled.has(GLC.LIGHTING)) col = this._light(eye);
    this.verts.push({ c: clip, col });
    if (this.verts.length > 4000000) { this.glEnd(); this.setError(GLC.OUT_OF_MEMORY, 'Too many vertices in one glBegin()/glEnd() block.'); }
  }

  glRectf(x1, y1, x2, y2) {
    if (this.insideBegin('glRect')) return;
    this.glBegin(GLC.POLYGON);
    this.glVertex4f(x1, y1, 0, 1); this.glVertex4f(x2, y1, 0, 1);
    this.glVertex4f(x2, y2, 0, 1); this.glVertex4f(x1, y2, 0, 1);
    this.glEnd();
  }

  glEnd() {
    if (this.prim === -1) { this.setError(GLC.INVALID_OPERATION, 'glEnd() was called without a matching glBegin().'); return; }
    const mode = this.prim, v = this.verts;
    this.prim = -1; this.verts = [];
    const need = [1, 2, 2, 2, 3, 3, 3, 4, 4, 3][mode];
    if (v.length < need) {
      if (v.length > 0) this.warnOnce('few' + mode, `${PRIM_NAMES[mode]} needs at least ${need} vertices; this glBegin()/glEnd() block had ${v.length}, so nothing was drawn.`);
      return;
    }
    if (mode === GLC.LINES && v.length % 2) this.warnOnce('oddlines', 'GL_LINES uses vertices in pairs; the last unpaired vertex was ignored.');
    if (mode === GLC.TRIANGLES && v.length % 3) this.warnOnce('oddtri', 'GL_TRIANGLES uses vertices in groups of 3; leftover vertices were ignored.');
    if (mode === GLC.QUADS && v.length % 4) this.warnOnce('oddquad', 'GL_QUADS uses vertices in groups of 4; leftover vertices were ignored.');

    const flat = this.shade === GLC.FLAT;
    const out = { tri: [], line: [], point: [] };
    const seg = (a, b, prov) => out.line.push(flat ? [a, b, prov.col] : [a, b, null]);

    switch (mode) {
      case GLC.POINTS: v.forEach((p) => out.point.push(p)); break;
      case GLC.LINES: for (let i = 0; i + 1 < v.length; i += 2) seg(v[i], v[i + 1], v[i + 1]); break;
      case GLC.LINE_STRIP: for (let i = 1; i < v.length; i++) seg(v[i - 1], v[i], v[i]); break;
      case GLC.LINE_LOOP:
        for (let i = 1; i < v.length; i++) seg(v[i - 1], v[i], v[i]);
        seg(v[v.length - 1], v[0], v[0]);
        break;
      case GLC.TRIANGLES: for (let i = 0; i + 2 < v.length; i += 3) this._poly([v[i], v[i + 1], v[i + 2]], v[i + 2], out); break;
      case GLC.TRIANGLE_STRIP:
        for (let i = 2; i < v.length; i++) this._poly(i % 2 ? [v[i - 1], v[i - 2], v[i]] : [v[i - 2], v[i - 1], v[i]], v[i], out);
        break;
      case GLC.TRIANGLE_FAN: for (let i = 2; i < v.length; i++) this._poly([v[0], v[i - 1], v[i]], v[i], out); break;
      case GLC.QUADS: for (let i = 0; i + 3 < v.length; i += 4) this._poly([v[i], v[i + 1], v[i + 2], v[i + 3]], v[i + 3], out); break;
      case GLC.QUAD_STRIP:
        for (let i = 2; i + 1 < v.length; i += 2) this._poly([v[i - 2], v[i - 1], v[i + 1], v[i]], v[i + 1], out);
        break;
      case GLC.POLYGON: this._poly(v, v[0], out); break;
    }
    this._flush(out, mode);
  }

  // A polygon (triangle, quad or convex polygon): cull, choose polygon mode, emit.
  _poly(pv, provoking, out) {
    let area = 0;
    for (let i = 0; i < pv.length; i++) {
      const a = pv[i].c, b = pv[(i + 1) % pv.length].c;
      const ax = a[0] / a[3], ay = a[1] / a[3], bx = b[0] / b[3], by = b[1] / b[3];
      area += ax * by - bx * ay;
    }
    const ccw = area > 0;
    const isFront = (this.cull.front === GLC.CCW) ? ccw : !ccw;
    if (this.enabled.has(GLC.CULL_FACE)) {
      const f = this.cull.face;
      if (f === GLC.FRONT_AND_BACK || (f === GLC.FRONT && isFront) || (f === GLC.BACK && !isFront)) return;
    }
    const pmode = isFront ? this.polyMode.front : this.polyMode.back;
    const flatCol = this.shade === GLC.FLAT ? provoking.col : null;
    if (pmode === GLC.FILL) {
      for (let i = 2; i < pv.length; i++) out.tri.push([pv[0], pv[i - 1], pv[i], flatCol]);
    } else if (pmode === GLC.LINE) {
      for (let i = 0; i < pv.length; i++) out.line.push([pv[i], pv[(i + 1) % pv.length], flatCol]);
    } else {
      pv.forEach((p) => out.point.push(flatCol ? { c: p.c, col: flatCol } : p));
    }
  }

  _flush(out, mode) {
    const gl = this.gl;
    const data = [];
    const push = (c, col) => { data.push(c[0], c[1], c[2], c[3], col[0], col[1], col[2], col[3]); };
    const vw = this.viewport[2] || 1, vh = this.viewport[3] || 1;

    // ---- triangles ----
    for (const [a, b, c, fc] of out.tri) { push(a.c, fc || a.col); push(b.c, fc || b.col); push(c.c, fc || c.col); }
    let nTri = data.length / 8;

    // ---- lines ----
    let segs = out.line;
    if (this.enabled.has(GLC.LINE_STIPPLE) && this.stipple.pattern !== 0xFFFF) segs = this._stipple(segs, mode, vw, vh);
    const wide = this.lineWidth > 1.01;
    if (wide) {
      const hw = this.lineWidth / 2;
      for (const [a, b, fc] of segs) {
        const cl = clipNear(a, b); if (!cl) continue;
        const [pa, pb, ca, cb] = cl;
        const ax = pa[0] / pa[3], ay = pa[1] / pa[3], az = pa[2] / pa[3];
        const bx = pb[0] / pb[3], by = pb[1] / pb[3], bz = pb[2] / pb[3];
        let dx = (bx - ax) * vw / 2, dy = (by - ay) * vh / 2;
        const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
        const ox = -dy * hw * 2 / vw, oy = dx * hw * 2 / vh;
        const colA = fc || ca, colB = fc || cb;
        const A1 = [ax + ox, ay + oy, az, 1], A2 = [ax - ox, ay - oy, az, 1];
        const B1 = [bx + ox, by + oy, bz, 1], B2 = [bx - ox, by - oy, bz, 1];
        push(A1, colA); push(A2, colA); push(B1, colB);
        push(B1, colB); push(A2, colA); push(B2, colB);
      }
    }

    // ---- points as quads / discs (size > 1 or smooth) ----
    const bigPoints = this.pointSize > 1.01;
    if (bigPoints) {
      const hx = this.pointSize / vw, hy = this.pointSize / vh;
      const smooth = this.enabled.has(GLC.POINT_SMOOTH);
      for (const p of out.point) {
        const c = p.c; if (c[3] <= 0) continue;
        const x = c[0] / c[3], y = c[1] / c[3], z = c[2] / c[3];
        if (x < -1 || x > 1 || y < -1 || y > 1 || z < -1 || z > 1) continue;
        if (smooth) {
          const n = 20;
          for (let i = 0; i < n; i++) {
            const t0 = i / n * 2 * Math.PI, t1 = (i + 1) / n * 2 * Math.PI;
            push([x, y, z, 1], p.col);
            push([x + Math.cos(t0) * hx, y + Math.sin(t0) * hy, z, 1], p.col);
            push([x + Math.cos(t1) * hx, y + Math.sin(t1) * hy, z, 1], p.col);
          }
        } else {
          push([x - hx, y - hy, z, 1], p.col); push([x + hx, y - hy, z, 1], p.col); push([x + hx, y + hy, z, 1], p.col);
          push([x - hx, y - hy, z, 1], p.col); push([x + hx, y + hy, z, 1], p.col); push([x - hx, y + hy, z, 1], p.col);
        }
      }
    }
    const nTriTotal = data.length / 8;

    // ---- thin lines ----
    if (!wide) for (const [a, b, fc] of segs) { push(a.c, fc || a.col); push(b.c, fc || b.col); }
    const nAfterLines = data.length / 8;
    // ---- 1-pixel points ----
    if (!bigPoints) for (const p of out.point) push(p.c, p.col);
    const nAll = data.length / 8;
    if (!nAll) return;

    gl.useProgram(this.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STREAM_DRAW);
    gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 32, 0);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 16);
    if (nTri) gl.drawArrays(gl.TRIANGLES, 0, nTri);
    if (nTriTotal > nTri) gl.drawArrays(gl.TRIANGLES, nTri, nTriTotal - nTri);
    if (nAfterLines > nTriTotal) gl.drawArrays(gl.LINES, nTriTotal, nAfterLines - nTriTotal);
    if (nAll > nAfterLines) gl.drawArrays(gl.POINTS, nAfterLines, nAll - nAfterLines);
    this.dirty = true;
  }

  // Split line segments according to glLineStipple (in window space).
  _stipple(segs, mode, vw, vh) {
    const { factor, pattern } = this.stipple;
    const out = [];
    let counter = 0;
    for (const [a, b, fc] of segs) {
      if (mode === GLC.LINES) counter = 0;
      const cl = clipNear(a, b); if (!cl) continue;
      const [pa, pb, ca, cb] = cl;
      const A = [pa[0] / pa[3], pa[1] / pa[3], pa[2] / pa[3], 1];
      const B = [pb[0] / pb[3], pb[1] / pb[3], pb[2] / pb[3], 1];
      const len = Math.hypot((B[0] - A[0]) * vw / 2, (B[1] - A[1]) * vh / 2);
      const steps = Math.max(1, Math.ceil(len));
      let runStart = -1;
      for (let i = 0; i <= steps; i++) {
        const bit = i < steps ? (pattern >> (Math.floor(counter / factor) % 16)) & 1 : 0;
        if (bit && runStart < 0) runStart = i;
        if (!bit && runStart >= 0) {
          const t0 = runStart / steps, t1 = i / steps;
          out.push([{ c: lerp4(A, B, t0), col: lerp4(ca, cb, t0) }, { c: lerp4(A, B, t1), col: lerp4(ca, cb, t1) }, fc]);
          runStart = -1;
        }
        if (i < steps) counter++;
      }
    }
    return out;
  }

  // ---------- lighting (per vertex, fixed-function formula) ----------
  _light(eye) {
    const mvn = M.normalMatrix(this.mv);
    const [nx0, ny0, nz0] = this.normal;
    let nx = mvn[0] * nx0 + mvn[1] * ny0 + mvn[2] * nz0;
    let ny = mvn[3] * nx0 + mvn[4] * ny0 + mvn[5] * nz0;
    let nz = mvn[6] * nx0 + mvn[7] * ny0 + mvn[8] * nz0;
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    const mat = { ...this.material.front };
    if (this.enabled.has(GLC.COLOR_MATERIAL)) {
      const m = this.colorMaterial.mode, c = this.color;
      if (m === GLC.AMBIENT || m === GLC.AMBIENT_AND_DIFFUSE) mat.ambient = c;
      if (m === GLC.DIFFUSE || m === GLC.AMBIENT_AND_DIFFUSE) mat.diffuse = c;
      if (m === GLC.SPECULAR) mat.specular = c;
      if (m === GLC.EMISSION) mat.emission = c;
    }
    const ex = eye[0] / (eye[3] || 1), ey = eye[1] / (eye[3] || 1), ez = eye[2] / (eye[3] || 1);
    const la = this.lightModel.ambient;
    let r = mat.emission[0] + mat.ambient[0] * la[0];
    let g = mat.emission[1] + mat.ambient[1] * la[1];
    let b = mat.emission[2] + mat.ambient[2] * la[2];
    for (let i = 0; i < 8; i++) {
      const L = this.lights[i];
      if (!L.enabled) continue;
      let lx, ly, lz, att = 1;
      const p = L.position;
      if (p[3] === 0) { lx = p[0]; ly = p[1]; lz = p[2]; }
      else {
        lx = p[0] / p[3] - ex; ly = p[1] / p[3] - ey; lz = p[2] / p[3] - ez;
        const d = Math.hypot(lx, ly, lz);
        att = 1 / (L.attenuation[0] + L.attenuation[1] * d + L.attenuation[2] * d * d || 1);
      }
      const ll = Math.hypot(lx, ly, lz) || 1; lx /= ll; ly /= ll; lz /= ll;
      if (L.spotCutoff !== 180 && p[3] !== 0) {
        const sd = L.spotDirection, sl = Math.hypot(...sd) || 1;
        const cosA = -(lx * sd[0] + ly * sd[1] + lz * sd[2]) / sl;
        if (cosA < Math.cos(L.spotCutoff * Math.PI / 180)) att = 0;
        else att *= Math.pow(Math.max(cosA, 0), L.spotExponent);
      }
      if (att === 0) continue;
      const ndl = Math.max(0, nx * lx + ny * ly + nz * lz);
      r += att * (mat.ambient[0] * L.ambient[0] + ndl * mat.diffuse[0] * L.diffuse[0]);
      g += att * (mat.ambient[1] * L.ambient[1] + ndl * mat.diffuse[1] * L.diffuse[1]);
      b += att * (mat.ambient[2] * L.ambient[2] + ndl * mat.diffuse[2] * L.diffuse[2]);
      if (ndl > 0) {
        let vx = 0, vy = 0, vz = 1;
        if (this.lightModel.localViewer) { const vl = Math.hypot(ex, ey, ez) || 1; vx = -ex / vl; vy = -ey / vl; vz = -ez / vl; }
        let hx = lx + vx, hy = ly + vy, hz = lz + vz;
        const hl = Math.hypot(hx, hy, hz) || 1; hx /= hl; hy /= hl; hz /= hl;
        const s = Math.pow(Math.max(0, nx * hx + ny * hy + nz * hz), mat.shininess || 0);
        r += att * s * mat.specular[0] * L.specular[0];
        g += att * s * mat.specular[1] * L.specular[1];
        b += att * s * mat.specular[2] * L.specular[2];
      }
    }
    const cl = (x) => Math.min(1, Math.max(0, x));
    return [cl(r), cl(g), cl(b), mat.diffuse[3]];
  }

  glLightfv(light, pname, v) {
    const i = light - GLC.LIGHT0;
    if (i < 0 || i > 7) { this.setError(GLC.INVALID_ENUM, 'glLight*(): light must be GL_LIGHT0 ... GL_LIGHT7.'); return; }
    const L = this.lights[i];
    switch (pname) {
      case GLC.AMBIENT: L.ambient = v.slice(0, 4); break;
      case GLC.DIFFUSE: L.diffuse = v.slice(0, 4); break;
      case GLC.SPECULAR: L.specular = v.slice(0, 4); break;
      case GLC.POSITION: L.position = M.xform(this.mv, v[0], v[1], v[2], v[3]); break;
      case GLC.SPOT_DIRECTION: { const e = M.xform(this.mv, v[0], v[1], v[2], 0); L.spotDirection = e.slice(0, 3); break; }
      case GLC.SPOT_EXPONENT: L.spotExponent = v[0]; break;
      case GLC.SPOT_CUTOFF: L.spotCutoff = v[0]; break;
      case GLC.CONSTANT_ATTENUATION: L.attenuation[0] = v[0]; break;
      case GLC.LINEAR_ATTENUATION: L.attenuation[1] = v[0]; break;
      case GLC.QUADRATIC_ATTENUATION: L.attenuation[2] = v[0]; break;
      default: this.setError(GLC.INVALID_ENUM, `glLight*(): unknown parameter ${pname}.`);
    }
  }
  glLightModelfv(pname, v) {
    if (pname === GLC.LIGHT_MODEL_AMBIENT) this.lightModel.ambient = v.slice(0, 4);
    else if (pname === GLC.LIGHT_MODEL_LOCAL_VIEWER) this.lightModel.localViewer = !!v[0];
    else if (pname === GLC.LIGHT_MODEL_TWO_SIDE) { this.lightModel.twoSide = !!v[0]; if (v[0]) this.warnOnce('twoside', 'GL_LIGHT_MODEL_TWO_SIDE is accepted, but back faces are lit like front faces here.'); }
  }
  glMaterialfv(face, pname, v) {
    const faces = face === GLC.FRONT ? ['front'] : face === GLC.BACK ? ['back'] : ['front', 'back'];
    for (const f of faces) {
      const m = this.material[f];
      switch (pname) {
        case GLC.AMBIENT: m.ambient = v.slice(0, 4); break;
        case GLC.DIFFUSE: m.diffuse = v.slice(0, 4); break;
        case GLC.SPECULAR: m.specular = v.slice(0, 4); break;
        case GLC.EMISSION: m.emission = v.slice(0, 4); break;
        case GLC.SHININESS: m.shininess = v[0]; break;
        case GLC.AMBIENT_AND_DIFFUSE: m.ambient = v.slice(0, 4); m.diffuse = v.slice(0, 4); break;
        default: this.setError(GLC.INVALID_ENUM, `glMaterial*(): unknown parameter ${pname}.`);
      }
    }
  }
  glColorMaterial(face, mode) { this.colorMaterial = { face, mode }; }

  // ---------- state ----------
  glEnable(cap) { this._enable(cap, true); }
  glDisable(cap) { this._enable(cap, false); }
  _enable(cap, on) {
    if (this.insideBegin(on ? 'glEnable' : 'glDisable')) return;
    const gl = this.gl;
    if (on) this.enabled.add(cap); else this.enabled.delete(cap);
    if (cap >= GLC.LIGHT0 && cap < GLC.LIGHT0 + 8) { this.lights[cap - GLC.LIGHT0].enabled = on; return; }
    switch (cap) {
      case GLC.DEPTH_TEST: on ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST); break;
      case GLC.BLEND: on ? gl.enable(gl.BLEND) : gl.disable(gl.BLEND); break;
      case GLC.SCISSOR_TEST: on ? gl.enable(gl.SCISSOR_TEST) : gl.disable(gl.SCISSOR_TEST); break;
      case GLC.POLYGON_OFFSET_FILL: on ? gl.enable(gl.POLYGON_OFFSET_FILL) : gl.disable(gl.POLYGON_OFFSET_FILL); break;
      case GLC.DITHER: case GLC.MULTISAMPLE: case GLC.LINE_SMOOTH: case GLC.POLYGON_SMOOTH:
      case GLC.CULL_FACE: case GLC.LIGHTING: case GLC.COLOR_MATERIAL: case GLC.NORMALIZE:
      case GLC.RESCALE_NORMAL: case GLC.POINT_SMOOTH: case GLC.LINE_STIPPLE:
        break; // handled by the CPU pipeline (or harmless)
      case GLC.TEXTURE_2D: case GLC.TEXTURE_1D:
        if (on) this.warnOnce('tex', 'Textures (GL_TEXTURE_2D) are not supported in OpenGL Classroom; shapes are drawn with their colour only.');
        break;
      case GLC.FOG: if (on) this.warnOnce('fog', 'GL_FOG is not supported in OpenGL Classroom; it is ignored.'); break;
      case GLC.ALPHA_TEST: if (on) this.warnOnce('alpha', 'GL_ALPHA_TEST is not supported; it is ignored.'); break;
      case GLC.STENCIL_TEST: if (on) this.warnOnce('stencil', 'GL_STENCIL_TEST is not supported; it is ignored.'); break;
      case GLC.POLYGON_STIPPLE: if (on) this.warnOnce('pstip', 'GL_POLYGON_STIPPLE is not supported; polygons are drawn solid.'); break;
      default: this.warnOnce('cap' + cap, `glEnable/glDisable: capability 0x${cap.toString(16)} is not supported and was ignored.`);
    }
  }
  glIsEnabled(cap) { return this.enabled.has(cap) ? 1 : 0; }
  glPointSize(s) { if (s <= 0) { this.setError(GLC.INVALID_VALUE, 'glPointSize(): size must be greater than 0.'); return; } this.pointSize = s; }
  glLineWidth(w) { if (w <= 0) { this.setError(GLC.INVALID_VALUE, 'glLineWidth(): width must be greater than 0.'); return; } this.lineWidth = w; }
  glLineStipple(factor, pattern) { this.stipple = { factor: Math.max(1, Math.min(256, factor)), pattern: pattern & 0xFFFF }; }
  glPolygonMode(face, mode) {
    if (face === GLC.FRONT || face === GLC.FRONT_AND_BACK) this.polyMode.front = mode;
    if (face === GLC.BACK || face === GLC.FRONT_AND_BACK) this.polyMode.back = mode;
  }
  glShadeModel(m) { this.shade = m; }
  glCullFace(m) { this.cull.face = m; }
  glFrontFace(m) { this.cull.front = m; }
  glHint() {}
  glPolygonOffset(f, u) { this.gl.polygonOffset(f, u); }

  glClearColor(r, g, b, a) { this.clearColor = [r, g, b, a]; this.gl.clearColor(r, g, b, 1); }
  glClearDepth(d) { this.gl.clearDepth(d); }
  glClear(mask) {
    if (this.insideBegin('glClear')) return;
    const gl = this.gl;
    let m = 0;
    if (mask & GLC.COLOR_BUFFER_BIT) m |= gl.COLOR_BUFFER_BIT;
    if (mask & GLC.DEPTH_BUFFER_BIT) m |= gl.DEPTH_BUFFER_BIT;
    if (m) gl.clear(m);
    this.dirty = true;
  }
  glColorMask(r, g, b, a) { this.gl.colorMask(!!r, !!g, !!b, !!a); }
  glDepthMask(f) { this.gl.depthMask(!!f); }
  glDepthFunc(f) { this.depthFunc = f; this.gl.depthFunc(f); }
  glBlendFunc(s, d) { this.blend = [s, d]; this.gl.blendFunc(s, d); }
  glViewport(x, y, w, h) {
    if (w < 0 || h < 0) { this.setError(GLC.INVALID_VALUE, 'glViewport(): width and height must not be negative.'); return; }
    this.viewport = [x, y, w, h]; this.gl.viewport(x, y, w, h);
  }
  glScissor(x, y, w, h) { this.gl.scissor(x, y, w, h); }

  glPushAttrib() {
    this.attribStack.push({
      color: this.color.slice(), pointSize: this.pointSize, lineWidth: this.lineWidth,
      enabled: new Set(this.enabled), polyMode: { ...this.polyMode }, shade: this.shade,
      blend: this.blend.slice(), clearColor: this.clearColor.slice(), stipple: { ...this.stipple },
      viewport: this.viewport.slice(), depthFunc: this.depthFunc,
    });
  }
  glPopAttrib() {
    const s = this.attribStack.pop();
    if (!s) { this.setError(GLC.STACK_UNDERFLOW, 'glPopAttrib(): attribute stack underflow.'); return; }
    Object.assign(this, { color: s.color, pointSize: s.pointSize, lineWidth: s.lineWidth, polyMode: s.polyMode, shade: s.shade, stipple: s.stipple });
    for (const cap of [...this.enabled]) if (!s.enabled.has(cap)) this._enable(cap, false);
    for (const cap of s.enabled) if (!this.enabled.has(cap)) this._enable(cap, true);
    this.glBlendFunc(...s.blend); this.glClearColor(...s.clearColor); this.glViewport(...s.viewport); this.glDepthFunc(s.depthFunc);
  }

  glGetError() { const e = this.error; this.error = 0; return e; }
  // returns an array of numbers for glGet*
  getValues(pname) {
    switch (pname) {
      case GLC.MODELVIEW_MATRIX: return Array.from(this.mv);
      case GLC.PROJECTION_MATRIX: return Array.from(this.proj);
      case GLC.VIEWPORT: return this.viewport.slice();
      case GLC.CURRENT_COLOR: return this.color.slice();
      case GLC.POINT_SIZE: return [this.pointSize];
      case GLC.LINE_WIDTH: return [this.lineWidth];
      case GLC.COLOR_CLEAR_VALUE: return this.clearColor.slice();
      case GLC.MATRIX_MODE: return [this.mode];
      case GLC.MAX_LIGHTS: return [8];
      case GLC.MAX_TEXTURE_SIZE: return [0];
      case GLC.MODELVIEW_STACK_DEPTH: return [this.stacks[GLC.MODELVIEW].length];
      case GLC.PROJECTION_STACK_DEPTH: return [this.stacks[GLC.PROJECTION].length];
      default:
        if (this.enabled.has(pname) || (pname >= 0x0B00 && pname <= 0x0DFF)) return [this.enabled.has(pname) ? 1 : 0];
        this.setError(GLC.INVALID_ENUM, `glGet*(): parameter 0x${pname.toString(16)} is not supported.`);
        return [0];
    }
  }

  // ---------- display lists ----------
  glGenLists(range) { const id = this.nextList; this.nextList += Math.max(1, range); return id; }
  glNewList(id, mode) {
    if (this.recording) { this.setError(GLC.INVALID_OPERATION, 'glNewList(): already inside glNewList()/glEndList().'); return; }
    if (!id) { this.setError(GLC.INVALID_VALUE, 'glNewList(): list id must not be 0 (use glGenLists).'); return; }
    this.recording = { id, mode, cmds: [] };
  }
  glEndList() {
    if (!this.recording) { this.setError(GLC.INVALID_OPERATION, 'glEndList() without glNewList().'); return; }
    this.lists.set(this.recording.id, this.recording.cmds);
    this.recording = null;
  }
  glCallList(id) {
    const cmds = this.lists.get(id);
    if (!cmds) return;
    if (this.callDepth > 64) { this.setError(GLC.INVALID_OPERATION, 'glCallList(): lists nested too deeply.'); return; }
    this.callDepth++;
    try { for (const [n, a] of cmds) this[n](...a); } finally { this.callDepth--; }
  }
  glDeleteLists(id, range) { for (let i = 0; i < range; i++) this.lists.delete(id + i); }
  glIsList(id) { return this.lists.has(id) ? 1 : 0; }

  // ---------- raster position & text ----------
  glRasterPos4f(x, y, z, w) {
    const eye = M.xform(this.mv, x, y, z, w);
    const c = M.xform(this.proj, eye[0], eye[1], eye[2], eye[3]);
    if (c[3] <= 0 || Math.abs(c[0]) > c[3] * 1.0001 || Math.abs(c[1]) > c[3] * 1.0001) {
      this.raster = { ...this.raster, valid: false }; return;
    }
    const [vx, vy, vw, vh] = this.viewport;
    this.raster = {
      x: vx + (c[0] / c[3] + 1) / 2 * vw,
      y: vy + (c[1] / c[3] + 1) / 2 * vh,
      z: c[2] / c[3], valid: true, color: this.color.slice(),
    };
  }
  glWindowPos2f(x, y) { this.raster = { x, y, z: -1, valid: true, color: this.color.slice() }; }

  _fontInfo(font) {
    const f = BITMAP_FONTS[font];
    if (!f) { this.warnOnce('font' + font, 'Unknown GLUT font; using GLUT_BITMAP_HELVETICA_12.'); return BITMAP_FONTS[7]; }
    return f;
  }
  _glyph(css, ch) {
    const key = css + '|' + ch;
    let g = this.glyphs.get(key);
    if (g) return g;
    const size = parseInt(css, 10);
    const cvs = makeCanvas2D(Math.ceil(size * 1.6) + 4, Math.ceil(size * 1.5) + 4);
    const ctx = cvs.getContext('2d');
    ctx.font = css;
    const w = Math.ceil(ctx.measureText(ch).width);
    cvs.width = Math.max(1, w + 2);
    ctx.font = css; ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic';
    const ascent = Math.ceil(size * 1.05), descent = Math.ceil(size * 0.35);
    cvs.height = ascent + descent;
    ctx.font = css; ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(ch, 1, ascent);
    const gl = this.gl, tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cvs);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    g = { tex, w, cw: cvs.width, ch: cvs.height, ascent, descent };
    if (this.glyphs.size > 2000) this.glyphs.clear();
    this.glyphs.set(key, g);
    return g;
  }
  // draw a textured quad given 4 clip-space corners (bl, br, tr, tl)
  _drawGlyphQuad(g, corners, color) {
    const gl = this.gl;
    const [bl, br, tr, tl] = corners;
    const d = new Float32Array([
      ...bl, 0, 1, ...br, 1, 1, ...tr, 1, 0,
      ...bl, 0, 1, ...tr, 1, 0, ...tl, 0, 0,
    ]);
    gl.useProgram(this.progTex);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, d, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 24, 16);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, g.tex);
    gl.uniform1i(this.uTex, 0);
    gl.uniform4f(this.uColor, color[0], color[1], color[2], color[3]);
    const blendOn = this.enabled.has(GLC.BLEND);
    if (!blendOn) gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (!blendOn) gl.disable(gl.BLEND);
    gl.blendFunc(this.blend[0], this.blend[1]);
    this.dirty = true;
  }
  glutBitmapCharacter(font, code) {
    if (!this.raster.valid) return;
    const [css, fixed] = this._fontInfo(font);
    const ch = String.fromCharCode(code & 0xFF);
    const g = this._glyph(css, ch);
    const adv = fixed || g.w;
    if (code !== 32) {
      const W = this.canvas.width, H = this.canvas.height;
      const x0 = this.raster.x - 1, x1 = x0 + g.cw;
      const y0 = this.raster.y - g.descent, y1 = this.raster.y + g.ascent;
      const nx = (x) => x / W * 2 - 1, ny = (y) => y / H * 2 - 1, z = this.raster.z;
      const gl = this.gl;
      gl.viewport(0, 0, W, H);
      this._drawGlyphQuad(g, [[nx(x0), ny(y0), z, 1], [nx(x1), ny(y0), z, 1], [nx(x1), ny(y1), z, 1], [nx(x0), ny(y1), z, 1]], this.raster.color);
      gl.viewport(...this.viewport);
    }
    this.raster.x += adv;
  }
  bitmapWidth(font, code) {
    const [css, fixed] = this._fontInfo(font);
    return fixed || this._glyph(css, String.fromCharCode(code & 0xFF)).w;
  }
  bitmapHeight(font) { return this._fontInfo(font)[2]; }
  glutBitmapString(font, str) {
    const startX = this.raster.x;
    const lh = this.bitmapHeight(font);
    for (const ch of str) {
      if (ch === '\n') { this.raster.x = startX; this.raster.y -= lh; continue; }
      this.glutBitmapCharacter(font, ch.charCodeAt(0));
    }
  }
  // Stroke fonts are drawn as glyph images placed in model space (about
  // 119 units tall, like GLUT_STROKE_ROMAN) so they follow glTranslate/
  // glRotate/glScale. The model-view matrix is advanced like real GLUT.
  strokeWidth(font, code) {
    const css = font === 1 ? '96px "Courier New", monospace' : '96px Helvetica, Arial, sans-serif';
    if (font === 1) return 104.76;
    return this._glyph(css, String.fromCharCode(code & 0xFF)).w * 1.24;
  }
  glutStrokeCharacter(font, code) {
    this.warnOnce('stroke', 'Note: glutStrokeCharacter() is drawn with a filled browser font, not with line strokes.');
    const css = font === 1 ? '96px "Courier New", monospace' : '96px Helvetica, Arial, sans-serif';
    const ch = String.fromCharCode(code & 0xFF);
    const g = this._glyph(css, ch);
    const s = 1.24; // 96px font -> ~119 GLUT units
    const adv = this.strokeWidth(font, code);
    if (code !== 32) {
      const corner = (x, y) => { const e = M.xform(this.mv, x, y, 0, 1); return M.xform(this.proj, e[0], e[1], e[2], e[3]); };
      const x0 = -1 * s, x1 = (g.cw - 1) * s, y0 = -g.descent * s, y1 = g.ascent * s;
      this._drawGlyphQuad(g, [corner(x0, y0), corner(x1, y0), corner(x1, y1), corner(x0, y1)], this.color);
    }
    const st = this.stacks[GLC.MODELVIEW];
    st[st.length - 1] = M.mul(st[st.length - 1], M.translate(adv, 0, 0));
  }
  glutStrokeString(font, str) { for (const ch of str) this.glutStrokeCharacter(font, ch.charCodeAt(0)); }

  // ---------- unsupported (warn once) ----------
  unsupported(name, hint) {
    this.warnOnce('unsup:' + name, `${name}() is not supported in OpenGL Classroom and was ignored.${hint ? ' ' + hint : ''}`);
  }

  // Information for the coordinate-grid overlay.
  snapshot() {
    return { proj: Array.from(this.proj), mv: Array.from(this.mv), viewport: this.viewport.slice() };
  }
}

function lerp4(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t]; }

// Clip a segment against the w > epsilon plane so that perspective division is safe.
function clipNear(a, b) {
  const eps = 1e-5;
  let pa = a.c, pb = b.c, ca = a.col, cb = b.col;
  if (pa[3] <= eps && pb[3] <= eps) return null;
  if (pa[3] <= eps) { const t = (eps - pa[3]) / (pb[3] - pa[3]); pa = lerp4(pa, pb, t); ca = lerp4(ca, cb, t); }
  else if (pb[3] <= eps) { const t = (eps - pb[3]) / (pa[3] - pb[3]); pb = lerp4(pb, pa, t); cb = lerp4(cb, ca, t); }
  return [pa, pb, ca, cb];
}
