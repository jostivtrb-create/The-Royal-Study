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

const TOTAL = 5;

const MOVE_START: Placement = { R: sq(0, 0), B: sq(0, 2), Q: sq(1, 0), N: sq(2, 0), K: sq(2, 2) };
const MOVE_TARGET: Placement = { ...MOVE_START, K: sq(2, 1) }; // el Rey una casilla a la izquierda
const ROT_START: Placement = { R: sq(0, 0), B: sq(0, 2), Q: sq(1, 1), N: sq(2, 0), K: sq(2, 2) };
const ROT_TARGET: Placement = applyOp(ROT_START, "rotCW");

function toPos(p: Placement): Positions {
  const out: Positions = {};
  for (const t of PIECE_ORDER) out[t] = rc(p[t]);
  return out;
}

export default function Tutorial({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [demo, setDemo] = useState<Placement>(MOVE_START);
  const [selected, setSelected] = useState<PieceType | null>(null);
  const [done, setDone] = useState(false);
  const [hint, setHint] = useState("");
  const [spin, setSpin] = useState(0);
  const [spark, setSpark] = useState<{ row: number; col: number; tick: number } | null>(null);

  useEffect(() => {
    setSelected(null);
    setDone(false);
    setSpark(null);
    setHint("");
    if (step === 2) setDemo(MOVE_START);
    if (step === 3) setDemo(ROT_START);
  }, [step]);

  const next = () => { sfx.tap(); setStep((s) => Math.min(TOTAL - 1, s + 1)); };
  const prev = () => { sfx.tap(); setStep((s) => Math.max(0, s - 1)); };

  // Paso 2: mover el Rey a la casilla resaltada. Movimiento equivocado → deshacer.
  function moveStepClick(row: number, col: number) {
    if (done) return;
    const clicked = sq(row, col);
    const here = PIECE_ORDER.find((t) => demo[t] === clicked) ?? null;
    if (here) {
      sfx.tap(); haptics.light();
      setSelected((c) => (c === here ? null : here));
      if (here !== "K") setHint("Esta vez mueve el Rey 👑.");
      else setHint("");
      return;
    }
    if (!selected) return;
    if (!legalDestinations(occupiedOf(demo), demo[selected], selected).includes(clicked)) { setSelected(null); return; }
    const np = { ...demo, [selected]: clicked };
    if (selected === "K" && equalPlacement(np, MOVE_TARGET)) {
      sfx.move(); setSpark({ row, col, tick: Date.now() }); sfx.spark(); sfx.success(); haptics.success();
      setDemo(np); setSelected(null); setHint(""); setDone(true);
    } else {
      // movimiento equivocado: deshacer y guiar
      sfx.fail(); haptics.fail();
      setSelected(null);
      setHint("Casi… lleva el Rey 👑 a la casilla brillante.");
    }
  }

  // Paso 3: girar (no mover). Si mueve una pieza → deshacer y guiar.
  function rotateStepClick(row: number, col: number) {
    if (done) return;
    const clicked = sq(row, col);
    const here = PIECE_ORDER.find((t) => demo[t] === clicked) ?? null;
    if (here) { sfx.tap(); setSelected((c) => (c === here ? null : here)); return; }
    if (!selected) return;
    // intentó moverse: aquí se gira
    sfx.fail(); haptics.fail();
    setSelected(null);
    setHint("Aquí no se mueve: ¡gira el tablero! 🔄");
  }
  function rotateBoard() {
    if (done) return;
    sfx.spin(); haptics.light();
    const np = applyOp(demo, "rotCW");
    setSpin((s) => s + 1);
    setDemo(np);
    setSelected(null);
    if (equalPlacement(np, ROT_TARGET)) {
      sfx.success(); haptics.success();
      setHint(""); setDone(true);
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
        {step < TOTAL - 1 && <button className="tut-skip" onClick={onClose}>Saltar ✕</button>}
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
            <Board positions={toPos(MOVE_START)} interactive={false} scale={0.82} />
            <p className="tut-lead">Arriba está el <b>Objetivo</b>. Tu misión: dejar tu tablero <b>igual al objetivo</b>.</p>
          </div>
        )}

        {step === 2 && (
          <div className="tut-block">
            <h2 className="tut-h">👆 Mueve el Rey</h2>
            <div className="target glass"><span className="target-label">Objetivo</span><Board positions={toPos(MOVE_TARGET)} interactive={false} scale={0.4} /></div>
            <Board positions={toPos(demo)} selected={selected} targets={moveTargets} onTileClick={moveStepClick} spark={spark} />
            <p className={"tut-lead" + (done ? " tut-ok" : hint ? " tut-warn" : "")}>
              {done ? "¡Excelente! 🌟 Igualaste el objetivo." : hint || "Toca el Rey 👑 y luego la casilla brillante."}
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="tut-block">
            <h2 className="tut-h">🔄 Gira el tablero</h2>
            <div className="target glass"><span className="target-label">Objetivo</span><Board positions={toPos(ROT_TARGET)} interactive={false} scale={0.4} /></div>
            <Board positions={toPos(demo)} selected={selected} onTileClick={rotateStepClick} spinTick={spin} spinOp="rotCW" />
            <p className={"tut-lead" + (done ? " tut-ok" : hint ? " tut-warn" : "")}>
              {done ? "¡Felicidades! 🎉 Recuerda: cada giro cuenta como 1 movimiento." : hint || "Esta vez se resuelve girando. ¡Pulsa el botón!"}
            </p>
            {!done && <button className="big-btn" onClick={rotateBoard}>⟳ Girar el tablero</button>}
          </div>
        )}

        {step === 4 && (
          <div className="tut-block tut-final">
            <div className="overlay-emoji" style={{ fontSize: 54 }}>🌟</div>
            <h1 className="tut-title">¡Listo!</h1>
            <p className="tut-lead">En el <b>Modo infinito</b>, resolver el puzzle en el <b>mínimo de movimientos</b> te da una <b>⭐</b>.<br /><br />¡Probemos!</p>
            <button className="big-btn" onClick={onClose}>¡Probemos! →</button>
          </div>
        )}
      </div>

      {step < TOTAL - 1 && (
        <div className="tut-nav">
          <button className="menu-btn" onClick={prev} disabled={step === 0} style={{ opacity: step === 0 ? 0.4 : 1 }}>← Atrás</button>
          {(step < 2 || done) && (
            <button className="bid-go" onClick={next}>{step === 0 ? "Empezar →" : "Siguiente →"}</button>
          )}
        </div>
      )}
    </div>
  );
}
