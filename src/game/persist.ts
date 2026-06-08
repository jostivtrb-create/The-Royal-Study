// Persistencia de la sesión y la partida en localStorage (para resistir recargas).
const SESSION = "tre-session";
const GAME = "tre-game";

export type Session = { screen: string; players: string[] };

function read<T>(key: string): T | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(key) || "null") as T | null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* no-op */
  }
}

export const loadSession = () => read<Session>(SESSION);
export const saveSession = (s: Session) => write(SESSION, s);

// El estado de la partida se guarda/lee como objeto genérico.
export const loadGame = () => read<any>(GAME);
export const saveGame = (g: unknown) => write(GAME, g);
export const clearGame = () => {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(GAME);
  } catch {
    /* no-op */
  }
};
