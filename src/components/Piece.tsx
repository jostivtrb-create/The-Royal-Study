import { useId } from "react";
import type { PieceType } from "../game/pieces";

type Props = {
  type: PieceType;
  hue?: "amethyst" | "rose";
  size?: number;
  className?: string;
};

/**
 * Pieza de ajedrez tallada en cristal.
 *
 * Silueta Staunton reconocible (base torneada + cuerpo + remate distintivo)
 * con acabado de cristal: degradado vertical, brillo especular lateral, rim
 * light y glow morado. viewBox 90x112, centro en x=45, base en y≈100.
 */
export default function Piece({
  type,
  hue = "amethyst",
  size = 96,
  className,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const id = (k: string) => `${k}-${uid}`;

  const p =
    hue === "rose"
      ? { edge: "#ffe3f5", light: "#ff9fd9", mid: "#e25fb4", dark: "#a8338a", deep: "#7e1f68", glow: "#ff7ad1" }
      : { edge: "#f1e8ff", light: "#cbb0ff", mid: "#9c63ff", dark: "#6a35cc", deep: "#46219a", glow: "#b58bff" };

  return (
    <svg
      className={className}
      width={size}
      height={size * (112 / 90)}
      viewBox="0 0 90 112"
      role="img"
      aria-label={type}
    >
      <defs>
        <linearGradient id={id("body")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.edge} />
          <stop offset="0.16" stopColor={p.light} />
          <stop offset="0.55" stopColor={p.mid} />
          <stop offset="1" stopColor={p.dark} />
        </linearGradient>
        <linearGradient id={id("base")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.light} />
          <stop offset="1" stopColor={p.deep} />
        </linearGradient>
        <linearGradient id={id("spec")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id("sheen")} cx="0.36" cy="0.22" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id={id("glow")} x="-40%" y="-50%" width="180%" height="200%">
          <feDropShadow dx="0" dy="3" stdDeviation="3.4" floodColor={p.glow} floodOpacity="0.5" />
        </filter>
        <clipPath id={id("clip")}>{bodyShape(type, `url(#${id("body")})`, p, true)}</clipPath>
      </defs>

      {/* Sombra de contacto */}
      <ellipse cx="45" cy="105" rx="30" ry="5.5" fill="#000" opacity="0.16" />

      <g filter={`url(#${id("glow")})`}>
        {/* Base torneada (común) */}
        <ellipse cx="45" cy="100" rx="26" ry="6.5" fill={`url(#${id("base")})`} />
        <ellipse cx="45" cy="97" rx="26" ry="6.5" fill={`url(#${id("body")})`} />
        <path d="M26,97 Q45,99 64,97 L57,87 Q45,84 33,87 Z" fill={`url(#${id("body")})`} />
        <ellipse cx="45" cy="86.5" rx="14" ry="3.6" fill={`url(#${id("base")})`} />

        {/* Cuerpo + remate de la pieza */}
        {bodyShape(type, `url(#${id("body")})`, p, false)}
      </g>

      {/* Brillo especular y lustre, recortados a la silueta */}
      <g clipPath={`url(#${id("clip")})`}>
        <rect x="22" y="10" width="12" height="92" rx="6" fill={`url(#${id("spec")})`} opacity="0.6" />
        <ellipse cx="38" cy="40" rx="30" ry="44" fill={`url(#${id("sheen")})`} />
      </g>
    </svg>
  );
}

type Pal = { edge: string; light: string; mid: string; dark: string; deep: string; glow: string };

/**
 * Devuelve el cuerpo (de la base hacia arriba) de cada pieza.
 * Si `outlineOnly`, devuelve solo las formas rellenas (para el clipPath).
 */
function bodyShape(type: PieceType, fill: string, p: Pal, outlineOnly: boolean) {
  const rim = outlineOnly ? "none" : p.edge;
  const rimW = 0.8;
  const props = { fill, stroke: rim, strokeWidth: rimW, strokeLinejoin: "round" as const };

  switch (type) {
    case "K":
      return (
        <g>
          {/* fuste */}
          <path d="M37,86 Q33,66 36,52 L54,52 Q57,66 53,86 Z" {...props} />
          {/* corona/banda */}
          <path d="M33,53 Q45,47 57,53 L54,44 Q45,41 36,44 Z" {...props} />
          {/* cabeza */}
          <ellipse cx="45" cy="40" rx="8.5" ry="6.5" {...props} />
          {/* cruz */}
          <path d="M42,14 L48,14 L48,22 L55,22 L55,28 L48,28 L48,38 L42,38 L42,28 L35,28 L35,22 L42,22 Z" {...props} />
        </g>
      );
    case "Q":
      return (
        <g>
          <path d="M36,86 Q32,64 36,50 L54,50 Q58,64 54,86 Z" {...props} />
          {/* collar */}
          <ellipse cx="45" cy="50" rx="11" ry="3.2" {...props} />
          {/* banda de la corona */}
          <path d="M34,50 Q45,45 56,50 L55,43 Q45,40 35,43 Z" {...props} />
          {/* picos + perlas (corona simétrica) */}
          {[
            [35, 40],
            [40, 37],
            [45, 33],
            [50, 37],
            [55, 40],
          ].map(([x, tipY], i) => (
            <g key={i}>
              <path d={`M${x - 3.4},43 L${x + 3.4},43 L${x},${tipY} Z`} {...props} />
              <circle cx={x} cy={tipY - 1.5} r="2.8" {...props} />
            </g>
          ))}
        </g>
      );
    case "R":
      return (
        <g>
          <path d="M35,86 Q33,68 35,58 L55,58 Q57,68 55,86 Z" {...props} />
          {/* corona almenada */}
          <path
            d="M32,58 L32,42 L38,42 L38,48 L43,48 L43,42 L47,42 L47,48 L52,48 L52,42 L58,42 L58,58 Z"
            {...props}
          />
        </g>
      );
    case "B":
      return (
        <g>
          <path d="M37,86 Q33,68 37,56 L53,56 Q57,68 53,86 Z" {...props} />
          {/* collar */}
          <ellipse cx="45" cy="55" rx="11" ry="3.4" {...props} />
          {/* mitra */}
          <path d="M45,20 C56,30 56,46 45,52 C34,46 34,30 45,20 Z" {...props} />
          {/* hendidura */}
          {!outlineOnly && (
            <path d="M40,30 Q47,26 52,32" stroke={p.deep} strokeWidth="2" fill="none" strokeLinecap="round" />
          )}
          {/* perla */}
          <circle cx="45" cy="18" r="3.6" {...props} />
        </g>
      );
    case "N":
      return (
        <g>
          {/* cabeza de caballo (mirando a la izquierda) */}
          <path
            d="M54,86
               C56,72 56,60 54,52
               C53,44 50,38 44,35
               C46,30 49,26 48,21
               L50,15
               L44,20
               C42,17 39,17 37,21
               C33,25 29,33 26,42
               C25,45 26,47 29,47
               L35,46
               C38,50 38,54 42,57
               C37,60 35,68 37,76
               L39,86 Z"
            {...props}
          />
          {/* crin a lo largo del cuello */}
          {!outlineOnly && (
            <path d="M50,16 C53,24 54,34 53,44" stroke={p.deep} strokeWidth="1.6" fill="none" opacity="0.55" strokeLinecap="round" />
          )}
          {/* ojo y ollar */}
          {!outlineOnly && <circle cx="39" cy="33" r="1.8" fill={p.deep} />}
          {!outlineOnly && <circle cx="29" cy="44" r="1.2" fill={p.deep} opacity="0.7" />}
        </g>
      );
  }
}
