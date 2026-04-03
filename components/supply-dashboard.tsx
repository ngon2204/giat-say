"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { AlertCircle, PackageSearch, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { buildSupplyInventorySnapshot, estimateSupplyExport } from "@/lib/supply-inventory"
import { supabase, type Supply } from "@/lib/supabase"
import { getSupplyLabel, supplyTypes } from "@/lib/supply-types"

const months = [
  { value: 1, label: "Tháng 1" },
  { value: 2, label: "Tháng 2" },
  { value: 3, label: "Tháng 3" },
  { value: 4, label: "Tháng 4" },
  { value: 5, label: "Tháng 5" },
  { value: 6, label: "Tháng 6" },
  { value: 7, label: "Tháng 7" },
  { value: 8, label: "Tháng 8" },
  { value: 9, label: "Tháng 9" },
  { value: 10, label: "Tháng 10" },
  { value: 11, label: "Tháng 11" },
  { value: 12, label: "Tháng 12" },
]

function formatCurrency(amount: number) {
  return `${amount.toLocaleString("vi-VN")}đ`
}

function formatQuantity(quantity: number) {
  return `${quantity.toLocaleString("vi-VN")}`
}

export function SupplyDashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newSupply, setNewSupply] = useState({
    type: "",
    quantity: "",
    unitPrice: "",
    action: "import" as "import" | "export",
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchSupplies()
  }, [])

  const fetchSupplies = async () => {
    const { data, error } = await supabase.from("supplies").select("*").order("created_at", { ascending: false })

    if (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách vật tư",
        variant: "destructive",
      })
      return
    }

    setSupplies(data || [])
  }

  const transactionDate = format(selectedDate, "yyyy-MM-dd")
  const periodEndDate = format(new Date(selectedYear, selectedMonth, 0), "yyyy-MM-dd")
  const fullInventorySnapshot = buildSupplyInventorySnapshot(supplies)
  const periodInventorySnapshot = buildSupplyInventorySnapshot(supplies, { cutoffDate: periodEndDate })
  const transactionInventorySnapshot = buildSupplyInventorySnapshot(supplies, { cutoffDate: transactionDate })

  const exportQuantity = Number.parseInt(newSupply.quantity || "0", 10)
  const exportPreview =
    newSupply.action === "export" && newSupply.type && exportQuantity > 0
      ? estimateSupplyExport(transactionInventorySnapshot.lotsByType[newSupply.type] ?? [], exportQuantity)
      : null

  const handleUnitPriceChange = (value: string) => {
    const cleanValue = value.replace(/\D/g, "")
    const formatted = cleanValue ? Number.parseInt(cleanValue, 10).toLocaleString("vi-VN") : ""
    setNewSupply((previous) => ({ ...previous, unitPrice: formatted }))
  }

  const handleSubmit = async () => {
    if (!newSupply.type || !newSupply.quantity) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ loại vật tư và số lượng",
        variant: "destructive",
      })
      return
    }

    const quantity = Number.parseInt(newSupply.quantity, 10)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast({
        title: "Lỗi",
        description: "Số lượng phải lớn hơn 0",
        variant: "destructive",
      })
      return
    }

    let unitPrice = 0
    let totalPrice = 0

    if (newSupply.action === "import") {
      if (!newSupply.unitPrice) {
        toast({
          title: "Lỗi",
          description: "Vui lòng nhập đơn giá",
          variant: "destructive",
        })
        return
      }

      unitPrice = Number.parseInt(newSupply.unitPrice.replace(/\D/g, ""), 10) * 1000
      totalPrice = quantity * unitPrice
    } else {
      const currentStock = transactionInventorySnapshot.stockByType[newSupply.type] || 0

      if (quantity > currentStock) {
        toast({
          title: "Lỗi",
          description: `Không đủ tồn kho tại ngày ${new Date(transactionDate).toLocaleDateString("vi-VN")}. Hiện còn ${formatQuantity(currentStock)} sản phẩm.`,
          variant: "destructive",
        })
        return
      }

      if (!exportPreview || exportPreview.shortfallQuantity > 0) {
        toast({
          title: "Lỗi",
          description: "Không thể tính giá xuất kho theo lô tồn hiện có",
          variant: "destructive",
        })
        return
      }

      unitPrice = exportPreview.averageUnitPrice
      totalPrice = exportPreview.totalCost
    }

    const supply = {
      date: transactionDate,
      type: newSupply.type,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      action: newSupply.action,
    }

    const { error } = await supabase.from("supplies").insert([supply])

    if (error) {
      console.error("Error creating supply:", error)
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi thêm vật tư",
        variant: "destructive",
      })
      return
    }

    await fetchSupplies()

    const typeName = getSupplyLabel(newSupply.type)
    toast({
      title: "Thành công",
      description: `Đã ${newSupply.action === "import" ? "nhập" : "xuất"} ${quantity} ${typeName}`,
    })

    setNewSupply({
      type: "",
      quantity: "",
      unitPrice: "",
      action: "import",
    })
    setSelectedDate(new Date())
    setIsDialogOpen(false)
  }

  const handleDeleteSupply = async (supplyId: string, supplyType: string, action: string) => {
    const typeName = getSupplyLabel(supplyType)
    const actionText = action === "import" ? "nhập kho" : "xuất kho"

    if (!confirm(`Bạn có chắc chắn muốn xóa giao dịch ${actionText} ${typeName}?`)) {
      return
    }

    const { error } = await supabase.from("supplies").delete().eq("id", supplyId)

    if (error) {
      console.error("Error deleting supply:", error)
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi xóa vật tư",
        variant: "destructive",
      })
      return
    }

    await fetchSupplies()
    toast({
      title: "Đã xóa",
      description: `Đã xóa giao dịch ${actionText} ${typeName}`,
    })
  }

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  const monthlySupplies = supplies.filter((supply) => {
    const [year, month] = supply.date.split("-").map(Number)
    return month === selectedMonth && year === selectedYear
  })

  const monthlyExpenses = monthlySupplies
    .filter((supply) => supply.action === "import")
    .reduce((sum, supply) => sum + supply.total_price, 0)

  const monthlyUsage = monthlySupplies
    .filter((supply) => supply.action === "export")
    .reduce(
      (acc, supply) => {
        if (!acc[supply.type]) {
          acc[supply.type] = { quantity: 0, cost: 0 }
        }

        const fifoCost = fullInventorySnapshot.exportCostsById[supply.id]?.totalCost ?? supply.total_price

        acc[supply.type].quantity += supply.quantity
        acc[supply.type].cost += fifoCost
        return acc
      },
      {} as Record<string, { quantity: number; cost: number }>,
    )

  const groupedInventory = supplyTypes.reduce(
    (acc, type) => {
      const stock = periodInventorySnapshot.stockByType[type.value] || 0
      const lots = periodInventorySnapshot.lotsByType[type.value] ?? []

      if (!acc[type.category]) {
        acc[type.category] = []
      }

      if (stock > 0) {
        acc[type.category].push({
          ...type,
          stock,
          lots,
        })
      }

      return acc
    },
    {} as Record<
      string,
      Array<{
        value: string
        label: string
        category: string
        stock: number
        lots: ReturnType<typeof buildSupplyInventorySnapshot>["lotsByType"][string]
      }>
    >,
  )

  const groupedOptions = supplyTypes.reduce(
    (acc, type) => {
      if (!acc[type.category]) {
        acc[type.category] = []
      }

      acc[type.category].push({
        ...type,
        stock: transactionInventorySnapshot.stockByType[type.value] || 0,
      })

      return acc
    },
    {} as Record<string, Array<{ value: string; label: string; category: string; stock: number }>>,
  )

  return (
    <div className="dashboard-page">
      <div className="dashboard-toolbar">
        <div className="dashboard-filter-row w-full md:w-auto">
          <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(Number.parseInt(value, 10))}>
            <SelectTrigger className="dashboard-control w-full sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number.parseInt(value, 10))}>
            <SelectTrigger className="dashboard-control w-full sm:w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="dashboard-primary-button w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Thêm Vật Tư
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-1rem)] max-w-md overflow-hidden rounded-[1.9rem] p-0 sm:w-[calc(100vw-1.5rem)]">
              <DialogHeader>
                <DialogTitle className="px-5 pt-6 sm:px-6">Thêm Vật Tư</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
                <div className="space-y-1.5">
                  <Label>Ngày</Label>
                  <div className="w-full overflow-hidden rounded-[1rem]">
                    <Input
                      type="date"
                      value={transactionDate}
                      onChange={(event) => {
                        const nextDate = new Date(event.target.value)
                        if (!Number.isNaN(nextDate.getTime())) {
                          setSelectedDate(nextDate)
                        }
                      }}
                      max={format(new Date(), "yyyy-MM-dd")}
                      className="w-full min-w-0 max-w-full text-base [color-scheme:light] sm:text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Loại Vật Tư</Label>
                  <Select
                    value={newSupply.type}
                    onValueChange={(value) => setNewSupply((previous) => ({ ...previous, type: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn loại vật tư" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(groupedOptions).map(([category, items]) => (
                        <div key={category}>
                          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            {category}
                          </div>
                          {items.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex w-full items-center justify-between gap-3">
                                <span className="truncate">{type.label}</span>
                                <span className="text-xs text-slate-400">Tồn: {type.stock}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Hành Động</Label>
                  <Select
                    value={newSupply.action}
                    onValueChange={(value: "import" | "export") =>
                      setNewSupply((previous) => ({
                        ...previous,
                        action: value,
                        unitPrice: value === "import" ? previous.unitPrice : "",
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="import">Nhập kho</SelectItem>
                      <SelectItem value="export">Xuất kho</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Số Lượng</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={newSupply.quantity}
                    onChange={(event) => setNewSupply((previous) => ({ ...previous, quantity: event.target.value }))}
                  />
                </div>

                {newSupply.action === "import" ? (
                  <div className="space-y-1.5">
                    <Label>Đơn Giá *</Label>
                    <Input
                      value={newSupply.unitPrice}
                      onChange={(event) => handleUnitPriceChange(event.target.value)}
                      placeholder="Nhập số (VD: 200 = 200.000đ)"
                      inputMode="numeric"
                    />
                  </div>
                ) : (
                  <div className="rounded-[1.15rem] border border-emerald-100 bg-emerald-50/90 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-white p-1.5 text-emerald-500 shadow-xs">
                        <PackageSearch className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-emerald-700">Xuất kho theo lô nhập cũ trước</p>
                        <p className="mt-1 text-xs leading-5 text-emerald-600">
                          Hệ thống sẽ tự trừ theo FIFO tại ngày {new Date(transactionDate).toLocaleDateString("vi-VN")}.
                        </p>
                      </div>
                    </div>

                    {newSupply.type && exportQuantity > 0 ? (
                      exportPreview && exportPreview.shortfallQuantity === 0 ? (
                        <div className="mt-4 space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[1rem] bg-white/88 p-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-500">
                                Tổng giá xuất
                              </p>
                              <p className="mt-2 text-lg font-semibold text-emerald-700">
                                {formatCurrency(exportPreview.totalCost)}
                              </p>
                            </div>
                            <div className="rounded-[1rem] bg-white/88 p-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-500">
                                Đơn giá bình quân
                              </p>
                              <p className="mt-2 text-lg font-semibold text-emerald-700">
                                {formatCurrency(exportPreview.averageUnitPrice)}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {exportPreview.allocations.map((allocation) => (
                              <div
                                key={`${allocation.lotKey}-${allocation.quantity}`}
                                className="flex items-center justify-between rounded-[1rem] bg-white/80 px-3 py-2 text-sm"
                              >
                                <div>
                                  <p className="font-medium text-slate-700">
                                    {allocation.quantity} x {formatCurrency(allocation.unitPrice)}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Lô nhập {new Date(allocation.date).toLocaleDateString("vi-VN")}
                                  </p>
                                </div>
                                <p className="font-semibold text-emerald-700">{formatCurrency(allocation.totalCost)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-[1rem] border border-red-100 bg-red-50/90 p-3 text-sm text-red-600">
                          Không đủ tồn kho ở ngày {new Date(transactionDate).toLocaleDateString("vi-VN")}. Hệ thống đang
                          thiếu {formatQuantity(exportPreview?.shortfallQuantity ?? exportQuantity)} sản phẩm để xuất.
                        </div>
                      )
                    ) : (
                      <div className="mt-4 rounded-[1rem] bg-white/80 p-3 text-sm text-slate-500">
                        Chọn loại vật tư và nhập số lượng để xem hệ thống đang trừ từ lô nào.
                      </div>
                    )}
                  </div>
                )}

                <Button onClick={handleSubmit} className="w-full">
                  {newSupply.action === "import" ? "Thêm Vật Tư" : "Xuất Vật Tư"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="dashboard-metric">
          <CardHeader>
            <CardTitle>Chi Phí Vật Tư Tháng</CardTitle>
            <CardDescription>
              Tháng {selectedMonth}/{selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{formatCurrency(monthlyExpenses)}</div>
          </CardContent>
        </Card>

        <Card className="dashboard-panel">
          <CardHeader>
            <CardTitle>Tồn Theo Lô Cuối Kỳ</CardTitle>
            <CardDescription>
              Chốt tồn tới ngày {new Date(periodEndDate).toLocaleDateString("vi-VN")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(groupedInventory).length === 0 ? (
              <div className="dashboard-empty py-10">
                <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <PackageSearch className="size-6" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-700">Chưa có tồn kho cuối kỳ</p>
                  <p className="text-sm text-slate-500">
                    Hãy chọn tháng khác hoặc thêm giao dịch nhập kho để theo dõi từng lô còn lại.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {Object.entries(groupedInventory).map(([category, items]) => (
                  <div key={category} className="space-y-3">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">{category}</h4>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.value} className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/92 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800">{item.label}</p>
                              <p className="mt-1 text-sm text-slate-500">
                                Còn {formatQuantity(item.stock)} sản phẩm ở cuối kỳ
                              </p>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-emerald-600 shadow-xs">
                              {formatQuantity(item.stock)}
                            </span>
                          </div>

                          <div className="mt-3 space-y-2">
                            {item.lots.map((lot) => (
                              <div
                                key={lot.lotKey}
                                className="flex items-center justify-between gap-3 rounded-[1rem] bg-white/90 px-3 py-2 text-sm"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium text-slate-700">
                                    Lô {new Date(lot.date).toLocaleDateString("vi-VN")}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {formatCurrency(lot.unitPrice)} mỗi sản phẩm
                                  </p>
                                </div>
                                <p className="whitespace-nowrap font-semibold text-slate-700">
                                  Còn {formatQuantity(lot.remainingQuantity)}/{formatQuantity(lot.importedQuantity)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="dashboard-panel">
        <CardHeader>
          <CardTitle>Sử Dụng Vật Tư Trong Tháng</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(monthlyUsage).length === 0 ? (
            <p className="text-muted-foreground">Chưa có dữ liệu sử dụng trong tháng này</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(monthlyUsage).map(([type, data]) => (
                <div key={type} className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <div>
                    <p className="font-medium text-slate-700">{getSupplyLabel(type)}</p>
                    <p className="text-sm text-muted-foreground">Đã sử dụng: {formatQuantity(data.quantity)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{formatCurrency(data.cost)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="dashboard-panel">
        <CardHeader>
          <CardTitle>Lịch Sử Vật Tư</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlySupplies.length === 0 ? (
            <p className="text-muted-foreground">Chưa có dữ liệu trong tháng này</p>
          ) : (
            <div className="space-y-4">
              {monthlySupplies
                .sort((left, right) => {
                  const dateCompare = new Date(right.date).getTime() - new Date(left.date).getTime()
                  if (dateCompare !== 0) {
                    return dateCompare
                  }
                  return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
                })
                .map((supply) => {
                  const exportCost = fullInventorySnapshot.exportCostsById[supply.id]
                  const displayTotal = supply.action === "export" ? exportCost?.totalCost ?? supply.total_price : supply.total_price

                  return (
                    <div key={supply.id} className="dashboard-list-row justify-between">
                      <div className="flex flex-1 items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800">{getSupplyLabel(supply.type)}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(supply.date).toLocaleDateString("vi-VN")}
                          </p>
                          <p className="text-sm text-slate-600">
                            {supply.action === "import" ? "Nhập kho" : "Xuất kho"}: {formatQuantity(supply.quantity)}
                          </p>

                          {supply.action === "import" ? (
                            <p className="text-sm text-slate-600">Đơn giá: {formatCurrency(supply.unit_price)}</p>
                          ) : exportCost && exportCost.allocations.length > 0 ? (
                            <div className="mt-2 space-y-1">
                              {exportCost.allocations.map((allocation) => (
                                <p key={`${supply.id}-${allocation.lotKey}`} className="text-xs text-slate-500">
                                  {allocation.quantity} x {formatCurrency(allocation.unitPrice)} từ lô{" "}
                                  {new Date(allocation.date).toLocaleDateString("vi-VN")}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-600">Đơn giá: {formatCurrency(supply.unit_price)}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className={`font-bold ${supply.action === "import" ? "text-red-600" : "text-blue-600"}`}>
                              {supply.action === "import" ? "-" : ""}
                              {formatCurrency(displayTotal)}
                            </p>
                          </div>

                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteSupply(supply.id, supply.type, supply.action)}
                            className="border-red-100 text-red-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {newSupply.action === "export" && exportPreview?.shortfallQuantity ? (
        <div className="dashboard-panel border-red-100 bg-red-50/90 p-4">
          <div className="flex items-start gap-3 text-red-600">
            <AlertCircle className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-semibold">Thiếu tồn kho để xuất</p>
              <p className="mt-1 text-sm text-red-500">
                Kiểm tra lại số lượng hoặc xem tồn theo lô ở trên để biết chính xác sản phẩm nào còn ở giá nào.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
