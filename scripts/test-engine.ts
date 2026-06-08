import {
  minMoves,
  minSolution,
  generatePuzzle,
  randomPlacement,
  randomTargetFor,
  legalDestinations,
  occupiedOf,
  applyOp,
  equalPlacement,
  solve,
  sq,
  type Placement,
} from "../src/game/engine";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.log("  ✗ FALLO:", name);
  }
}

// Movimientos básicos
// Torre en esquina (0,0) con tablero por lo demás vacío salvo otras piezas lejos.
const occ = new Set([sq(0, 0)]);
const rookDests = legalDestinations(occ, sq(0, 0), "R");
check("torre desde esquina alcanza 4 casillas (fila+col)", rookDests.length === 4);

// Caballo en el centro no tiene movimientos en 3x3.
const knightCenter = legalDestinations(new Set([sq(1, 1)]), sq(1, 1), "N");
check("caballo en el centro no se mueve", knightCenter.length === 0);

// Caballo en esquina alcanza 2 casillas.
const knightCorner = legalDestinations(new Set([sq(0, 0)]), sq(0, 0), "N");
check("caballo en esquina alcanza 2", knightCorner.length === 2);

// minMoves: misma posición = 0
const base: Placement = { K: sq(2, 2), Q: sq(1, 1), R: sq(0, 0), B: sq(0, 2), N: sq(2, 0) };
check("minMoves a sí mismo = 0", minMoves(base, base) === 0);

// Mover una sola pieza = 1 (Rey de (2,2) a (2,1) vacía)
const oneMove: Placement = { ...base, K: sq(2, 1) };
check("minMoves un paso de rey = 1", minMoves(base, oneMove) === 1);

// applyOp invertible: rotCW seguido de rotCCW = identidad
check("rotCW + rotCCW = identidad", equalPlacement(applyOp(applyOp(base, "rotCW"), "rotCCW"), base));

// minSolution <= minMoves (las transformaciones solo pueden ayudar/igualar)
const t2: Placement = { K: sq(0, 0), Q: sq(1, 1), R: sq(2, 2), B: sq(2, 0), N: sq(0, 2) };
check("minSolution <= minMoves", minSolution(base, t2) <= minMoves(base, t2));

// occupiedOf tiene 5 casillas distintas
check("occupiedOf 5 piezas", occupiedOf(base).size === 5);

// Generador: produce puzzles en rango y resolubles
let okGen = true;
let sumMin = 0;
for (let i = 0; i < 30; i++) {
  const pz = generatePuzzle(2, 6);
  if (pz.min < 2 || pz.min > 6 || !isFinite(pz.min)) okGen = false;
  if (equalPlacement(pz.start, pz.target)) okGen = false;
  sumMin += pz.min;
}
check("generador: 30 puzzles en rango [2,6] y resolubles", okGen);

// randomTargetFor: siempre resoluble (mínimo finito >= 1) y distinto del inicio,
// partiendo de cualquier posición (continuidad entre rondas).
let okTarget = true;
for (let i = 0; i < 50; i++) {
  const start = randomPlacement();
  const { target, min } = randomTargetFor(start);
  if (!isFinite(min) || min < 1) okTarget = false;
  if (equalPlacement(start, target)) okTarget = false;
  if (minSolution(start, target) !== min) okTarget = false;
}
check("randomTargetFor: 50 objetivos resolubles y distintos (continuidad)", okTarget);

// solve(): el camino lleva al objetivo y su longitud coincide con minSolution.
let okSolve = true;
for (let i = 0; i < 40; i++) {
  const start = randomPlacement();
  const { target } = randomTargetFor(start);
  const { min, path } = solve(start, target);
  if (min !== minSolution(start, target)) okSolve = false;
  if (path.length !== min) okSolve = false;
  // Reproducir el camino debe llegar al objetivo.
  let cur: Placement = { ...start };
  for (const a of path) {
    if (a.kind === "move") cur = { ...cur, [a.piece]: a.to };
    else cur = applyOp(cur, a.op);
  }
  if (!equalPlacement(cur, target)) okSolve = false;
}
check("solve(): camino válido y mínimo coincide con minSolution (40 casos)", okSolve);

console.log(`\nResultado: ${pass} pasaron, ${fail} fallaron.`);
console.log(`Dificultad media de 30 puzzles ~ ${(sumMin / 30).toFixed(2)} movimientos`);
if (fail > 0) process.exit(1);
