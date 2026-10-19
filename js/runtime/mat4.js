// Column-major 4x4 matrix helpers (same memory layout as OpenGL).
export const ident = () => { const m = new Float64Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; };
export const copy = (m) => new Float64Array(m);

// returns a*b
export function mul(a, b) {
  const o = new Float64Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}

export function translate(x, y, z) { const m = ident(); m[12] = x; m[13] = y; m[14] = z; return m; }
export function scale(x, y, z) { const m = ident(); m[0] = x; m[5] = y; m[10] = z; return m; }

export function rotate(angleDeg, x, y, z) {
  const len = Math.hypot(x, y, z);
  const m = ident();
  if (len === 0) return m;
  x /= len; y /= len; z /= len;
  const a = angleDeg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), t = 1 - c;
  m[0] = x * x * t + c;     m[4] = x * y * t - z * s; m[8] = x * z * t + y * s;
  m[1] = y * x * t + z * s; m[5] = y * y * t + c;     m[9] = y * z * t - x * s;
  m[2] = x * z * t - y * s; m[6] = y * z * t + x * s; m[10] = z * z * t + c;
  return m;
}

export function ortho(l, r, b, t, n, f) {
  const m = ident();
  m[0] = 2 / (r - l); m[5] = 2 / (t - b); m[10] = -2 / (f - n);
  m[12] = -(r + l) / (r - l); m[13] = -(t + b) / (t - b); m[14] = -(f + n) / (f - n);
  return m;
}

export function frustum(l, r, b, t, n, f) {
  const m = new Float64Array(16);
  m[0] = 2 * n / (r - l); m[5] = 2 * n / (t - b);
  m[8] = (r + l) / (r - l); m[9] = (t + b) / (t - b); m[10] = -(f + n) / (f - n); m[11] = -1;
  m[14] = -2 * f * n / (f - n);
  return m;
}

export function perspective(fovy, aspect, n, f) {
  const ymax = n * Math.tan(fovy * Math.PI / 360);
  return frustum(-ymax * aspect, ymax * aspect, -ymax, ymax, n, f);
}

export function lookAt(ex, ey, ez, cx, cy, cz, ux, uy, uz) {
  let fx = cx - ex, fy = cy - ey, fz = cz - ez;
  let l = Math.hypot(fx, fy, fz) || 1; fx /= l; fy /= l; fz /= l;
  let sx = fy * uz - fz * uy, sy = fz * ux - fx * uz, sz = fx * uy - fy * ux;
  l = Math.hypot(sx, sy, sz) || 1; sx /= l; sy /= l; sz /= l;
  const vx = sy * fz - sz * fy, vy = sz * fx - sx * fz, vz = sx * fy - sy * fx;
  const m = ident();
  m[0] = sx; m[4] = sy; m[8] = sz;
  m[1] = vx; m[5] = vy; m[9] = vz;
  m[2] = -fx; m[6] = -fy; m[10] = -fz;
  return mul(m, translate(-ex, -ey, -ez));
}

export function xform(m, x, y, z, w) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12] * w,
    m[1] * x + m[5] * y + m[9] * z + m[13] * w,
    m[2] * x + m[6] * y + m[10] * z + m[14] * w,
    m[3] * x + m[7] * y + m[11] * z + m[15] * w,
  ];
}

// Inverse-transpose of the upper-left 3x3 (for transforming normals).
export function normalMatrix(m) {
  const a = m[0], b = m[4], c = m[8], d = m[1], e = m[5], f = m[9], g = m[2], h = m[6], i = m[10];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-30) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const D = -(b * i - c * h), E = a * i - c * g, F = -(a * h - b * g);
  const G = b * f - c * e, H = -(a * f - c * d), I = a * e - b * d;
  // inverse = adj^T / det; inverse-transpose = adj / det  (row-major result rows)
  return [A / det, B / det, C / det, D / det, E / det, F / det, G / det, H / det, I / det];
}
