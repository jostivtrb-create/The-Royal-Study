import { useSettings, type Orientation } from "../game/settings";
import { sfx } from "../game/sfx";
import { haptics } from "../game/haptics";

export default function Settings({ onBack }: { onBack: () => void }) {
  const [s, set] = useSettings();

  const toggleSound = () => {
    set({ sound: !s.sound });
    if (!s.sound) sfx.tap(); // suena al activarlo
  };
  const toggleVibration = () => {
    set({ vibration: !s.vibration });
    if (!s.vibration) haptics.light();
  };
  const setOrientation = (o: Orientation) => {
    set({ orientation: o });
    sfx.tap();
  };

  return (
    <div className="app app--center screen-in">
      <button className="back-fab glass" onClick={onBack} aria-label="Volver">←</button>
      <header className="title"><h1>Ajustes</h1></header>

      <div className="settings glass">
        <Row label="Sonido" desc="Efectos suaves del juego">
          <Switch on={s.sound} onClick={toggleSound} />
        </Row>
        <Row label="Vibración" desc="Respuesta háptica al tocar">
          <Switch on={s.vibration} onClick={toggleVibration} />
        </Row>
        <Row label="Orientación" desc="Cómo se muestra la pantalla">
          <div className="seg">
            {(["auto", "portrait", "landscape"] as Orientation[]).map((o) => (
              <button
                key={o}
                className={"seg-btn" + (s.orientation === o ? " seg-btn--on" : "")}
                onClick={() => setOrientation(o)}
              >
                {o === "auto" ? "Auto" : o === "portrait" ? "Vertical" : "Horizontal"}
              </button>
            ))}
          </div>
        </Row>
      </div>

      <p className="settings-note">
        Idioma: Español · El bloqueo de orientación funciona mejor con la app instalada.
      </p>
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="set-row">
      <div className="set-text">
        <div className="set-label">{label}</div>
        <div className="set-desc">{desc}</div>
      </div>
      {children}
    </div>
  );
}

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button className={"switch" + (on ? " switch--on" : "")} onClick={onClick} aria-pressed={on}>
      <span className="switch-knob" />
    </button>
  );
}
