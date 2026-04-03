import type { NewOrder, NewSupply, Order, Supply, UtilityBill, UtilityBillInput } from "@/lib/types"

export type { NewOrder, NewSupply, Order, Supply, UtilityBill, UtilityBillInput } from "@/lib/types"

type TableName = "orders" | "supplies" | "utility_bills"

type QueryResult<T> = {
  data: T | null
  error: Error | null
  count: null
  status: number
  statusText: string
}

async function request<T>(path: string, init?: RequestInit): Promise<QueryResult<T>> {
  try {
    const response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)

      return {
        data: null,
        error: new Error(payload?.error ?? "Request failed."),
        count: null,
        status: response.status,
        statusText: response.statusText,
      }
    }

    if (response.status === 204) {
      return {
        data: null,
        error: null,
        count: null,
        status: response.status,
        statusText: response.statusText,
      }
    }

    const data = (await response.json()) as T

    return {
      data,
      error: null,
      count: null,
      status: response.status,
      statusText: response.statusText,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unexpected request error."),
      count: null,
      status: 500,
      statusText: "Request failed",
    }
  }
}

class SelectBuilder<T> implements PromiseLike<QueryResult<T[]>> {
  private orderColumn?: string
  private ascending = true

  constructor(private readonly tableName: TableName) {}

  order(column: string, options?: { ascending?: boolean }) {
    this.orderColumn = column
    this.ascending = options?.ascending ?? true
    return this
  }

  private async execute() {
    const result = await request<T[]>(`/api/${this.tableName.replaceAll("_", "-")}`)

    if (!result.data || !this.orderColumn) {
      return result
    }

    const sorted = [...result.data].sort((left, right) => {
      const leftValue = left[this.orderColumn as keyof T] as string | number | null | undefined
      const rightValue = right[this.orderColumn as keyof T] as string | number | null | undefined

      if (leftValue === rightValue) return 0
      if (leftValue == null) return this.ascending ? -1 : 1
      if (rightValue == null) return this.ascending ? 1 : -1

      if (leftValue > rightValue) return this.ascending ? 1 : -1
      return this.ascending ? -1 : 1
    })

    return {
      ...result,
      data: sorted,
    }
  }

  then<TResult1 = QueryResult<T[]>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }
}

function tablePath(tableName: TableName) {
  return `/api/${tableName.replaceAll("_", "-")}`
}

function createTableClient<TData, TInsert>(tableName: TableName) {
  return {
    select: (_columns: string) => new SelectBuilder<TData>(tableName),
    insert: (rows: TInsert[]) => request<TData>(tablePath(tableName), {
      method: "POST",
      body: JSON.stringify(rows[0]),
    }),
    upsert: (rows: TInsert[], _options?: { onConflict?: string }) =>
      request<TData>(tablePath(tableName), {
        method: "POST",
        body: JSON.stringify(rows[0]),
      }),
    delete: () => ({
      eq: (_field: string, value: string) =>
        request<null>(`${tablePath(tableName)}/${value}`, {
          method: "DELETE",
        }),
    }),
  }
}

function from(tableName: "orders"): ReturnType<typeof createTableClient<Order, NewOrder>>
function from(tableName: "supplies"): ReturnType<typeof createTableClient<Supply, NewSupply>>
function from(tableName: "utility_bills"): ReturnType<typeof createTableClient<UtilityBill, UtilityBillInput>>
function from(tableName: TableName) {
  if (tableName === "orders") {
    return createTableClient<Order, NewOrder>(tableName)
  }

  if (tableName === "supplies") {
    return createTableClient<Supply, NewSupply>(tableName)
  }

  return createTableClient<UtilityBill, UtilityBillInput>(tableName)
}

export const supabase = { from }
