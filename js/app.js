// CuboFácil: the guide as an app. One thing at a time: you read the turn, look at the arrow, do it on
// your cube and press «Hecho». Nothing plays by itself. Your own cube can be read from two photos.
import { applyMoves, randomScramble, rot, solvedCube, COLOR_NAME } from "./cube.js";
import { ALG, STAGES, plan, currentStage, showFor, cubeTurnOf, centreColor } from "./guided.js";
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
/**
 * Shows one step at a time. options: { steps, end, grey: show greyed pieces, saveKey: remember the step,
 * onFinish: html of the last screen }.
 */
function player(root, { steps, end, grey = false, saveKey = null, finish }) {
  root.innerHTML = `
    <div class="progress"><div class="progress-bar"><span></span></div><p class="progress-text"></p></div>
    <p class="group"></p>
    <div class="cube-wrap"><div class="cube" id="cube"></div><button class="reset-view" type="button">Recolocar vista</button></div>
    <div class="caption" aria-live="polite"><p class="counter"></p><p class="caption-main"></p><p class="caption-why"></p></div>
    <div class="controls">
      <button class="ctl" data-act="prev">${icon("back")}<span>Atrás</span></button>
      <button class="ctl" data-act="again">${icon("again")}<span>Ver cómo</span></button>
      <button class="ctl main" data-act="next">${icon("next")}<span>Hecho</span></button>
    </div>
    <div class="after"></div>`;
  const view = new CubeView(root.querySelector("#cube"));
  root.querySelector(".reset-view").onclick = () => view.resetView();
  let i = Math.min(Number(saveKey ? store.get(saveKey) : 0) || 0, steps.length);
  let busy = false;
  const total = steps.length;
  const render = () => {
    const st = steps[i];
    const state = st ? st.before : end;
    const show = grey && st ? showFor(st.stage) : null;
    view.setState(state, st?.hl ?? [], show);
    view.showArrow(st?.kind === "move" ? st.token : null);
    root.querySelector(".progress-bar span").style.width = `${Math.round((i / total) * 100)}%`;
    root.querySelector(".progress-text").textContent = st ? `Paso ${st.stage + 1} de 7 · ${STAGES[st.stage].title}` : "Terminado";
    root.querySelector(".group").textContent = st && st.kind !== "info" ? st.group : "";
    const counter = root.querySelector(".counter"), main = root.querySelector(".caption-main"), why = root.querySelector(".caption-why");
    const next = root.querySelector('[data-act="next"] span');
    if (saveKey) store.set(saveKey, String(i));
    if (!st) {
      counter.textContent = ""; main.textContent = "¡Hecho!"; why.innerHTML = "";
      root.querySelector(".controls").hidden = true;
      root.querySelector(".after").innerHTML = finish ?? "";
      return;
    }
    root.querySelector(".controls").hidden = false;
    root.querySelector(".after").innerHTML = "";
    if (st.kind === "info") {
      counter.textContent = ""; main.textContent = st.title; why.textContent = st.text; next.textContent = "Entendido";
    } else if (st.kind === "cube") {
      counter.textContent = "Gira el cubo entero, sin mover ninguna capa"; main.textContent = st.text; why.textContent = st.note ?? ""; next.textContent = "Hecho";
    } else {
      counter.textContent = st.note ?? ""; main.textContent = st.text; why.textContent = "Mira la flecha: muestra hacia dónde va la parte de delante de esa capa."; next.textContent = "Hecho";
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
    if (st.kind === "move") await view.animateMove(st.token, nextState, 550);
    else if (st.kind === "cube") { const [axis, q] = cubeTurnOf(st.token); await view.animateCube(axis, q, nextState, 750); }
    i++;
    busy = false;
    render();
  };
  root.querySelector('[data-act="prev"]').onclick = () => { if (busy || i === 0) return; i--; render(); };
  root.querySelector('[data-act="again"]').onclick = async () => {
    const st = steps[i];
    if (busy || !st || st.kind === "info") return;
    busy = true;
    view.showArrow(null);
    if (st.kind === "move") await view.replayMove(st.token, 650);
    else {
      const [axis, q] = cubeTurnOf(st.token);
      await view.animateCube(axis, q, steps[i + 1]?.before ?? end, 750);
      await new Promise((r) => setTimeout(r, 400));
    }
    busy = false;
    render();
  };
  render();
}

// ───────── Screens ─────────
function home() {
  const saved = store.get("cubofacil-mi-cubo");
  app.innerHTML = `
    <section class="hero">
      <h1>Aprende a resolver el cubo de Rubik</h1>
      <p>Siete pasos, un giro cada vez. Lees el giro, miras la flecha, lo haces en tu cubo y pulsas <b>Hecho</b>.</p>
    </section>
    <a class="big-link primary" href="#/mi-cubo">${icon("camera")}<span><b>Resolver mi cubo</b><small>Haz 2 fotos de tu cubo y te guío con él, giro a giro.</small></span></a>
    ${saved ? `<a class="big-link" href="#/mi-cubo/resolver"><span><b>Seguir con mi cubo</b><small>Vuelve al giro donde lo dejaste.</small></span></a>` : ""}
    <h2 class="section">Los 7 pasos</h2>
    <ol class="lessons">${STAGES.map((l, i) => `<li><a class="lesson-link" href="#/paso/${i + 1}"><span class="num">${i + 1}</span><span><strong>${esc(l.title)}</strong><small>${esc(l.goal)}</small></span></a></li>`).join("")}</ol>
    <div class="row">
      <a class="btn ghost" href="#/giros">Los giros</a>
      <a class="btn ghost" href="#/practica">Cubo mezclado</a>
      <a class="btn ghost" href="guia/CuboFacil-guia.pdf" download>Guía en PDF</a>
    </div>`;
}

function turnsPage() {
  const list = ["R", "R'", "L", "L'", "U", "U'", "D", "D'", "F", "F'", "U2", "F2"];
  app.innerHTML = `
    <a class="back" href="#/">${icon("back")} Inicio</a>
    <h1>Los giros</h1>
    <p class="goal">Un giro mueve una sola capa un cuarto de vuelta. El resto del cubo se queda quieto en tu mano. La flecha dice hacia dónde va la parte de delante de esa capa.</p>
    <div class="pics">${list.map((t) => `<figure class="pic">${draw(yellowUp, { move: t, w: 140 })}<figcaption>${esc(WORD[t])}</figcaption></figure>`).join("")}</div>`;
}

function lessonPage(n) {
  const L = LESSONS[n], S = STAGES[n];
  app.innerHTML = `
    <a class="back" href="#/">${icon("back")} Inicio</a>
    <h1 class="title"><span class="num">${n + 1}</span> ${esc(S.title)}</h1>
    <p class="hold-line">${esc(L.hold)}</p>
    <figure class="pic goal-pic">${L.picture()}<figcaption>Así tiene que quedar</figcaption></figure>
    <section class="card"><ol class="steps">${L.text.map((t) => `<li>${t}</li>`).join("")}</ol>${L.tip ? `<p class="tip">${esc(L.tip)}</p>` : ""}</section>
    ${L.algs.map((a) => `<section class="card"><h2>${esc(a.name)}</h2><ol class="alg">${seq(a.moves).map((t) => `<li>${esc(WORD[t])}</li>`).join("")}</ol></section>`).join("")}
    <a class="btn" href="#/paso/${n + 1}/practica">Practicar este paso, giro a giro</a>`;
}

/** A random cube with the steps before `n` already done. */
function exampleAt(n) {
  const mixed = applyMoves(solvedCube(), randomScramble(25));
  return n ? plan(mixed, { to: n }).end : mixed;
}

function lessonPractice(n) {
  const start = exampleAt(n);
  const { steps, end } = plan(start, { from: n, to: n + 1 });
  app.innerHTML = `<a class="back" href="#/paso/${n + 1}">${icon("back")} ${esc(STAGES[n].title)}</a><h1 class="title"><span class="num">${n + 1}</span> Practica</h1><p class="goal">Un cubo de ejemplo. Las piezas en gris no importan en este paso; la de borde rosa es la que estás colocando.</p><div id="play"></div>`;
  player(app.querySelector("#play"), {
    steps, end, grey: true,
    finish: `<div class="row"><a class="btn" href="#/paso/${n + 1}/practica?${Date.now()}">Otro ejemplo</a>${n < 6 ? `<a class="btn ghost" href="#/paso/${n + 2}">Paso ${n + 2}</a>` : `<a class="btn ghost" href="#/">Inicio</a>`}</div>`,
  });
}

function practiceAll() {
  const start = applyMoves(solvedCube(), randomScramble(25));
  const { steps, end } = plan(start);
  app.innerHTML = `<a class="back" href="#/">${icon("back")} Inicio</a><h1>Cubo mezclado</h1><p class="goal">Un cubo mezclado al azar, de principio a fin. Si tienes uno, mézclalo tú con estos mismos giros… o mejor: <a href="#/mi-cubo">resuelve el tuyo con fotos</a>.</p><div id="play"></div>`;
  player(app.querySelector("#play"), { steps, end, finish: `<div class="row"><a class="btn" href="#/practica?${Date.now()}">Otro cubo</a><a class="btn ghost" href="#/">Inicio</a></div>` });
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

function myCube() {
  app.innerHTML = `
    <a class="back" href="#/">${icon("back")} Inicio</a>
    <h1>Resolver mi cubo</h1>
    <p class="goal">Con 2 fotos leo los colores de tu cubo. Las fotos no salen de tu móvil.</p>
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
    <button class="btn" data-go disabled>Resolver mi cubo</button>`;
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
  app.querySelector("[data-go]").onclick = () => {
    store.set("cubofacil-mi-cubo", code);
    store.del("cubofacil-mi-cubo-paso");
    location.hash = "#/mi-cubo/resolver";
  };
  paint();
}

function solveMine() {
  const code = store.get("cubofacil-mi-cubo");
  if (!code) { location.hash = "#/mi-cubo"; return; }
  const state = decode(code);
  const top = centreColor(state, [0, 1, 0]), front = centreColor(state, [0, 0, 1]), right = centreColor(state, [1, 0, 0]);
  const { steps, end } = plan(state);
  steps.unshift({ kind: "info", title: "Coge tu cubo así", text: `Como en la primera foto: ${centreName(top)} arriba, ${centreName(front)} delante, mirándote, y ${centreName(right)} a la derecha.`, before: state, stage: Math.min(currentStage(state), 6), group: "", hl: [] });
  app.innerHTML = `<a class="back" href="#/">${icon("back")} Inicio</a><h1>Mi cubo</h1><div id="play"></div>`;
  player(app.querySelector("#play"), {
    steps, end, saveKey: "cubofacil-mi-cubo-paso",
    finish: `<p class="ok big">¡Has resuelto tu cubo!</p><div class="row"><a class="btn" href="#/mi-cubo">Resolver otro</a><a class="btn ghost" href="#/">Inicio</a></div>`,
  });
}

// ───────── Router ─────────
function route() {
  cleanup();
  cleanup = () => {};
  const h = location.hash.replace(/\?.*$/, "");
  let m;
  if ((m = h.match(/^#\/paso\/([1-7])\/practica$/))) lessonPractice(Number(m[1]) - 1);
  else if ((m = h.match(/^#\/paso\/([1-7])$/))) lessonPage(Number(m[1]) - 1);
  else if (h === "#/giros") turnsPage();
  else if (h === "#/practica") practiceAll();
  else if (h === "#/mi-cubo") myCube();
  else if (h === "#/mi-cubo/repaso") reviewScreen();
  else if (h === "#/mi-cubo/resolver") solveMine();
  else home();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);
route();
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});

