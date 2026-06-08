# 🔮 The Royal Enchanted

Duelo de puzzles de ajedrez místico en un tablero 3×3 de cristal. PWA instalable
en el celular. Inspirado libremente en el juego de mesa *The Royal Study*.

> Documento de diseño completo en [`docs/DISENO_DEL_JUEGO.md`](docs/DISENO_DEL_JUEGO.md).

## Cómo se juega (modo local, 2–6 jugadores)

1. Al inicio se elige la **cantidad de jugadores** (2–6) y, opcionalmente, sus nombres.
2. Cada ronda se genera un **objetivo** al azar (las piezas se conservan de la
   ronda anterior, dando continuidad).
3. **Carrera:** hay un **único botón** "¡Lo tengo!"; el primero en reaccionar lo
   pulsa y elige **quién fue**, luego apuesta en cuántos movimientos lo resuelve.
4. **Rebatir:** durante **20 s**, **un solo** jugador puede rebatir (el primero
   en pulsar "¡Yo lo mejoro!"): elige quién fue y apuesta un número menor; ese
   jugador pasa a ejecutar. Sin cadena. Si nadie rebate, ejecuta el que apostó.
5. **Ejecución:** mueve las piezas (reglas de ajedrez) y puede **rotar/voltear
   su propio tablero** como una unidad para alinearlo con el objetivo (cada
   giro/volteo cuesta 1 movimiento; el objetivo es la referencia fija).
   Al elegir el número de movimientos, una pantalla cubre el tablero para no
   poder estudiarlo mientras se decide.
   - Si llega al objetivo en ≤ su apuesta → **gana 1 punto** (fin de la ronda).
   - Si **el que rebatió falla** → pierde 1 punto, **se reinicia el puzzle** y le
     toca al que apostó primero, con el número que él había puesto. Si ese
     también falla, pierde 1 punto y termina la ronda.
   - Si nadie rebatió y el apostador falla → pierde 1 punto.
   - Los puntos pueden ser negativos.
6. Gana quien tenga más puntos tras **10 rondas**.

> Navegación: usa el botón **atrás** del navegador/celular para volver entre
> pantallas (no cierra la app).

## Inicio y modos

El menú principal ofrece **Jugar solo (Modo infinito)** y **Jugar Multiplayer**
(→ Local o Online; el online llegará pronto), además de **Cómo jugar** y
**Ajustes**.

## Tutorial

La **primera vez que tocas "Jugar solo"** aparece un tutorial épico e
**interactivo y guiado**: debes hacer la acción correcta para avanzar (mover el
Rey, girar el tablero); si te equivocas te corrige con una pista y deshace el
movimiento. Al terminar o **Saltar**, entras directo al Modo infinito. Se puede
repetir cuando quieras desde **Inicio → Cómo jugar**.

## Modo infinito (1 jugador)

Puzzles aleatorios sin fin. Mueve libremente (los giros/volteos cuentan como
movimiento) hasta igualar el objetivo; puedes **Reintentar** o **Rendirse**.
Al igualarlo eliges **Confirmar** o intentarlo en menos. Si lo resolviste en el
**mínimo posible** ganas una **⭐** (se acumulan y se guardan); si no, la app te
dice en cuántos se podía y **reproduce la solución óptima** animada. El motor
calcula el camino más corto exacto con BFS (instantáneo).

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción (carpeta dist/)
npm run preview  # previsualizar el build
```

Scripts de utilidad (requieren Playwright):

```bash
npm run snapshot          # capturas de pantalla del flujo
node scripts/gen-icons.mjs   # regenerar íconos de la PWA
node /tmp/test-engine.mjs    # (ver scripts/test-engine.ts) tests del motor
```

## Desplegar en Vercel (gratis)

1. Entra a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
2. **Add New → Project** e importa el repositorio `the-royal-study`.
3. Vercel detecta Vite automáticamente (ya hay `vercel.json`). Pulsa **Deploy**.
4. Al terminar te da una URL pública (p. ej. `the-royal-enchanted.vercel.app`).

> Nota: el despliegue usa la rama que configures como *Production Branch* en
> Vercel. Si el código está en `claude/royal-study-game-icJQc`, ponla como rama
> de producción o fusiónala a `main`.

## Instalar en el celular

1. Abre la URL de Vercel en el navegador del celular (Chrome/Safari).
2. **Android (Chrome):** menú ⋮ → *Instalar aplicación* / *Añadir a pantalla de inicio*.
3. **iPhone (Safari):** botón *Compartir* → *Añadir a pantalla de inicio*.
4. Se instalará con su ícono y se abrirá a pantalla completa como una app.

## Estado

- ✅ Motor (reglas 3×3, generador, BFS con transformaciones) — con tests.
- ✅ Estética (tablero isométrico de cristal, piezas-gema, paleta morada).
- ✅ Duelo local jugable (carrera, apuesta, contra-apuesta, ejecución, rondas).
- ✅ PWA instalable (manifest + íconos + service worker).
- ⏳ Multijugador online (Firebase) — siguiente fase.
- ⏳ Ajustes (idioma/orientación), sonido y háptica — siguiente fase.
