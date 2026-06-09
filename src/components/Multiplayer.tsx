import { sfx } from "../game/sfx";

export default function Multiplayer({ onBack, onLocal, onOnline }: { onBack: () => void; onLocal: () => void; onOnline: () => void }) {
  return (
    <div className="app app--center screen-in">
      <button className="back-fab glass" onClick={onBack} aria-label="Volver">←</button>
      <header className="title">
        <h1>Multiplayer</h1>
        <p>Elige cómo jugar con otros</p>
      </header>

      <nav className="menu">
        <button className="menu-btn menu-btn--primary" onClick={() => { sfx.bid(); onLocal(); }}>
          <span className="menu-ic">👥</span> Local (mismo dispositivo)
        </button>
        <button className="menu-btn" onClick={() => { sfx.bid(); onOnline(); }}>
          <span className="menu-ic">⚡</span> Online (con código)
        </button>
      </nav>

      <p className="home-foot">Juega online con amigos usando un código de sala. ✨</p>
    </div>
  );
}
