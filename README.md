# cspkit

[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)

> Zero-dependency TypeScript Constraint Satisfaction Problem (CSP) solver. Backtracking + AC3 arc consistency + MRV heuristic + forward checking + min-conflicts. Like Python `python-constraint`. Solves N-Queens, Sudoku, graph coloring, scheduling, cryptarithmetic.

[![npm](https://img.shields.io/npm/v/cspkit)](https://www.npmjs.com/package/cspkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Install

```bash
npm install cspkit
```

## Quick start

```typescript
import { CSP, allDifferent, notEqual } from "cspkit";

// Australia map coloring — no adjacent regions share a color
const csp = new CSP();
const colors = ["red", "green", "blue"];
for (const state of ["WA", "NT", "SA", "Q", "NSW", "V", "T"]) {
  csp.variable(state, colors);
}
csp.constraint(["WA", "NT"],  notEqual());
csp.constraint(["WA", "SA"],  notEqual());
csp.constraint(["NT", "SA"],  notEqual());
csp.constraint(["NT", "Q"],   notEqual());
csp.constraint(["SA", "Q"],   notEqual());
csp.constraint(["SA", "NSW"], notEqual());
csp.constraint(["SA", "V"],   notEqual());
csp.constraint(["Q",  "NSW"], notEqual());
csp.constraint(["NSW", "V"],  notEqual());

const solution = csp.solve();
// { WA: 'red', NT: 'green', SA: 'blue', Q: 'red', NSW: 'green', V: 'red', T: 'red' }
```

## Why cspkit?

The npm CSP ecosystem is effectively empty:
- **csps** — abandoned 2021, only Min-conflicts, 402 annual downloads
- **edge-coloring** — single algorithm, 1 download/week
- **python-constraint** port — none

Python's `python-constraint` (PyCSP), Go's constraint solvers, and Ruby's Ruco have been solving CSPs for years. `cspkit` brings the full algorithm stack to npm.

## Core concepts

A CSP has:
- **Variables** — named slots with a domain of possible values
- **Constraints** — predicates that must hold over a subset of variables
- **Solution** — an assignment of values to variables satisfying all constraints

## Examples

### N-Queens

```typescript
import { nQueens } from "cspkit";

const solutions = nQueens(8).solveAll();
// → 92 solutions, each like { Q0: 0, Q1: 4, Q2: 7, Q3: 5, Q4: 2, Q5: 6, Q6: 1, Q7: 3 }
```

### Graph coloring

```typescript
import { graphColoring } from "cspkit";

const csp = graphColoring(
  [["A", "B"], ["B", "C"], ["A", "C"]],  // triangle
  ["red", "green", "blue"]
);
csp.solveAll().length; // → 6
```

### Cryptarithmetic — SEND+MORE=MONEY

```typescript
const csp = new CSP();
const digits = [0,1,2,3,4,5,6,7,8,9];
for (const v of ["S","E","N","D","M","O","R","Y"]) csp.variable(v, digits);
csp.constraint(["S"], notEqualTo(0));
csp.constraint(["M"], notEqualTo(0));
csp.constraint(["S","E","N","D","M","O","R","Y"], allDifferent());
csp.constraint(["S","E","N","D","M","O","R","Y"], (S,E,N,D,M,O,R,Y) => {
  const [s,e,n,d,m,o,r,y] = [S,E,N,D,M,O,R,Y] as number[];
  return s*1000+e*100+n*10+d + m*1000+o*100+r*10+e
    === m*10000+o*1000+n*100+e*10+y;
});
const sol = csp.solve({ ac3: false });
// → { S:9, E:5, N:6, D:7, M:1, O:0, R:8, Y:2 }
```

## API

```typescript
class CSP {
  variable(name: string, domain: unknown[]): this
  constraint(variables: string[], check: (...values: unknown[]) => boolean): this

  solve(options?: SolveOptions): Record<string, unknown> | null
  solveAll(options?: SolveOptions): Record<string, unknown>[]
  ac3(): boolean  // run arc consistency (returns false if unsatisfiable)
  minConflicts(maxSteps?: number): Record<string, unknown> | null

  get variables(): string[]
  domain(name: string): unknown[]
}

interface SolveOptions {
  ac3?: boolean   // default: true
  mrv?: boolean   // default: true (Minimum Remaining Values heuristic)
  limit?: number  // default: Infinity (for solveAll)
}
```

### Built-in constraint helpers

```typescript
allDifferent()           // all variables have distinct values
notEqual()               // two variables differ
equalTo(value)           // variable equals value
notEqualTo(value)        // variable not equal to value
lessThan()               // a < b
lessThanOrEqual()        // a <= b
greaterThan()            // a > b
greaterThanOrEqual()     // a >= b
sumEquals(target)        // sum of all variables equals target
sumInRange(min, max)     // sum is in [min, max]
inSet(allowed: Set)      // value is in the allowed set
notInSet(excluded: Set)  // value is not in the excluded set
```

### Problem factories

```typescript
nQueens(n: number): CSP
graphColoring(edges: [string, string][], colors?: unknown[]): CSP
```

## Algorithms

| Algorithm | When | Effect |
|---|---|---|
| **AC3** | pre-solve | Reduces domains using arc consistency — eliminates values that can't participate in any solution |
| **Backtracking** | main search | Depth-first search with pruning |
| **MRV** | variable order | Pick variable with fewest remaining values (fails fast) |
| **Forward checking** | propagation | After assignment, prune inconsistent values from neighbors |
| **Min-conflicts** | local search | Iterative repair — good for large/overconstrained problems |

## Comparison

| Language | Library | Status | Algorithms |
|---|---|---|---|
| Python | `python-constraint` | Active | AC3, backtracking, min-conflicts |
| Go | `constraint-solver` | Active | Backtracking + propagation |
| Ruby | `ruco` | Active | Backtracking |
| npm (old) | `csps` | **Abandoned 2021** | Min-conflicts only |
| **npm** | **cspkit** | **Active** | AC3 + backtracking + MRV + forward checking + min-conflicts |

## Contributors ✨

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind are welcome — code, docs, bug reports, ideas, reviews! See the [emoji key](https://allcontributors.org/docs/en/emoji-key) for how each contribution is recognized, and open a PR or issue to get involved.

Thanks goes to these wonderful people:

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/trananhtung"><img src="https://avatars.githubusercontent.com/u/30992229?v=4?s=100" width="100px;" alt="Tung Tran"/><br /><sub><b>Tung Tran</b></sub></a><br /><a href="https://github.com/trananhtung/cspkit/commits?author=trananhtung" title="Code">💻</a> <a href="#maintenance-trananhtung" title="Maintenance">🚧</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

## License

MIT © [trananhtung](https://github.com/trananhtung)
