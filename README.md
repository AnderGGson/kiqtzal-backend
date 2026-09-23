# K'iq'tzal — Backend

API REST para el sistema de monitoreo del biopurificador K'iq'tzal.
Repositorio **independiente** del frontend (`kiqtzal-frontend`) y del Python
Collector. Recibe las mediciones del Collector, las valida, las guarda y las
expone al frontend.

## Requisitos

- Node.js >= 20.19 (se usa Node 24)

## Comandos

```bash
npm install        # instala dependencias
npm run dev        # desarrollo con recarga automática (tsx watch src/server.ts)
npm run build      # compila TypeScript a dist/
npm run start      # ejecuta el build de producción (node dist/server.js)
npm run typecheck  # TypeScript sin emitir
```

## Configuración

Copia `.env.example` a `.env`:

```
PORT=3001
```

Variables previstas para el futuro (pendientes de implementación): `DATABASE_URL`.
Todo acceso a `process.env` ocurre en un único lugar: `src/config/env.ts`.

## Estructura y responsabilidades

```
kiqtzal-backend/
├── package.json              # scripts y dependencias
├── tsconfig.json             # config TypeScript (NodeNext, strict)
├── .env.example              # variables de entorno documentadas
├── docs/
│   └── collector-contract.md # contrato del POST del Python Collector
├── src/
│   ├── server.ts             # entrada: arranca el HTTP server en PORT
│   ├── app.ts                # configura Express (cors, json, rutas, errores)
│   ├── config/
│   │   └── env.ts            # ÚNICO lugar que lee process.env
│   ├── routes/               # SOLO definen URL + verbo + handler
│   │   ├── index.ts              #     agrupa todo bajo /api (+ /health)
│   │   ├── experiments.routes.ts #     GET / GET /:id / GET /:id/measurements
│   │   └── measurements.routes.ts#     POST / y GET /latest
│   ├── controllers/          # hablan con req/res: status codes y bodies
│   │   ├── experiments.controller.ts
│   │   └── measurements.controller.ts
│   ├── services/             # reglas de negocio y validación
│   │   ├── experiments.service.ts
│   │   └── measurements.service.ts
│   ├── repositories/         # acceso a datos (placeholders en memoria hoy)
│   │   ├── db.ts                 #     define la interfaz Database y la instancia
│   │   ├── experiments.repository.ts
│   │   └── measurements.repository.ts
│   ├── validation/           # esquemas Zod (contratos de entrada)
│   │   ├── measurement.schema.ts
│   │   └── experiment.schema.ts
│   ├── middleware/           # manejo cross-cutting de la app
│   │   ├── errorHandler.ts       #     errores Zod -> 400, resto -> 500
│   │   └── notFound.ts           #     ruta desconocida -> 404
│   ├── types/                # modelos de dominio (Experiment, Measurement)
│   │   ├── experiment.ts
│   │   ├── measurement.ts
│   │   └── index.ts
│   └── utils/
│       └── query.ts          # parseo de query params (limit, offset, from, ...)
```

## Cómo viaja una petición por las capas

Cada capa tiene **una sola responsabilidad**. Ejemplo con `GET /api/experiments/:id/measurements`:

```
routes (definen la URL)
  └─ experiments.routes.ts  -> "GET /:id/measurements ejecuta getMeasurementsByExperiment"
controllers (recolectan la petición)
  └─ leen req.params.id y req.query.*, convierten a valores tipados
services (reglas de negocio)
  └─ verifican que el experimento exista; deciden qué datos pedir
repositories (persistencia)
  └─ consultan el almacenamiento y devuelven ModelMeasurement[]
controllers (responden)
  └─ 200 con el array, o 404 si el experimento no existe
```

| Capa | Qué hace | Qué NO hace |
| ---- | -------- | ----------- |
| `routes/` | mapa URL+verbo → handler | no tiene lógica |
| `controllers/` | parsea entrada, setea status/body | no conoce la DB ni valida el dominio |
| `services/` | validación y reglas de negocio | no sabe de HTTP ni de la DB concreta |
| `repositories/` | persistencia (hoy: en memoria) | no conoce Express ni validación |
| `validation/` | esquemas Zod reutilizados por services | sin efectos colaterales |

## Persistencia: cómo se conectará una base de datos real después

El **único** lugar que toca el almacenamiento es `src/repositories/`.

- Hoy cada repositorio guarda en memoria (arrays). Todo está detrás de la interfaz
  `Database` definida en `repositories/db.ts`.
- Para migrar a SQLite (demo) o PostgreSQL (producción) solo hay que cambiar la
  implementación de `experiments.repository.ts` y `measurements.repository.ts`
  (añadir consultas reales y sus datos de conexión en `config/env.ts`).
- `services`, `controllers` y `routes` **no se modifican**.
- Los controladores son síncronos mientras los repositorios son en memoria;
  cuando la persistencia sea real podrán ser `async` sin cambios extra en la
  arquitectura: Express 5 reenvía automáticamente los `throw` de handlers
  asíncronos al `errorHandler`.

## API

Todas las rutas cuelgan del prefijo `/api` (definido en `src/config/env.ts`).

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/health` | estado del backend (`status`, `uptime`, `timestamp`) |
| POST | `/measurements` | ingesta de medición (la usa el Python Collector) |
| GET | `/measurements/latest` | última medición o `null` |
| GET | `/experiments` | lista de experimentos (`limit`, `offset`) |
| GET | `/experiments/:id` | detalle de experimento o 404 |
| GET | `/experiments/:id/measurements` | mediciones del experimento |

Parámetros de consulta de mediciones: `from`, `to`, `after`, `limit`, `offset`.
`after=<timestamp ISO>` trae solo lo registrado después de esa marca
(polling incremental para el frontend).

`GET /api/measurements/latest` devuelve `null` cuando aún no hay mediciones;
el frontend lo interpreta como "sin señal", sin depender del ESP32 ni del Collector.

### Formato de errores

Todos los errores se generan en el `errorHandler` central con la misma forma:

```json
{ "error": { "code": "...", "message": "..." } }
```

Códigos actuales: `VALIDATION_ERROR` (400, con `details` de Zod),
`EXPERIMENT_NOT_FOUND` (404), `NOT_FOUND` (404), `INTERNAL_ERROR` (500).

## Modelo de datos

```ts
Experiment {
  id,                    // UUID (node:crypto)
  name: string,
  description: string | null,
  mode: 'with-biopurifier' | 'without-biopurifier',   // provisional
  startedAt: string,     // ISO-8601 UTC
  endedAt: string | null,
  createdAt: string,
  updatedAt: string
}

Measurement {
  id,                    // UUID
  experimentId: string | null,   // provisional: lecturas iniciales sin experimento
  timestamp: string,     // ISO-8601 UTC
  gas: number,
  humidity: number,
  temperature: number | null     // el sensor de temperatura aún es opcional
}
```

- Fechas: siempre ISO-8601 en UTC, como strings.
- Unidades de gas/humedad/temperatura: **por definir** con los sensores reales;
  los valores se almacenan crudos, sin conversiones ni rangos inventados.

## POST /api/measurements (ingesta)

Body esperado del Python Collector (contrato completo en `docs/collector-contract.md`):

```json
{
  "timestamp": "2026-01-01T12:00:00.000Z",
  "gas": 42.7,
  "humidity": 63.2,
  "temperature": 24.8
}
```

- `temperature` es opcional. `experimentId` (UUID) es opcional por ahora.
- Validado con Zod (`src/validation/measurement.schema.ts`).
- Respuestas: `201` con la medición creada, o `400` con el detalle de validación.

## El Python Collector (fuera de este repo)

El Collector corre en la computadora conectada por USB al ESP32, es un proceso
Python independiente y **no vive en este repositorio ni en el frontend**.
Su único punto de contacto con este proyecto es el endpoint `POST /api/measurements`.
Su forma de hablar está definida en `docs/collector-contract.md`.

```
ESP32 --USB/Serial--> Python Collector --HTTP--> Backend API --> Base de datos
```

## Cómo añadir un endpoint (receta)

1. `types/`: define o reutiliza el modelo.
2. `repositories/`: añade el método de acceso a datos (y el que corresponda en `db.ts` si hace falta).
3. `services/`: añade la función de negocio que lo usa.
4. `controllers/`: crea el handler (lee `req`, escribe `res/status`).
5. `routes/`: enlaza verbo+URL con el handler.
6. Actualiza la tabla de API de este README.

## Decisiones pendientes (provisionales)

- Base de datos: SQLite para la demo; la interfaz de repositorios ya está lista para PostgreSQL.
- Asociación de mediciones a experimentos: cómo el Collector indicará el experimento activo.
- Unidades y rangos de sensores, según los sensores reales a definir.