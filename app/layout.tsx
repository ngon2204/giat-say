import type React from "react"
import type { Metadata } from "next"
import { Be_Vietnam_Pro, JetBrains_Mono, Mulish } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const appSans = Mulish({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-app-sans",
})

const appDisplay = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
  variable: "--font-app-display",
})

const appMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-app-mono",
})

export const metadata: Metadata = {
  title: "Giặt Sấy Vui",
  description: "Hệ thống quản lý tiệm giặt sấy",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body className={`${appSans.variable} ${appDisplay.variable} ${appMono.variable} font-sans`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
