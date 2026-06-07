import { useState } from "react";
import Board, { type Positions } from "./components/Board";
import Home from "./components/Home";
import Piece from "./components/Piece";
import type { PieceType } from "./game/pieces";

type Screen = "home" | "game";

const START: Positions = {
  R: { row: 0, col: 0 },
  B: { row: 0, col: 2 },
  Q: { row: 1, col: 1 },
  N: { row: 2, col: 0 },
  K: { row: 2, col: 2 },
};

// Objetivo de muestra (vista compacta, todavía sin lógica real).
const TARGET: Array<[PieceType, number, number]> = [
  ["K", 0, 1],
  ["B", 1, 0],
  ["Q", 1, 1],
  ["R", 1, 2],
  ["N", 2, 1],
];

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");

  if (screen === "home") {
    return <Home onPlayLocal={() => setScreen("game")} />;
  }
  return <Game onExit={() => setScreen("home")} />;
}

function Game({ onExit }: { onExit: () => void }) {
  const [positions, setPositions] = useState<Positions>(START);
  const [selected, setSelected] = useState<PieceType | null>(null);

  // En esta fase de pulido aún no hay reglas: los destinos válidos son las
  // casillas vacías. El motor de ajedrez llega en la siguiente fase.
  const occupied = new Set(
    Object.values(positions).map((p) => `${p!.row},${p!.col}`),
  );
  const targets: Array<[number, number]> = [];
  if (selected) {
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        if (!occupied.has(`${r},${c}`)) targets.push([r, c]);
  }

  const onPieceClick = (t: PieceType) =>
    setSelected((cur) => (cur === t ? null : t));

  const onTileClick = (row: number, col: number) => {
    if (!selected) return;
    if (occupied.has(`${row},${col}`)) return;
    setPositions((cur) => ({ ...cur, [selected]: { row, col } }));
    setSelected(null);
  };

  return (
    <div className="app screen-in">
      <div className="topbar">
        <button className="icon-btn" onClick={onExit} aria-label="Volver">
          ←
        </button>
        <div className="title topbar-title">
          <h1>The Royal Enchanted</h1>
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div className="hud">
        <div className="score glass">
          <div className="who">Jugador 1</div>
          <div className="pts">2</div>
        </div>
        <div className="round glass">
          <div className="who">Ronda</div>
          <div className="round-n">
            3<span>/10</span>
          </div>
        </div>
        <div className="score glass">
          <div className="who">Jugador 2</div>
          <div className="pts">1</div>
        </div>
      </div>

      <div className="target glass">
        <span className="target-label">Objetivo</span>
        <div className="mini">
          {Array.from({ length: 9 }).map((_, i) => {
            const r = Math.floor(i / 3);
            const c = i % 3;
            const cell = TARGET.find(([, tr, tc]) => tr === r && tc === c);
            return (
              <div key={i} className={"mini-cell" + ((r + c) % 2 ? " mini-cell--b" : "")}>
                {cell && <Piece type={cell[0]} size={30} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="board-wrap glass">
        <Board
          positions={positions}
          selected={selected}
          targets={targets}
          onPieceClick={onPieceClick}
          onTileClick={onTileClick}
        />
      </div>

      <div className="bid glass">
        <div className="bid-q">
          {selected
            ? "Toca una casilla resaltada para mover"
            : "Toca una pieza para seleccionarla"}
        </div>
        <div className="bid-row">
          {[2, 3, 4, 5, 6].map((n) => (
            <button key={n} className={"chip" + (n === 4 ? " chip--on" : "")}>
              {n}
            </button>
          ))}
        </div>
        <button className="bid-go">Apostar ✦</button>
      </div>
    </div>
  );
}
