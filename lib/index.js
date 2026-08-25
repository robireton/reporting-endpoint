import process from 'node:process'
import express from 'express'
import routes from './routes.js'
import { close } from './database.js'

const framework = express()
framework.set('trust proxy', ['loopback', 'uniquelocal'])
framework.set('x-powered-by', false)

framework.use(express.json({ type: ['application/json', 'application/csp-report', 'application/reports+json'] }))

framework.use(routes)

// body-parser rejections (malformed JSON, oversized payload, bad charset)
// carry a status; answer them without leaking Express's HTML error page.
framework.use((err, _req, res, _next) => {
  console.error(`${err.status ?? 500} ${err.message}`)
  res.sendStatus(err.status ?? 500)
})

const server = framework.listen({
  port: Number.parseInt(process.env.HTTP_PORT) || 0,
  host: process.env.HTTP_HOST
}, error => {
  if (error) throw error
  const addr = server.address()
  console.log(`listening on ${addr.address}:${addr.port}`)
})

for (const signal of ['SIGUSR2', 'SIGINT', 'SIGTERM']) {
  process.on(signal, s => {
    console.log(`caught signal ${s} process`)
    server.close(err => {
      err && console.error(err)
      close()
      process.exit()
    })
  })
}
