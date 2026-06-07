import { useState } from "react";
import Board, { type BoardState } from "./components/Board";
import Piece from "./components/Piece";
import { PIECE_ORDER, PIECE_NAME_ES } from "./game/pieces";

const START: BoardState = [
  ["R", null, "B"],
  [null, "Q", null],
  ["N", null, "K"],
];

const TARGET: BoardState = [
  [null, "K", null],
  ["B", "Q", "R"],
  [null, "N", null],
];

// Modo galería para revisar piezas (dev). En la app real va en false.
const GALLERY = false;

export default function App() {
  const [board] = useState<BoardState>(START);

  if (GALLERY) {
    return (
      <div className="app">
        <header className="title">
          <h1>The Royal Enchanted</h1>
          <p>Zoom caballo (revisión)</p>
        </header>
        <div className="glass" style={{ padding: 18, display: "flex", justifyContent: "center" }}>
          <Piece type="N" size={200} />
        </div>
        <div style={{ padding: 18, borderRadius: 22, background: "#2c1b54", display: "flex", justifyContent: "center" }}>
          <Piece type="N" size={200} />
        </div>
        <div className="glass" style={{ padding: 18, display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
          {PIECE_ORDER.map((t) => (
            <div key={t} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 92 }}>
              <Piece type={t} size={86} />
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{PIECE_NAME_ES[t]}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: 18, borderRadius: 22, background: "#2c1b54", display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
          {PIECE_ORDER.map((t) => (
            <div key={t} style={{ width: 92, display: "flex", justifyContent: "center" }}>
              <Piece type={t} size={86} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="title">
        <h1>The Royal Enchanted</h1>
        <p>Puzzle de ajedrez místico</p>
      </header>

      {/* Marcador */}
      <div className="hud">
        <div className="score glass">
          <div className="who">Jugador 1</div>
          <div className="pts">2</div>
        </div>
        <div className="round glass">
          <div className="who">Ronda</div>
          <div className="round-n">3<span>/10</span></div>
        </div>
        <div className="score glass">
          <div className="who">Jugador 2</div>
          <div className="pts">1</div>
        </div>
      </div>

      {/* Objetivo (mini tablero meta) */}
      <div className="target glass">
        <span className="target-label">Objetivo</span>
        <MiniBoard board={TARGET} />
      </div>

      {/* Tablero principal */}
      <div className="board-wrap glass">
        <Board board={board} />
      </div>

      {/* Barra de apuesta */}
      <div className="bid glass">
        <div className="bid-q">¿En cuántos movimientos lo resuelves?</div>
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

/** Mini tablero (vista cenital) para mostrar el objetivo de forma compacta. */
function MiniBoard({ board }: { board: BoardState }) {
  return (
    <div className="mini">
      {board.map((row, r) =>
        row.map((cell, c) => (
          <div key={`${r}-${c}`} className={"mini-cell" + ((r + c) % 2 ? " mini-cell--b" : "")}>
            {cell && <Piece type={cell} size={30} />}
          </div>
        )),
      )}
    </div>
  );
}
