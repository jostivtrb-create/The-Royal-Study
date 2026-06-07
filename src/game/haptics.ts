// Vibración háptica sutil (donde el dispositivo lo soporte).
let enabled = true;

export function setHapticsEnabled(v: boolean) {
  enabled = v;
}

function vibe(pattern: number | number[]) {
  if (!enabled) return;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* no-op */
    }
  }
}

export const haptics = {
  light: () => vibe(8),
  move: () => vibe(14),
  success: () => vibe([16, 40, 24]),
  fail: () => vibe(60),
  win: () => vibe([24, 50, 24, 50, 40]),
};
