import { applyMove, applyMoves, inverse, randomScramble, solvedCube, toFixed, STAGE_CHECKS } from "./cube.js";
import { currentStage, solve, solveStage, run, STAGES } from "./solver.js";
import { LESSONS } from "./lessons.js";
import { algWords, describe, holdText, frontColorName } from "./words.js";
import { CubeView } from "./view.js";

const app = document.getElementById("app");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SPEEDS = { lento: 900, normal: 550, rapido: 280 };
let speed = "normal";
try { speed = localStorage.getItem("cubofacil-velocidad") || "normal"; } catch {}
const ms = () => SPEEDS[speed] ?? 550;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const sorted = (t) => [...t].sort().join("");

/** A random cube with the stages before `stage` already done (for real). */
function cubeAtStage(stage) {
  let s = applyMoves(solvedCube(), randomScramble(25));
  for (let i = 0; i < stage; i++) s = solveStage(s, i).state;
  return s;
}

/** An example cube of one case of a lesson, and the steps that solve that case. */
function caseExample(stage, caseId) {
  for (let tries = 0; tries < 400; tries++) {
    const start = cubeAtStage(stage);
    const { steps } = solveStage(start, stage);
    const at = steps.findIndex((s) => s.case === caseId);
    if (at < 0) continue;
    const key = (s) => (s.target ? "t:" + s.target : "c:" + s.case);
    let from = at;
    while (from > 0 && (stage < 2 ? steps[from - 1].target === steps[at].target : steps[from - 1].align && steps[from - 1].case === caseId)) from--;
    let to = at;
    while (to + 1 < steps.length && key(steps[to + 1]) === key(steps[at]) && (stage < 2 || steps[to + 1].case === caseId)) to++;
    const state = steps.slice(0, from).reduce((acc, s) => run(acc, s.frame, s.moves), start);
    return { state, frame: steps[from].frame, steps: steps.slice(from, to + 1) };
  }
  return null;
}

function actionsFor(steps, startFrame) {
  const actions = [];
  let frame = startFrame;
  for (const step of steps) {
    if (step.frame !== frame) { actions.push({ kind: "frame", frame: step.frame, step }); frame = step.frame; }
    step.moves.forEach((token, i) => actions.push({ kind: "move", token, frame: step.frame, step, n: i + 1, of: step.moves.length }));
  }
  return actions;
}

/** Plays steps on a cube view like a video: play, pause, turn back and forward. */
class Player {
  constructor(view, state, frame, steps, onChange) {
    this.view = view; this.onChange = onChange;
    this.load(state, frame, steps);
  }
  load(state, frame, steps) {
    this.playing = false;
    this.actions = actionsFor(steps, frame);
    this.states = [state]; this.frames = [frame]; this.i = 0;
    this.view.frame = frame; this.view.applyCamera(false);
    const target = steps.find((s) => s.target)?.target;
    this.view.setState(state, target ? [sorted(target)] : []);
    this.show();
  }
  get current() { return this.actions[this.i] ?? null; }
  show() {
    const a = this.current;
    this.view.showArrow(a?.kind === "move" ? a.token : null);
    this.onChange?.(this);
  }
  async next() {
    if (this.busy || this.i >= this.actions.length) return;
    this.busy = true;
    const a = this.actions[this.i];
    if (a.kind === "frame") {
      this.view.showArrow(null);
      await this.view.setFrame(a.frame);
      this.states[this.i + 1] = this.states[this.i];
      this.frames[this.i + 1] = a.frame;
    } else {
      const fixed = toFixed(a.token, a.frame);
      const next = applyMove(this.states[this.i], fixed);
      await this.view.animateMove(fixed, next, ms());
      this.states[this.i + 1] = next;
      this.frames[this.i + 1] = this.frames[this.i];
    }
    this.i++;
    this.busy = false;
    this.show();
  }
  async prev() {
    if (this.busy || this.i === 0) return;
    this.busy = true;
    const a = this.actions[this.i - 1];
    if (a.kind === "frame") await this.view.setFrame(this.frames[this.i - 1]);
    else {
      this.view.showArrow(inverse(a.token));
      await this.view.animateMove(inverse(toFixed(a.token, a.frame)), this.states[this.i - 1], ms());
    }
    this.i--;
    this.busy = false;
    this.show();
  }
  async play() {
    if (this.playing) return;
    if (this.i >= this.actions.length) return;
    this.playing = true; this.onChange?.(this);
    while (this.playing && this.i < this.actions.length) {
      await wait(Math.min(450, ms() * 0.7));
      if (!this.playing) break;
      await this.next();
    }
    this.playing = false; this.onChange?.(this);
  }
  pause() { this.playing = false; this.onChange?.(this); }
  /** Leaving the screen: stop without drawing on a page that is gone. */
  stop() { this.onChange = null; this.playing = false; }
}

function actionText(a) {
  if (!a) return { main: "¡Hecho!", sub: "" };
  if (a.kind === "frame") return { main: holdText(a.frame), sub: "Gira el cubo entero, sin girar ninguna capa." };
  return { main: describe(a.token).long, sub: a.of > 1 ? `Giro ${a.n} de ${a.of} de este algoritmo` : "" };
}

function speedPicker() {
  return `<label class="speed">Velocidad <select data-speed>${Object.keys(SPEEDS).map((k) => `<option value="${k}" ${k === speed ? "selected" : ""}>${{ lento: "Lenta", normal: "Normal", rapido: "Rápida" }[k]}</option>`).join("")}</select></label>`;
}
function bindSpeed(root) {
  root.querySelector("[data-speed]")?.addEventListener("change", (e) => {
    speed = e.target.value;
    try { localStorage.setItem("cubofacil-velocidad", speed); } catch {}
  });
}

function playerControls() {
  return `<div class="controls">
    <button class="ctl" data-act="prev" aria-label="Giro anterior">${icon("prev")}<span>Anterior</span></button>
    <button class="ctl main" data-act="play" aria-label="Reproducir">${icon("play")}<span>Ver</span></button>
    <button class="ctl" data-act="next" aria-label="Giro siguiente">${icon("next")}<span>Siguiente</span></button>
  </div>`;
}

function icon(name) {
  const paths = {
    prev: '<path d="M7 5v14M19 5 9 12l10 7z"/>',
    next: '<path d="M17 5v14M5 5l10 7-10 7z"/>',
    play: '<path d="M7 4l13 8-13 8z"/>',
    pause: '<path d="M7 4h4v16H7zM14 4h4v16h-4z"/>',
    back: '<path d="M15 5 8 12l7 7"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    left: '<path d="M15 5 8 12l7 7"/>',
    right: '<path d="m9 5 7 7-7 7"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

function bindPlayer(root, player) {
  root.querySelector('[data-act="prev"]').onclick = () => { player.pause(); player.prev(); };
  root.querySelector('[data-act="next"]').onclick = () => { player.pause(); player.next(); };
  root.querySelector('[data-act="play"]').onclick = () => (player.playing ? player.pause() : player.play());
}

function renderPlayerState(root, player, extra = () => "") {
  if (!root.querySelector(".caption-main")) return;
  const t = actionText(player.current);
  root.querySelector(".caption-main").textContent = t.main;
  root.querySelector(".caption-sub").textContent = t.sub;
  root.querySelector(".caption-why").textContent = player.current?.step?.say ?? extra();
  const play = root.querySelector('[data-act="play"]');
  play.innerHTML = player.playing ? `${icon("pause")}<span>Pausa</span>` : `${icon("play")}<span>${player.i >= player.actions.length ? "Hecho" : player.i ? "Seguir" : "Ver"}</span>`;
  play.setAttribute("aria-label", player.playing ? "Pausa" : "Reproducir");
  root.querySelector('[data-act="prev"]').disabled = player.i === 0;
  root.querySelector('[data-act="next"]').disabled = player.i >= player.actions.length;
  const total = player.actions.filter((a) => a.kind === "move").length;
  const done = player.actions.slice(0, player.i).filter((a) => a.kind === "move").length;
  root.querySelector(".counter").textContent = total ? `${done} de ${total} giros` : "";
}

// ───────── Screens ─────────

function go(hash) { location.hash = hash; }
let cleanup = () => {};

function home() {
  app.innerHTML = `
    <section class="hero">
      <h1>Aprende a resolver el cubo de Rubik</h1>
      <p>Con el método por capas para principiantes: 7 pasos que sirven para <strong>cualquier</strong> cubo. En cada lección verás qué hay que conseguir, los casos que te puedes encontrar y los giros de cada caso. Después practicas.</p>
    </section>
    <section class="card how">
      <h2>Antes de empezar</h2>
      <ul>
        <li>Sujeta el cubo con el <strong>amarillo arriba</strong> y el <strong>blanco abajo</strong>. Los centros no se mueven nunca: dicen de qué color es cada cara.</li>
        <li>Los giros se dicen mirando el cubo de frente: «la cara de la derecha hacia arriba», «la capa de arriba hacia la izquierda»…</li>
        <li>Un «algoritmo» es una lista corta de giros que siempre hace lo mismo. Te aprenderás unos pocos.</li>
      </ul>
    </section>
    <ol class="lessons">${LESSONS.map((l, i) => `<li><a class="lesson-link" href="#/leccion/${i + 1}"><span class="num">${i + 1}</span><span><strong>${esc(l.title)}</strong><small>${esc(l.goal)}</small></span></a></li>`).join("")}</ol>
    <div class="row">
      <a class="btn" href="#/cubo-entero">Ver un cubo resuelto de principio a fin</a>
      <a class="btn ghost" href="#/chuleta">Chuleta de algoritmos</a>
    </div>`;
}

function lesson(n) {
  const L = LESSONS[n];
  app.innerHTML = `
    <a class="back" href="#/">${icon("back")} Lecciones</a>
    <h1 class="title"><span class="num">${n + 1}</span> ${esc(L.title)}</h1>
    <p class="goal">${esc(L.goal)}</p>
    <div class="chips" role="tablist" aria-label="Casos">${L.cases.map((c, i) => `<button role="tab" class="chip" data-case="${c.id}" aria-selected="${i === 0}">${esc(c.name)}</button>`).join("")}<button role="tab" class="chip" data-case="*" aria-selected="false">Todo el paso</button></div>
    <p class="case-how"></p>
    <div class="cube-wrap"><div class="cube" id="cube"></div><button class="reset-view" type="button">Recolocar vista</button></div>
    <div class="caption"><span class="counter"></span><p class="caption-main"></p><p class="caption-sub"></p><p class="caption-why"></p></div>
    ${playerControls()}
    ${speedPicker()}
    <section class="card"><h2>Cómo sujetar el cubo</h2><p>${esc(L.hold)}</p></section>
    <section class="card"><h2>El método</h2><ol class="steps">${L.method.map((m) => `<li>${esc(m)}</li>`).join("")}</ol></section>
    <section class="card"><h2>${L.algs.length > 1 ? "Algoritmos" : "Algoritmo"}</h2>${L.algs.map((a) => `<div class="alg"><strong>${esc(a.name)}</strong><ol>${a.moves.map((m) => `<li>${esc(describe(m).long)}</li>`).join("")}</ol>${a.trick ? `<p class="trick">Truco: ${esc(a.trick)}</p>` : ""}</div>`).join("")}<p class="tip">${esc(L.tip)}</p><p class="done-when"><strong>Está hecho cuando:</strong> ${esc(L.done)}</p></section>
    <div class="row"><a class="btn" href="#/practica/${n + 1}">Practicar esta lección</a>${n < 6 ? `<a class="btn ghost" href="#/leccion/${n + 2}">Siguiente lección</a>` : ""}</div>`;
  const view = new CubeView(app.querySelector("#cube"));
  view.setBelow(n < 2, false);
  app.querySelector(".reset-view").onclick = () => view.resetView();
  bindSpeed(app);
  let player = null;
  const how = app.querySelector(".case-how");
  const choose = (id) => {
    app.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-selected", String(c.dataset.case === id)));
    player?.pause();
    let example;
    if (id === "*") {
      const state = cubeAtStage(n);
      example = { state, frame: 0, steps: solveStage(state, n).steps };
      how.textContent = "Un cubo cualquiera, de principio a fin de este paso.";
    } else {
      example = caseExample(n, id);
      how.textContent = L.cases.find((c) => c.id === id).how;
    }
    if (!example) { how.textContent = "No he encontrado un ejemplo de este caso; prueba con otro."; return; }
    if (!player) { player = new Player(view, example.state, example.frame, example.steps, (p) => renderPlayerState(app, p)); bindPlayer(app, player); }
    else player.load(example.state, example.frame, example.steps);
  };
  app.querySelectorAll(".chip").forEach((c) => (c.onclick = () => choose(c.dataset.case)));
  choose(L.cases[0].id);
  cleanup = () => player?.stop();
}

const PAD = [
  ["U", "U'"], ["R", "R'"], ["L'", "L"], ["D'", "D"], ["F", "F'"],
];

function practice(n) {
  const L = LESSONS[n];
  app.innerHTML = `
    <a class="back" href="#/leccion/${n + 1}">${icon("back")} Lección ${n + 1}</a>
    <h1 class="title"><span class="num">${n + 1}</span> Practica: ${esc(L.title)}</h1>
    <p class="goal">Haz tú los giros. Te digo en qué caso estás; si te atascas, pide una pista o que lo haga yo.</p>
    <div class="cube-wrap"><div class="cube" id="cube"></div><button class="reset-view" type="button">Recolocar vista</button></div>
    <div class="caption"><span class="counter"></span><p class="caption-main"></p><p class="caption-sub"></p><p class="caption-why"></p></div>
    <div class="turn-cube"><button class="btn ghost" data-turn="-1">${icon("left")} Girar cubo entero</button><span class="front-now"></span><button class="btn ghost" data-turn="1">Girar cubo entero ${icon("right")}</button></div>
    <div class="pad">${PAD.flat().map((m) => `<button class="move" data-move="${m}">${esc(describe(m).short)}</button>`).join("")}</div>
    <div class="row"><button class="btn ghost" data-act="undo">${icon("undo")} Deshacer</button><button class="btn ghost" data-act="hint">Pista</button><button class="btn" data-act="show">Muéstramelo</button></div>
    <div class="row"><button class="btn ghost" data-act="new">Otro cubo</button>${speedPicker()}</div>`;
  const view = new CubeView(app.querySelector("#cube"));
  view.setBelow(n < 2, false);
  app.querySelector(".reset-view").onclick = () => view.resetView();
  bindSpeed(app);
  let state = cubeAtStage(n), frame = 0, history = [], busy = false, hint = false, note = "";
  // The algorithm being done right now: in the middle of one, the layers below are out of place for a
  // moment, so the plan is only worked out again when it ends or the person does something else.
  // The rest of the plan is followed too (in the last lesson the bottom stays out of place between
  // repetitions); it is only worked out again when the person does something else.
  let active = null, queue = [];
  const copy = (s) => ({ ...s, moves: [...s.moves] });
  view.setState(state);
  const expected = () => {
    if (active && active.i < active.step.moves.length) return active;
    active = null;
    if (!queue.length) {
      if (currentStage(state) > n) return null;
      queue = solve(state, n).steps.map(copy);
      if (!queue.length) return null;
    }
    active = { step: queue.shift(), i: 0 };
    return active;
  };
  const render = () => {
    const a = expected();
    const main = app.querySelector(".caption-main"), sub = app.querySelector(".caption-sub"), why = app.querySelector(".caption-why");
    app.querySelector(".front-now").textContent = `Delante: ${frontColorName(frame)}`;
    app.querySelector(".counter").textContent = `${history.length} giros`;
    view.showArrow(null);
    if (!a) {
      main.textContent = n < 6 ? "¡Paso hecho! " + L.done : "¡Cubo resuelto! Enhorabuena.";
      sub.textContent = n < 6 ? `Cuando quieras, sigue con la lección ${n + 2}.` : "";
      why.textContent = note;
      return;
    }
    const { step, i } = a;
    why.textContent = (note ? note + " " : "") + (step.stage !== n ? `Primero arregla «${STAGES[step.stage]}», que se ha deshecho. ` : "") + step.say;
    if (step.frame !== frame) { main.textContent = holdText(step.frame); sub.textContent = "Usa los botones de girar el cubo entero."; return; }
    const of = step.moves.length;
    main.textContent = hint ? describe(step.moves[i]).long : i ? `Sigue: giro ${i + 1} de ${of}` : "¿Qué giro toca ahora?";
    sub.textContent = hint ? (of > 1 ? `Giro ${i + 1} de ${of}` : "") : "Pulsa «Pista» si no lo sabes.";
    if (hint) view.showArrow(step.moves[i]);
  };
  const doMove = async (token, auto = false) => {
    if (busy) return;
    busy = true;
    const a = expected();
    const before = { active: a ? { step: copy(a.step), i: a.i } : null, queue: queue.map(copy) };
    const want = a && a.step.frame === frame ? a.step.moves[a.i] : null;
    note = "";
    if (want === token) { a.i++; if (!auto) note = "¡Bien!"; }
    else if (want && want.endsWith("2") && want[0] === token[0]) { a.step.moves.splice(a.i, 1, token, token); a.i++; note = "¡Bien! Una vez más."; }
    else { active = null; queue = []; if (!auto) note = a ? "Ese giro no es el que toca. Puedes deshacerlo." : ""; }
    const fixed = toFixed(token, frame);
    const next = applyMove(state, fixed);
    view.showArrow(token);
    await view.animateMove(fixed, next, ms());
    history.push({ fixed, ...before });
    state = next; hint = false; busy = false;
    render();
  };
  const turnCube = async (d) => {
    if (busy) return;
    busy = true; frame = (frame + d + 4) % 4; view.showArrow(null);
    await view.setFrame(frame);
    busy = false; render();
  };
  app.querySelectorAll("[data-move]").forEach((b) => (b.onclick = () => doMove(b.dataset.move)));
  app.querySelectorAll("[data-turn]").forEach((b) => (b.onclick = () => turnCube(Number(b.dataset.turn))));
  app.querySelector('[data-act="hint"]').onclick = () => { hint = true; render(); };
  app.querySelector('[data-act="show"]').onclick = async () => {
    const a = expected();
    if (!a || busy) return;
    if (a.step.frame !== frame) { busy = true; frame = a.step.frame; await view.setFrame(frame); busy = false; render(); return; }
    await doMove(a.step.moves[a.i], true);
  };
  app.querySelector('[data-act="undo"]').onclick = async () => {
    if (busy || !history.length) return;
    const last = history.pop();
    busy = true;
    const prev = applyMove(state, inverse(last.fixed));
    await view.animateMove(inverse(last.fixed), prev, ms());
    state = prev; active = last.active; queue = last.queue; busy = false; note = ""; render();
  };
  app.querySelector('[data-act="new"]').onclick = async () => {
    if (busy) return;
    state = cubeAtStage(n); history = []; note = ""; hint = false; active = null; queue = [];
    frame = 0; await view.setFrame(0, false); view.setState(state); render();
  };
  render();
}

function wholeCube() {
  app.innerHTML = `
    <a class="back" href="#/">${icon("back")} Lecciones</a>
    <h1 class="title">Un cubo de principio a fin</h1>
    <p class="goal">Un cubo mezclado al azar, resuelto con los 7 pasos del método. Cada paso empieza donde terminó el anterior.</p>
    <p class="stage-now"></p>
    <div class="cube-wrap"><div class="cube" id="cube"></div><button class="reset-view" type="button">Recolocar vista</button></div>
    <div class="caption"><span class="counter"></span><p class="caption-main"></p><p class="caption-sub"></p><p class="caption-why"></p></div>
    ${playerControls()}
    <div class="row">${speedPicker()}<button class="btn ghost" data-act="new">Otro cubo</button></div>`;
  const view = new CubeView(app.querySelector("#cube"));
  app.querySelector(".reset-view").onclick = () => view.resetView();
  bindSpeed(app);
  const stageNow = app.querySelector(".stage-now");
  const load = () => {
    const state = applyMoves(solvedCube(), randomScramble(25));
    return { state, steps: solve(state).steps };
  };
  let cube = load();
  const player = new Player(view, cube.state, 0, cube.steps, (p) => {
    renderPlayerState(app, p);
    const stage = p.current?.step?.stage ?? 6;
    view.setBelow(stage < 2);
    stageNow.textContent = `Paso ${stage + 1} de 7 · ${STAGES[stage]}`;
  });
  bindPlayer(app, player);
  app.querySelector('[data-act="new"]').onclick = () => { cube = load(); player.load(cube.state, 0, cube.steps); };
  cleanup = () => player.stop();
}

function cheatSheet() {
  app.innerHTML = `
    <a class="back" href="#/">${icon("back")} Lecciones</a>
    <h1 class="title">Chuleta</h1>
    <p class="goal">Amarillo arriba, blanco abajo. Los giros se dicen mirando el cubo de frente.</p>
    ${LESSONS.map((l, i) => `<section class="card"><h2>${i + 1}. ${esc(l.title)}</h2>${l.algs.map((a) => `<p><strong>${esc(a.name)}:</strong> ${esc(algWords(a.moves))}</p>`).join("")}${l.cases.map((c) => `<p class="small"><em>${esc(c.name)}:</em> ${esc(c.how)}</p>`).join("")}</section>`).join("")}`;
}

function route() {
  cleanup(); cleanup = () => {};
  const h = location.hash || "#/";
  let m;
  if ((m = h.match(/^#\/leccion\/([1-7])$/))) lesson(Number(m[1]) - 1);
  else if ((m = h.match(/^#\/practica\/([1-7])$/))) practice(Number(m[1]) - 1);
  else if (h === "#/cubo-entero") wholeCube();
  else if (h === "#/chuleta") cheatSheet();
  else home();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);
route();

if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});

export { go, STAGE_CHECKS };
