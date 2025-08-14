import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync('run/library.db')
db.exec('CREATE TABLE IF NOT EXISTS "csp" ("timestamp" text NOT NULL, "report" text NOT NULL, "useragent" text) STRICT;')

const insert = db.prepare('INSERT INTO "csp" ("timestamp", "report", "useragent") VALUES (:timestamp, :report, :useragent)')

export function log (report, useragent) {
  insert.run({
    timestamp: (new Date()).toISOString(),
    report: JSON.stringify(report),
    useragent
  })
}
