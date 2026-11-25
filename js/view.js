// The 3D cube drawn with CSS (no libraries, so it works without internet). Model coordinates have
// y up; CSS has y down, so y is flipped when placing things.
import { applyMove, parseMove, rot, userToFixed } from "./cube.js";

const ORIENT = { "0,0,1": "", "0,0,-1": "rotateY(180deg)", "1,0,0": "rotateY(90deg)", "-1,0,0": "rotateY(-90deg)", "0,1,0": "rotateX(90deg)", "0,-1,0": "rotateX(-90deg)" };
const FACE_ORIENT = Object.values(ORIENT);
const COLOR = { Y: "#FFD500", W: "#F4F4F4", G: "#16A34A", B: "#1D4ED8", O: "#F97316", R: "#DC2626" };
const GREY = "#5B6170";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };

export class CubeView {
  constructor(root) {
    this.root = root;
    root.classList.add("cv");
    root.innerHTML = `<div class="cv-scene"><div class="cv-cube"><div class="cv-pivot"></div><div class="cv-arrow" hidden><svg viewBox="0 0 120 40" aria-hidden="true"><path d="M4 20 H96" /><path d="M84 6 L112 20 L84 34 Z" /></svg><b></b></div></div></div>`;
    this.scene = root.querySelector(".cv-scene");
    this.cube = root.querySelector(".cv-cube");
    this.pivot = root.querySelector(".cv-pivot");
    this.arrow = root.querySelector(".cv-arrow");
    this.frame = 0;
    this.below = false;
    this.drag = { yaw: 0, pitch: 0 };
    this.size = 56;
    this.cubies = [];
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          if (!x && !y && !z) continue;
          const el = document.createElement("div");
          el.className = "cv-cubie";
          el.innerHTML = FACE_ORIENT.map((o) => `<i style="transform:${o} translateZ(var(--half))"></i>`).join("");
          this.cube.append(el);
          this.cubies.push({ el, p: [x, y, z] });
        }
    this.stickers = Array.from({ length: 54 }, () => { const el = document.createElement("div"); el.className = "cv-sticker"; this.cube.append(el); return el; });
    this.highlight = new Set();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(root);
    this.bindDrag();
  }

  resize() {
    const w = this.root.clientWidth || 320;
    this.size = Math.max(34, Math.min(64, Math.floor(w / 5.6)));
    this.root.style.setProperty("--s", this.size + "px");
    this.root.style.setProperty("--half", this.size / 2 + "px");
    this.placeAll();
    this.applyCamera(false);
  }

  bindDrag() {
    let start = null;
    this.scene.addEventListener("pointerdown", (e) => { start = { x: e.clientX, y: e.clientY, ...this.drag }; this.scene.setPointerCapture(e.pointerId); });
    this.scene.addEventListener("pointermove", (e) => {
      if (!start) return;
      this.drag.yaw = start.yaw + (e.clientX - start.x) * 0.5;
      this.drag.pitch = Math.max(-60, Math.min(60, start.pitch - (e.clientY - start.y) * 0.4));
      this.applyCamera(false);
    });
    const end = () => { start = null; };
    this.scene.addEventListener("pointerup", end);
    this.scene.addEventListener("pointercancel", end);
  }

  /** Looks at the cube from below (white face) or from above (yellow face). */
  setBelow(below, animate = true) {
    if (below === this.below) return;
    this.below = below;
    this.applyCamera(animate);
  }

  resetView() { this.drag = { yaw: 0, pitch: 0 }; this.applyCamera(true); }

  applyCamera(animate) {
    this.cube.style.transition = animate ? "transform 600ms ease" : "none";
    this.cube.style.transform = `rotateX(${(this.below ? 26 : -26) + this.drag.pitch}deg) rotateY(${-32 - 90 * this.frame + this.drag.yaw}deg)`;
  }

  /** Shows the cube held with side `frame` in front (yellow up). */
  async setFrame(frame, animate = true) {
    if (frame === this.frame) return;
    // Turn the shortest way round.
    let delta = ((frame - this.frame) % 4 + 4) % 4;
    if (delta === 3) delta = -1;
    this.frame = this.frame + delta;
    this.applyCamera(animate);
    if (animate) await wait(620);
    this.frame = ((this.frame % 4) + 4) % 4;
    this.applyCamera(false);
  }

  /** highlight: pieces (sorted colours) to ring in pink; show(sticker, key): false paints it grey. */
  setState(state, highlight = [], show = this.show) {
    this.state = state;
    this.show = show;
    this.highlight = new Set(highlight);
    this.placeAll();
  }

  stickerTransform(p, n) {
    const s = this.size;
    return `translate3d(${p[0] * s}px, ${-p[1] * s}px, ${p[2] * s}px) ${ORIENT[n.join(",")]} translateZ(${s / 2 + 0.6}px)`;
  }

  placeAll() {
    const s = this.size;
    for (const c of this.cubies) c.el.style.transform = `translate3d(${c.p[0] * s}px, ${-c.p[1] * s}px, ${c.p[2] * s}px)`;
    if (!this.state) return;
    const pieces = this.highlightPositions();
    const keys = new Map();
    for (const st of this.state) { const k = st.p.join(","); keys.set(k, (keys.get(k) ?? "") + st.c); }
    this.state.forEach((st, i) => {
      const el = this.stickers[i];
      const key = [...keys.get(st.p.join(","))].sort().join("");
      const visible = key.length === 1 || !this.show || this.show(st, key) || pieces.has(st.p.join(","));
      el.style.transform = this.stickerTransform(st.p, st.n);
      el.style.setProperty("--c", visible ? COLOR[st.c] : GREY);
      el.classList.toggle("hl", pieces.has(st.p.join(",")));
      el.dataset.p = st.p.join(",");
    });
  }

  /** Positions of the pieces to highlight (given by their colours, wherever they are). */
  highlightPositions() {
    const out = new Set();
    if (!this.state || !this.highlight.size) return out;
    const groups = new Map();
    for (const st of this.state) { const k = st.p.join(","); groups.set(k, (groups.get(k) ?? "") + st.c); }
    for (const [k, c] of groups) if (this.highlight.has([...c].sort().join(""))) out.add(k);
    return out;
  }

  /** The arrow on the cube that shows which way a turn goes (token as the person sees it). */
  showArrow(token) {
    if (!token) { this.arrow.hidden = true; return; }
    const m = parseMove(token);
    const axis = [0, 0, 0]; axis[m.axis] = Math.sign(m.q * (m.amount === 2 ? 1 : m.amount));
    let P, N;
    if (m.axis === 0) { P = [m.layer, 0, 1.53]; N = [0, 0, 1]; }
    else if (m.axis === 1) { P = [0, m.layer, 1.53]; N = [0, 0, 1]; }
    else if (m.layer === 1) { P = [0, 0.95, 1.53]; N = [0, 0, 1]; }
    else { P = [0, 1.53, -0.95]; N = [0, 1, 0]; }
    let V = cross(axis, P);
    const dot = V[0] * N[0] + V[1] * N[1] + V[2] * N[2];
    V = norm(V.map((v, i) => v - dot * N[i]));
    const toFixed = (v) => userToFixed(v, this.frame);
    const [p, x, z] = [toFixed(P), toFixed(V), toFixed(N)].map((v) => [v[0], -v[1], v[2]]);
    const y = cross(z, x);
    const s = this.size;
    this.arrow.style.transform = `matrix3d(${x[0]},${x[1]},${x[2]},0,${y[0]},${y[1]},${y[2]},0,${z[0]},${z[1]},${z[2]},0,${p[0] * s},${p[1] * s},${p[2] * s},1)`;
    this.arrow.querySelector("b").textContent = m.amount === 2 ? "×2" : "";
    this.arrow.hidden = false;
  }

  /** Animates a layer turn, then shows `next` (the state after it). */
  animateMove(token, next, ms = 500) {
    const m = parseMove(token);
    return this.animateTurn(m.axis, m.q * m.amount, (p) => p[m.axis] === m.layer, next, ms);
  }

  /** Animates a turn of the whole cube in the hand (axis, quarter turns as in rot()). */
  animateCube(axis, quarters, next, ms = 700) {
    return this.animateTurn(axis, quarters, () => true, next, ms);
  }

  async animateTurn(axis, quarters, inLayer, next, ms) {
    const m = { axis };
    const angle = 90 * quarters;
    const css = ["rotateX", "rotateY", "rotateZ"][m.axis];
    const deg = m.axis === 1 ? angle : -angle;
    const moving = [
      ...this.cubies.filter((c) => inLayer(c.p)).map((c) => c.el),
      ...this.stickers.filter((el) => inLayer(el.dataset.p.split(",").map(Number))),
    ];
    // The arrow is shown before the turn; during it, the moving layer would cover it.
    this.arrow.hidden = true;
    for (const el of moving) this.pivot.append(el);
    this.pivot.style.transition = "none";
    this.pivot.style.transform = "none";
    void this.pivot.offsetWidth;
    this.pivot.style.transition = `transform ${ms}ms ease-in-out`;
    this.pivot.style.transform = `${css}(${deg}deg)`;
    await wait(ms + 30);
    for (const el of moving) this.cube.append(el);
    this.pivot.style.transition = "none";
    this.pivot.style.transform = "none";
    this.setState(next, [...this.highlight]);
  }

  /** Shows the turn again without changing anything. */
  async replayMove(token, ms = 600) {
    if (!this.state) return;
    const before = this.state;
    await this.animateMove(token, applyMove(before, token), ms);
    await wait(350);
    this.setState(before, [...this.highlight]);
  }
}

export { rot };
