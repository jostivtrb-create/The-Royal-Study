import type { Op } from "../game/engine";

// Flecha de doble punta entre dos puntos (para los espejos diagonales).
function doubleArrow(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len, px = -uy, py = ux, a = 4.5;
  return [
    `M${x1},${y1} L${x2},${y2}`,
    `M${x2},${y2} L${x2 + (-ux + px) * a},${y2 + (-uy + py) * a}`,
    `M${x2},${y2} L${x2 + (-ux - px) * a},${y2 + (-uy - py) * a}`,
    `M${x1},${y1} L${x1 + (ux + px) * a},${y1 + (uy + py) * a}`,
    `M${x1},${y1} L${x1 + (ux - px) * a},${y1 + (uy - py) * a}`,
  ].join(" ");
}

/**
 * Íconos de los botones de transformación. Los espejos son flechas DIAGONALES
 * (perpendiculares a cada eje real del tablero isométrico), no rectas.
 */
export default function OpIcon({ op }: { op: Op }) {
  if (op === "rotCW" || op === "rotCCW") {
    // Arco circular con punta de flecha.
    const cw = op === "rotCW";
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" className="op-svg" aria-hidden="true">
        <path
          d="M5 12 a7 7 0 1 0 2.2 -5.1"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          transform={cw ? "scale(-1,1) translate(-24,0)" : undefined}
        />
        {/* punta de flecha arriba */}
        <path
          d={cw ? "M17 4.2 L17.2 8.6 L13 7.6 Z" : "M7 4.2 L6.8 8.6 L11 7.6 Z"}
          fill="currentColor"
        />
      </svg>
    );
  }
  // Espejos: doble flecha diagonal (perpendicular al eje de reflexión real).
  const [x1, y1, x2, y2] = op === "mirrorH" ? [5, 7, 19, 17] : [5, 17, 19, 7];
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" className="op-svg" aria-hidden="true">
      <path d={doubleArrow(x1, y1, x2, y2)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
