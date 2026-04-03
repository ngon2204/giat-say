import type { Supply } from "@/lib/types"

export interface SupplyLotBalance {
  lotKey: string
  supplyId: string
  type: string
  date: string
  unitPrice: number
  importedQuantity: number
  remainingQuantity: number
  createdAt: string
}

export interface SupplyAllocation {
  lotKey: string
  supplyId: string
  date: string
  unitPrice: number
  quantity: number
  totalCost: number
}

export interface SupplyExportValuation {
  supplyId?: string
  requestedQuantity: number
  totalCost: number
  averageUnitPrice: number
  allocations: SupplyAllocation[]
  availableQuantity: number
  shortfallQuantity: number
}

export interface SupplyInventorySnapshot {
  stockByType: Record<string, number>
  lotsByType: Record<string, SupplyLotBalance[]>
  exportCostsById: Record<string, SupplyExportValuation>
}

function compareSupplies(left: Supply, right: Supply) {
  const dateCompare = left.date.localeCompare(right.date)
  if (dateCompare !== 0) {
    return dateCompare
  }

  const createdAtCompare = (left.created_at ?? "").localeCompare(right.created_at ?? "")
  if (createdAtCompare !== 0) {
    return createdAtCompare
  }

  if (left.action === right.action) {
    return 0
  }

  return left.action === "import" ? -1 : 1
}

function cloneLots(lots: SupplyLotBalance[]) {
  return lots.map((lot) => ({ ...lot }))
}

function buildValuation(lots: SupplyLotBalance[], requestedQuantity: number, supplyId?: string): SupplyExportValuation {
  let remainingToAllocate = requestedQuantity
  const allocations: SupplyAllocation[] = []
  const workingLots = cloneLots(lots)

  for (const lot of workingLots) {
    if (remainingToAllocate <= 0) {
      break
    }

    if (lot.remainingQuantity <= 0) {
      continue
    }

    const quantity = Math.min(remainingToAllocate, lot.remainingQuantity)
    remainingToAllocate -= quantity
    lot.remainingQuantity -= quantity

    allocations.push({
      lotKey: lot.lotKey,
      supplyId: lot.supplyId,
      date: lot.date,
      unitPrice: lot.unitPrice,
      quantity,
      totalCost: quantity * lot.unitPrice,
    })
  }

  const totalCost = allocations.reduce((sum, allocation) => sum + allocation.totalCost, 0)
  const availableQuantity = workingLots.reduce((sum, lot) => sum + lot.remainingQuantity, 0)
  const fulfilledQuantity = requestedQuantity - remainingToAllocate

  return {
    supplyId,
    requestedQuantity,
    totalCost,
    averageUnitPrice: fulfilledQuantity > 0 ? Math.round(totalCost / fulfilledQuantity) : 0,
    allocations,
    availableQuantity,
    shortfallQuantity: remainingToAllocate,
  }
}

export function buildSupplyInventorySnapshot(
  supplies: Supply[],
  options?: {
    cutoffDate?: string
  },
): SupplyInventorySnapshot {
  const cutoffDate = options?.cutoffDate

  const filteredSupplies = cutoffDate
    ? supplies.filter((supply) => supply.date <= cutoffDate)
    : supplies

  const sortedSupplies = [...filteredSupplies].sort(compareSupplies)
  const lotsByType: Record<string, SupplyLotBalance[]> = {}
  const exportCostsById: Record<string, SupplyExportValuation> = {}

  for (const supply of sortedSupplies) {
    if (!lotsByType[supply.type]) {
      lotsByType[supply.type] = []
    }

    if (supply.action === "import") {
      lotsByType[supply.type].push({
        lotKey: `${supply.id}:${supply.date}`,
        supplyId: supply.id,
        type: supply.type,
        date: supply.date,
        unitPrice: supply.unit_price,
        importedQuantity: supply.quantity,
        remainingQuantity: supply.quantity,
        createdAt: supply.created_at,
      })
      continue
    }

    const valuation = buildValuation(lotsByType[supply.type], supply.quantity, supply.id)
    exportCostsById[supply.id] = valuation

    let remainingToConsume = supply.quantity
    for (const lot of lotsByType[supply.type]) {
      if (remainingToConsume <= 0) {
        break
      }

      if (lot.remainingQuantity <= 0) {
        continue
      }

      const quantity = Math.min(remainingToConsume, lot.remainingQuantity)
      remainingToConsume -= quantity
      lot.remainingQuantity -= quantity
    }
  }

  const stockByType = Object.fromEntries(
    Object.entries(lotsByType).map(([type, lots]) => [
      type,
      lots.reduce((sum, lot) => sum + lot.remainingQuantity, 0),
    ]),
  )

  return {
    stockByType,
    lotsByType: Object.fromEntries(
      Object.entries(lotsByType).map(([type, lots]) => [type, lots.filter((lot) => lot.remainingQuantity > 0)]),
    ),
    exportCostsById,
  }
}

export function estimateSupplyExport(lots: SupplyLotBalance[], requestedQuantity: number) {
  return buildValuation(lots, requestedQuantity)
}
