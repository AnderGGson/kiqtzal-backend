# K'iq'tzal — Guía de firmware y sensores

> **Este documento está pensado para entregarse a una IA generativa**, junto con el
> repositorio `kiqtzal-backend`, para que la IA complete o adapte la implementación del
> firmware del ESP32. Es autocontenido: define qué sensores hay, cómo se conectan, qué
> JSON emite el ESP32 y adónde lo envía.

El ESP32 es **el collector**: lee los 4 sensores y hace `POST` por HTTP directo al backend.
No hay proceso Python intermedio.

## Hardware

| Componente | Cantidad | Función |
| ---------- | -------- | ------- |
| ESP32 (DevKit con WiFi) | 1 | Microcontrolador + envío por red |
| MQ-135 | 2 | Calidad de aire (gas) |
| DHT11 | 2 | Temperatura y humedad |
| Resistencias 10 kΩ | 2 | Pull-up del pin de datos de cada DHT11 |

## Mapeo de pines (recomendado)

Dos pares: uno mide el aire a la **entrada** del biofiltro (sucio) y otro a la **salida** (limpio).

| Sensor | Concepto | Pin recomendado | Notas |
| ------ | -------- | --------------- | ----- |
| MQ-135 "ARRIBA" | Entrada → `dirtyAir` | 32 (ADC1_CH4) | El otro MQ-135 en otro pin ADC1 |
| MQ-135 "ABAJO" | Salida → `cleanAir` | 34 (ADC1_CH6) | ADC1 no tiene conflicto con WiFi |
| DHT11 "ARRIBA" | Entrada | 4 | Con pull-up de 10 kΩ |
| DHT11 "ABAJO" | Salida | 27 | Con pull-up de 10 kΩ |

- Usar exclusivamente pines **ADC1** para los MQ-135 (`32, 33, 34, 35, 36, 39`). Los pines ADC2 compiten con el WiFi del ESP32 y dan lecturas ruidosas.
- Los DHT11 van en GPIO digitales libres (p. ej. `4, 5, 16, 17, 18, 27`).
- Ambos MQ-135 se alimentan con **5V** (tienen un calentador); los DHT11 con 3.3V. Todas las salidas de señal a pines de 3.3V del ESP32.
- El sketch de tu amigo incluye `#include "soc/soc.h"` y `"soc/rtc_cntl_reg.h"` para desactivar el *brownout detector*: normal con 2 MQ-135, pero revisar la fuente de alimentación (no alimentar el calentador desde el pin 3.3V del ESP32).

## Unidades y qué significa cada valor

- **`gas`**: lectura cruda del ADC del ESP32 (`analogRead`, 0–4095), promediada de ~10 muestras. No intentamos convertir a PPM: para la demo se compara *dirty vs clean* sobre la misma escala, que es lo que muestra la eficiencia del biofiltro.
  - Dejar calentar los MQ-135 **5 minutos** antes de la demo (su lectura se estabiliza y el "cero" deja de derivar).
- **`temperature`**: grados Celsius (DHT11).
- **`humidity`**: % de humedad relativa (DHT11).

## Contrato del POST

El ESP32 envía **una línea JSON por ciclo** al backend:

```
POST {BACKEND_URL}/api/measurements
Content-Type: application/json
```

```json
{
  "timestamp": "2026-09-25T12:00:00.000Z",
  "dirtyAir": { "gas": 512.3, "humidity": 65.1, "temperature": 24.8 },
  "cleanAir": { "gas": 402.7, "humidity": 63.9, "temperature": 25.1 }
}
```

- **`timestamp`**: **opcional** (ISO-8601 UTC). Si el ESP32 no tiene reloj/NTP sincronizado, **no lo envíes**: el backend usa la hora del servidor al recibir, y así las gráficas en tiempo real quedan ordenadas.
- **`temperature`**: opcional por canal (si el DHT11 falla la lectura, se puede omitir).
- `dirtyAir` = entrada (sucio), `cleanAir` = salida (limpio).

### Respuestas

| Código | Qué significa | Qué hacer |
| ------ | ------------- | --------- |
| `201 Created` | Aceptada y guardada | Siguiente ciclo |
| `400 Bad Request` | JSON inválido (revisar nombres/claves) | Corregir y reenviar |
| `404 Not Found` | `BACKEND_URL` mal escrita | Revisar la configuración |
| `5xx` | Error del servidor | Reintentar en el siguiente ciclo |

### Consideraciones de confiabilidad

- Intervalo de ciclo sugerido: **5 segundos**.
- Si un POST falla, seguir intentando en el siguiente ciclo (no acumular cola en el ESP32; la lectura más nueva es la importante).
- Asegurarse de que `WiFi.status() == WL_CONNECTED` antes de mandar.

## Sketch de referencia

Hay un sketch completo en:

```
tools/firmware/kiqtzal-firmware/kiqtzal-firmware.ino
```

Lo único que hay que personalizar (dentro del archivo) es:

```cpp
#define WIFI_SSID        "nombre-de-tu-red"
#define WIFI_PASSWORD    "clave"
#define BACKEND_URL      "https://kiqtzal-api.onrender.com"
#define MEASURE_INTERVAL_MS 5000UL
// pines:
//   MQ135_ARRIBA_PIN 32
//   MQ135_ABAJO_PIN  34
//   DHTPIN_ARRIBA    4
//   DHTPIN_ABAJO     27
```

Archivo `.ino` (PlatformIO usa `src/main.cpp` con los mismos `#includes` y `setup()`/`loop()`).