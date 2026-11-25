// Reading the cube from two photos. Each photo shows one corner of the cube with three faces. The
// person places 7 points on the photo (the near corner and the 6 outer corners); the squares are found
// inside each face from those points, the colour of each square is measured on the phone, and the
// colours are grouped so that there are 9 of each. Nothing leaves the phone.
import { rot } from "./cube.js";
import { checkCube } from "./validate.js";

const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

/** The 7 points the person places, as cube corners seen in the standard view (top, front-left, front-right). */
export const HANDLES = {
  C: [1, 1, 1], T: [-1, 1, -1], UL: [-1, 1, 1], UR: [1, 1, -1], LL: [-1, -1, 1], B: [1, -1, 1], LR: [1, -1, -1],
};
export const HANDLE_ORDER = ["C", "T", "UR", "LR", "B", "LL", "UL"];

/** Where the handles start on a photo of width w and height h. */
export function defaultHandles(w, h) {
  const r = Math.min(w, h) * 0.36, cx = w / 2, cy = h / 2;
  const at = (v) => [cx + (v[0] - v[2]) * 0.866 * r * 0.5, cy + (-v[1] + 0.5 * (v[0] + v[2])) * r * 0.5];
  return Object.fromEntries(Object.entries(HANDLES).map(([name, v]) => [name, at(v)]));
}

/** The 27 squares seen in the standard view: top (y = 1), front (z = 1) and right (x = 1). */
export function viewStickers() {
  const out = [];
  for (const n of [[0, 1, 0], [0, 0, 1], [1, 0, 0]]) {
    const axis = n.findIndex((x) => x);
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++) {
        const p = [0, 0, 0];
        p[axis] = 1;
        const others = [0, 1, 2].filter((i) => i !== axis);
        p[others[0]] = a; p[others[1]] = b;
        out.push({ p, n: [...n] });
      }
  }
  return out;
}

/** Image point of a point on a visible face, by blending the face's 4 corner handles. */
export function imagePoint(handles, v, n) {
  const axis = n.findIndex((x) => x);
  const [i, j] = [0, 1, 2].filter((x) => x !== axis);
  const u = v[i] / 1.5, w = v[j] / 1.5;
  const corner = (su, sv) => {
    const c = [0, 0, 0];
    c[axis] = 1; c[i] = su; c[j] = sv;
    const name = Object.keys(HANDLES).find((h) => same(HANDLES[h], c));
    return handles[name];
  };
  let x = 0, y = 0;
  for (const su of [-1, 1])
    for (const sv of [-1, 1]) {
      const f = ((1 + su * u) / 2) * ((1 + sv * w) / 2);
      const p = corner(su, sv);
      x += p[0] * f; y += p[1] * f;
    }
  return [x, y];
}

/** Centre of each of the 27 squares in the photo, and a size to measure around it. */
export function squarePoints(handles) {
  return viewStickers().map((st) => {
    const centre = st.p.map((x, i) => x + st.n[i] * 0.5);
    const [x, y] = imagePoint(handles, centre, st.n);
    const axis = st.n.findIndex((v) => v);
    const side = [0, 1, 2].find((i) => i !== axis);
    const off = [...centre]; off[side] += 0.5;
    const [x2, y2] = imagePoint(handles, off, st.n);
    return { ...st, x, y, r: Math.max(2, Math.hypot(x2 - x, y2 - y) * 0.45) };
  });
}

/** Median colour of a small square of pixels around (x, y). */
export function measure(image, x, y, r) {
  const { width, height, data } = image;
  const rs = [], gs = [], bs = [];
  const step = Math.max(1, Math.floor(r / 4));
  for (let dy = -r; dy <= r; dy += step)
    for (let dx = -r; dx <= r; dx += step) {
      const px = Math.round(x + dx), py = Math.round(y + dy);
      if (px < 0 || py < 0 || px >= width || py >= height) continue;
      const o = (py * width + px) * 4;
      rs.push(data[o]); gs.push(data[o + 1]); bs.push(data[o + 2]);
    }
  const med = (a) => { a.sort((p, q) => p - q); return a[Math.floor(a.length / 2)] ?? 0; };
  return [med(rs), med(gs), med(bs)];
}

// ---------- colours ----------
function toLab([r, g, b]) {
  const f = (c) => { c /= 255; return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92; };
  const [R, G, B] = [f(r), f(g), f(b)];
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + B * 0.0722, Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const h = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * h(Y) - 16, 500 * (h(X) - h(Y)), 200 * (h(Y) - h(Z))];
}
// Lightness counts less than colour: shadows change it a lot.
const dist = (a, b) => Math.hypot((a[0] - b[0]) * 0.5, a[1] - b[1], a[2] - b[2]);
const TYPICAL = { W: [235, 235, 230], Y: [235, 215, 40], G: [20, 160, 80], B: [20, 70, 190], O: [245, 120, 25], R: [190, 25, 35] };

function permutations(list) {
  if (list.length <= 1) return [list];
  return list.flatMap((x, i) => permutations([...list.slice(0, i), ...list.slice(i + 1)]).map((p) => [x, ...p]));
}

/** Minimum-cost assignment (Hungarian method) of rows to columns of a square matrix. */
export function assign(cost) {
  const n = cost.length;
  const u = new Array(n + 1).fill(0), v = new Array(n + 1).fill(0), p = new Array(n + 1).fill(0), way = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(n + 1).fill(Infinity), used = new Array(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity, j1 = 0;
      for (let j = 1; j <= n; j++)
        if (!used[j]) {
          const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
          if (minv[j] < delta) { delta = minv[j]; j1 = j; }
        }
      for (let j = 0; j <= n; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const rowToCol = new Array(n);
  for (let j = 1; j <= n; j++) rowToCol[p[j] - 1] = j - 1;
  return rowToCol;
}

/**
 * Colours of 54 measured squares. samples: [{ rgb, photo, centre: bool }]. The 6 centres name the
 * colours; every other square joins one centre, 8 per centre, measuring against the colour of that
 * centre in the same photo when there is one.
 */
export function classify(samples) {
  const lab = samples.map((s) => toLab(s.rgb));
  const centres = samples.map((s, i) => (s.centre ? i : -1)).filter((i) => i >= 0);
  const names = Object.keys(TYPICAL);
  // Which centre is which colour: the best one-to-one match with typical colours.
  let best = null;
  for (const perm of permutations(names)) {
    const c = centres.reduce((acc, ci, j) => acc + dist(lab[ci], toLab(TYPICAL[perm[j]])), 0);
    if (!best || c < best.c) best = { c, perm };
  }
  const centreColour = new Map(centres.map((ci, j) => [ci, best.perm[j]]));
  const others = samples.map((s, i) => i).filter((i) => !samples[i].centre);
  // Reference colour of each class in each photo: start from the centres, then from the squares found.
  let refs = names.map((c) => { const ci = centres.find((x) => centreColour.get(x) === c); return { c, all: lab[ci], byPhoto: { [samples[ci].photo]: lab[ci] } }; });
  let result = null;
  for (let round = 0; round < 3; round++) {
    const cols = refs.flatMap((r) => Array(8).fill(r));
    const cost = others.map((i) => cols.map((r) => dist(lab[i], r.byPhoto[samples[i].photo] ?? r.all)));
    const pick = assign(cost);
    result = new Array(samples.length);
    for (const ci of centres) result[ci] = centreColour.get(ci);
    others.forEach((i, row) => (result[i] = cols[pick[row]].c));
    refs = names.map((c) => {
      const members = samples.map((s, i) => i).filter((i) => result[i] === c);
      const mean = (list) => list.length ? [0, 1, 2].map((d) => list.reduce((a, i) => a + lab[i][d], 0) / list.length) : null;
      const byPhoto = {};
      for (const ph of new Set(samples.map((s) => s.photo))) { const m = mean(members.filter((i) => samples[i].photo === ph)); if (m) byPhoto[ph] = m; }
      return { c, all: mean(members), byPhoto };
    });
  }
  return result;
}

// ---------- putting the two photos together ----------
const ROTS = (() => {
  // All 24 turns of the whole cube, as lists of (axis, quarter turns).
  const out = [], seen = new Set();
  const probe = (seq) => { let a = [1, 2, 3], b = [0, 0, 1]; for (const [ax, q] of seq) { a = rot(a, ax, q); b = rot(b, ax, q); } return a.join() + "|" + b.join(); };
  const queue = [[]];
  while (queue.length) {
    const seq = queue.shift();
    const key = probe(seq);
    if (seen.has(key)) continue;
    seen.add(key); out.push(seq);
    for (const m of [[0, 1], [1, 1]]) queue.push([...seq, m]);
  }
  return out;
})();
const applyRot = (v, seq) => seq.reduce((a, [ax, q]) => rot(a, ax, q), v);
const undoRot = (v, seq) => [...seq].reverse().reduce((a, [ax, q]) => rot(a, ax, -q), v);

/**
 * The cube from the colours of photo 1 and photo 2 (27 each, in viewStickers order). Photo 2 shows the
 * opposite corner; how the cube was turned between photos is not known, so the three possible ways are
 * tried and the one that gives a cube that can exist is kept.
 */
export function assemble(colours1, colours2) {
  const view = viewStickers();
  const first = view.map((st, i) => ({ p: st.p, n: st.n, c: colours1[i] }));
  const turns = ROTS.filter((seq) => same(applyRot([-1, -1, -1], seq), [1, 1, 1]));
  const options = turns.map((seq) => {
    const second = view.map((st, i) => ({ p: undoRot(st.p, seq), n: undoRot(st.n, seq), c: colours2[i] }));
    const state = [...first, ...second];
    return { state, check: checkCube(state) };
  });
  options.sort((a, b) => (b.check.ok - a.check.ok) || (a.check.problems.length - b.check.problems.length));
  return options[0];
}

/** Turns photo-2 positions back to the cube for the given turn (used by the tests). */
export const PHOTO2_TURNS = () => ROTS.filter((seq) => same(applyRot([-1, -1, -1], seq), [1, 1, 1]));
export { applyRot, undoRot, toLab };
