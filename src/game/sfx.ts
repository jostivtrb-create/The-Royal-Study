// Efectos de sonido sintetizados con Web Audio (sin archivos). Suaves, sin música.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

type ToneOpts = {
  freq: number;
  to?: number; // glide de frecuencia
  dur?: number;
  type?: OscillatorType;
  vol?: number;
  delay?: number;
};

function tone({ freq, to, dur = 0.12, type = "sine", vol = 0.3, delay = 0 }: ToneOpts) {
  const c = ac();
  if (!c || !master || !enabled) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  tap: () => tone({ freq: 660, dur: 0.05, type: "triangle", vol: 0.18 }),
  move: () => tone({ freq: 340, to: 240, dur: 0.13, type: "triangle", vol: 0.26 }),
  bid: () => tone({ freq: 880, to: 1100, dur: 0.09, type: "sine", vol: 0.22 }),
  flip: () => {
    tone({ freq: 500, to: 760, dur: 0.1, type: "sine", vol: 0.2 });
  },
  tick: () => tone({ freq: 1000, dur: 0.035, type: "square", vol: 0.12 }),
  success: () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone({ freq: f, dur: 0.22, type: "sine", vol: 0.28, delay: i * 0.07 }),
    );
  },
  fail: () => {
    tone({ freq: 240, to: 130, dur: 0.34, type: "sawtooth", vol: 0.22 });
  },
  win: () => {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      tone({ freq: f, dur: 0.3, type: "sine", vol: 0.3, delay: i * 0.1 }),
    );
  },
};
