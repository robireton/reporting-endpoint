import { env } from 'node:process'
import { Router } from 'express'

const router = Router()

router.get('/', (_req, res) => {
  res.redirect('https://w3c.github.io/reporting/')
})

router.post(env.CSP_ENDPOINT ?? '/csp', (req, res) => {
  try {
    if ('body' in req && 'csp-report' in req.body) {
      console.log(`${(new Date()).toISOString()}\t${JSON.stringify(req.body['csp-report'])}\t${req.headers['user-agent']}`)
      res.sendStatus(204)
    } else {
      res.sendStatus(400)
    }
  } catch (err) {
    res.sendStatus(500)
  }
})

export default router
