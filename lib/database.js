import { mkdirSync } from 'node:fs'
import { env } from 'node:process'
import { DatabaseSync } from 'node:sqlite'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// resolve relative to the package, not the current working directory
const path = env.DATABASE_PATH ?? fileURLToPath(new URL('../run/library.db', import.meta.url))
mkdirSync(dirname(path), { recursive: true })

const db = new DatabaseSync(path)
db.exec('PRAGMA journal_mode = WAL;')
db.exec('CREATE TABLE IF NOT EXISTS "csp" ("timestamp" text NOT NULL, "report" text NOT NULL, "useragent" text) STRICT;')
db.exec('CREATE INDEX IF NOT EXISTS "csp_timestamp" ON "csp" ("timestamp");')

const insert = db.prepare('INSERT INTO "csp" ("timestamp", "report", "useragent") VALUES (:timestamp, :report, :useragent)')

export function log (report, useragent) {
  insert.run({
    timestamp: (new Date()).toISOString(),
    report: JSON.stringify(report),
    useragent: useragent ?? null
  })
}

export function close () {
  db.close()
}
