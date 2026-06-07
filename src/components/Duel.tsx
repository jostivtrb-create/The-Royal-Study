import { useEffect, useMemo, useState } from "react";
import Board, { type Positions } from "./Board";
import Piece from "./Piece";
import Confetti from "./Confetti";
import { PIECE_ORDER, type PieceType } from "../game/pieces";
import { sfx } from "../game/sfx";
import { haptics } from "../game/haptics";
import {
  applyOp,
  equalPlacement,
  legalDestinations,
  occupiedOf,
  randomPlacement,
  randomTargetFor,
  rc,
  sq,
  type Op,
  type Placement,
} from "../game/engine";

type Phase = "race" | "bid" | "counter" | "execute" | "result" | "gameover";
type Player = 1 | 2;

const TOTAL_ROUNDS = 10;
const COUNTER_SECONDS = 20;
const MAX_BID = 8;
const OPS: Op[] = ["rotCW", "rotCCW", "mirrorH", "mirrorV"];

function placementToPositions(p: Placement): Positions {
  const out: Positions = {};
  for (const t of PIECE_ORDER) out[t] = rc(p[t]);
  return out;
}

export default function Duel({ onExit }: { onExit: () => void }) {
  // Posición inicial y primer objetivo (al azar, resoluble).
  const [seed] = useState(() => {
    const start = randomPlacement();
    return { start, target: randomTargetFor(start).target };
  });

  const [round, setRound] = useState(1);
  const [scores, setScores] = useState<{ 1: number; 2: number }>({ 1: 0, 2: 0 });
  const [positions, setPositions] = useState<Placement>(seed.start);
  const [target, setTarget] = useState<Placement>(seed.target);

  const [phase, setPhase] = useState<Phase>("race");
  const [bidder, setBidder] = useState<Player>(1);
  const [bid, setBid] = useState<number>(0);
  const [executor, setExecutor] = useState<Player>(1);
  const [budget, setBudget] = useState<number>(0);
  const [used, setUsed] = useState<number>(0);
  const [selected, setSelected] = useState<PieceType | null>(null);
  const [secs, setSecs] = useState(COUNTER_SECONDS);
  const [roundWinner, setRoundWinner] = useState<Player | null>(null);

  const opponent: Player = bidder === 1 ? 2 : 1;

  // Temporizador de la contra-apuesta.
  useEffect(() => {
    if (phase !== "counter") return;
    if (secs <= 0) {
      startExecute(bidder, bid);
      return;
    }
    if (secs <= 5) sfx.tick();
    if (secs <= 3) haptics.light();
    const id = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, secs]);

  // Éxito/fracaso durante la ejecución.
  useEffect(() => {
    if (phase !== "execute") return;
    if (equalPlacement(positions, target)) {
      finishRound(executor);
    } else if (used >= budget) {
      finishRound(executor === 1 ? 2 : 1);
    }
  }, [phase, positions, target, used, budget]);

  function resetRoundVars() {
    setBid(0);
    setBudget(0);
    setUsed(0);
    setSelected(null);
    setSecs(COUNTER_SECONDS);
    setRoundWinner(null);
  }

  // Continuidad: las piezas se quedan donde terminaron; solo cambia el objetivo.
  function nextRound() {
    if (round >= TOTAL_ROUNDS) {
      sfx.win();
      haptics.win();
      setPhase("gameover");
      return;
    }
    sfx.tap();
    setTarget(randomTargetFor(positions).target);
    setRound((r) => r + 1);
    setPhase("race");
    resetRoundVars();
  }

  // Revancha: nueva partida desde cero (posición nueva al azar).
  function freshGame() {
    const start = randomPlacement();
    setPositions(start);
    setTarget(randomTargetFor(start).target);
    setScores({ 1: 0, 2: 0 });
    setRound(1);
    setPhase("race");
    resetRoundVars();
  }

  function chooseBidder(p: Player) {
    sfx.bid();
    haptics.light();
    setBidder(p);
    setPhase("bid");
  }
  function confirmBid(n: number) {
    sfx.bid();
    haptics.light();
    setBid(n);
    setSecs(COUNTER_SECONDS);
    setPhase("counter");
  }
  function startExecute(execPlayer: Player, b: number) {
    setExecutor(execPlayer);
    setBudget(b);
    setUsed(0);
    setSelected(null);
    setPhase("execute");
  }
  function counterBid(n: number) {
    sfx.bid();
    haptics.light();
    startExecute(opponent, n);
  }
  function counterPass() {
    sfx.tap();
    startExecute(bidder, bid);
  }
  function finishRound(winner: Player) {
    if (winner === executor) {
      sfx.success();
      haptics.success();
    } else {
      sfx.fail();
      haptics.fail();
    }
    setRoundWinner(winner);
    setScores((s) => ({ ...s, [winner]: s[winner] + 1 }));
    setPhase("result");
  }

  // --- Interacción del tablero (solo en ejecución) ---
  const targets = useMemo(() => {
    if (phase !== "execute" || !selected) return [] as Array<[number, number]>;
    const occ = occupiedOf(positions);
    return legalDestinations(occ, positions[selected], selected).map((s) => {
      const { row, col } = rc(s);
      return [row, col] as [number, number];
    });
  }, [phase, selected, positions]);

  function onTileClick(row: number, col: number) {
    if (phase !== "execute") return;
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
    sfx.move();
    haptics.move();
    setPositions((cur) => ({ ...cur, [selected]: clicked }));
    setUsed((u) => u + 1);
    setSelected(null);
  }
  function doOp(op: Op) {
    if (phase !== "execute") return;
    sfx.flip();
    haptics.light();
    setTarget((t) => applyOp(t, op));
    setUsed((u) => u + 1);
    setSelected(null);
  }

  return (
    <div className="app screen-in">
      <div className="topbar">
        <button className="icon-btn" onClick={onExit} aria-label="Volver">←</button>
        <div className="title topbar-title"><h1>The Royal Enchanted</h1></div>
        <div style={{ width: 40 }} />
      </div>

      <div className="hud">
        <div className={"score glass" + (executor === 1 && phase === "execute" ? " score--active" : "")}>
          <div className="who">Jugador 1</div>
          <div className="pts">{scores[1]}</div>
        </div>
        <div className="round glass">
          <div className="who">Ronda</div>
          <div className="round-n">{round}<span>/{TOTAL_ROUNDS}</span></div>
        </div>
        <div className={"score glass" + (executor === 2 && phase === "execute" ? " score--active" : "")}>
          <div className="who">Jugador 2</div>
          <div className="pts">{scores[2]}</div>
        </div>
      </div>

      <div className="target glass">
        <span className="target-label">Objetivo</span>
        <MiniBoard placement={target} />
      </div>

      <div className="board-wrap glass">
        <Board
          positions={placementToPositions(positions)}
          selected={selected}
          targets={targets}
          onTileClick={onTileClick}
        />
      </div>

      <div className="panel glass">
        {phase === "race" && (
          <>
            <div className="panel-q">¿Quién resuelve en menos movimientos? El primero en reaccionar apuesta.</div>
            <div className="race">
              <button className="race-btn" onClick={() => chooseBidder(1)}>Jugador 1 ✋</button>
              <button className="race-btn" onClick={() => chooseBidder(2)}>Jugador 2 ✋</button>
            </div>
          </>
        )}

        {phase === "bid" && (
          <>
            <div className="panel-q">Jugador {bidder}: ¿en cuántos movimientos lo resuelves?</div>
            <div className="bid-row">
              {Array.from({ length: MAX_BID }, (_, i) => i + 1).map((n) => (
                <button key={n} className="chip" onClick={() => confirmBid(n)}>{n}</button>
              ))}
            </div>
          </>
        )}

        {phase === "counter" && (
          <>
            <div className="panel-q">
              Jugador {bidder} apostó <strong>{bid}</strong>. Jugador {opponent}: ¿lo mejoras?
            </div>
            <div className="timer">
              <div className="timer-bar" style={{ width: `${(secs / COUNTER_SECONDS) * 100}%` }} />
              <span className="timer-n">{secs}s</span>
            </div>
            <div className="bid-row">
              {Array.from({ length: bid - 1 }, (_, i) => i + 1).map((n) => (
                <button key={n} className="chip" onClick={() => counterBid(n)}>{n}</button>
              ))}
              <button className="chip chip--pass" onClick={counterPass}>Paso</button>
            </div>
          </>
        )}

        {phase === "execute" && (
          <>
            <div className="panel-q">
              Jugador {executor}: resuélvelo en ≤ {budget}.{" "}
              <span className={"moves" + (used >= budget ? " moves--danger" : "")}>{used}/{budget}</span>
            </div>
            <div className="hint">{selected ? "Toca una casilla resaltada" : "Toca una pieza o transforma el objetivo"}</div>
            <div className="ops">
              {OPS.map((op) => (
                <button key={op} className="op-btn" onClick={() => doOp(op)} disabled={used >= budget}>
                  {opLabel(op)}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {phase === "result" && roundWinner != null && (
        <div className="overlay">
          <div className="overlay-card glass screen-in">
            <Confetti count={26} />
            <div className="overlay-emoji">✨</div>
            <h2>¡Punto para Jugador {roundWinner}!</h2>
            <p>
              {roundWinner === executor
                ? `Resolvió el objetivo en ${used} de ${budget} movimientos.`
                : `El ejecutor no llegó a tiempo (${used}/${budget}).`}
            </p>
            <div className="overlay-score">J1 {scores[1]} — {scores[2]} J2</div>
            <button className="bid-go" onClick={nextRound}>
              {round >= TOTAL_ROUNDS ? "Ver resultado" : "Siguiente ronda →"}
            </button>
          </div>
        </div>
      )}

      {phase === "gameover" && (
        <div className="overlay">
          <div className="overlay-card glass screen-in">
            <Confetti count={48} />
            <div className="overlay-emoji">👑</div>
            <h2>{scores[1] === scores[2] ? "¡Empate!" : `¡Gana Jugador ${scores[1] > scores[2] ? 1 : 2}!`}</h2>
            <div className="overlay-score big">J1 {scores[1]} — {scores[2]} J2</div>
            <div className="overlay-actions">
              <button className="bid-go" onClick={freshGame}>Revancha</button>
              <button className="menu-btn" onClick={onExit}>Menú</button>
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

function MiniBoard({ placement }: { placement: Placement }) {
  const grid: Array<PieceType | null> = Array(9).fill(null);
  for (const t of PIECE_ORDER) grid[placement[t]] = t;
  return (
    <div className="mini">
      {grid.map((cell, i) => {
        const r = Math.floor(i / 3), c = i % 3;
        return (
          <div key={i} className={"mini-cell" + ((r + c) % 2 ? " mini-cell--b" : "")}>
            {cell && <Piece type={cell} size={30} />}
          </div>
        );
      })}
    </div>
  );
}
