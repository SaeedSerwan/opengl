// GLUT and GLU ready-made shapes, drawn through the LegacyGL pipeline with
// glBegin/glNormal/glVertex, like FreeGLUT does.
import { LegacyGL, GLC } from './legacygl.js';
import { TEAPOT_POSITIONS, TEAPOT_CELLS } from './teapot-data.js';

const P = LegacyGL.prototype;
const TAU = Math.PI * 2;

P._n = function (x, y, z) { this.glNormal3f(x, y, z); };
P._v = function (x, y, z) { this.glVertex4f(x, y, z, 1); };

P.glutCube = function (size, wire) {
  const s = size / 2;
  const faces = [
    [[1, 0, 0], [[s, -s, s], [s, -s, -s], [s, s, -s], [s, s, s]]],
    [[-1, 0, 0], [[-s, -s, -s], [-s, -s, s], [-s, s, s], [-s, s, -s]]],
    [[0, 1, 0], [[-s, s, s], [s, s, s], [s, s, -s], [-s, s, -s]]],
    [[0, -1, 0], [[-s, -s, -s], [s, -s, -s], [s, -s, s], [-s, -s, s]]],
    [[0, 0, 1], [[-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s]]],
    [[0, 0, -1], [[s, -s, -s], [-s, -s, -s], [-s, s, -s], [s, s, -s]]],
  ];
  for (const [n, vs] of faces) {
    this.glBegin(wire ? GLC.LINE_LOOP : GLC.QUADS);
    this._n(...n);
    for (const v of vs) this._v(...v);
    this.glEnd();
  }
};

P.glutSphere = function (r, slices, stacks, wire) {
  slices = Math.max(3, slices | 0); stacks = Math.max(2, stacks | 0);
  const pt = (i, j) => {
    const phi = Math.PI * i / stacks, th = TAU * j / slices;
    return [Math.sin(phi) * Math.cos(th), Math.sin(phi) * Math.sin(th), Math.cos(phi)];
  };
  if (wire) {
    for (let i = 1; i < stacks; i++) {
      this.glBegin(GLC.LINE_LOOP);
      for (let j = 0; j < slices; j++) { const p = pt(i, j); this._n(...p); this._v(p[0] * r, p[1] * r, p[2] * r); }
      this.glEnd();
    }
    for (let j = 0; j < slices; j++) {
      this.glBegin(GLC.LINE_STRIP);
      for (let i = 0; i <= stacks; i++) { const p = pt(i, j); this._n(...p); this._v(p[0] * r, p[1] * r, p[2] * r); }
      this.glEnd();
    }
    return;
  }
  for (let i = 0; i < stacks; i++) {
    this.glBegin(GLC.QUAD_STRIP);
    for (let j = 0; j <= slices; j++) {
      const a = pt(i, j), b = pt(i + 1, j);
      this._n(...a); this._v(a[0] * r, a[1] * r, a[2] * r);
      this._n(...b); this._v(b[0] * r, b[1] * r, b[2] * r);
    }
    this.glEnd();
  }
};

// Cylinder/cone along +z from z=0 to z=h.
P._tube = function (r0, r1, h, slices, stacks, wire, caps) {
  slices = Math.max(3, slices | 0); stacks = Math.max(1, stacks | 0);
  const slope = (r0 - r1) / (h || 1);
  const nl = Math.hypot(1, slope);
  const ring = (k) => { const z = h * k / stacks, r = r0 + (r1 - r0) * k / stacks; return [z, r]; };
  if (wire) {
    for (let k = 0; k <= stacks; k++) {
      const [z, r] = ring(k);
      if (r === 0) continue;
      this.glBegin(GLC.LINE_LOOP);
      for (let j = 0; j < slices; j++) { const t = TAU * j / slices; this._n(Math.cos(t) / nl, Math.sin(t) / nl, slope / nl); this._v(Math.cos(t) * r, Math.sin(t) * r, z); }
      this.glEnd();
    }
    this.glBegin(GLC.LINES);
    for (let j = 0; j < slices; j++) {
      const t = TAU * j / slices, c = Math.cos(t), s = Math.sin(t);
      this._n(c / nl, s / nl, slope / nl);
      this._v(c * r0, s * r0, 0); this._v(c * r1, s * r1, h);
    }
    this.glEnd();
    return;
  }
  for (let k = 0; k < stacks; k++) {
    const [z0, ra] = ring(k), [z1, rb] = ring(k + 1);
    this.glBegin(GLC.QUAD_STRIP);
    for (let j = 0; j <= slices; j++) {
      const t = TAU * j / slices, c = Math.cos(t), s = Math.sin(t);
      this._n(c / nl, s / nl, slope / nl);
      this._v(c * ra, s * ra, z0); this._v(c * rb, s * rb, z1);
    }
    this.glEnd();
  }
  if (caps) {
    if (r0 > 0) {
      this.glBegin(GLC.TRIANGLE_FAN); this._n(0, 0, -1); this._v(0, 0, 0);
      for (let j = slices; j >= 0; j--) { const t = TAU * j / slices; this._v(Math.cos(t) * r0, Math.sin(t) * r0, 0); }
      this.glEnd();
    }
    if (r1 > 0) {
      this.glBegin(GLC.TRIANGLE_FAN); this._n(0, 0, 1); this._v(0, 0, h);
      for (let j = 0; j <= slices; j++) { const t = TAU * j / slices; this._v(Math.cos(t) * r1, Math.sin(t) * r1, h); }
      this.glEnd();
    }
  }
};

P.glutTorus = function (inner, outer, sides, rings, wire) {
  sides = Math.max(3, sides | 0); rings = Math.max(3, rings | 0);
  const pt = (i, j) => {
    const u = TAU * i / rings, v = TAU * j / sides;
    const cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v), sv = Math.sin(v);
    const R = outer + inner * cv;
    return [[R * cu, R * su, inner * sv], [cv * cu, cv * su, sv]];
  };
  if (wire) {
    for (let i = 0; i < rings; i++) {
      this.glBegin(GLC.LINE_LOOP);
      for (let j = 0; j < sides; j++) { const [p, n] = pt(i, j); this._n(...n); this._v(...p); }
      this.glEnd();
    }
    for (let j = 0; j < sides; j++) {
      this.glBegin(GLC.LINE_LOOP);
      for (let i = 0; i < rings; i++) { const [p, n] = pt(i, j); this._n(...n); this._v(...p); }
      this.glEnd();
    }
    return;
  }
  for (let i = 0; i < rings; i++) {
    this.glBegin(GLC.QUAD_STRIP);
    for (let j = 0; j <= sides; j++) {
      const [p0, n0] = pt(i + 1, j), [p1, n1] = pt(i, j);
      this._n(...n0); this._v(...p0); this._n(...n1); this._v(...p1);
    }
    this.glEnd();
  }
};

P._mesh = function (pos, tris, wire, scale = 1) {
  for (const t of tris) {
    const a = pos[t[0]], b = pos[t[1]], c = pos[t[2]];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    this.glBegin(wire ? GLC.LINE_LOOP : GLC.TRIANGLES);
    this._n(...n);
    for (const p of [a, b, c]) this._v(p[0] * scale, p[1] * scale, p[2] * scale);
    this.glEnd();
  }
};

const TETRA = (() => {
  const s = 1 / Math.sqrt(3);
  return [[[s, s, s], [-s, -s, s], [-s, s, -s], [s, -s, -s]], [[0, 1, 3], [0, 2, 1], [0, 3, 2], [1, 2, 3]]];
})();
const OCTA = [[[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
  [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]]];
const ICOSA = (() => {
  const t = (1 + Math.sqrt(5)) / 2, l = Math.hypot(1, t);
  const v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map((p) => p.map((x) => x / l));
  const f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  return [v, f];
})();

let teapotCache = null;
function teapotMesh() {
  if (teapotCache) return teapotCache;
  const pos = [], nrm = [];
  for (let i = 0; i < TEAPOT_POSITIONS.length; i += 3) { pos.push([TEAPOT_POSITIONS[i], TEAPOT_POSITIONS[i + 1], TEAPOT_POSITIONS[i + 2]]); nrm.push([0, 0, 0]); }
  const tris = [];
  for (let i = 0; i < TEAPOT_CELLS.length; i += 3) tris.push([TEAPOT_CELLS[i], TEAPOT_CELLS[i + 1], TEAPOT_CELLS[i + 2]]);
  for (const [a, b, c] of tris) {
    const A = pos[a], B = pos[b], C = pos[c];
    const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], v = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    for (const k of [a, b, c]) { nrm[k][0] += n[0]; nrm[k][1] += n[1]; nrm[k][2] += n[2]; }
  }
  teapotCache = { pos, nrm, tris };
  return teapotCache;
}
P.glutTeapot = function (size, wire) {
  const { pos, nrm, tris } = teapotMesh();
  const s = size * 0.106;
  this.glBegin(wire ? GLC.LINES : GLC.TRIANGLES);
  for (const t of tris) {
    const idx = wire ? [t[0], t[1], t[1], t[2], t[2], t[0]] : t;
    for (const k of idx) { this._n(...nrm[k]); const p = pos[k]; this._v(p[0] * s, p[1] * s, p[2] * s); }
  }
  this.glEnd();
};

// Entry points used by the import table (names match the C functions).
P.glutWireCube = function (s) { this.glutCube(s, true); };
P.glutSolidCube = function (s) { this.glutCube(s, false); };
P.glutWireSphere = function (r, a, b) { this.glutSphere(r, a, b, true); };
P.glutSolidSphere = function (r, a, b) { this.glutSphere(r, a, b, false); };
P.glutWireCone = function (base, h, sl, st) { this._tube(base, 0, h, sl, st, true, false); };
P.glutSolidCone = function (base, h, sl, st) { this._tube(base, 0, h, sl, st, false, true); };
P.glutWireCylinder = function (r, h, sl, st) { this._tube(r, r, h, sl, st, true, false); };
P.glutSolidCylinder = function (r, h, sl, st) { this._tube(r, r, h, sl, st, false, true); };
P.glutWireTorus = function (i, o, s, r) { this.glutTorus(i, o, s, r, true); };
P.glutSolidTorus = function (i, o, s, r) { this.glutTorus(i, o, s, r, false); };
P.glutWireTeapot = function (s) { this.glutTeapot(s, true); };
P.glutSolidTeapot = function (s) { this.glutTeapot(s, false); };
P.glutWireTetrahedron = function () { this._mesh(...TETRA, true); };
P.glutSolidTetrahedron = function () { this._mesh(...TETRA, false); };
P.glutWireOctahedron = function () { this._mesh(...OCTA, true); };
P.glutSolidOctahedron = function () { this._mesh(...OCTA, false); };
P.glutWireIcosahedron = function () { this._mesh(...ICOSA, true); };
P.glutSolidIcosahedron = function () { this._mesh(...ICOSA, false); };

// GLU quadrics. Quadric objects live in JS; C only sees an opaque handle.
const GLU_POINT = 100010, GLU_LINE = 100011, GLU_SILHOUETTE = 100013;
P.gluNewQuadric = function () { const id = this.nextQuadric++; this.quadrics.set(id, { style: 100012 }); return id; };
P.gluDeleteQuadric = function (q) { this.quadrics.delete(q); };
P.gluQuadricDrawStyle = function (q, style) { const o = this.quadrics.get(q); if (o) o.style = style; };
P._quadricWire = function (q) {
  const o = this.quadrics.get(q);
  if (!o) { this.warnOnce('badquad', 'GLU quadric used before gluNewQuadric() (or after gluDeleteQuadric()).'); return null; }
  if (o.style === GLU_POINT) this.warnOnce('qpt', 'GLU_POINT draw style is drawn as GLU_LINE.');
  return o.style === GLU_LINE || o.style === GLU_POINT || o.style === GLU_SILHOUETTE;
};
P.gluSphere = function (q, r, sl, st) { const w = this._quadricWire(q); if (w !== null) this.glutSphere(r, sl, st, w); };
P.gluCylinder = function (q, base, top, h, sl, st) { const w = this._quadricWire(q); if (w !== null) this._tube(base, top, h, sl, st, w, false); };
P.gluPartialDisk = function (q, inner, outer, slices, loops, start, sweep) {
  const w = this._quadricWire(q); if (w === null) return;
  slices = Math.max(3, slices | 0); loops = Math.max(1, loops | 0);
  // GLU angles: 0 = +y axis, clockwise positive
  const ang = (j) => (start + sweep * j / slices) * Math.PI / 180;
  const pt = (r, a) => [r * Math.sin(a), r * Math.cos(a), 0];
  this._n(0, 0, 1);
  for (let l = 0; l < loops; l++) {
    const r0 = inner + (outer - inner) * l / loops, r1 = inner + (outer - inner) * (l + 1) / loops;
    this.glBegin(w ? GLC.LINES : GLC.QUAD_STRIP);
    for (let j = 0; j <= slices; j++) {
      const a = ang(j);
      if (w) { if (j < slices) { this._v(...pt(r1, a)); this._v(...pt(r1, ang(j + 1))); this._v(...pt(r0, a)); this._v(...pt(r1, a)); } }
      else { this._v(...pt(r1, a)); this._v(...pt(r0, a)); }
    }
    this.glEnd();
  }
};
P.gluDisk = function (q, inner, outer, slices, loops) { this.gluPartialDisk(q, inner, outer, slices, loops, 0, 360); };
