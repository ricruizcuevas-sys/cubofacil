// Flat drawings of the cube (SVG), as in the printed guide: top, front and right faces, or the bottom
// instead of the top. Used by the guide and by the lessons in the app.
import { parseMove, rot } from "./cube.js";

const same = (a, b) => a.every((v, i) => v === b[i]);
const pieceKey = (state, pos) => state.filter((s) => same(s.p, pos)).map((s) => s.c).sort().join("");
export const COLOR = { Y: "#FFD500", W: "#FFFFFF", G: "#16A34A", B: "#1D4ED8", O: "#F97316", R: "#DC2626" };
export const GREY = "#8E959F";
export const PINK = "#E11D74";

// ---------- drawing ----------
const P = (v, below) => [(v[0] - v[2]) * 0.866, below ? -v[1] - 0.5 * (v[0] + v[2]) : -v[1] + 0.5 * (v[0] + v[2])];
const pts = (list, below) => list.map((v) => P(v, below).map((x) => x.toFixed(3)).join(",")).join(" ");
const axesBut = (n) => [0, 1, 2].filter((a) => !n[a]).map((a) => { const u = [0, 0, 0]; u[a] = 1; return u; });
const add = (a, b, k = 1) => a.map((v, i) => v + b[i] * k);

/** One drawing of the cube. show(sticker, key) decides which stickers keep their colour. */
export function draw(state, { show = () => true, hl = [], move = null, below = false, w = 128 } = {}) {
  const faces = below ? [[1, 0, 0], [0, -1, 0], [0, 0, 1]] : [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  let svg = "";
  for (const n of faces) {
    const [u, v] = axesBut(n);
    const c = n.map((x) => x * 1.5);
    svg += `<polygon points="${pts([add(add(c, u, 1.5), v, 1.5), add(add(c, u, 1.5), v, -1.5), add(add(c, u, -1.5), v, -1.5), add(add(c, u, -1.5), v, 1.5)], below)}" fill="#1F2328" stroke="#1F2328" stroke-width="0.12" stroke-linejoin="round"/>`;
  }
  const hlSet = new Set(hl);
  const outlines = [];
  for (const s of state) {
    if (!faces.some((n) => same(n, s.n))) continue;
    const key = pieceKey(state, s.p);
    const isCenter = key.length === 1;
    const fill = isCenter || show(s, key) ? COLOR[s.c] : GREY;
    const [u, v] = axesBut(s.n);
    const c = add(s.p, s.n, 0.5);
    const d = 0.43;
    const poly = pts([add(add(c, u, d), v, d), add(add(c, u, d), v, -d), add(add(c, u, -d), v, -d), add(add(c, u, -d), v, d)], below);
    svg += `<polygon points="${poly}" fill="${fill}" stroke="#1F2328" stroke-width="0.03" stroke-linejoin="round"/>`;
    if (hlSet.has(key)) outlines.push(`<polygon points="${poly}" fill="none" stroke="${PINK}" stroke-width="0.13" stroke-linejoin="round"/>`);
  }
  svg += outlines.join("");
  if (move) svg += arrow(move, below);
  return `<svg viewBox="-2.95 -3.25 5.9 6.5" width="${w}" height="${Math.round(w * 6.5 / 5.9)}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`;
}

function head(a, b) {
  const [x1, y1] = a, [x2, y2] = b;
  const l = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / l, uy = (y2 - y1) / l;
  const s = 0.42;
  const p1 = [x2 - ux * s - uy * s * 0.6, y2 - uy * s + ux * s * 0.6];
  const p2 = [x2 - ux * s + uy * s * 0.6, y2 - uy * s - ux * s * 0.6];
  const tip = [x2 + ux * 0.12, y2 + uy * 0.12];
  return [tip, p1, p2].map((p) => p.map((x) => x.toFixed(3)).join(",")).join(" ");
}

/** The arrow that shows the turn, drawn on the front face. */
function arrow(token, below) {
  const m = parseMove(token);
  const sign = Math.sign(m.q * (m.amount === 2 ? 1 : m.amount));
  let path3;
  if (m.axis === 2) {
    const r = 0.95, a0 = (120 * Math.PI) / 180;
    path3 = Array.from({ length: 31 }, (_, i) => { const a = a0 + sign * (i / 30) * (260 * Math.PI) / 180; return [r * Math.cos(a), r * Math.sin(a), 1.52]; });
  } else {
    const q = m.axis === 0 ? [m.layer, 0, 1.52] : [0, m.layer, 1.52];
    const q2 = rot(q, m.axis, sign);
    let d = [q2[0] - q[0], q2[1] - q[1], 0];
    const l = Math.hypot(...d);
    d = d.map((x) => x / l);
    path3 = [add(q, d, -1.25), add(q, d, 1.25)];
  }
  const p2 = path3.map((v) => P(v, below));
  const line = p2.map((p) => p.map((x) => x.toFixed(3)).join(",")).join(" ");
  const end = p2[p2.length - 1], prev = p2[p2.length - 2];
  const tri = head(prev, end);
  let out = `<polyline points="${line}" fill="none" stroke="#fff" stroke-width="0.36" stroke-linecap="round" stroke-linejoin="round"/>`;
  out += `<polygon points="${tri}" fill="#fff" stroke="#fff" stroke-width="0.22" stroke-linejoin="round"/>`;
  out += `<polyline points="${line}" fill="none" stroke="#111" stroke-width="0.17" stroke-linecap="round" stroke-linejoin="round"/>`;
  out += `<polygon points="${tri}" fill="#111"/>`;
  if (m.amount === 2) {
    const [x, y] = p2[0];
    out += `<circle cx="${x}" cy="${y}" r="0.42" fill="#111" stroke="#fff" stroke-width="0.08"/><text x="${x}" y="${y + 0.15}" class="x2">×2</text>`;
  }
  return out;
}
