import { useEffect, useMemo, useState } from "react";
import Board, { type Positions } from "./Board";
import Confetti from "./Confetti";
import { PIECE_ORDER, type PieceType } from "../game/pieces";
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
    if (saved && saved.start && saved.target) {
      const { min, path } = solve(saved.start, saved.target);
      return {
        puzzle: { start: saved.start, target: saved.target, min, path },
        positions: saved.positions ?? saved.start,
        used: saved.used ?? 0,
      };
    }
    const pz = makePuzzle();
    return { puzzle: pz, positions: pz.start, used: 0 };
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
  const [solIdx, setSolIdx] = useState(0);

  // Persistencia.
  useEffect(() => {
    saveStars(stars);
  }, [stars]);
  useEffect(() => {
    if (phase === "solving" || phase === "reached") {
      saveSolo({ start: puzzle.start, target: puzzle.target, positions, used });
    } else {
      clearSolo();
    }
  }, [phase, positions, used, puzzle]);

  // Reproducción de la solución óptima.
  useEffect(() => {
    if (phase !== "solution") return;
    if (solIdx >= puzzle.path.length) return;
    const id = setTimeout(() => {
      const a = puzzle.path[solIdx];
      if (a.kind === "move") {
        sfx.move();
        setPositions((p) => ({ ...p, [a.piece]: a.to }));
      } else {
        sfx.spin();
        setSpin((s) => ({ tick: s.tick + 1, op: a.op }));
        setPositions((p) => applyOp(p, a.op));
      }
      setSolIdx((i) => i + 1);
    }, 800);
    return () => clearTimeout(id);
  }, [phase, solIdx, puzzle]);

  const targets = useMemo(() => {
    if (phase !== "solving" || !selected) return [] as Array<[number, number]>;
    const occ = occupiedOf(positions);
    return legalDestinations(occ, positions[selected], selected).map((s) => {
      const { row, col } = rc(s);
      return [row, col] as [number, number];
    });
  }, [phase, selected, positions]);

  function nextPuzzle() {
    sfx.tap();
    const pz = makePuzzle();
    setPuzzle(pz);
    setPositions(pz.start);
    setUsed(0);
    setPhase("solving");
    setSelected(null);
    setPerfect(false);
    setGaveUp(false);
    setSolIdx(0);
    setEnterTick((t) => t + 1);
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
      setStars((s) => s + 1);
    } else {
      sfx.fail();
      haptics.fail();
    }
    setPhase("result");
  }

  function giveUp() {
    sfx.fail();
    setPerfect(false);
    setGaveUp(true);
    setPhase("result");
  }

  function showSolution() {
    sfx.tap();
    setPositions(puzzle.start);
    setSolIdx(0);
    setSelected(null);
    setPhase("solution");
  }

  return (
    <div className="app screen-in">
      <div className="gamebar">
        <button className="exit-btn glass" onClick={onExit} aria-label="Salir">✕</button>
        <div className="round-chip glass">⭐ {stars}</div>
        <div className="round-chip glass">{used} mov</div>
      </div>

      <div className="target glass">
        <span className="target-label">Objetivo</span>
        <Board positions={placementToPositions(puzzle.target)} interactive={false} scale={0.44} />
      </div>

      <div className="board-wrap glass">
        <Board
          positions={placementToPositions(positions)}
          selected={selected}
          targets={targets}
          onTileClick={onTileClick}
          interactive={phase === "solving"}
          spinTick={spin.tick}
          spinOp={spin.op}
          spark={spark}
          enterTick={enterTick}
        />
      </div>

      <div className="panel glass">
        {phase === "solving" && (
          <>
            <div className="panel-q">Iguala el objetivo en los menos movimientos posibles</div>
            <div className="hint">{selected ? "Toca una casilla resaltada" : "Toca una pieza, o gira/voltea tu tablero"}</div>
            <div className="ops">
              {(["rotCW", "rotCCW", "mirrorH", "mirrorV"] as Op[]).map((op) => (
                <button key={op} className="op-btn" onClick={() => doOp(op)}>{opLabel(op)}</button>
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
            <div className="panel-q">Solución óptima: {puzzle.min} movimientos</div>
            <button className="bid-go" onClick={nextPuzzle}>Siguiente →</button>
          </>
        )}
      </div>

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
            {perfect && <Confetti count={34} />}
            <div className="overlay-emoji">{perfect ? "🌟" : "🔎"}</div>
            <h2>{perfect ? "¡Perfecto! +1 estrella" : "Casi…"}</h2>
            <p>
              {perfect
                ? `Lo resolviste en el mínimo (${puzzle.min}). Total: ${stars} ⭐`
                : gaveUp
                  ? `La solución óptima es de ${puzzle.min} movimientos.`
                  : `Lo hiciste en ${used}, pero se podía en ${puzzle.min}.`}
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
  return { rotCW: "⟳", rotCCW: "⟲", mirrorH: "⇄", mirrorV: "⇅" }[op];
}
