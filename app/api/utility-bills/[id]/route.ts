import { NextResponse } from "next/server"

import { deleteUtilityBill } from "@/lib/neon-data"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    await deleteUtilityBill(id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete utility bill." },
      { status: 500 },
    )
  }
}
