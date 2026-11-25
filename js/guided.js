// The guide's method on any cube, exactly as the person holds it. The plan is a list of steps, and each
// step is one thing the person does: a layer turn, a turn of the whole cube, or something to read.
// Nothing depends on a fixed orientation: colours are found through the centres.
import { applyMove, rot } from "./cube.js";
import { WORD, CUBE_WORD, pieceName, centreName, colorWord } from "./words.js";

export const ALG = {
  T: "R' D' R D",
  RIGHT: "U R U' R' U' F' U F",
  LEFT: "U' L' U L U F U' F'",
  CROSS: "F R U R' U' F'",
  SWAP: "R U R' U R U2 R' U",
  PLACE: "U R U' L' U R' U' L",
};
const seq = (t) => t.trim().split(/\s+/);

/** Why each turn of each algorithm is there (owner, 25/11/2026: the tutorial explains, it does not only dictate). */
export const WHY = {
  T: [
    "Bajamos la columna de la derecha: el sitio de la esquina, arriba a la derecha, baja.",
    "Apartamos la capa de abajo hacia la izquierda para no romper nada al volver a subir.",
    "Subimos otra vez la columna de la derecha.",
    "Devolvemos la capa de abajo. Cada vez que repites estos 4 giros, la esquina de delante a la derecha gira un poco hasta quedar bien.",
  ],
  RIGHT: [
    "Apartamos la arista hacia la izquierda: deja libre el sitio de arriba a la derecha.",
    "Subimos la columna de la derecha: el hueco de la fila del medio sube arriba.",
    "Ponemos la arista encima de ese hueco.",
    "Bajamos la columna de la derecha: la arista queda emparejada con su esquina.",
    "Giramos arriba para preparar la cara de delante.",
    "Abrimos la cara de delante.",
    "Devolvemos la capa de arriba.",
    "Cerramos la cara de delante: la arista entra en la fila del medio y la esquina vuelve a su sitio.",
  ],
  LEFT: [
    "Apartamos la arista hacia la derecha: deja libre el sitio de arriba a la izquierda.",
    "Subimos la columna de la izquierda: el hueco de la fila del medio sube arriba.",
    "Ponemos la arista encima de ese hueco.",
    "Bajamos la columna de la izquierda: la arista queda emparejada con su esquina.",
    "Giramos arriba para preparar la cara de delante.",
    "Abrimos la cara de delante, hacia el otro lado.",
    "Devolvemos la capa de arriba.",
    "Cerramos la cara de delante: la arista entra en la fila del medio y la esquina vuelve a su sitio.",
  ],
  CROSS: [
    "Abrimos la cara de delante: así los giros siguientes no rompen las dos capas de abajo.",
    "Empieza el truco «derecha arriba, arriba izquierda, derecha abajo, arriba derecha», que da la vuelta a las aristas de arriba.",
    "Seguimos el truco: la capa de arriba hacia la izquierda.",
    "Seguimos el truco: la derecha baja.",
    "Termina el truco: la capa de arriba vuelve.",
    "Cerramos la cara de delante: las capas de abajo quedan como estaban y arriba aparece más amarillo.",
  ],
  SWAP: [
    "Primera parte: subimos la columna de la derecha.",
    "La capa de arriba hacia la izquierda.",
    "Bajamos la columna de la derecha.",
    "Segunda parte: otra vez la capa de arriba hacia la izquierda.",
    "Subimos la columna de la derecha.",
    "Media vuelta de la capa de arriba.",
    "Bajamos la columna de la derecha: las aristas de delante y de la izquierda ya han cambiado de sitio.",
    "Último giro de arriba: cada arista queda frente a su centro.",
  ],
  PLACE: [
    "Las otras tres esquinas de arriba van a moverse en círculo; la de delante a la derecha no se mueve. Empezamos con la capa de arriba hacia la izquierda.",
    "Subimos la columna de la derecha.",
    "La capa de arriba hacia la derecha.",
    "Subimos la columna de la izquierda.",
    "La capa de arriba hacia la izquierda.",
    "Bajamos la columna de la derecha.",
    "La capa de arriba hacia la derecha.",
    "Bajamos la columna de la izquierda: tres esquinas han cambiado de sitio en círculo.",
  ],
};
/** What each algorithm is for, shown before it is used (owner, 25/11/2026). */
export const ALG_INFO = {
  T: { name: "Los 4 giros de las esquinas", what: "Bajan una esquina de arriba y la vuelven a subir un poco girada. Repetidos 1, 3 o 5 veces colocan una esquina blanca; en el paso 7, 2 o 4 veces giran una esquina amarilla.", when: "Con la esquina delante a la derecha." },
  RIGHT: { name: "La arista va a la derecha", what: "Mete la arista de delante en el hueco de la fila del medio de la derecha, sin romper la capa blanca.", when: "Cuando su color de arriba es el del centro de la derecha." },
  LEFT: { name: "La arista va a la izquierda", what: "Mete la arista de delante en el hueco de la fila del medio de la izquierda, sin romper la capa blanca.", when: "Cuando su color de arriba es el del centro de la izquierda." },
  CROSS: { name: "Los 6 giros de la cruz amarilla", what: "Dan la vuelta a las aristas de arriba: de punto a «L», de «L» a raya y de raya a cruz.", when: "Con la «L» detrás y a la izquierda, o con la raya tumbada." },
  SWAP: { name: "Los 8 giros de las aristas amarillas", what: "Cambian de sitio las aristas de delante y de la izquierda, sin tocar las de detrás y la derecha.", when: "Con las dos aristas buenas detrás y a la derecha." },
  PLACE: { name: "Los 8 giros de las esquinas amarillas", what: "Mueven tres esquinas de arriba en círculo y dejan quieta la de delante a la derecha.", when: "Con una esquina ya en su sitio delante a la derecha." },
};
export const ALG_MOVES = ALG;
const CROSS_WHY = "En la cruz no hay algoritmo que aprender: subimos cada pieza a su sitio sin romper las que ya están. Fíjate en el camino que hace.";

export const STAGES = [
  { title: "La cruz blanca", goal: "Una cruz blanca arriba, y cada pieza de la cruz con su otro color igual que el centro de su lado." },
  { title: "Las esquinas blancas", goal: "Toda la cara blanca, y la fila de arriba de cada lado igual que su centro." },
  { title: "La segunda capa", goal: "Con el amarillo arriba: las dos filas de abajo de cada lado, del color de su centro." },
  { title: "La cruz amarilla", goal: "Una cruz amarilla arriba. Solo importa el amarillo: los lados todavía no." },
  { title: "Las aristas amarillas en su sitio", goal: "Las piezas de la cruz amarilla, cada una con su otro color igual que el centro de su lado." },
  { title: "Las esquinas amarillas en su sitio", goal: "Cada esquina de arriba en su sitio, aunque esté girada." },
  { title: "Girar las esquinas amarillas", goal: "El amarillo de cada esquina mirando arriba. ¡Cubo resuelto!" },
];

// Whole-cube turns: same direction as the layer turn of the same letter.
const CUBE_TURN = { y: [1, -1], "y'": [1, 1], y2: [1, 2], x: [0, -1], "x'": [0, 1], x2: [0, 2], z: [2, -1], "z'": [2, 1], z2: [2, 2] };
export const turnCube = (state, token) => {
  const [axis, q] = CUBE_TURN[token];
  return state.map((s) => ({ p: rot(s.p, axis, q), n: rot(s.n, axis, q), c: s.c }));
};
export const cubeTurnOf = (token) => CUBE_TURN[token];
export const applyStep = (state, step) =>
  step.kind === "move" ? applyMove(state, step.token) : step.kind === "cube" ? turnCube(state, step.token) : state;

// ---------- reading the cube ----------
const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const k = (v) => v.join(",");
export const keyAt = (state, pos) => state.filter((s) => same(s.p, pos)).map((s) => s.c).sort().join("");
export const centreColor = (state, n) => state.find((s) => same(s.p, n) && same(s.n, n)).c;
export const centreNormal = (state, c) => state.find((s) => s.c === c && s.p.filter((x) => x).length === 1).n;
export function posOf(state, key) {
  const groups = new Map();
  for (const s of state) groups.set(k(s.p), (groups.get(k(s.p)) ?? "") + s.c);
  for (const [pos, c] of groups) if ([...c].sort().join("") === key) return pos.split(",").map(Number);
  throw Error("PIECE_NOT_FOUND " + key);
}
/** Where a piece belongs: the sum of the normals of its colours' centres. */
export const homeOf = (state, key) => [...key].reduce((acc, c) => { const n = centreNormal(state, c); return [acc[0] + n[0], acc[1] + n[1], acc[2] + n[2]]; }, [0, 0, 0]);
export const solvedAt = (state, pos) => state.filter((s) => same(s.p, pos)).every((s) => s.c === centreColor(state, s.n));
export const pieceSolved = (state, key) => solvedAt(state, homeOf(state, key));
export const piecePlaced = (state, key) => same(posOf(state, key), homeOf(state, key));
const stickerOf = (state, key, color) => { const p = posOf(state, key); return state.find((s) => same(s.p, p) && s.c === color); };

/** The keys of all edges and corners. */
export function pieceKeys(state) {
  const groups = new Map();
  for (const s of state) groups.set(k(s.p), (groups.get(k(s.p)) ?? "") + s.c);
  return [...groups.values()].map((c) => [...c].sort().join("")).filter((c) => c.length > 1);
}
const has = (key, c) => key.includes(c);
const edges = (state) => pieceKeys(state).filter((x) => x.length === 2);
const corners = (state) => pieceKeys(state).filter((x) => x.length === 3);

export const STAGE_DONE = [
  (s) => edges(s).filter((e) => has(e, "W")).every((e) => pieceSolved(s, e)),
  (s) => pieceKeys(s).filter((e) => has(e, "W")).every((e) => pieceSolved(s, e)),
  (s) => pieceKeys(s).filter((e) => !has(e, "Y")).every((e) => pieceSolved(s, e)),
  (s) => edges(s).filter((e) => has(e, "Y")).every((e) => same(stickerOf(s, e, "Y").n, centreNormal(s, "Y"))),
  (s) => edges(s).filter((e) => has(e, "Y")).every((e) => pieceSolved(s, e)),
  (s) => corners(s).filter((e) => has(e, "Y")).every((e) => piecePlaced(s, e)),
  (s) => s.every((x) => x.c === centreColor(s, x.n)),
];
/** The first step (0–6) that is not done yet, 7 when the cube is solved. */
export function currentStage(state) {
  let i = 0;
  while (i < 7 && STAGE_DONE[i](state)) i++;
  return i;
}

/** Which stickers matter in a step (the rest can be shown in grey). */
export function showFor(stage) {
  return (st, key) =>
    stage === 0 ? key.length === 2 && has(key, "W")
      : stage === 1 ? has(key, "W")
        : stage === 2 ? !has(key, "Y")
          : stage === 3 ? !has(key, "Y") || (key.length === 2 && st.c === "Y")
            : stage === 4 ? !has(key, "Y") || key.length === 2
              : true;
}

// ---------- the planner ----------
const Y_TURNS = ["", "y", "y'", "y2"];
const yTurnTaking = (from, to) => Y_TURNS.find((t) => same(t ? rot(from, 1, CUBE_TURN[t][1]) : from, to));
const U_TURNS = ["", "U", "U'", "U2"];
const D_TURNS = ["", "D", "D'", "D2"];
const MOVES = ["U", "U'", "U2", "D", "D'", "D2", "F", "F'", "F2", "R", "R'", "R2", "L", "L'", "L2"];

export function plan(start, { from = currentStage(start), to = 7 } = {}) {
  const steps = [];
  let s = start;
  let stage = from;
  let group = "";
  const add = (step) => { step.before = s; step.stage = stage; step.group = group; s = applyStep(s, step); steps.push(step); };
  const info = (title, text, hl = []) => add({ kind: "info", title, text, hl });
  const cube = (token, why, hl = []) => { if (token) add({ kind: "cube", token, text: CUBE_WORD[token], note: why, hl }); };
  const ALG_OF = new Map(Object.entries(WHY).map(([key, list]) => [list, key]));
  const moves = (list, note, hl = [], why = null) => list.forEach((token, i) => add({ kind: "move", token, text: WORD[token], note: typeof note === "function" ? note(i) : note, hl, why: Array.isArray(why) ? why[i] : why, alg: Array.isArray(why) ? ALG_OF.get(why) : null, algIndex: i }));
  const turnUntil = (options, ok) => options.find((t) => ok(t ? applyMove(s, t) : s));
  const orientUp = (color, why) => {
    const n = centreNormal(s, color);
    const t = same(n, [0, 1, 0]) ? "" : same(n, [0, -1, 0]) ? (color === "Y" ? "z2" : "x2") : same(n, [0, 0, 1]) ? "x" : same(n, [0, 0, -1]) ? "x'" : same(n, [1, 0, 0]) ? "z'" : "z";
    cube(t, why);
  };

  for (stage = from; stage < to && stage < 7; stage++) {
    group = STAGES[stage].title;
    info(`Paso ${stage + 1}: ${STAGES[stage].title}`, STAGES[stage].goal);
    if (stage === 0 || stage === 1) {
      if (centreColor(s, [0, 1, 0]) !== "W") orientUp("W", "Coge el cubo con el centro blanco arriba, como en el dibujo.");
    } else if (centreColor(s, [0, 1, 0]) !== "Y") {
      orientUp("Y", "A partir de aquí el blanco va abajo y el amarillo arriba.");
    }
    if (STAGE_DONE[stage](s)) { info("Este paso ya está hecho", "Tu cubo ya lo tiene. Pasamos al siguiente."); continue; }
    if (stage === 0) whiteCross();
    if (stage === 1) whiteCorners();
    if (stage === 2) middleLayer();
    if (stage === 3) yellowCross();
    if (stage === 4) yellowEdges();
    if (stage === 5) yellowCornersPlace();
    if (stage === 6) yellowCornersTwist();
    if (!STAGE_DONE[stage](s)) throw Error("STAGE_NOT_DONE " + stage);
  }
  return { steps, end: s };

  function whiteCross() {
    const todo = edges(s).filter((e) => has(e, "W"));
    const done = todo.filter((e) => pieceSolved(s, e));
    let left = todo.filter((e) => !pieceSolved(s, e));
    while (left.length) {
      // The piece with the shortest way in, keeping the ones already placed.
      let best = null;
      for (const e of left) {
        const path = shortest(s, [...done, e], best ? best.path.length - 1 : 8);
        if (path && (!best || path.length < best.path.length)) best = { e, path };
      }
      if (!best) throw Error("CROSS_NOT_FOUND");
      const other = best.e.replace("W", "");
      group = `Pieza ${pieceName(best.e)}`;
      info(`La pieza ${pieceName(best.e)}`, `Va arriba, encima de ${centreName(other)}, con el blanco arriba. ${best.path.length === 1 ? "Basta un giro:" : `Hazlo con estos ${best.path.length} giros:`}`, [best.e]);
      moves(best.path, (i) => `Giro ${i + 1} de ${best.path.length}`, [best.e], CROSS_WHY);
      done.push(best.e);
      left = left.filter((e) => e !== best.e);
    }
  }

  function whiteCorners() {
    for (let guard = 0; guard < 16; guard++) {
      const todo = corners(s).filter((c) => has(c, "W") && !pieceSolved(s, c));
      if (!todo.length) return;
      let c = todo.find((x) => posOf(s, x)[1] === -1);
      if (!c) {
        c = todo[0];
        group = `Esquina ${pieceName(c)}`;
        info(`La esquina ${pieceName(c)}`, "Está arriba, pero mal colocada. Primero hay que bajarla a la capa de abajo.", [c]);
        const p = posOf(s, c);
        cube(yTurnTaking([p[0], 0, p[2]], [1, 0, 1]), "Para tenerla arriba, delante a la derecha.", [c]);
        moves(seq(ALG.T), "Estos 4 giros la bajan.", [c], WHY.T);
        continue;
      }
      group = `Esquina ${pieceName(c)}`;
      const others = c.replace("W", "");
      info(`La esquina ${pieceName(c)}`, `Su sitio es arriba, entre ${centreName(others[0])} y ${centreName(others[1])}.`, [c]);
      const h = homeOf(s, c);
      cube(yTurnTaking([h[0], 0, h[2]], [1, 0, 1]), "Para tener su sitio delante a la derecha.", [c]);
      const d = turnUntil(D_TURNS, (t) => same(posOf(t, c), [1, -1, 1]));
      if (d) moves([d], "Hasta que la esquina quede justo debajo de su sitio.", [c]);
      let n = 0;
      for (let t = s; n < 6 && !pieceSolved(t, c); n++) t = seq(ALG.T).reduce(applyMove, t);
      for (let r = 1; r <= n; r++) moves(seq(ALG.T), (i) => `Vez ${r} de ${n} · giro ${i + 1} de 4`, [c], WHY.T);
    }
    throw Error("CORNERS_LOOP");
  }

  function middleLayer() {
    for (let guard = 0; guard < 24; guard++) {
      const wrong = edges(s).filter((e) => !has(e, "W") && !has(e, "Y") && !pieceSolved(s, e));
      if (!wrong.length) return;
      const e = edges(s).find((x) => !has(x, "Y") && !has(x, "W") && posOf(s, x)[1] === 1);
      if (e) {
        const p = posOf(s, e);
        const side = s.find((x) => same(x.p, p) && x.n[1] === 0).c;
        const top = s.find((x) => same(x.p, p) && x.n[1] === 1).c;
        group = `Arista ${pieceName(e)}`;
        info(`La arista ${pieceName(e)}`, `Su color de un lado es ${colorWord(side)}: hay que ponerla delante, encima de ${centreName(side)}.`, [e]);
        const n = centreNormal(s, side);
        cube(yTurnTaking(n, [0, 0, 1]), `Para tener ${centreName(side)} delante.`, [e]);
        const u = turnUntil(U_TURNS, (t) => same(posOf(t, e), [0, 1, 1]));
        if (u) moves([u], `Hasta que la arista quede delante: se forma una raya ${colorWord(side)} vertical.`, [e]);
        const right = centreColor(s, [1, 0, 0]) === top;
        const alg = seq(right ? ALG.RIGHT : ALG.LEFT);
        info(right ? "Va a la derecha" : "Va a la izquierda", `Arriba la arista es ${colorWord(top)}, como el centro de la ${right ? "derecha" : "izquierda"}. Haz estos 8 giros.`, [e]);
        moves(alg, (i) => `Hacia la ${right ? "derecha" : "izquierda"} · giro ${i + 1} de 8`, [e], right ? WHY.RIGHT : WHY.LEFT);
      } else {
        const w = wrong[0];
        group = `Arista ${pieceName(w)}`;
        info(`La arista ${pieceName(w)}`, "Está en la fila del medio, pero mal. Con los 8 giros de «hacia la derecha» sale arriba.", [w]);
        const p = posOf(s, w);
        cube(yTurnTaking([p[0], 0, p[2]], [1, 0, 1]), "Para tenerla delante a la derecha.", [w]);
        moves(seq(ALG.RIGHT), (i) => `Sacarla · giro ${i + 1} de 8`, [w], WHY.RIGHT);
      }
    }
    throw Error("MIDDLE_LOOP");
  }

  function yellowUpEdges(t) {
    const E = { F: [0, 1, 1], R: [1, 1, 0], B: [0, 1, -1], L: [-1, 1, 0] };
    return Object.keys(E).filter((x) => t.find((st) => same(st.p, E[x]) && st.n[1] === 1).c === "Y").join("");
  }
  function yellowCross() {
    group = STAGES[3].title;
    for (let guard = 0; guard < 6; guard++) {
      const up = yellowUpEdges(s);
      if (up.length === 4) return;
      if (up.length === 0) {
        info("Un punto", "Ninguna arista de arriba tiene el amarillo arriba. Haz los 6 giros: saldrá una «L».");
      } else if (up === "FB" || up === "RL") {
        info("Una raya", "Ponla tumbada, de izquierda a derecha, y haz los 6 giros: saldrá la cruz.");
        const u = turnUntil(U_TURNS, (t) => yellowUpEdges(t) === "RL");
        if (u) moves([u], "Hasta que la raya quede tumbada.");
      } else {
        info("Una «L»", "Ponla detrás y a la izquierda, y haz los 6 giros: saldrá una raya.");
        const u = turnUntil(U_TURNS, (t) => yellowUpEdges(t) === "BL");
        if (u) moves([u], "Hasta que la «L» quede detrás y a la izquierda.");
      }
      moves(seq(ALG.CROSS), (i) => `Giro ${i + 1} de 6`, [], WHY.CROSS);
    }
    throw Error("CROSS_LOOP");
  }

  function matchingTopEdges(t) {
    const E = { F: [0, 1, 1], R: [1, 1, 0], B: [0, 1, -1], L: [-1, 1, 0] };
    return Object.keys(E).filter((x) => solvedAt(t, E[x])).join("");
  }
  function yellowEdges() {
    group = STAGES[4].title;
    for (let guard = 0; guard < 6; guard++) {
      const u = U_TURNS.reduce((best, t) => (matchingTopEdges(t ? applyMove(s, t) : s).length > matchingTopEdges(best ? applyMove(s, best) : s).length ? t : best), "");
      if (u) moves([u], "Hasta que coincidan con su centro al menos dos aristas.");
      const m = matchingTopEdges(s);
      if (m.length === 4) return;
      const keys = [[0, 1, 1], [1, 1, 0], [0, 1, -1], [-1, 1, 0]].filter((p) => !solvedAt(s, p)).map((p) => keyAt(s, p));
      if (m === "FB" || m === "RL") {
        info("Las dos buenas están enfrente", "Haz los 8 giros una vez y vuelve a mirar.");
      } else {
        info("Dos buenas, una al lado de la otra", "Ponlas detrás y a la derecha. Las de delante y la izquierda (en rosa) se cambiarán.", keys);
        const E = { F: [0, 0, 1], R: [1, 0, 0], B: [0, 0, -1], L: [-1, 0, 0] };
        const t = Y_TURNS.find((y) => [...m].every((x) => { const v = y ? rot(E[x], 1, CUBE_TURN[y][1]) : E[x]; return same(v, E.B) || same(v, E.R); }));
        cube(t, "Para tener las dos buenas detrás y a la derecha.", keys);
      }
      moves(seq(ALG.SWAP), (i) => `Giro ${i + 1} de 8`, keys, WHY.SWAP);
    }
    throw Error("EDGES_LOOP");
  }

  function yellowCornersPlace() {
    group = STAGES[5].title;
    for (let guard = 0; guard < 6; guard++) {
      const list = corners(s).filter((c) => has(c, "Y"));
      const placed = list.filter((c) => piecePlaced(s, c));
      if (placed.length === 4) return;
      if (placed.length) {
        const c = placed[0];
        info(`La esquina ${pieceName(c)} ya está en su sitio`, "Aunque esté girada, tiene los mismos colores que los tres centros que la rodean. Tenla arriba, delante a la derecha, y haz los 8 giros.", [c]);
        const p = posOf(s, c);
        cube(yTurnTaking([p[0], 0, p[2]], [1, 0, 1]), "Para tenerla delante a la derecha.", [c]);
        moves(seq(ALG.PLACE), (i) => `Giro ${i + 1} de 8`, [c], WHY.PLACE);
      } else {
        info("Ninguna esquina está en su sitio", "Haz los 8 giros una vez desde cualquier lado y vuelve a mirar.");
        moves(seq(ALG.PLACE), (i) => `Giro ${i + 1} de 8`, [], WHY.PLACE);
      }
    }
    throw Error("PLACE_LOOP");
  }

  function yellowCornersTwist() {
    group = STAGES[6].title;
    const yUp = (t, pos) => t.find((st) => same(st.p, pos) && st.c === "Y")?.n[1] === 1;
    const TOP = [[1, 1, 1], [1, 1, -1], [-1, 1, -1], [-1, 1, 1]];
    const twisted = TOP.filter((p) => !yUp(s, p));
    if (twisted.length) {
      const c = keyAt(s, twisted[0]);
      info("Una esquina mal girada delante a la derecha", "Repetirás los 4 giros del paso 2 hasta que su amarillo quede arriba (2 o 4 veces). La parte de abajo se desordena mientras tanto: es normal, se arregla sola al final. No gires el cubo entero hasta terminar.", [c]);
      cube(yTurnTaking([twisted[0][0], 0, twisted[0][2]], [1, 0, 1]), "Para tenerla delante a la derecha.", [c]);
    }
    for (let guard = 0; guard < 12; guard++) {
      if (TOP.every((p) => yUp(s, p))) break;
      if (yUp(s, [1, 1, 1])) {
        const u = turnUntil(["U", "U'", "U2"], (t) => !yUp(t, [1, 1, 1]));
        const next = keyAt(applyMove(s, u), [1, 1, 1]);
        moves([u], "Solo la capa de arriba, hasta que la siguiente esquina mal girada quede delante a la derecha.", [next]);
        continue;
      }
      const c = keyAt(s, [1, 1, 1]);
      let n = 0;
      for (let t = s; n < 6 && !yUp(t, [1, 1, 1]); n++) t = seq(ALG.T).reduce(applyMove, t);
      for (let r = 1; r <= n; r++) moves(seq(ALG.T), (i) => `Vez ${r} de ${n} · giro ${i + 1} de 4`, [c], WHY.T);
    }
    const u = turnUntil(U_TURNS, (t) => STAGE_DONE[6](t));
    if (u) moves([u], "Para terminar: la capa de arriba hasta que todo coincida.");
  }
}

/** Shortest list of turns that leaves all these edges solved (only their stickers are followed). */
function shortest(state, keys, maxDepth = 8) {
  const tracked = state.filter((st) => keys.includes(keyAt(state, st.p)));
  const centre = new Map(state.filter((st) => st.p.filter((x) => x).length === 1).map((st) => [k(st.n), st.c]));
  const goal = (t) => t.every((st) => centre.get(k(st.n)) === st.c);
  const code = (t) => t.map((st) => (st.p[0] + 1) * 9 + (st.p[1] + 1) * 3 + st.p[2] + 1 + ":" + (st.n[0] + 2 * st.n[1] + 4 * st.n[2])).join("|");
  if (goal(tracked)) return [];
  let layer = [{ t: tracked, path: [] }];
  const seen = new Set([code(tracked)]);
  for (let depth = 0; depth <= maxDepth; depth++) {
    const next = [];
    for (const { t, path } of layer)
      for (const m of MOVES) {
        if (path.length && path[path.length - 1][0] === m[0]) continue;
        const u = applyMove(t, m);
        const c = code(u);
        if (seen.has(c)) continue;
        seen.add(c);
        const p = [...path, m];
        if (goal(u)) return p;
        next.push({ t: u, path: p });
      }
    layer = next;
  }
  return null;
}
