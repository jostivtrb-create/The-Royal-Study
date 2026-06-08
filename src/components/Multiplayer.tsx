import { sfx } from "../game/sfx";

export default function Multiplayer({ onLocal }: { onLocal: () => void }) {
  return (
    <div className="app app--center screen-in">
      <header className="title">
        <h1>Multiplayer</h1>
        <p>Elige cómo jugar con otros</p>
      </header>

      <nav className="menu">
        <button
          className="menu-btn menu-btn--primary"
          onClick={() => { sfx.bid(); onLocal(); }}
        >
          <span className="menu-ic">👥</span> Local (mismo dispositivo)
        </button>
        <button className="menu-btn menu-btn--disabled" disabled>
          <span className="menu-ic">⚡</span> Online <span className="soon">Próximamente</span>
        </button>
      </nav>

      <p className="home-foot">El modo online llegará pronto. ✨</p>
    </div>
  );
}
