# K'iq'tzal — Backend

API REST para recibir lecturas de aire del ESP32 mediante el Python Collector, guardarlas en PostgreSQL de Supabase y exponerlas al frontend.

## URL base de producción

La API desplegada en Vercel es el servicio que deben consumir el Python Collector y el frontend:

```text
https://kiqtzal-backend.vercel.app
```

Todas las rutas de la API comienzan con `/api`. No debe usarse `localhost` en el Collector ni en el frontend: `http://localhost:3001` queda reservado para desarrollo local.

## Requisitos

- Node.js >= 20.19
- Una tabla `public.mediciones_aire` en Supabase

## Configuración

El backend carga automáticamente el archivo local `.env`, que está ignorado por Git y debe contener únicamente `DATABASE_URL` con el connection string de Supavisor en transaction mode.

`DIRECT_URL` no se usa en la API; solo se necesita para migraciones.

En Vercel agrega `DATABASE_URL` como variable de entorno secreta para Preview y Production. Nunca subas el `.env` al repositorio.

## Base de datos

La API utiliza esta tabla:

```sql
CREATE TABLE IF NOT EXISTS mediciones_aire (
  id SERIAL PRIMARY KEY,
  temp_abajo NUMERIC(5,2) NOT NULL,
  hum_abajo NUMERIC(5,2) NOT NULL,
  mq_abajo_raw INTEGER NOT NULL,
  temp_arriba NUMERIC(5,2) NOT NULL,
  hum_arriba NUMERIC(5,2) NOT NULL,
  mq_arriba_raw INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Para expedite el historial se recomienda este índice opcional:

```sql
CREATE INDEX IF NOT EXISTS idx_mediciones_aire_created_at
ON public.mediciones_aire (created_at DESC, id DESC);
```

## Comandos

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm start
```

## API desplegada

Los consumidores usan las siguientes URLs de producción:

| Consumidor | Método | URL | Descripción |
| --- | --- | --- | --- |
| Cualquiera | GET | `https://kiqtzal-backend.vercel.app/api/health` | Comprueba la API y la conexión a PostgreSQL |
| Python Collector | POST | `https://kiqtzal-backend.vercel.app/api/measurements` | Inserta una lectura recibida del ESP32 |
| Frontend | GET | `https://kiqtzal-backend.vercel.app/api/measurements/latest` | Obtiene la lectura más reciente o `null` |
| Frontend | GET | `https://kiqtzal-backend.vercel.app/api/measurements` | Obtiene historial paginado y filtrable |

El Collector solo utiliza el endpoint `POST`. El frontend solo utiliza los endpoints `GET` de lectura. Ninguno de los dos necesita conectarse directamente a Supabase ni conocer la contraseña de PostgreSQL.

### Health check

```bash
curl https://kiqtzal-backend.vercel.app/api/health
```

Respuesta cuando el servicio y Supabase están disponibles:

```json
{
  "status": "ok",
  "database": "up",
  "timestamp": "2026-09-25T09:33:20.980Z"
}
```

Si PostgreSQL no responde, el endpoint devuelve HTTP `503` con `"database":"down"`.

### Ingresar datos: solo Python Collector

El Collector lee el JSON del ESP32 y envía un `POST` a la URL de producción:

```http
POST https://kiqtzal-backend.vercel.app/api/measurements
Content-Type: application/json
```

Body:

```json
{
  "temp_abajo": 24.8,
  "hum_abajo": 60.1,
  "mq_abajo_raw": 120,
  "temp_arriba": 25.3,
  "hum_arriba": 58.4,
  "mq_arriba_raw": 130
}
```

Los seis campos son obligatorios y sus nombres coinciden con la tabla. El Collector no envía `id` ni `created_at`; PostgreSQL los genera.

Ejemplo con `requests`:

```python
import requests

API_URL = "https://kiqtzal-backend.vercel.app/api/measurements"


def enviar_lectura(data):
    payload = {
        "temp_abajo": data["temp_abajo"],
        "hum_abajo": data["hum_abajo"],
        "mq_abajo_raw": data["mq_abajo_raw"],
        "temp_arriba": data["temp_arriba"],
        "hum_arriba": data["hum_arriba"],
        "mq_arriba_raw": data["mq_arriba_raw"],
    }

    response = requests.post(API_URL, json=payload, timeout=10)
    response.raise_for_status()
    return response.json()
```

Si el ESP32 envía los sensores MQ como `mq_abajo` y `mq_arriba`, el Collector debe mapearlos a `mq_abajo_raw` y `mq_arriba_raw` antes del POST.

Una lectura aceptada devuelve HTTP `201`:

```json
{
  "id": 123,
  "temp_abajo": 24.8,
  "hum_abajo": 60.1,
  "mq_abajo_raw": 120,
  "temp_arriba": 25.3,
  "hum_arriba": 58.4,
  "mq_arriba_raw": 130,
  "created_at": "2026-09-25T12:00:00.000Z"
}
```

Ante errores de red o respuestas `5xx`, el Collector debe conservar la lectura y reintentar con backoff exponencial. No se reintenta un `400`, porque significa que el payload es inválido.

### Obtener información: solo frontend

El frontend consulta exclusivamente los endpoints `GET` del despliegue. No debe enviar lecturas mediante el navegador.

Última lectura:

```js
const API_BASE = 'https://kiqtzal-backend.vercel.app'

const response = await fetch(`${API_BASE}/api/measurements/latest`)

if (!response.ok) {
  throw new Error(`Error ${response.status}`)
}

const latestMeasurement = await response.json()
```

`latestMeasurement` contiene el objeto de la última lectura o `null` cuando todavía no existen datos.

Historial:

```js
const response = await fetch(
  `${API_BASE}/api/measurements?limit=100&offset=0`,
)

if (!response.ok) {
  throw new Error(`Error ${response.status}`)
}

const measurements = await response.json()
```

Historial por intervalo UTC:

```http
GET https://kiqtzal-backend.vercel.app/api/measurements?from=2026-09-25T00:00:00.000Z&to=2026-09-26T00:00:00.000Z
```

Parámetros disponibles:

- `limit`: entero entre 1 y 500; valor inicial `100`.
- `offset`: entero mayor o igual a 0; valor inicial `0`.
- `from` y `to`: fechas ISO-8601 válidas; ambas son inclusivas.
- El historial siempre llega del más reciente al más antiguo.

### Errores

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos inválidos",
    "details": []
  }
}
```

Códigos principales: `INVALID_JSON` (400), `VALIDATION_ERROR` (400), `PAYLOAD_TOO_LARGE` (413), `NOT_FOUND` (404), `DATABASE_UNAVAILABLE` (503) e `INTERNAL_ERROR` (500).

## Vercel

`src/app.ts` exporta la aplicación Express por defecto para el despliegue zero-config de Vercel. `src/server.ts` se utiliza únicamente para arrancar el servidor local.

La URL pública de producción es:

```text
https://kiqtzal-backend.vercel.app
```

Esta es la URL que deben usar el Python Collector y el frontend. Las URL generadas para previews o deployments temporales no deben configurarse en sus clientes.

Antes de desplegar:

1. Configura `DATABASE_URL` en Vercel sin incluir comillas en el valor secreto.
2. Confirma que el proyecto usa Node.js 20.19 o superior.
3. Despliega el repositorio.
4. Verifica `https://kiqtzal-backend.vercel.app/api/health`.

No se usa almacenamiento local: todas las lecturas persisten en Supabase y sobreviven a reinicios y cold starts de Vercel.

## Collector

El collector actual mostrado en el proyecto anterior conectaba directamente con PostgreSQL mediante `psycopg2`. Para usar este backend debe realizar un `POST HTTP` a `https://kiqtzal-backend.vercel.app/api/measurements` y enviar los campos con los nombres exactos de la tabla, incluidos `mq_abajo_raw` y `mq_arriba_raw`.

El contrato completo está en `docs/collector-contract.md`.

## Estructura

- `src/app.ts`: configuración de Express y exportación para Vercel.
- `src/server.ts`: listener local.
- `src/routes`: rutas HTTP.
- `src/controllers`: traducción entre HTTP y servicios.
- `src/services`: validación y reglas.
- `src/repositories`: acceso parametrizado a PostgreSQL.
- `src/config/env.ts`: lectura y validación de variables de entorno.
