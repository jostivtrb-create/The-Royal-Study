import { useEffect, useState } from "react";
import Home from "./components/Home";
import Duel from "./components/Duel";
import Settings from "./components/Settings";
import { initSettings } from "./game/settings";

type Screen = "home" | "game" | "settings";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");

  useEffect(() => {
    initSettings();
  }, []);

  if (screen === "game") return <Duel onExit={() => setScreen("home")} />;
  if (screen === "settings") return <Settings onBack={() => setScreen("home")} />;
  return (
    <Home
      onPlayLocal={() => setScreen("game")}
      onSettings={() => setScreen("settings")}
    />
  );
}
