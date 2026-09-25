# K'iq'tzal — Backend

API REST para recibir lecturas de aire del ESP32 mediante el Python Collector, guardarlas en PostgreSQL de Supabase y exponerlas al frontend.

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

## API

Todas las rutas usan el prefijo `/api`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/health` | Comprueba la API y la conexión a PostgreSQL |
| POST | `/measurements` | Inserta una lectura |
| GET | `/measurements/latest` | Devuelve la lectura más reciente o `null` |
| GET | `/measurements` | Devuelve historial paginado y filtrable |

### Insertar una lectura

```http
POST /api/measurements
Content-Type: application/json
```

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

Los seis campos son obligatorios y los nombres coinciden con la tabla. El collector no envía `id` ni `created_at`; PostgreSQL los genera.

Respuesta `201`:

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

### Consultar el historial

```http
GET /api/measurements?limit=100&offset=0
GET /api/measurements?from=2026-09-25T00:00:00.000Z&to=2026-09-26T00:00:00.000Z
```

- `limit`: entero entre 1 y 500; valor inicial `100`.
- `offset`: entero mayor o igual a 0; valor inicial `0`.
- `from` y `to`: fechas ISO-8601 válidas; ambas son inclusivas.
- El resultado siempre llega del más reciente al más antiguo.

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

Antes de desplegar:

1. Configura `DATABASE_URL` en Vercel sin incluir comillas en el valor secreto.
2. Confirma que el proyecto usa Node.js 20.19 o superior.
3. Despliega el repositorio.
4. Verifica `GET /api/health`.

No se usa almacenamiento local: todas las lecturas persisten en Supabase y sobreviven a reinicios y cold starts de Vercel.

## Collector

El collector actual mostrado en el proyecto anterior conectaba directamente con PostgreSQL mediante `psycopg2`. Para usar este backend debe realizar un `POST HTTP` a `/api/measurements` y enviar los campos con los nombres exactos de la tabla, incluidos `mq_abajo_raw` y `mq_arriba_raw`.

El contrato completo está en `docs/collector-contract.md`.

## Estructura

- `src/app.ts`: configuración de Express y exportación para Vercel.
- `src/server.ts`: listener local.
- `src/routes`: rutas HTTP.
- `src/controllers`: traducción entre HTTP y servicios.
- `src/services`: validación y reglas.
- `src/repositories`: acceso parametrizado a PostgreSQL.
- `src/config/env.ts`: lectura y validación de variables de entorno.
