import { env } from 'node:process'
import { Router } from 'express'

const router = Router()

router.post(env.CSP_ENDPOINT ?? '/csp-reports', (req, res) => {
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
