import pg from "pg"

const { Client } = pg

const args = new Set(process.argv.slice(2))
const schemaOnly = args.has("--schema-only")

const neonDatabaseUrl = process.env.NEON_DATABASE_URL?.trim()
const supabaseProjectRef = process.env.SUPABASE_PROJECT_REF?.trim()
const supabaseUrl = (
  process.env.SUPABASE_URL?.trim() ||
  (supabaseProjectRef ? `https://${supabaseProjectRef}.supabase.co` : "")
).replace(/\/$/, "")
const supabaseKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_KEY?.trim() ||
  process.env.SUPABASE_ANON_KEY?.trim()
)

const TABLES = ["orders", "supplies", "utility_bills"]
const PAGE_SIZE = 1000
const UPSERT_BATCH_SIZE = 200

const SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL DEFAULT '',
  services TEXT[] NOT NULL DEFAULT '{}',
  weight DECIMAL(10,2) DEFAULT 0,
  amount INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  status VARCHAR(20) DEFAULT 'completed',
  payment_method TEXT DEFAULT 'cash',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_status_check'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_status_check
      CHECK (status IN ('pending', 'in_progress', 'ready', 'completed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_payment_method_check'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_payment_method_check
      CHECK (payment_method IN ('cash', 'transfer'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS utility_bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('electric', 'water')),
  amount INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(month, year, type)
);

CREATE TABLE IF NOT EXISTS supplies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  type VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('import', 'export')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_utility_bills_month_year ON utility_bills(month, year);
CREATE INDEX IF NOT EXISTS idx_supplies_date ON supplies(date);
CREATE INDEX IF NOT EXISTS idx_supplies_type ON supplies(type);
`

function assertConfig() {
  if (!neonDatabaseUrl) {
    throw new Error("Missing NEON_DATABASE_URL.")
  }

  if (!schemaOnly && (!supabaseUrl || !supabaseKey)) {
    throw new Error(
      "Missing Supabase source credentials. Set SUPABASE_URL (or SUPABASE_PROJECT_REF) and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY/SUPABASE_ANON_KEY.",
    )
  }
}

function toInteger(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.trunc(number) : fallback
}

function toNumeric(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item))
  }

  if (typeof value === "string" && value.length > 0) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item))
      }
    } catch {}
  }

  return []
}

async function createSchema(client) {
  await client.query(SCHEMA_SQL)
}

async function fetchSupabaseTable(tableName) {
  const rows = []
  let from = 0

  while (true) {
    const url = new URL(`${supabaseUrl}/rest/v1/${tableName}`)
    url.searchParams.set("select", "*")
    url.searchParams.set("order", "id.asc")

    const response = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: "count=exact",
        Range: `${from}-${from + PAGE_SIZE - 1}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Supabase ${tableName} fetch failed (${response.status}): ${errorText}`)
    }

    const batch = await response.json()
    if (!Array.isArray(batch)) {
      throw new Error(`Unexpected response while fetching ${tableName}.`)
    }

    rows.push(...batch)

    if (batch.length < PAGE_SIZE) {
      break
    }

    from += PAGE_SIZE
  }

  return rows
}

function chunk(array, size) {
  const chunks = []
  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size))
  }
  return chunks
}

function buildMultiInsertPlaceholders(rowCount, columnCount, casts = {}) {
  let parameterIndex = 1
  const rows = []

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const columns = []
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const cast = casts[columnIndex] ? `::${casts[columnIndex]}` : ""
      columns.push(`$${parameterIndex}${cast}`)
      parameterIndex += 1
    }
    rows.push(`(${columns.join(", ")})`)
  }

  return rows.join(",\n")
}

async function upsertOrders(client, rows) {
  const batches = chunk(rows, UPSERT_BATCH_SIZE)

  for (const batch of batches) {
    const values = batch.flatMap((row) => [
      row.id,
      row.date,
      row.customer_name ?? "",
      row.phone ?? "",
      toStringArray(row.services),
      toNumeric(row.weight, 0),
      toInteger(row.amount, 0),
      row.note ?? null,
      row.status ?? "completed",
      row.payment_method ?? "cash",
      row.created_at ?? new Date().toISOString(),
    ])

    const placeholders = buildMultiInsertPlaceholders(batch.length, 11, {
      0: "uuid",
      1: "date",
      4: "text[]",
      10: "timestamptz",
    })

    await client.query(
      `
        INSERT INTO orders (
          id,
          date,
          customer_name,
          phone,
          services,
          weight,
          amount,
          note,
          status,
          payment_method,
          created_at
        )
        VALUES ${placeholders}
        ON CONFLICT (id) DO UPDATE SET
          date = EXCLUDED.date,
          customer_name = EXCLUDED.customer_name,
          phone = EXCLUDED.phone,
          services = EXCLUDED.services,
          weight = EXCLUDED.weight,
          amount = EXCLUDED.amount,
          note = EXCLUDED.note,
          status = EXCLUDED.status,
          payment_method = EXCLUDED.payment_method,
          created_at = EXCLUDED.created_at
      `,
      values,
    )
  }
}

async function upsertSupplies(client, rows) {
  const batches = chunk(rows, UPSERT_BATCH_SIZE)

  for (const batch of batches) {
    const values = batch.flatMap((row) => [
      row.id,
      row.date,
      row.type ?? "",
      toInteger(row.quantity, 0),
      toInteger(row.unit_price, 0),
      toInteger(row.total_price, 0),
      row.action ?? "import",
      row.created_at ?? new Date().toISOString(),
    ])

    const placeholders = buildMultiInsertPlaceholders(batch.length, 8, {
      0: "uuid",
      1: "date",
      7: "timestamptz",
    })

    await client.query(
      `
        INSERT INTO supplies (
          id,
          date,
          type,
          quantity,
          unit_price,
          total_price,
          action,
          created_at
        )
        VALUES ${placeholders}
        ON CONFLICT (id) DO UPDATE SET
          date = EXCLUDED.date,
          type = EXCLUDED.type,
          quantity = EXCLUDED.quantity,
          unit_price = EXCLUDED.unit_price,
          total_price = EXCLUDED.total_price,
          action = EXCLUDED.action,
          created_at = EXCLUDED.created_at
      `,
      values,
    )
  }
}

async function upsertUtilityBills(client, rows) {
  const batches = chunk(rows, UPSERT_BATCH_SIZE)

  for (const batch of batches) {
    const values = batch.flatMap((row) => [
      row.id,
      toInteger(row.month, 0),
      toInteger(row.year, 0),
      row.type ?? "electric",
      toInteger(row.amount, 0),
      row.created_at ?? new Date().toISOString(),
    ])

    const placeholders = buildMultiInsertPlaceholders(batch.length, 6, {
      0: "uuid",
      5: "timestamptz",
    })

    await client.query(
      `
        INSERT INTO utility_bills (
          id,
          month,
          year,
          type,
          amount,
          created_at
        )
        VALUES ${placeholders}
        ON CONFLICT (id) DO UPDATE SET
          month = EXCLUDED.month,
          year = EXCLUDED.year,
          type = EXCLUDED.type,
          amount = EXCLUDED.amount,
          created_at = EXCLUDED.created_at
      `,
      values,
    )
  }
}

async function migrateTable(client, tableName, rows) {
  switch (tableName) {
    case "orders":
      await upsertOrders(client, rows)
      return
    case "supplies":
      await upsertSupplies(client, rows)
      return
    case "utility_bills":
      await upsertUtilityBills(client, rows)
      return
    default:
      throw new Error(`Unsupported table: ${tableName}`)
  }
}

async function main() {
  assertConfig()

  const client = new Client({
    connectionString: neonDatabaseUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  await client.connect()

  try {
    console.log("Creating or updating Neon schema...")
    await createSchema(client)

    if (schemaOnly) {
      console.log("Schema is ready on Neon.")
      return
    }

    for (const tableName of TABLES) {
      console.log(`Fetching ${tableName} from Supabase...`)
      const rows = await fetchSupabaseTable(tableName)
      console.log(`Fetched ${rows.length} ${tableName} rows. Migrating to Neon...`)
      await migrateTable(client, tableName, rows)
      console.log(`Finished ${tableName}.`)
    }

    console.log("Supabase backup to Neon completed successfully.")
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
