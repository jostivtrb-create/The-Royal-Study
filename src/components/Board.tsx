import Piece from "./Piece";
import type { PieceType } from "../game/pieces";

export type Cell = PieceType | null;
export type BoardState = Cell[][]; // [fila][columna], 3x3

type Props = {
  board: BoardState;
  selected?: [number, number] | null;
  highlights?: Array<[number, number]>;
  onCellClick?: (row: number, col: number) => void;
};

// Geometría isométrica (2:1).
const HALF_W = 56;
const HALF_H = 32;
const TILE_W = HALF_W * 2; // 112
const TILE_H = HALF_H * 2; // 64
const DEPTH = 26; // grosor del cristal
const PIECE_W = 86;
const PIECE_H = PIECE_W * 1.3;

// Tamaño del lienzo y origen de la rejilla.
const ORIGIN_X = 168;
const ORIGIN_Y = 70;
const CANVAS_W = 336;
const CANVAS_H = 290;

function tileCenter(row: number, col: number) {
  return {
    x: ORIGIN_X + (col - row) * HALF_W,
    y: ORIGIN_Y + (col + row) * HALF_H,
  };
}

export default function Board({
  board,
  selected,
  highlights = [],
  onCellClick,
}: Props) {
  const cells: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 3; col++) cells.push({ row, col });

  // Orden de pintado de atrás hacia adelante.
  const ordered = [...cells].sort((a, b) => a.row + a.col - (b.row + b.col));

  const isHi = (r: number, c: number) =>
    highlights.some(([hr, hc]) => hr === r && hc === c);
  const isSel = (r: number, c: number) =>
    selected != null && selected[0] === r && selected[1] === c;

  return (
    <div className="board-stage" style={{ width: CANVAS_W, height: CANVAS_H }}>
      {ordered.map(({ row, col }) => {
        const { x, y } = tileCenter(row, col);
        const depth = (row + col) * 2;
        return (
          <div key={`t-${row}-${col}`}>
            {/* Casilla de cristal */}
            <button
              type="button"
              className={
                "tile" +
                ((row + col) % 2 === 0 ? " tile--a" : " tile--b") +
                (isHi(row, col) ? " tile--hi" : "") +
                (isSel(row, col) ? " tile--sel" : "")
              }
              style={{
                left: x - HALF_W,
                top: y - HALF_H,
                width: TILE_W,
                height: TILE_H + DEPTH,
                zIndex: 10 + depth,
              }}
              onClick={() => onCellClick?.(row, col)}
              aria-label={`casilla ${row},${col}`}
            >
              <svg width={TILE_W} height={TILE_H + DEPTH} viewBox={`0 0 ${TILE_W} ${TILE_H + DEPTH}`}>
                {/* Caras laterales (grosor) */}
                <polygon
                  points={`0,${HALF_H} ${HALF_W},${TILE_H} ${HALF_W},${TILE_H + DEPTH} 0,${HALF_H + DEPTH}`}
                  className="tile-side tile-side--l"
                />
                <polygon
                  points={`${TILE_W},${HALF_H} ${HALF_W},${TILE_H} ${HALF_W},${TILE_H + DEPTH} ${TILE_W},${HALF_H + DEPTH}`}
                  className="tile-side tile-side--r"
                />
                {/* Cara superior (vidrio) */}
                <polygon
                  points={`${HALF_W},0 ${TILE_W},${HALF_H} ${HALF_W},${TILE_H} 0,${HALF_H}`}
                  className="tile-top"
                />
                {/* Brillo */}
                <polygon
                  points={`${HALF_W},6 ${TILE_W - 16},${HALF_H} ${HALF_W},${TILE_H - 6} 16,${HALF_H}`}
                  className="tile-shine"
                />
              </svg>
            </button>

            {/* Pieza sobre la casilla */}
            {board[row][col] && (
              <div
                className="piece-slot"
                style={{
                  left: x - PIECE_W / 2,
                  top: y + 12 - PIECE_H,
                  width: PIECE_W,
                  zIndex: 100 + depth,
                  pointerEvents: "none",
                }}
              >
                <Piece type={board[row][col] as PieceType} size={PIECE_W} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
