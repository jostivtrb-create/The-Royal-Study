import { useEffect, useMemo, useState } from "react";
import Board, { type Positions } from "./Board";
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

type Phase = "race" | "bid" | "counter" | "counterBid" | "execute" | "handoff" | "result" | "gameover";

const TOTAL_ROUNDS = 10;
const COUNTER_SECONDS = 20;
const MAX_BID = 8;
const OPS: Op[] = ["rotCW", "rotCCW", "mirrorH", "mirrorV"];

function placementToPositions(p: Placement): Positions {
  const out: Positions = {};
  for (const t of PIECE_ORDER) out[t] = rc(p[t]);
  return out;
}

export default function Duel({
  players,
  onExit,
}: {
  players: string[];
  onExit: () => void;
}) {
  const [seed] = useState(() => {
    const start = randomPlacement();
    return { start, target: randomTargetFor(start).target };
  });

  const [round, setRound] = useState(1);
  const [scores, setScores] = useState<number[]>(() => players.map(() => 0));
  const [positions, setPositions] = useState<Placement>(seed.start);
  const [target, setTarget] = useState<Placement>(seed.target);
  // Estado inicial de la ronda (para reiniciar el puzzle si el que rebate falla).
  const [roundStart, setRoundStart] = useState<{ pos: Placement; tgt: Placement }>({
    pos: seed.start,
    tgt: seed.target,
  });

  const [phase, setPhase] = useState<Phase>("race");
  const [picking, setPicking] = useState<null | "bidder" | "challenger">(null);
  const [pendingIdx, setPendingIdx] = useState<number>(0); // quien está eligiendo número
  const [low, setLow] = useState<{ idx: number; bid: number } | null>(null);
  const [firstBid, setFirstBid] = useState<{ idx: number; bid: number } | null>(null);
  const [attemptKind, setAttemptKind] = useState<"rebutter" | "original">("original");
  const [executorIdx, setExecutorIdx] = useState<number>(0);
  const [budget, setBudget] = useState<number>(0);
  const [used, setUsed] = useState<number>(0);
  const [selected, setSelected] = useState<PieceType | null>(null);
  const [secs, setSecs] = useState(COUNTER_SECONDS);
  const [solved, setSolved] = useState(false);

  const nameOf = (i: number) => players[i] ?? `Jugador ${i + 1}`;

  // Temporizador de la contra-apuesta (se pausa mientras se elige jugador).
  useEffect(() => {
    if (phase !== "counter" || picking) return;
    if (secs <= 0) {
      if (low) startExecute(low.idx, low.bid, "original"); // nadie rebatió → ejecuta el que apostó
      return;
    }
    if (secs <= 5) sfx.tick();
    if (secs <= 3) haptics.light();
    const id = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, secs, picking]);

  // Éxito/fracaso durante la ejecución.
  useEffect(() => {
    if (phase !== "execute") return;
    if (equalPlacement(positions, target)) {
      finishRound(true);
    } else if (used >= budget) {
      finishRound(false);
    }
  }, [phase, positions, target, used, budget]);

  function resetRoundVars() {
    setPicking(null);
    setLow(null);
    setFirstBid(null);
    setAttemptKind("original");
    setBudget(0);
    setUsed(0);
    setSelected(null);
    setSecs(COUNTER_SECONDS);
    setSolved(false);
  }

  function nextRound() {
    if (round >= TOTAL_ROUNDS) {
      sfx.win();
      haptics.win();
      setPhase("gameover");
      return;
    }
    sfx.tap();
    const nt = randomTargetFor(positions).target;
    setTarget(nt);
    setRoundStart({ pos: positions, tgt: nt });
    setRound((r) => r + 1);
    setPhase("race");
    resetRoundVars();
  }

  function freshGame() {
    const start = randomPlacement();
    const nt = randomTargetFor(start).target;
    setPositions(start);
    setTarget(nt);
    setRoundStart({ pos: start, tgt: nt });
    setScores(players.map(() => 0));
    setRound(1);
    setPhase("race");
    resetRoundVars();
  }

  // Botón único de "reaccionar" → abre el selector de jugador.
  function openPick(mode: "bidder" | "challenger") {
    sfx.tap();
    haptics.light();
    setPicking(mode);
  }
  function pickPlayer(idx: number) {
    sfx.bid();
    haptics.light();
    setPendingIdx(idx);
    setPicking(null);
    setPhase(phase === "race" ? "bid" : "counterBid");
  }

  function confirmBid(n: number) {
    sfx.bid();
    haptics.light();
    setFirstBid({ idx: pendingIdx, bid: n });
    setLow({ idx: pendingIdx, bid: n });
    setSecs(COUNTER_SECONDS);
    setPhase("counter");
  }
  function confirmCounter(n: number) {
    sfx.bid();
    haptics.light();
    startExecute(pendingIdx, n, "rebutter"); // un solo rebatir: el retador ejecuta
  }

  function startExecute(idx: number, b: number, kind: "rebutter" | "original") {
    setExecutorIdx(idx);
    setBudget(b);
    setUsed(0);
    setSelected(null);
    setAttemptKind(kind);
    setPhase("execute");
  }

  function finishRound(didSolve: boolean) {
    if (didSolve) {
      setSolved(true);
      sfx.success();
      haptics.success();
      setScores((s) => s.map((v, i) => (i === executorIdx ? v + 1 : v)));
      setPhase("result");
      return;
    }
    // Falló: pierde 1 punto (permite negativos).
    sfx.fail();
    haptics.fail();
    setScores((s) => s.map((v, i) => (i === executorIdx ? v - 1 : v)));
    if (attemptKind === "rebutter" && firstBid) {
      setPhase("handoff"); // se reinicia el puzzle y le toca al que apostó primero
    } else {
      setSolved(false);
      setPhase("result");
    }
  }

  // Reinicia el puzzle y pasa el turno al apostador original con su número.
  function continueHandoff() {
    if (!firstBid) return;
    sfx.tap();
    setPositions(roundStart.pos);
    setTarget(roundStart.tgt);
    startExecute(firstBid.idx, firstBid.bid, "original");
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

  const eligible = picking === "challenger" && low
    ? players.map((_, i) => i).filter((i) => i !== low.idx)
    : players.map((_, i) => i);

  const leader = scores.indexOf(Math.max(...scores));

  return (
    <div className="app screen-in">
      <div className="gamebar">
        <div className="round-chip glass">Ronda {round}<span>/{TOTAL_ROUNDS}</span></div>
      </div>

      {/* Marcador de N jugadores */}
      <div className="scoreboard">
        {players.map((name, i) => (
          <div
            key={i}
            className={
              "pscore glass" +
              (phase === "execute" && i === executorIdx ? " pscore--active" : "") +
              (low && i === low.idx && (phase === "counter" || phase === "bid") ? " pscore--lead" : "")
            }
          >
            <span className="pscore-name">{name}</span>
            <span className="pscore-pts">{scores[i]}</span>
          </div>
        ))}
      </div>

      <div className="target glass">
        <span className="target-label">Objetivo</span>
        <Board positions={placementToPositions(target)} interactive={false} scale={0.44} />
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
            <div className="panel-q">¿Quién resuelve el objetivo en menos movimientos?</div>
            <button className="big-btn" onClick={() => openPick("bidder")}>✋ ¡Lo tengo!</button>
          </>
        )}

        {phase === "bid" && (
          <>
            <div className="panel-q">{nameOf(pendingIdx)}: ¿en cuántos movimientos lo resuelves?</div>
            <div className="bid-row">
              {Array.from({ length: MAX_BID }, (_, i) => i + 1).map((n) => (
                <button key={n} className="chip" onClick={() => confirmBid(n)}>{n}</button>
              ))}
            </div>
          </>
        )}

        {phase === "counter" && low && (
          <>
            <div className="panel-q">
              {nameOf(low.idx)} apostó <strong>{low.bid}</strong>. ¿Alguien lo mejora?
            </div>
            <div className="timer">
              <div className="timer-bar" style={{ width: `${(secs / COUNTER_SECONDS) * 100}%` }} />
              <span className="timer-n">{secs}s</span>
            </div>
            <button
              className="big-btn"
              onClick={() => openPick("challenger")}
              disabled={low.bid <= 1}
            >
              ✋ ¡Yo lo mejoro!
            </button>
          </>
        )}

        {phase === "counterBid" && low && (
          <>
            <div className="panel-q">{nameOf(pendingIdx)}: mejora la apuesta (menos de {low.bid})</div>
            <div className="bid-row">
              {Array.from({ length: low.bid - 1 }, (_, i) => i + 1).map((n) => (
                <button key={n} className="chip" onClick={() => confirmCounter(n)}>{n}</button>
              ))}
            </div>
          </>
        )}

        {phase === "execute" && (
          <>
            <div className="panel-q">
              {nameOf(executorIdx)}: resuélvelo en ≤ {budget}.{" "}
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

      {/* Selector de jugador (botón único → ¿quién fue?) */}
      {picking && (
        <div className="overlay" onClick={() => setPicking(null)}>
          <div className="overlay-card glass screen-in" onClick={(e) => e.stopPropagation()}>
            <h2>¿Quién fue?</h2>
            <div className="picker-grid">
              {eligible.map((i) => (
                <button key={i} className="pick-btn" onClick={() => pickPlayer(i)}>
                  {nameOf(i)}
                </button>
              ))}
            </div>
            <button className="menu-btn" onClick={() => setPicking(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {phase === "handoff" && firstBid && (
        <div className="overlay">
          <div className="overlay-card glass screen-in">
            <div className="overlay-emoji">🔄</div>
            <h2>{nameOf(executorIdx)} falló (−1)</h2>
            <p>
              Se reinicia el puzzle. Le toca a <strong>{nameOf(firstBid.idx)}</strong>:
              resuélvelo en {firstBid.bid} movimientos.
            </p>
            <button className="bid-go" onClick={continueHandoff}>Continuar →</button>
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="overlay">
          <div className="overlay-card glass screen-in">
            {solved && <Confetti count={26} />}
            <div className="overlay-emoji">{solved ? "✨" : "💔"}</div>
            <h2>
              {solved ? `¡Punto para ${nameOf(executorIdx)}!` : `${nameOf(executorIdx)} pierde 1 punto`}
            </h2>
            <p>
              {solved
                ? `Resolvió el objetivo en ${used} de ${budget} movimientos.`
                : `No llegó a tiempo (${used}/${budget}).`}
            </p>
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
            <h2>¡Gana {nameOf(leader)}!</h2>
            <div className="final-scores">
              {players
                .map((name, i) => ({ name, pts: scores[i] }))
                .sort((a, b) => b.pts - a.pts)
                .map((p, i) => (
                  <div key={i} className="final-row">
                    <span>{i + 1}. {p.name}</span>
                    <span>{p.pts}</span>
                  </div>
                ))}
            </div>
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
