import { app } from './app.js'
import env from './config/env.js'

app.listen(env.port, () => {
  console.log(`K'iq'tzal API en http://localhost:${env.port}${env.apiPrefix}`)
})