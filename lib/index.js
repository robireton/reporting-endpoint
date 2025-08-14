import process from 'node:process'
import express from 'express'
import routes from './routes.js'

const framework = express()
framework.set('trust proxy', ['loopback', 'uniquelocal'])
framework.set('x-powered-by', false)

framework.use(express.json({ type: ['application/json', 'application/csp-report', 'application/reports+json'] }))

framework.use(routes)

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
      process.exit()
    })
  })
}
