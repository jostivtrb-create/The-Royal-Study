import { useEffect, useState } from "react";
import Board, { type Positions } from "./Board";
import Piece from "./Piece";
import OpIcon from "./OpIcon";
import FitScreen from "./FitScreen";
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
  type Op,
  type Placement,
} from "../game/engine";

const TOTAL = 6;

const MOVE_START: Placement = { R: sq(0, 0), B: sq(0, 2), Q: sq(1, 0), N: sq(2, 0), K: sq(2, 2) };
const MOVE_TARGET: Placement = { ...MOVE_START, K: sq(2, 1) };
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
  const [spin, setSpin] = useState<{ tick: number; op: Op }>({ tick: 0, op: "rotCW" });
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

  // Paso 2: mover el Rey a la casilla resaltada.
  function moveStepClick(row: number, col: number) {
    if (done) return;
    const clicked = sq(row, col);
    const here = PIECE_ORDER.find((t) => demo[t] === clicked) ?? null;
    if (here) {
      sfx.tap(); haptics.light();
      setSelected((c) => (c === here ? null : here));
      setHint(here !== "K" ? "Esta vez mueve el Rey 👑." : "");
      return;
    }
    if (!selected) return;
    if (!legalDestinations(occupiedOf(demo), demo[selected], selected).includes(clicked)) { setSelected(null); return; }
    const np = { ...demo, [selected]: clicked };
    if (selected === "K" && equalPlacement(np, MOVE_TARGET)) {
      sfx.move(); setSpark({ row, col, tick: Date.now() }); sfx.spark(); sfx.success(); haptics.success();
      setDemo(np); setSelected(null); setHint(""); setDone(true);
    } else {
      sfx.fail(); haptics.fail();
      setSelected(null);
      setHint("Casi… lleva el Rey 👑 a la casilla brillante.");
    }
  }

  // Paso 3: usar los botones de giro/espejo (no mover).
  function rotStepClick() {
    if (done) return;
    sfx.fail(); haptics.fail();
    setSelected(null);
    setHint("Aquí no muevas piezas: usa los botones 🔄 de abajo.");
  }
  function tutOp(op: Op) {
    if (done) return;
    if (op === "rotCW") {
      sfx.spin(); haptics.light();
      const np = applyOp(demo, "rotCW");
      setSpin((s) => ({ tick: s.tick + 1, op }));
      setDemo(np); setSelected(null);
      if (equalPlacement(np, ROT_TARGET)) { sfx.success(); haptics.success(); setHint(""); setDone(true); }
    } else {
      sfx.fail(); haptics.fail();
      setSpin((s) => ({ tick: s.tick + 1, op }));
      setHint("Ese no encaja aquí. Usa ⟳ (girar a la derecha).");
    }
  }

  const tutCorrect = (tg: Placement): Array<[number, number]> =>
    PIECE_ORDER.filter((t) => demo[t] === tg[t]).map((t) => {
      const { row, col } = rc(demo[t]);
      return [row, col];
    });

  const moveTargets: Array<[number, number]> =
    step === 2 && selected
      ? legalDestinations(occupiedOf(demo), demo[selected], selected).map((s) => {
          const { row, col } = rc(s);
          return [row, col];
        })
      : [];

  return (
    <div className="app tut app--fit">
      <FitScreen>
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
            <p className="tut-lead">Un duelo de ingenio en un tablero de cristal.<br />El reto: igualar el objetivo en <b>los menos movimientos posibles</b>. ✨<br />Te enseño en 1 minuto.</p>
          </div>
        )}

        {step === 1 && (
          <div className="tut-block">
            <h2 className="tut-h">🎯 La meta</h2>
            <div className="target glass"><span className="target-label">Objetivo</span><Board positions={toPos(MOVE_TARGET)} interactive={false} scale={0.4} /></div>
            <Board positions={toPos(MOVE_START)} interactive={false} scale={0.8} />
            <p className="tut-lead">Arriba: el <b>Objetivo</b>. Abajo: <b>tu tablero</b>.<br />Debes dejar tu tablero <b>igual al objetivo</b>, usando <b>los menos movimientos</b>.</p>
          </div>
        )}

        {step === 2 && (
          <div className="tut-block">
            <h2 className="tut-h">👆 Mover piezas</h2>
            <div className="target glass"><span className="target-label">Objetivo</span><Board positions={toPos(MOVE_TARGET)} interactive={false} scale={0.4} /></div>
            <Board positions={toPos(demo)} selected={selected} targets={moveTargets} correct={tutCorrect(MOVE_TARGET)} onTileClick={moveStepClick} spark={spark} />
            <p className={"tut-lead" + (done ? " tut-ok" : hint ? " tut-warn" : "")}>
              {done
                ? "¡Bien! Cada movimiento que haces cuenta. 🌟"
                : hint || "Toca el Rey 👑 (verás sus casillas, se mueve como en ajedrez) y llévalo a la casilla brillante."}
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="tut-block">
            <h2 className="tut-h">🔄 Girar y reflejar</h2>
            <div className="target glass"><span className="target-label">Objetivo</span><Board positions={toPos(ROT_TARGET)} interactive={false} scale={0.4} /></div>
            <Board positions={toPos(demo)} selected={selected} correct={tutCorrect(ROT_TARGET)} onTileClick={rotStepClick} spinTick={spin.tick} spinOp={spin.op} />
            <p className={"tut-lead" + (done ? " tut-ok" : hint ? " tut-warn" : "")}>
              {done
                ? "¡Genial! Giraste TODO el tablero de una. A veces es más rápido que mover pieza por pieza. 🎉"
                : hint || "A veces conviene girar todo el tablero. Para este objetivo, pulsa ⟳ (girar a la derecha)."}
            </p>
            <div className="ops">
              {(["rotCW", "rotCCW", "mirrorH", "mirrorV"] as Op[]).map((op) => (
                <button key={op} className="op-btn" onClick={() => tutOp(op)} disabled={done}><OpIcon op={op} /></button>
              ))}
            </div>
            <p className="tut-legend">Los 2 primeros <b>giran</b> el tablero; los otros lo <b>reflejan</b> (espejo, en diagonal). Cada uno cuenta como <b>1 movimiento</b>.</p>
          </div>
        )}

        {step === 4 && (
          <div className="tut-block">
            <h2 className="tut-h">🏆 ¿Cómo se gana?</h2>
            <div className="hero-gems"><span><Piece type="K" size={76} /></span></div>
            <p className="tut-lead">Gana quien llega al objetivo en <b>menos movimientos</b>. Arriba siempre ves tu <b>contador</b>.<br /><br /><b>Combina</b> mover piezas y girar el tablero para lograrlo en la <b>menor cantidad</b>.<br /><br />En <b>Modo infinito</b>, hacerlo en el <b>mínimo posible</b> te da una <b>⭐</b>.</p>
          </div>
        )}

        {step === 5 && (
          <div className="tut-block tut-final">
            <div className="overlay-emoji" style={{ fontSize: 54 }}>🌟</div>
            <h1 className="tut-title">¡Listo!</h1>
            <p className="tut-lead">Ya sabes lo esencial:<br />igualar el objetivo en los <b>menos movimientos</b>, moviendo piezas y girando el tablero.<br /><br />¡Probemos!</p>
            <button className="big-btn" onClick={onClose}>¡Probemos! →</button>
          </div>
        )}
      </div>

      {step < TOTAL - 1 && (
        <div className="tut-nav">
          <button className="menu-btn" onClick={prev} disabled={step === 0} style={{ opacity: step === 0 ? 0.4 : 1 }}>← Atrás</button>
          {(![2, 3].includes(step) || done) && (
            <button className="bid-go" onClick={next}>{step === 0 ? "Empezar →" : "Siguiente →"}</button>
          )}
        </div>
      )}
      </FitScreen>
    </div>
  );
}
