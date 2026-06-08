import { useEffect, useRef, useState } from "react";
import Home from "./components/Home";
import Setup from "./components/Setup";
import Duel from "./components/Duel";
import Solo from "./components/Solo";
import Multiplayer from "./components/Multiplayer";
import Settings from "./components/Settings";
import Tutorial from "./components/Tutorial";
import { initSettings } from "./game/settings";
import { loadSession, saveSession, clearGame, tutorialSeen, markTutorialSeen } from "./game/persist";

type Screen = "home" | "setup" | "game" | "solo" | "multiplayer" | "settings" | "tutorial";

export default function App() {
  const sess = loadSession();
  const savedScreen = (sess?.screen as Screen) ?? "home";
  const [screen, setScreen] = useState<Screen>(savedScreen === "tutorial" ? "home" : savedScreen);
  const [players, setPlayers] = useState<string[]>(sess?.players ?? ["Jugador 1", "Jugador 2"]);
  // A dónde ir cuando termina/salta el tutorial.
  const afterTut = useRef<Screen>("solo");

  useEffect(() => {
    initSettings();
  }, []);

  // Guarda la sesión (no persiste pantallas transitorias como el tutorial).
  useEffect(() => {
    if (screen !== "tutorial") saveSession({ screen, players });
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
  const back = () => history.back();

  const exitGame = () => {
    clearGame();
    go("home");
  };

  // "Jugar solo": la primera vez muestra el tutorial; luego va directo.
  const playSolo = () => {
    if (!tutorialSeen()) {
      afterTut.current = "solo";
      go("tutorial");
    } else {
      go("solo");
    }
  };
  const openTutorial = () => {
    afterTut.current = "home";
    go("tutorial");
  };

  if (screen === "tutorial")
    return (
      <Tutorial
        onClose={() => {
          markTutorialSeen();
          go(afterTut.current);
        }}
      />
    );
  if (screen === "multiplayer") return <Multiplayer onLocal={() => go("setup")} />;
  if (screen === "setup")
    return (
      <Setup
        onStart={(names) => {
          setPlayers(names);
          clearGame();
          go("game");
        }}
      />
    );
  if (screen === "game") return <Duel players={players} onExit={exitGame} />;
  if (screen === "solo") return <Solo onExit={back} />;
  if (screen === "settings") return <Settings />;
  return (
    <Home
      onSolo={playSolo}
      onMultiplayer={() => go("multiplayer")}
      onTutorial={openTutorial}
      onSettings={() => go("settings")}
    />
  );
}
