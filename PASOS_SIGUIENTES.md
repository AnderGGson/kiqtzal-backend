# K'iq'tzal — ENTREGA Y PASOS SIGUIENTES

> Este documento lo dejó **@jorge** el **25/09/2026**. El código está **escrito,
> probado y verificado localmente**; lo que falta es el despliegue en la nube y
> el flasheo del firmware. Léelo completo antes de empezar, en orden.

---

## 1. ¿Qué se construyó?

Monitoreo experimental del biopurificador K'iq'tzal con **dos sensores** por lado:

- Aire sucio (entrada): `dirtyAir` → MQ-135 (gas) + DHT11 (humedad/temperatura)
- Aire limpio (salida): `cleanAir` → MQ-135 (gas) + DHT11 (humedad/temperatura)

Flujo de datos:

```
ESP32 (firmware) ──HTTP POST──▶ Backend API (Render) ──▶ PostgreSQL (Neon)
                                              ▲
Frontend (Vercel) ──GET /api/measurements─────┘
```

Repos en GitHub (`github.com/AnderGGson`):
- Backend: `kiqtzal-backend` (rama `ft/jorge`)
- Frontend: `kiqtzal-frontend` (rama `ft/jorge`)

---

## 2. Estado ACTUAL (verificado)

| Componente | Estado |
| --- | --- |
| Backend: tipo/schema combinado `dirtyAir`+`cleanAir` | ✔ |
| Backend: repositorios `memory` y `postgres` (tablas auto-creadas) | ✔ |
| Backend: `POST/GET /api/measurements`, `GET /api/measurements/latest`, `GET /api/health`, SPA estático + fallback | ✔ |
| Backend: simulador `npm run simulate` (backfill + modo live) | ✔ |
| Frontend: gráficas comparativas recharts, resumen, selector de backend, QR | ✔ |
| Verificaciones: `typecheck`, `lint`, `build` en **ambos** repos | ✔ |
| Prueba integral local (SPA + API + simulador) | ✔ |

**Aún no se han desplegado** el backend (Render), la base de datos (Neon) ni las
variables de entorno de Vercel. El QR impreso ya apunta a
`https://kiqtzal-platform.vercel.app/` — **ese URL NO cambia**.

⚠️ **Importante:** el build actualmente publicado en Vercel apunta a
`http://localhost:3001/api`. Sin el paso 3.3 (re-deploy con la URL del backend)
el frontend público **no tendrá datos**.

---

## 3. CHECKLIST DE DESPLIEGUE (hazlo en este orden)

### 3.1 Crear la base de datos en Neon (PostgreSQL)

1. Entra en https://neon.tech (gratis) y crea un proyecto.
2. Copia la cadena de conexión, ej.:
   `postgresql://usuario:contraseña@ep-nombre.region.aws.neon.tech/neondb?sslmode=require`
3. Guárdala: la usarás en el paso 3.2. Las tablas se crean **solas** al arrancar
   el backend la primera vez (no hace falta importar nada).

### 3.2 Desplegar el backend en Render

1. Sube el repo `kiqtzal-backend`. Crea un **Web Service** en
   <https://render.com> conectado al repo (rama `ft/jorge`).
2. Configuración del servicio:

   | Campo | Valor |
   | --- | --- |
   | Build Command | `npm install && npm run build` |
   | Start Command | `node dist/server.js` |
   | Runtime | Node (selecciona Node 20+) |

3. Variables de entorno (sección *Environment*):

   | Variable | Valor |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` (Render lo asigna; se puede omitir) |
   | `DATABASE_DRIVER` | `postgres` |
   | `DATABASE_URL` | la cadena de Neon del paso 3.1 |
   | `DATABASE_SSL` | `true` |
   | `WEB_DIST` | *(opcional)* ruta al `dist/` del frontend si lo subes junto al backend |

4. Render te da una URL tipo `https://kiqtzal-api.onrender.com`. Anótala.
5. Prueba después del deploy: `https://kiqtzal-api.onrender.com/api/health`
   → debe responder `{ "ok": true, ... }`.

> Si en algún momento quieres correr el backend **sin base de datos**, pon
> `DATABASE_DRIVER=memory` (los datos no persisten entre reinicios; solo para demos).

### 3.3 Re-desplegar el frontend en Vercel con la URL correcta

1. En el proyecto `kiqtzal-platform` de <https://vercel.com> (repo
   `kiqtzal-frontend`, rama `ft/jorge`), añade las variables de entorno:

   | Variable | Valor |
   | --- | --- |
   | `VITE_API_BASE_URL` | `https://kiqtzal-api.onrender.com/api` (la del paso 3.2) |
   | `VITE_PUBLIC_URL` | `https://kiqtzal-platform.vercel.app` (opcional; hace que el QR de la portada apunte ahí) |

2. Re-deploy (deploy manual o push). La URL pública **no cambia**.
3. Abre `https://kiqtzal-platform.vercel.app/` → dashboard sin datos hasta que
   el firmware o el simulador publique lecturas.

### 3.4 Probar con el simulador (sin sensores)

Desde la máquina local, con el backend desplegado:

```bash
cd kiqtzal-backend
npm install

# Historial de prueba (termina solo):
npm run simulate -- --backfill 300 --url https://kiqtzal-api.onrender.com/api --hours 2

# Para seguir "en vivo" un rato (Ctrl+C para detener):
npm run simulate -- --live --interval 5000 --url https://kiqtzal-api.onrender.com/api
```

Corre el `--live` unos minutos y verifica que `https://kiqtzal-platform.vercel.app/dashboard`
muestre gráficas comparando `dirtyAir` vs `cleanAir`.

### 3.5 Firmware del ESP32 (le corresponde al compañero de hardware)

Revisar y flashear `kiqtzal-backend/tools/firmware/kiqtzal-firmware/kiqtzal-firmware.ino`.

Pines (ADC1 para los MQ-135):

| Señal | Pin |
| --- | --- |
| MQ-135 arriba (`dirtyAir`) | GPIO 32 |
| MQ-135 abajo (`cleanAir`) | GPIO 34 |
| DHT11 arriba | GPIO 4 (pull-up 10 kΩ) |
| DHT11 abajo | GPIO 27 (pull-up 10 kΩ) |

En el código poner la URL del backend en `BACKEND_URL` (ej.
`https://kiqtzal-api.onrender.com/api`) y el **Wi-Fi** (SSID/contraseña).
El ESP32 hace `POST /api/measurements` con este payload (sin `timestamp`, el
backend usa la hora del servidor):

```json
{
  "experimentId": "kiqtzal-demo",
  "dirtyAir": { "gas": 412.3, "humidity": 45.1, "temperature": 24.8 },
  "cleanAir": { "gas": 301.2, "humidity": 52.4, "temperature": 25.1 }
}
```

Guía completa del firmware: `kiqtzal-backend/docs/firmware-guide.md`.

---

## 4. VERIFICACIÓN FINAL (qué debe funcionar para la demo)

1. `GET https://kiqtzal-api.onrender.com/api/health` → `ok`.
2. Abrir `https://kiqtzal-platform.vercel.app/` → portada con QR.
3. Escanear el QR → entra directo a la plataforma.
4. Con el ESP32 (o simulador) enviando datos:
   - `GET /api/measurements/latest` devuelve la lectura combinada.
   - El dashboard muestra las dos líneas (sucio vs limpio) y el % de reducción.
5. Si el backend estuviera caído, `BackendSettings` permite poner otra URL de API
   desde el navegador sin redeployar.

---

## 5. PROBLEMAS/APUNTES CONOCIDOS

- **No publicar secretos**: `DATABASE_URL` y la contraseña del Wi-Fi SOLO en las
  variables de entorno del proveedor (Render/Vercel), nunca en el código.
- **Vite avisará** "chunk bigger than 500 kB" en el build del frontend: es solo un
  aviso por recharts; la app funciona bien.
- Proceso que esté escuchando en el puerto 3001 puede bloquear el `npm run dev`
  del backend localmente (en Windows: `Get-NetTCPConnection -LocalPort 3001` para encontrarlo).
- El backend en memoria (`DATABASE_DRIVER=memory`) borra los datos al reiniciar; solo uso demo.

---

## 6. ARCHIVOS ÚTILES

| Archivo | Qué contiene |
| --- | --- |
| `kiqtzal-backend/docs/deployment.md` | guía de despliegue completa |
| `kiqtzal-backend/docs/firmware-guide.md` | guía del firmware + pines + payload |
| `kiqtzal-backend/docs/collector-contract.md` | contrato de la API (endpoints) |
| `kiqtzal-backend/tools/firmware/kiqtzal-firmware/kiqtzal-firmware.ino` | sketch de referencia del ESP32 |
| `kiqtzal-backend/README.md` | comandos, config local, endpoints |
| `kiqtzal-frontend/README.md` | config y estructura del frontend |