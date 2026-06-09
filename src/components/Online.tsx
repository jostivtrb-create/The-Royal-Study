import { useEffect, useMemo, useRef, useState } from "react";
import Board, { type Positions } from "./Board";
import Confetti from "./Confetti";
import OpIcon from "./OpIcon";
import FitScreen from "./FitScreen";
import { PIECE_ORDER, type PieceType } from "../game/pieces";
import { sfx } from "../game/sfx";
import { haptics } from "../game/haptics";
import {
  applyOp, equalPlacement, legalDestinations, occupiedOf, randomPlacement,
  randomTargetFor, rc, reachable, sq, type Op, type Placement,
} from "../game/engine";
import {
  backend, scoreRound, genCode, newId, usingFirebase,
  ROUND_MS, COUNTDOWN_MS, MAX_PLAYERS, type RoomState,
} from "../game/room";

const OPS: Op[] = ["rotCW", "rotCCW", "mirrorH", "mirrorV"];
function toPos(p: Placement): Positions {
  const out: Positions = {};
  for (const t of PIECE_ORDER) out[t] = rc(p[t]);
  return out;
}

export default function Online({ onBack }: { onBack: () => void }) {
  const [code, setCode] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Estado local de juego
  const [positions, setPositions] = useState<Placement>(randomPlacement());
  const [used, setUsed] = useState(0);
  const [selected, setSelected] = useState<PieceType | null>(null);
  const [spin, setSpin] = useState<{ tick: number; op: Op }>({ tick: 0, op: "rotCW" });
  const [spark, setSpark] = useState<{ row: number; col: number; tick: number } | null>(null);
  const [, setNow] = useState(0);
  const lastRound = useRef(-1);

  const isHost = !!room && room.hostId === playerId;
  const now = Date.now();

  // Suscripción a la sala
  useEffect(() => {
    if (!code) return;
    const off = backend.subscribe(code, (s) => setRoom(s));
    return off;
  }, [code]);

  // Reloj para timer/cuenta atrás
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  // Reinicia el tablero local al comenzar cada ronda (desde la solución anterior)
  useEffect(() => {
    if (room?.start && room.status === "playing" && room.round !== lastRound.current) {
      lastRound.current = room.round;
      setPositions(room.start);
      setUsed(0);
      setSelected(null);
    }
  }, [room?.round, room?.status, room?.start]);

  const myResult = room?.results?.[playerId];
  const inCountdown = !!room?.roundStartAt && now < room.roundStartAt;
  const timeLeft = room?.roundStartAt ? Math.max(0, room.roundStartAt + ROUND_MS - now) : ROUND_MS;
  const timeUp = !inCountdown && timeLeft <= 0;
  const canPlay = room?.status === "playing" && !inCountdown && !timeUp && !myResult;

  async function mutate(fn: Parameters<typeof backend.mutate>[1]) {
    if (code) await backend.mutate(code, fn);
  }
  function report(solved: boolean, moves: number) {
    mutate((s) => ({ ...s, results: { ...(s.results || {}), [playerId]: { solved, moves } } }));
  }

  // Al acabar el tiempo, reporta "no resuelto" si no había reportado
  useEffect(() => {
    if (room?.status === "playing" && timeUp && !myResult) report(false, used);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp, room?.status]);

  // HOST: cerrar ronda (todos resolvieron o se acabó el tiempo) → puntuar
  useEffect(() => {
    if (!isHost || !room || room.status !== "playing" || room.scored || inCountdown) return;
    const ids = Object.keys(room.players);
    const results = room.results || {};
    const allDone = ids.every((id) => results[id]);
    if (allDone || timeUp) {
      mutate((s) => {
        if (s.scored || s.status !== "playing") return undefined;
        return { ...s, players: scoreRound(s.players, s.results || {}), status: "results", scored: true };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, room, timeUp, inCountdown]);

  // HOST: cuando todos dan "Siguiente" → nueva ronda desde la solución anterior
  useEffect(() => {
    if (!isHost || !room || room.status !== "results") return;
    const ids = Object.keys(room.players);
    if (ids.every((id) => room.ready?.[id])) {
      mutate((s) => {
        const next = s.round + 1;
        if (next > s.totalRounds) return { ...s, status: "ended" };
        const start = s.target!;
        const { target, min } = randomTargetFor(start);
        return { ...s, round: next, start, target, min, status: "playing",
          roundStartAt: Date.now() + COUNTDOWN_MS, results: {}, ready: {}, scored: false };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, room]);

  // ---------- Acciones de sala ----------
  async function createRoom() {
    setBusy(true); setError("");
    let c = genCode();
    for (let i = 0; i < 5 && (await backend.exists(c)); i++) c = genCode();
    const id = newId();
    const nm = name.trim() || "Anfitrión";
    await backend.init(c, {
      code: c, hostId: id, status: "lobby", round: 0, totalRounds: 10,
      players: { [id]: { name: nm, score: 0, order: 0 } },
    });
    setPlayerId(id); setCode(c); setBusy(false);
  }
  async function joinRoom() {
    const c = joinCode.trim().toUpperCase();
    if (c.length < 4) { setError("Código inválido"); return; }
    setBusy(true); setError("");
    if (!(await backend.exists(c))) { setError("Sala no encontrada"); setBusy(false); return; }
    const id = newId();
    const nm = name.trim() || "Jugador";
    let ok = true, reason = "";
    await backend.mutate(c, (s) => {
      if (s.status !== "lobby") { ok = false; reason = "La partida ya empezó"; return undefined; }
      if (Object.keys(s.players).length >= MAX_PLAYERS) { ok = false; reason = "Sala llena"; return undefined; }
      const order = Object.keys(s.players).length;
      return { ...s, players: { ...s.players, [id]: { name: nm, score: 0, order } } };
    });
    if (!ok) { setError(reason); setBusy(false); return; }
    setPlayerId(id); setCode(c); setBusy(false);
  }
  function startMatch() {
    mutate((s) => {
      if (Object.keys(s.players).length < 2) return undefined;
      const start = randomPlacement();
      const { target, min } = randomTargetFor(start);
      return { ...s, round: 1, start, target, min, status: "playing",
        roundStartAt: Date.now() + COUNTDOWN_MS, results: {}, ready: {}, scored: false };
    });
  }
  function pressNext() { sfx.tap(); mutate((s) => ({ ...s, ready: { ...(s.ready || {}), [playerId]: true } })); }
  function leave() {
    if (code) backend.mutate(code, (s) => {
      const players = { ...s.players }; delete players[playerId];
      return { ...s, players };
    });
    onBack();
  }

  // ---------- Interacción del tablero ----------
  const marks = useMemo(() => {
    const empty = { free: [] as Array<[number, number]>, blocked: [] as Array<[number, number]> };
    if (!canPlay || !selected || !room?.target) return empty;
    const { free, blocked } = reachable(occupiedOf(positions), positions[selected], selected);
    const toRC = (a: number[]) => a.map((s) => { const { row, col } = rc(s); return [row, col] as [number, number]; });
    return { free: toRC(free), blocked: toRC(blocked) };
  }, [canPlay, selected, positions, room?.target]);

  const correct = useMemo(() => {
    if (!room?.target) return [] as Array<[number, number]>;
    const out: Array<[number, number]> = [];
    for (const t of PIECE_ORDER) if (positions[t] === room.target![t]) { const { row, col } = rc(positions[t]); out.push([row, col]); }
    return out;
  }, [positions, room?.target]);

  function checkSolved(np: Placement, moves: number) {
    if (room?.target && equalPlacement(np, room.target)) {
      sfx.success(); haptics.success();
      report(true, moves);
    }
  }
  function onTileClick(rw: number, cl: number) {
    if (!canPlay) return;
    const clicked = sq(rw, cl);
    const here = PIECE_ORDER.find((t) => positions[t] === clicked) ?? null;
    if (here) { sfx.tap(); haptics.light(); setSelected((c) => (c === here ? null : here)); return; }
    if (!selected) return;
    if (!legalDestinations(occupiedOf(positions), positions[selected], selected).includes(clicked)) { setSelected(null); return; }
    const np = { ...positions, [selected]: clicked };
    sfx.move(); haptics.move();
    if (room?.target?.[selected] === clicked) { setSpark({ row: rw, col: cl, tick: Date.now() }); sfx.spark(); }
    const moves = used + 1;
    setPositions(np); setUsed(moves); setSelected(null);
    checkSolved(np, moves);
  }
  function doOp(op: Op) {
    if (!canPlay) return;
    sfx.spin(); haptics.light();
    const np = applyOp(positions, op);
    const moves = used + 1;
    setSpin((s) => ({ tick: s.tick + 1, op }));
    setPositions(np); setUsed(moves); setSelected(null);
    checkSolved(np, moves);
  }

  // Puntos que sumaría/restaría un jugador esta ronda (para mostrar)
  function roundDelta(id: string): number {
    const results = room?.results || {};
    const r = results[id];
    if (!r?.solved) return -1;
    const solvers = Object.keys(room!.players).filter((p) => results[p]?.solved);
    const minMoves = Math.min(...solvers.map((p) => results[p].moves));
    return 3 + (solvers.length >= 2 && r.moves === minMoves ? 1 : 0);
  }

  // ---------- Render ----------
  if (!room) {
    // Pantalla de entrada (crear / unirse)
    return (
      <div className="app app--center screen-in">
        <button className="back-fab glass" onClick={onBack} aria-label="Volver">←</button>
        <header className="title"><h1>Online</h1><p>Juega con amigos por código</p></header>
        <div className="online-entry glass">
          <input className="name-input" placeholder="Tu nombre" value={name} maxLength={14} onChange={(e) => setName(e.target.value)} />
          <button className="bid-go" disabled={busy} onClick={createRoom}>✦ Crear sala</button>
          <div className="online-or">o</div>
          <div className="join-row">
            <input className="name-input code-input" placeholder="CÓDIGO" value={joinCode} maxLength={4}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())} />
            <button className="race-btn" disabled={busy} onClick={joinRoom}>Unirse</button>
          </div>
          {error && <div className="online-err">{error}</div>}
          {!usingFirebase && <div className="online-note">Modo prueba: abre 2 pestañas para jugar (Firebase no configurado).</div>}
        </div>
      </div>
    );
  }

  const players = Object.values(room.players).sort((a, b) => a.order - b.order);
  const playerIds = Object.keys(room.players).sort((a, b) => room.players[a].order - room.players[b].order);

  // LOBBY (sala de espera)
  if (room.status === "lobby") {
    return (
      <div className="app app--center screen-in">
        <button className="back-fab glass" onClick={leave} aria-label="Salir">←</button>
        <header className="title"><h1>Sala</h1></header>
        <div className="code-box glass"><span>Código</span><b>{room.code}</b></div>
        <div className="lobby-players glass">
          {players.map((p, i) => (
            <div key={i} className="lobby-player">
              {room.hostId === playerIds[i] ? "👑 " : "👤 "}{p.name}
            </div>
          ))}
          {Array.from({ length: MAX_PLAYERS - players.length }).map((_, i) => (
            <div key={`e${i}`} className="lobby-player lobby-player--empty">esperando…</div>
          ))}
        </div>
        {isHost ? (
          <button className="bid-go" disabled={players.length < 2} onClick={startMatch}>
            {players.length < 2 ? "Esperando jugadores…" : "Empezar ✦"}
          </button>
        ) : (
          <div className="online-note">Esperando a que el anfitrión empiece…</div>
        )}
      </div>
    );
  }

  // ENDED (resultados finales)
  if (room.status === "ended") {
    const ranked = [...playerIds].sort((a, b) => room.players[b].score - room.players[a].score);
    return (
      <div className="app app--center screen-in">
        <div className="overlay-card glass screen-in" style={{ position: "relative" }}>
          <Confetti count={48} />
          <div className="overlay-emoji">👑</div>
          <h2>¡Gana {room.players[ranked[0]].name}!</h2>
          <div className="final-scores">
            {ranked.map((id, i) => (
              <div key={id} className="final-row"><span>{i + 1}. {room.players[id].name}</span><span>{room.players[id].score}</span></div>
            ))}
          </div>
          <button className="bid-go" onClick={leave}>Salir</button>
        </div>
      </div>
    );
  }

  // PLAYING / RESULTS
  const myDelta = myResult ? roundDelta(playerId) : 0;
  const iSolved = !!myResult?.solved;
  const solvers = playerIds.filter((id) => room.results?.[id]?.solved);
  const minMoves = solvers.length ? Math.min(...solvers.map((id) => room.results![id].moves)) : 0;
  const iWasFastest = iSolved && solvers.length >= 2 && (myResult?.moves ?? 0) === minMoves;

  return (
    <div className="app app--fit screen-in">
      <FitScreen>
        <div className="gscene gscene--duel">
          <div className="gamebar">
            <button className="exit-btn glass" onClick={leave} aria-label="Salir">✕</button>
            <div className="round-chip glass">Ronda {room.round}<span>/{room.totalRounds}</span></div>
            <div className={"movebadge glass" + (timeUp ? " movebadge--danger" : "")}>
              <span className="mb-cap">{inCountdown ? "LISTOS" : "TIEMPO"}</span>
              <span className="mb-num">{inCountdown ? Math.ceil((room.roundStartAt! - now) / 1000) : Math.ceil(timeLeft / 1000)}</span>
            </div>
          </div>

          <div className="scoreboard">
            {playerIds.map((id) => (
              <div key={id} className={"pscore glass" + (id === playerId ? " pscore--lead" : "")}>
                <span className="pscore-name">
                  {room.status === "playing" && room.results?.[id]?.solved ? "✓ " : ""}{room.players[id].name}
                </span>
                <span className="pscore-pts">{room.players[id].score}</span>
              </div>
            ))}
          </div>

          <div className="target glass">
            <span className="target-label">Objetivo</span>
            <Board positions={toPos(room.target!)} interactive={false} scale={0.44} />
          </div>

          <div className="board-wrap glass">
            <Board
              positions={toPos(positions)}
              selected={selected}
              targets={marks.free}
              blocked={marks.blocked}
              correct={correct}
              onTileClick={onTileClick}
              interactive={canPlay}
              spinTick={spin.tick}
              spinOp={spin.op}
              spark={spark}
            />
          </div>

          <div className="controls">
            <div className="movebadge glass" style={{ minWidth: 0 }}>
              <span className="mb-cap">TUS MOV</span><span key={used} className="mb-num">{used}</span>
            </div>
            <div className="ops">
              {OPS.map((op) => (
                <button key={op} className="op-btn" onClick={() => doOp(op)} disabled={!canPlay}><OpIcon op={op} /></button>
              ))}
            </div>
          </div>
        </div>
      </FitScreen>

      {/* Cuenta atrás 3·2·1 */}
      {inCountdown && (
        <div className="overlay overlay--solid">
          <div className="countdown">{Math.ceil((room.roundStartAt! - now) / 1000)}</div>
        </div>
      )}

      {/* Esperando a los demás (ya terminé pero la ronda sigue) */}
      {room.status === "playing" && myResult && (
        <div className="overlay">
          <div className="overlay-card glass">
            <div className="overlay-emoji">{iSolved ? "✨" : "⏳"}</div>
            <h2>{iSolved ? `¡Resuelto en ${myResult.moves}!` : "¡Se acabó tu tiempo!"}</h2>
            <p>Esperando a los demás…</p>
          </div>
        </div>
      )}

      {/* Resultados de la ronda */}
      {room.status === "results" && (
        <div className="overlay">
          <div className="overlay-card glass screen-in" style={{ position: "relative" }}>
            {iSolved && <Confetti count={26} />}
            <div className="overlay-emoji">{iSolved ? (iWasFastest ? "🏆" : "✨") : "💔"}</div>
            <h2>
              {!iSolved ? `Fallaste · −1 ⭐` : iWasFastest ? `¡El más rápido! +${myDelta}` : `¡Resuelto! +${myDelta}`}
            </h2>
            <div className="final-scores">
              {playerIds.map((id) => {
                const r = room.results?.[id];
                return (
                  <div key={id} className="final-row">
                    <span>{room.players[id].name} {r?.solved ? `· ${r.moves} mov` : "· no resolvió"}</span>
                    <span>{roundDelta(id) >= 0 ? `+${roundDelta(id)}` : roundDelta(id)}</span>
                  </div>
                );
              })}
            </div>
            {room.ready?.[playerId] ? (
              <div className="online-note">Esperando a tu compañero…</div>
            ) : (
              <button className="bid-go" onClick={pressNext}>Siguiente →</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
