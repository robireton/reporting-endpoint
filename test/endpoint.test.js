import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { after, before, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const ENDPOINT = '/csp-test'
const entry = fileURLToPath(new URL('../lib/index.js', import.meta.url))

let child
let port
let workdir
let dbpath

// node's fetch always sends a User-Agent, so drive the server over node:http
// to keep full control of the request headers.
function post (path, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, method: 'POST', headers }, res => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }))
    })
    req.on('error', reject)
    if (body !== undefined) req.write(body)
    req.end()
  })
}

function report (body, type = 'application/csp-report', headers = {}) {
  return post(ENDPOINT, {
    headers: { 'content-type': type, 'content-length': Buffer.byteLength(body), ...headers },
    body
  })
}

function rows () {
  const db = new DatabaseSync(dbpath, { readOnly: true })
  try {
    return db.prepare('SELECT "timestamp", "report", "useragent" FROM "csp" ORDER BY rowid').all()
  } finally {
    db.close()
  }
}

before(async () => {
  workdir = mkdtempSync(join(tmpdir(), 'reporting-endpoint-'))
  dbpath = join(workdir, 'test.db')

  child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', entry], {
    env: {
      ...process.env,
      HTTP_HOST: '127.0.0.1',
      HTTP_PORT: '0',
      CSP_ENDPOINT: ENDPOINT,
      DATABASE_PATH: dbpath
    },
    stdio: ['ignore', 'pipe', 'pipe']
  })

  child.stderr.on('data', chunk => process.stderr.write(`[server] ${chunk}`))

  port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start within 5s')), 5000)
    let buffer = ''
    child.stdout.on('data', chunk => {
      buffer += chunk
      const match = buffer.match(/listening on \S+:(\d+)/)
      if (match) {
        clearTimeout(timer)
        resolve(Number.parseInt(match[1], 10))
      }
    })
    child.once('exit', code => reject(new Error(`server exited with code ${code}`)))
  })
})

after(() => {
  child?.kill()
  rmSync(workdir, { recursive: true, force: true })
})

describe('legacy report-uri reports', () => {
  it('stores a well-formed report and answers 204', async () => {
    const before = rows().length
    const res = await report('{"csp-report":{"document-uri":"https://example.com/","violated-directive":"script-src"}}', 'application/csp-report', { 'user-agent': 'TestAgent/1.0' })

    assert.equal(res.status, 204)
    assert.equal(res.body, '')

    const stored = rows()
    assert.equal(stored.length, before + 1)

    const row = stored.at(-1)
    assert.equal(row.useragent, 'TestAgent/1.0')
    assert.deepEqual(JSON.parse(row.report), {
      'document-uri': 'https://example.com/',
      'violated-directive': 'script-src'
    })
    assert.ok(!Number.isNaN(Date.parse(row.timestamp)), 'timestamp should be a parseable date')
  })

  it('accepts application/json as well', async () => {
    const res = await report('{"csp-report":{"document-uri":"https://example.com/"}}', 'application/json')
    assert.equal(res.status, 204)
  })

  // regression: node:sqlite refuses an undefined bind, which turned a report
  // sent without a User-Agent header into a 500 and dropped it.
  it('stores a report sent without a User-Agent header', async () => {
    const res = await report('{"csp-report":{"blocked-uri":"inline"}}')

    assert.equal(res.status, 204)
    const row = rows().at(-1)
    assert.equal(row.useragent, null)
    assert.deepEqual(JSON.parse(row.report), { 'blocked-uri': 'inline' })
  })
})

describe('malformed requests', () => {
  // regression: `'body' in req` is always true because express.json() assigns
  // req.body = undefined when it declines to parse, so these returned 500.
  it('answers 415 to an unsupported Content-Type', async () => {
    const res = await report('hello', 'text/plain')
    assert.equal(res.status, 415)
  })

  it('answers 400 to a POST with no body', async () => {
    const res = await post(ENDPOINT)
    assert.equal(res.status, 400)
  })

  it('answers 400 to malformed JSON without leaking an HTML error page', async () => {
    const res = await report('{')
    assert.equal(res.status, 400)
    assert.doesNotMatch(res.body, /<html/i)
  })

  it('answers 413 to an oversized payload', async () => {
    const res = await report(`{"csp-report":{"x":"${'a'.repeat(200_000)}"}}`)
    assert.equal(res.status, 413)
  })

  for (const [name, body] of [
    ['a missing csp-report key', '{"foo":1}'],
    ['a csp-report that is a string', '{"csp-report":"nope"}'],
    ['a csp-report that is null', '{"csp-report":null}'],
    ['a csp-report that is an array', '{"csp-report":[]}'],
    ['a top-level array', '[{"csp-report":{}}]']
  ]) {
    it(`answers 400 to ${name}`, async () => {
      const before = rows().length
      const res = await report(body)
      assert.equal(res.status, 400)
      assert.equal(rows().length, before, 'nothing should be stored')
    })
  }
})

describe('Reporting API payloads', () => {
  // pins current behaviour; see issue #1 — these should become 204 once the
  // application/reports+json format is supported.
  it('are rejected for now', async () => {
    const res = await report('[{"type":"csp-violation","age":10,"url":"https://example.com/","body":{}}]', 'application/reports+json')
    assert.equal(res.status, 400)
  })
})

describe('other routes', () => {
  it('redirects the root to the spec', async () => {
    const res = await new Promise((resolve, reject) => {
      const req = request({ host: '127.0.0.1', port, path: '/', method: 'GET' }, r => {
        r.resume()
        r.on('end', () => resolve({ status: r.statusCode, location: r.headers.location }))
      })
      req.on('error', reject)
      req.end()
    })

    assert.equal(res.status, 302)
    assert.equal(res.location, 'https://w3c.github.io/reporting/')
  })
})
