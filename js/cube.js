// The cube model: 54 stickers, each with its position, the direction it faces and its colour.
// Fixed frame: x to the right, y up, z towards the viewer. Yellow is up and white is down for the
// whole course (beginner's layer method).

export const FACE_NORMAL = {
  U: [0, 1, 0], D: [0, -1, 0], F: [0, 0, 1], B: [0, 0, -1], R: [1, 0, 0], L: [-1, 0, 0],
};
export const FACE_COLOR = { U: "Y", D: "W", F: "G", B: "B", R: "O", L: "R" };
export const COLOR_NAME = { Y: "amarilla", W: "blanca", G: "verde", B: "azul", O: "naranja", R: "roja" };
/** The four sides in order around the cube (seen from above, turning to the right). */
export const SIDES = ["F", "R", "B", "L"];

// Layer turns. q is the quarter turn of a clockwise turn (seen from that face) around the +axis.
const TURN = {
  U: { axis: 1, layer: 1, q: -1 }, D: { axis: 1, layer: -1, q: 1 },
  R: { axis: 0, layer: 1, q: -1 }, L: { axis: 0, layer: -1, q: 1 },
  F: { axis: 2, layer: 1, q: -1 }, B: { axis: 2, layer: -1, q: 1 },
};

/** Rotates a vector a number of quarter turns around one axis (right-hand rule). */
export function rot(v, axis, quarters) {
  let [x, y, z] = v;
  const n = ((quarters % 4) + 4) % 4;
  for (let i = 0; i < n; i++) {
    if (axis === 0) [y, z] = [-z, y];
    else if (axis === 1) [x, z] = [z, -x];
    else [x, y] = [-y, x];
  }
  return [x, y, z];
}

export function solvedCube() {
  const stickers = [];
  for (const face of Object.keys(FACE_NORMAL)) {
    const n = FACE_NORMAL[face];
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++) {
        const p = n[0] ? [n[0], a, b] : n[1] ? [a, n[1], b] : [a, b, n[2]];
        stickers.push({ p, n: [...n], c: FACE_COLOR[face] });
      }
  }
  return stickers;
}

export const clone = (state) => state.map((s) => ({ p: [...s.p], n: [...s.n], c: s.c }));

/** Parses «R», «R'» or «R2». */
export function parseMove(token) {
  const face = token[0];
  if (!TURN[face]) throw Error("BAD_MOVE " + token);
  const amount = token.endsWith("2") ? 2 : token.endsWith("'") ? -1 : 1;
  return { face, amount, ...TURN[face] };
}

/** Applies a move (fixed frame) to a copy of the state. */
export function applyMove(state, token) {
  const m = parseMove(token);
  const quarters = m.q * m.amount;
  return state.map((s) =>
    s.p[m.axis] === m.layer
      ? { p: rot(s.p, m.axis, quarters), n: rot(s.n, m.axis, quarters), c: s.c }
      : s,
  );
}

export const applyMoves = (state, tokens) => tokens.reduce(applyMove, state);

export function inverse(token) {
  if (token.endsWith("2")) return token;
  return token.endsWith("'") ? token[0] : token[0] + "'";
}

/**
 * The person turns the whole cube so that side `frame` (0 green, 1 orange, 2 blue, 3 red) is in front.
 * A move they make with the cube held that way is this move of the fixed frame.
 */
export function toFixed(token, frame) {
  const i = SIDES.indexOf(token[0]);
  if (i < 0) return token;
  return SIDES[(i + frame) % 4] + token.slice(1);
}

/** A position seen by the person (cube turned to `frame`) in the fixed frame. */
export const userToFixed = (v, frame) => rot(v, 1, frame);
export const fixedToUser = (v, frame) => rot(v, 1, -frame);

const key = (v) => v.join(",");
const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

export function centerColor(normal) {
  for (const face of Object.keys(FACE_NORMAL)) if (same(FACE_NORMAL[face], normal)) return FACE_COLOR[face];
  throw Error("BAD_NORMAL");
}

/** The stickers of the piece at a position. */
export const piece = (state, pos) => state.filter((s) => same(s.p, pos));

/** The position of the piece with exactly these colours. */
export function findPiece(state, colors) {
  const wanted = [...colors].sort().join("");
  const groups = new Map();
  for (const s of state) {
    const k = key(s.p);
    groups.set(k, (groups.get(k) ?? "") + s.c);
  }
  for (const [k, c] of groups)
    if ([...c].sort().join("") === wanted) return k.split(",").map(Number);
  throw Error("PIECE_NOT_FOUND " + colors.join(""));
}

/** Colour of the sticker at a position looking in a direction (undefined when none). */
export const stickerColor = (state, pos, normal) => state.find((s) => same(s.p, pos) && same(s.n, normal))?.c;

/** The piece is in its place and turned the right way. */
export const pieceSolved = (state, pos) => piece(state, pos).every((s) => s.c === centerColor(s.n));

/** The piece is in its place, turned any way. */
export function piecePlaced(state, pos) {
  const colors = piece(state, pos).map((s) => s.c).sort().join("");
  const homes = [];
  pos.forEach((v, axis) => { if (v) { const n = [0, 0, 0]; n[axis] = v; homes.push(centerColor(n)); } });
  return colors === homes.sort().join("");
}

export const isSolved = (state) => state.every((s) => s.c === centerColor(s.n));

// Positions (fixed frame) used by the method.
export const SIDE_VEC = { F: [0, 0, 1], R: [1, 0, 0], B: [0, 0, -1], L: [-1, 0, 0] };
export const D_EDGES = SIDES.map((f) => [SIDE_VEC[f][0], -1, SIDE_VEC[f][2]]);
export const U_EDGES = SIDES.map((f) => [SIDE_VEC[f][0], 1, SIDE_VEC[f][2]]);
export const D_CORNERS = SIDES.map((f, i) => { const a = SIDE_VEC[f], b = SIDE_VEC[SIDES[(i + 1) % 4]]; return [a[0] + b[0], -1, a[2] + b[2]]; });
export const U_CORNERS = D_CORNERS.map(([x, , z]) => [x, 1, z]);
export const MIDDLE_EDGES = D_CORNERS.map(([x, , z]) => [x, 0, z]);

export const STAGE_CHECKS = [
  (s) => D_EDGES.every((p) => pieceSolved(s, p)),
  (s) => D_CORNERS.every((p) => pieceSolved(s, p)),
  (s) => MIDDLE_EDGES.every((p) => pieceSolved(s, p)),
  (s) => U_EDGES.every((p) => stickerColor(s, p, [0, 1, 0]) === "Y"),
  (s) => U_EDGES.every((p) => pieceSolved(s, p)),
  (s) => U_CORNERS.every((p) => piecePlaced(s, p)),
  (s) => isSolved(s),
];

/** A random mix of `count` turns that never turns the same face twice in a row. */
export function randomScramble(count = 25, random = Math.random) {
  const faces = Object.keys(TURN), out = [];
  while (out.length < count) {
    const f = faces[Math.floor(random() * 6)];
    if (out.length && out[out.length - 1][0] === f) continue;
    out.push(f + ["", "'", "2"][Math.floor(random() * 3)]);
  }
  return out;
}
