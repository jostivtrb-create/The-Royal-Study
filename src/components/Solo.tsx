import { useEffect, useMemo, useState } from "react";
import Board, { type Positions } from "./Board";
import Confetti from "./Confetti";
import OpIcon from "./OpIcon";
import FitScreen from "./FitScreen";
import { PIECE_ORDER, PIECE_NAME_ES, type PieceType } from "../game/pieces";
import { sfx } from "../game/sfx";
import { haptics } from "../game/haptics";
import { loadStars, saveStars, loadSolo, saveSolo, clearSolo } from "../game/persist";
import {
  applyOp,
  equalPlacement,
  legalDestinations,
  occupiedOf,
  randomPlacement,
  randomTargetFor,
  rc,
  reachable,
  solve,
  sq,
  type Action,
  type Op,
  type Placement,
} from "../game/engine";

type Phase = "solving" | "reached" | "result" | "solution";

function placementToPositions(p: Placement): Positions {
  const out: Positions = {};
  for (const t of PIECE_ORDER) out[t] = rc(p[t]);
  return out;
}

function makePuzzle(): { start: Placement; target: Placement; min: number; path: Action[] } {
  const start = randomPlacement();
  const { target } = randomTargetFor(start);
  const { min, path } = solve(start, target);
  return { start, target, min, path };
}

export default function Solo({ onExit }: { onExit: () => void }) {
  const init = useMemo(() => {
    const saved = loadSolo();
    // Descarta guardados con el caballo atascado en el centro (bug antiguo).
    if (saved && saved.start && saved.target && saved.start.N !== 4 && saved.target.N !== 4) {
      const { min, path } = solve(saved.start, saved.target);
      return {
        puzzle: { start: saved.start, target: saved.target, min, path },
        positions: saved.positions ?? saved.start,
        used: saved.used ?? 0,
        revealed: saved.revealed ?? false,
      };
    }
    const pz = makePuzzle();
    return { puzzle: pz, positions: pz.start, used: 0, revealed: false };
  }, []);

  const [stars, setStars] = useState<number>(() => loadStars());
  const [puzzle, setPuzzle] = useState(init.puzzle);
  const [positions, setPositions] = useState<Placement>(init.positions);
  const [used, setUsed] = useState<number>(init.used);
  const [phase, setPhase] = useState<Phase>(
    equalPlacement(init.positions, init.puzzle.target) ? "reached" : "solving",
  );
  const [selected, setSelected] = useState<PieceType | null>(null);
  const [spin, setSpin] = useState<{ tick: number; op: Op }>({ tick: 0, op: "rotCW" });
  const [spark, setSpark] = useState<{ row: number; col: number; tick: number } | null>(null);
  const [enterTick, setEnterTick] = useState(0);
  const [perfect, setPerfect] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const [revealed, setRevealed] = useState<boolean>(init.revealed);
  const [puzzleId, setPuzzleId] = useState(0); // para animar la transición de puzzle
  // Solución paso a paso.
  const [solStates, setSolStates] = useState<Placement[]>([]);
  const [solStep, setSolStep] = useState(0);

  // Persistencia.
  useEffect(() => {
    saveStars(stars);
  }, [stars]);
  useEffect(() => {
    if (phase === "solving" || phase === "reached") {
      saveSolo({ start: puzzle.start, target: puzzle.target, positions, used, revealed });
    } else {
      clearSolo();
    }
  }, [phase, positions, used, puzzle, revealed]);

  const correct = useMemo(() => {
    const out: Array<[number, number]> = [];
    for (const t of PIECE_ORDER)
      if (positions[t] === puzzle.target[t]) { const { row, col } = rc(positions[t]); out.push([row, col]); }
    return out;
  }, [positions, puzzle]);

  const marks = useMemo(() => {
    const empty = { free: [] as Array<[number, number]>, blocked: [] as Array<[number, number]> };
    if (phase !== "solving" || !selected) return empty;
    const { free, blocked } = reachable(occupiedOf(positions), positions[selected], selected);
    const toRC = (arr: number[]) =>
      arr.map((s) => { const { row, col } = rc(s); return [row, col] as [number, number]; });
    return { free: toRC(free), blocked: toRC(blocked) };
  }, [phase, selected, positions]);

  function nextPuzzle() {
    sfx.tap();
    // Continuidad: las piezas se quedan donde están; solo cambia el objetivo.
    const start = positions;
    const { target } = randomTargetFor(start);
    const { min, path } = solve(start, target);
    setPuzzle({ start, target, min, path });
    setPositions(start);
    setUsed(0);
    setPhase("solving");
    setSelected(null);
    setPerfect(false);
    setGaveUp(false);
    setRevealed(false);
    setSolStep(0);
    setEnterTick((t) => t + 1);
    setPuzzleId((p) => p + 1);
  }

  function retry() {
    sfx.tap();
    setPositions(puzzle.start);
    setUsed(0);
    setPhase("solving");
    setSelected(null);
    setEnterTick((t) => t + 1);
  }

  function reachedCheck(np: Placement) {
    if (equalPlacement(np, puzzle.target)) {
      sfx.success();
      haptics.success();
      setPhase("reached");
    }
  }

  function onTileClick(row: number, col: number) {
    if (phase !== "solving") return;
    const clicked = sq(row, col);
    const pieceHere = PIECE_ORDER.find((t) => positions[t] === clicked) ?? null;
    if (pieceHere) {
      sfx.tap();
      haptics.light();
      setSelected((cur) => (cur === pieceHere ? null : pieceHere));
      return;
    }
    if (!selected) return;
    const occ = occupiedOf(positions);
    if (!legalDestinations(occ, positions[selected], selected).includes(clicked)) {
      setSelected(null);
      return;
    }
    const np = { ...positions, [selected]: clicked };
    sfx.move();
    haptics.move();
    if (puzzle.target[selected] === clicked) {
      setSpark({ row, col, tick: Date.now() });
      sfx.spark();
    }
    setPositions(np);
    setUsed((u) => u + 1);
    setSelected(null);
    reachedCheck(np);
  }

  function doOp(op: Op) {
    if (phase !== "solving") return;
    sfx.spin();
    haptics.light();
    const np = applyOp(positions, op);
    setSpin((s) => ({ tick: s.tick + 1, op }));
    setPositions(np);
    setUsed((u) => u + 1);
    setSelected(null);
    reachedCheck(np);
  }

  function confirmSolution() {
    const isPerfect = used === puzzle.min;
    setPerfect(isPerfect);
    setGaveUp(false);
    if (isPerfect) {
      sfx.win();
      haptics.win();
      setStars((s) => s + (revealed ? 2 : 3)); // ganar: +3, o +2 si canjeaste el mínimo
    } else {
      sfx.fail();
      haptics.fail();
      setStars((s) => Math.max(0, s - 1)); // no óptimo: −1 (el canje ya restó aparte)
    }
    setPhase("result");
  }

  function giveUp() {
    sfx.fail();
    haptics.fail();
    setPerfect(false);
    setGaveUp(true);
    setStars((s) => Math.max(0, s - 1)); // rendirse: −1 (el canje ya restó aparte)
    setPhase("result");
  }

  // Canjear el mínimo: lo revela y cuesta 1 estrella al instante (independiente).
  function revealMin() {
    if (revealed || phase !== "solving") return;
    sfx.tap();
    haptics.light();
    setRevealed(true);
    setStars((s) => Math.max(0, s - 1));
  }

  function showSolution() {
    sfx.tap();
    // Construye los estados del camino óptimo para recorrerlos paso a paso.
    const states: Placement[] = [puzzle.start];
    let cur: Placement = puzzle.start;
    for (const a of puzzle.path) {
      cur = a.kind === "move" ? { ...cur, [a.piece]: a.to } : applyOp(cur, a.op);
      states.push(cur);
    }
    setSolStates(states);
    setSolStep(0);
    setPositions(puzzle.start);
    setSelected(null);
    setPhase("solution");
  }

  function solGo(to: number) {
    const t = Math.max(0, Math.min(puzzle.min, to));
    if (t === solStep || !solStates[t]) return;
    const action = puzzle.path[Math.max(solStep, t) - 1];
    if (action && action.kind === "op") {
      sfx.spin();
      setSpin((s) => ({ tick: s.tick + 1, op: action.op }));
    } else {
      sfx.move();
    }
    haptics.light();
    setPositions(solStates[t]);
    setSolStep(t);
  }

  function solStepLabel() {
    if (solStep === 0) return "Posición inicial";
    const a = puzzle.path[solStep - 1];
    return a.kind === "move"
      ? `Mover ${PIECE_NAME_ES[a.piece]}`
      : opLabel(a.op);
  }

  return (
    <div className="app app--fit screen-in">
      <FitScreen>
      <div className="gscene">
      <div className="gamebar">
        <button className="exit-btn glass" onClick={onExit} aria-label="Salir">✕</button>
        <div className="stars-chip glass">⭐ <b>{stars}</b></div>
        <div className="movebadge glass">
          <span className="mb-cap">MOV</span>
          <span key={used} className="mb-num">{used}</span>
        </div>
      </div>

      <div className="target glass card-in" key={puzzleId}>
        <span className="target-label">Objetivo</span>
        <Board positions={placementToPositions(puzzle.target)} interactive={false} scale={0.44} />
      </div>

      <div className="board-wrap glass">
        <Board
          positions={placementToPositions(positions)}
          selected={selected}
          targets={marks.free}
          blocked={marks.blocked}
          correct={correct}
          onTileClick={onTileClick}
          interactive={phase === "solving"}
          spinTick={spin.tick}
          spinOp={spin.op}
          spark={spark}
          enterTick={enterTick}
        />
      </div>

      <div className="controls">
        {phase === "solving" && (
          <>
            {revealed ? (
              <div className="min-tag">Mínimo posible: <b>{puzzle.min}</b></div>
            ) : (
              <button className="reveal-btn" onClick={revealMin}>🔓 Ver el mínimo · cuesta 1 ⭐</button>
            )}
            <div className="ops">
              {(["rotCW", "rotCCW", "mirrorH", "mirrorV"] as Op[]).map((op) => (
                <button key={op} className="op-btn" onClick={() => doOp(op)}><OpIcon op={op} /></button>
              ))}
            </div>
            <div className="race">
              <button className="race-btn" onClick={retry}>↺ Reintentar</button>
              <button className="race-btn race-btn--soft" onClick={giveUp}>Rendirse</button>
            </div>
          </>
        )}
        {phase === "solution" && (
          <>
            <div className="panel-q">Solución óptima · Paso {solStep}/{puzzle.min}</div>
            <div className="hint">{solStepLabel()}</div>
            <div className="race">
              <button className="race-btn race-btn--soft" onClick={() => solGo(solStep - 1)} disabled={solStep === 0}>← Anterior</button>
              <button className="race-btn" onClick={() => solGo(solStep + 1)} disabled={solStep >= puzzle.min}>Siguiente paso →</button>
            </div>
            <button className="bid-go" onClick={nextPuzzle}>Siguiente puzzle →</button>
          </>
        )}
      </div>
      </div>
      </FitScreen>

      {phase === "reached" && (
        <div className="overlay overlay--solid">
          <div className="overlay-card glass screen-in">
            <div className="overlay-emoji">🧩</div>
            <h2>¡Resuelto en {used}!</h2>
            <p>¿Te quedas con esta solución o la intentas en menos movimientos?</p>
            <div className="overlay-actions">
              <button className="bid-go" onClick={confirmSolution}>Confirmar</button>
              <button className="menu-btn" onClick={retry}>↺ Reintentar</button>
            </div>
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="overlay">
          <div className="overlay-card glass screen-in">
            {perfect && <Confetti count={40} />}
            <div className="overlay-emoji">{perfect ? "🌟" : "💔"}</div>
            <h2>{perfect ? `¡Perfecto! +${revealed ? 2 : 3} ⭐` : "−1 ⭐"}</h2>
            <p>
              {perfect
                ? `Lo resolviste en el mínimo (${puzzle.min}). Tienes ${stars} ⭐`
                : gaveUp
                  ? `Te rendiste. La solución óptima es de ${puzzle.min}.`
                  : `Lo hiciste en ${used}, se podía en ${puzzle.min}.`}
            </p>
            <div className="overlay-actions">
              {!perfect && <button className="bid-go" onClick={showSolution}>Ver solución</button>}
              <button className={perfect ? "bid-go" : "menu-btn"} onClick={nextPuzzle}>Siguiente →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function opLabel(op: Op) {
  return { rotCW: "Girar ⟳", rotCCW: "Girar ⟲", mirrorH: "Espejo ↘", mirrorV: "Espejo ↗" }[op];
}
