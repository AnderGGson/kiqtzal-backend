import { app } from './app.js'
import env from './config/env.js'
import { initializeDatabase } from './repositories/db.js'

const port = env.port

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`K'iq'tzal API en http://localhost:${port}${env.apiPrefix}`)
      console.log(`Driver de base de datos: ${env.databaseDriver}`)
    })
  })
  .catch((err: unknown) => {
    console.error('No se pudo inicializar la base de datos:', err)
    process.exit(1)
  })