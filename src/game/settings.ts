// Ajustes persistentes (localStorage) y su aplicación a sonido/vibración/orientación.
import { useEffect, useState } from "react";
import { setSoundEnabled } from "./sfx";
import { setHapticsEnabled } from "./haptics";

export type Orientation = "auto" | "portrait" | "landscape";
export type Settings = {
  sound: boolean;
  vibration: boolean;
  orientation: Orientation;
};

const KEY = "tre-settings";
const DEFAULTS: Settings = { sound: true, vibration: true, orientation: "auto" };

function load(): Settings {
  if (typeof localStorage === "undefined") return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return DEFAULTS;
  }
}

let current: Settings = load();
const listeners = new Set<(s: Settings) => void>();

function applyOrientation(o: Orientation) {
  const so: any = typeof screen !== "undefined" ? (screen.orientation as any) : null;
  if (!so) return;
  try {
    if (o === "auto") so.unlock?.();
    else so.lock?.(o === "portrait" ? "portrait" : "landscape");
  } catch {
    /* el bloqueo solo funciona instalada/fullscreen; se ignora si no */
  }
}

export function getSettings(): Settings {
  return current;
}

export function setSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* no-op */
  }
  setSoundEnabled(current.sound);
  setHapticsEnabled(current.vibration);
  applyOrientation(current.orientation);
  listeners.forEach((l) => l(current));
}

// Aplica al cargar.
export function initSettings() {
  setSoundEnabled(current.sound);
  setHapticsEnabled(current.vibration);
  applyOrientation(current.orientation);
}

export function useSettings(): [Settings, (p: Partial<Settings>) => void] {
  const [s, setS] = useState(current);
  useEffect(() => {
    const l = (next: Settings) => setS(next);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return [s, setSettings];
}
