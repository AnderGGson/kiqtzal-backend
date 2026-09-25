import type { Measurement } from '../types/index.js'

interface SimulatorOptions {
  url: string
  intervalMs: number
  backfill: number
  hours: number
  live: boolean
}

function round(value: number, digits = 1): number {
  const factor = Math.pow(10, digits)
  return Math.round(value * factor) / factor
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function walk(current: number, step: number, min: number, max: number): number {
  return clamp(current + (Math.random() - 0.5) * 2 * step, min, max)
}

function parseArgs(argv: string[]): SimulatorOptions {
  const options: SimulatorOptions = {
    url: 'http://localhost:3001/api',
    intervalMs: 5000,
    backfill: 0,
    hours: 6,
    live: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    const next = argv[i + 1]
    if (next !== undefined && !next.startsWith('--')) {
      if (key === 'url') options.url = next.replace(/\/$/, '')
      else if (key === 'interval') options.intervalMs = Number(next)
      else if (key === 'backfill') options.backfill = Number(next)
      else if (key === 'hours') options.hours = Number(next)
      i++
    } else if (key === 'live') {
      options.live = true
    }
  }

  return options
}

interface SimulatorState {
  dirtyGas: number
  cleanGas: number
  dirtyHumidity: number
  cleanHumidity: number
  dirtyTemp: number
}

function nextState(state: SimulatorState): SimulatorState {
  const spike = Math.random() < 0.06
  const dirtyGasSpike = spike ? 80 + Math.random() * 120 : 0

  const dirtyGas = walk(state.dirtyGas, 18, 360, 620) + dirtyGasSpike
  const cleanGas = clamp(dirtyGas * (0.68 + Math.random() * 0.14), 200, 500)

  return {
    dirtyGas,
    cleanGas,
    dirtyHumidity: walk(state.dirtyHumidity, 1.2, 45, 75),
    cleanHumidity: walk(state.cleanHumidity, 1.2, 43, 73),
    dirtyTemp: walk(state.dirtyTemp, 0.25, 22, 30),
  }
}

function buildMeasurement(timestamp: string, state: SimulatorState): Measurement {
  return {
    id: '',
    experimentId: null,
    timestamp,
    dirtyAir: {
      gas: round(state.dirtyGas),
      humidity: round(state.dirtyHumidity),
      temperature: round(state.dirtyTemp),
    },
    cleanAir: {
      gas: round(state.cleanGas),
      humidity: round(state.cleanHumidity),
      temperature: round(state.dirtyTemp + 0.4 + Math.random() * 0.3),
    },
  }
}

async function postMeasurements(options: SimulatorOptions): Promise<void> {
  let state: SimulatorState = {
    dirtyGas: 460,
    cleanGas: 350,
    dirtyHumidity: 62,
    cleanHumidity: 60,
    dirtyTemp: 26,
  }

  if (options.backfill > 0) {
    const start = Date.now() - options.hours * 3_600_000
    console.log(`Generando ${options.backfill} lecturas para el historial...`)
    for (let i = 0; i < options.backfill; i++) {
      state = nextState(state)
      const timestamp = new Date(start + i * options.intervalMs).toISOString()
      const measurement = buildMeasurement(timestamp, state)
      await postOnce(options.url, measurement)
    }
    console.log(`Historial completado (${options.backfill} lecturas).`)
    if (!options.live) {
      console.log('Usa --live para seguir enviando lecturas en tiempo real.')
      return
    }
  }

  console.log(`Simulando lecturas en tiempo real a ${options.url} cada ${options.intervalMs} ms.`)
  console.log('Presiona Ctrl+C para detener.')

  const tick = async () => {
    state = nextState(state)
    await postOnce(options.url, buildMeasurement(new Date().toISOString(), state))
  }

  await tick()
  setInterval(() => void tick(), options.intervalMs)
}

async function postOnce(url: string, measurement: Measurement): Promise<void> {
  const { id: _id, ...payload } = measurement
  try {
    const response = await fetch(`${url}/measurements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const label = response.ok ? 'OK' : `HTTP ${response.status}`
    console.log(`[${new Date().toISOString()}] ${label} gas sucio=${payload.dirtyAir.gas} limpio=${payload.cleanAir.gas}`)
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error enviando medición:`, err)
  }
}

const options = parseArgs(process.argv.slice(2))
void postMeasurements(options)