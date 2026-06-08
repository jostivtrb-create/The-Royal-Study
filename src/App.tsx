import { useEffect, useState } from "react";
import Home from "./components/Home";
import Setup from "./components/Setup";
import Duel from "./components/Duel";
import Settings from "./components/Settings";
import { initSettings } from "./game/settings";
import { loadSession, saveSession, clearGame } from "./game/persist";

type Screen = "home" | "setup" | "game" | "settings";

export default function App() {
  const sess = loadSession();
  const [screen, setScreen] = useState<Screen>((sess?.screen as Screen) ?? "home");
  const [players, setPlayers] = useState<string[]>(sess?.players ?? ["Jugador 1", "Jugador 2"]);

  useEffect(() => {
    initSettings();
  }, []);

  // Guarda la sesión (pantalla + jugadores) para sobrevivir recargas.
  useEffect(() => {
    saveSession({ screen, players });
  }, [screen, players]);

  // Navegación con el botón "atrás" del navegador (no cierra la app).
  useEffect(() => {
    history.replaceState({ screen: "home" }, "");
    if (screen !== "home") history.pushState({ screen }, "");
    const onPop = (e: PopStateEvent) =>
      setScreen(((e.state && e.state.screen) as Screen) ?? "home");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (to: Screen) => {
    setScreen(to);
    history.pushState({ screen: to }, "");
  };

  // Salir de la partida: limpia el guardado y vuelve al inicio.
  const exitGame = () => {
    clearGame();
    go("home");
  };

  if (screen === "setup")
    return (
      <Setup
        onStart={(names) => {
          setPlayers(names);
          clearGame(); // nueva partida → descarta la guardada
          go("game");
        }}
      />
    );
  if (screen === "game") return <Duel players={players} onExit={exitGame} />;
  if (screen === "settings") return <Settings />;
  return <Home onPlayLocal={() => go("setup")} onSettings={() => go("settings")} />;
}
