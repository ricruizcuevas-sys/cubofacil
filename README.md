# CuboFácil

Aprende a resolver el cubo de Rubik 3x3 con el **método por capas para principiantes**: 7 pasos que sirven para cualquier cubo.

En cada lección verás:
- qué hay que conseguir;
- cómo sujetar el cubo;
- los casos que te puedes encontrar;
- los giros de cada caso, animados sobre un cubo en 3D.

Después practicas con un cubo mezclado al azar. La app te dice en qué caso estás y te da pistas.

- En castellano y pensada para el móvil.
- Los giros se explican con palabras («gira la cara de la derecha hacia arriba») y una flecha sobre el cubo, sin notación.
- Funciona sin internet una vez abierta.
- Sin dependencias ni compilación: HTML, CSS y JavaScript.

## Las 7 lecciones

1. Cruz blanca
2. Esquinas blancas
3. Segunda capa
4. Cruz amarilla
5. Aristas amarillas en su sitio
6. Esquinas amarillas en su sitio
7. Girar las esquinas amarillas

Además:
- un cubo resuelto de principio a fin;
- una chuleta con todos los algoritmos.

## Guía en PDF

[guia/CuboFacil-guia.pdf](guia/CuboFacil-guia.pdf): los 7 pasos para imprimir. Cada giro va con su dibujo y su explicación.

Los dibujos salen del mismo modelo del cubo que usa la app, y cada ejemplo se comprueba al generar la guía. Para regenerarla: `node guia/build.mjs` crea `guia/guia.html`, y después se imprime a PDF en A4.

## Cómo funciona por dentro

- `js/cube.js`: el modelo del cubo (54 pegatinas con su posición, orientación y color) y los giros.
- `js/solver.js`: el método por capas sobre el estado real del cubo. Reconoce cada caso y usa su algoritmo. No hay cubos de ejemplo pintados a mano.
- `js/view.js`: el cubo en 3D con CSS (giros animados y flecha que indica el sentido).
- `js/lessons.js` y `js/words.js`: los textos de las lecciones y cómo se dice cada giro.
- `js/app.js`: las pantallas (lecciones, práctica, cubo entero y chuleta).

## Probarla

Sirve la carpeta con cualquier servidor estático y abre `index.html`. Por ejemplo:

```
npx serve .
```

## Pruebas

```
npm test
```

Las pruebas resuelven 500 cubos mezclados al azar, paso a paso, y comprueban dos cosas:
- que cada paso queda hecho de verdad y no deshace los anteriores;
- que en la práctica, pulsando «Muéstramelo» hasta el final, se completa cada lección.

## Licencia

MIT. Consulta [LICENSE](LICENSE).
