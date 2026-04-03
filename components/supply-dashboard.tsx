"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { supabase, type Supply } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface Inventory {
  [key: string]: number
}

const supplyTypes = [
  // Nước xả Comfort
  { value: "softener-comfort-baby-3l", label: "Nước xả Comfort Em bé 3L6", category: "Nước xả" },
  { value: "softener-comfort-sunny-3l7", label: "Nước xả Comfort Nắng mới 3L7", category: "Nước xả" },
  { value: "softener-comfort-dry-2l", label: "Nước xả Comfort Kiêu Sa 3L7", category: "Nước xả" },
  { value: "softener-comfort-banmai-3l7", label: "Nước xả Comfort Ban mai 3L7", category: "Nước xả" },
  { value: "softener-ecolife", label: "Nước xả Comfort Vườn Xuân 3L7", category: "Nước xả" },

  // Nước xả Hygiene
  { value: "softener-hygiene-3l5", label: "Nước xả Hygiene 3L5", category: "Nước xả" },

  // Nước xả Downy
  { value: "softener-downy-3l", label: "Nước xả Downy 3L", category: "Nước xả" },
  { value: "softener-downy-3l5", label: "Nước xả Downy 3.5L", category: "Nước xả" },
  { value: "softener-downy-4l-204", label: "Nước xả Downy 4L", category: "Nước xả" },

  // Nước xả Bella
  { value: "softener-bella-3l5", label: "Nước xả Bella 3L", category: "Nước xả" },

  // Nước xả Ecolife
  { value: "softener-downy-3l-157", label: "Nước xả Ecolife 3.5L", category: "Nước xả" },

  // Nước xả DLY
  { value: "softener-dly", label: "Nước xả DLY", category: "Nước xả" },

  // Nước giặt
  { value: "detergent-lix", label: "Nước giặt Lix", category: "Nước giặt" },
  { value: "detergent-ecolife", label: "Nước giặt Ecolife", category: "Nước giặt" },

  // Bột giặt
  { value: "powder-detergent-lix", label: "Bột giặt Lix", category: "Bột giặt" },
  { value: "powder-detergent-pao", label: "Bột giặt Pao", category: "Bột giặt" },

  // Chất tẩy rửa khác
  { value: "baking-soda", label: "Baking Soda", category: "Chất tẩy" },
  { value: "vinegar", label: "Giấm", category: "Chất tẩy" },
  { value: "dish-soap", label: "Nước rửa chén", category: "Chất tẩy" },
  { value: "bleach", label: "Thuốc tẩy", category: "Chất tẩy" },
]

export function SupplyDashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [inventory, setInventory] = useState<Inventory>({})
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
    fetchInventory()
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

  const fetchInventory = async () => {
    const { data, error } = await supabase.from("supplies").select("*")

    if (error) {
      return
    }

    const inventoryCalc: Inventory = {}
    data?.forEach((supply) => {
      if (!inventoryCalc[supply.type]) {
        inventoryCalc[supply.type] = 0
      }
      if (supply.action === "import") {
        inventoryCalc[supply.type] += supply.quantity
      } else {
        inventoryCalc[supply.type] -= supply.quantity
      }
    })

    setInventory(inventoryCalc)
  }

  const handleUnitPriceChange = (value: string) => {
    const cleanValue = value.replace(/\D/g, "")
    const formatted = cleanValue ? Number.parseInt(cleanValue).toLocaleString("vi-VN") : ""
    setNewSupply({ ...newSupply, unitPrice: formatted })
  }

  // Lấy giá trung bình của vật tư từ các lần nhập gần nhất
  const getSupplyPrice = (supplyType: string) => {
    // Tính giá trung bình từ các lần nhập
    const importSupplies = supplies.filter((s) => s.type === supplyType && s.action === "import")
    if (importSupplies.length === 0) return 0

    const recentImports = importSupplies.slice(0, 3)
    const totalPrice = recentImports.reduce((sum, supply) => sum + supply.unit_price, 0)
    return Math.round(totalPrice / recentImports.length)
  }

  // Xử lý khi thay đổi loại hành động
  const handleActionChange = (action: "import" | "export") => {
    setNewSupply({ ...newSupply, action })

    // Nếu chọn xuất kho, tự động điền giá trung bình
    if (action === "export" && newSupply.type) {
      const price = getSupplyPrice(newSupply.type)
      const formatted = price > 0 ? (price / 1000).toLocaleString("vi-VN") : ""
      setNewSupply((prev) => ({ ...prev, unitPrice: formatted }))
    }
  }

  // Xử lý khi thay đổi loại vật tư
  const handleTypeChange = (type: string) => {
    setNewSupply({ ...newSupply, type })

    // Chỉ tự động điền giá khi đang ở chế độ xuất kho
    if (newSupply.action === "export") {
      const price = getSupplyPrice(type)
      const formatted = price > 0 ? (price / 1000).toLocaleString("vi-VN") : ""
      setNewSupply((prev) => ({ ...prev, unitPrice: formatted }))
    }
  }

  const handleSubmit = async () => {
    if (!newSupply.type || !newSupply.quantity || !newSupply.unitPrice) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin bao gồm đơn giá",
        variant: "destructive",
      })
      return
    }

    // Kiểm tra tồn kho khi xuất
    if (newSupply.action === "export") {
      const currentStock = inventory[newSupply.type] || 0
      const exportQuantity = Number.parseInt(newSupply.quantity)

      if (exportQuantity > currentStock) {
        toast({
          title: "Lỗi",
          description: `Không đủ tồn kho. Hiện tại chỉ có ${currentStock} sản phẩm`,
          variant: "destructive",
        })
        return
      }
    }

    const quantity = Number.parseInt(newSupply.quantity)
    const unitPrice = Number.parseInt(newSupply.unitPrice.replace(/\D/g, "")) * 1000
    const totalPrice = quantity * unitPrice

    const supply = {
      date: format(selectedDate, "yyyy-MM-dd"),
      type: newSupply.type,
      quantity: quantity,
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
    await fetchInventory()

    const typeName = supplyTypes.find((t) => t.value === newSupply.type)?.label || newSupply.type
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
    setIsDialogOpen(false)
  }

  const handleDeleteSupply = async (supplyId: string, supplyType: string, action: string) => {
    const typeName = supplyTypes.find((t) => t.value === supplyType)?.label || supplyType
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
    await fetchInventory()
    toast({
      title: "Đã xóa",
      description: `Đã xóa giao dịch ${actionText} ${typeName}`,
    })
  }

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

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  const monthlySupplies = supplies.filter((supply) => {
    const supplyDate = new Date(supply.date)
    return supplyDate.getMonth() + 1 === selectedMonth && supplyDate.getFullYear() === selectedYear
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
        acc[supply.type].quantity += supply.quantity
        acc[supply.type].cost += supply.total_price
        return acc
      },
      {} as Record<string, { quantity: number; cost: number }>,
    )

  // Group supplies by category for better display
  const groupedInventory = supplyTypes.reduce(
    (acc, type) => {
      if (!acc[type.category]) {
        acc[type.category] = []
      }
      acc[type.category].push({
        ...type,
        stock: inventory[type.value] || 0,
      })
      return acc
    },
    {} as Record<string, Array<{ value: string; label: string; category: string; stock: number }>>,
  )

  return (
    <div className="dashboard-page">
      <div className="dashboard-toolbar">
        <div className="dashboard-filter-row w-full md:w-auto">
          <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(Number.parseInt(value))}>
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
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number.parseInt(value))}>
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
            <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md rounded-[1.9rem] p-0">
              <DialogHeader>
                <DialogTitle className="px-6 pt-6">Thêm Vật Tư</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 px-6 pb-6">
                <div>
                  <Label>Ngày</Label>
                  <div className="mt-1">
                    <Input
                      type="date"
                      value={format(selectedDate, "yyyy-MM-dd")}
                      onChange={(e) => {
                        const newDate = new Date(e.target.value)
                        if (!isNaN(newDate.getTime())) {
                          setSelectedDate(newDate)
                        }
                      }}
                      max={format(new Date(), "yyyy-MM-dd")}
                      className="w-full"
                    />
                  </div>
                </div>
                <div>
                  <Label>Loại Vật Tư</Label>
                  <Select value={newSupply.type} onValueChange={handleTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại vật tư" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(groupedInventory).map(([category, items]) => (
                        <div key={category}>
                          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            {category}
                          </div>
                          {items.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex w-full items-center justify-between">
                                <span>{type.label}</span>
                                <span className="text-xs text-slate-400">Tồn: {type.stock}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Hành Động</Label>
                  <Select value={newSupply.action} onValueChange={handleActionChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="import">Nhập kho</SelectItem>
                      <SelectItem value="export">Xuất kho (sử dụng)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Số Lượng</Label>
                  <Input
                    type="number"
                    value={newSupply.quantity}
                    onChange={(e) => setNewSupply({ ...newSupply, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Đơn Giá *</Label>
                  <Input
                    value={newSupply.unitPrice}
                    onChange={(e) => handleUnitPriceChange(e.target.value)}
                    placeholder="Nhập số (VD: 200 = 200.000đ)"
                  />
                </div>
                {newSupply.action === "export" && newSupply.type && (
                  <div className="rounded-[1rem] border border-emerald-100 bg-emerald-50/90 p-3">
                    <p className="text-sm text-emerald-700">
                      <strong>Giá tham khảo:</strong> {(() => {
                        const price = getSupplyPrice(newSupply.type)
                        return price > 0 ? `${(price / 1000).toLocaleString("vi-VN")}k` : "Chưa có dữ liệu"
                      })()}
                    </p>
                    <p className="mt-1 text-xs text-emerald-600">(Dựa trên 3 lần nhập gần nhất)</p>
                  </div>
                )}
                <Button onClick={handleSubmit} className="w-full">
                  Thêm Vật Tư
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="dashboard-metric">
          <CardHeader>
            <CardTitle>Chi Phí Vật Tư Tháng</CardTitle>
            <CardDescription>
              Tháng {selectedMonth}/{selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{monthlyExpenses.toLocaleString("vi-VN")}đ</div>
          </CardContent>
        </Card>

        <Card className="dashboard-panel">
          <CardHeader>
            <CardTitle>Tồn Kho Hiện Tại</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(groupedInventory).map(([category, items]) => (
                <div key={category}>
                  <h4 className="mb-2 text-sm font-semibold text-slate-500">{category}</h4>
                  <div className="space-y-1 pl-2">
                    {items.map((item) => (
                      <div key={item.value} className="flex justify-between text-sm text-slate-600">
                        <span>{item.label}:</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${item.stock <= 0 ? "text-red-500" : "text-green-600"}`}>
                            {item.stock}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
              {Object.entries(monthlyUsage).map(([type, data]) => {
                const typeName = supplyTypes.find((t) => t.value === type)?.label || type
                return (
                  <div key={type} className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <div>
                      <p className="font-medium text-slate-700">{typeName}</p>
                      <p className="text-sm text-muted-foreground">Đã sử dụng: {data.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">{data.cost.toLocaleString("vi-VN")}đ</p>
                    </div>
                  </div>
                )
              })}
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
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((supply) => {
                  const typeName = supplyTypes.find((t) => t.value === supply.type)?.label || supply.type
                  return (
                    <div key={supply.id} className="dashboard-list-row justify-between">
                      <div className="flex flex-1 justify-between items-start gap-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800">{typeName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(supply.date).toLocaleDateString("vi-VN")}
                          </p>
                          <p className="text-sm text-slate-600">
                            {supply.action === "import" ? "Nhập kho" : "Xuất kho"}: {supply.quantity}
                          </p>
                          <p className="text-sm text-slate-600">Đơn giá: {supply.unit_price.toLocaleString("vi-VN")}đ</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className={`font-bold ${supply.action === "import" ? "text-red-600" : "text-blue-600"}`}>
                              {supply.action === "import" ? "-" : ""}
                              {supply.total_price.toLocaleString("vi-VN")}đ
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
    </div>
  )
}
