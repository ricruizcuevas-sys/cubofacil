// How each turn is said, always looking at the cube from the front (as in the printed guide).
import { COLOR_NAME } from "./cube.js";

export const WORD = {
  R: "La derecha, hacia arriba", "R'": "La derecha, hacia abajo", R2: "La derecha, media vuelta (dos giros)",
  L: "La izquierda, hacia abajo", "L'": "La izquierda, hacia arriba", L2: "La izquierda, media vuelta (dos giros)",
  U: "La de arriba, hacia la izquierda", "U'": "La de arriba, hacia la derecha", U2: "La de arriba, media vuelta (dos giros)",
  D: "La de abajo, hacia la derecha", "D'": "La de abajo, hacia la izquierda", D2: "La de abajo, media vuelta (dos giros)",
  F: "La de delante, como las agujas del reloj", "F'": "La de delante, al revés que las agujas del reloj", F2: "La de delante, media vuelta (dos giros)",
};

/** Turns of the whole cube in the hand (no layer moves). */
export const CUBE_WORD = {
  y: "Gira el cubo entero hacia la izquierda: lo de la derecha pasa delante",
  "y'": "Gira el cubo entero hacia la derecha: lo de la izquierda pasa delante",
  y2: "Gira el cubo entero media vuelta: lo de detrás pasa delante",
  x: "Vuelca el cubo hacia atrás: lo de delante pasa arriba",
  "x'": "Vuelca el cubo hacia ti: lo de arriba pasa delante",
  x2: "Dale la vuelta al cubo de delante hacia atrás: lo de arriba pasa abajo",
  z: "Tumba el cubo hacia la derecha: lo de la izquierda pasa arriba",
  "z'": "Tumba el cubo hacia la izquierda: lo de la derecha pasa arriba",
  z2: "Dale la vuelta al cubo de lado: lo de arriba pasa abajo",
};

/** «blanca, verde y roja» for a piece given by its colours (white and yellow first). */
export function pieceName(colors) {
  const order = "WYGBOR";
  const names = [...colors].sort((a, b) => order.indexOf(a) - order.indexOf(b)).map((c) => COLOR_NAME[c]);
  return names.length > 1 ? names.slice(0, -1).join(", ") + " y " + names[names.length - 1] : names[0];
}

const MASC = { W: "blanco", Y: "amarillo", G: "verde", B: "azul", O: "naranja", R: "rojo" };
/** «el centro verde». */
export const centreName = (c) => `el centro ${MASC[c]}`;
export const colorWord = (c) => MASC[c];
