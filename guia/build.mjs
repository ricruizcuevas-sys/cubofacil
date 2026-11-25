// Builds the printable step-by-step guide (guia/guia.html). Every drawing comes from the real cube
// model in js/cube.js, and every example is checked: if a sequence does not do what the text says,
// the build stops.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { solvedCube, applyMove, parseMove, rot, inverse } from "../js/cube.js";

const COLOR = { Y: "#FFD500", W: "#FFFFFF", G: "#16A34A", B: "#1D4ED8", O: "#F97316", R: "#DC2626" };
const GREY = "#8E959F";
const PINK = "#E11D74";

const run = (s, m) => m.reduce(applyMove, s);
const seq = (t) => t.trim().split(/\s+/);
const inv = (m) => [...m].reverse().map(inverse);
const times = (m, k) => Array(k).fill(m).flat();
const same = (a, b) => a.every((v, i) => v === b[i]);
const pieceKey = (state, pos) => state.filter((s) => same(s.p, pos)).map((s) => s.c).sort().join("");
const center = (state, n) => state.find((s) => same(s.p, n) && same(s.n, n)).c;
const pieceSolved = (state, pos) => state.filter((s) => same(s.p, pos)).every((s) => s.c === center(state, s.n));
function check(ok, what) { if (!ok) throw Error("GUIDE CHECK FAILED: " + what); }

const yellowUp = solvedCube();
const whiteUp = solvedCube().map((s) => ({ p: rot(s.p, 2, 2), n: rot(s.n, 2, 2), c: s.c }));

// ---------- drawing ----------
const P = (v, below) => [(v[0] - v[2]) * 0.866, below ? -v[1] - 0.5 * (v[0] + v[2]) : -v[1] + 0.5 * (v[0] + v[2])];
const pts = (list, below) => list.map((v) => P(v, below).map((x) => x.toFixed(3)).join(",")).join(" ");
const axesBut = (n) => [0, 1, 2].filter((a) => !n[a]).map((a) => { const u = [0, 0, 0]; u[a] = 1; return u; });
const add = (a, b, k = 1) => a.map((v, i) => v + b[i] * k);

/** One drawing of the cube. show(sticker, key) decides which stickers keep their colour. */
function draw(state, { show = () => true, hl = [], move = null, below = false, w = 128 } = {}) {
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

// ---------- words ----------
const WORD = {
  R: "La derecha, hacia arriba", "R'": "La derecha, hacia abajo",
  L: "La izquierda, hacia abajo", "L'": "La izquierda, hacia arriba",
  U: "La de arriba, hacia la izquierda", "U'": "La de arriba, hacia la derecha",
  D: "La de abajo, hacia la derecha", "D'": "La de abajo, hacia la izquierda",
  F: "La de delante, como las agujas del reloj", "F'": "La de delante, al revés que las agujas del reloj",
  U2: "La de arriba, media vuelta (dos giros)", F2: "La de delante, media vuelta (dos giros)",
};
// The words must match the model: follow one front sticker through each turn.
{
  const go = (t, p) => applyMove([{ p, n: [0, 0, 1], c: "X" }], t)[0].p;
  check(go("R", [1, 0, 1])[1] > 0, "R goes up");
  check(go("L", [-1, 0, 1])[1] < 0, "L goes down");
  check(go("U", [0, 1, 1])[0] < 0, "U goes left");
  check(go("D", [0, -1, 1])[0] > 0, "D goes right");
  check(go("F", [0, 1, 1])[0] > 0, "F is clockwise");
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const card = (svg, title, note = "", n = "", extra = "") =>
  `<figure class="card ${extra}">${n !== "" ? `<span class="num">${n}</span>` : ""}${svg}<figcaption><b>${title}</b>${note ? `<small>${note}</small>` : ""}</figcaption></figure>`;

/** One card per turn (the drawing shows the cube before the turn, with its arrow), and the result. */
function steps(start, moves, opts, endTitle = "Así queda") {
  let s = start;
  const cards = moves.map((mv, i) => { const c = card(draw(s, { ...opts, move: mv }), esc(WORD[mv]), "", i + 1); s = applyMove(s, mv); return c; });
  cards.push(card(draw(s, opts), endTitle, "", "", "end"));
  return { html: `<div class="grid">${cards.join("")}</div>`, end: s };
}

// ---------- what each lesson shows ----------
const keysAt = (state, positions) => new Set(positions.map((p) => pieceKey(state, p)));
const allPos = []; for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) if (x || y || z) allPos.push([x, y, z]);
// White-up frame: white layer is y = 1.
const crossKeys = keysAt(whiteUp, [[0, 1, 1], [1, 1, 0], [0, 1, -1], [-1, 1, 0]]);
const whiteLayerKeys = keysAt(whiteUp, allPos.filter((p) => p[1] === 1));
// Yellow-up frame: white layer y = -1, middle y = 0.
const firstLayerY = keysAt(yellowUp, allPos.filter((p) => p[1] === -1));
const twoLayersY = keysAt(yellowUp, allPos.filter((p) => p[1] <= 0));
const topEdgesY = keysAt(yellowUp, [[0, 1, 1], [1, 1, 0], [0, 1, -1], [-1, 1, 0]]);
const inSet = (set) => (s, key) => set.has(key);
const showCross = inSet(crossKeys);
const showWhite = inSet(whiteLayerKeys);
const showTwo = inSet(twoLayersY);

const T = seq("R' D' R D");
const pages = [];

// ---------- cover ----------
pages.push(`<section class="cover">
  <div class="brand">CuboFácil</div>
  <h1>Resuelve el cubo de Rubik paso a paso</h1>
  <p class="lead">Una guía para quien no lo ha resuelto nunca. Siete pasos, cada giro con su dibujo.</p>
  <div class="cover-cube">${draw(yellowUp, { w: 260 })}</div>
  <ul class="promise">
    <li>Ve despacio: haz cada giro mirando su dibujo.</li>
    <li>No hace falta aprender nada de memoria para empezar: la guía está para tenerla delante.</li>
    <li>Si te equivocas, no pasa nada: vuelve al principio del paso.</li>
  </ul>
</section>`);

// ---------- before starting ----------
const onlyKind = (len) => (s, key) => key.length === len;
pages.push(`<section>
  <h2>Antes de empezar</h2>
  <h3>Las piezas</h3>
  <div class="grid three">
    ${card(draw(yellowUp, { show: onlyKind(1) }), "Centros", "Un color. No se mueven entre ellos: el blanco siempre está enfrente del amarillo. El centro dice de qué color es esa cara.")}
    ${card(draw(yellowUp, { show: onlyKind(2) }), "Aristas", "Dos colores. Están entre dos centros.")}
    ${card(draw(yellowUp, { show: onlyKind(3) }), "Esquinas", "Tres colores. Están en las esquinas.")}
  </div>
  <h3>Cómo se mira el cubo</h3>
  <p>Sujeta el cubo con una cara mirándote: es <b>delante</b>. Además ves la de <b>arriba</b> y la de la <b>derecha</b>. Los dibujos de esta guía muestran el cubo siempre así.</p>
  <div class="hold">${draw(yellowUp, { w: 190 })}
    <div class="hold-text"><p><b>Arriba</b>: la cara de encima.</p><p><b>Delante</b>: la que te mira (abajo a la izquierda en el dibujo).</p><p><b>Derecha</b>: la de tu derecha (abajo a la derecha en el dibujo).</p><p>Las piezas en gris no importan en ese momento: ignóralas.</p><p>La pieza rodeada en <b style="color:${PINK}">rosa</b> es la que estás colocando.</p></div>
  </div>
</section>`);

// ---------- the turns ----------
pages.push(`<section>
  <h2>Los giros</h2>
  <p>Un giro mueve <b>una sola capa</b> (una fila de 9 piezas) un cuarto de vuelta. El resto del cubo se queda quieto en tu mano. La flecha dice hacia dónde va la parte de delante de esa capa.</p>
  <div class="grid four">${["R", "R'", "L", "L'", "U", "U'", "D", "D'", "F", "F'", "U2", "F2"].map((t) => card(draw(yellowUp, { move: t, w: 130 }), esc(WORD[t]))).join("")}</div>
  <p class="tip">Cuando la guía dice <b>repite</b>, haz otra vez los mismos giros, en el mismo orden.</p>
</section>`);

// ---------- step 1: white cross ----------
{
  const goal = whiteUp;
  const bad = whiteUp.map((s) => ({ ...s }));
  // Swap the side colours of two cross pieces: the cross is white but the sides do not match.
  const a = bad.find((s) => same(s.p, [0, 1, 1]) && same(s.n, [0, 0, 1]));
  const b = bad.find((s) => same(s.p, [1, 1, 0]) && same(s.n, [1, 0, 0]));
  [a.c, b.c] = [b.c, a.c];
  const hint = run(whiteUp, ["F2", "D"]);
  check(pieceKey(hint, [1, -1, 0]) === "GW", "hint edge below right");
  const hintSteps = steps(hint, ["D'", "F2"], { show: showCross, hl: ["GW"] }, "¡En su sitio!");
  check(pieceSolved(hintSteps.end, [0, 1, 1]), "hint solves the edge");
  pages.push(`<section>
    <div class="step">Paso 1</div><h2>La cruz blanca</h2>
    <p class="hold-line">Sujeta el cubo con el <b>centro blanco arriba</b>.</p>
    <p>Hay que hacer una <b>cruz blanca</b> arriba. Fíjate también en los lados: el otro color de cada pieza de la cruz tiene que ser <b>igual que el centro de su lado</b>.</p>
    <div class="grid two">
      ${card(draw(goal, { show: showCross }), "Así sí", "Cruz blanca y cada lado con su centro.", "", "good")}
      ${card(draw(bad, { show: showCross }), "Así no", "La cruz es blanca, pero delante y a la derecha los colores no coinciden con el centro.", "", "bad")}
    </div>
    <p>Para este paso <b>no hay que aprender giros</b>: ve moviendo las piezas hasta que la cruz quede como en el dibujo. Pieza a pieza, con calma.</p>
    <h3>Una pista</h3>
    <p>Si una pieza blanca de la cruz está <b>abajo con el blanco mirando hacia el suelo</b>: gira la capa de abajo hasta que su otro color quede debajo del centro de ese color. Ponla delante y gira la cara de delante media vuelta. Sube a su sitio.</p>
    ${hintSteps.html}
  </section>`);
}

// ---------- step 2: white corners ----------
{
  const cases = [1, 3, 5].map((k) => {
    const e = run(whiteUp, inv(times(T, k)));
    check(pieceKey(e, [1, -1, 1]) === "GRW", "corner below its place");
    const w = e.find((s) => s.c === "W" && same(s.p, [1, -1, 1])).n;
    const dir = same(w, [1, 0, 0]) ? "a la derecha" : same(w, [0, 0, 1]) ? "hacia delante" : "hacia abajo";
    const done = run(e, times(T, k));
    check(whiteLayerKeys.size && [...allPos].filter((p) => p[1] === 1).every((p) => pieceSolved(done, p)), "corner case " + k);
    return { k, e, dir, below: same(w, [0, -1, 0]) };
  });
  const one = cases[0];
  const moveTo = run(one.e, ["D'"]);
  check(pieceKey(moveTo, [-1, -1, 1]) === "GRW", "corner moved to front-left");
  const bring = steps(moveTo, ["D"], { show: showWhite, hl: ["GRW"] }, "Ya está debajo de su sitio");
  const four = steps(one.e, T, { show: showWhite, hl: ["GRW"] }, "¡Esquina colocada!");
  pages.push(`<section>
    <div class="step">Paso 2</div><h2>Las esquinas blancas</h2>
    <p class="hold-line">Sigue con el <b>blanco arriba</b>.</p>
    <p>Hay que completar toda la cara blanca, con la primera fila de cada lado del color de su centro.</p>
    <div class="grid one">${card(draw(whiteUp, { show: showWhite }), "El objetivo", "Cara blanca completa y la fila de arriba de cada lado igual que su centro.", "", "good")}</div>
    <h3>1. Busca una esquina blanca en la capa de abajo</h3>
    <p>Mira sus otros dos colores. Su sitio es arriba, entre los dos centros de esos colores. Gira la capa de abajo hasta que la esquina quede <b>justo debajo de su sitio</b>.</p>
    <p>En el ejemplo la esquina es blanca, verde y roja: su sitio está entre el centro verde y el rojo.</p>
    ${bring.html}
    <h3>2. Coge el cubo con esa esquina delante a la derecha</h3>
    <p>Gira el cubo entero en tu mano (sin girar capas) hasta que la esquina quede <b>abajo, delante, a la derecha</b>. Su sitio queda justo encima. El blanco sigue arriba.</p>
  </section>`);
  pages.push(`<section>
    <h3>3. Haz estos 4 giros</h3>
    ${four.html}
    <h3>4. Repite los 4 giros hasta que la esquina suba con el blanco arriba</h3>
    <p>Cuántas veces depende de hacia dónde mira el blanco de la esquina antes de empezar:</p>
    <div class="grid three">${cases.map((c) => card(draw(c.e, { show: showWhite, hl: ["GRW"], below: c.below }), `${c.k} ${c.k === 1 ? "vez" : "veces"}`, `El blanco mira ${c.dir}.${c.below ? " (Dibujo visto desde abajo.)" : ""}`)).join("")}</div>
    <p class="tip">Si una esquina blanca está <b>arriba pero mal</b> (en otro sitio o con el blanco hacia un lado), ponla delante a la derecha arriba y haz los 4 giros una vez. Bajará a la capa de abajo y ya puedes colocarla como antes.</p>
    <p>Haz lo mismo con las cuatro esquinas.</p>
  </section>`);
}

// ---------- flip ----------
pages.push(`<section>
  <h2>Ahora, dale la vuelta al cubo</h2>
  <p>A partir de aquí el <b>blanco va abajo</b> y el <b>amarillo arriba</b>. Gira el cubo entero para que lo blanco quede en el suelo.</p>
  <div class="grid two">
    ${card(draw(whiteUp, { show: showWhite, w: 170 }), "Antes", "Blanco arriba.")}
    ${card(draw(yellowUp, { show: inSet(firstLayerY), w: 170 }), "Después", "Blanco abajo, amarillo arriba. La capa blanca es ahora la fila de abajo de cada lado.")}
  </div>
  <p class="tip">Desde ahora, el amarillo siempre arriba. No le des más la vuelta.</p>
</section>`);

// ---------- step 3: middle layer ----------
{
  const RIGHT = seq("U R U' R' U' F' U F");
  const LEFT = seq("U' L' U L U F U' F'");
  const er = run(yellowUp, inv(RIGHT));
  const el = run(yellowUp, inv(LEFT));
  const at = (s, p, n) => s.find((x) => same(x.p, p) && same(x.n, n)).c;
  check(at(er, [0, 1, 1], [0, 0, 1]) === "G" && at(er, [0, 1, 1], [0, 1, 0]) === "O", "right case");
  check(at(el, [0, 1, 1], [0, 0, 1]) === "G" && at(el, [0, 1, 1], [0, 1, 0]) === "R", "left case");
  const showR = (s, key) => twoLayersY.has(key) && key !== "GO";
  const showL = (s, key) => twoLayersY.has(key) && key !== "GR";
  const withEdge = (base, edge) => (s, key) => base(s, key) || key === edge;
  const r = steps(er, RIGHT, { show: withEdge(showR, "GO"), hl: ["GO"] }, "¡Arista colocada!");
  const l = steps(el, LEFT, { show: withEdge(showL, "GR"), hl: ["GR"] }, "¡Arista colocada!");
  check(pieceSolved(r.end, [1, 0, 1]) && pieceSolved(l.end, [-1, 0, 1]), "middle edges placed");
  pages.push(`<section>
    <div class="step">Paso 3</div><h2>La segunda capa</h2>
    <p class="hold-line"><b>Amarillo arriba</b>, blanco abajo.</p>
    <p>Hay que completar la fila del medio de cada lado. Las piezas que van ahí son las aristas <b>sin amarillo</b>.</p>
    <div class="grid one">${card(draw(yellowUp, { show: showTwo }), "El objetivo", "Las dos filas de abajo de cada lado, del color de su centro.", "", "good")}</div>
    <h3>1. Busca arriba una arista sin amarillo</h3>
    <h3>2. Gira la capa de arriba hasta que su color de delante sea igual que el centro de delante</h3>
    <p>Gira el cubo entero si hace falta para tenerla delante. Se forma una raya vertical de un mismo color en la cara de delante.</p>
    <h3>3. Mira el color de arriba de esa arista</h3>
    <p>Si es el color del <b>centro de la derecha</b>, la arista va a la derecha. Si es el del <b>centro de la izquierda</b>, va a la izquierda.</p>
  </section>`);
  pages.push(`<section>
    <h3>Va a la derecha: estos 8 giros</h3>
    <p>En el ejemplo: delante verde con el centro verde; arriba naranja, como el centro de la derecha.</p>
    ${r.html}
  </section>`);
  pages.push(`<section>
    <h3>Va a la izquierda: estos 8 giros</h3>
    <p>En el ejemplo: delante verde con el centro verde; arriba rojo, como el centro de la izquierda.</p>
    ${l.html}
    <p class="tip">Si una arista está en la fila del medio pero mal (en otro hueco o al revés), ponla delante a la derecha y haz los 8 giros de «va a la derecha». Saldrá arriba y la colocas como siempre.</p>
  </section>`);
}

// ---------- step 4: yellow cross ----------
{
  const CROSS = seq("F R U R' U' F'");
  const E = { F: [0, 1, 1], R: [1, 1, 0], B: [0, 1, -1], L: [-1, 1, 0] };
  const flip = (state, keys) => {
    const out = state.map((s) => ({ ...s }));
    for (const k of keys) { const two = out.filter((s) => same(s.p, E[k])); [two[0].c, two[1].c] = [two[1].c, two[0].c]; }
    return out;
  };
  const up = (s) => Object.keys(E).filter((k) => s.find((x) => same(x.p, E[k]) && x.n[1] === 1).c === "Y").join("");
  const dot = flip(yellowUp, ["F", "R", "B", "L"]);
  const ell = flip(yellowUp, ["F", "R"]);
  const line = flip(yellowUp, ["F", "B"]);
  check(up(dot) === "" && up(run(dot, CROSS)) === "FR", "dot gives an L");
  check(up(ell) === "BL" && up(run(ell, CROSS)) === "RL", "L gives a line");
  check(up(line) === "RL" && up(run(line, CROSS)) === "FRBL", "line gives the cross");
  // Only the yellow stickers of the top edges matter here.
  const show4 = (s, key) => twoLayersY.has(key) || (topEdgesY.has(key) && s.c === "Y");
  const st = steps(line, CROSS, { show: show4 }, "¡Cruz amarilla!");
  pages.push(`<section>
    <div class="step">Paso 4</div><h2>La cruz amarilla</h2>
    <p class="hold-line"><b>Amarillo arriba.</b></p>
    <p>Hay que hacer una cruz amarilla arriba. Esta vez <b>solo importa el amarillo</b>: los colores de los lados todavía no.</p>
    <p>Mira las 4 aristas de arriba y busca cuál de estos dibujos tienes:</p>
    <div class="grid three">
      ${card(draw(dot, { show: show4 }), "Un punto", "Ninguna arista amarilla. Haz los 6 giros una vez: saldrá una «L».")}
      ${card(draw(ell, { show: show4 }), "Una «L»", "Gira la capa de arriba hasta que la L quede detrás y a la izquierda, como en el dibujo. Haz los 6 giros: saldrá una raya.")}
      ${card(draw(line, { show: show4 }), "Una raya", "Ponla tumbada, de izquierda a derecha. Haz los 6 giros: saldrá la cruz.")}
    </div>
    </section><section><h3>Los 6 giros (en el ejemplo, con la raya tumbada)</h3>
    ${st.html}
  </section>`);
}

// ---------- step 5: yellow edges in place ----------
{
  const SWAP = seq("R U R' U R U2 R' U");
  const E = { F: [0, 1, 1], R: [1, 1, 0], B: [0, 1, -1], L: [-1, 1, 0] };
  const start = run(yellowUp, inv(SWAP));
  const matching = (s) => Object.keys(E).filter((k) => pieceSolved(s, E[k])).join("");
  check(matching(start) === "RB", "edges right and back are already good");
  const show5 = (s, key) => twoLayersY.has(key) || topEdgesY.has(key);
  const st = steps(start, SWAP, { show: show5, hl: [pieceKey(start, E.F), pieceKey(start, E.L)] }, "¡Las cuatro en su sitio!");
  check(matching(st.end) === "FRBL", "edges done");
  pages.push(`<section>
    <div class="step">Paso 5</div><h2>Las aristas amarillas en su sitio</h2>
    <p class="hold-line"><b>Amarillo arriba.</b></p>
    <p>Ahora sí importan los lados: el otro color de cada arista de la cruz tiene que ser <b>igual que el centro de su lado</b>.</p>
    <h3>1. Gira la capa de arriba hasta que dos aristas coincidan con su centro</h3>
    <p>Si coinciden las cuatro, ¡salta al paso 6!</p>
    <h3>2. Coge el cubo con las dos buenas detrás y a la derecha</h3>
    <p>Las que se cambian quedan delante y a la izquierda (en rosa). Haz estos 8 giros:</p>
    ${st.html}
    <p class="tip">Si las dos que coinciden están <b>una enfrente de la otra</b> (delante y detrás), haz los 8 giros una vez desde cualquier lado. Luego vuelve al punto 1.</p>
  </section>`);
}

// ---------- step 6: yellow corners in place ----------
{
  const PLACE = seq("U R U' L' U R' U' L");
  const C = [[1, 1, 1], [1, 1, -1], [-1, 1, -1], [-1, 1, 1]];
  const start = run(yellowUp, inv(PLACE));
  const placed = (s, p) => pieceKey(s, p) === pieceKey(yellowUp, p);
  check(placed(start, [1, 1, 1]) && C.slice(1).every((p) => !placed(start, p)), "front-right corner is the one in place");
  const st = steps(start, PLACE, { hl: [pieceKey(start, [1, 1, 1])] }, "¡Las cuatro en su sitio!");
  check(C.every((p) => placed(st.end, p)), "corners placed");
  check([[1, 0, 1], [1, 0, -1], [-1, 0, 1], [-1, 0, -1]].every((p) => pieceSolved(st.end, p)), "middle kept");
  pages.push(`<section>
    <div class="step">Paso 6</div><h2>Las esquinas amarillas en su sitio</h2>
    <p class="hold-line"><b>Amarillo arriba.</b></p>
    <p>Cada esquina de arriba tiene que estar en su sitio: el sitio donde se juntan los tres centros de sus colores. En este paso <b>da igual si está girada</b> (con el amarillo hacia un lado): eso se arregla en el paso 7.</p>
    <h3>1. Busca una esquina que ya esté en su sitio</h3>
    <p>Coge el cubo con esa esquina <b>arriba, delante, a la derecha</b> (rodeada en rosa). Haz estos 8 giros: las otras tres cambian de sitio entre ellas.</p>
    ${st.html}
    <p class="tip">Si después no están las cuatro en su sitio, repite los 8 giros con la misma esquina delante a la derecha. Si <b>ninguna</b> está en su sitio, haz los 8 giros una vez desde cualquier lado y vuelve a mirar.</p>
  </section>`);
}

// ---------- step 7: twist the yellow corners ----------
{
  const plan = [...times(T, 2), "U", ...times(T, 4), "U'"];
  const start = run(yellowUp, inv(plan));
  check(allPos.filter((p) => p[1] <= 0).every((p) => pieceSolved(start, p)), "two layers solved at start");
  const first = run(start, times(T, 2));
  check(first.find((s) => s.c === "Y" && same(s.p, [1, 1, 1])).n[1] === 1, "first corner yellow up");
  const firstRound = steps(start, T, { hl: [pieceKey(start, [1, 1, 1])] }, "Tras 1 vez");
  const afterU = run(first, ["U"]);
  const second = run(afterU, times(T, 4));
  const finished = run(second, ["U'"]);
  check(finished.every((s) => s.c === center(finished, s.n)), "cube solved");
  const k1 = pieceKey(start, [1, 1, 1]), k2 = pieceKey(afterU, [1, 1, 1]);
  pages.push(`<section>
    <div class="step">Paso 7</div><h2>Girar las esquinas amarillas</h2>
    <p class="hold-line"><b>Amarillo arriba.</b></p>
    <p>Las esquinas ya están en su sitio; falta girarlas para que el amarillo quede arriba. Se usan los <b>mismos 4 giros del paso 2</b>.</p>
    <h3>1. Coge el cubo con una esquina mal girada arriba, delante, a la derecha</h3>
    <h3>2. Repite los 4 giros hasta que su amarillo quede arriba (2 o 4 veces)</h3>
    ${firstRound.html}
  </section>`);
  pages.push(`<section>
    <div class="warn"><b>¡Tranquilidad!</b> Mientras haces esto, la parte de abajo se desordena. Es normal: se arregla sola al final. No sueltes el cubo ni lo gires entero.</div>
    <div class="grid two">
      ${card(draw(first, { hl: [k1] }), "Tras 2 veces", "Esta esquina ya tiene el amarillo arriba. Abajo está desordenado: normal.")}
      ${card(draw(first, { hl: [k1], move: "U" }), "3. Gira solo la capa de arriba", "Hasta que la siguiente esquina mal girada quede delante a la derecha. No gires el cubo entero.")}
    </div>
    <div class="grid two">
      ${card(draw(afterU, { hl: [k2] }), "La siguiente esquina", "Vuelve a repetir los 4 giros hasta que su amarillo quede arriba.")}
      ${card(draw(second, { hl: [k2] }), "Tras 4 veces", "Con la última esquina, la parte de abajo vuelve a quedar bien ella sola.")}
    </div>
    <h3>4. Al final, gira la capa de arriba hasta que todo coincida</h3>
    <div class="grid two">
      ${card(draw(second, { move: "U'" }), esc(WORD["U'"]), "", 1)}
      ${card(draw(finished), "¡Cubo resuelto!", "", "", "end")}
    </div>
  </section>`);
}

// ---------- summary ----------
const chuleta = [
  ["1. Cruz blanca", "Blanco arriba. Sin giros que aprender.", ""],
  ["2. Esquinas blancas", "Blanco arriba. Esquina abajo, delante a la derecha. Repite hasta que suba bien (1, 3 o 5 veces):", "R' D' R D"],
  ["3. Segunda capa", "Amarillo arriba. Raya vertical delante. Si va a la derecha:", "U R U' R' U' F' U F"],
  ["", "Si va a la izquierda:", "U' L' U L U F U' F'"],
  ["4. Cruz amarilla", "Punto, L (detrás e izquierda) o raya tumbada:", "F R U R' U' F'"],
  ["5. Aristas amarillas", "Dos buenas detrás y a la derecha:", "R U R' U R U2 R' U"],
  ["6. Esquinas en su sitio", "Esquina buena delante a la derecha:", "U R U' L' U R' U' L"],
  ["7. Girar esquinas", "Esquina mal girada delante a la derecha. Repite (2 o 4 veces); entre esquina y esquina gira solo arriba:", "R' D' R D"],
];
pages.push(`<section>
  <h2>Chuleta</h2>
    <table class="sheet">${chuleta.map(([a, b, m]) => `<tr><th>${a}</th><td>${b}${m ? `<div class="seq">${seq(m).map((t) => `<span>${esc(WORD[t])}</span>`).join("")}</div>` : ""}</td></tr>`).join("")}</table>
  <p class="tip">Con práctica, los giros se te quedarán en las manos y no necesitarás la guía.</p>
</section>`);

const css = `
@page { size: A4; margin: 14mm 13mm 16mm; }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", Arial, sans-serif; color: #1F2328; margin: 0; font-size: 12.5pt; line-height: 1.45; }
section { break-before: page; }
section:first-child { break-before: auto; }
h2 { font-size: 22pt; margin: 0 0 6pt; color: #0B3D91; }
h3 { font-size: 13pt; margin: 10pt 0 3pt; color: #0B3D91; }
p { margin: 4pt 0; }
.step { display: inline-block; background: #0B3D91; color: #fff; font-weight: 700; border-radius: 999px; padding: 2pt 12pt; font-size: 11pt; margin-bottom: 4pt; }
.hold-line { background: #EEF4FF; border-left: 5pt solid #0B3D91; padding: 5pt 9pt; border-radius: 4pt; }
.tip { background: #FFF8E1; border-left: 5pt solid #F5B700; padding: 6pt 9pt; border-radius: 4pt; margin-top: 10pt; }
.warn { background: #FDECEC; border-left: 5pt solid #DC2626; padding: 8pt 10pt; border-radius: 4pt; margin: 4pt 0 10pt; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6pt; margin: 5pt 0; }
.grid.two { grid-template-columns: repeat(2, 1fr); }
.grid.three { grid-template-columns: repeat(3, 1fr); }
.grid.four { grid-template-columns: repeat(4, 1fr); }
.grid.one { grid-template-columns: 1fr; justify-items: center; }
.grid.one .card { width: 55%; }
.card { position: relative; margin: 0; border: 1pt solid #DADDE1; border-radius: 8pt; padding: 4pt 5pt 6pt; text-align: center; break-inside: avoid; background: #fff; }
.card svg { display: block; margin: 0 auto; }
.card figcaption b { display: block; font-size: 11.5pt; line-height: 1.25; }
.card figcaption small { display: block; font-size: 10pt; color: #4B5563; margin-top: 2pt; line-height: 1.3; }
.card .num { position: absolute; top: 5pt; left: 6pt; background: #0B3D91; color: #fff; font-weight: 700; width: 20pt; height: 20pt; border-radius: 50%; display: grid; place-items: center; font-size: 11pt; }
.card.end { border-color: #16A34A; background: #F0FBF4; }
.card.good { border-color: #16A34A; background: #F0FBF4; }
.card.bad { border-color: #DC2626; background: #FDF2F2; }
.x2 { font: 700 0.42px "Segoe UI", Arial, sans-serif; fill: #fff; text-anchor: middle; }
.lab { font: 700 0.4px "Segoe UI", Arial, sans-serif; fill: #1F2328; text-anchor: middle; }
.cover { text-align: center; padding-top: 30mm; }
.cover .brand { font-weight: 800; font-size: 16pt; color: #0B3D91; letter-spacing: .5pt; }
.cover h1 { font-size: 30pt; margin: 8pt 0; line-height: 1.15; }
.cover .lead { font-size: 14pt; color: #374151; }
.cover-cube { margin: 18pt auto; display: flex; justify-content: center; }
.promise { text-align: left; display: inline-block; font-size: 12.5pt; }
.hold { display: flex; gap: 14pt; align-items: center; }
.hold-text p { margin: 3pt 0; }
.sheet { width: 100%; border-collapse: collapse; margin-top: 8pt; }
.sheet th { text-align: left; vertical-align: top; width: 26%; padding: 5pt 6pt; border-bottom: 1pt solid #DADDE1; color: #0B3D91; }
.sheet td { padding: 5pt 6pt; font-size: 11pt; border-bottom: 1pt solid #DADDE1; }
.seq { display: flex; flex-wrap: wrap; gap: 4pt; margin-top: 4pt; }
.seq span { background: #EEF4FF; border-radius: 4pt; padding: 1pt 5pt; font-size: 9pt; }
`;

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>CuboFácil: guía paso a paso</title><style>${css}</style></head><body>${pages.join("\n")}</body></html>`;
const out = fileURLToPath(new URL("./guia.html", import.meta.url));
writeFileSync(out, html);
console.log("ok", out);
