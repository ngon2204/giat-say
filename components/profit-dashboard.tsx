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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="dashboard-metric">
          <CardHeader>
            <CardTitle>Tổng Doanh Thu</CardTitle>
            <CardDescription>
              {periodLabel}/{selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card className="dashboard-metric">
          <CardHeader>
            <CardTitle>Chi Phí Điện Nước</CardTitle>
            <CardDescription>
              Tháng {selectedMonth}/{selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalUtilityCost)}</div>
          </CardContent>
        </Card>

        <Card className="dashboard-metric">
          <CardHeader>
            <CardTitle>Chi Phí Vật Tư</CardTitle>
            <CardDescription>
              {periodLabel}/{selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalSupplyCost)}</div>
          </CardContent>
        </Card>

        <Card className="dashboard-metric">
          <CardHeader>
            <CardTitle>Lãi Thực</CardTitle>
            <CardDescription>
              {periodLabel}/{selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(netProfit)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="dashboard-panel">
        <CardHeader>
          <CardTitle>Chi Tiết Tính Toán Lãi</CardTitle>
          <CardDescription>
            Kỳ: {periodLabel}/{selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Tổng Doanh Thu:</span>
              <span className="font-bold text-green-600">+{formatCurrency(totalRevenue)}</span>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-rose-500">Chi Phí:</h4>
              <div className="flex items-center justify-between pl-4">
                <span>- Tiền Điện Nước:</span>
                <span className="text-red-600">-{formatCurrency(totalUtilityCost)}</span>
              </div>
              <div className="flex items-center justify-between pl-4">
                <span>- Vật Tư Sử Dụng:</span>
                <span className="text-red-600">-{formatCurrency(totalSupplyCost)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2 pl-4">
                <span className="font-medium">Tổng Chi Phí:</span>
                <span className="font-bold text-red-600">-{formatCurrency(totalCosts)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-lg font-bold">Lãi Thực:</span>
              <span className={`text-lg font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(netProfit)}
              </span>
            </div>

            {netProfit < 0 ? (
              <div className="rounded-[1.1rem] border border-red-100 bg-red-50/90 p-4">
                <p className="font-medium text-red-700">Cảnh báo: Kỳ này bị lỗ.</p>
                <p className="mt-1 text-sm text-red-500">
                  Cần xem xét lại chi phí hoặc tăng doanh thu để cải thiện tình hình kinh doanh.
                </p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {monthlySupplies.length > 0 ? (
        <Card className="dashboard-panel">
          <CardHeader>
            <CardTitle>Sử Dụng Vật Tư Trong Tháng</CardTitle>
            <CardDescription>
              Kỳ: {periodLabel}/{selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlySupplies
                .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
                .map((supply) => {
                  const totalPrice = supplyInventorySnapshot.exportCostsById[supply.id]?.totalCost ?? supply.total_price ?? 0
                  const category = getSupplyType(supply.type)?.category || "Khác"

                  return (
                    <div key={supply.id} className="border-b border-slate-100 pb-4 last:border-b-0">
                      <div className="flex items-start justify-between">
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
