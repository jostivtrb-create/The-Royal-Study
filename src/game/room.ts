// Capa de sala online: interfaz común con dos backends intercambiables —
// Firebase Realtime DB (online real) y un backend local entre pestañas (pruebas).
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, onValue, get as dbGet, runTransaction } from "firebase/database";
import type { Placement } from "./engine";

export type Status = "lobby" | "playing" | "results" | "ended";
export type PlayerInfo = { name: string; score: number; order: number };
export type RoundResult = { solved: boolean; moves: number };

export type RoomState = {
  code: string;
  hostId: string;
  status: Status;
  round: number;
  totalRounds: number;
  players: Record<string, PlayerInfo>;
  start?: Placement;
  target?: Placement;
  min?: number;
  roundStartAt?: number; // epoch ms; durante (now < roundStartAt) = cuenta 3·2·1
  results?: Record<string, RoundResult>;
  ready?: Record<string, boolean>;
  scored?: boolean;
};

export const ROUND_MS = 60000;
export const COUNTDOWN_MS = 3000;
export const MAX_PLAYERS = 4;

// ---------- Config Firebase (por variables de entorno) ----------
const env = import.meta.env as Record<string, string | undefined>;
const fb = {
  apiKey: env.VITE_FB_API_KEY,
  authDomain: env.VITE_FB_AUTH_DOMAIN,
  databaseURL: env.VITE_FB_DB_URL,
  projectId: env.VITE_FB_PROJECT_ID,
  appId: env.VITE_FB_APP_ID,
};
export const firebaseReady = !!(fb.apiKey && fb.databaseURL);

function fbDb() {
  const app = getApps().length ? getApps()[0] : initializeApp(fb);
  return getDatabase(app);
}

// ---------- Interfaz de backend ----------
type Mutator = (s: RoomState) => RoomState | undefined;
interface Backend {
  exists(code: string): Promise<boolean>;
  init(code: string, state: RoomState): Promise<void>;
  subscribe(code: string, cb: (s: RoomState | null) => void): () => void;
  mutate(code: string, fn: Mutator): Promise<void>;
}

// ---------- Backend Firebase ----------
const firebaseBackend: Backend = {
  async exists(code) {
    const snap = await dbGet(ref(fbDb(), `rooms/${code}`));
    return snap.exists();
  },
  async init(code, state) {
    await runTransaction(ref(fbDb(), `rooms/${code}`), () => state);
  },
  subscribe(code, cb) {
    const r = ref(fbDb(), `rooms/${code}`);
    const off = onValue(r, (snap) => cb((snap.val() as RoomState) ?? null));
    return off;
  },
  async mutate(code, fn) {
    await runTransaction(ref(fbDb(), `rooms/${code}`), (cur) => {
      if (!cur) return cur;
      const next = fn(cur as RoomState);
      return next === undefined ? cur : next;
    });
  },
};

// ---------- Backend local (BroadcastChannel + localStorage) ----------
const KEY = (code: string) => `tre-room:${code}`;
const readLS = (code: string): RoomState | null => {
  try {
    return JSON.parse(localStorage.getItem(KEY(code)) || "null");
  } catch {
    return null;
  }
};
const channelBackend: Backend = {
  async exists(code) {
    return !!readLS(code);
  },
  async init(code, state) {
    localStorage.setItem(KEY(code), JSON.stringify(state));
    new BroadcastChannel(`tre-room-${code}`).postMessage("changed");
  },
  subscribe(code, cb) {
    const bc = new BroadcastChannel(`tre-room-${code}`);
    const emit = () => cb(readLS(code));
    bc.onmessage = emit;
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY(code)) emit();
    };
    window.addEventListener("storage", onStorage);
    emit();
    return () => {
      bc.close();
      window.removeEventListener("storage", onStorage);
    };
  },
  async mutate(code, fn) {
    const cur = readLS(code);
    if (!cur) return;
    const next = fn(cur);
    const val = next === undefined ? cur : next;
    localStorage.setItem(KEY(code), JSON.stringify(val));
    new BroadcastChannel(`tre-room-${code}`).postMessage("changed");
  },
};

export const backend: Backend = firebaseReady ? firebaseBackend : channelBackend;
export const usingFirebase = firebaseReady;

// ---------- Utilidades ----------
export function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin caracteres ambiguos
  let c = "";
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

export function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return "p" + Math.random().toString(36).slice(2, 10);
  }
}

/** Aplica el puntaje de la ronda según los resultados. */
export function scoreRound(players: Record<string, PlayerInfo>, results: Record<string, RoundResult>) {
  const ids = Object.keys(players);
  const solvers = ids.filter((id) => results[id]?.solved);
  const minMoves = solvers.length ? Math.min(...solvers.map((id) => results[id].moves)) : 0;
  const out: Record<string, PlayerInfo> = {};
  for (const id of ids) {
    let delta = 0;
    const r = results[id];
    if (r?.solved) {
      delta = 3;
      if (solvers.length >= 2 && r.moves === minMoves) delta += 1; // bonus solo si ≥2 resolvieron
    } else {
      delta = -1;
    }
    out[id] = { ...players[id], score: players[id].score + delta };
  }
  return out;
}
