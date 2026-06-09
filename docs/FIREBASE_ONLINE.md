# ☁️ Activar el modo Online (Firebase)

El modo Online ya está construido. Sin configurar Firebase funciona en **modo
prueba** (dos pestañas del mismo dispositivo). Para jugar **entre celulares
distintos**, conecta Firebase (gratis) así:

## 1. Crear el proyecto Firebase
1. Entra a **[console.firebase.google.com](https://console.firebase.google.com)** con tu cuenta de Google.
2. **Agregar proyecto** → ponle un nombre (ej. `royal-enchanted`) → crear.

## 2. Crear la Realtime Database
1. En el menú: **Compilación → Realtime Database → Crear base de datos**.
2. Elige una ubicación y arranca en **modo de prueba** (luego ajustamos reglas).
3. Copia la **URL** de la base (algo como `https://royal-enchanted-default-rtdb.firebaseio.com`).

## 3. Registrar una app web y copiar la config
1. En **Configuración del proyecto (⚙) → Tus apps → Web (</>)**, registra una app.
2. Te dará un objeto `firebaseConfig` con: `apiKey`, `authDomain`, `databaseURL`
   (la de arriba), `projectId`, `appId`.

## 4. Poner las variables de entorno
Usa estos nombres (los lee la app):

```
VITE_FB_API_KEY=...
VITE_FB_AUTH_DOMAIN=...
VITE_FB_DB_URL=https://....firebaseio.com
VITE_FB_PROJECT_ID=...
VITE_FB_APP_ID=...
```

- **En Vercel:** Project → Settings → **Environment Variables** → agrégalas →
  vuelve a **Deploy** (Redeploy).
- **En local (opcional):** crea un archivo `.env` con esas líneas.

## 5. Reglas de la Realtime Database (prototipo)
En **Realtime Database → Reglas**, pega esto y publica:

```json
{
  "rules": {
    "rooms": {
      "$code": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

> Esto es permisivo (cualquiera con el código lee/escribe esa sala) — está bien
> para empezar/probar. Para producción conviene endurecerlo (auth anónima y
> validaciones), pero el juego ya funciona así.

## Listo
Tras redeploy con las variables, el botón **Online** usará Firebase y podrás
jugar entre celulares distintos: uno **crea sala**, comparte el **código**, y los
demás se **unen**. (Plan gratuito Spark suficiente para jugar entre amigos.)

---

### Notas
- El **anfitrión** controla el avance de rondas; si se sale, la sala se detiene
  (mejora futura: migrar anfitrión).
- El temporizador usa la hora del dispositivo; pequeñas diferencias de reloj
  entre celulares son normales.
