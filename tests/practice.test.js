// Practice keeps following an algorithm to its end even when the layers below are out of place for a
// moment, and pressing «Muéstramelo» again and again always finishes the lesson's stage.
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyMove, applyMoves, randomScramble, solvedCube, toFixed, STAGE_CHECKS } from "../js/cube.js";
import { currentStage, solve, solveStage } from "../js/solver.js";

function showMeUntilDone(state, n) {
  let active = null, queue = [], frame = 0, presses = 0;
  for (;;) {
    if (!active || active.i >= active.step.moves.length) {
      if (!queue.length) {
        if (currentStage(state) > n) break;
        queue = solve(state, n).steps;
      }
      active = { step: queue.shift(), i: 0 };
    }
    if (active.step.frame !== frame) { frame = active.step.frame; continue; }
    state = applyMove(state, toFixed(active.step.moves[active.i], frame));
    active.i++;
    if (++presses > 600) throw Error("demasiados giros");
  }
  return state;
}

test("pressing «Muéstramelo» until the end finishes every lesson on random cubes", () => {
  for (let n = 0; n < 7; n++)
    for (let i = 0; i < 40; i++) {
      let s = applyMoves(solvedCube(), randomScramble(25));
      for (let k = 0; k < n; k++) s = solveStage(s, k).state;
      const end = showMeUntilDone(s, n);
      for (let k = 0; k <= n; k++) assert.ok(STAGE_CHECKS[k](end), `lección ${n + 1}: fase ${k + 1} sin hacer`);
    }
});
