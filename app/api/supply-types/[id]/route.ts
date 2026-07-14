import { NextResponse } from "next/server"

import { deleteSupplyType } from "@/lib/neon-data"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const result = await deleteSupplyType(id)

    if (result.status === "not_found") {
      return NextResponse.json({ error: "Loại vật tư không còn tồn tại." }, { status: 404 })
    }

    if (result.status === "has_stock") {
      return NextResponse.json(
        {
          error: `Không thể xóa vì vật tư vẫn còn tồn ${result.stock} sản phẩm. Vui lòng xuất hết tồn kho trước.`,
          stock: result.stock,
        },
        { status: 409 },
      )
    }

    return NextResponse.json(result.supplyType)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể xóa loại vật tư." },
      { status: 500 },
    )
  }
}
