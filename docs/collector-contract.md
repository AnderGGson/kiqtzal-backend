# Contrato del POST (Firmware ESP32)

Documento de referencia para el firmware que corre en el ESP32 con los sensores.
A diferencia de versiones anteriores, **no hay collector Python**: el propio ESP32
habla HTTP directo con esta API. Ver `docs/firmware-guide.md` para el cableado y los pines.

## Flujo completo

```
ESP32 (2x MQ-135 + 2x DHT11) --HTTP POST--> Backend API (Render) --> PostgreSQL (Neon)
```

## Endpoint

`POST {BACKEND_URL}/api/measurements`

Headers:
- `Content-Type: application/json`

Body (una lectura por ciclo):

```json
{
  "timestamp": "2026-01-01T12:00:00.000Z",
  "dirtyAir": { "gas": 512.3, "humidity": 65.1, "temperature": 24.8 },
  "cleanAir": { "gas": 402.7, "humidity": 63.9, "temperature": 25.1 }
}
```

Campos:
- `timestamp`: ISO-8601 UTC (opcional). Si se omite, el backend usa la hora del servidor al recibir. Recomendado omitirlo si el ESP32 no tiene NTP.
- `dirtyAir`: lectura de los sensores de la **entrada** del biofiltro (aire sucio).
- `cleanAir`: lectura de los sensores de la **salida** del biofiltro (aire limpio).
- Por canal: `gas` (número finito, obligatorio), `humidity` (obligatorio), `temperature` (opcional).
- `experimentId` (UUID, opcional) para asociar la lectura a un experimento.

## Respuestas

- `201 Created` → medición aceptada y persistida (nuevo `id` en el body).
- `400 Bad Request` → body inválido. Forma:

```json
{
  "error": { "code": "VALIDATION_ERROR", "message": "Datos inválidos", "details": [] }
}
```

- `404 Not Found` → ruta incorrecta (revisar `BACKEND_URL`).
- `5xx` → error del servidor; reintentar en el siguiente ciclo.

## Lectura

- `GET /api/measurements/latest` → última medición combinada o `null` (sin señal).
- `GET /api/measurements?from&to&after&limit` → historial reciente (para las gráficas).
  - `after=<timestamp ISO>` trae solo lo registrado después de esa marca (polling incremental).

## Recomendaciones de implementación (firmware)

- Leer cada canal promediando ~10 muestras del ADC (`gas`) para estabilizar el ruido.
- Intervalo de ciclo: 5 segundos.
- Si un `POST` falla, reintentar en el siguiente ciclo; la lectura más nueva es la que importa.
- `timestamp`: omitirlo (el backend pone la hora), o sincronizar NTP si se quiere el dato exacto.
- Sketch de referencia completo en `tools/firmware/kiqtzal-firmware/kiqtzal-firmware.ino`.