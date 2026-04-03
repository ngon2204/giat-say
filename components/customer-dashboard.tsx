"use client"

import { useEffect, useState } from "react"
import { Calendar, Phone, Search, ShoppingBag, Users, Wallet } from "lucide-react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabase, type Order } from "@/lib/supabase"

const CUSTOMER_RESET_DATE = "2026-04-01"

interface CustomerInfo {
  name: string
  phone: string
  totalOrders: number
  totalSpent: number
  lastOrderDate: string
  orderHistory: Order[]
}

export function CustomerDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerInfo[]>([])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const customerMap = new Map<string, CustomerInfo>()

    orders
      .filter((order) => order.date >= CUSTOMER_RESET_DATE)
      .forEach((order) => {
        const key = order.customer_name.toLowerCase()
        const existing = customerMap.get(key)

        if (existing) {
          existing.totalOrders += 1
          existing.totalSpent += order.amount || 0
          existing.orderHistory.push(order)

          if ((!existing.phone || existing.phone === "N/A") && order.phone) {
            existing.phone = order.phone
          }

          if (new Date(order.date) > new Date(existing.lastOrderDate)) {
            existing.lastOrderDate = order.date
          }
        } else {
          customerMap.set(key, {
            name: order.customer_name,
            phone: order.phone || "N/A",
            totalOrders: 1,
            totalSpent: order.amount || 0,
            lastOrderDate: order.date,
            orderHistory: [order],
          })
        }
      })

    const results = Array.from(customerMap.values())
      .map((customer) => ({
        ...customer,
        orderHistory: [...customer.orderHistory].sort(
          (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
        ),
      }))
      .filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || customer.phone.includes(searchTerm),
      )
      .sort((left, right) => {
        const dateDiff = new Date(right.lastOrderDate).getTime() - new Date(left.lastOrderDate).getTime()
        if (dateDiff !== 0) {
          return dateDiff
        }
        return right.totalOrders - left.totalOrders
      })

    setFilteredCustomers(results)
  }, [orders, searchTerm])

  const fetchOrders = async () => {
    const { data, error } = await supabase.from("orders").select("*").order("date", { ascending: false })

    if (error) {
      return
    }

    setOrders(data || [])
  }

  const managedOrders = orders.filter((order) => order.date >= CUSTOMER_RESET_DATE)
  const totalSpent = managedOrders.reduce((sum, order) => sum + (order.amount || 0), 0)

  return (
    <div className="dashboard-page">
      <div className="dashboard-toolbar">
        <Badge className="w-fit rounded-full bg-slate-100 px-3 py-1 text-slate-500 hover:bg-slate-100">
          Từ 01/04/2026
        </Badge>

        <div className="w-full md:w-[340px]">
          <div className="flex items-center gap-3 rounded-[1.2rem] border border-white/70 bg-white/92 px-4 py-3 shadow-soft">
            <Search className="size-4 text-slate-400" />
            <Input
              placeholder="Tìm khách hàng"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="dashboard-metric">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Khách đang quản lý</p>
              <Users className="size-4 text-blue-600" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-slate-800">{filteredCustomers.length}</p>
          </CardContent>
        </Card>

        <Card className="dashboard-metric">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Đơn mới</p>
              <ShoppingBag className="size-4 text-violet-600" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-violet-600">{managedOrders.length}</p>
          </CardContent>
        </Card>

        <Card className="dashboard-metric">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Chi tiêu</p>
              <Wallet className="size-4 text-emerald-600" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-emerald-600">{totalSpent.toLocaleString("vi-VN")}đ</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {filteredCustomers.map((customer) => (
          <Card
            key={customer.name}
            className="dashboard-panel transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_70px_-42px_rgba(37,99,235,0.22)]"
          >
            <CardContent className="p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-800">{customer.name}</h3>
                      <Badge className="rounded-full bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-50">
                        {customer.totalOrders} đơn
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                      <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5">
                        <Phone className="size-3.5 text-slate-400" />
                        {customer.phone}
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5">
                        <Calendar className="size-3.5 text-slate-400" />
                        {format(new Date(customer.lastOrderDate), "dd/MM/yyyy", { locale: vi })}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.1rem] border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Tổng đơn</p>
                      <p className="mt-2 text-2xl font-semibold text-blue-600">{customer.totalOrders}</p>
                    </div>
                    <div className="rounded-[1.1rem] border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Chi tiêu</p>
                      <p className="mt-2 text-2xl font-semibold text-emerald-600">
                        {customer.totalSpent.toLocaleString("vi-VN")}đ
                      </p>
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-xl rounded-[1.25rem] border border-slate-200/70 bg-slate-50/80 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-700">Đơn gần nhất</p>
                  <div className="space-y-2">
                    {customer.orderHistory.slice(0, 3).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/92 px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-medium text-slate-800">
                            {format(new Date(order.date), "dd/MM/yyyy", { locale: vi })}
                          </p>
                          <p className="text-xs text-slate-500">
                            {Array.isArray(order.services) ? order.services.join(", ") : ""}
                          </p>
                        </div>
                        <Badge variant="secondary" className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                          {order.amount?.toLocaleString("vi-VN")}đ
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredCustomers.length === 0 && (
          <Card className="rounded-[1.6rem] border-dashed border-slate-300/80 bg-white/88 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.15)]">
            <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Users className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold text-slate-800">Chưa có khách hàng</p>
                <p className="text-sm leading-6 text-slate-500">Dữ liệu quản lý bắt đầu từ 01/04/2026.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
