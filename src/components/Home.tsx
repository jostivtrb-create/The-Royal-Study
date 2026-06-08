import Piece from "./Piece";

type Props = {
  onPlayLocal: () => void;
  onSolo?: () => void;
  onTutorial?: () => void;
  onPlayOnline?: () => void;
  onSettings?: () => void;
};

export default function Home({ onPlayLocal, onSolo, onTutorial, onPlayOnline, onSettings }: Props) {
  return (
    <div className="app home screen-in">
      {/* Emblema: corona de gemas flotantes */}
      <div className="hero">
        <div className="hero-gems">
          <span style={{ animationDelay: "0s" }}>
            <Piece type="N" size={56} />
          </span>
          <span style={{ animationDelay: "0.3s" }}>
            <Piece type="Q" size={68} />
          </span>
          <span style={{ animationDelay: "0.15s" }}>
            <Piece type="K" size={92} />
          </span>
          <span style={{ animationDelay: "0.45s" }}>
            <Piece type="R" size={68} />
          </span>
          <span style={{ animationDelay: "0.6s" }}>
            <Piece type="B" size={56} />
          </span>
        </div>
      </div>

      <header className="title home-title">
        <h1>The Royal Enchanted</h1>
        <p>Duelo de puzzles de ajedrez místico</p>
      </header>

      <nav className="menu">
        <button className="menu-btn menu-btn--primary" onClick={onPlayLocal}>
          <span className="menu-ic">✦</span> Jugar local
        </button>
        <button className="menu-btn" onClick={onSolo}>
          <span className="menu-ic">♾️</span> Modo infinito
        </button>
        <button className="menu-btn" onClick={onPlayOnline}>
          <span className="menu-ic">⚡</span> Jugar en línea
        </button>
        <button className="menu-btn" onClick={onTutorial}>
          <span className="menu-ic">📖</span> Cómo jugar
        </button>
        <button className="menu-btn" onClick={onSettings}>
          <span className="menu-ic">⚙</span> Ajustes
        </button>
      </nav>

      <p className="home-foot">v0.1 · prototipo</p>
    </div>
  );
}
