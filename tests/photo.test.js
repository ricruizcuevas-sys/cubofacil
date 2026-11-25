// Two photos (simulated: colours with uneven light and noise) give back the same cube.
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyMoves, randomScramble, solvedCube } from "../js/cube.js";
import { viewStickers, classify, assemble, PHOTO2_TURNS, applyRot, squarePoints, defaultHandles, assign } from "../js/photo.js";

const same = (a, b) => a.every((v, i) => v === b[i]);
let seed = 5;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const REAL = { W: [220, 225, 230], Y: [225, 200, 30], G: [10, 150, 70], B: [10, 60, 170], O: [240, 110, 20], R: [180, 20, 30] };

test("the 7 points give 27 squares inside the photo", () => {
  const pts = squarePoints(defaultHandles(800, 600));
  assert.equal(pts.length, 27);
  for (const p of pts) assert.ok(p.x > 0 && p.x < 800 && p.y > 0 && p.y < 600);
});

test("the assignment finds the cheapest match", () => {
  assert.deepEqual(assign([[4, 1, 3], [2, 0, 5], [3, 2, 2]]), [1, 0, 2]);
});

test("two photos rebuild the cube (and colours read right in at least 9 of 10 cubes)", () => {
  const view = viewStickers();
  let exact = 0;
  for (let i = 0; i < 100; i++) {
    const cube = applyMoves(solvedCube(), randomScramble(25, rnd));
    const turn = PHOTO2_TURNS()[Math.floor(rnd() * 3)];
    const turned = cube.map((s) => ({ p: applyRot(s.p, turn), n: applyRot(s.n, turn), c: s.c }));
    const read = (state) => view.map((v) => state.find((s) => same(s.p, v.p) && same(s.n, v.n)).c);
    const c1 = read(cube), c2 = read(turned);
    // With the right colours, the cube comes back exactly.
    const back = assemble(c1, c2);
    assert.ok(back.check.ok);
    assert.ok(cube.every((s) => back.state.find((t) => same(t.p, s.p) && same(t.n, s.n)).c === s.c));
    // With measured colours (light and noise), most cubes come back exactly.
    const light = [0.8 + rnd() * 0.4, 0.7 + rnd() * 0.4];
    const noisy = (c, ph) => REAL[c].map((x) => Math.max(0, Math.min(255, x * light[ph] + (rnd() - 0.5) * 40)));
    const isCentre = (j) => view[j].p.filter((x) => x).length === 1;
    const samples = [...c1.map((c, j) => ({ rgb: noisy(c, 0), photo: 0, centre: isCentre(j) })), ...c2.map((c, j) => ({ rgb: noisy(c, 1), photo: 1, centre: isCentre(j) }))];
    const got = classify(samples);
    const { state, check } = assemble(got.slice(0, 27), got.slice(27));
    if (check.ok && cube.every((s) => state.find((t) => same(t.p, s.p) && same(t.n, s.n)).c === s.c)) exact++;
  }
  assert.ok(exact >= 90, `exact ${exact} of 100`);
});
