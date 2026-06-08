import { useState } from "react";
import { sfx } from "../game/sfx";
import FitScreen from "./FitScreen";

const MIN = 2;
const MAX = 6;

export default function Setup({
  onStart,
}: {
  onStart: (names: string[]) => void;
}) {
  const [count, setCount] = useState(2);
  const [names, setNames] = useState<string[]>(["", ""]);

  function setCountTo(n: number) {
    sfx.tap();
    setCount(n);
    setNames((prev) => {
      const next = prev.slice(0, n);
      while (next.length < n) next.push("");
      return next;
    });
  }

  function setName(i: number, v: string) {
    setNames((prev) => prev.map((x, idx) => (idx === i ? v : x)));
  }

  function start() {
    const clean = Array.from({ length: count }, (_, i) =>
      (names[i] || "").trim() || `Jugador ${i + 1}`,
    );
    sfx.bid();
    onStart(clean);
  }

  return (
    <div className="app app--fit screen-in">
      <FitScreen>
      <header className="title"><h1>Jugar local</h1></header>

      <div className="setup glass">
        <div className="setup-label">¿Cuántos jugadores?</div>
        <div className="count-row">
          {Array.from({ length: MAX - MIN + 1 }, (_, i) => i + MIN).map((n) => (
            <button
              key={n}
              className={"count-btn" + (count === n ? " count-btn--on" : "")}
              onClick={() => setCountTo(n)}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="setup-label">Nombres (opcional)</div>
        <div className="names">
          {Array.from({ length: count }, (_, i) => (
            <input
              key={i}
              className="name-input"
              value={names[i] ?? ""}
              onChange={(e) => setName(i, e.target.value)}
              placeholder={`Jugador ${i + 1}`}
              maxLength={14}
            />
          ))}
        </div>
      </div>

      <button className="bid-go" onClick={start}>Comenzar ✦</button>
      </FitScreen>
    </div>
  );
}
