"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Banknote,
  CalendarDays,
  CreditCard,
  Mic,
  Phone,
  Plus,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react"
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
import { supabase, type NewOrder, type Order } from "@/lib/supabase"
import { cn } from "@/lib/utils"

type EntryMode = "single" | "quick"
type SpeechRecognitionErrorEventLike = Event & { error?: string }
type SpeechRecognitionAlternativeLike = { transcript: string }
type SpeechRecognitionResultLike = {
  readonly isFinal: boolean
  readonly length: number
  [index: number]: SpeechRecognitionAlternativeLike
}
type SpeechRecognitionResultListLike = {
  readonly length: number
  [index: number]: SpeechRecognitionResultLike
}
type SpeechRecognitionEventLike = Event & {
  readonly results: SpeechRecognitionResultListLike
}
type SpeechRecognitionLike = EventTarget & {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

interface QuickOrderDraft {
  index: number
  raw: string
  customerName: string
  amount: number
}

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

const capitalizeWords = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")

function parseSpokenAmount(rawAmount: string, rawUnit?: string) {
  const numeric = Number.parseFloat(rawAmount.replace(/\s+/g, "").replace(/,/g, "."))
  if (!Number.isFinite(numeric)) return null
  const amount = rawUnit || numeric < 1000 ? Math.round(numeric * 1000) : Math.round(numeric)
  return amount > 0 ? amount : null
}

function parseQuickOrders(value: string) {
  const valid: QuickOrderDraft[] = []
  const invalid: string[] = []

  value
    .split(/[\n,;]+/g)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry, index) => {
      const match = entry.replace(/[.]+$/g, "").trim().match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(k|nghìn|nghin|ngàn|ngan)?$/i)

      if (!match) {
        invalid.push(entry)
        return
      }

      const [, rawName, rawAmount, rawUnit] = match
      const amount = parseSpokenAmount(rawAmount, rawUnit)
      const customerName = capitalizeWords(rawName.trim())

      if (!amount || !customerName) {
        invalid.push(entry)
        return
      }

      valid.push({
        index: index + 1,
        raw: entry,
        customerName,
        amount,
      })
    })

  return { valid, invalid }
}

export function DailyDashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [orders, setOrders] = useState<Order[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [entryMode, setEntryMode] = useState<EntryMode>("single")
  const [quickInput, setQuickInput] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [newOrder, setNewOrder] = useState(defaultOrderForm)
  const customerNameInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const speechBaseTextRef = useRef("")
  const { toast } = useToast()

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSpeechSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition))
    }
  }, [])

  useEffect(() => {
    if (!isDialogOpen || entryMode !== "single") return

    const timer = window.setTimeout(() => customerNameInputRef.current?.focus(), 50)
    return () => window.clearTimeout(timer)
  }, [entryMode, isDialogOpen])

  useEffect(() => {
    if (isDialogOpen || !recognitionRef.current) return
    recognitionRef.current.abort()
    recognitionRef.current = null
    setIsListening(false)
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
    window.setTimeout(() => customerNameInputRef.current?.focus(), 20)
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
    setQuickInput("")
    setEntryMode("single")
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

  const handleSingleSubmit = async (mode: "close" | "continue") => {
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

  const quickOrderPreview = useMemo(() => parseQuickOrders(quickInput), [quickInput])

  const handleQuickSubmit = async () => {
    if (newOrder.services.length === 0) {
      toast({
        title: "Lỗi",
        description: "Hãy chọn ít nhất một dịch vụ mặc định cho danh sách nhập nhanh",
        variant: "destructive",
      })
      return
    }

    if (quickOrderPreview.valid.length === 0) {
      toast({
        title: "Lỗi",
        description: "Chưa có dòng hợp lệ để lưu",
        variant: "destructive",
      })
      return
    }

    if (quickOrderPreview.invalid.length > 0) {
      toast({
        title: "Còn dòng chưa đúng",
        description: "Sửa các dòng chưa nhận diện được trước khi lưu danh sách",
        variant: "destructive",
      })
      return
    }

    const ordersToCreate: NewOrder[] = quickOrderPreview.valid.map((item) => ({
      date: format(selectedDate, "yyyy-MM-dd"),
      customer_name: item.customerName,
      phone: "",
      services: newOrder.services,
      weight: 0,
      amount: item.amount,
      note: "",
      status: "completed",
      payment_method: newOrder.paymentMethod,
    }))

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ordersToCreate),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? "Không thể lưu danh sách đơn")
      }

      await fetchOrders()
      setQuickInput("")
      setEntryMode("single")
      setIsDialogOpen(false)

      toast({
        title: "Đã lưu danh sách",
        description: `${ordersToCreate.length} đơn đã được tạo từ nhập nhanh`,
      })
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể lưu danh sách đơn",
        variant: "destructive",
      })
    }
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
  }

  const startListening = () => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognitionCtor) {
      toast({
        title: "Trình duyệt chưa hỗ trợ",
        description: "Bạn vẫn có thể dán chuỗi kiểu 'khang 45, tuấn 50, trang 70' vào ô nhập nhanh.",
        variant: "destructive",
      })
      return
    }

    recognitionRef.current?.abort()

    const recognition = new SpeechRecognitionCtor()
    const baseText = quickInput.trim()
    const prefix = baseText ? `${baseText}${/[,\n;]$/.test(baseText) ? " " : ", "}` : ""

    speechBaseTextRef.current = prefix
    recognition.lang = "vi-VN"
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      const transcript = Array.from(
        { length: event.results.length },
        (_, index) => event.results[index]?.[0]?.transcript ?? "",
      )
        .join(" ")
        .trim()

      setQuickInput(`${speechBaseTextRef.current}${transcript}`.trim())
    }

    recognition.onerror = (event) => {
      setIsListening(false)

      if (event.error === "not-allowed") {
        toast({
          title: "Chưa có quyền micro",
          description: "Hãy cho phép microphone trong Safari rồi thử lại.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Không nghe được giọng nói",
        description: "Bạn có thể bấm lại micro hoặc dán nội dung vào ô nhập nhanh.",
        variant: "destructive",
      })
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    setIsListening(true)
    recognition.start()
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

          <DialogContent className="!top-[calc(env(safe-area-inset-top)_+_0.75rem)] !translate-y-0 flex max-h-[calc(100dvh_-_env(safe-area-inset-top)_-_0.75rem)] w-[calc(100vw_-_1rem)] max-w-2xl flex-col overflow-hidden rounded-[1.9rem] p-0 sm:!top-[50%] sm:!max-h-[min(90dvh,56rem)] sm:!translate-y-[-50%] sm:w-[min(calc(100vw_-_3rem),42rem)]">
            <DialogHeader className="shrink-0 border-b border-slate-100/90 bg-white/96 px-4 pb-4 pt-5 pr-14 backdrop-blur sm:px-6 sm:pb-4 sm:pt-6">
              <DialogTitle>Đơn mới</DialogTitle>
            </DialogHeader>

            <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)_+_1rem)] pt-4 [-webkit-overflow-scrolling:touch] sm:space-y-5 sm:px-6 sm:pb-6 sm:pt-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant={entryMode === "single" ? "default" : "outline"}
                  className="h-11"
                  onClick={() => setEntryMode("single")}
                >
                  Nhập từng đơn
                </Button>
                <Button
                  variant={entryMode === "quick" ? "default" : "outline"}
                  className="h-11"
                  onClick={() => setEntryMode("quick")}
                >
                  Nhập nhanh / giọng nói
                </Button>
              </div>

              {entryMode === "single" ? (
                <div className="space-y-4">
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
                            void handleSingleSubmit("continue")
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
                    <Button variant="outline" className="h-12" onClick={() => void handleSingleSubmit("continue")}>
                      Lưu và thêm tiếp
                    </Button>
                    <Button className="dashboard-primary-button w-full" onClick={() => void handleSingleSubmit("close")}>
                      Lưu đơn
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
                    <div>
                      <Label>Dịch vụ mặc định</Label>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {serviceOptions.map((service) => (
                          <button
                            key={service.id}
                            type="button"
                            className="flex items-center gap-2 rounded-[1rem] border border-slate-200/75 bg-slate-50/90 px-3 py-3 text-left text-sm font-semibold text-slate-600 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-xs"
                            onClick={() => handleServiceChange(service.id, !newOrder.services.includes(service.id))}
                          >
                            <Checkbox
                              id={`quick-${service.id}`}
                              checked={newOrder.services.includes(service.id)}
                              onCheckedChange={(checked) => handleServiceChange(service.id, checked as boolean)}
                            />
                            <Label htmlFor={`quick-${service.id}`} className="cursor-pointer">
                              {service.label}
                            </Label>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Thanh toán mặc định</Label>
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

                      <div className="mt-4 rounded-[1.1rem] border border-slate-200/80 bg-slate-50/90 p-3 sm:p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Cú pháp</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Ví dụ: <span className="font-semibold">khang 45, tuấn 50, trang 70</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Số dưới 1000 sẽ hiểu là nghìn đồng.</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-50/85 p-3.5 sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Nhập nhanh bằng giọng nói hoặc văn bản</p>
                        <p className="text-xs text-slate-500">
                          App sẽ tự tách tên khách và số tiền thành từng đơn riêng.
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant={isListening ? "destructive" : "outline"}
                        className="h-11 sm:w-auto"
                        onClick={isListening ? stopListening : startListening}
                        disabled={!speechSupported && !isListening}
                      >
                        {isListening ? <Square className="size-4" /> : <Mic className="size-4" />}
                        {isListening ? "Dừng ghi âm" : "Bật micro"}
                      </Button>
                    </div>

                    <div className="mt-4">
                      <Label htmlFor="quick-entry">Danh sách đọc vào hoặc dán vào</Label>
                      <textarea
                        id="quick-entry"
                        value={quickInput}
                        onChange={(event) => setQuickInput(event.target.value)}
                        placeholder="khang 45, tuấn 50, trang 70"
                        className="mt-2 min-h-24 w-full rounded-[1.1rem] border border-slate-200/80 bg-white/92 px-4 py-3 text-sm text-slate-700 shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 focus:border-primary/40 focus:ring-[4px] focus:ring-primary/20 sm:min-h-28"
                      />
                    </div>

                    {speechSupported ? (
                      <p className="mt-2 text-xs text-slate-500">
                        Nếu Safari hỏi quyền microphone, hãy bấm cho phép rồi đọc một câu liền mạch.
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">
                        Trình duyệt này không bật được micro, nhưng bạn vẫn có thể dán nội dung để app tự tách đơn.
                      </p>
                    )}
                  </div>

                  <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/92 p-3.5 sm:p-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-indigo-500" />
                      <p className="text-sm font-semibold text-slate-700">Xem trước danh sách đơn</p>
                    </div>

                    {quickOrderPreview.valid.length === 0 && quickOrderPreview.invalid.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">
                        Chưa có dữ liệu. Hãy nói hoặc nhập theo mẫu để app tự tách danh sách.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {quickOrderPreview.valid.map((item) => (
                          <div
                            key={`${item.index}-${item.customerName}-${item.amount}`}
                            className="flex items-center justify-between rounded-[1rem] border border-slate-200/80 bg-slate-50/80 px-4 py-3"
                          >
                            <div>
                              <p className="font-semibold text-slate-700">
                                Đơn {item.index}: {item.customerName}
                              </p>
                              <p className="text-xs text-slate-500">Đọc vào: {item.raw}</p>
                            </div>
                            <p className="text-base font-semibold text-emerald-600">
                              {item.amount.toLocaleString("vi-VN")}đ
                            </p>
                          </div>
                        ))}

                        {quickOrderPreview.invalid.length > 0 ? (
                          <div className="rounded-[1rem] border border-amber-100 bg-amber-50/90 px-4 py-3">
                            <p className="text-sm font-semibold text-amber-700">Các dòng chưa nhận diện được</p>
                            <div className="mt-2 space-y-1 text-sm text-amber-600">
                              {quickOrderPreview.invalid.map((item, index) => (
                                <p key={`${item}-${index}`}>- {item}</p>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button variant="outline" className="h-12" onClick={() => setQuickInput("")}>
                      Xóa nội dung
                    </Button>
                    <Button className="dashboard-primary-button w-full" onClick={handleQuickSubmit}>
                      Lưu danh sách
                    </Button>
                  </div>
                </div>
              )}
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
