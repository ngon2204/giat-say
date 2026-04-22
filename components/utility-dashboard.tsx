"use client"

import { useState, useEffect } from "react"
import { Droplets, Plus, ReceiptText, Trash2, Zap } from "lucide-react"
import { DashboardMetricCard } from "@/components/dashboard-metric-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase, type UtilityBill } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export function UtilityDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [bills, setBills] = useState<UtilityBill[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newBill, setNewBill] = useState({
    type: "electric" as "electric" | "water",
    amount: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchBills()
  }, [])

  const fetchBills = async () => {
    const { data, error } = await supabase.from("utility_bills").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching bills:", error)
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách hóa đơn",
        variant: "destructive",
      })
      return
    }

    setBills(data || [])
  }

  const handleAmountChange = (value: string) => {
    const cleanValue = value.replace(/\D/g, "")
    const formatted = cleanValue ? Number.parseInt(cleanValue).toLocaleString("vi-VN") : ""
    setNewBill({ ...newBill, amount: formatted })
  }

  const handleSubmit = async () => {
    if (!newBill.amount) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập số tiền",
        variant: "destructive",
      })
      return
    }

    const bill = {
      month: selectedMonth,
      year: selectedYear,
      type: newBill.type,
      amount: Number.parseInt(newBill.amount.replace(/\D/g, "")) * 1000,
    }

    const { error } = await supabase.from("utility_bills").upsert([bill], {
      onConflict: "month,year,type",
    })

    if (error) {
      console.error("Error creating bill:", error)
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi thêm hóa đơn",
        variant: "destructive",
      })
      return
    }

    await fetchBills()

    const billType = newBill.type === "electric" ? "điện" : "nước"
    toast({
      title: "Thành công",
      description: `Đã thêm hóa đơn tiền ${billType} tháng ${selectedMonth}/${selectedYear}`,
    })

    setNewBill({
      type: "electric",
      amount: "",
    })
    setIsDialogOpen(false)
  }

  const handleDeleteBill = async (billId: string, billType: string, month: number, year: number) => {
    const typeText = billType === "electric" ? "điện" : "nước"

    if (!confirm(`Bạn có chắc chắn muốn xóa hóa đơn tiền ${typeText} tháng ${month}/${year}?`)) {
      return
    }

    const { error } = await supabase.from("utility_bills").delete().eq("id", billId)

    if (error) {
      console.error("Error deleting bill:", error)
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi xóa hóa đơn",
        variant: "destructive",
      })
      return
    }

    await fetchBills()
    toast({
      title: "Đã xóa",
      description: `Đã xóa hóa đơn tiền ${typeText} tháng ${month}/${year}`,
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

  const monthlyBills = bills.filter((bill) => bill.month === selectedMonth && bill.year === selectedYear)

  const electricBill = monthlyBills.find((bill) => bill.type === "electric")
  const waterBill = monthlyBills.find((bill) => bill.type === "water")
  const totalUtilityCost = monthlyBills.reduce((sum, bill) => sum + bill.amount, 0)

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
                Thêm Hóa Đơn
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md rounded-[1.9rem] p-0">
              <DialogHeader>
                <DialogTitle className="px-6 pt-6">Thêm Hóa Đơn Điện Nước</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 px-6 pb-6">
                <div>
                  <Label>Loại Hóa Đơn</Label>
                  <Select
                    value={newBill.type}
                    onValueChange={(value: "electric" | "water") => setNewBill({ ...newBill, type: value })}
                  >
                    <SelectTrigger className="mt-2 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electric">Tiền Điện</SelectItem>
                      <SelectItem value="water">Tiền Nước</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Số Tiền</Label>
                  <Input
                    className="mt-2"
                    value={newBill.amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="Nhập số tiền (VD: 200 = 200.000đ)"
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  Thêm Hóa Đơn
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DashboardMetricCard
          label="Tiền điện"
          value={`${electricBill ? electricBill.amount.toLocaleString("vi-VN") : "0"}đ`}
          meta={`Tháng ${selectedMonth}/${selectedYear}`}
          icon={Zap}
          accent="rose"
        />

        <DashboardMetricCard
          label="Tiền nước"
          value={`${waterBill ? waterBill.amount.toLocaleString("vi-VN") : "0"}đ`}
          meta={`Tháng ${selectedMonth}/${selectedYear}`}
          icon={Droplets}
          accent="sky"
        />

        <DashboardMetricCard
          label="Tổng chi phí"
          value={`${totalUtilityCost.toLocaleString("vi-VN")}đ`}
          meta={`Tháng ${selectedMonth}/${selectedYear}`}
          icon={ReceiptText}
          accent="amber"
        />
      </div>

      <Card className="dashboard-panel">
        <CardHeader className="px-5 pt-5 pb-0 sm:px-6 sm:pt-6">
          <CardTitle className="dashboard-section-title">Lịch sử hóa đơn</CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
          {monthlyBills.length === 0 ? (
            <div className="dashboard-empty py-10">
              <p className="text-base font-semibold text-slate-700">Chưa có hóa đơn nào trong tháng này</p>
              <p className="text-sm text-slate-500">
                Tháng {selectedMonth}/{selectedYear}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {monthlyBills
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((bill) => (
                  <div key={bill.id} className="dashboard-list-row items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-800">
                          {bill.type === "electric" ? "Tiền Điện" : "Tiền Nước"}
                        </h4>
                        <Badge
                          className={
                            bill.type === "electric"
                              ? "bg-rose-50 text-rose-600 ring-1 ring-rose-100"
                              : "bg-sky-50 text-sky-600 ring-1 ring-sky-100"
                          }
                        >
                          {bill.type === "electric" ? "Điện" : "Nước"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(bill.created_at).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p
                          className={`text-lg font-semibold ${bill.type === "electric" ? "text-rose-500" : "text-sky-500"}`}
                        >
                          {bill.amount.toLocaleString("vi-VN")}đ
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteBill(bill.id, bill.type, bill.month, bill.year)}
                        className="border-red-100 text-red-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
