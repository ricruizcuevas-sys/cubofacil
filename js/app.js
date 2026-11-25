// CuboFácil: the guide as an app. One thing at a time: you read the turn, look at the arrow, do it on
// your cube and press «Hecho». Nothing plays by itself. Your own cube can be read from two photos.
import { applyMoves, randomScramble, rot, solvedCube, COLOR_NAME } from "./cube.js";
import { ALG, ALG_INFO, STAGES, plan, currentStage, showFor, cubeTurnOf, centreColor } from "./guided.js";
import { WORD, centreName } from "./words.js";
import { CubeView } from "./view.js";
import { draw } from "./draw.js";
import { checkCube } from "./validate.js";
import { HANDLE_ORDER, defaultHandles, squarePoints, measure, classify, assemble, imagePoint } from "./photo.js";

const app = document.getElementById("app");
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const seq = (t) => t.trim().split(/\s+/);
const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
const yellowUp = solvedCube();
const whiteUp = yellowUp.map((s) => ({ p: rot(s.p, 2, 2), n: rot(s.n, 2, 2), c: s.c }));
let cleanup = () => {};

function icon(name) {
  const paths = {
    back: '<path d="M15 5 8 12l7 7"/>',
    next: '<path d="m9 5 7 7-7 7"/>',
    again: '<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    image: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="m4 16 5-5 4 4 3-3 4 4"/>',
    hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 11V4.5a1.5 1.5 0 0 1 3 0V11"/><path d="M14 11V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.6 14.6a1.6 1.6 0 0 1 2.6-1.8L8 15"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="15" r="1.2"/><circle cx="15" cy="9" r="1.2"/><circle cx="9" cy="15" r="1.2"/>',
    wand: '<path d="m4 20 11-11"/><path d="m14 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/><path d="m19 11 .6 1.2 1.2.6-1.2.6L19 14.6l-.6-1.2-1.2-.6 1.2-.6z"/>',
    rotate: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    pdf: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h4"/>',
  };
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

// ───────── Lessons (same content as the printed guide) ─────────
const LESSONS = [
  {
    hold: "Sujeta el cubo con el centro blanco arriba.",
    picture: () => draw(whiteUp, { show: showFor(0), w: 190 }),
    text: [
      "Hay que hacer una <b>cruz blanca</b> arriba.",
      "El otro color de cada pieza de la cruz tiene que ser <b>igual que el centro de su lado</b>.",
      "Aquí <b>no hay giros que aprender</b>: ve moviendo las piezas una a una. En la práctica te digo los giros exactos de cada pieza.",
    ],
    tip: "Pista: si una pieza blanca está abajo con el blanco mirando al suelo, gira la capa de abajo hasta que su otro color quede debajo del centro de ese color, y gira la de delante media vuelta.",
    algs: [],
  },
  {
    hold: "Sigue con el blanco arriba.",
    picture: () => draw(whiteUp, { show: showFor(1), w: 190 }),
    text: [
      "Busca una esquina blanca en la capa de abajo. Su sitio es arriba, entre los centros de sus otros dos colores.",
      "Gira el cubo entero para tener su sitio <b>delante a la derecha</b>, y gira la capa de abajo hasta que la esquina quede <b>justo debajo</b>.",
      "Repite los 4 giros hasta que suba con el blanco arriba: 1, 3 o 5 veces.",
    ],
    tip: "Si una esquina blanca está arriba pero mal, ponla delante a la derecha y haz los 4 giros una vez: bajará y ya la puedes colocar.",
    algs: [{ name: "Los 4 giros", moves: ALG.T }],
  },
  {
    hold: "Dale la vuelta al cubo: amarillo arriba y blanco abajo. Ya no se lo vuelves a dar.",
    picture: () => draw(yellowUp, { show: showFor(2), w: 190 }),
    text: [
      "Busca arriba una arista <b>sin amarillo</b>.",
      "Gira la capa de arriba hasta que su color de delante sea igual que el centro de delante: se forma una raya vertical.",
      "Mira su color de arriba: si es el del centro de la <b>derecha</b>, va a la derecha; si es el de la <b>izquierda</b>, a la izquierda.",
    ],
    tip: "Si una arista está en la fila del medio pero mal, ponla delante a la derecha y haz los 8 giros de «a la derecha»: saldrá arriba.",
    algs: [{ name: "Va a la derecha", moves: ALG.RIGHT }, { name: "Va a la izquierda", moves: ALG.LEFT }],
  },
  {
    hold: "Amarillo arriba.",
    picture: () => draw(yellowUp, { show: showFor(3), w: 190 }),
    text: [
      "Hay que hacer una cruz amarilla arriba. <b>Solo importa el amarillo</b>: los colores de los lados todavía no.",
      "Si ves un <b>punto</b>, haz los 6 giros: saldrá una «L».",
      "Si ves una <b>«L»</b>, ponla detrás y a la izquierda y haz los 6 giros: saldrá una raya.",
      "Si ves una <b>raya</b>, ponla tumbada (de izquierda a derecha) y haz los 6 giros: saldrá la cruz.",
    ],
    algs: [{ name: "Los 6 giros", moves: ALG.CROSS }],
  },
  {
    hold: "Amarillo arriba.",
    picture: () => draw(yellowUp, { show: showFor(4), w: 190 }),
    text: [
      "Ahora el otro color de cada arista de la cruz tiene que ser igual que el centro de su lado.",
      "Gira la capa de arriba hasta que coincidan al menos dos.",
      "Si son vecinas, ponlas <b>detrás y a la derecha</b> y haz los 8 giros. Si están una enfrente de la otra, haz los 8 giros una vez y vuelve a mirar.",
    ],
    algs: [{ name: "Los 8 giros", moves: ALG.SWAP }],
  },
  {
    hold: "Amarillo arriba.",
    picture: () => draw(yellowUp, { w: 190 }),
    text: [
      "Cada esquina de arriba tiene que estar en su sitio: donde se juntan los tres centros de sus colores. <b>Da igual si está girada</b>.",
      "Busca una que ya esté en su sitio, ponla <b>delante a la derecha</b> y haz los 8 giros. Repite si hace falta.",
      "Si ninguna está en su sitio, haz los 8 giros una vez y vuelve a mirar.",
    ],
    algs: [{ name: "Los 8 giros", moves: ALG.PLACE }],
  },
  {
    hold: "Amarillo arriba. No gires el cubo entero hasta terminar.",
    picture: () => draw(yellowUp, { w: 190 }),
    text: [
      "Pon una esquina mal girada <b>delante a la derecha</b> y repite los <b>4 giros del paso 2</b> hasta que su amarillo quede arriba (2 o 4 veces).",
      "Luego gira <b>solo la capa de arriba</b> para traer la siguiente esquina mal girada, y repite.",
      "Mientras tanto la parte de abajo se desordena. Es normal: se arregla sola al terminar.",
    ],
    algs: [{ name: "Los 4 giros", moves: ALG.T }],
  },
];

// ───────── The step-by-step player ─────────
/** One thing at a time on the 3D cube: read, look at the arrow, do it, press «Siguiente». Nothing plays by itself.
 *  options: { steps, end, grey, saveKey, finish, rail: show the 7-step rail (tutorial) }. */
function player(root, { steps, end, grey = false, saveKey = null, finish, rail = false }) {
  root.innerHTML = `
    ${rail ? `<nav class="rail" aria-label="Los 7 pasos">${STAGES.map((s, k) => `<button class="rail-step" data-stage="${k}" aria-label="Paso ${k + 1}: ${esc(s.title)}"><span>${k + 1}</span></button>`).join("")}</nav>` : `<div class="progress"><span></span></div>`}
    <div class="stage-head"><p class="kicker"></p><h2 class="stage-title"></h2></div>
    <div class="cube-card">
      <div class="cube" id="cube"></div>
      <button class="reset-view" type="button" aria-label="Recolocar el cubo">${icon("again")}</button>
      <p class="cube-hint">Arrastra el cubo para verlo por todos lados</p>
    </div>
    <section class="panel" aria-live="polite">
      <p class="panel-note"></p>
      <p class="panel-main"></p>
      <div class="panel-why"></div>
      <div class="panel-lesson"></div>
    </section>
    <div class="after"></div>
    <div class="controls">
      <button class="ctl" data-act="prev" aria-label="Atrás">${icon("back")}</button>
      <button class="ctl" data-act="again">${icon("again")}<span>Repetir</span></button>
      <button class="ctl main" data-act="next"><span>Siguiente</span>${icon("next")}</button>
    </div>`;
  const view = new CubeView(root.querySelector("#cube"));
  root.querySelector(".reset-view").onclick = () => view.resetView();
  let i = Math.min(Number(saveKey ? store.get(saveKey) : 0) || 0, steps.length);
  let busy = false;
  const firstOfStage = (k) => steps.findIndex((st) => st.stage === k);
  const render = () => {
    const st = steps[i];
    const state = st ? st.before : end;
    view.setState(state, st?.hl ?? [], grey && st ? showFor(st.stage) : null);
    view.showArrow(st?.kind === "move" ? st.token : null);
    if (saveKey) store.set(saveKey, String(i));
    const stage = st ? st.stage : 7;
    if (rail) root.querySelectorAll(".rail-step").forEach((b, k) => { b.classList.toggle("done", k < stage); b.classList.toggle("now", k === stage); b.disabled = firstOfStage(k) < 0 || k > stage; });
    else root.querySelector(".progress span").style.width = `${Math.round((i / steps.length) * 100)}%`;
    root.querySelector(".kicker").textContent = st ? `Paso ${stage + 1} de 7` : "Terminado";
    root.querySelector(".stage-title").textContent = st ? STAGES[stage].title : "¡Cubo resuelto!";
    const note = root.querySelector(".panel-note"), main = root.querySelector(".panel-main"), why = root.querySelector(".panel-why"), lesson = root.querySelector(".panel-lesson");
    lesson.innerHTML = ""; why.innerHTML = "";
    if (!st) {
      note.textContent = ""; main.textContent = "Lo has conseguido.";
      root.querySelector(".controls").hidden = true;
      root.querySelector(".after").innerHTML = finish ?? "";
      return;
    }
    root.querySelector(".controls").hidden = false;
    root.querySelector(".after").innerHTML = "";
    const next = root.querySelector('[data-act="next"] span');
    if (st.kind === "info") {
      note.textContent = st.group && st.group !== STAGES[stage].title ? st.group : "";
      main.textContent = st.algCard ? st.title : st.lesson ? "Qué vamos a hacer" : st.title;
      why.innerHTML = st.text ? `<p>${esc(st.text)}</p>` : "";
      if (st.lesson) lesson.innerHTML = st.lesson;
      next.textContent = st.algCard ? "Ver los giros" : st.lesson ? "Empezar" : "Entendido";
    } else if (st.kind === "cube") {
      note.textContent = "Gira el cubo entero en la mano, sin mover ninguna capa";
      main.textContent = st.text;
      why.innerHTML = st.note ? `<p><b>Para qué:</b> ${esc(st.note)}</p>` : "";
      next.textContent = "Hecho";
    } else {
      note.textContent = [st.group, st.note].filter(Boolean).join(" · ");
      main.textContent = st.text;
      why.innerHTML = st.why ? `<p><b>Por qué:</b> ${esc(st.why)}</p>` : "";
      next.textContent = "Hecho";
    }
    root.querySelector('[data-act="again"]').disabled = st.kind === "info";
    root.querySelector('[data-act="prev"]').disabled = i === 0;
  };
  root.querySelector('[data-act="next"]').onclick = async () => {
    if (busy || i >= steps.length) return;
    busy = true;
    const st = steps[i];
    view.showArrow(null);
    const nextState = steps[i + 1]?.before ?? end;
    if (st.kind === "move") await view.animateMove(st.token, nextState, 560);
    else if (st.kind === "cube") { const [axis, q] = cubeTurnOf(st.token); await view.animateCube(axis, q, nextState, 760); }
    i++;
    busy = false;
    render();
    if (steps[i]?.kind === "info") root.querySelector(".stage-head").scrollIntoView({ behavior: "smooth", block: "start" });
  };
  root.querySelector('[data-act="prev"]').onclick = () => { if (busy || i === 0) return; i--; render(); };
  root.querySelector('[data-act="again"]').onclick = async () => {
    const st = steps[i];
    if (busy || !st || st.kind === "info") return;
    busy = true;
    view.showArrow(null);
    if (st.kind === "move") await view.replayMove(st.token, 650);
    else { const [axis, q] = cubeTurnOf(st.token); await view.animateCube(axis, q, steps[i + 1]?.before ?? end, 760); await new Promise((r) => setTimeout(r, 400)); }
    busy = false;
    render();
  };
  if (rail) root.querySelectorAll(".rail-step").forEach((b) => (b.onclick = () => { if (busy || b.disabled) return; i = firstOfStage(Number(b.dataset.stage)); render(); }));
  render();
}

/** The lesson of a step, as in the guide: how to hold it, the idea, and its algorithm with every turn named. */
function lessonIntro(n) {
  const L = LESSONS[n];
  return `
    <p class="hold-line">${icon("hand")}<span>${esc(L.hold)}</span></p>
    <ol class="ideas">${L.text.map((t) => `<li>${t}</li>`).join("")}</ol>
    ${L.algs.map((a) => `<div class="alg"><p class="alg-name">${esc(a.name)}</p><ol class="alg-moves">${seq(a.moves).map((t) => `<li>${esc(WORD[t])}</li>`).join("")}</ol></div>`).join("")}
    ${L.tip ? `<p class="tip">${esc(L.tip)}</p>` : ""}
    <p class="tip soft">Ahora lo verás con el cubo, giro a giro, y te diremos para qué sirve cada giro.</p>`;
}

// ───────── Screens ─────────
let heroTimer = 0;
function home() {
  const tutorial = store.get(TUTORIAL_KEY);
  app.innerHTML = `
    <section class="hero">
      <div class="hero-cube" id="hero-cube" aria-hidden="true"></div>
      <p class="eyebrow">Método por capas · 7 pasos</p>
      <h1>Aprende a resolver el cubo de Rubik</h1>
      <p class="lead">Un tutorial con un cubo en 3D: te explicamos cada paso y lo ves hecho, giro a giro, en el mismo cubo de principio a fin.</p>
    </section>
    <section class="feature">
      <div class="feature-head"><span class="badge">Tutorial</span><h2>Los 7 pasos, con un cubo de verdad</h2><p>Elige con qué cubo quieres aprender.</p></div>
      ${tutorial ? `<a class="btn primary wide" href="#/tutorial">${icon("next")}<span>Seguir el tutorial</span></a>` : ""}
      <div class="choice">
        <button class="choice-card" data-start="random">${icon("dice")}<b>Con un cubo inventado</b><small>Mezclamos uno al azar y lo resolvemos juntos.</small></button>
        <a class="choice-card" href="#/mi-cubo?para=tutorial">${icon("camera")}<b>Con mi cubo</b><small>Haz 2 fotos de tu cubo y aprende con él.</small></a>
      </div>
    </section>
    <h2 class="section">Los 7 pasos</h2>
    <ol class="steps-list">${STAGES.map((l, k) => `<li><a href="#/paso/${k + 1}"><span class="num">${k + 1}</span><span class="steps-text"><strong>${esc(l.title)}</strong><small>${esc(l.goal)}</small></span>${icon("next")}</a></li>`).join("")}</ol>
    <h2 class="section">Más</h2>
    <div class="tiles">
      <a class="tile" href="#/giros">${icon("rotate")}<b>Los giros</b><small>Los 12 giros, dibujados.</small></a>
      <a class="tile" href="guia/CuboFacil-guia.pdf" download>${icon("pdf")}<b>Guía en PDF</b><small>Para imprimir, con todos los dibujos.</small></a>
    </div>
    <p class="foot">CuboFácil · <span class="version">Versión 3</span></p>`;
  const hero = new CubeView(app.querySelector("#hero-cube"));
  hero.setState(applyMoves(solvedCube(), seq("R U R' U'")));
  let yaw = 0;
  clearInterval(heroTimer);
  heroTimer = setInterval(() => { yaw += 0.35; hero.drag.yaw = yaw; hero.applyCamera(false); }, 30);
  cleanup = () => clearInterval(heroTimer);
  app.querySelector('[data-start="random"]').onclick = () => startTutorial(applyMoves(solvedCube(), randomScramble(25)), "random");
}

const TUTORIAL_KEY = "cubofacil-tutorial-cubo";
const TUTORIAL_STEP = "cubofacil-tutorial-paso";
function startTutorial(state, kind) {
  store.set(TUTORIAL_KEY, JSON.stringify({ code: encode(state), kind }));
  store.del(TUTORIAL_STEP);
  if (location.hash === "#/tutorial") route();
  else location.hash = "#/tutorial";
}

function tutorialPage() {
  let saved = null;
  try { saved = JSON.parse(store.get(TUTORIAL_KEY) ?? "null"); } catch { saved = null; }
  if (!saved?.code) { location.hash = "#/"; return; }
  const state = decode(saved.code);
  const { steps, end } = plan(state);
  // Each step opens with its lesson, as in the guide.
  for (const st of steps) if (st.kind === "info" && /^Paso \d/.test(st.title)) st.lesson = lessonIntro(st.stage);
  // Owner, 25/11/2026: before an algorithm is used, it is explained (in full the first time, briefly after).
  const seen = new Set();
  for (let k = steps.length - 1; k >= 0; k--) {
    const st = steps[k];
    if (st.kind !== "move" || !st.alg || st.algIndex !== 0) continue;
    const info = ALG_INFO[st.alg];
    steps.splice(k, 0, { kind: "info", stage: st.stage, group: st.group, hl: st.hl, before: st.before, title: info.name, text: "", alg: st.alg, algCard: true });
  }
  for (const st of steps) {
    if (!st.algCard) continue;
    const info = ALG_INFO[st.alg];
    const first = !seen.has(st.alg);
    seen.add(st.alg);
    st.text = first ? info.what : `Otra vez el mismo algoritmo: ${info.what.charAt(0).toLowerCase()}${info.what.slice(1)}`;
    st.lesson = first
      ? `<div class="alg"><p class="alg-name">Algoritmo · ${seq(ALG[st.alg]).length} giros</p><p class="alg-when">${esc(info.when)}</p><ol class="alg-moves">${seq(ALG[st.alg]).map((t) => `<li>${esc(WORD[t])}</li>`).join("")}</ol></div><p class="tip soft">Ahora lo verás giro a giro, con para qué sirve cada uno.</p>`
      : "";
  }
  const top = centreColor(state, [0, 1, 0]), front = centreColor(state, [0, 0, 1]), right = centreColor(state, [1, 0, 0]);
  steps.unshift({
    kind: "info", stage: 0, group: "", hl: [], before: state,
    title: saved.kind === "mine" ? "Coge tu cubo así" : "Este es nuestro cubo mezclado",
    text: saved.kind === "mine"
      ? `Como en la primera foto: ${centreName(top)} arriba, ${centreName(front)} delante y ${centreName(right)} a la derecha. Lo resolveremos juntos en 7 pasos.`
      : `Lo resolveremos en 7 pasos, siempre este mismo cubo. Si tienes uno, mézclalo igual o síguelo mirando: ${centreName(top)} arriba y ${centreName(front)} delante.`,
  });
  app.innerHTML = `<div class="bar"><a class="back" href="#/">${icon("back")} Inicio</a><button class="link" data-restart>Empezar con otro cubo</button></div><div id="play"></div>`;
  app.querySelector("[data-restart]").onclick = () => { store.del(TUTORIAL_KEY); store.del(TUTORIAL_STEP); location.hash = "#/"; };
  player(app.querySelector("#play"), {
    steps, end, grey: true, rail: true, saveKey: TUTORIAL_STEP,
    finish: `<div class="done-card"><p class="done-title">¡Cubo resuelto!</p><p>Ya conoces los 7 pasos. Prueba con otro cubo, o repasa la guía en PDF.</p><div class="row"><button class="btn primary" data-again>Otro cubo inventado</button><a class="btn ghost" href="guia/CuboFacil-guia.pdf" download>Guía en PDF</a></div></div>`,
  });
}

function turnsPage() {
  const list = ["R", "R'", "L", "L'", "U", "U'", "D", "D'", "F", "F'", "U2", "F2"];
  app.innerHTML = `
    <a class="back" href="#/">${icon("back")} Inicio</a>
    <p class="eyebrow">Antes de empezar</p>
    <h1>Los giros</h1>
    <p class="lead">Un giro mueve una sola capa un cuarto de vuelta. El resto del cubo se queda quieto en tu mano. La flecha dice hacia dónde va la parte de delante de esa capa.</p>
    <div class="pics">${list.map((t) => `<figure class="pic">${draw(yellowUp, { move: t, w: 140 })}<figcaption>${esc(WORD[t])}</figcaption></figure>`).join("")}</div>`;
}

function lessonPage(n) {
  const L = LESSONS[n], S = STAGES[n];
  app.innerHTML = `
    <a class="back" href="#/">${icon("back")} Inicio</a>
    <p class="eyebrow">Paso ${n + 1} de 7</p>
    <h1>${esc(S.title)}</h1>
    <p class="lead">${esc(S.goal)}</p>
    <figure class="pic goal-pic">${L.picture()}<figcaption>Así tiene que quedar</figcaption></figure>
    <section class="panel">${lessonIntro(n).replace('<p class="tip soft">Ahora lo verás con el cubo, giro a giro, y te diremos para qué sirve cada giro.</p>', "")}</section>
    <div class="row"><a class="btn primary" href="#/tutorial">${icon("next")}<span>Verlo en el tutorial</span></a></div>`;
  app.querySelector('a[href="#/tutorial"]').onclick = (e) => {
    if (store.get(TUTORIAL_KEY)) return;
    e.preventDefault();
    startTutorial(applyMoves(solvedCube(), randomScramble(25)), "random");
  };
}

// ───────── My cube: photos, review, solve ─────────
// The net: U on top; L, F, R, B in a row; D below. Each cell is a square of the cube.
const FACES = [
  { id: "U", col: 2, row: 1, n: [0, 1, 0], p: (r, c) => [c - 1, 1, r - 1] },
  { id: "L", col: 1, row: 2, n: [-1, 0, 0], p: (r, c) => [-1, 1 - r, c - 1] },
  { id: "F", col: 2, row: 2, n: [0, 0, 1], p: (r, c) => [c - 1, 1 - r, 1] },
  { id: "R", col: 3, row: 2, n: [1, 0, 0], p: (r, c) => [1, 1 - r, 1 - c] },
  { id: "B", col: 4, row: 2, n: [0, 0, -1], p: (r, c) => [1 - c, 1 - r, -1] },
  { id: "D", col: 2, row: 3, n: [0, -1, 0], p: (r, c) => [c - 1, -1, 1 - r] },
];
const CELLS = FACES.flatMap((f) => [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => ({ face: f, r, c, p: f.p(r, c), n: f.n }))));
const encode = (state) => CELLS.map((cell) => state.find((s) => same(s.p, cell.p) && same(s.n, cell.n)).c).join("");
const decode = (code) => CELLS.map((cell, i) => ({ p: cell.p, n: cell.n, c: code[i] }));
const CSS_COLOR = { W: "#F4F4F4", Y: "#FFD500", G: "#16A34A", B: "#1D4ED8", O: "#F97316", R: "#DC2626", "?": "#3A4157" };

const photos = [null, null]; // { canvas, image, handles }

const purpose = () => "tutorial";
function myCube() {
  const forTutorial = purpose() === "tutorial";
  app.innerHTML = `
    <a class="back" href="#/">${icon("back")} Inicio</a>
    <p class="eyebrow">${forTutorial ? "Tutorial con tu cubo" : "Sin tutorial"}</p>
    <h1>${forTutorial ? "Aprende con tu cubo" : "Resolver mi cubo"}</h1>
    <p class="lead">Con 2 fotos leemos los colores de tu cubo. Las fotos no salen de tu móvil.</p>
    ${[0, 1].map((i) => `
      <section class="card photo-slot" data-slot="${i}">
        <h2>Foto ${i + 1}</h2>
        <div class="slot-help">${i === 0
          ? "Coge el cubo con una esquina hacia ti, de forma que se vean <b>tres caras</b>: la de arriba y dos de lado. Fíjate en cómo lo tienes: así lo tendrás que coger para resolverlo."
          : "Ahora dale la vuelta para ver <b>las otras tres caras</b>: la esquina contraria. Que se vean las tres caras que no salían en la primera foto."}</div>
        <div class="slot-body">${photos[i] ? `<img class="thumb" alt="Foto ${i + 1}" src="${photos[i].canvas.toDataURL("image/jpeg", 0.7)}">` : ""}</div>
        <div class="row">
          <label class="btn ${photos[i] ? "ghost" : ""}">${icon("camera")} Hacer foto<input type="file" accept="image/*" capture="environment" hidden data-file="${i}"></label>
          <label class="btn ghost">${icon("image")} Elegir de la galería<input type="file" accept="image/*" hidden data-file="${i}"></label>
        </div>
        ${photos[i] ? `<button class="btn ghost small-btn" data-align="${i}">Ajustar los puntos de esta foto</button>` : ""}
      </section>`).join("")}
    <button class="btn" data-read ${photos[0] && photos[1] ? "" : "disabled"}>Leer los colores</button>
    <p class="small">¿Prefieres no hacer fotos? <a href="#/mi-cubo/repaso">Pinta los colores a mano</a>.</p>`;
  app.querySelectorAll("[data-file]").forEach((input) => {
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const i = Number(input.dataset.file);
      const canvas = await loadPhoto(file);
      photos[i] = { canvas, handles: defaultHandles(canvas.width, canvas.height) };
      alignScreen(i);
    };
  });
  app.querySelectorAll("[data-align]").forEach((b) => (b.onclick = () => alignScreen(Number(b.dataset.align))));
  app.querySelector("[data-read]").onclick = () => {
    const samples = [];
    photos.forEach((ph, k) => {
      const img = ph.canvas.getContext("2d").getImageData(0, 0, ph.canvas.width, ph.canvas.height);
      for (const sq of squarePoints(ph.handles)) samples.push({ rgb: measure(img, sq.x, sq.y, sq.r), photo: k, centre: sq.p.filter((x) => x).length === 1 });
    });
    const colours = classify(samples);
    const { state } = assemble(colours.slice(0, 27), colours.slice(27));
    store.set("cubofacil-borrador", encode(state));
    location.hash = "#/mi-cubo/repaso";
  };
}

async function loadPhoto(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode();
  const scale = Math.min(1, 1000 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  return canvas;
}

/** The person drags 7 points onto the cube's corners; the dots show the colour read in each square. */
function alignScreen(i) {
  const ph = photos[i];
  const { width: w, height: h } = ph.canvas;
  app.innerHTML = `
    <h1>Foto ${i + 1}: marca el cubo</h1>
    <p class="goal">Arrastra los puntos a las esquinas del cubo: el <b>del medio</b> a la esquina que tienes más cerca, y los otros <b>seis</b> al borde del cubo. Cuando la rejilla encaje con los cuadrados, pulsa <b>Listo</b>.</p>
    <div class="align"><img alt="" src="${ph.canvas.toDataURL("image/jpeg", 0.85)}"><svg class="overlay" viewBox="0 0 ${w} ${h}"></svg></div>
    <div class="row"><button class="btn ghost" data-reset>Volver a empezar los puntos</button><button class="btn" data-done>Listo</button></div>`;
  const svg = app.querySelector(".overlay");
  const data = ph.canvas.getContext("2d").getImageData(0, 0, w, h);
  const R = Math.max(w, h) * 0.022;
  const paint = () => {
    const hs = ph.handles;
    let out = "";
    for (const n of [[0, 1, 0], [0, 0, 1], [1, 0, 0]]) {
      const axis = n.findIndex((x) => x);
      const [a, b] = [0, 1, 2].filter((x) => x !== axis);
      for (const t of [-1.5, -0.5, 0.5, 1.5]) {
        for (const [u, v] of [[a, b], [b, a]]) {
          const p1 = [0, 0, 0], p2 = [0, 0, 0];
          p1[axis] = p2[axis] = 1.5; p1[u] = p2[u] = t; p1[v] = -1.5; p2[v] = 1.5;
          const [x1, y1] = imagePoint(hs, p1, n), [x2, y2] = imagePoint(hs, p2, n);
          out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
        }
      }
    }
    for (const sq of squarePoints(hs)) {
      const [r, g, b] = measure(data, sq.x, sq.y, sq.r);
      out += `<circle class="dot" cx="${sq.x}" cy="${sq.y}" r="${R * 0.55}" fill="rgb(${r},${g},${b})" />`;
    }
    for (const name of HANDLE_ORDER) {
      const [x, y] = hs[name];
      out += `<circle class="handle${name === "C" ? " centre" : ""}" data-h="${name}" cx="${x}" cy="${y}" r="${R}" />`;
    }
    svg.innerHTML = out;
  };
  let drag = null;
  const toImage = (e) => { const b = svg.getBoundingClientRect(); return [((e.clientX - b.left) / b.width) * w, ((e.clientY - b.top) / b.height) * h]; };
  svg.addEventListener("pointerdown", (e) => {
    const [x, y] = toImage(e);
    let best = null;
    for (const name of HANDLE_ORDER) { const d = Math.hypot(ph.handles[name][0] - x, ph.handles[name][1] - y); if (!best || d < best.d) best = { name, d }; }
    if (best && best.d < R * 3.5) { drag = best.name; svg.setPointerCapture(e.pointerId); e.preventDefault(); }
  });
  let frame = 0;
  svg.addEventListener("pointermove", (e) => {
    if (!drag) return;
    ph.handles[drag] = toImage(e).map((v, k) => Math.max(0, Math.min(k ? h : w, v)));
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; paint(); });
  });
  const end = () => { drag = null; };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);
  app.querySelector("[data-reset]").onclick = () => { ph.handles = defaultHandles(w, h); paint(); };
  app.querySelector("[data-done]").onclick = () => { location.hash = "#/mi-cubo"; myCube(); };
  paint();
}

function reviewScreen() {
  // Hand painting starts from the usual centres: white up, green front, red right.
  let code = store.get("cubofacil-borrador") ?? CELLS.map((cell) => (cell.p.filter((x) => x).length === 1 ? { U: "W", D: "Y", F: "G", B: "B", R: "R", L: "O" }[cell.face.id] : "?")).join("");
  let brush = "W";
  app.innerHTML = `
    <a class="back" href="#/mi-cubo">${icon("back")} Fotos</a>
    <h1>Repasa los colores</h1>
    <p class="goal">Compara con tu cubo. Si una casilla está mal, elige el color de abajo y toca la casilla. La cara del centro es la que salía <b>abajo a la izquierda en la foto 1</b>; encima, la de arriba de esa foto.</p>
    <div class="brushes">${Object.keys(COLOR_NAME).map((c) => `<button class="brush" data-c="${c}" style="--c:${CSS_COLOR[c]}" aria-label="${COLOR_NAME[c]}" aria-pressed="${c === brush}"></button>`).join("")}</div>
    <div class="net">${FACES.map((f) => `<div class="face" style="grid-column:${f.col};grid-row:${f.row}">${[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => `<button class="cell" data-i="${CELLS.findIndex((x) => x.face === f && x.r === r && x.c === c)}"></button>`)).join("")}</div>`).join("")}</div>
    <div class="problems" aria-live="polite"></div>
    <div class="cube-wrap small-cube"><div class="cube" id="cube"></div></div>
    <button class="btn" data-go disabled>Empezar el tutorial con mi cubo</button>`;
  const view = new CubeView(app.querySelector("#cube"));
  const paint = () => {
    const cells = app.querySelectorAll(".cell");
    cells.forEach((el) => { el.style.setProperty("--c", CSS_COLOR[code[Number(el.dataset.i)]]); el.classList.remove("bad"); });
    store.set("cubofacil-borrador", code);
    const box = app.querySelector(".problems");
    const go = app.querySelector("[data-go]");
    if (code.includes("?")) {
      box.innerHTML = `<p>Faltan ${[...code].filter((c) => c === "?").length} casillas por pintar.</p>`;
      go.disabled = true;
      return;
    }
    const state = decode(code);
    view.setState(state);
    const res = checkCube(state);
    for (const pr of res.problems) for (const pos of pr.pieces) CELLS.forEach((cell, i) => { if (cell.p.join(",") === pos) cells.forEach((el) => { if (Number(el.dataset.i) === i) el.classList.add("bad"); }); });
    box.innerHTML = res.ok ? `<p class="ok">Todo cuadra: este cubo se puede resolver.</p>` : res.problems.map((p) => `<p>${esc(p.text)}</p>`).join("");
    go.disabled = !res.ok;
  };
  app.querySelectorAll(".brush").forEach((b) => (b.onclick = () => { brush = b.dataset.c; app.querySelectorAll(".brush").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }));
  app.querySelectorAll(".cell").forEach((el) => (el.onclick = () => { const i = Number(el.dataset.i); code = code.slice(0, i) + brush + code.slice(i + 1); paint(); }));
  if (purpose() === "tutorial") app.querySelector("[data-go]").textContent = "Empezar el tutorial con mi cubo";
  app.querySelector("[data-go]").onclick = () => {
    if (purpose() === "tutorial") return startTutorial(decode(code), "mine");
    store.set("cubofacil-mi-cubo", code);
    store.del("cubofacil-mi-cubo-paso");
    location.hash = "#/mi-cubo/resolver";
  };
  paint();
}

// ───────── Router ─────────
function route() {
  cleanup();
  cleanup = () => {};
  const query = new URLSearchParams(location.hash.split("?")[1] ?? "");
  if (query.get("para")) store.set("cubofacil-fotos-para", query.get("para") === "tutorial" ? "tutorial" : "resolver");
  const h = location.hash.replace(/\?.*$/, "");
  let m;
  if ((m = h.match(/^#\/paso\/([1-7])$/))) lessonPage(Number(m[1]) - 1);
  else if (h === "#/tutorial") tutorialPage();
  else if (h === "#/giros") turnsPage();
  else if (h === "#/mi-cubo") myCube();
  else if (h === "#/mi-cubo/repaso") reviewScreen();
  else home();
  window.scrollTo(0, 0);
}
// «Otro cubo inventado» at the end of the tutorial (one listener for the whole app).
document.addEventListener("click", (e) => { if (e.target.closest?.("[data-again]")) startTutorial(applyMoves(solvedCube(), randomScramble(25)), "random"); });
window.addEventListener("hashchange", route);
route();
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});

