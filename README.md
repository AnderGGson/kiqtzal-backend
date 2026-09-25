# K'iq'tzal — Backend

API REST para el sistema de monitoreo del biopurificador K'iq'tzal.
Repositorio **independiente** del frontend (`kiqtzal-frontend`). Recibe las mediciones
del ESP32 (el propio firmware hace HTTP directo, sin collector Python), las valida,
las guarda en PostgreSQL y las expone al frontend.

Documentos clave:

- `docs/collector-contract.md` — contrato del `POST` que hace el firmware.
- `docs/firmware-guide.md` — cableado de sensores + sketch de referencia para la IA del compañero.
- `docs/deployment.md` — despliegue (Neon, Render, Vercel) y checklist de la demo.

> **⛅ Entregado por @jorge (25/09/2026).** Si vas a continuar esta tarea,
> arranca por [`PASOS_SIGUIENTES.md`](./PASOS_SIGUIENTES.md): es el checklist
> completo de lo que falta (Neon → Render → Vercel → firmware), con todo
> verificado localmente.

## Requisitos

- Node.js >= 20 (se usa Node 24).

## Comandos

```bash
npm install        # instala dependencias
npm run dev        # desarrollo con recarga automática (tsx watch src/server.ts)
npm run build      # compila TypeScript a dist/
npm run start      # ejecuta el build de producción (node dist/server.js)
npm run typecheck  # TypeScript sin emitir
npm run simulate   # emite lecturas simuladas (para desarrollar sin sensores)
```

### Simulador

```bash
npm run simulate                                # 1 lectura cada 5 s a localhost:3001 (se detiene con Ctrl+C)
npm run simulate -- --backfill 500              # precarga 500 lecturas y termina
npm run simulate -- --backfill 500 --live       # precarga 500 lecturas y sigue en tiempo real
npm run simulate -- --url https://tu-backend/api --interval 3000
npm run simulate -- --backfill 300 --hours 2    # historial repartido en 2 h
```

## Configuración

Copia `.env.example` a `.env`:

```
PORT=3001
DATABASE_DRIVER=memory            # 'memory' (dev) | 'postgres' (producción)
# DATABASE_URL=postgresql://...   # obligatorio con DATABASE_DRIVER=postgres
# DATABASE_SSL=true               # Neon requiere TLS, ponlo en 'true' en producción
```

Todo acceso a `process.env` ocurre en un único lugar: `src/config/env.ts`.

## Estructura y responsabilidades

```
kiqtzal-backend/
├── package.json
├── tsconfig.json
├── .env.example
├── docs/
│   ├── collector-contract.md  # contrato del POST del firmware
│   ├── firmware-guide.md      # sensores, pines y sketch (.ino)
│   └── deployment.md          # desplegar backend/frontend + demo
├── tools/
│   └── firmware/kiqtzal-firmware/kiqtzal-firmware.ino  # sketch de referencia
├── src/
│   ├── server.ts          # entrada: inicializa la DB y arranca el HTTP server
│   ├── app.ts             # Express (cors, json, api, SPA opcional, errores)
│   ├── config/
│   │   └── env.ts         # ÚNICO lugar que lee process.env
│   ├── routes/            # SOLO definen URL + verbo + handler
│   │   ├── index.ts                 # /api + /health
│   │   ├── experiments.routes.ts    # GET / GET /:id / GET /:id/measurements
│   │   └── measurements.routes.ts   # POST / GET / GET /latest
│   ├── controllers/       # hablan con req/res: status codes y bodies
│   ├── services/          # reglas de negocio y validación (async)
│   ├── repositories/
│   │   ├── types.ts           # interfaces de repositorios (los drivers las cumplen)
│   │   ├── db.ts              # instancia la Database según DATABASE_DRIVER
│   │   ├── memory/            # driver en memoria (desarrollo, sin instalar nada)
│   │   └── postgres/          # driver PostgreSQL (producción) + creación de tablas
│   ├── validation/         # esquemas Zod (contratos de entrada)
│   ├── middleware/         # errorHandler y notFound
│   ├── types/              # modelos de dominio
│   └── utils/query.ts      # parseo de query params
└── scripts… (simulate en src/scripts/simulate.ts)
```

## Persistencia

- El **único** lugar que toca el almacenamiento es `src/repositories/`.
- `DATABASE_DRIVER=memory` → datos en memoria (se pierden al reiniciar). Útil para desarrollo.
- `DATABASE_DRIVER=postgres` → usa `DATABASE_URL` y crea las tablas al arrancar
  (`CREATE TABLE IF NOT EXISTS`). Es el modo de producción (Render + Neon).
- `services`, `controllers` y `routes` no cambian entre drivers: todos son `async`
  y Express 5 reenvía los `throw` de handlers asíncronos al `errorHandler`.

## API

Todas las rutas cuelgan del prefijo `/api`.

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/health` | estado del backend (`status`, `uptime`, `timestamp`) |
| POST | `/measurements` | ingesta de medición (la usa el firmware del ESP32) |
| GET | `/measurements` | historial (`from`, `to`, `after`, `limit`, `offset`) |
| GET | `/measurements/latest` | última medición combinada o `null` |
| GET | `/experiments` | lista de experimentos (`limit`, `offset`) |
| GET | `/experiments/:id` | detalle de experimento o 404 |
| GET | `/experiments/:id/measurements` | mediciones del experimento |

Errores: siempre `{ "error": { "code", "message" } }`. Códigos: `VALIDATION_ERROR` (400),
`EXPERIMENT_NOT_FOUND` (404), `NOT_FOUND` (404), `INTERNAL_ERROR` (500).

## Modelo de datos

```ts
Reading {
  gas: number          // ADC crudo del MQ-135 (0–4095)
  humidity: number     // % HR (DHT11)
  temperature: number | null  // °C (DHT11)
}

Measurement {
  id: string           // UUID
  experimentId: string | null
  timestamp: string    // ISO-8601 UTC (hora del servidor si el firmware no manda)
  dirtyAir: Reading    // entrada del biofiltro (aire sucio)
  cleanAir: Reading    // salida del biofiltro (aire limpio)
}
```

## POST /api/measurements

```json
{
  "dirtyAir": { "gas": 512.3, "humidity": 65.1, "temperature": 24.8 },
  "cleanAir": { "gas": 402.7, "humidity": 63.9, "temperature": 25.1 }
}
```

- `timestamp` y `experimentId` son opcionales. `temperature` es opcional por canal.
- Validado con Zod (`src/validation/measurement.schema.ts`).
- Respuestas: `201` con la medición creada, o `400` con el detalle de validación.

## Cómo añadir un endpoint (receta)

1. `types/`: define o reutiliza el modelo.
2. `repositories/`: añade el método en las interfaces (`types.ts`) y en ambos drivers (memory/postgres).
3. `services/`: añade la función de negocio que lo usa.
4. `controllers/`: crea el handler (lee `req`, escribe `res/status`).
5. `routes/`: enlaza verbo+URL con el handler.
6. Actualiza la tabla de API de este README.

## El firmware (fuera de este repo)

El ESP32 con los sensores lee y postea solo. Su contrato está en
`docs/collector-contract.md` y el sketch de referencia en `tools/firmware/`.