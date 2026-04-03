"use client"

import { type Order } from "@/lib/supabase"
import { format, getDaysInMonth, parse } from "date-fns"
import { vi } from "date-fns/locale"

// Dynamic import untuk xlsx
async function getXLSX() {
  const xlsx = await import("xlsx")
  return xlsx
}

export async function exportRevenueToExcel(
  orders: Order[],
  month: number,
  year: number
) {
  const xlsx = await getXLSX()

  // Nhóm đơn hàng theo ngày
  const ordersByDay: Record<string, Order[]> = {}

  orders.forEach((order) => {
    if (!ordersByDay[order.date]) {
      ordersByDay[order.date] = []
    }
    ordersByDay[order.date].push(order)
  })

  // Tạo workbook
  const workbook = xlsx.utils.book_new()

  // Lấy số ngày trong tháng
  const daysInMonth = getDaysInMonth(new Date(year, month - 1))

  let totalAllRevenue = 0
  let totalAllOrders = 0

  // Tạo sheet cho từng ngày
  for (let day = 1; day <= daysInMonth; day++) {
    const dayString = String(day).padStart(2, "0")
    const dateString = `${year}-${String(month).padStart(2, "0")}-${dayString}`
    const dayOrders = ordersByDay[dateString] || []

    // Chuẩn bị dữ liệu cho sheet này
    const sheetData: any[] = []

    // Header
    sheetData.push(["NGÀY " + dayString])
    sheetData.push([])
    sheetData.push(["Khách Hàng", "Số Điện Thoại", "Dịch Vụ", "Số Tiền", "Hình Thức Thanh Toán"])

    // Data
    let dayRevenue = 0
    dayOrders.forEach((order) => {
      const services = Array.isArray(order.services)
        ? order.services
            .map((s) => {
              const serviceMap: Record<string, string> = {
                clothes: "Quần áo",
                bedding: "Chăn mền",
                stuffed: "Gấu bông",
                shoes: "Giày",
                topper: "Topper",
                towel: "Khăn",
                curtain: "Rèm cửa",
              }
              return serviceMap[s] || s
            })
            .join(", ")
        : order.services

      const paymentMethod = order.payment_method === "cash" ? "Tiền mặt" : "Chuyển khoản"

      sheetData.push([
        order.customer_name,
        order.phone || "",
        services,
        order.amount || 0,
        paymentMethod,
      ])

      dayRevenue += order.amount || 0
      totalAllRevenue += order.amount || 0
      totalAllOrders += 1
    })

    // Total row
    sheetData.push([])
    sheetData.push(["TỔNG CỘNG", "", "", dayRevenue, ""])
    sheetData.push(["Tổng đơn", dayOrders.length, "", "", ""])

    // Tạo sheet
    const worksheet = xlsx.utils.aoa_to_sheet(sheetData)

    // Set column width
    worksheet["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 18 }]

    // Thêm sheet vào workbook
    xlsx.utils.book_append_sheet(workbook, worksheet, dayString)
  }

  // Tạo sheet tóm tắt
  const summaryData = [
    ["TÓM TẮT DOANH THU THÁNG", `${month}/${year}`],
    [],
    ["Tháng", month],
    ["Năm", year],
    ["Tổng số đơn", totalAllOrders],
    ["Tổng doanh thu", totalAllRevenue],
  ]

  const summarySheet = xlsx.utils.aoa_to_sheet(summaryData)
  summarySheet["!cols"] = [{ wch: 20 }, { wch: 15 }]
  xlsx.utils.book_append_sheet(workbook, summarySheet, "Tóm tắt")

  // Download
  const filename = `doanh-thu-thang-${String(month).padStart(2, "0")}-nam-${year}.xlsx`
  xlsx.writeFile(workbook, filename)
}

export async function downloadCSV(content: string, filename: string) {
  const BOM = "\uFEFF"
  const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
