import { useId } from "react";
import type { PieceType } from "../game/pieces";

type Props = {
  type: PieceType;
  /** Tonalidad del cristal: amatista (por defecto) o variante para el rival. */
  hue?: "amethyst" | "rose";
  size?: number;
  className?: string;
};

/**
 * Pieza de cristal arcano dibujada en SVG.
 *
 * Cada pieza es una gema/cristal facetado (cuerpo en forma de espira) con un
 * ornamento superior distintivo. El facetado (cara izquierda clara + cara
 * derecha oscura + brillo especular) simula volumen 3D sin necesidad de 3D real.
 */
export default function Piece({
  type,
  hue = "amethyst",
  size = 88,
  className,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const ids = {
    body: `body-${uid}`,
    light: `light-${uid}`,
    dark: `dark-${uid}`,
    glow: `glow-${uid}`,
    sheen: `sheen-${uid}`,
  };

  // Paletas de cristal.
  const palette =
    hue === "rose"
      ? {
          edge: "#ffd9f2",
          light: "#ff9ed8",
          mid: "#e25fb4",
          dark: "#a8338a",
          glow: "#ff7ad1",
        }
      : {
          edge: "#efe2ff",
          light: "#c9a8ff",
          mid: "#9c63ff",
          dark: "#6a32c9",
          glow: "#b58bff",
        };

  // Cuerpo: espira de gema simétrica respecto a x=50.
  const T = "50,34";
  const RS = "75,64";
  const RB = "66,114";
  const BC = "50,122";
  const LB = "34,114";
  const LS = "25,64";

  return (
    <svg
      className={className}
      width={size}
      height={size * 1.3}
      viewBox="0 0 100 130"
      role="img"
      aria-label={type}
    >
      <defs>
        <linearGradient id={ids.light} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={palette.edge} />
          <stop offset="0.5" stopColor={palette.light} />
          <stop offset="1" stopColor={palette.mid} />
        </linearGradient>
        <linearGradient id={ids.dark} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.mid} />
          <stop offset="1" stopColor={palette.dark} />
        </linearGradient>
        <radialGradient id={ids.sheen} cx="0.35" cy="0.25" r="0.7">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="0.4" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id={ids.glow} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow
            dx="0"
            dy="3"
            stdDeviation="4"
            floodColor={palette.glow}
            floodOpacity="0.55"
          />
        </filter>
      </defs>

      {/* Sombra de contacto sobre la casilla */}
      <ellipse cx="50" cy="123" rx="24" ry="6" fill="#000" opacity="0.18" />

      <g filter={`url(#${ids.glow})`}>
        {/* Pedestal de la pieza */}
        <ellipse cx="50" cy="118" rx="21" ry="6.5" fill={palette.dark} />
        <ellipse cx="50" cy="116" rx="21" ry="6.5" fill={`url(#${ids.light})`} />

        {/* Cuerpo facetado */}
        <polygon
          points={`${T} ${RS} ${RB} ${BC} ${LB} ${LS}`}
          fill={`url(#${ids.light})`}
        />
        {/* Cara derecha (sombra) */}
        <polygon
          points={`${T} ${RS} ${RB} ${BC}`}
          fill={`url(#${ids.dark})`}
          opacity="0.92"
        />
        {/* Espina central brillante */}
        <polygon points={`${T} 53,64 ${BC} 47,64`} fill={palette.edge} opacity="0.5" />
        {/* Brillo especular izquierdo */}
        <polygon points="50,38 31,62 38,64 50,42" fill="#fff" opacity="0.55" />

        {/* Ornamento superior por pieza */}
        {renderTop(type, palette, ids)}
      </g>

      {/* Lustre general */}
      <ellipse cx="42" cy="62" rx="26" ry="40" fill={`url(#${ids.sheen})`} />
    </svg>
  );
}

function renderTop(
  type: PieceType,
  palette: { edge: string; light: string; mid: string; dark: string },
  ids: { light: string; dark: string },
) {
  const lightFill = `url(#${ids.light})`;
  switch (type) {
    case "K":
      // Orbe coronado por una cruz de cristal.
      return (
        <g>
          <polygon points="50,30 62,30 50,20 38,30" fill={lightFill} />
          <circle cx="50" cy="20" r="8" fill={lightFill} stroke={palette.edge} strokeWidth="1" />
          <rect x="47" y="3" width="6" height="20" rx="2" fill={lightFill} />
          <rect x="41" y="9" width="18" height="6" rx="2" fill={lightFill} />
          <circle cx="50" cy="20" r="3" fill="#fff" opacity="0.7" />
        </g>
      );
    case "Q":
      // Corona radiante de varios picos con orbes.
      return (
        <g>
          <polygon points="34,34 66,34 60,16 50,26 40,16" fill={lightFill} />
          {[28, 39, 50, 61, 72].map((x, i) => (
            <g key={i}>
              <polygon
                points={`${x},28 ${x - 5},${i === 2 ? 6 : 14} ${x + 5},${i === 2 ? 6 : 14}`}
                fill={lightFill}
              />
              <circle cx={x} cy={i === 2 ? 6 : 14} r="3.4" fill={palette.edge} />
            </g>
          ))}
        </g>
      );
    case "R":
      // Almenas (torre).
      return (
        <g>
          <polygon
            points="34,34 34,20 40,20 40,26 46,26 46,20 54,20 54,26 60,26 60,20 66,20 66,34"
            fill={lightFill}
          />
          <polygon points="34,34 34,20 40,20 40,26 50,26 50,34" fill={`url(#${ids.dark})`} opacity="0.3" />
        </g>
      );
    case "B":
      // Mitra puntiaguda con hendidura y orbe.
      return (
        <g>
          <polygon points="50,4 38,32 62,32" fill={lightFill} />
          <polygon points="50,4 50,32 62,32" fill={`url(#${ids.dark})`} opacity="0.45" />
          <line x1="46" y1="16" x2="54" y2="11" stroke={palette.dark} strokeWidth="2" strokeLinecap="round" />
          <circle cx="50" cy="6" r="4" fill={palette.edge} />
        </g>
      );
    case "N":
      // Cabeza de caballo angular y facetada.
      return (
        <g>
          <polygon
            points="60,34 62,16 53,5 40,8 33,20 41,22 35,30 44,30 47,34"
            fill={lightFill}
          />
          <polygon points="60,34 62,16 53,5 50,10 52,34" fill={`url(#${ids.dark})`} opacity="0.5" />
          <polygon points="40,8 33,20 41,22 44,16" fill="#fff" opacity="0.4" />
          <circle cx="46" cy="16" r="2" fill={palette.dark} />
        </g>
      );
  }
}
