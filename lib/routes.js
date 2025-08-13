import { env } from 'node:process'
import { Router } from 'express'

const router = Router()

router.all('{*splat}', (req, _res, next) => {
  console.log(`method: ${req.method}; path: ${req.path}; baseURL: ${req.baseUrl}; body: ${req.body}`)

  next()
})

router.all('/', (_req, res) => {
  res.redirect('https://w3c.github.io/reporting/')
})

router.post(env.CSP_ENDPOINT ?? '/csp', (req, res) => {
  try {
    const report = req?.body ?? {}
    console.log(JSON.stringify(report))
    switch (report?.type) {
      case 'csp-violation':
        console.log(JSON.stringify(report?.body))
        return res.sendStatus(204)

      default:
        return res.sendStatus(400)
    }
  } catch (err) {
    return res.sendStatus(500)
  }
})

export default router
