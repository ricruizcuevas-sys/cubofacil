import { test } from "node:test";
import assert from "node:assert/strict";
import { solvedCube, applyMoves, randomScramble, isSolved, STAGE_CHECKS, toFixed, applyMove } from "../js/cube.js";
import { solve, solveStage, run } from "../js/solver.js";

function seeded(seed) { return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296); }

test("the method solves 500 random cubes, stage by stage, and every stage stays done", () => {
  const random = seeded(42);
  let longest = 0;
  for (let i = 0; i < 500; i++) {
    let s = applyMoves(solvedCube(), randomScramble(25, random));
    let moves = 0;
    for (let stage = 0; stage < 7; stage++) {
      const r = solveStage(s, stage);
      for (const step of r.steps) moves += step.moves.length;
      // The steps replayed one by one give the same cube.
      const replay = r.steps.reduce((acc, step) => run(acc, step.frame, step.moves), s);
      assert.deepEqual(replay, r.state);
      for (let done = 0; done <= stage; done++) assert.ok(STAGE_CHECKS[done](r.state), `cubo ${i}: fase ${done + 1} deshecha tras la fase ${stage + 1}`);
      s = r.state;
    }
    assert.ok(isSolved(s), `cubo ${i} sin resolver`);
    longest = Math.max(longest, moves);
  }
  assert.ok(longest < 400, "demasiados giros: " + longest);
});

test("a solved cube needs no steps", () => {
  assert.equal(solve(solvedCube()).steps.length, 0);
});

test("turning a face four times leaves the cube as it was", () => {
  for (const f of ["U", "D", "F", "B", "R", "L"]) {
    const s = applyMoves(solvedCube(), [f, f, f, f]);
    assert.ok(isSolved(s));
    assert.ok(isSolved(applyMoves(solvedCube(), [f, f + "'"])));
  }
});

test("a move made with another side in front is the right move of the fixed cube", () => {
  assert.equal(toFixed("F", 1), "R");
  assert.equal(toFixed("R'", 1), "B'");
  assert.equal(toFixed("L2", 3), "B2");
  assert.equal(toFixed("U", 2), "U");
  assert.deepEqual(run(solvedCube(), 1, ["F"]), applyMove(solvedCube(), "R"));
});
