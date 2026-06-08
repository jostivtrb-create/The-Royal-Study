# 🔮 The Royal Enchanted — Qué es esta versión y por qué es un juego propio

> Resumen del concepto, sus diferencias con el juego de mesa que lo inspiró, la
> nota sobre derechos de autor, y una explicación clara de la mecánica.
>
> ⚠️ *Nota: la sección legal es información general, no asesoría jurídica.*

---

## 1. Qué es

**The Royal Enchanted** es un **juego digital de puzzles de lógica** (PWA
instalable en el celular) ambientado en un **tablero 3×3 de cristal** con
piezas-gema de estilo místico/arcano. No es ajedrez: usa **piezas y movimientos
de ajedrez** como "vocabulario", pero el objetivo es otro — **reordenar las
piezas para igualar una figura objetivo en la menor cantidad de movimientos**.

Está **inspirado libremente** en el juego de mesa físico *The Royal Study*
(diseñado por Stan van Rooijen, editado por Philos), pero es una **obra
independiente y original** en nombre, arte, código, presentación y varias reglas.

---

## 2. En qué se diferencia del juego físico

| Aspecto | Juego físico (*The Royal Study*) | Esta versión (*The Royal Enchanted*) |
|---|---|---|
| **Formato** | Tablero y piezas reales de madera/cartón | App digital (PWA), pantalla táctil |
| **Nombre** | The Royal Study | The Royal Enchanted (nombre propio) |
| **Estética** | Accesorio de ajedrez clásico | Mística/arcana: cristal morado, piezas-gema de colores, animaciones, sonido |
| **Cómo se sabe el mínimo** | Lo estiman los jugadores (humano) | Lo **calcula la app** al instante (búsqueda BFS exacta) |
| **Generación** | Cartas/posiciones predefinidas | **Aleatoria e infinita**, con validación de que sea resoluble |
| **Modo solitario** | Resolver cartas | **Modo infinito** con **estrellas**, "canjear el mínimo", solución óptima paso a paso |
| **Transformar el tablero** | Rotar/reflejar la carta objetivo | **Giras/volteas tu propio tablero** (animación de órbita), cuesta 1 movimiento |
| **Multijugador** | 2 jugadores | **2 a 6 jugadores** locales, con apuesta, "rebatir" y relevo |
| **Extras digitales** | — | Ayudas visuales (destinos válidos en verde, bloqueados en rojo, casillas correctas en dorado), continuidad entre rondas, guardado, tutorial interactivo |

En resumen: tomamos **la idea base** (un puzzle de "llegar al objetivo en los
menos movimientos" con piezas de ajedrez) y construimos **otro juego** alrededor,
con reglas, modos, arte y experiencia propios.

---

## 3. Por qué es un juego propio y sin problemas de derechos de autor

- **El ajedrez es de dominio público.** Sus piezas y movimientos no pertenecen a
  nadie; cualquiera puede usarlos.
- **Las mecánicas y reglas de un juego, como ideas, no están protegidas por
  derechos de autor.** El copyright protege la **expresión concreta** (textos del
  reglamento, ilustraciones, nombre/marca, diseño gráfico), no la idea de "ordena
  piezas en los menos movimientos".
- **Todo lo concreto de nuestra versión es original y hecho por nosotros:**
  - Nombre propio (*The Royal Enchanted*).
  - Arte propio (piezas e íconos dibujados en SVG, paleta, fondo, animaciones).
  - Código propio (motor, interfaz, sonidos sintetizados).
  - Reglas/modos propios o modificados (sistema de estrellas, canjear el mínimo,
    apuesta/rebatir/relevo, modo infinito, giro del tablero, etc.).
- **No copiamos** el reglamento, las ilustraciones, el nombre ni la marca del
  juego físico, ni decimos estar afiliados a él.

**Buenas prácticas que ya seguimos / conviene mantener:**
1. Mantener **nombre y arte propios** (no usar "The Royal Study" ni su imagen).
2. No reproducir textos/ilustraciones del producto original.
3. No insinuar afiliación o respaldo del autor/editor original.
4. (Opcional) En la ficha, describirlo como "inspirado en el ajedrez", sin
   nombrar el juego físico.

> Esto es orientación general; si se monetiza a gran escala, una revisión legal
> rápida nunca está de más.

---

## 4. La mecánica, explicada

### El tablero y las piezas
- Un **tablero 3×3** (9 casillas) de cristal, en perspectiva isométrica.
- **5 piezas** únicas, cada una con su color-gema: **Rey** (amatista), **Dama**
  (rosa), **Torre** (zafiro), **Alfil** (esmeralda) y **Caballo** (ámbar).

### El objetivo
Arriba se muestra una **figura objetivo** (cómo deben quedar las piezas). Tu meta
es **dejar tu tablero igual al objetivo** usando **la menor cantidad de
movimientos** posible.

### Qué cuenta como "1 movimiento"
1. **Mover una pieza** según el ajedrez (en el 3×3): el Rey 1 casilla; la Torre en
   línea; el Alfil en diagonal; la Dama en línea o diagonal; el Caballo en "L".
   Las piezas se mueven **solo a casillas vacías** y **no atraviesan** otras
   (salvo el Caballo, que salta). *(En 3×3, el Caballo nunca ocupa el centro
   porque quedaría sin movimientos.)*
2. **Girar o voltear TODO el tablero** (⟳ ⟲ y espejos diagonales): rota/refleja
   tus piezas como una unidad. A veces resolver "girando" es más corto que mover
   pieza por pieza.

Ayudas visuales al seleccionar una pieza: **verde** = casillas a las que puede
ir; **rojo** = al alcance pero bloqueadas por otra ficha; **dorado** = piezas que
ya están en su lugar correcto.

### Modo infinito (1 jugador)
- Puzzles **aleatorios sin fin**; las piezas se **conservan** de un puzzle al
  siguiente (solo cambia el objetivo).
- La app conoce el **mínimo exacto** (oculto). Tú resuelves y decides
  **Confirmar** o **Reintentar**.
- **Estrellas:** resolver en el mínimo = **+3 ⭐**; fallar o rendirse = **−1 ⭐**.
- **Canjear el mínimo:** puedes pedir que te lo revele a cambio de **−1 ⭐**; si
  luego ganas, ganas **+2** (en vez de +3).
- Si no lo logras, puedes ver la **solución óptima paso a paso**.

### Multijugador local (2–6 jugadores)
- Se genera un objetivo. El **primero en reaccionar** declara en cuántos
  movimientos cree resolverlo.
- En **20 segundos**, **un** rival puede **rebatir** con un número menor y
  quitarle el turno.
- Quien tenga la apuesta más baja **ejecuta**. Si lo logra en ≤ su apuesta, gana
  el punto.
- Si **el que rebatió falla**, pierde 1 punto, **se reinicia el puzzle** y le toca
  al que apostó primero (con su número). Si ese también falla, pierde 1 punto.
- Las piezas se conservan entre rondas. Gana quien tenga más puntos tras
  **10 rondas**.

### El "cerebro" del juego
Un motor propio calcula el **camino más corto exacto** mediante una búsqueda en
anchura (BFS) sobre el pequeño espacio de estados del 3×3 — es **instantáneo** y
considera también los giros/volteos y su coste. Por eso siempre sabe el mínimo y
puede mostrarte la solución óptima.
