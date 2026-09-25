# Contrato del Python Collector

El Collector lee por USB/Serial las líneas JSON enviadas por el ESP32 y las publica mediante HTTP en esta API. Es un proceso Python independiente que no está contenido en este repositorio.

## Flujo

```text
ESP32 --USB/Serial--> Python Collector --HTTP--> Vercel API --> Supabase PostgreSQL
```

## Endpoint de escritura

```http
POST {BACKEND_URL}/api/measurements
Content-Type: application/json
```

La API es pública y no requiere encabezado de autenticación.

## Body

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

Los nombres deben coincidir exactamente con las columnas de `public.mediciones_aire`:

- `temp_abajo`, `hum_abajo` y `temp_arriba`, `hum_arriba`: números finitos.
- `mq_abajo_raw` y `mq_arriba_raw`: enteros.
- Los seis campos son obligatorios.
- No se envían `id` ni `created_at`; la base de datos los genera.
- No se aceptan campos adicionales.

## Respuestas

- `201 Created`: la lectura fue insertada. El body incluye `id` y `created_at`.
- `400 Bad Request`: JSON mal formado o valores inválidos.
- `404 Not Found`: `BACKEND_URL` no apunta a esta API.
- `413 Payload Too Large`: el body supera el límite aceptado.
- `503 Service Unavailable`: Supabase no está disponible.
- `500 Internal Server Error`: error interno; reintentar con backoff.

Formato de error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos inválidos",
    "details": []
  }
}
```

## Consultas para el frontend

- `GET /api/measurements/latest`: última lectura o `null`.
- `GET /api/measurements?limit=100&offset=0`: historial reciente.
- `GET /api/measurements?from=...&to=...`: historial por intervalo UTC.

## Envío recomendado

1. Leer una línea completa desde el puerto serial.
2. Parsear el JSON recibido del ESP32.
3. Mapear los nombres del ESP32 a los seis campos obligatorios.
4. Enviar el body por HTTP al endpoint.
5. Confirmar la lectura local solo cuando la API responda `201` o `4xx` no recuperable.
6. Ante error de red o respuesta `5xx`, conservar la lectura y reintentar con backoff exponencial.

El Collector no debe conectarse a PostgreSQL ni usar `psycopg2`; la conexión a la base de datos queda exclusivamente en el backend.
