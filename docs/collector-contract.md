# Contrato del Python Collector

Documento de referencia para el futuro repositorio `kiqtzal-collector`.
Define **qué debe enviar** el collector a esta API. El collector NO vive en este
repositorio ni en el frontend: es un proceso Python independiente que corre en la
computadora donde está conectado el ESP32.

## Responsabilidades del collector

1. Leer por USB/Serial (pyserial) las líneas JSON enviadas por el ESP32.
2. Parsear y validar mínimamente cada lectura.
3. Enviar la lectura al backend con `POST /api/measurements`.
4. Reintentar con backoff si el backend no responde (con buffer local para no perder lecturas).
5. Configuración mediante variables de entorno (URL del backend, puerto serial, intervalo).

## Flujo completo

```
ESP32 --USB/Serial--> Python Collector --HTTP--> Backend API --> Base de datos
```

## Endpoint

`POST {BACKEND_URL}/api/measurements`

Headers:
- `Content-Type: application/json`

Body:

```json
{
  "timestamp": "2026-01-01T12:00:00.000Z",
  "gas": 42.7,
  "humidity": 63.2,
  "temperature": 24.8
}
```

Campos:
- `timestamp`: ISO-8601 con zona UTC (obligatorio).
- `gas`: número finito (obligatorio).
- `humidity`: número finito (obligatorio).
- `temperature`: número finito (opcional; puede omitirse si el sensor no está presente).

Opcional futuro: `experimentId` (UUID) para asociar la lectura a un experimento activo.

## Respuestas

- `201 Created` → medición aceptada y persistida (nuevo `id` en el body).
- `400 Bad Request` → body inválido. Forma:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos inválidos",
    "details": []
  }
}
```

- `500 Internal Server Error` → error del servidor. Reintentar con backoff.
- `404 Not Found` → ruta incorrecta (revisar `BACKEND_URL`).

## Recomendaciones de implementación

- Leer el serial en bucle bloqueante con timeout, formato JSON por línea.
- No enviar más de una medición por ~30 segundos (intervalo del sistema).
- Ante fallo de red o 5xx: reintentar con backoff exponencial y guardar la lectura
  pendiente en un buffer local (ej. archivo JSON) para reenviarla después.