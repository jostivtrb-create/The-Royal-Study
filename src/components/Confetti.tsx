import { useMemo } from "react";

// Estallido de partículas de cristal para las celebraciones.
const COLORS = ["#9c63ff", "#f25fae", "#5b86f5", "#2fc78d", "#f5a93a", "#c9a8ff"];

export default function Confetti({ count = 28 }: { count?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const dist = 90 + Math.random() * 150;
        return {
          id: i,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 40,
          rot: Math.random() * 360,
          delay: Math.random() * 0.12,
          dur: 0.9 + Math.random() * 0.7,
          size: 7 + Math.random() * 8,
          color: COLORS[i % COLORS.length],
          round: Math.random() > 0.5,
        };
      }),
    [count],
  );

  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b) => (
        <span
          key={b.id}
          className="confetti-bit"
          style={
            {
              "--x": `${b.x}px`,
              "--y": `${b.y}px`,
              "--rot": `${b.rot}deg`,
              width: b.size,
              height: b.size,
              background: b.color,
              borderRadius: b.round ? "50%" : "2px",
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.dur}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
