import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"
import pg from "pg"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error("Usage: node run-sql.mjs <file.sql> [...]")
  process.exit(1)
}

let connectionString =
  process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL
if (!connectionString) {
  console.error("[v0] Missing POSTGRES_URL_NON_POOLING / POSTGRES_URL")
  process.exit(1)
}

// Strip any sslmode from the URL so the explicit ssl object below takes effect
// (newer pg treats sslmode=require as verify-full, which rejects Supabase's chain).
connectionString = connectionString.replace(/[?&]sslmode=[^&]*/g, "")

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

await client.connect()
console.log("[v0] Connected to Postgres")

for (const file of files) {
  const full = path.resolve(__dirname, file)
  const sql = await readFile(full, "utf8")
  console.log(`[v0] Running ${file} ...`)
  try {
    await client.query(sql)
    console.log(`[v0] OK ${file}`)
  } catch (err) {
    console.error(`[v0] FAILED ${file}:`, err.message)
    await client.end()
    process.exit(1)
  }
}

await client.end()
console.log("[v0] All scripts executed successfully")
