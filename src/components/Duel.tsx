import { useEffect, useMemo, useState } from "react";
import Board, { type Positions } from "./Board";
import Confetti from "./Confetti";
import { PIECE_ORDER, type PieceType } from "../game/pieces";
import { sfx } from "../game/sfx";
import { haptics } from "../game/haptics";
import { loadGame, saveGame } from "../game/persist";
import {
  applyOp,
  equalPlacement,
  legalDestinations,
  occupiedOf,
  randomPlacement,
  randomTargetFor,
  rc,
  reachable,
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
  // Estado inicial: partida guardada (si existe y coincide) o una nueva.
  const init = useMemo(() => {
    const g = loadGame();
    if (g && Array.isArray(g.scores) && g.scores.length === players.length) return g;
    const start = randomPlacement();
    const target = randomTargetFor(start).target;
    return {
      round: 1,
      scores: players.map(() => 0),
      positions: start,
      target,
      roundStart: { pos: start, tgt: target },
      phase: "race",
      picking: null,
      pendingIdx: 0,
      low: null,
      firstBid: null,
      attemptKind: "original",
      executorIdx: 0,
      budget: 0,
      used: 0,
      selected: null,
      secs: COUNTER_SECONDS,
      solved: false,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [round, setRound] = useState<number>(init.round);
  const [scores, setScores] = useState<number[]>(init.scores);
  const [positions, setPositions] = useState<Placement>(init.positions);
  const [target, setTarget] = useState<Placement>(init.target);
  const [roundStart, setRoundStart] = useState<{ pos: Placement; tgt: Placement }>(init.roundStart);

  const [phase, setPhase] = useState<Phase>(init.phase);
  const [picking, setPicking] = useState<null | "bidder" | "challenger">(init.picking);
  const [pendingIdx, setPendingIdx] = useState<number>(init.pendingIdx);
  const [low, setLow] = useState<{ idx: number; bid: number } | null>(init.low);
  const [firstBid, setFirstBid] = useState<{ idx: number; bid: number } | null>(init.firstBid);
  const [attemptKind, setAttemptKind] = useState<"rebutter" | "original">(init.attemptKind);
  const [executorIdx, setExecutorIdx] = useState<number>(init.executorIdx);
  const [budget, setBudget] = useState<number>(init.budget);
  const [used, setUsed] = useState<number>(init.used);
  const [selected, setSelected] = useState<PieceType | null>(init.selected);
  const [secs, setSecs] = useState<number>(init.secs);
  const [solved, setSolved] = useState<boolean>(init.solved);
  const [confirmExit, setConfirmExit] = useState(false);
  const [spin, setSpin] = useState<{ tick: number; op: Op }>({ tick: 0, op: "rotCW" });
  const [spark, setSpark] = useState<{ row: number; col: number; tick: number } | null>(null);
  const [enterTick, setEnterTick] = useState(0);

  const nameOf = (i: number) => players[i] ?? `Jugador ${i + 1}`;

  // Guarda la partida en cada cambio (resiste recargas).
  useEffect(() => {
    saveGame({
      round, scores, positions, target, roundStart, phase, picking, pendingIdx,
      low, firstBid, attemptKind, executorIdx, budget, used, selected, secs, solved,
    });
  }, [round, scores, positions, target, roundStart, phase, picking, pendingIdx,
      low, firstBid, attemptKind, executorIdx, budget, used, selected, secs, solved]);

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
    setEnterTick((t) => t + 1); // anima la entrada del tablero
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
    setEnterTick((t) => t + 1);
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
  const marks = useMemo(() => {
    const empty = { free: [] as Array<[number, number]>, blocked: [] as Array<[number, number]> };
    if (phase !== "execute" || !selected) return empty;
    const { free, blocked } = reachable(occupiedOf(positions), positions[selected], selected);
    const toRC = (arr: number[]) =>
      arr.map((s) => { const { row, col } = rc(s); return [row, col] as [number, number]; });
    return { free: toRC(free), blocked: toRC(blocked) };
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
    if (target[selected] === clicked) {
      // la pieza llegó a su casilla correcta → destello
      const { row, col } = rc(clicked);
      setSpark({ row, col, tick: Date.now() });
      sfx.spark();
    }
  }
  function doOp(op: Op) {
    if (phase !== "execute") return;
    sfx.spin();
    haptics.light();
    setSpin((s) => ({ tick: s.tick + 1, op })); // dispara la animación de giro
    setPositions((p) => applyOp(p, op)); // gira TODO tu tablero como una unidad
    setUsed((u) => u + 1);
    setSelected(null);
  }

  const eligible = picking === "challenger" && low
    ? players.map((_, i) => i).filter((i) => i !== low.idx)
    : players.map((_, i) => i);

  const maxScore = Math.max(...scores);
  const leader = scores.indexOf(maxScore);

  return (
    <div className="app screen-in">
      <div className="gamebar">
        <button className="exit-btn glass" onClick={() => setConfirmExit(true)} aria-label="Salir de la partida">✕</button>
        <div className="round-chip glass">Ronda {round}<span>/{TOTAL_ROUNDS}</span></div>
        <span style={{ width: 36 }} />
      </div>

      {/* Marcador de N jugadores */}
      <div className="scoreboard">
        {players.map((name, i) => {
          const isLeader = scores[i] === maxScore && maxScore > 0;
          return (
            <div
              key={i}
              className={
                "pscore glass" +
                (phase === "execute" && i === executorIdx ? " pscore--active" : "") +
                (low && i === low.idx && (phase === "counter" || phase === "bid") ? " pscore--lead" : "")
              }
            >
              <span className="pscore-name">{isLeader && <span className="crown">👑</span>}{name}</span>
              <span className="pscore-pts">{scores[i]}</span>
            </div>
          );
        })}
      </div>

      <div className="target glass">
        <span className="target-label">Objetivo</span>
        <Board positions={placementToPositions(target)} interactive={false} scale={0.44} />
      </div>

      <div className="board-wrap glass">
        <Board
          positions={placementToPositions(positions)}
          selected={selected}
          targets={marks.free}
          blocked={marks.blocked}
          onTileClick={onTileClick}
          spinTick={spin.tick}
          spinOp={spin.op}
          spark={spark}
          enterTick={enterTick}
        />
      </div>

      <div className="panel glass">
        {phase === "race" && (
          <>
            <div className="panel-q">¿Quién resuelve el objetivo en menos movimientos?</div>
            <button className="big-btn" onClick={() => openPick("bidder")}>✋ ¡Lo tengo!</button>
          </>
        )}

        {phase === "counter" && low && (
          <>
            <div className="panel-q">
              {nameOf(low.idx)} apostó <strong>{low.bid}</strong>. ¿Alguien lo mejora?
            </div>
            <div className={"timer" + (secs <= 5 ? " timer--low" : "")}>
              <div className={"timer-bar" + (secs <= 5 ? " timer-bar--low" : "")} style={{ width: `${(secs / COUNTER_SECONDS) * 100}%` }} />
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

        {phase === "execute" && (
          <>
            <div className="panel-q">
              {nameOf(executorIdx)}: resuélvelo en ≤ {budget}.{" "}
              <span className={"moves" + (used >= budget ? " moves--danger" : "")}>{used}/{budget}</span>
            </div>
            <div className="hint">{selected ? "Toca una casilla resaltada" : "Toca una pieza, o gira/voltea tu tablero"}</div>
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

      {/* Selección de número (tapa el tablero para no estudiarlo mientras se decide) */}
      {(phase === "bid" || phase === "counterBid") && (
        <div className="overlay overlay--solid">
          <div className="overlay-card glass screen-in">
            <div className="overlay-emoji">🎯</div>
            <h2>{nameOf(pendingIdx)}</h2>
            <p>
              {phase === "bid"
                ? "¿En cuántos movimientos lo resuelves?"
                : `Mejora la apuesta: menos de ${low?.bid ?? 0}`}
            </p>
            <div className="bid-row">
              {(phase === "bid"
                ? Array.from({ length: MAX_BID }, (_, i) => i + 1)
                : Array.from({ length: (low?.bid ?? 1) - 1 }, (_, i) => i + 1)
              ).map((n) => (
                <button
                  key={n}
                  className="chip"
                  onClick={() => (phase === "bid" ? confirmBid(n) : confirmCounter(n))}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirmar salida de la partida */}
      {confirmExit && (
        <div className="overlay" onClick={() => setConfirmExit(false)}>
          <div className="overlay-card glass screen-in" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-emoji">🚪</div>
            <h2>¿Salir de la partida?</h2>
            <p>Se perderá el progreso de esta partida.</p>
            <div className="overlay-actions">
              <button className="bid-go" onClick={() => { setConfirmExit(false); onExit(); }}>Salir</button>
              <button className="menu-btn" onClick={() => setConfirmExit(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Selector de jugador (botón único → ¿quién fue?) */}
      {picking && (
        <div className="overlay overlay--solid" onClick={() => setPicking(null)}>
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
