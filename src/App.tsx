import { useEffect, useState } from "react";
import Home from "./components/Home";
import Setup from "./components/Setup";
import Duel from "./components/Duel";
import Settings from "./components/Settings";
import { initSettings } from "./game/settings";

type Screen = "home" | "setup" | "game" | "settings";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [players, setPlayers] = useState<string[]>(["Jugador 1", "Jugador 2"]);

  useEffect(() => {
    initSettings();
  }, []);

  // Navegación con el botón "atrás" del navegador (no cierra la app).
  useEffect(() => {
    history.replaceState({ screen: "home" }, "");
    const onPop = (e: PopStateEvent) =>
      setScreen(((e.state && e.state.screen) as Screen) ?? "home");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Avanza a una pantalla agregando una entrada al historial.
  const go = (to: Screen) => {
    setScreen(to);
    history.pushState({ screen: to }, "");
  };
  // Vuelve a la pantalla anterior (equivale al botón atrás del navegador).
  const back = () => history.back();

  if (screen === "setup")
    return (
      <Setup
        onStart={(names) => {
          setPlayers(names);
          go("game");
        }}
      />
    );
  if (screen === "game")
    return <Duel players={players} onExit={back} />;
  if (screen === "settings") return <Settings />;
  return (
    <Home onPlayLocal={() => go("setup")} onSettings={() => go("settings")} />
  );
}
