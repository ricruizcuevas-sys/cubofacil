// The guide's method solves any cube, held in any way, and every step finishes what it says.
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyMoves, randomScramble, solvedCube } from "../js/cube.js";
import { plan, currentStage, turnCube, applyStep, STAGE_DONE } from "../js/guided.js";

let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const HOLDS = ["", "x", "x'", "x2", "y", "y'", "z", "z'"];

test("500 random cubes, held in any way, are solved step by step", () => {
  for (let i = 0; i < 500; i++) {
    let s = applyMoves(solvedCube(), randomScramble(25, rnd));
    const hold = HOLDS[Math.floor(rnd() * HOLDS.length)];
    if (hold) s = turnCube(s, hold);
    const { steps, end } = plan(s);
    assert.equal(currentStage(end), 7);
    // Replaying the steps gives the same cube, and each step of the method is done when the next starts.
    let t = s;
    for (let k = 0; k < steps.length; k++) {
      const st = steps[k];
      assert.deepEqual(st.before, t);
      if (k && steps[k - 1].stage !== st.stage) assert.ok(STAGE_DONE[steps[k - 1].stage](t), "stage " + steps[k - 1].stage);
      t = applyStep(t, st);
    }
    assert.deepEqual(t, end);
  }
});

test("a solved cube needs no turns, and a plan up to a step stops there", () => {
  const { steps } = plan(solvedCube());
  assert.equal(steps.filter((s) => s.kind !== "info").length, 0);
  const s = applyMoves(solvedCube(), randomScramble(25, rnd));
  for (let n = 1; n <= 6; n++) assert.ok(currentStage(plan(s, { to: n }).end) >= n);
});

test("white steps are done with white on top, the rest with yellow on top", () => {
  const s = applyMoves(solvedCube(), randomScramble(25, rnd));
  const { steps } = plan(s);
  const top = (st) => st.before.find((x) => x.p.join() === "0,1,0" && x.n.join() === "0,1,0").c;
  for (const st of steps.filter((x) => x.kind === "move")) assert.equal(top(st), st.stage < 2 ? "W" : "Y");
});
