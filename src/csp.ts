export type Domain = unknown[];
export type Assignment = Map<string, unknown>;
export type ConstraintFn = (...values: unknown[]) => boolean;

export interface Constraint {
  variables: string[];
  check: ConstraintFn;
}

export interface SolveOptions {
  /** Use AC3 arc consistency before backtracking (default: true) */
  ac3?: boolean;
  /** Use MRV heuristic for variable selection (default: true) */
  mrv?: boolean;
  /** Max solutions to collect in solveAll (default: Infinity) */
  limit?: number;
}

export class CSPError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CSPError";
  }
}

export class CSP {
  private readonly _variables = new Map<string, Domain>();
  private readonly _constraints: Constraint[] = [];

  /** Add a variable with its domain of possible values. */
  variable(name: string, domain: Domain): this {
    if (domain.length === 0) throw new CSPError(`Domain for "${name}" cannot be empty`);
    this._variables.set(name, [...domain]);
    return this;
  }

  /** Add a constraint over a list of variables. The check function receives values in the same order. */
  constraint(variables: string[], check: ConstraintFn): this {
    for (const v of variables) {
      if (!this._variables.has(v)) {
        throw new CSPError(`Unknown variable "${v}" in constraint`);
      }
    }
    this._constraints.push({ variables, check });
    return this;
  }

  /** Run AC3 arc consistency. Returns false if the problem is demonstrably unsatisfiable. */
  ac3(): boolean {
    const domains = new Map<string, Domain>(
      [...this._variables.entries()].map(([k, v]) => [k, [...v]]),
    );
    const result = runAC3(domains, this._constraints);
    if (result) {
      for (const [k, d] of domains) this._variables.set(k, d);
    }
    return result;
  }

  /**
   * Solve the CSP with backtracking. Returns the first solution found, or null.
   * Like Python constraint.Problem.getSolution().
   */
  solve(options: SolveOptions = {}): Record<string, unknown> | null {
    const { ac3 = true, mrv = true } = options;
    const domains = new Map<string, Domain>(
      [...this._variables.entries()].map(([k, v]) => [k, [...v]]),
    );
    if (ac3 && !runAC3(domains, this._constraints)) return null;

    const assignment: Assignment = new Map();
    const result = backtrack(assignment, domains, this._constraints, { mrv, limit: 1 });
    return result.length > 0 ? mapToObject(result[0]) : null;
  }

  /**
   * Find all solutions. Returns an array of assignment objects.
   * Like Python constraint.Problem.getSolutions().
   */
  solveAll(options: SolveOptions = {}): Record<string, unknown>[] {
    const { ac3 = true, mrv = true, limit = Infinity } = options;
    const domains = new Map<string, Domain>(
      [...this._variables.entries()].map(([k, v]) => [k, [...v]]),
    );
    if (ac3 && !runAC3(domains, this._constraints)) return [];

    const assignment: Assignment = new Map();
    const results = backtrack(assignment, domains, this._constraints, { mrv, limit });
    return results.map(mapToObject);
  }

  /**
   * Min-conflicts local search. Good for overconstrained/large problems.
   * Returns a solution or null after `maxSteps` iterations.
   */
  minConflicts(maxSteps = 1000): Record<string, unknown> | null {
    const vars = [...this._variables.keys()];
    if (vars.length === 0) return {};

    const assignment: Assignment = new Map();
    for (const v of vars) {
      const domain = this._variables.get(v)!;
      assignment.set(v, domain[Math.floor(Math.random() * domain.length)]);
    }

    for (let step = 0; step < maxSteps; step++) {
      const conflicted = vars.filter((v) => hasConflict(v, assignment, this._constraints));
      if (conflicted.length === 0) return mapToObject(assignment);

      const v = conflicted[Math.floor(Math.random() * conflicted.length)];
      const domain = this._variables.get(v)!;
      const best = valueWithMinConflicts(v, domain, assignment, this._constraints);
      assignment.set(v, best);
    }

    const conflicted = vars.filter((v) => hasConflict(v, assignment, this._constraints));
    return conflicted.length === 0 ? mapToObject(assignment) : null;
  }

  /** All variable names. */
  get variables(): string[] {
    return [...this._variables.keys()];
  }

  /** Current domain for a variable (may be reduced by AC3). */
  domain(name: string): Domain {
    return [...(this._variables.get(name) ?? [])];
  }
}

// ── backtracking ─────────────────────────────────────────────────────────────

interface BacktrackOptions {
  mrv: boolean;
  limit: number;
}

function backtrack(
  assignment: Assignment,
  domains: Map<string, Domain>,
  constraints: Constraint[],
  opts: BacktrackOptions,
  results: Assignment[] = [],
): Assignment[] {
  const vars = [...domains.keys()];
  const unassigned = vars.filter((v) => !assignment.has(v));

  if (unassigned.length === 0) {
    results.push(new Map(assignment));
    return results;
  }

  const variable = opts.mrv
    ? selectMRV(unassigned, domains, constraints, assignment)
    : unassigned[0];

  for (const value of domains.get(variable)!) {
    if (!isConsistent(variable, value, assignment, constraints)) continue;

    assignment.set(variable, value);

    // Forward checking: save and prune
    const saved = new Map<string, Domain>();
    let feasible = true;
    for (const neighbor of getUnassignedNeighbors(variable, unassigned, constraints)) {
      const prunedDomain = domains
        .get(neighbor)!
        .filter((val) => {
          assignment.set(neighbor, val);
          const ok = isConsistent(neighbor, val, assignment, constraints);
          assignment.delete(neighbor);
          return ok;
        });
      saved.set(neighbor, domains.get(neighbor)!);
      domains.set(neighbor, prunedDomain);
      if (prunedDomain.length === 0) { feasible = false; break; }
    }

    if (feasible) {
      backtrack(assignment, domains, constraints, opts, results);
      if (results.length >= opts.limit) { assignment.delete(variable); return results; }
    }

    assignment.delete(variable);
    for (const [k, v] of saved) domains.set(k, v);
  }

  return results;
}

function selectMRV(
  unassigned: string[],
  domains: Map<string, Domain>,
  constraints: Constraint[],
  assignment: Assignment,
): string {
  let best = unassigned[0];
  let bestSize = domains.get(best)!.length;
  let bestDegree = constraintDegree(best, unassigned, constraints);

  for (const v of unassigned) {
    const size = domains.get(v)!.length;
    if (size < bestSize || (size === bestSize && constraintDegree(v, unassigned, constraints) > bestDegree)) {
      best = v;
      bestSize = size;
      bestDegree = constraintDegree(v, unassigned, constraints);
    }
  }

  return best;
}

function constraintDegree(v: string, unassigned: string[], constraints: Constraint[]): number {
  const unassignedSet = new Set(unassigned);
  let count = 0;
  for (const c of constraints) {
    if (c.variables.includes(v) && c.variables.some((u) => u !== v && unassignedSet.has(u))) {
      count++;
    }
  }
  return count;
}

function getUnassignedNeighbors(
  variable: string,
  unassigned: string[],
  constraints: Constraint[],
): string[] {
  const unassignedSet = new Set(unassigned);
  const neighbors = new Set<string>();
  for (const c of constraints) {
    if (c.variables.includes(variable)) {
      for (const v of c.variables) {
        if (v !== variable && unassignedSet.has(v)) neighbors.add(v);
      }
    }
  }
  return [...neighbors];
}

function isConsistent(
  variable: string,
  value: unknown,
  assignment: Assignment,
  constraints: Constraint[],
): boolean {
  for (const c of constraints) {
    if (!c.variables.includes(variable)) continue;
    if (!c.variables.every((v) => v === variable || assignment.has(v))) continue;
    const values = c.variables.map((v) => (v === variable ? value : assignment.get(v)));
    if (!c.check(...values)) return false;
  }
  return true;
}

// ── AC3 ──────────────────────────────────────────────────────────────────────

function runAC3(domains: Map<string, Domain>, constraints: Constraint[]): boolean {
  const binaryConstraints = constraints.filter((c) => c.variables.length === 2);
  const queue: [string, string][] = binaryConstraints.flatMap((c) => [
    [c.variables[0], c.variables[1]],
    [c.variables[1], c.variables[0]],
  ]);

  while (queue.length > 0) {
    const [xi, xj] = queue.shift()!;
    if (revise(xi, xj, domains, binaryConstraints)) {
      if (domains.get(xi)!.length === 0) return false;
      for (const [xk] of binaryConstraints.filter(
        (c) => c.variables.includes(xi) && c.variables.includes(xj) === false,
      ).flatMap((c) => [[c.variables[0], c.variables[1]], [c.variables[1], c.variables[0]]] as [string, string][])
        .filter(([, b]) => b === xi)) {
        queue.push([xk, xi]);
      }
    }
  }
  return true;
}

function revise(
  xi: string,
  xj: string,
  domains: Map<string, Domain>,
  constraints: Constraint[],
): boolean {
  const applicable = constraints.filter(
    (c) => c.variables.length === 2 &&
      ((c.variables[0] === xi && c.variables[1] === xj) ||
        (c.variables[0] === xj && c.variables[1] === xi)),
  );
  if (applicable.length === 0) return false;

  const domainXi = domains.get(xi)!;
  const domainXj = domains.get(xj)!;
  const before = domainXi.length;

  domains.set(
    xi,
    domainXi.filter((vx) =>
      domainXj.some((vy) =>
        applicable.every((c) => {
          const vals = c.variables[0] === xi ? [vx, vy] : [vy, vx];
          return c.check(...vals);
        }),
      ),
    ),
  );

  return domains.get(xi)!.length < before;
}

// ── Min-conflicts helpers ─────────────────────────────────────────────────────

function hasConflict(variable: string, assignment: Assignment, constraints: Constraint[]): boolean {
  for (const c of constraints) {
    if (!c.variables.includes(variable)) continue;
    if (!c.variables.every((v) => assignment.has(v))) continue;
    const values = c.variables.map((v) => assignment.get(v));
    if (!c.check(...values)) return true;
  }
  return false;
}

function valueWithMinConflicts(
  variable: string,
  domain: Domain,
  assignment: Assignment,
  constraints: Constraint[],
): unknown {
  let bestValue = domain[0];
  let bestConflicts = Infinity;

  for (const value of domain) {
    assignment.set(variable, value);
    let conflicts = 0;
    for (const c of constraints) {
      if (!c.variables.includes(variable)) continue;
      if (!c.variables.every((v) => assignment.has(v))) continue;
      const values = c.variables.map((v) => assignment.get(v));
      if (!c.check(...values)) conflicts++;
    }
    assignment.delete(variable);

    if (conflicts < bestConflicts) {
      bestConflicts = conflicts;
      bestValue = value;
      if (conflicts === 0) break;
    }
  }

  return bestValue;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function mapToObject(m: Assignment): Record<string, unknown> {
  return Object.fromEntries(m);
}
