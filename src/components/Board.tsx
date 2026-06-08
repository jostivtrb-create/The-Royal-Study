import { useEffect, useId, useRef } from "react";
import Piece from "./Piece";
import { PIECE_ORDER, type PieceType } from "../game/pieces";
import type { Op } from "../game/engine";

export type Pos = { row: number; col: number };
export type Positions = Partial<Record<PieceType, Pos>>;

type Props = {
  positions: Positions;
  selected?: PieceType | null;
  targets?: Array<[number, number]>;
  /** Casillas al alcance pero bloqueadas por otra ficha (se marcan en rojo). */
  blocked?: Array<[number, number]>;
  /** Casillas con una pieza ya en su lugar correcto (brillan en dorado). */
  correct?: Array<[number, number]>;
  onTileClick?: (row: number, col: number) => void;
  scale?: number;
  interactive?: boolean;
  /** Cambia en cada giro/volteo para reproducir la animación de rotación. */
  spinTick?: number;
  spinOp?: Op;
  /** Destello cuando una pieza llega a su casilla correcta. */
  spark?: { row: number; col: number; tick: number } | null;
  /** Cambia al iniciar una ronda para animar la entrada del tablero. */
  enterTick?: number;
};

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
const MAX_DEPTH = 4;

function tileCenter(row: number, col: number) {
  return {
    x: ORIGIN_X + (col - row) * HALF_W,
    y: ORIGIN_Y + (col + row) * HALF_H,
  };
}

function spinKeyframes(op?: Op): Keyframe[] {
  switch (op) {
    case "rotCCW":
      return [{ transform: "perspective(760px) rotateY(62deg) scale(0.86)" }, { transform: "perspective(760px) rotateY(0deg) scale(1)" }];
    case "mirrorH":
      return [{ transform: "perspective(760px) rotateY(82deg)" }, { transform: "perspective(760px) rotateY(0deg)" }];
    case "mirrorV":
      return [{ transform: "perspective(760px) rotateX(74deg)" }, { transform: "perspective(760px) rotateX(0deg)" }];
    case "rotCW":
    default:
      return [{ transform: "perspective(760px) rotateY(-62deg) scale(0.86)" }, { transform: "perspective(760px) rotateY(0deg) scale(1)" }];
  }
}

export default function Board({
  positions,
  selected,
  targets = [],
  blocked = [],
  correct = [],
  onTileClick,
  scale = 1,
  interactive = true,
  spinTick,
  spinOp,
  spark,
  enterTick,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const stageRef = useRef<HTMLDivElement>(null);

  // Animación de giro del tablero completo.
  useEffect(() => {
    if (!spinTick || !stageRef.current) return;
    stageRef.current.animate(spinKeyframes(spinOp), {
      duration: 520,
      easing: "cubic-bezier(.2,.7,.3,1)",
    });
  }, [spinTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Animación de entrada al iniciar una ronda (el tablero "aterriza").
  useEffect(() => {
    if (!enterTick || !stageRef.current) return;
    stageRef.current.animate(
      [
        { transform: "translateY(-18px) scale(0.96)", opacity: 0.3 },
        { transform: "translateY(0) scale(1)", opacity: 1 },
      ],
      { duration: 520, easing: "cubic-bezier(.2,1.1,.3,1)" },
    );
  }, [enterTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const cells: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 3; col++) cells.push({ row, col });

  const isTarget = (r: number, c: number) =>
    targets.some(([tr, tc]) => tr === r && tc === c);
  const isBlocked = (r: number, c: number) =>
    blocked.some(([br, bc]) => br === r && bc === c);
  const correctKey = new Set(correct.map(([r, c]) => `${r},${c}`));
  const isCorrect = (r: number, c: number) => correctKey.has(`${r},${c}`);
  const selPos = selected ? positions[selected] : null;
  const isSel = (r: number, c: number) => !!selPos && selPos.row === r && selPos.col === c;

  const lv = tileCenter(2, 0);
  const bv = tileCenter(2, 2);
  const rv = tileCenter(0, 2);
  const frontPts = `${lv.x - HALF_W},${lv.y} ${bv.x},${bv.y + HALF_H} ${rv.x + HALF_W},${rv.y}`;

  const stage = (
    <div className="board-stage" ref={stageRef} style={{ width: CANVAS_W, height: CANVAS_H }}>
      {cells.map(({ row, col }) => {
        const { x, y } = tileCenter(row, col);
        const darken = ((MAX_DEPTH - (row + col)) / MAX_DEPTH) * 0.34;
        return (
          <div
            key={`t-${row}-${col}`}
            className={
              "tile" +
              ((row + col) % 2 === 0 ? " tile--a" : " tile--b") +
              (isCorrect(row, col) ? " tile--correct" : "") +
              (isTarget(row, col) ? " tile--hi" : "") +
              (isBlocked(row, col) ? " tile--block" : "") +
              (isSel(row, col) ? " tile--sel" : "")
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
              {darken > 0.001 && (
                <polygon points={`${HALF_W},0 ${TILE_W},${HALF_H} ${HALF_W},${TILE_H} 0,${HALF_H}`} fill="#2c1b54" opacity={darken} />
              )}
              {isTarget(row, col) && (
                <polygon points={`${HALF_W},10 ${TILE_W - 22},${HALF_H} ${HALF_W},${TILE_H - 10} 22,${HALF_H}`} className="tile-ring" />
              )}
              {isBlocked(row, col) && (
                <polygon points={`${HALF_W},10 ${TILE_W - 22},${HALF_H} ${HALF_W},${TILE_H - 10} 22,${HALF_H}`} className="tile-ring tile-ring--block" />
              )}
              {isSel(row, col) && (
                <polygon points={`${HALF_W},10 ${TILE_W - 22},${HALF_H} ${HALF_W},${TILE_H - 10} 22,${HALF_H}`} className="tile-ring tile-ring--sel" />
              )}
            </svg>
          </div>
        );
      })}

      <svg className="board-accent" width={CANVAS_W} height={CANVAS_H} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}>
        <defs>
          <filter id={`fg-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        <polyline points={frontPts} fill="none" stroke="#d36bff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" filter={`url(#fg-${uid})`} />
        <polyline points={frontPts} fill="none" stroke="#f0e2ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        <circle cx={bv.x} cy={bv.y + HALF_H} r="5.5" fill="#ffffff" opacity="0.95" />
        <circle cx={bv.x} cy={bv.y + HALF_H} r="9" fill="#d36bff" opacity="0.4" filter={`url(#fg-${uid})`} />
      </svg>

      {PIECE_ORDER.filter((t) => positions[t]).map((t) => {
        const pos = positions[t]!;
        const { x, y } = tileCenter(pos.row, pos.col);
        const sel = selected === t;
        const corr = isCorrect(pos.row, pos.col);
        return (
          <div
            key={`p-${t}`}
            className={"piece-slot" + (sel ? " piece-slot--sel" : "") + (corr ? " piece-slot--correct" : "")}
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

      {spark && spark.tick > 0 && (
        <div
          key={`spark-${spark.tick}`}
          className="spark"
          style={{ left: tileCenter(spark.row, spark.col).x, top: tileCenter(spark.row, spark.col).y - 22 }}
        >
          ✦
        </div>
      )}

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
