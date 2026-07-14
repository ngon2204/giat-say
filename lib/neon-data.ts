import { neonPool } from "@/lib/neon"
import { findLegacySupplyTypes } from "@/lib/supply-types"
import type { NewOrder, NewSupply, Order, Supply, SupplyType, UtilityBill, UtilityBillInput } from "@/lib/types"

export async function listOrders() {
  const result = await neonPool.query<Order>(
    `
      SELECT
        id,
        TO_CHAR(date, 'YYYY-MM-DD') AS date,
        customer_name,
        phone,
        services,
        weight,
        amount,
        COALESCE(note, '') AS note,
        status,
        payment_method,
        created_at
      FROM orders
      ORDER BY created_at DESC
    `,
  )

  return result.rows
}

export async function createOrder(order: NewOrder) {
  const result = await neonPool.query<Order>(
    `
      INSERT INTO orders (
        date,
        customer_name,
        phone,
        services,
        weight,
        amount,
        note,
        status,
        payment_method
      )
      VALUES ($1, $2, $3, $4::text[], $5, $6, $7, $8, $9)
      RETURNING
        id,
        TO_CHAR(date, 'YYYY-MM-DD') AS date,
        customer_name,
        phone,
        services,
        weight,
        amount,
        COALESCE(note, '') AS note,
        status,
        payment_method,
        created_at
    `,
    [
      order.date,
      order.customer_name,
      order.phone,
      order.services,
      order.weight,
      order.amount,
      order.note,
      order.status,
      order.payment_method,
    ],
  )

  return result.rows[0]
}

export async function createOrders(orders: NewOrder[]) {
  if (orders.length === 0) {
    return []
  }

  const client = await neonPool.connect()

  try {
    await client.query("BEGIN")

    const createdOrders: Order[] = []

    for (const order of orders) {
      const result = await client.query<Order>(
        `
          INSERT INTO orders (
            date,
            customer_name,
            phone,
            services,
            weight,
            amount,
            note,
            status,
            payment_method
          )
          VALUES ($1, $2, $3, $4::text[], $5, $6, $7, $8, $9)
          RETURNING
            id,
            TO_CHAR(date, 'YYYY-MM-DD') AS date,
            customer_name,
            phone,
            services,
            weight,
            amount,
            COALESCE(note, '') AS note,
            status,
            payment_method,
            created_at
        `,
        [
          order.date,
          order.customer_name,
          order.phone,
          order.services,
          order.weight,
          order.amount,
          order.note,
          order.status,
          order.payment_method,
        ],
      )

      createdOrders.push(result.rows[0])
    }

    await client.query("COMMIT")
    return createdOrders
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

export async function deleteOrder(id: string) {
  await neonPool.query("DELETE FROM orders WHERE id = $1", [id])
}

export async function listSupplies() {
  const result = await neonPool.query<Supply>(
    `
      SELECT
        id,
        TO_CHAR(date, 'YYYY-MM-DD') AS date,
        type,
        quantity,
        unit_price,
        total_price,
        action,
        created_at
      FROM supplies
      ORDER BY created_at DESC
    `,
  )

  return result.rows
}

export async function createSupply(supply: NewSupply) {
  const result = await neonPool.query<Supply>(
    `
      INSERT INTO supplies (
        date,
        type,
        quantity,
        unit_price,
        total_price,
        action
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        TO_CHAR(date, 'YYYY-MM-DD') AS date,
        type,
        quantity,
        unit_price,
        total_price,
        action,
        created_at
    `,
    [supply.date, supply.type, supply.quantity, supply.unit_price, supply.total_price, supply.action],
  )

  return result.rows[0]
}

export async function deleteSupply(id: string) {
  await neonPool.query("DELETE FROM supplies WHERE id = $1", [id])
}

export async function listUtilityBills() {
  const result = await neonPool.query<UtilityBill>(
    `
      SELECT
        id,
        month,
        year,
        type,
        amount,
        created_at
      FROM utility_bills
      ORDER BY created_at DESC
    `,
  )

  return result.rows
}

export async function upsertUtilityBill(bill: UtilityBillInput) {
  const result = await neonPool.query<UtilityBill>(
    `
      INSERT INTO utility_bills (
        month,
        year,
        type,
        amount
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (month, year, type)
      DO UPDATE SET
        amount = EXCLUDED.amount
      RETURNING
        id,
        month,
        year,
        type,
        amount,
        created_at
    `,
    [bill.month, bill.year, bill.type, bill.amount],
  )

  return result.rows[0]
}

export async function deleteUtilityBill(id: string) {
  await neonPool.query("DELETE FROM utility_bills WHERE id = $1", [id])
}

export async function listSupplyTypes() {
  const result = await neonPool.query<SupplyType>(
    `
      SELECT
        id,
        label,
        category,
        created_at
      FROM supply_types
      ORDER BY category, label
    `,
  )

  return result.rows
}

export async function createSupplyType(label: string, category: string) {
  const result = await neonPool.query<SupplyType>(
    `
      INSERT INTO supply_types (label, category)
      VALUES ($1, $2)
      RETURNING
        id,
        label,
        category,
        created_at
    `,
    [label, category],
  )

  return result.rows[0]
}

export async function deleteSupplyType(id: string) {
  const client = await neonPool.connect()

  try {
    await client.query("BEGIN")

    const supplyTypeResult = await client.query<SupplyType>(
      `
        SELECT
          id,
          label,
          category,
          created_at
        FROM supply_types
        WHERE id = $1
        FOR UPDATE
      `,
      [id],
    )

    const supplyType = supplyTypeResult.rows[0]
    if (!supplyType) {
      await client.query("ROLLBACK")
      return { status: "not_found" as const }
    }

    const inventoryTypeKeys = [
      id,
      ...findLegacySupplyTypes(supplyType.label, supplyType.category).map((item) => item.value),
    ]
    const stockResult = await client.query<{ stock: number }>(
      `
        SELECT COALESCE(
          SUM(CASE WHEN action = 'import' THEN quantity ELSE -quantity END),
          0
        )::integer AS stock
        FROM supplies
        WHERE type = ANY($1::text[])
      `,
      [Array.from(new Set(inventoryTypeKeys))],
    )
    const stock = Number(stockResult.rows[0]?.stock ?? 0)

    if (stock > 0) {
      await client.query("ROLLBACK")
      return { status: "has_stock" as const, stock, supplyType }
    }

    await client.query("DELETE FROM supply_types WHERE id = $1", [id])
    await client.query("COMMIT")

    return { status: "deleted" as const, supplyType }
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
