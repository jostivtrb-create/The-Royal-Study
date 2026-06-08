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
const MAIN: Screen[] = ["home", "game", "solo"]; // pantallas restaurables al recargar

export default function App() {
  const sess = loadSession();
  const savedScreen = (sess?.screen as Screen) ?? "home";
  const [screen, setScreen] = useState<Screen>(MAIN.includes(savedScreen) ? savedScreen : "home");
  const [players, setPlayers] = useState<string[]>(sess?.players ?? ["Jugador 1", "Jugador 2"]);
  // A dónde ir cuando termina/salta el tutorial.
  const afterTut = useRef<Screen>("solo");

  useEffect(() => {
    initSettings();
  }, []);

  // Guarda la sesión solo de pantallas principales (las de menú/transitorias no).
  useEffect(() => {
    saveSession({ screen: MAIN.includes(screen) ? screen : "home", players });
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
  // Volver al inicio reemplazando la entrada actual (sin dejarla en el historial).
  const toHome = () => {
    setScreen("home");
    history.replaceState({ screen: "home" }, "");
  };

  const exitGame = () => {
    clearGame();
    toHome();
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
          if (afterTut.current === "solo") go("solo");
          else toHome();
        }}
      />
    );
  if (screen === "multiplayer") return <Multiplayer onBack={toHome} onLocal={() => go("setup")} />;
  if (screen === "setup")
    return (
      <Setup
        onBack={toHome}
        onStart={(names) => {
          setPlayers(names);
          clearGame();
          go("game");
        }}
      />
    );
  if (screen === "game") return <Duel players={players} onExit={exitGame} />;
  if (screen === "solo") return <Solo onExit={toHome} />;
  if (screen === "settings") return <Settings onBack={toHome} />;
  return (
    <Home
      onSolo={playSolo}
      onMultiplayer={() => go("multiplayer")}
      onTutorial={openTutorial}
      onSettings={() => go("settings")}
    />
  );
}
