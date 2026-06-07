// Tipos de pieza del juego. En "The Royal Enchanted" hay un único set de 5
// piezas compartidas (como en el juego de mesa original): no son dos ejércitos.
export type PieceType = "K" | "Q" | "R" | "B" | "N";

export const PIECE_ORDER: PieceType[] = ["K", "Q", "R", "B", "N"];

export const PIECE_NAME_ES: Record<PieceType, string> = {
  K: "Rey",
  Q: "Dama",
  R: "Torre",
  B: "Alfil",
  N: "Caballo",
};
