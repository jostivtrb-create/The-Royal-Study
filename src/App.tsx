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

  if (screen === "setup")
    return (
      <Setup
        onBack={() => setScreen("home")}
        onStart={(names) => {
          setPlayers(names);
          setScreen("game");
        }}
      />
    );
  if (screen === "game")
    return <Duel players={players} onExit={() => setScreen("home")} />;
  if (screen === "settings")
    return <Settings onBack={() => setScreen("home")} />;
  return (
    <Home
      onPlayLocal={() => setScreen("setup")}
      onSettings={() => setScreen("settings")}
    />
  );
}
