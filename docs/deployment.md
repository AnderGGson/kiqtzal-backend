# K'iq'tzal — Despliegue e instrucciones para la demo

Arquitectura final:

```
ESP32 (4 sensores) ──HTTP──> Backend (Render) ──> PostgreSQL (Neon)
                                      │
Frontend (Vercel, público) ──lee──>   │  (misma URL pública)
      ▲
   QR → https://kiqtzal-platform.vercel.app/
```

## 1. Base de datos — PostgreSQL en Neon (gratis)

1. Crear cuenta en https://neon.tech y crear un proyecto nuevo (región cercana).
2. Copiar la **connection string** (pestaña *Connect*, formato `postgresql://user:password@ep-xxxx.region.pooler.../neondb`).
3. Guardar esa cadena: es la variable `DATABASE_URL`.

> No hace falta crear tablas: el backend las crea solo al arrancar (`CREATE TABLE IF NOT EXISTS`).

## 2. Backend — Render (gratis)

El repo `kiqtzal-backend` debe estar en GitHub.

1. En Render → **New → Web Service**, conectar el repo.
2. Configuración:
   - **Build**: `npm install && npm run build`
   - **Start**: `node dist/server.js`
   - **Runtime**: Node 20+ (confirmar en los ajustes del servicio)
   - **Environment variables**:
     - `DATABASE_DRIVER=postgres`
     - `DATABASE_URL=<la cadena de Neon>`
     - `DATABASE_SSL=true`
3. Deploy. Obtendrás una URL fija del estilo `https://kiqtzal-api.onrender.com`.

Notas:
- El plan gratis "duerme" el servicio tras ~15 min sin tráfico. El ESP32 publicando cada 5 s lo mantiene despierto. En la demo, abrir la URL una vez antes de empezar para precalentar.
- Verificar con `GET {URL}/api/health` → `{ "status": "ok" }`.

## 3. Frontend — Vercel (ya desplegado)

El dominio del QR (`https://kiqtzal-platform.vercel.app/`) **no cambia**. Solo hay que apuntarlo al backend:

1. En Vercel → proyecto `kiqtzal-platform` → **Settings → Environment Variables**:
   - `VITE_API_BASE_URL=https://kiqtzal-api.onrender.com/api`
2. **Re-deploy** (o push al repo).
3. Abrir la URL: debe cargar el dashboard y el estado de conexión con el backend.

> Importante: hoy el build desplegado apunta a `http://localhost:3001/api`, por eso hay que redeployar.

## 4. Firmware — ESP32 (lo hace el compañero con los sensores)

1. Personalizar `tools/firmware/kiqtzal-firmware/kiqtzal-firmware.ino`:
   - `WIFI_SSID` y `WIFI_PASSWORD`
   - `BACKEND_URL=https://kiqtzal-api.onrender.com`
   - Pines (por defecto ya puestos: MQ135_ARRIBA=32, MQ135_ABAJO=34, DHT_ARRIBA=4, DHT_ABAJO=27).
2. Cablear 2× MQ-135 (ADC1: pines 32/34) y 2× DHT11 (GPIO 4/27, con pull-up 10 kΩ).
3. Flashear el ESP32 y abrir el monitor serie: debe conectar a WiFi y mandar JSON cada 5 s.
4. Verificar los datos en la página pública.

Guía completa y detalle de pines en `docs/firmware-guide.md`.

## 5. Checklist del día de la demo

1. Prender el ESP32 (USB o power bank) con los sensores conectados; darle WiFi con internet (o hotspot de un celular).
2. Esperar ~5 min de calentamiento de los MQ-135 y confirmar en el monitor serie que hace `POST -> HTTP 201`.
3. Abrir `https://kiqtzal-platform.vercel.app/` en el celular → "Última medición hace menos de un minuto".
4. Demostrar el cambio: acercar humo de vela (u otra fuente de "aire sucio") a la **entrada** del biofiltro → la línea `dirtyAir` sube mientras `cleanAir` se mantiene más baja.
5. Que todos escaneen el QR → ven el dashboard en vivo (solo lectura, sin tocar nada).

## Respaldo: si la nube no está disponible el día de la demo

El dashboard tiene un **selector de URL del backend en caliente** (engranaje "Backend" en el dashboard):

1. Correr el backend en la laptop de un compañero:
   ```
   DATABASE_DRIVER=memory npm run dev   # sin base de datos, datos en memoria
   ```
2. Abrir el dashboard → **Backend** → pegar `http://IP-de-la-laptop:3001/api` → guardar y recargar.
   - La IP sirve para quienes estén en la misma red. Para gente externa, exponer con un túnel:
     `cloudflared tunnel --url http://localhost:3001` y pegar `https://<tunel>.trycloudflare.com/api` en el selector.
3. Si además se quiere un solo servicio sin Vercel: `npm run build` del frontend, copiar `dist/` y usar `WEB_DIST=../kiqtzal-frontend/dist` en el backend (sirve el sitio él mismo).