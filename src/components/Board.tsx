import { useId } from "react";
import Piece from "./Piece";
import { PIECE_ORDER, type PieceType } from "../game/pieces";

export type Pos = { row: number; col: number };
export type Positions = Partial<Record<PieceType, Pos>>;

type Props = {
  positions: Positions;
  selected?: PieceType | null;
  targets?: Array<[number, number]>;
  onTileClick?: (row: number, col: number) => void;
  /** Escala del tablero (1 = grande, ~0.46 = mini objetivo). */
  scale?: number;
  /** Si es false, no hay capa de toque (solo visual, p. ej. el objetivo). */
  interactive?: boolean;
};

// Geometría isométrica (2:1).
const HALF_W = 56;
const HALF_H = 32;
const TILE_W = HALF_W * 2;
const TILE_H = HALF_H * 2;
const DEPTH = 26;
const PIECE_W = 86;
const PIECE_H = PIECE_W * (112 / 90);

const ORIGIN_X = 168;
const ORIGIN_Y = 70;
const CANVAS_W = 336;
const CANVAS_H = 300;
const MAX_DEPTH = 4; // (row+col) máximo

function tileCenter(row: number, col: number) {
  return {
    x: ORIGIN_X + (col - row) * HALF_W,
    y: ORIGIN_Y + (col + row) * HALF_H,
  };
}

export default function Board({
  positions,
  selected,
  targets = [],
  onTileClick,
  scale = 1,
  interactive = true,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const cells: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 3; col++) cells.push({ row, col });

  const isTarget = (r: number, c: number) =>
    targets.some(([tr, tc]) => tr === r && tc === c);

  // Vértices frontales del tablero (borde cercano al jugador).
  const lv = tileCenter(2, 0);
  const bv = tileCenter(2, 2);
  const rv = tileCenter(0, 2);
  const frontPts = `${lv.x - HALF_W},${lv.y} ${bv.x},${bv.y + HALF_H} ${rv.x + HALF_W},${rv.y}`;

  const stage = (
    <div className="board-stage" style={{ width: CANVAS_W, height: CANVAS_H }}>
      {/* Casillas (solo visual) con degradado de profundidad */}
      {cells.map(({ row, col }) => {
        const { x, y } = tileCenter(row, col);
        const darken = ((MAX_DEPTH - (row + col)) / MAX_DEPTH) * 0.34; // atrás más oscuro
        return (
          <div
            key={`t-${row}-${col}`}
            className={
              "tile" +
              ((row + col) % 2 === 0 ? " tile--a" : " tile--b") +
              (isTarget(row, col) ? " tile--hi" : "")
            }
            style={{
              left: x - HALF_W,
              top: y - HALF_H,
              width: TILE_W,
              height: TILE_H + DEPTH,
              zIndex: 10 + (row + col) * 2,
            }}
          >
            <svg width={TILE_W} height={TILE_H + DEPTH} viewBox={`0 0 ${TILE_W} ${TILE_H + DEPTH}`}>
              <polygon points={`0,${HALF_H} ${HALF_W},${TILE_H} ${HALF_W},${TILE_H + DEPTH} 0,${HALF_H + DEPTH}`} className="tile-side tile-side--l" />
              <polygon points={`${TILE_W},${HALF_H} ${HALF_W},${TILE_H} ${HALF_W},${TILE_H + DEPTH} ${TILE_W},${HALF_H + DEPTH}`} className="tile-side tile-side--r" />
              <polygon points={`${HALF_W},0 ${TILE_W},${HALF_H} ${HALF_W},${TILE_H} 0,${HALF_H}`} className="tile-top" />
              <polygon points={`${HALF_W},6 ${TILE_W - 16},${HALF_H} ${HALF_W},${TILE_H - 6} 16,${HALF_H}`} className="tile-shine" />
              {/* Tinte de profundidad (atrás más oscuro → frente más claro) */}
              {darken > 0.001 && (
                <polygon points={`${HALF_W},0 ${TILE_W},${HALF_H} ${HALF_W},${TILE_H} 0,${HALF_H}`} fill="#2c1b54" opacity={darken} />
              )}
              {isTarget(row, col) && (
                <polygon points={`${HALF_W},10 ${TILE_W - 22},${HALF_H} ${HALF_W},${TILE_H - 10} 22,${HALF_H}`} className="tile-ring" />
              )}
            </svg>
          </div>
        );
      })}

      {/* Acento del frente (borde cercano marcado con brillo) */}
      <svg className="board-accent" width={CANVAS_W} height={CANVAS_H} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}>
        <defs>
          <filter id={`fg-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        <polyline points={frontPts} fill="none" stroke="#d36bff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" filter={`url(#fg-${uid})`} />
        <polyline points={frontPts} fill="none" stroke="#f0e2ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        {/* Gema en la esquina frontal */}
        <circle cx={bv.x} cy={bv.y + HALF_H} r="5.5" fill="#ffffff" opacity="0.95" />
        <circle cx={bv.x} cy={bv.y + HALF_H} r="9" fill="#d36bff" opacity="0.4" filter={`url(#fg-${uid})`} />
      </svg>

      {/* Piezas (capa animada, sin captura de toque) */}
      {PIECE_ORDER.filter((t) => positions[t]).map((t) => {
        const pos = positions[t]!;
        const { x, y } = tileCenter(pos.row, pos.col);
        const sel = selected === t;
        return (
          <div
            key={`p-${t}`}
            className={"piece-slot" + (sel ? " piece-slot--sel" : "")}
            style={{
              left: x - PIECE_W / 2,
              top: y + 12 - PIECE_H,
              width: PIECE_W,
              zIndex: 100 + (pos.row + pos.col) * 2 + (sel ? 50 : 0),
              pointerEvents: "none",
            }}
          >
            <Piece type={t} size={PIECE_W} />
          </div>
        );
      })}

      {/* Capa de toque: rombos que coinciden con cada casilla (sin solapes) */}
      {interactive && (
        <svg className="hit-layer" width={CANVAS_W} height={CANVAS_H} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}>
          {cells.map(({ row, col }) => {
            const { x, y } = tileCenter(row, col);
            const pts = `${x},${y - HALF_H} ${x + HALF_W},${y} ${x},${y + HALF_H} ${x - HALF_W},${y}`;
            return (
              <polygon
                key={`h-${row}-${col}`}
                className="hit"
                points={pts}
                fill="transparent"
                style={{ pointerEvents: "all", cursor: "pointer" }}
                onClick={() => onTileClick?.(row, col)}
              />
            );
          })}
        </svg>
      )}
    </div>
  );

  if (scale === 1) return stage;
  return (
    <div style={{ width: CANVAS_W * scale, height: CANVAS_H * scale }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>{stage}</div>
    </div>
  );
}

export { tileCenter, PIECE_W, PIECE_H };
