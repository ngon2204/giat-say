import { NextResponse } from "next/server"

import { createSupply, listSupplies } from "@/lib/neon-data"
import type { NewSupply } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supplies = await listSupplies()
    return NextResponse.json(supplies)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load supplies." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as NewSupply
    const supply = await createSupply(payload)
    return NextResponse.json(supply, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create supply." },
      { status: 500 },
    )
  }
}
