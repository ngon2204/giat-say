import { NextResponse } from "next/server"

import { createSupplyType, listSupplyTypes } from "@/lib/neon-data"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supplyTypes = await listSupplyTypes()
    return NextResponse.json(supplyTypes)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load supply types." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { label: string; category: string }
    const supplyType = await createSupplyType(payload.label, payload.category)
    return NextResponse.json(supplyType, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create supply type." },
      { status: 500 },
    )
  }
}
