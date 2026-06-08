import { useEffect, useState } from "react";
import Board, { type Positions } from "./Board";
import Piece from "./Piece";
import { PIECE_ORDER, type PieceType } from "../game/pieces";
import { sfx } from "../game/sfx";
import { haptics } from "../game/haptics";
import {
  applyOp,
  equalPlacement,
  legalDestinations,
  occupiedOf,
  rc,
  sq,
  type Placement,
} from "../game/engine";

type Dest = "setup" | "solo" | undefined;

const TOTAL = 6;

// Ejemplos para los pasos interactivos.
const MOVE_START: Placement = { R: sq(0, 0), B: sq(0, 2), Q: sq(1, 0), N: sq(2, 0), K: sq(2, 2) };
const MOVE_TARGET: Placement = { ...MOVE_START, K: sq(2, 1) }; // mover el Rey una casilla
const ROT_START: Placement = { R: sq(0, 0), B: sq(0, 2), Q: sq(1, 1), N: sq(2, 0), K: sq(2, 2) };
const ROT_TARGET: Placement = applyOp(ROT_START, "rotCW");

function toPos(p: Placement): Positions {
  const out: Positions = {};
  for (const t of PIECE_ORDER) out[t] = rc(p[t]);
  return out;
}

export default function Tutorial({ onClose }: { onClose: (go?: Dest) => void }) {
  const [step, setStep] = useState(0);
  const [demo, setDemo] = useState<Placement>(MOVE_START);
  const [selected, setSelected] = useState<PieceType | null>(null);
  const [done, setDone] = useState(false);
  const [spin, setSpin] = useState(0);
  const [spark, setSpark] = useState<{ row: number; col: number; tick: number } | null>(null);

  // Reinicia el ejemplo al entrar a cada paso interactivo.
  useEffect(() => {
    setSelected(null);
    setDone(false);
    setSpark(null);
    if (step === 2) setDemo(MOVE_START);
    if (step === 3) setDemo(ROT_START);
  }, [step]);

  // Avanza solo tras completar la acción de ejemplo.
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => setStep((s) => Math.min(TOTAL - 1, s + 1)), 1400);
    return () => clearTimeout(id);
  }, [done]);

  function next() { sfx.tap(); setStep((s) => Math.min(TOTAL - 1, s + 1)); }
  function prev() { sfx.tap(); setStep((s) => Math.max(0, s - 1)); }

  // Paso 2: mover el Rey a la casilla resaltada.
  function moveTileClick(row: number, col: number) {
    if (done) return;
    const clicked = sq(row, col);
    const here = PIECE_ORDER.find((t) => demo[t] === clicked) ?? null;
    if (here) { sfx.tap(); haptics.light(); setSelected((c) => (c === here ? null : here)); return; }
    if (!selected) return;
    if (!legalDestinations(occupiedOf(demo), demo[selected], selected).includes(clicked)) { setSelected(null); return; }
    const np = { ...demo, [selected]: clicked };
    sfx.move(); haptics.move();
    setDemo(np); setSelected(null);
    if (equalPlacement(np, MOVE_TARGET)) {
      setSpark({ row, col, tick: Date.now() });
      sfx.spark(); sfx.success(); haptics.success();
      setDone(true);
    }
  }

  // Paso 3: girar el tablero para igualar el objetivo.
  function rotate() {
    if (done) return;
    sfx.spin(); haptics.light();
    const np = applyOp(demo, "rotCW");
    setSpin((s) => s + 1);
    setDemo(np);
    if (equalPlacement(np, ROT_TARGET)) {
      sfx.success(); haptics.success();
      setDone(true);
    }
  }

  const moveTargets: Array<[number, number]> =
    step === 2 && selected
      ? legalDestinations(occupiedOf(demo), demo[selected], selected).map((s) => {
          const { row, col } = rc(s);
          return [row, col];
        })
      : [];

  return (
    <div className="app tut">
      <div className="tut-top">
        <div className="tut-dots">
          {Array.from({ length: TOTAL }, (_, i) => (
            <span key={i} className={"tut-dot" + (i === step ? " tut-dot--on" : "")} />
          ))}
        </div>
        {step < TOTAL - 1 && (
          <button className="tut-skip" onClick={() => onClose()}>Saltar ✕</button>
        )}
      </div>

      <div className="tut-stage screen-in" key={step}>
        {step === 0 && (
          <div className="tut-hero">
            <div className="hero-gems">
              <span style={{ animationDelay: "0s" }}><Piece type="N" size={48} /></span>
              <span style={{ animationDelay: ".2s" }}><Piece type="Q" size={60} /></span>
              <span style={{ animationDelay: ".1s" }}><Piece type="K" size={84} /></span>
              <span style={{ animationDelay: ".3s" }}><Piece type="R" size={60} /></span>
              <span style={{ animationDelay: ".4s" }}><Piece type="B" size={48} /></span>
            </div>
            <h1 className="tut-title">The Royal Enchanted</h1>
            <p className="tut-lead">Un duelo de ingenio en un tablero de cristal.<br />Resuelve el puzzle en <b>los menos movimientos</b>… y reclama la gloria. ✨</p>
          </div>
        )}

        {step === 1 && (
          <div className="tut-block">
            <h2 className="tut-h">🎯 El Objetivo</h2>
            <div className="target glass"><span className="target-label">Objetivo</span><Board positions={toPos(MOVE_TARGET)} interactive={false} scale={0.4} /></div>
            <Board positions={toPos(MOVE_START)} interactive={false} scale={0.78} />
            <p className="tut-lead">Arriba está el <b>Objetivo</b>. Tu misión: dejar tu tablero <b>igual al objetivo</b>.</p>
          </div>
        )}

        {step === 2 && (
          <div className="tut-block">
            <h2 className="tut-h">👆 Mueve una pieza</h2>
            <div className="target glass"><span className="target-label">Objetivo</span><Board positions={toPos(MOVE_TARGET)} interactive={false} scale={0.4} /></div>
            <Board positions={toPos(demo)} selected={selected} targets={moveTargets} onTileClick={moveTileClick} spark={spark} />
            <p className="tut-lead">{done ? "¡Perfecto! 🌟 Así de fácil." : "Toca el Rey 👑 y luego la casilla resaltada para igualar el objetivo."}</p>
          </div>
        )}

        {step === 3 && (
          <div className="tut-block">
            <h2 className="tut-h">🔄 Gira tu tablero</h2>
            <div className="target glass"><span className="target-label">Objetivo</span><Board positions={toPos(ROT_TARGET)} interactive={false} scale={0.4} /></div>
            <Board positions={toPos(demo)} interactive={false} spinTick={spin} spinOp="rotCW" />
            <p className="tut-lead">{done ? "¡Genial! Recuerda: cada giro cuenta como 1 movimiento." : "También puedes girar TODO tu tablero. Pulsa el botón para igualar el objetivo."}</p>
            {!done && <button className="big-btn" onClick={rotate}>⟳ Girar tablero</button>}
          </div>
        )}

        {step === 4 && (
          <div className="tut-block">
            <h2 className="tut-h">🌟 Hazlo perfecto</h2>
            <p className="tut-lead">Gana quien lo resuelve en <b>menos movimientos</b>.<br /><br />En <b>Modo infinito</b>, lograrlo en el <b>mínimo posible</b> te da una <b>⭐</b>. ¡Y la app siempre conoce la solución óptima!</p>
            <div className="hero-gems"><span><Piece type="Q" size={72} /></span></div>
          </div>
        )}

        {step === 5 && (
          <div className="tut-block tut-final">
            <div className="overlay-emoji" style={{ fontSize: 54 }}>👑</div>
            <h1 className="tut-title">¡Que comience la magia!</h1>
            <p className="tut-lead">Elige cómo jugar:</p>
            <div className="menu" style={{ maxWidth: 280 }}>
              <button className="menu-btn menu-btn--primary" onClick={() => onClose("setup")}>✦ Jugar local</button>
              <button className="menu-btn" onClick={() => onClose("solo")}>♾️ Modo infinito</button>
              <button className="menu-btn" onClick={() => onClose()}>Ir al inicio</button>
            </div>
          </div>
        )}
      </div>

      {step < TOTAL - 1 && (
        <div className="tut-nav">
          <button className="menu-btn" onClick={prev} disabled={step === 0} style={{ opacity: step === 0 ? 0.4 : 1 }}>← Atrás</button>
          <button className="bid-go" onClick={next}>{step === 0 ? "Empezar →" : "Siguiente →"}</button>
        </div>
      )}
    </div>
  );
}
