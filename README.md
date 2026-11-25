# CuboFácil

Aprende a resolver el cubo de Rubik 3x3 con el **método por capas para principiantes**: 7 pasos que sirven para cualquier cubo.

Tiene tres partes:

- **Resolver mi cubo.** Haces 2 fotos de tu cubo, cada una con tres caras. La app lee los colores en el propio móvil, sin enviar las fotos a ningún sitio. Después te deja repasarlos casilla a casilla y comprueba que ese cubo puede existir. Por último te guía con **tu** cubo, giro a giro.
- **Los 7 pasos.** Cada paso se explica como en la guía y se practica con un cubo de ejemplo.
- **Guía en PDF** para imprimir.

Cómo se sigue cada giro:
- un giro cada vez: lees el giro, miras la flecha sobre el cubo 3D, lo haces y pulsas «Hecho»; nada se mueve solo;
- también te dice cuándo girar el cubo entero en la mano, no solo una capa;
- las piezas que no importan en ese momento salen en gris, y la que estás colocando, con borde rosa;
- recuerda por dónde ibas, aunque cierres la app.

Además:
- en castellano y pensada para el móvil;
- funciona sin internet una vez abierta;
- sin dependencias ni compilación: HTML, CSS y JavaScript.

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
- `js/guided.js`: el método de la guía sobre cualquier cubo, tal como lo tienes en la mano. Encuentra cada color por los centros. Da una lista de pasos: giros de capa, giros del cubo entero y explicaciones.
- `js/photo.js`: la lectura de las fotos. Busca los cuadrados a partir de 7 puntos que marcas, mide sus colores y los reparte en 6 grupos de 9. Une las dos fotos probando las tres formas posibles de haber girado el cubo entre una y otra.
- `js/validate.js`: comprueba que el cubo puede existir. Mira que haya 9 casillas de cada color, que cada pieza exista y salga una sola vez, y que no haya giros ni cambios de piezas imposibles.
- `js/view.js`: el cubo en 3D con CSS. `js/draw.js`: los dibujos planos de la guía y de las lecciones.
- `js/app.js`: las pantallas.

## Probarla

Sirve la carpeta con cualquier servidor estático y abre `index.html`. Por ejemplo:

```
npx serve .
```

## Pruebas

```
npm test
```

Las pruebas comprueban tres cosas:
- 500 cubos mezclados al azar, cogidos de cualquier forma, se resuelven paso a paso, y cada paso queda hecho de verdad;
- los cubos imposibles se detectan y se explica por qué;
- dos fotos simuladas, con luz desigual y ruido, devuelven el mismo cubo.

## Licencia

MIT. Consulta [LICENSE](LICENSE).
