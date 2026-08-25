import { env } from 'node:process'
import { Router } from 'express'
import { log } from './database.js'

const router = Router()

router.get('/', (_req, res) => {
  res.redirect('https://w3c.github.io/reporting/')
})

// did the client actually send a payload, or just an empty POST?
function hasBody (req) {
  if (req.headers['transfer-encoding'] !== undefined) return true
  const length = Number.parseInt(req.headers['content-length'], 10)
  return Number.isFinite(length) && length > 0
}

router.post(env.CSP_ENDPOINT ?? '/csp', (req, res) => {
  // express.json() leaves req.body undefined when it declines to parse a
  // request, so `'body' in req` is always true — test the value instead.
  if (req.body === undefined) {
    return res.sendStatus(hasBody(req) ? 415 : 400)
  }

  const report = req.body['csp-report']
  if (typeof report !== 'object' || report === null || Array.isArray(report)) {
    return res.sendStatus(400)
  }

  try {
    log(report, req.headers['user-agent'])
    res.sendStatus(204)
  } catch (err) {
    console.error(`could not log report: ${err.message}`)
    res.sendStatus(500)
  }
})

export default router
