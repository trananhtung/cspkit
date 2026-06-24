import type { ConstraintFn } from "./csp.js";

/** All variables must have different values. Like Python AllDifferentConstraint. */
export function allDifferent(): ConstraintFn {
  return (...values: unknown[]) => {
    const seen = new Set();
    for (const v of values) {
      if (seen.has(v)) return false;
      seen.add(v);
    }
    return true;
  };
}

/** Two variables must have different values. */
export function notEqual(): ConstraintFn {
  return (a: unknown, b: unknown) => a !== b;
}

/** Variable must equal a specific value. */
export function equalTo(value: unknown): ConstraintFn {
  return (v: unknown) => v === value;
}

/** Variable must not equal a specific value. */
export function notEqualTo(value: unknown): ConstraintFn {
  return (v: unknown) => v !== value;
}

/** First variable less than second. */
export function lessThan(): ConstraintFn {
  return (a: unknown, b: unknown) => (a as number) < (b as number);
}

/** First variable less than or equal to second. */
export function lessThanOrEqual(): ConstraintFn {
  return (a: unknown, b: unknown) => (a as number) <= (b as number);
}

/** First variable greater than second. */
export function greaterThan(): ConstraintFn {
  return (a: unknown, b: unknown) => (a as number) > (b as number);
}

/** First variable greater than or equal to second. */
export function greaterThanOrEqual(): ConstraintFn {
  return (a: unknown, b: unknown) => (a as number) >= (b as number);
}

/** Sum of all variables equals target. */
export function sumEquals(target: number): ConstraintFn {
  return (...values: unknown[]) =>
    values.reduce((acc: number, v) => acc + (v as number), 0) === target;
}

/** Sum of all variables is within [min, max]. */
export function sumInRange(min: number, max: number): ConstraintFn {
  return (...values: unknown[]) => {
    const s = values.reduce((acc: number, v) => acc + (v as number), 0);
    return s >= min && s <= max;
  };
}

/** Value must be a member of the given set. */
export function inSet(allowed: Set<unknown>): ConstraintFn {
  return (v: unknown) => allowed.has(v);
}

/** Value must not be a member of the given set. */
export function notInSet(excluded: Set<unknown>): ConstraintFn {
  return (v: unknown) => !excluded.has(v);
}

// ── Problem factories ─────────────────────────────────────────────────────────

import { CSP } from "./csp.js";

/**
 * Create an N-Queens CSP.
 * Variables: Q0..Q(n-1), each with domain [0..n-1] (column position in row i).
 * Solution: no two queens attack each other.
 */
export function nQueens(n: number): CSP {
  if (n < 1) throw new Error("n must be >= 1");
  const csp = new CSP();
  const cols = Array.from({ length: n }, (_, i) => i);

  for (let i = 0; i < n; i++) csp.variable(`Q${i}`, cols);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const di = Math.abs(i - j);
      csp.constraint([`Q${i}`, `Q${j}`], (ci, cj) => {
        const a = ci as number;
        const b = cj as number;
        return a !== b && Math.abs(a - b) !== di;
      });
    }
  }
  return csp;
}

/**
 * Create a graph coloring CSP from an adjacency list.
 * @param edges - pairs of node names that share an edge
 * @param colors - available colors (default: 3)
 */
export function graphColoring(
  edges: [string, string][],
  colors: unknown[] = ["red", "green", "blue"],
): CSP {
  const csp = new CSP();
  const nodes = new Set<string>();
  for (const [a, b] of edges) { nodes.add(a); nodes.add(b); }
  for (const n of nodes) csp.variable(n, colors);
  for (const [a, b] of edges) csp.constraint([a, b], notEqual());
  return csp;
}
