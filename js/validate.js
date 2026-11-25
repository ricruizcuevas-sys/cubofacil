// Checks that a cube read from photos (or painted by hand) can exist, and says what to look at when not.
import { COLOR_NAME } from "./cube.js";
import { pieceName, colorWord } from "./words.js";

const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const k = (v) => v.join(",");
const det = (a, b, c) => a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
const PLURAL = { W: "blancas", Y: "amarillas", G: "verdes", B: "azules", O: "naranjas", R: "rojas" };

/** The three faces of a corner position in one fixed turning order (same hand for every corner). */
function cornerOrder(pos) {
  const ny = [0, pos[1], 0], nx = [pos[0], 0, 0], nz = [0, 0, pos[2]];
  return det(ny, nx, nz) > 0 ? [ny, nx, nz] : [ny, nz, nx];
}
function parity(perm) {
  const seen = new Array(perm.length).fill(false);
  let p = 0;
  for (let i = 0; i < perm.length; i++) {
    if (seen[i]) continue;
    let len = 0;
    for (let j = i; !seen[j]; j = perm[j]) { seen[j] = true; len++; }
    p += len - 1;
  }
  return p % 2;
}

/**
 * Returns { ok, problems: [{ text, pieces: [position keys] }] }. The checks go from the easiest to see
 * (how many squares of each colour) to the ones a person cannot see (twists and swaps).
 */
export function checkCube(state) {
  const problems = [];
  const count = {};
  for (const s of state) count[s.c] = (count[s.c] ?? 0) + 1;
  const colours = Object.keys(COLOR_NAME);
  const over = colours.filter((c) => (count[c] ?? 0) > 9), under = colours.filter((c) => (count[c] ?? 0) < 9);
  if (over.length || under.length) {
    const say = (c) => `${count[c] ?? 0} ${PLURAL[c]}`;
    problems.push({ text: `Tiene que haber 9 casillas de cada color. Ahora hay ${[...over, ...under].map(say).join(", ").replace(/, ([^,]*)$/, " y $1")}.`, pieces: [] });
    return { ok: false, problems };
  }
  const centres = state.filter((s) => s.p.filter((x) => x).length === 1);
  const centreAt = new Map(centres.map((s) => [k(s.n), s.c]));
  const normalOf = new Map(centres.map((s) => [s.c, s.n]));
  if (normalOf.size !== 6) {
    problems.push({ text: "Los 6 centros tienen que ser de 6 colores distintos.", pieces: centres.map((s) => k(s.p)) });
    return { ok: false, problems };
  }
  const opposite = [["W", "Y"], ["G", "B"], ["O", "R"]].filter(([a, b]) => !same(normalOf.get(a), normalOf.get(b).map((x) => -x)));
  if (opposite.length) {
    problems.push({ text: `En un cubo normal el centro ${opposite.map(([a, b]) => `${colorWord(a)} está enfrente del ${colorWord(b)}`).join(" y el ")}. Revisa los centros.`, pieces: centres.map((s) => k(s.p)) });
    return { ok: false, problems };
  }

  // Each piece: its colours must exist on a real piece, and only once.
  const groups = new Map();
  for (const s of state) if (s.p.filter((x) => x).length > 1) { const key = k(s.p); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(s); }
  const homeOf = new Map(); // position -> home position
  const seen = new Map();
  for (const [pos, stickers] of groups) {
    const colors = stickers.map((s) => s.c);
    const name = pieceName(colors);
    const normals = colors.map((c) => normalOf.get(c));
    const home = normals.reduce((a, n) => [a[0] + n[0], a[1] + n[1], a[2] + n[2]], [0, 0, 0]);
    const real = new Set(colors).size === colors.length && home.filter((x) => x).length === colors.length && home.every((x) => Math.abs(x) <= 1);
    if (!real) { problems.push({ text: `La pieza ${name} no existe en un cubo. Revisa sus casillas.`, pieces: [pos] }); continue; }
    const hk = k(home);
    if (seen.has(hk)) { problems.push({ text: `La pieza ${name} aparece dos veces. Una de las dos está mal leída.`, pieces: [seen.get(hk), pos] }); continue; }
    seen.set(hk, pos);
    homeOf.set(pos, home);
  }
  if (problems.length) return { ok: false, problems };

  // Corners: colours in the right turning order, and twists that add up.
  let twist = 0, flip = 0;
  const cornerPos = [...groups.keys()].filter((p) => groups.get(p).length === 3).sort();
  const edgePos = [...groups.keys()].filter((p) => groups.get(p).length === 2).sort();
  for (const pos of cornerPos) {
    const p = pos.split(",").map(Number);
    const here = cornerOrder(p).map((n) => groups.get(pos).find((s) => same(s.n, n)).c);
    const home = homeOf.get(pos);
    const there = cornerOrder(home).map((n) => centreAt.get(k(n)));
    const t = here.indexOf(there[0]);
    if (![0, 1, 2].some((r) => [0, 1, 2].every((i) => here[(i + r) % 3] === there[i]))) {
      problems.push({ text: `La esquina ${pieceName(here)} tiene los colores en un orden imposible: dos de sus casillas están cambiadas.`, pieces: [pos] });
      continue;
    }
    twist += t;
  }
  for (const pos of edgePos) {
    const p = pos.split(",").map(Number);
    const home = homeOf.get(pos);
    const primaryHome = home[1] ? [0, home[1], 0] : [0, 0, home[2]];
    const primaryColour = centreAt.get(k(primaryHome));
    const primaryHere = p[1] ? [0, p[1], 0] : [0, 0, p[2]];
    const st = groups.get(pos).find((s) => s.c === primaryColour);
    if (!same(st.n, primaryHere)) flip++;
  }
  if (problems.length) return { ok: false, problems };
  if (twist % 3) problems.push({ text: "Hay una esquina girada de una forma imposible. Suele ser una casilla de esquina mal leída: revisa las esquinas.", pieces: cornerPos });
  if (flip % 2) problems.push({ text: "Hay una arista dada la vuelta de una forma imposible. Suele ser una casilla de arista mal leída: revisa las aristas.", pieces: edgePos });
  // perm[i] = where the piece that belongs at position i is now.
  const cp = cornerPos.map((pos) => cornerPos.findIndex((q) => k(homeOf.get(q)) === pos));
  const ep = edgePos.map((pos) => edgePos.findIndex((q) => k(homeOf.get(q)) === pos));
  if (!problems.length && parity(cp) !== parity(ep)) problems.push({ text: "Hay dos piezas cambiadas de sitio de una forma imposible. Suele ser que dos casillas están intercambiadas: revisa los colores.", pieces: [] });
  return { ok: !problems.length, problems };
}
