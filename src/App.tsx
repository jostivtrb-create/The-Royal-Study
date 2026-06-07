import { useState } from "react";
import Home from "./components/Home";
import Duel from "./components/Duel";

type Screen = "home" | "game";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");

  if (screen === "home") {
    return <Home onPlayLocal={() => setScreen("game")} />;
  }
  return <Duel onExit={() => setScreen("home")} />;
}
