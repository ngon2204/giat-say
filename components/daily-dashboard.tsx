"use client"

import { useEffect, useRef, useState } from "react"
import { Banknote, CalendarDays, CreditCard, Phone, Plus, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase, type Order } from "@/lib/supabase"
import { cn } from "@/lib/utils"

const capitalizeWords = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")

const serviceOptions = [
  { id: "clothes", label: "Quần áo" },
  { id: "blanket", label: "Chăn mền" },
  { id: "stuffed", label: "Gấu bông" },
  { id: "shoes", label: "Giày" },
  { id: "topper", label: "Topper" },
  { id: "towel", label: "Khăn" },
  { id: "curtain", label: "Rèm cửa" },
]

const paymentLabels = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
} as const

const paymentClasses = {
  cash: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  transfer: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
} as const

const defaultOrderForm = {
  customerTitle: "Anh" as "Anh" | "Chị",
  customerName: "",
  phone: "",
  services: ["clothes"] as string[],
  amount: "",
  paymentMethod: "cash" as "cash" | "transfer",
}

export function DailyDashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [orders, setOrders] = useState<Order[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newOrder, setNewOrder] = useState(defaultOrderForm)
  const customerNameInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!isDialogOpen) {
      return
    }

    const timer = window.setTimeout(() => {
      customerNameInputRef.current?.focus()
    }, 50)

    return () => window.clearTimeout(timer)
  }, [isDialogOpen])

  const fetchOrders = async () => {
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false })

    if (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách đơn hàng",
        variant: "destructive",
      })
      return
    }

    setOrders(data || [])
  }

  const focusCustomerName = () => {
    window.setTimeout(() => {
      customerNameInputRef.current?.focus()
    }, 20)
  }

  const resetOrderForm = (mode: "close" | "continue") => {
    if (mode === "continue") {
      setNewOrder((previous) => ({
        ...previous,
        customerName: "",
        phone: "",
        amount: "",
      }))
      focusCustomerName()
      return
    }

    setNewOrder(defaultOrderForm)
    setIsDialogOpen(false)
  }

  const handleAmountChange = (value: string) => {
    const cleanValue = value.replace(/\D/g, "")
    const formatted = cleanValue ? Number.parseInt(cleanValue, 10).toLocaleString("vi-VN") : ""
    setNewOrder((previous) => ({ ...previous, amount: formatted }))
  }

  const handleServiceChange = (serviceId: string, checked: boolean) => {
    const updatedServices = checked
      ? [...newOrder.services, serviceId]
      : newOrder.services.filter((id) => id !== serviceId)

    setNewOrder((previous) => ({ ...previous, services: updatedServices }))
  }

  const handleSubmit = async (mode: "close" | "continue") => {
    if (!newOrder.customerName.trim() || newOrder.services.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập đủ thông tin bắt buộc",
        variant: "destructive",
      })
      return
    }

    const rawAmount = Number.parseInt(newOrder.amount.replace(/\D/g, ""), 10) || 0
    const order = {
      date: format(selectedDate, "yyyy-MM-dd"),
      customer_name: `${newOrder.customerTitle} ${newOrder.customerName.trim()}`,
      phone: newOrder.phone.trim(),
      services: newOrder.services,
      weight: 0,
      amount: rawAmount * 1000,
      note: "",
      status: "completed" as const,
      payment_method: newOrder.paymentMethod,
    }

    const { error } = await supabase.from("orders").insert([order])

    if (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tạo đơn hàng",
        variant: "destructive",
      })
      return
    }

    await fetchOrders()
    resetOrderForm(mode)

    toast({
      title: mode === "continue" ? "Đã lưu, tiếp tục nhập" : "Đã thêm đơn",
      description: `Khách hàng ${order.customer_name}`,
    })
  }

  const handleDeleteOrder = async (orderId: string, customerName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa đơn của ${customerName}?`)) {
      return
    }

    const { error } = await supabase.from("orders").delete().eq("id", orderId)

    if (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xóa đơn hàng",
        variant: "destructive",
      })
      return
    }

    await fetchOrders()
    toast({
      title: "Đã xóa",
      description: customerName,
    })
  }

  const currentDate = format(selectedDate, "yyyy-MM-dd")
  const currentDateLabel = format(selectedDate, "dd/MM/yyyy", { locale: vi })
  const todayOrders = orders.filter((order) => order.date === currentDate && order.status === "completed")
  const totalAmount = todayOrders.reduce((sum, order) => sum + order.amount, 0)

  return (
    <div className="dashboard-page">
      <div className="dashboard-toolbar">
        <div className="dashboard-filter-row">
          <div className="dashboard-control flex w-full items-center gap-3 px-4 sm:w-[250px]">
            <CalendarDays className="size-4 text-slate-400" />
            <Input
              type="date"
              value={currentDate}
              onChange={(event) => {
                const nextDate = new Date(event.target.value)
                if (!Number.isNaN(nextDate.getTime())) {
                  setSelectedDate(nextDate)
                }
              }}
              className="h-full border-0 bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="dashboard-primary-button w-full sm:w-auto">
              <Plus className="size-4" />
              Thêm đơn
            </Button>
          </DialogTrigger>

          <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg rounded-[1.9rem] p-0">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle>Đơn mới</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 px-6 pb-6">
              <div className="grid gap-4 sm:grid-cols-[96px_minmax(0,1fr)]">
                <div>
                  <Label>Xưng hô</Label>
                  <Select
                    value={newOrder.customerTitle}
                    onValueChange={(value: "Anh" | "Chị") =>
                      setNewOrder((previous) => ({ ...previous, customerTitle: value }))
                    }
                  >
                    <SelectTrigger className="dashboard-control mt-2 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Anh">Anh</SelectItem>
                      <SelectItem value="Chị">Chị</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="customer-name">Tên khách</Label>
                  <Input
                    id="customer-name"
                    ref={customerNameInputRef}
                    className="dashboard-control mt-2"
                    placeholder="Nhập tên"
                    value={newOrder.customerName}
                    onChange={(event) =>
                      setNewOrder((previous) => ({ ...previous, customerName: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_210px]">
                <div>
                  <Label htmlFor="amount">Số tiền</Label>
                  <Input
                    id="amount"
                    inputMode="numeric"
                    className="dashboard-control mt-2"
                    value={newOrder.amount}
                    onChange={(event) => handleAmountChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        void handleSubmit("continue")
                      }
                    }}
                    placeholder="Ví dụ 200"
                  />
                </div>

                <div>
                  <Label>Thanh toán</Label>
                  <Select
                    value={newOrder.paymentMethod}
                    onValueChange={(value: "cash" | "transfer") =>
                      setNewOrder((previous) => ({ ...previous, paymentMethod: value }))
                    }
                  >
                    <SelectTrigger className="dashboard-control mt-2 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Tiền mặt</SelectItem>
                      <SelectItem value="transfer">Chuyển khoản</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  className="dashboard-control mt-2"
                  value={newOrder.phone}
                  onChange={(event) => setNewOrder((previous) => ({ ...previous, phone: event.target.value }))}
                  placeholder="Có thể để trống nếu chưa cần"
                />
              </div>

              <div>
                <Label>Dịch vụ</Label>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {serviceOptions.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      className="flex items-center gap-2 rounded-[1rem] border border-slate-200/75 bg-slate-50/90 px-3 py-3 text-left text-sm font-semibold text-slate-600 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-xs"
                      onClick={() => handleServiceChange(service.id, !newOrder.services.includes(service.id))}
                    >
                      <Checkbox
                        id={service.id}
                        checked={newOrder.services.includes(service.id)}
                        onCheckedChange={(checked) => handleServiceChange(service.id, checked as boolean)}
                      />
                      <Label htmlFor={service.id} className="cursor-pointer">
                        {service.label}
                      </Label>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="outline" className="h-12" onClick={() => void handleSubmit("continue")}>
                  Lưu và thêm tiếp
                </Button>
                <Button className="dashboard-primary-button w-full" onClick={() => void handleSubmit("close")}>
                  Lưu đơn
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="dashboard-metric border-indigo-100/80 bg-[linear-gradient(180deg,rgba(238,242,255,0.82)_0%,rgba(255,255,255,0.96)_78%)]">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold tracking-[0.01em] text-indigo-500">Tổng đơn</p>
              <CalendarDays className="size-4 text-indigo-500" />
            </div>
            <p className="mt-4 text-[2rem] font-semibold tracking-tight text-indigo-700 sm:text-[2.25rem]">
              {todayOrders.length}
            </p>
            <p className="mt-1 text-sm text-indigo-400">{currentDateLabel}</p>
          </CardContent>
        </Card>

        <Card className="dashboard-metric border-emerald-100/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.84)_0%,rgba(255,255,255,0.96)_78%)]">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold tracking-[0.01em] text-emerald-500">Tổng tiền</p>
              <Banknote className="size-4 text-emerald-500" />
            </div>
            <p className="mt-4 text-[2rem] font-semibold tracking-tight text-emerald-600 sm:text-[2.25rem]">
              {totalAmount.toLocaleString("vi-VN")}đ
            </p>
            <p className="mt-1 text-sm text-emerald-400">{currentDateLabel}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="dashboard-panel">
        <CardHeader className="flex flex-row items-center justify-between gap-3 px-5 pb-0 pt-5 sm:px-6 sm:pt-6">
          <CardTitle className="text-xl text-slate-700">Đơn trong ngày</CardTitle>
          <Badge className="rounded-full bg-slate-100 px-3 py-1 text-slate-500 hover:bg-slate-100">
            {todayOrders.length} đơn
          </Badge>
        </CardHeader>

        <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
          {todayOrders.length === 0 ? (
            <div className="dashboard-empty">
              <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <CalendarDays className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold text-slate-700">Chưa có đơn</p>
                <p className="text-sm text-slate-500">{currentDateLabel}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {todayOrders.map((order) => {
                const services = order.services
                  .map((service) => serviceOptions.find((option) => option.id === service)?.label || service)
                  .filter(Boolean)
                const paymentKey = order.payment_method === "transfer" ? "transfer" : "cash"

                return (
                  <div key={order.id} className="dashboard-list-row">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-600 shadow-xs ring-1 ring-slate-200/70">
                      {capitalizeWords(order.customer_name).charAt(0)}
                    </div>

                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-slate-700">{capitalizeWords(order.customer_name)}</p>
                        <Badge className={cn("rounded-full px-3 py-1", paymentClasses[paymentKey])}>
                          {paymentLabels[paymentKey]}
                        </Badge>
                      </div>

                      {order.phone ? (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Phone className="size-3.5" />
                          <span>{order.phone}</span>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        {services.map((service) => (
                          <Badge
                            key={`${order.id}-${service}`}
                            variant="secondary"
                            className="rounded-full bg-white px-3 py-1 text-slate-500 ring-1 ring-slate-200/70"
                          >
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="flex items-center gap-2 text-lg font-semibold text-emerald-600">
                        {paymentKey === "transfer" ? <CreditCard className="size-4" /> : <Banknote className="size-4" />}
                        <span>{order.amount.toLocaleString("vi-VN")}đ</span>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteOrder(order.id, order.customer_name)}
                        className="rounded-xl border border-transparent text-slate-400 hover:border-red-100 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="size-4" />
                      </Button>
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
