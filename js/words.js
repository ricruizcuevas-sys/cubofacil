// How every turn is said in Spanish, with no letters or notation: the person holds the cube with
// one side in front and yellow up.
import { COLOR_NAME, FACE_COLOR, SIDES } from "./cube.js";

const TEXT = {
  R: ["Derecha arriba", "Gira la cara de la derecha hacia arriba"],
  "R'": ["Derecha abajo", "Gira la cara de la derecha hacia abajo"],
  L: ["Izquierda abajo", "Gira la cara de la izquierda hacia abajo"],
  "L'": ["Izquierda arriba", "Gira la cara de la izquierda hacia arriba"],
  U: ["Arriba a la izquierda", "Gira la capa de arriba hacia la izquierda"],
  "U'": ["Arriba a la derecha", "Gira la capa de arriba hacia la derecha"],
  D: ["Abajo a la derecha", "Gira la capa de abajo hacia la derecha"],
  "D'": ["Abajo a la izquierda", "Gira la capa de abajo hacia la izquierda"],
  F: ["Delante, como el reloj", "Gira la cara de delante como las agujas del reloj"],
  "F'": ["Delante, al revés del reloj", "Gira la cara de delante al revés que las agujas del reloj"],
  B: ["Atrás, arriba a la izquierda", "Gira la cara de atrás: su fila de arriba va hacia la izquierda"],
  "B'": ["Atrás, arriba a la derecha", "Gira la cara de atrás: su fila de arriba va hacia la derecha"],
};

const TWICE = {
  R: "Gira la cara de la derecha dos veces (media vuelta)",
  L: "Gira la cara de la izquierda dos veces (media vuelta)",
  U: "Gira la capa de arriba dos veces (media vuelta)",
  D: "Gira la capa de abajo dos veces (media vuelta)",
  F: "Gira la cara de delante dos veces (media vuelta)",
  B: "Gira la cara de atrás dos veces (media vuelta)",
};

const SHORT_TWICE = { R: "Derecha, dos veces", L: "Izquierda, dos veces", U: "Arriba, dos veces", D: "Abajo, dos veces", F: "Delante, dos veces", B: "Atrás, dos veces" };

/** { short, long } words for a turn as the person sees it. */
export function describe(token) {
  if (token.endsWith("2")) return { short: SHORT_TWICE[token[0]], long: TWICE[token[0]] };
  const [short, long] = TEXT[token];
  return { short, long };
}

/** «verde», «naranja»… of the side in front for a frame. */
export const frontColorName = (frame) => COLOR_NAME[FACE_COLOR[SIDES[frame]]];

export const holdText = (frame) =>
  `Gira el cubo entero para que la cara ${frontColorName(frame)} quede delante, con el amarillo arriba y el blanco abajo.`;

/** An algorithm in words: «Derecha arriba · Arriba a la izquierda · …». */
export const algWords = (moves) => moves.map((m) => describe(m).short).join(" · ");
