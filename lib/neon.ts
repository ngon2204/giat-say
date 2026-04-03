import { Pool } from "pg"

declare global {
  var __neonPool__: Pool | undefined
}

const connectionString = process.env.NEON_DATABASE_URL?.trim()

if (!connectionString) {
  throw new Error("Missing NEON_DATABASE_URL.")
}

export const neonPool =
  global.__neonPool__ ??
  new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  })

if (process.env.NODE_ENV !== "production") {
  global.__neonPool__ = neonPool
}
