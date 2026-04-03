import { NextResponse } from "next/server"

import { listUtilityBills, upsertUtilityBill } from "@/lib/neon-data"
import type { UtilityBillInput } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const bills = await listUtilityBills()
    return NextResponse.json(bills)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load utility bills." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as UtilityBillInput
    const bill = await upsertUtilityBill(payload)
    return NextResponse.json(bill, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save utility bill." },
      { status: 500 },
    )
  }
}
