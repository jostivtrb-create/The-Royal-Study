import { useState } from "react";
import Board, { type BoardState } from "./components/Board";
import Piece from "./components/Piece";
import { PIECE_ORDER, PIECE_NAME_ES } from "./game/pieces";

// Disposición de muestra para el prototipo visual (las 5 piezas en el 3x3).
const SAMPLE: BoardState = [
  ["R", null, "B"],
  [null, "Q", null],
  ["N", null, "K"],
];

export default function App() {
  const [board] = useState<BoardState>(SAMPLE);

  return (
    <div className="app">
      <header className="title">
        <h1>The Royal Enchanted</h1>
        <p>Puzzle de ajedrez místico</p>
      </header>

      <div className="hud">
        <div className="score glass">
          <div className="who">Jugador 1</div>
          <div className="pts">0</div>
        </div>
        <div className="score glass">
          <div className="who">Jugador 2</div>
          <div className="pts">0</div>
        </div>
      </div>

      <div className="board-wrap glass">
        <Board board={board} />
      </div>

      <div className="legend glass">
        {PIECE_ORDER.map((t) => (
          <div className="legend-item" key={t}>
            <Piece type={t} size={48} />
            <span>{PIECE_NAME_ES[t]}</span>
          </div>
        ))}
      </div>

      <div className="note glass">
        <strong>Prototipo visual.</strong> Esta es la estética propuesta:
        tablero isométrico de cristal y piezas de gema arcana en tonos morados.
        Aún sin lógica de juego — primero validamos que te guste cómo se ve. ✨
      </div>
    </div>
  );
}
