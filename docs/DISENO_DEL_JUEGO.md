# 🔮 The Royal Enchanted — Documento de Diseño (Biblia del Juego)

> Documento vivo. Es la guía maestra del proyecto. Toda decisión de jugabilidad,
> diseño y estética se registra aquí antes de programar.
>
> **Estado:** Definición de rumbo (pre-programación)
> **Fecha de inicio:** 2026-06-07
> **Rama de desarrollo:** `claude/royal-study-game-icJQc`

---

## 1. Visión

Versión digital **inspirada libremente** en el juego de mesa físico
*The Royal Study* (Stan van Rooijen / Philos). Tomamos su idea central
—un puzzle de ajedrez de "resuelve en el mínimo de movimientos" con
mecánica de apuesta/estimación entre dos jugadores— y la convertimos en
una **app web instalable (PWA)**, con una estética **mística/arcana en
tonos morados**, **premium** y muy cuidada visualmente.

**Objetivo de calidad:** que se sienta como un juego **pulido**, no una demo.

---

## 2. El juego original (referencia)

- Juego de mesa físico, 1–2 jugadores, ~20 min, 8+.
- Tablero **3×3**; 5 piezas de ajedrez (Rey, Dama, Torre, Alfil, Caballo).
- Cada carta muestra una **posición objetivo**; hay que recolocar las piezas
  (con movimientos de ajedrez) para igualarla en el **mínimo de movimientos**.
- Mecánica de duelo: el primero en declarar un número de movimientos arranca
  el reloj; el rival puede "desafiar" diciendo que lo hace en menos. Quien
  ejecuta debe cumplir su número. Primero en llegar a **6 puntos** gana.
- Niveles avanzados: rotar la carta (90° = +1, 180° = +2) y reflejarla
  (espejo = +1), pagando con movimientos.

---

## 3. Decisiones de diseño (cuestionario respondido)

### A — Concepto y temática
- **A1. Temática:** Mística / Arcana, con **tonos morados**.
- **A2. Narrativa:** Sin historia (puro puzzle pulido).
- **A3. Nombre (tentativo):** *The Royal Enchanted* (sujeto a cambio — ver
  propuestas de nombre en §11).

### B — Estética visual
- **B1. Tono de color:** Claro / luminoso, con tonos morados.
- **B2. Nivel de lujo:** Premium total (sombras suaves, degradados, brillos,
  partículas, vidrio esmerilado / glassmorphism).
- **B3. Animaciones:** Ricas (deslizamiento de piezas con física suave,
  destellos al acertar, transiciones fluidas).

### C — El tablero
- **C1. Perspectiva:** **Isométrica / 2.5D** (tablero inclinado en perspectiva).
- **C2. Tamaño:** **3×3** fiel al original.
- **C3. Material:** **Vidrio / cristal** (translúcido, mágico).

### D — Las piezas
- **D1. Estilo:** Aspecto **3D de cristal** logrado SIN herramientas externas
  complejas. **Solución técnica acordada:** piezas hechas a mano en
  **SVG + CSS** con degradados, facetas, luces internas y sombras, mostradas
  en perspectiva isométrica. Da volumen tipo 3D, es gratis, escalable y no
  requiere modelado 3D ni programas externos. (Ver análisis en §10.)
- **D2. Coherencia:** Las piezas deben combinar con el resto de la app
  (misma paleta morada/cristal).
- **D3. Material de pieza:** Cristal brillante.

### E — Jugabilidad (núcleo)
- **E1. Mecánica central:** Fiel a la idea — posición objetivo + resolver en
  el mínimo de movimientos con reglas de ajedrez.
- **E2/F — Modo:** **SOLO MULTIJUGADOR** en esta primera versión (el modo
  solitario y CPU quedan para después). Dos sub-modos:
  - **Local (mismo celular / hot-seat):** funciona offline, sin servidor.
  - **Online (dos celulares):** vía **Firebase** (sincronía en tiempo real,
    salas con código) y desplegado en **Vercel**.
  Se construye **local-first** y el online se monta encima. Ver flujo en §4
  y arquitectura en §13.
- **Nº de piezas:** **5** (Rey, Dama, Torre, Alfil, Caballo) en el 3×3 — fiel
  al original (4 casillas libres).
- **Regla de ejecución:** el ejecutor debe alcanzar el objetivo en **como
  máximo (≤)** los movimientos apostados (hacerlo en menos también vale).
- **E3. Deshacer/Reiniciar:** No hay deshacer libre; lo que cuenta es terminar
  la partida y ver quién ganó (al mover, debes cumplir lo apostado).
- **E4. Mínimo de movimientos:** **Oculto** a los jugadores (el motor del
  juego sí lo calcula internamente para validar — ver §6).
- **E5. Reglas de piezas:** Reglas de ajedrez **normales** (sin las
  restricciones especiales del original).

### F — Generación y duelo
- **F. Cartas:** NO hay cartas prediseñadas. **Cada ronda se genera al azar**
  una posición inicial + una posición objetivo (ver §6).

### G — Transformaciones (rotar / espejo)
- **G. Disponibles desde el inicio.** Durante la ejecución, el jugador puede
  **rotar** o **reflejar (espejo)** el objetivo; **cada transformación cuesta
  1 movimiento** de su presupuesto. Siempre presentes en el juego.
- **G. Pistas:** Sin pistas (esta versión es solo multijugador).

### H — Feel, sonido y detalles
- **H1. Audio:** Efectos suaves, **sin música**.
- **H2. Háptica:** Vibración sutil en el celular.
- **H3. Control:** **Tocar pieza → tocar destino**, resaltando movimientos
  válidos.

### I — Técnico / instalación
- **I1. Plataforma:** **PWA** instalable en el celular (web, offline-capable).
- **I2. Idioma:** Español.
- **I3. Orientación:** Ambas (vertical y horizontal) con opción de cambio
  desde Ajustes.

---

## 4. Flujo del duelo multijugador (mecánica detallada)

Una **ronda** vale **1 punto**. Secuencia:

1. **Generación:** se crea al azar una posición inicial y una posición
   objetivo (ambos jugadores ven lo mismo). Empieza la ronda.
2. **Apuesta (bid):** ambos piensan en silencio cuántos movimientos necesitan.
   El **primero** en escribir su número **inicia un contador de 20 segundos**.
3. **Contra-apuesta:** el otro jugador tiene esos 20 s para escribir un número
   **estrictamente menor** (no puede ser igual ni mayor).
   - Si **lo logra** → ese jugador gana el turno de mover.
   - Si **no escribe** un número menor a tiempo → el primero gana el turno de
     mover.
4. **Ejecución:** quien ganó el turno mueve las piezas para alcanzar el
   objetivo en **como máximo (≤)** su número apostado.
   - Si alcanza el objetivo en ≤ su apuesta → **gana el punto**.
   - Si no lo logra (se le acaban los movimientos sin igualar el objetivo) →
     el **otro jugador gana el punto** de la ronda.
5. Se inicia una nueva ronda (nueva generación al azar).
6. **Fin de partida:** se juega un **número fijo de rondas** (por defecto 10,
   ajustable en Ajustes: p. ej. 3 / 5 / 7 / 10). Gana quien tenga más puntos
   al terminar las rondas. (Empate → muerte súbita opcional, por definir.)
7. **Contra-apuesta:** una sola (P1 apuesta → P2 contra una vez → quien tenga
   el número menor ejecuta).

**Transformaciones durante la ejecución (§G):** el ejecutor puede rotar/
reflejar el objetivo; cada transformación consume 1 de su presupuesto de
movimientos.

---

## 5. Reglas de movimiento de las piezas

Tablero 3×3. Movimientos de ajedrez normales. Las piezas se mueven solo a
casillas vacías y no saltan sobre otras (excepto el Caballo):

| Pieza  | Movimiento |
|--------|------------|
| Rey    | 1 casilla en cualquier dirección |
| Dama   | cualquier nº de casillas en línea (horizontal/vertical/diagonal) |
| Torre  | cualquier nº en horizontal/vertical |
| Alfil  | cualquier nº en diagonal |
| Caballo| salto en "L" (puede saltar piezas) |

> Nota: sin las restricciones especiales del original (alfil solo casillas
> oscuras, caballo no al centro, etc.).

---

## 6. Generación de puzzles (motor)

- Cada ronda: generar **posición inicial** y **posición objetivo** aleatorias
  con las mismas piezas.
- El motor calcula el **mínimo real de movimientos** mediante búsqueda en
  anchura (BFS) sobre el espacio de estados del tablero 3×3 (es pequeño, así
  que es instantáneo). Esto considera también las transformaciones (rotar/
  espejo) y su coste.
- **Filtro de calidad:** descartar puzzles triviales o imposibles. Solo se
  aceptan los que tengan solución dentro de un rango de dificultad razonable
  (p. ej., mínimo entre 2 y 6 movimientos — por ajustar).
- El mínimo se mantiene **oculto** a los jugadores, pero el motor lo usa para
  validar éxito/fracaso de la ejecución.

---

## 7. Estética y dirección de arte

- **Paleta:** base clara y luminosa con familia morada — lavanda, lila,
  amatista, violeta; acentos iridiscentes (toques cian/rosa para brillos
  mágicos); blancos suaves para el lujo.
- **Estilo:** glassmorphism premium — superficies de vidrio esmerilado,
  desenfoques, luces suaves, partículas mágicas sutiles, sombras largas y
  difusas.
- **Tablero:** 3×3 en perspectiva isométrica, hecho de cristal translúcido con
  reflejos.
- **Movimiento:** transiciones fluidas, "easing" suave, destello/partículas al
  acertar una ronda.

---

## 8. Piezas — enfoque técnico (importante)

Requisito del usuario: aspecto 3D de cristal, **bonito**, pero **sin
herramientas externas difíciles, gratis y posible desde el celular**.

**Solución adoptada:** piezas vectoriales **SVG** con:
- degradados lineales/radiales para simular volumen y profundidad,
- facetas (planos de cristal) para el look "tallado",
- luces internas / brillos especulares (highlights),
- sombras de contacto y resplandor (glow) morado,
- presentadas en la inclinación isométrica del tablero.

Esto logra un aspecto tridimensional de cristal **sin** modelado 3D real ni
programas externos, es ligero y escala perfecto en cualquier pantalla.
(El 3D real pre-renderizado requeriría Blender u otra herramienta de
escritorio, lo cual queda descartado por las restricciones.)

---

## 9. Preguntas resueltas ✅

1. **Multijugador:** Online (Firebase + Vercel) **y** local en el mismo
   celular. Se construye local-first; el online se monta encima. ✅
2. **Regla de ejecución:** Como máximo (≤) la apuesta. ✅
3. **Meta de partida:** Número fijo de rondas (def. 10, ajustable). ✅
4. **Número de piezas:** 5 (fiel). ✅
5. **Contra-apuesta:** Una sola. ✅

### Pendientes menores (con valor por defecto, ajustables luego)
- Desempate al final de las rondas: propuesta = ronda(s) de muerte súbita.
- Rango de dificultad del generador: propuesta = mínimo 2–6 movimientos.
- Número exacto de rondas por defecto: propuesta = 10.

---

## 10. Análisis y notas técnicas

- **Online vs local:** el multijugador en dos dispositivos implica sincronía
  en tiempo real (WebSocket / Firebase / Supabase), hosting y manejo de
  desconexiones — incompatible con "offline" y añade coste/complejidad. El
  hot-seat local es gratis, instantáneo y 100% PWA. Ver pregunta §9.1.
- **Apuesta en un mismo celular:** si es local, se diseñará una interfaz con
  dos zonas (una por jugador, una de ellas rotada) para que ambos puedan
  "competir" por apostar primero de forma justa.
- **Mínimo oculto:** es viable porque el motor lo calcula con BFS; el jugador
  no lo ve, pero el sistema valida con la verdad.

---

## 11. Propuestas de nombre

Tentativo actual: *The Royal Enchanted*. Alternativas a considerar:
- *Arcanum Royal*
- *Amethyst — The Royal Study*
- *El Estudio Encantado*
- *Mística: Royal Puzzle*

---

## 12. Roadmap (alto nivel, por confirmar)

- **Fase 0:** Fijar rumbo (este documento) ✅ hecho.
- **Fase 1:** Motor del juego (tablero 3×3, reglas, generador, BFS, validación) ✅ hecho (con tests).
- **Fase 2:** UI/estética (isométrico, cristal, piezas SVG por gema, paleta morada) ✅ hecho.
- **Fase 3:** Flujo de duelo local (carrera, apuesta, contra-apuesta con timer
  20s, ejecución con presupuesto, transformaciones, puntuación, rondas, fin) ✅ hecho.
- **Fase 4 (parcial):** PWA instalable + desplegada en Vercel ✅; multijugador
  online (Firebase + salas) ⏳ pendiente.
- **Fase 5:** Ajustes (sonido/vibración/orientación) ✅, efectos de sonido
  (Web Audio) ✅, háptica ✅, partículas/confeti al ganar ✅.
- **Fase 6 (pendiente):** Multijugador online y más pulido fino.

---

## 13. Arquitectura online (Firebase + Vercel)

- **Hosting:** **Vercel** (despliega la PWA estática; plan gratuito).
- **Tiempo real:** **Firebase Realtime Database** (plan Spark gratuito) para
  sincronizar el estado de la partida entre los dos celulares.
- **Salas:** una partida online = una "sala" con **código corto** (ej. 4–6
  caracteres). El jugador A crea la sala y comparte el código; el jugador B
  se une con el código.
- **Estado sincronizado:** posición de piezas, objetivo, apuestas de cada
  jugador, marca de tiempo de inicio del contador (para que ambos vean los
  20 s sincronizados), turno actual y marcador.
- **Reglas de seguridad de Firebase:** básicas para que solo los participantes
  de una sala modifiquen su estado.
- **Local-first:** la misma lógica de juego corre sin Firebase para el modo
  local (hot-seat). El online es una capa opcional encima.

### Requisitos de configuración (los proporciona el usuario)
Para activar el modo online hará falta (todo en planes gratuitos):
1. Un **proyecto de Firebase** (consola web; se puede crear desde el celular).
2. Pegar la **configuración de Firebase** (apiKey, etc.) en el archivo de
   config / variables de entorno del proyecto.
3. Una cuenta de **Vercel** para desplegar.

> Mientras tanto, el **modo local funciona sin nada de esto**, así que podemos
> desarrollar y probar todo el juego de inmediato, y enchufar el online cuando
> tengas las llaves de Firebase.

---

## 14. Stack técnico (propuesto)

- **Build / framework:** Vite + React + TypeScript (DX limpio, ideal para
  Vercel, fácil de mantener).
- **PWA:** `vite-plugin-pwa` (manifest, service worker, instalable + offline).
- **Estilos / animación:** CSS moderno (glassmorphism, transiciones) +
  animaciones ligeras; piezas y tablero en **SVG**.
- **Estado:** store ligero (Zustand o Context) para la lógica de juego.
- **Online:** SDK de Firebase (Realtime Database).
- **Motor de puzzle:** módulo propio en TS (reglas de ajedrez en 3×3, BFS para
  el mínimo, generador con filtro de dificultad).

> Decisión por defecto; ajustable si el usuario prefiere algo más simple
> (p. ej. HTML/CSS/JS sin framework).
