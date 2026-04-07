"use client"

import { useEffect, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { buildSupplyInventorySnapshot } from "@/lib/supply-inventory"
import { getSupplyLabel, getSupplyType } from "@/lib/supply-types"
import { supabase, type Order, type Supply, type UtilityBill } from "@/lib/supabase"

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

export function ProfitDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [orders, setOrders] = useState<Order[]>([])
  const [bills, setBills] = useState<UtilityBill[]>([])
  const [supplies, setSupplies] = useState<Supply[]>([])

  const fetchOrders = async () => {
    const { data } = await supabase.from("orders").select("*")
    setOrders(data || [])
  }

  const fetchBills = async () => {
    const { data } = await supabase.from("utility_bills").select("*")
    setBills(data || [])
  }

  const fetchSupplies = async () => {
    const { data } = await supabase.from("supplies").select("*")
    setSupplies(data || [])
  }

  useEffect(() => {
    fetchOrders()
    fetchBills()
    fetchSupplies()

    const interval = setInterval(() => {
      fetchOrders()
      fetchBills()
      fetchSupplies()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const years = Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - 2 + index)

  const formatCurrency = (amount: number) => {
    const validAmount = typeof amount === "number" && !Number.isNaN(amount) ? amount : 0
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(validAmount)
  }

  const monthlyOrders = orders.filter((order) => {
    const [year, month] = order.date.split("-").map(Number)
    return month === selectedMonth && year === selectedYear
  })

  const totalRevenue = monthlyOrders.reduce((sum, order) => {
    const amount = typeof order.amount === "number" && !Number.isNaN(order.amount) ? order.amount : 0
    return sum + amount
  }, 0)

  const monthlyBills = bills.filter((bill) => bill.month === selectedMonth && bill.year === selectedYear)
  const totalUtilityCost = monthlyBills.reduce((sum, bill) => {
    const amount = typeof bill.amount === "number" && !Number.isNaN(bill.amount) ? bill.amount : 0
    return sum + amount
  }, 0)

  const monthlySupplies = supplies.filter((supply) => {
    const [year, month] = supply.date.split("-").map(Number)
    return month === selectedMonth && year === selectedYear && supply.action === "export"
  })

  const supplyInventorySnapshot = buildSupplyInventorySnapshot(supplies)

  const totalSupplyCost = monthlySupplies.reduce((sum, supply) => {
    const totalPrice = supplyInventorySnapshot.exportCostsById[supply.id]?.totalCost ?? supply.total_price ?? 0
    return sum + totalPrice
  }, 0)

  const totalCosts = totalUtilityCost + totalSupplyCost
  const netProfit = totalRevenue - totalCosts

  const periodLabel = months[selectedMonth - 1]?.label ?? `Tháng ${selectedMonth}`
  const totalOrders = monthlyOrders.length
  const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
  const electricCost = monthlyBills.find((bill) => bill.type === "electric")?.amount ?? 0
  const waterCost = monthlyBills.find((bill) => bill.type === "water")?.amount ?? 0
  const supplyCostByCategory = Object.entries(
    monthlySupplies.reduce(
      (acc, supply) => {
        const category = getSupplyType(supply.type)?.category || "Khác"
        const totalPrice = supplyInventorySnapshot.exportCostsById[supply.id]?.totalCost ?? supply.total_price ?? 0
        acc[category] = (acc[category] ?? 0) + totalPrice
        return acc
      },
      {} as Record<string, number>,
    ),
  ).sort((left, right) => right[1] - left[1])

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
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="dashboard-metric border-emerald-100/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.86)_0%,rgba(255,255,255,0.96)_78%)]">
          <CardHeader className="p-0">
            <CardTitle className="text-base text-emerald-700">Tổng doanh thu</CardTitle>
            <CardDescription>{periodLabel}/{selectedYear}</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <div className="text-3xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card className="dashboard-metric border-rose-100/80 bg-[linear-gradient(180deg,rgba(255,241,242,0.86)_0%,rgba(255,255,255,0.96)_78%)]">
          <CardHeader className="p-0">
            <CardTitle className="text-base text-rose-700">Tổng chi phí</CardTitle>
            <CardDescription>{periodLabel}/{selectedYear}</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <div className="text-3xl font-bold text-rose-600">{formatCurrency(totalCosts)}</div>
          </CardContent>
        </Card>

        <Card className="dashboard-metric border-indigo-100/80 bg-[linear-gradient(180deg,rgba(238,242,255,0.86)_0%,rgba(255,255,255,0.96)_78%)]">
          <CardHeader className="p-0">
            <CardTitle className="text-base text-indigo-700">Lãi thực</CardTitle>
            <CardDescription>{periodLabel}/{selectedYear}</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <div className={`text-3xl font-bold ${netProfit >= 0 ? "text-indigo-600" : "text-red-600"}`}>
              {formatCurrency(netProfit)}
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-metric border-sky-100/80 bg-[linear-gradient(180deg,rgba(240,249,255,0.86)_0%,rgba(255,255,255,0.96)_78%)]">
          <CardHeader className="p-0">
            <CardTitle className="text-base text-sky-700">Biên lợi nhuận</CardTitle>
            <CardDescription>{periodLabel}/{selectedYear}</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <div className={`text-3xl font-bold ${profitMargin >= 0 ? "text-sky-600" : "text-red-600"}`}>
              {profitMargin.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-metric border-violet-100/80 bg-[linear-gradient(180deg,rgba(245,243,255,0.86)_0%,rgba(255,255,255,0.96)_78%)]">
          <CardHeader className="p-0">
            <CardTitle className="text-base text-violet-700">Số đơn trong kỳ</CardTitle>
            <CardDescription>{periodLabel}/{selectedYear}</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <div className="text-3xl font-bold text-violet-600">{totalOrders}</div>
          </CardContent>
        </Card>

        <Card className="dashboard-metric border-slate-200/90 bg-[linear-gradient(180deg,rgba(248,250,252,0.9)_0%,rgba(255,255,255,0.96)_78%)]">
          <CardHeader className="p-0">
            <CardTitle className="text-base text-slate-700">Trung bình / đơn</CardTitle>
            <CardDescription>{periodLabel}/{selectedYear}</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <div className="text-3xl font-bold text-slate-700">{formatCurrency(averageOrderValue)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="dashboard-panel">
          <CardHeader className="px-5 pt-5 pb-0 sm:px-6 sm:pt-6">
            <CardTitle>Chi tiết tính lãi</CardTitle>
            <CardDescription>Kỳ: {periodLabel}/{selectedYear}</CardDescription>
          </CardHeader>
          <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-medium text-slate-600">Tổng doanh thu</span>
                <span className="font-bold text-emerald-600">+{formatCurrency(totalRevenue)}</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-[1rem] bg-slate-50/85 px-4 py-3 text-sm">
                  <span className="text-slate-600">Tiền điện</span>
                  <span className="font-semibold text-rose-600">-{formatCurrency(electricCost)}</span>
                </div>
                <div className="flex items-center justify-between rounded-[1rem] bg-slate-50/85 px-4 py-3 text-sm">
                  <span className="text-slate-600">Tiền nước</span>
                  <span className="font-semibold text-sky-600">-{formatCurrency(waterCost)}</span>
                </div>
                <div className="flex items-center justify-between rounded-[1rem] bg-slate-50/85 px-4 py-3 text-sm">
                  <span className="text-slate-600">Vật tư đã sử dụng</span>
                  <span className="font-semibold text-orange-600">-{formatCurrency(totalSupplyCost)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="font-medium text-slate-700">Tổng chi phí</span>
                <span className="font-bold text-rose-600">-{formatCurrency(totalCosts)}</span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-lg font-bold text-slate-800">Lãi thực</span>
                <span className={`text-lg font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatCurrency(netProfit)}
                </span>
              </div>

              <div
                className={
                  netProfit >= 0
                    ? "rounded-[1.1rem] border border-emerald-100 bg-emerald-50/90 p-4"
                    : "rounded-[1.1rem] border border-red-100 bg-red-50/90 p-4"
                }
              >
                <p className={`font-medium ${netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {netProfit >= 0 ? "Kỳ này đang có lãi." : "Cảnh báo: kỳ này đang lỗ."}
                </p>
                <p className={`mt-1 text-sm ${netProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {netProfit >= 0
                    ? "Theo dõi tiếp các nhóm chi phí lớn để giữ biên lợi nhuận ổn định."
                    : "Nên xem lại vật tư tiêu hao hoặc tăng doanh thu để cải thiện hiệu quả."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-panel">
          <CardHeader className="px-5 pt-5 pb-0 sm:px-6 sm:pt-6">
            <CardTitle>Điểm nhấn trong kỳ</CardTitle>
            <CardDescription>Tóm tắt nhanh để soát hiệu quả vận hành</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 px-5 py-5 sm:px-6 sm:py-6">
            <div className="rounded-[1.15rem] border border-slate-200/80 bg-slate-50/85 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Đơn hàng</p>
              <p className="mt-2 text-2xl font-semibold text-slate-800">{totalOrders}</p>
              <p className="mt-1 text-sm text-slate-500">Trung bình {formatCurrency(averageOrderValue)} mỗi đơn</p>
            </div>
            <div className="rounded-[1.15rem] border border-slate-200/80 bg-slate-50/85 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Điện nước</p>
              <p className="mt-2 text-2xl font-semibold text-slate-800">{formatCurrency(totalUtilityCost)}</p>
              <p className="mt-1 text-sm text-slate-500">
                Điện {formatCurrency(electricCost)} • Nước {formatCurrency(waterCost)}
              </p>
            </div>
            <div className="rounded-[1.15rem] border border-slate-200/80 bg-slate-50/85 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Vật tư tiêu hao</p>
              <p className="mt-2 text-2xl font-semibold text-slate-800">{formatCurrency(totalSupplyCost)}</p>
              <p className="mt-1 text-sm text-slate-500">
                {supplyCostByCategory.length > 0
                  ? `Nhóm cao nhất: ${supplyCostByCategory[0][0]}`
                  : "Chưa có phát sinh vật tư trong kỳ"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {supplyCostByCategory.length > 0 ? (
        <Card className="dashboard-panel">
          <CardHeader className="px-5 pt-5 pb-0 sm:px-6 sm:pt-6">
            <CardTitle>Nhóm vật tư ăn chi phí</CardTitle>
            <CardDescription>Kỳ: {periodLabel}/{selectedYear}</CardDescription>
          </CardHeader>
          <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-3">
              {supplyCostByCategory.map(([category, amount]) => {
                const share = totalSupplyCost > 0 ? (amount / totalSupplyCost) * 100 : 0

                return (
                  <div key={category} className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/88 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-700">{category}</p>
                        <p className="mt-1 text-sm text-slate-500">{share.toFixed(0)}% chi phí vật tư</p>
                      </div>
                      <p className="text-right font-bold text-orange-600">{formatCurrency(amount)}</p>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white">
                      <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400" style={{ width: `${Math.max(share, 6)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {monthlySupplies.length > 0 ? (
        <Card className="dashboard-panel">
          <CardHeader className="px-5 pt-5 pb-0 sm:px-6 sm:pt-6">
            <CardTitle>Sử dụng vật tư trong tháng</CardTitle>
            <CardDescription>Kỳ: {periodLabel}/{selectedYear}</CardDescription>
          </CardHeader>
          <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-4">
              {monthlySupplies
                .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
                .map((supply) => {
                  const totalPrice = supplyInventorySnapshot.exportCostsById[supply.id]?.totalCost ?? supply.total_price ?? 0
                  const category = getSupplyType(supply.type)?.category || "Khác"

                  return (
                    <div key={supply.id} className="border-b border-slate-100 pb-4 last:border-b-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <h4 className="truncate font-medium text-slate-700">{getSupplyLabel(supply.type)}</h4>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
                              {category}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">{new Date(supply.date).toLocaleDateString("vi-VN")}</p>
                          <p className="text-sm text-slate-600">
                            <span className="font-medium">Đã sử dụng:</span> {supply.quantity}
                          </p>
                        </div>
                        <div className="ml-4 shrink-0 text-right">
                          <p className="font-bold text-red-600">{formatCurrency(totalPrice)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
