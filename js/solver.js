// The beginner's layer method, the same one the lessons teach. It works on the real state of any
// cube: it finds where each piece is, recognises the case and uses that case's algorithm.
// Every step says how to hold the cube (frame: which side is in front) and the turns to make,
// written as the person sees them with the cube held that way.
import {
  FACE_COLOR, SIDES, SIDE_VEC, D_EDGES, D_CORNERS, MIDDLE_EDGES, U_EDGES, U_CORNERS,
  applyMove, centerColor, findPiece, fixedToUser, piecePlaced, pieceSolved, stickerColor, toFixed, userToFixed,
  STAGE_CHECKS,
} from "./cube.js";

export const ALG = {
  sexy: ["R", "U", "R'", "U'"],
  right: ["U", "R", "U'", "R'", "U'", "F'", "U", "F"],
  left: ["U'", "L'", "U", "L", "U", "F", "U'", "F'"],
  cross: ["F", "R", "U", "R'", "U'", "F'"],
  sune: ["R", "U", "R'", "U", "R", "U2", "R'"],
  corners: ["U", "R", "U'", "L'", "U", "R'", "U'", "L"],
  twist: ["R'", "D'", "R", "D"],
};

export const STAGES = [
  "Cruz blanca",
  "Esquinas blancas",
  "Segunda capa",
  "Cruz amarilla",
  "Aristas amarillas en su sitio",
  "Esquinas amarillas en su sitio",
  "Girar las esquinas amarillas",
];

const U_TURNS = [[], ["U"], ["U2"], ["U'"]];
const UP = [0, 1, 0];

export const run = (state, frame, moves) => moves.reduce((s, m) => applyMove(s, toFixed(m, frame)), state);
const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const sideName = (v) => SIDES.find((f) => same(SIDE_VEC[f], v));
const userCenter = (vec, frame) => centerColor(userToFixed(vec, frame));

/** Merges turns of the same face in a row («U U» → «U2», «U U'» → nothing). */
export function simplify(moves) {
  const out = [];
  const q = (m) => (m.endsWith("2") ? 2 : m.endsWith("'") ? 3 : 1);
  for (const m of moves) {
    const last = out[out.length - 1];
    if (last && last[0] === m[0]) {
      const total = (q(last) + q(m)) % 4;
      out.pop();
      if (total) out.push(m[0] + ["", "", "2", "'"][total]);
    } else out.push(m);
  }
  return out;
}

class Plan {
  constructor(state) { this.state = state; this.steps = []; }
  add(stage, frame, moves, say, extra = {}) {
    const clean = simplify(moves);
    if (!clean.length) return;
    this.steps.push({ stage, frame, moves: clean, say, ...extra });
    this.state = run(this.state, frame, clean);
  }
}

// 1 · White cross (white centre down): each white edge under its own side colour.
function whiteCross(plan) {
  for (let k = 0; k < 4; k++) {
    const colors = ["W", FACE_COLOR[SIDES[k]]];
    const target = colors.join("");
    const done = D_EDGES.slice(0, k);
    const keep = (s) => done.every((p) => pieceSolved(s, p));
    for (let guard = 0; guard < 4 && !pieceSolved(plan.state, D_EDGES[k]); guard++) {
      const u = fixedToUser(findPiece(plan.state, colors), k);
      if (u[1] === -1) {
        const f = sideName([u[0], 0, u[2]]);
        plan.add(0, k, [f + "2"], "La arista está abajo, pero en un sitio que no es el suyo o dada la vuelta: súbela arriba girando esa cara dos veces.", { target, case: "abajo" });
      } else if (u[1] === 0) {
        const a = sideName([u[0], 0, 0]), b = sideName([0, 0, u[2]]);
        const options = [[a, "U", a + "'"], [a + "'", "U", a], [b, "U", b + "'"], [b + "'", "U", b]];
        const pick = options.find((o) => { const s = run(plan.state, k, o); return fixedToUser(findPiece(s, colors), k)[1] === 1 && keep(s); });
        plan.add(0, k, pick, "La arista está en la capa del medio: súbela arriba y devuelve la cara a su sitio, así no se estropea lo que ya está hecho.", { target, case: "medio" });
      } else {
        const whiteUp = stickerColor(plan.state, userToFixed(u, k), UP) === "W";
        const options = whiteUp ? [["F2"]] : [["U'", "R'", "F", "R"], ["U", "L", "F'", "L'"]];
        let found = null;
        for (let j = 0; j < 4 && !found; j++)
          for (const o of options) {
            const s = run(plan.state, k, [...U_TURNS[j], ...o]);
            if (pieceSolved(s, D_EDGES[k]) && keep(s)) { found = { j, o }; break; }
          }
        plan.add(0, k, U_TURNS[found.j], "Gira la capa de arriba hasta que la arista quede justo encima de su centro de color.", { target, case: whiteUp ? "arriba-blanco-arriba" : "arriba-blanco-lado", align: true });
        plan.add(0, k, found.o, whiteUp
          ? "El blanco mira hacia arriba: gira la cara de delante dos veces y la arista baja a su sitio."
          : "El blanco mira hacia delante: con estos cuatro giros la arista baja a su sitio bien colocada.", { target, case: whiteUp ? "arriba-blanco-arriba" : "arriba-blanco-lado" });
      }
    }
  }
}

// 2 · White corners: the corner above its place and «derecha arriba, arriba izquierda, derecha abajo, arriba derecha» until it fits.
function whiteCorners(plan) {
  for (let k = 0; k < 4; k++) {
    const colors = ["W", FACE_COLOR[SIDES[k]], FACE_COLOR[SIDES[(k + 1) % 4]]];
    const target = colors.join("");
    const slot = D_CORNERS[k];
    for (let guard = 0; guard < 3 && !pieceSolved(plan.state, slot); guard++) {
      const at = findPiece(plan.state, colors);
      if (at[1] === -1) {
        const f = [0, 1, 2, 3].find((i) => same(userToFixed([1, -1, 1], i), at));
        plan.add(1, f, ALG.sexy, "La esquina está abajo pero mal colocada: ponla delante a la derecha y haz el algoritmo una vez para sacarla arriba.", { target, case: "abajo" });
        continue;
      }
      const j = [0, 1, 2, 3].find((i) => same(findPiece(run(plan.state, k, U_TURNS[i]), colors), userToFixed([1, 1, 1], k)));
      plan.add(1, k, U_TURNS[j], "Gira la capa de arriba hasta que la esquina quede justo encima de su sitio: arriba, delante a la derecha.", { target, align: true });
      const whereWhite = (s) => { const p = userToFixed([1, 1, 1], k); return ["arriba", "delante", "derecha"][[UP, userToFixed([0, 0, 1], k), userToFixed([1, 0, 0], k)].findIndex((n) => stickerColor(s, p, n) === "W")]; };
      const kind = whereWhite(plan.state) ?? "abajo";
      for (let r = 1; r <= 6 && !pieceSolved(plan.state, slot); r++)
        plan.add(1, k, ALG.sexy, `Repite el algoritmo hasta que la esquina quede en su sitio con el blanco abajo (vez ${r}).`, { target, case: "blanco-" + kind, rep: r });
    }
  }
}

// 3 · Second layer: an edge without yellow, matched with its centre, goes down to the right or to the left.
function secondLayer(plan) {
  for (let guard = 0; guard < 12 && !STAGE_CHECKS[2](plan.state); guard++) {
    let found = null;
    for (let j = 0; j < 4 && !found; j++)
      for (let f = 0; f < 4 && !found; f++) {
        const s = run(plan.state, f, U_TURNS[j]);
        const p = userToFixed([0, 1, 1], f);
        const top = stickerColor(s, p, UP), front = stickerColor(s, p, userToFixed([0, 0, 1], f));
        if (top === "Y" || front === "Y" || front !== userCenter([0, 0, 1], f)) continue;
        if (top === userCenter([1, 0, 0], f)) found = { j, f, alg: ALG.right, side: "derecha" };
        else if (top === userCenter([-1, 0, 0], f)) found = { j, f, alg: ALG.left, side: "izquierda" };
      }
    if (found) {
      plan.add(2, found.f, U_TURNS[found.j], "Busca arriba una arista sin amarillo y gira la capa de arriba hasta que su color de delante coincida con el centro de delante.", { case: found.side, align: true });
      plan.add(2, found.f, found.alg, `El color de arriba de la arista es el del centro de la ${found.side}: llévala a la ${found.side} con su algoritmo.`, { case: found.side });
      continue;
    }
    const f = [0, 1, 2, 3].find((i) => !pieceSolved(plan.state, userToFixed([1, 0, 1], i)));
    plan.add(2, f, ALG.right, "No queda ninguna arista buena arriba: hay una atascada en el medio. Ponla delante a la derecha y haz el algoritmo de la derecha para sacarla.", { case: "atascada" });
  }
}

const yellowEdges = (s, frame = 0) => [[0, 1, 1], [1, 1, 0], [0, 1, -1], [-1, 1, 0]].map((u) => stickerColor(s, userToFixed(u, frame), UP) === "Y");

// 4 · Yellow cross: dot → L → line → cross, always with the same algorithm.
export function yellowCrossCase(s) {
  const y = yellowEdges(s), n = y.filter(Boolean).length;
  if (n === 4) return "cruz";
  if (n === 0) return "punto";
  return (y[0] && y[2]) || (y[1] && y[3]) ? "linea" : "ele";
}
function yellowCross(plan) {
  for (let guard = 0; guard < 4; guard++) {
    const kind = yellowCrossCase(plan.state);
    if (kind === "cruz") return;
    if (kind === "punto") { plan.add(3, 0, ALG.cross, "Solo se ve el punto amarillo del centro: haz el algoritmo una vez y saldrá una «L».", { case: "punto" }); continue; }
    const j = [0, 1, 2, 3].find((i) => {
      const y = yellowEdges(run(plan.state, 0, U_TURNS[i]));
      return kind === "linea" ? y[1] && y[3] : y[2] && y[3];
    });
    plan.add(3, 0, U_TURNS[j], kind === "linea" ? "Gira la capa de arriba hasta que la línea amarilla quede de izquierda a derecha." : "Gira la capa de arriba hasta que la «L» amarilla quede arriba a la izquierda: un brazo hacia atrás y otro hacia la izquierda.", { case: kind, align: true });
    plan.add(3, 0, ALG.cross, kind === "linea" ? "Con la línea de lado a lado, el algoritmo completa la cruz." : "Con la «L» en su sitio, el algoritmo la convierte en línea.", { case: kind });
  }
}

const edgeMatches = (s) => U_EDGES.filter((p) => pieceSolved(s, p)).length;
const bestTurn = (s) => [0, 1, 2, 3].map((t) => ({ t, n: edgeMatches(run(s, 0, U_TURNS[t])) })).sort((a, b) => b.n - a.n)[0];

// 5 · Yellow edges in their place: two correct ones behind and to the right, then the algorithm.
function yellowEdgesPlace(plan) {
  for (let guard = 0; guard < 4; guard++) {
    const now = bestTurn(plan.state);
    if (now.n === 4) { plan.add(4, 0, U_TURNS[now.t], "Gira la capa de arriba hasta que las cuatro aristas coincidan con sus centros.", { case: "final", align: true }); return; }
    let best = null;
    for (let j = 0; j < 4; j++)
      for (let f = 0; f < 4; f++) {
        const s = run(run(plan.state, f, U_TURNS[j]), f, ALG.sune);
        const after = bestTurn(s);
        if (!best || after.n > best.n) best = { j, f, n: after.n };
      }
    const pair = now.n === 2 && edgeMatches(plan.state) === 2 ? "juntas" : "enfrente";
    plan.add(4, best.f, U_TURNS[best.j], "Gira la capa de arriba para que dos aristas coincidan con su centro y colócate con ellas detrás y a la derecha.", { case: pair, align: true });
    plan.add(4, best.f, ALG.sune, "Haz el algoritmo: las otras dos aristas cambian de sitio.", { case: pair });
  }
}

// 6 · Yellow corners in their place (turned any way).
function yellowCornersPlace(plan) {
  for (let guard = 0; guard < 4 && !STAGE_CHECKS[5](plan.state); guard++) {
    const f = [0, 1, 2, 3].find((i) => piecePlaced(plan.state, userToFixed([1, 1, 1], i)));
    if (f === undefined) plan.add(5, 0, ALG.corners, "Ninguna esquina está en su sitio: haz el algoritmo una vez y al menos una quedará bien colocada.", { case: "ninguna" });
    else plan.add(5, f, ALG.corners, "Pon delante a la derecha la esquina que ya está en su sitio y haz el algoritmo: las otras tres giran de sitio.", { case: "una" });
  }
}

// 7 · Turning the yellow corners: «derecha abajo, abajo izquierda, derecha arriba, abajo derecha» until yellow is up, then only the top layer turns.
function yellowCornersTwist(plan) {
  const corner = [1, 1, 1];
  const allUp = (s) => U_CORNERS.every((p) => stickerColor(s, p, UP) === "Y");
  for (let guard = 0; guard < 4 && !allUp(plan.state); guard++) {
    for (let r = 1; r <= 6 && stickerColor(plan.state, corner, UP) !== "Y"; r++)
      plan.add(6, 0, ALG.twist, `Repite el algoritmo hasta que la esquina de delante a la derecha tenga el amarillo arriba (vez ${r}). Lo de abajo se desordena un momento: es normal.`, { case: "girar", rep: r });
    if (!allUp(plan.state)) plan.add(6, 0, ["U"], "Gira solo la capa de arriba para traer la siguiente esquina delante a la derecha. No gires el cubo entero.", { case: "siguiente" });
  }
  const t = [0, 1, 2, 3].find((i) => STAGE_CHECKS[6](run(plan.state, 0, U_TURNS[i])));
  plan.add(6, 0, U_TURNS[t ?? 0], "Gira la capa de arriba hasta que todo coincida. ¡Cubo resuelto!", { case: "final", align: true });
}

const SOLVERS = [whiteCross, whiteCorners, secondLayer, yellowCross, yellowEdgesPlace, yellowCornersPlace, yellowCornersTwist];

/** The steps of one stage from this state (earlier stages must be done). */
export function solveStage(state, stage) {
  const plan = new Plan(state);
  SOLVERS[stage](plan);
  if (!STAGE_CHECKS[stage](plan.state)) throw Error("STAGE_NOT_DONE " + stage);
  return { steps: plan.steps, state: plan.state };
}

/** All the steps to solve the cube, stage by stage. */
export function solve(state, upTo = 6) {
  let s = state;
  const steps = [];
  for (let stage = 0; stage <= upTo; stage++) {
    const r = solveStage(s, stage);
    steps.push(...r.steps);
    s = r.state;
  }
  return { steps, state: s };
}

/** The first stage that is not done yet (7 when solved). */
export function currentStage(state) {
  const i = STAGE_CHECKS.findIndex((check) => !check(state));
  return i < 0 ? 7 : i;
}
