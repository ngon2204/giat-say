import { NextResponse } from "next/server"

import { createOrder, createOrders, listOrders } from "@/lib/neon-data"
import type { NewOrder } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const orders = await listOrders()
    return NextResponse.json(orders)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load orders." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as NewOrder | NewOrder[]

    if (Array.isArray(payload)) {
      const orders = await createOrders(payload)
      return NextResponse.json(orders, { status: 201 })
    }

    const order = await createOrder(payload)
    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create order." },
      { status: 500 },
    )
  }
}
