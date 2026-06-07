# 🔮 The Royal Enchanted

Duelo de puzzles de ajedrez místico en un tablero 3×3 de cristal. PWA instalable
en el celular. Inspirado libremente en el juego de mesa *The Royal Study*.

> Documento de diseño completo en [`docs/DISENO_DEL_JUEGO.md`](docs/DISENO_DEL_JUEGO.md).

## Cómo se juega (modo local, 2 jugadores)

1. Se genera una posición inicial y un **objetivo** al azar.
2. **Carrera:** el primero en reaccionar elige cuántos movimientos cree que
   necesita para llegar al objetivo.
3. **Contra-apuesta:** el rival tiene **20 s** para mejorar con un número menor,
   o pasar.
4. **Ejecución:** quien tenga la apuesta más baja mueve las piezas (reglas de
   ajedrez) y puede **rotar/reflejar** el objetivo (cada transformación cuesta
   1 movimiento). Si llega al objetivo en ≤ su apuesta, gana el punto; si no, el
   punto es del rival.
5. Gana quien tenga más puntos tras **10 rondas**.

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
