import { test } from "node:test";
import assert from "node:assert/strict";
import { applyMoves, randomScramble, solvedCube } from "../js/cube.js";
import { checkCube } from "../js/validate.js";

const same = (a, b) => a.every((v, i) => v === b[i]);
const mixed = () => applyMoves(solvedCube(), randomScramble(30));

test("real cubes pass", () => {
  for (let i = 0; i < 200; i++) assert.ok(checkCube(mixed()).ok);
});

test("impossible cubes are caught, with a reason", () => {
  const cases = {
    "one square": (s) => { s[10].c = s[10].c === "W" ? "Y" : "W"; },
    "twisted corner": (s) => { const c = s.filter((x) => same(x.p, [1, 1, 1])); const k = c.map((x) => x.c); c.forEach((x, i) => (x.c = k[(i + 1) % 3])); },
    "flipped edge": (s) => { const e = s.filter((x) => same(x.p, [0, 1, 1])); [e[0].c, e[1].c] = [e[1].c, e[0].c]; },
    "two edges swapped": (s) => { const a = s.filter((x) => same(x.p, [0, 1, 1])), b = s.filter((x) => same(x.p, [1, 1, 0])); const ac = a.map((x) => x.c), bc = b.map((x) => x.c); a.forEach((x, i) => (x.c = bc[i])); b.forEach((x, i) => (x.c = ac[i])); },
    "mirrored corner": (s) => { const a = s.find((x) => same(x.p, [1, 1, 1]) && x.n[1] === 1), b = s.find((x) => same(x.p, [1, 1, 1]) && x.n[0] === 1); [a.c, b.c] = [b.c, a.c]; },
  };
  for (const [name, spoil] of Object.entries(cases)) {
    const s = mixed().map((x) => ({ ...x }));
    spoil(s);
    const r = checkCube(s);
    assert.equal(r.ok, false, name);
    assert.ok(r.problems[0].text.length > 20, name);
  }
});
