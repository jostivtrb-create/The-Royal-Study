// Motor de "The Royal Enchanted": reglas de ajedrez en 3x3, transformaciones
// (rotar/espejo), cálculo del mínimo de movimientos (BFS) y generador de puzzles.
import { PIECE_ORDER, type PieceType } from "./pieces";

export const N = 3; // tablero 3x3
export type Sq = number; // 0..8  (idx = row*3 + col)
export type Placement = Record<PieceType, Sq>;

export const rc = (sq: Sq) => ({ row: Math.floor(sq / N), col: sq % N });
export const sq = (row: number, col: number): Sq => row * N + col;
const inBoard = (r: number, c: number) => r >= 0 && r < N && c >= 0 && c < N;

// ---------- Movimientos de ajedrez (a casillas vacías; sin saltar salvo caballo) ----------

const SLIDES: Record<"R" | "B" | "Q", Array<[number, number]>> = {
  R: [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ],
  B: [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ],
  Q: [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ],
};

const KING_STEPS = SLIDES.Q;
const KNIGHT_STEPS: Array<[number, number]> = [
  [1, 2],
  [2, 1],
  [-1, 2],
  [-2, 1],
  [1, -2],
  [2, -1],
  [-1, -2],
  [-2, -1],
];

/** Casillas vacías a las que la pieza en `from` puede moverse. */
export function legalDestinations(
  occupied: Set<Sq>,
  from: Sq,
  piece: PieceType,
): Sq[] {
  return reachable(occupied, from, piece).free;
}

/**
 * Casillas al alcance de la pieza, separando las **libres** (movimiento válido)
 * de las **bloqueadas** (ocupadas por otra ficha: el caballo/rey caería ahí; los
 * deslizantes chocan ahí). Sirve para mostrar destinos en verde y rojo.
 */
export function reachable(
  occupied: Set<Sq>,
  from: Sq,
  piece: PieceType,
): { free: Sq[]; blocked: Sq[] } {
  const { row, col } = rc(from);
  const free: Sq[] = [];
  const blocked: Sq[] = [];

  const step = (r: number, c: number) => {
    if (!inBoard(r, c)) return;
    const s = sq(r, c);
    if (occupied.has(s)) blocked.push(s);
    else free.push(s);
  };

  if (piece === "K") {
    for (const [dr, dc] of KING_STEPS) step(row + dr, col + dc);
  } else if (piece === "N") {
    for (const [dr, dc] of KNIGHT_STEPS) step(row + dr, col + dc);
  } else {
    for (const [dr, dc] of SLIDES[piece]) {
      let r = row + dr,
        c = col + dc;
      while (inBoard(r, c)) {
        const s = sq(r, c);
        if (occupied.has(s)) {
          blocked.push(s); // primera ficha que corta el camino
          break;
        }
        free.push(s);
        r += dr;
        c += dc;
      }
    }
  }
  return { free, blocked };
}

// ---------- Utilidades de posición ----------

export const occupiedOf = (p: Placement): Set<Sq> =>
  new Set(PIECE_ORDER.map((t) => p[t]));

export const serialize = (p: Placement): string =>
  PIECE_ORDER.map((t) => p[t]).join(",");

export const equalPlacement = (a: Placement, b: Placement): boolean =>
  PIECE_ORDER.every((t) => a[t] === b[t]);

// ---------- Transformaciones diédricas (D4) ----------

type SqMap = (s: Sq) => Sq;
const m = (r: number, c: number) => sq(r, c);

export type Op = "rotCW" | "rotCCW" | "mirrorH" | "mirrorV";

/** Mapas elementales aplicables durante la ejecución. */
export const OP_MAP: Record<Op, SqMap> = {
  rotCW: (s) => {
    const { row, col } = rc(s);
    return m(col, N - 1 - row);
  },
  rotCCW: (s) => {
    const { row, col } = rc(s);
    return m(N - 1 - col, row);
  },
  mirrorH: (s) => {
    const { row, col } = rc(s);
    return m(row, N - 1 - col);
  },
  mirrorV: (s) => {
    const { row, col } = rc(s);
    return m(N - 1 - row, col);
  },
};

export const OP_LABEL: Record<Op, string> = {
  rotCW: "Rotar ⟳",
  rotCCW: "Rotar ⟲",
  mirrorH: "Espejo ⇄",
  mirrorV: "Espejo ⇅",
};

/** Aplica un operador a una posición completa. */
export function applyOp(p: Placement, op: Op): Placement {
  const map = OP_MAP[op];
  const out = {} as Placement;
  for (const t of PIECE_ORDER) out[t] = map(p[t]);
  return out;
}

// Las 8 transformaciones del grupo diédrico y su coste (en operaciones).
const DIHEDRAL: Array<{ map: SqMap; cost: number }> = (() => {
  const id: SqMap = (s) => s;
  const cw = OP_MAP.rotCW;
  const cw2: SqMap = (s) => cw(cw(s));
  const ccw = OP_MAP.rotCCW;
  const mh = OP_MAP.mirrorH;
  const mv = OP_MAP.mirrorV;
  const tr: SqMap = (s) => cw(mh(s)); // transpuesta
  const at: SqMap = (s) => ccw(mh(s)); // antitranspuesta
  return [
    { map: id, cost: 0 },
    { map: cw, cost: 1 },
    { map: ccw, cost: 1 },
    { map: cw2, cost: 2 },
    { map: mh, cost: 1 },
    { map: mv, cost: 1 },
    { map: tr, cost: 2 },
    { map: at, cost: 2 },
  ];
})();

function transformPlacement(p: Placement, map: SqMap): Placement {
  const out = {} as Placement;
  for (const t of PIECE_ORDER) out[t] = map(p[t]);
  return out;
}

// ---------- BFS: mínimo de movimientos ----------

/** Mínimo de movimientos de piezas para pasar de `start` a `target` (sin transformar). */
export function minMoves(start: Placement, target: Placement): number {
  if (equalPlacement(start, target)) return 0;
  const targetKey = serialize(target);
  const visited = new Set<string>([serialize(start)]);
  let frontier: Placement[] = [start];
  let depth = 0;

  while (frontier.length) {
    depth++;
    const next: Placement[] = [];
    for (const state of frontier) {
      const occ = occupiedOf(state);
      for (const t of PIECE_ORDER) {
        for (const dest of legalDestinations(occ, state[t], t)) {
          const ns = { ...state, [t]: dest };
          const key = serialize(ns);
          if (key === targetKey) return depth;
          if (!visited.has(key)) {
            visited.add(key);
            next.push(ns);
          }
        }
      }
    }
    frontier = next;
    if (depth > 12) break; // tope de seguridad
  }
  return Infinity;
}

/** Mínimo global considerando transformaciones (rotar/espejo) y su coste. */
export function minSolution(start: Placement, target: Placement): number {
  let best = Infinity;
  for (const { map, cost } of DIHEDRAL) {
    const tt = transformPlacement(target, map);
    const mv = minMoves(start, tt);
    if (mv + cost < best) best = mv + cost;
  }
  return best;
}

// ---------- Solucionador con camino (para mostrar la solución óptima) ----------

const ALL_OPS: Op[] = ["rotCW", "rotCCW", "mirrorH", "mirrorV"];

export type Action =
  | { kind: "move"; piece: PieceType; from: Sq; to: Sq }
  | { kind: "op"; op: Op };

/**
 * Encuentra una secuencia óptima de acciones (mover una pieza o girar/voltear el
 * tablero, cada una cuesta 1) para pasar de `start` a `target`. BFS con rastro.
 */
export function solve(start: Placement, target: Placement): { min: number; path: Action[] } {
  const startKey = serialize(start);
  const targetKey = serialize(target);
  if (startKey === targetKey) return { min: 0, path: [] };

  const prev = new Map<string, { from: string; action: Action }>();
  const visited = new Set<string>([startKey]);
  let frontier: Placement[] = [start];
  let depth = 0;

  const finish = (): { min: number; path: Action[] } => {
    const path: Action[] = [];
    let key = targetKey;
    while (key !== startKey) {
      const e = prev.get(key)!;
      path.push(e.action);
      key = e.from;
    }
    path.reverse();
    return { min: path.length, path };
  };

  while (frontier.length) {
    depth++;
    const next: Placement[] = [];
    for (const state of frontier) {
      const stateKey = serialize(state);
      const occ = occupiedOf(state);
      for (const t of PIECE_ORDER) {
        for (const dest of legalDestinations(occ, state[t], t)) {
          const ns = { ...state, [t]: dest };
          const key = serialize(ns);
          if (visited.has(key)) continue;
          visited.add(key);
          prev.set(key, { from: stateKey, action: { kind: "move", piece: t, from: state[t], to: dest } });
          if (key === targetKey) return finish();
          next.push(ns);
        }
      }
      for (const op of ALL_OPS) {
        const ns = applyOp(state, op);
        const key = serialize(ns);
        if (visited.has(key)) continue;
        visited.add(key);
        prev.set(key, { from: stateKey, action: { kind: "op", op } });
        if (key === targetKey) return finish();
        next.push(ns);
      }
    }
    frontier = next;
    if (depth > 16) break;
  }
  return { min: Infinity, path: [] };
}

// ---------- Generador de puzzles ----------

const CENTER: Sq = 4; // (1,1): el caballo nunca puede entrar/salir de aquí en 3x3

export function randomPlacement(): Placement {
  const squares = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  let p: Placement;
  do {
    for (let i = squares.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [squares[i], squares[j]] = [squares[j], squares[i]];
    }
    p = {} as Placement;
    PIECE_ORDER.forEach((t, i) => (p[t] = squares[i]));
  } while (p.N === CENTER); // el caballo nunca empieza en el centro (quedaría atascado)
  return p;
}

/**
 * Genera un objetivo aleatorio resoluble a partir de una posición de inicio.
 * Sin tope de dificultad (puede ser de 1 movimiento o muchos) — solo exige que
 * sea alcanzable (mínimo finito) y distinto del inicio. Da variedad infinita.
 */
export function randomTargetFor(start: Placement): { target: Placement; min: number } {
  for (let i = 0; i < 600; i++) {
    const target = randomPlacement();
    if (target.N === CENTER) continue; // el caballo no puede llegar al centro
    if (equalPlacement(start, target)) continue;
    const min = minSolution(start, target);
    if (Number.isFinite(min) && min >= 1) return { target, min };
  }
  // Respaldo garantizado: mover una sola pieza a una casilla vacía.
  const occ = occupiedOf(start);
  for (const t of PIECE_ORDER) {
    const dests = legalDestinations(occ, start[t], t);
    if (dests.length) return { target: { ...start, [t]: dests[0] }, min: 1 };
  }
  return { target: start, min: 0 };
}

export type Puzzle = { start: Placement; target: Placement; min: number };

/** Genera un puzzle con dificultad dentro del rango [minMovesWanted, maxMovesWanted]. */
export function generatePuzzle(min = 2, max = 6): Puzzle {
  for (let tries = 0; tries < 400; tries++) {
    const start = randomPlacement();
    const target = randomPlacement();
    if (equalPlacement(start, target)) continue;
    const sol = minSolution(start, target);
    if (sol >= min && sol <= max) return { start, target, min: sol };
  }
  // Respaldo: cualquier par resoluble.
  const start = randomPlacement();
  let target = randomPlacement();
  while (equalPlacement(start, target)) target = randomPlacement();
  return { start, target, min: minSolution(start, target) };
}
