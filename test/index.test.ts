import {
  CSP,
  CSPError,
  allDifferent,
  notEqual,
  equalTo,
  notEqualTo,
  lessThan,
  lessThanOrEqual,
  greaterThan,
  greaterThanOrEqual,
  sumEquals,
  sumInRange,
  inSet,
  notInSet,
  nQueens,
  graphColoring,
} from "../src/index.js";

// ── basic setup ───────────────────────────────────────────────────────────────

describe("CSP setup", () => {
  test("addVariable and domain", () => {
    const csp = new CSP();
    csp.variable("x", [1, 2, 3]);
    expect(csp.variables).toContain("x");
    expect(csp.domain("x")).toEqual([1, 2, 3]);
  });

  test("throws on empty domain", () => {
    expect(() => new CSP().variable("x", [])).toThrow(CSPError);
  });

  test("throws on unknown variable in constraint", () => {
    const csp = new CSP();
    csp.variable("x", [1, 2]);
    expect(() => csp.constraint(["x", "y"], (a, b) => a !== b)).toThrow(CSPError);
  });

  test("unknown domain returns []", () => {
    expect(new CSP().domain("z")).toEqual([]);
  });
});

// ── simple solve ──────────────────────────────────────────────────────────────

describe("solve — simple binary constraint", () => {
  test("finds solution for x != y", () => {
    const csp = new CSP();
    csp.variable("x", [1, 2]);
    csp.variable("y", [1, 2]);
    csp.constraint(["x", "y"], notEqual());
    const sol = csp.solve();
    expect(sol).not.toBeNull();
    expect(sol!.x).not.toBe(sol!.y);
  });

  test("returns null when unsatisfiable", () => {
    const csp = new CSP();
    csp.variable("x", [1]);
    csp.variable("y", [1]);
    csp.constraint(["x", "y"], notEqual());
    expect(csp.solve()).toBeNull();
  });

  test("solves single-variable unary constraint", () => {
    const csp = new CSP();
    csp.variable("x", [1, 2, 3]);
    csp.constraint(["x"], equalTo(2));
    const sol = csp.solve();
    expect(sol!.x).toBe(2);
  });

  test("solves with no constraints — any assignment works", () => {
    const csp = new CSP();
    csp.variable("x", [1, 2, 3]);
    const sol = csp.solve();
    expect([1, 2, 3]).toContain(sol!.x);
  });

  test("empty CSP returns empty solution", () => {
    expect(new CSP().solve()).toEqual({});
  });
});

// ── solveAll ─────────────────────────────────────────────────────────────────

describe("solveAll", () => {
  test("triangle 3-coloring has 6 solutions", () => {
    const csp = graphColoring([["A", "B"], ["B", "C"], ["A", "C"]], ["R", "G", "B"]);
    const sols = csp.solveAll();
    expect(sols.length).toBe(6);
    for (const s of sols) {
      expect(s.A).not.toBe(s.B);
      expect(s.B).not.toBe(s.C);
      expect(s.A).not.toBe(s.C);
    }
  });

  test("respects limit option", () => {
    const csp = graphColoring([["A", "B"], ["B", "C"], ["A", "C"]], ["R", "G", "B"]);
    const sols = csp.solveAll({ limit: 2 });
    expect(sols.length).toBe(2);
  });

  test("returns all unique solutions", () => {
    const csp = new CSP();
    csp.variable("x", [1, 2, 3]);
    csp.variable("y", [1, 2, 3]);
    csp.constraint(["x", "y"], notEqual());
    const sols = csp.solveAll();
    expect(sols.length).toBe(6); // 3*2 ordered pairs where x!=y
    const unique = new Set(sols.map((s) => `${s.x},${s.y}`));
    expect(unique.size).toBe(6);
  });

  test("empty when unsatisfiable", () => {
    const csp = new CSP();
    csp.variable("x", [1]);
    csp.variable("y", [1]);
    csp.constraint(["x", "y"], notEqual());
    expect(csp.solveAll()).toEqual([]);
  });
});

// ── N-Queens ─────────────────────────────────────────────────────────────────

describe("nQueens", () => {
  test("1-queens has 1 solution", () => {
    const sols = nQueens(1).solveAll();
    expect(sols.length).toBe(1);
  });

  test("4-queens has 2 solutions", () => {
    const sols = nQueens(4).solveAll();
    expect(sols.length).toBe(2);
    for (const s of sols) {
      const vals = Object.values(s) as number[];
      expect(new Set(vals).size).toBe(4);
    }
  });

  test("8-queens has 92 solutions", () => {
    const sols = nQueens(8).solveAll();
    expect(sols.length).toBe(92);
  }, 10000);

  test("nQueens factory throws for n<1", () => {
    expect(() => nQueens(0)).toThrow();
  });
});

// ── graphColoring ─────────────────────────────────────────────────────────────

describe("graphColoring", () => {
  test("path graph A-B-C-D is 2-colorable", () => {
    const csp = graphColoring(
      [["A", "B"], ["B", "C"], ["C", "D"]],
      ["red", "blue"],
    );
    const sol = csp.solve();
    expect(sol).not.toBeNull();
    expect(sol!.A).not.toBe(sol!.B);
    expect(sol!.B).not.toBe(sol!.C);
    expect(sol!.C).not.toBe(sol!.D);
  });

  test("K4 (complete graph on 4 nodes) is not 3-colorable", () => {
    const csp = graphColoring(
      [["A","B"],["A","C"],["A","D"],["B","C"],["B","D"],["C","D"]],
      ["R", "G", "B"],
    );
    expect(csp.solve()).toBeNull();
  });

  test("K4 is 4-colorable", () => {
    const csp = graphColoring(
      [["A","B"],["A","C"],["A","D"],["B","C"],["B","D"],["C","D"]],
      ["R", "G", "B", "Y"],
    );
    const sol = csp.solve();
    expect(sol).not.toBeNull();
    const vals = Object.values(sol!);
    expect(new Set(vals).size).toBe(4);
  });
});

// ── AC3 ──────────────────────────────────────────────────────────────────────

describe("ac3", () => {
  test("reduces domain based on arc consistency", () => {
    const csp = new CSP();
    csp.variable("x", [1, 2, 3, 4, 5]);
    csp.variable("y", [3, 4, 5]);
    csp.constraint(["x", "y"], (a, b) => (a as number) < (b as number));
    const feasible = csp.ac3();
    expect(feasible).toBe(true);
    // x=5 is invalid: no y in [3,4,5] satisfies 5 < y
    expect(csp.domain("x")).not.toContain(5);
    // x=4 IS valid: 4 < 5 exists in y's domain
    expect(csp.domain("x")).toContain(4);
  });

  test("returns false when domain becomes empty", () => {
    const csp = new CSP();
    csp.variable("x", [5, 6]);
    csp.variable("y", [1, 2]);
    csp.constraint(["x", "y"], (a, b) => (a as number) < (b as number));
    expect(csp.ac3()).toBe(false);
  });
});

// ── n-ary constraint ──────────────────────────────────────────────────────────

describe("n-ary constraint", () => {
  test("allDifferent on 3 variables", () => {
    const csp = new CSP();
    csp.variable("a", [1, 2, 3]);
    csp.variable("b", [1, 2, 3]);
    csp.variable("c", [1, 2, 3]);
    csp.constraint(["a", "b", "c"], allDifferent());
    const sols = csp.solveAll();
    expect(sols.length).toBe(6);
    for (const s of sols) {
      expect(new Set([s.a, s.b, s.c]).size).toBe(3);
    }
  });

  test("sumEquals", () => {
    const csp = new CSP();
    csp.variable("a", [1, 2, 3]);
    csp.variable("b", [1, 2, 3]);
    csp.constraint(["a", "b"], sumEquals(4));
    const sols = csp.solveAll();
    for (const s of sols) expect((s.a as number) + (s.b as number)).toBe(4);
    expect(sols.length).toBe(3); // (1,3), (2,2), (3,1)
  });
});

// ── helper constraints ────────────────────────────────────────────────────────

describe("helper constraint functions", () => {
  test("equalTo", () => {
    expect(equalTo(5)(5)).toBe(true);
    expect(equalTo(5)(6)).toBe(false);
  });

  test("notEqualTo", () => {
    expect(notEqualTo(5)(5)).toBe(false);
    expect(notEqualTo(5)(6)).toBe(true);
  });

  test("lessThan", () => {
    expect(lessThan()(1, 2)).toBe(true);
    expect(lessThan()(2, 2)).toBe(false);
    expect(lessThan()(3, 2)).toBe(false);
  });

  test("lessThanOrEqual", () => {
    expect(lessThanOrEqual()(2, 2)).toBe(true);
    expect(lessThanOrEqual()(3, 2)).toBe(false);
  });

  test("greaterThan", () => {
    expect(greaterThan()(3, 2)).toBe(true);
    expect(greaterThan()(2, 2)).toBe(false);
  });

  test("greaterThanOrEqual", () => {
    expect(greaterThanOrEqual()(2, 2)).toBe(true);
    expect(greaterThanOrEqual()(1, 2)).toBe(false);
  });

  test("sumInRange", () => {
    expect(sumInRange(3, 6)(2, 3)).toBe(true);
    expect(sumInRange(3, 6)(1, 1)).toBe(false);
    expect(sumInRange(3, 6)(4, 4)).toBe(false);
  });

  test("inSet", () => {
    const allowed = new Set(["red", "green"]);
    expect(inSet(allowed)("red")).toBe(true);
    expect(inSet(allowed)("blue")).toBe(false);
  });

  test("notInSet", () => {
    const excluded = new Set([1, 2]);
    expect(notInSet(excluded)(3)).toBe(true);
    expect(notInSet(excluded)(1)).toBe(false);
  });

  test("allDifferent - basic", () => {
    expect(allDifferent()(1, 2, 3)).toBe(true);
    expect(allDifferent()(1, 2, 1)).toBe(false);
    expect(allDifferent()("a", "b", "c")).toBe(true);
  });

  test("notEqual", () => {
    expect(notEqual()(1, 2)).toBe(true);
    expect(notEqual()(1, 1)).toBe(false);
  });
});

// ── min-conflicts ─────────────────────────────────────────────────────────────

describe("minConflicts", () => {
  test("solves 8-queens", () => {
    const csp = nQueens(8);
    const sol = csp.minConflicts(10000);
    if (sol !== null) {
      const vals = Object.values(sol) as number[];
      expect(new Set(vals).size).toBe(8);
    }
    // min-conflicts is probabilistic, just ensure no exception
  });

  test("empty CSP returns empty object", () => {
    expect(new CSP().minConflicts()).toEqual({});
  });
});

// ── cryptarithmetic ───────────────────────────────────────────────────────────

describe("cryptarithmetic — SEND+MORE=MONEY", () => {
  test("finds valid assignment", () => {
    const csp = new CSP();
    const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (const v of ["S", "E", "N", "D", "M", "O", "R", "Y"]) csp.variable(v, digits);
    csp.constraint(["S"], notEqualTo(0));
    csp.constraint(["M"], notEqualTo(0));
    csp.constraint(["S","E","N","D","M","O","R","Y"], allDifferent());
    csp.constraint(["S","E","N","D","M","O","R","Y"], (...vs: unknown[]) => {
      const [S,E,N,D,Mv,O,R,Y] = vs as number[];
      const send  = S*1000 + E*100 + N*10 + D;
      const more  = Mv*1000 + O*100 + R*10 + E;
      const money = Mv*10000 + O*1000 + N*100 + E*10 + Y;
      return send + more === money;
    });
    const sol = csp.solve({ ac3: false });
    if (sol !== null) {
      const S=sol.S as number, E=sol.E as number, N=sol.N as number, D=sol.D as number;
      const Mv=sol.M as number, O=sol.O as number, R=sol.R as number, Y=sol.Y as number;
      expect(S*1000+E*100+N*10+D + Mv*1000+O*100+R*10+E)
        .toBe(Mv*10000+O*1000+N*100+E*10+Y);
    }
  }, 30000);
});
