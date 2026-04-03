"use client"

import { useEffect, useState } from "react"
import { Download, ReceiptText, WalletCards } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { exportRevenueToExcel } from "@/lib/export-revenue"
import { supabase, type Order } from "@/lib/supabase"

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

export function RevenueDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [orders, setOrders] = useState<Order[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [hasAutoSelectedPeriod, setHasAutoSelectedPeriod] = useState(false)

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchOrders = async () => {
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false })

    if (error) {
      return
    }

    setOrders(data || [])

    if (!hasAutoSelectedPeriod && data && data.length > 0) {
      const [year, month] = data[0].date.split("-").map(Number)
      setSelectedMonth(month)
      setSelectedYear(year)
      setHasAutoSelectedPeriod(true)
    }
  }

  const handleExportExcel = async () => {
    setIsExporting(true)
    try {
      await exportRevenueToExcel(monthlyOrders, selectedMonth, selectedYear)
    } catch (error) {
      console.error("Lỗi khi xuất file:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const years = Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - 2 + index)

  const monthlyOrders = orders.filter((order) => {
    const [year, month] = order.date.split("-").map(Number)
    return month === selectedMonth && year === selectedYear
  })

  const totalRevenue = monthlyOrders.reduce((sum, order) => {
    const amount = typeof order.amount === "number" && !isNaN(order.amount) ? order.amount : 0
    return sum + amount
  }, 0)

  const dailyRevenue = monthlyOrders.reduce(
    (accumulator, order) => {
      const date = order.date
      const amount = typeof order.amount === "number" && !isNaN(order.amount) ? order.amount : 0

      if (!accumulator[date]) {
        accumulator[date] = { orders: 0, revenue: 0 }
      }

      accumulator[date].orders += 1
      accumulator[date].revenue += amount

      return accumulator
    },
    {} as Record<string, { orders: number; revenue: number }>,
  )

  const periodLabel = `${months[selectedMonth - 1]?.label}/${selectedYear}`

  return (
    <div className="dashboard-page">
      <div className="dashboard-toolbar">
        <div className="dashboard-filter-row">
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
        </div>

        <Button onClick={handleExportExcel} variant="outline" className="dashboard-control w-full px-5 sm:w-auto" disabled={isExporting}>
          <Download className="size-4" />
          {isExporting ? "Đang xuất" : "Xuất Excel"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="dashboard-metric border-indigo-100/80 bg-[linear-gradient(180deg,rgba(238,242,255,0.82)_0%,rgba(255,255,255,0.96)_78%)]">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold tracking-[0.01em] text-indigo-500">Số đơn</p>
              <ReceiptText className="size-4 text-indigo-500" />
            </div>
            <p className="mt-4 text-[2rem] font-semibold tracking-tight text-indigo-700 sm:text-[2.25rem]">
              {monthlyOrders.length}
            </p>
            <p className="mt-1 text-sm text-indigo-400">{periodLabel}</p>
          </CardContent>
        </Card>

        <Card className="dashboard-metric border-emerald-100/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.84)_0%,rgba(255,255,255,0.96)_78%)]">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold tracking-[0.01em] text-emerald-500">Doanh thu</p>
              <WalletCards className="size-4 text-emerald-500" />
            </div>
            <p className="mt-4 text-[2rem] font-semibold tracking-tight text-emerald-600 sm:text-[2.25rem]">
              {totalRevenue.toLocaleString("vi-VN")}đ
            </p>
            <p className="mt-1 text-sm text-emerald-400">{periodLabel}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="dashboard-panel">
        <CardHeader className="px-5 pt-5 pb-0 sm:px-6 sm:pt-6">
          <CardTitle className="text-xl text-slate-700">Theo ngày</CardTitle>
        </CardHeader>

        <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
          {Object.keys(dailyRevenue).length === 0 ? (
            <div className="dashboard-empty">
              <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <ReceiptText className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold text-slate-700">Chưa có dữ liệu</p>
                <p className="text-sm text-slate-500">{periodLabel}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(dailyRevenue)
                .sort(([leftDate], [rightDate]) => new Date(rightDate).getTime() - new Date(leftDate).getTime())
                .map(([date, data]) => (
                  <div key={date} className="dashboard-list-row items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-slate-700">
                        {new Date(date).toLocaleDateString("vi-VN")}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{data.orders} đơn</p>
                    </div>

                    <p className="text-lg font-semibold text-emerald-600">{data.revenue.toLocaleString("vi-VN")}đ</p>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
