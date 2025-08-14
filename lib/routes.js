import { env } from 'node:process'
import { Router } from 'express'

const router = Router()

router.get('/', (_req, res) => {
  res.redirect('https://w3c.github.io/reporting/')
})

router.post(env.CSP_ENDPOINT ?? '/csp', (req, res) => {
  try {
    switch (req?.body?.type) {
      case 'csp-violation':
        console.log(JSON.stringify(req.body['csp-report']))
        return res.sendStatus(204)

      default:
        return res.sendStatus(400)
    }
  } catch (err) {
    return res.sendStatus(500)
  }
})

export default router
