"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"

import { CustomerDashboard } from "@/components/customer-dashboard"
import { DailyDashboard } from "@/components/daily-dashboard"
import { DesktopSidebar } from "@/components/desktop-sidebar"
import { MobileNavigation } from "@/components/mobile-navigation"
import { ProfitDashboard } from "@/components/profit-dashboard"
import { RevenueDashboard } from "@/components/revenue-dashboard"
import { SupplyDashboard } from "@/components/supply-dashboard"
import { UtilityDashboard } from "@/components/utility-dashboard"
import { Button } from "@/components/ui/button"
import type { TabId } from "@/lib/types"
import { cn } from "@/lib/utils"

const tabs = {
  daily: <DailyDashboard />,
  revenue: <RevenueDashboard />,
  supply: <SupplyDashboard />,
  utility: <UtilityDashboard />,
  profit: <ProfitDashboard />,
  customers: <CustomerDashboard />,
} as const

const titles: Record<keyof typeof tabs, string> = {
  daily: "Hàng Ngày",
  revenue: "Doanh Thu",
  supply: "Vật Tư",
  utility: "Điện Nước",
  profit: "Lãi Thực",
  customers: "Khách Hàng",
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("daily")
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const todayLabel = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date())

  return (
    <div className="min-h-screen text-slate-700">
      <div className="lg:hidden flex min-h-screen flex-col">
        <MobileNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+6.9rem)] pt-3">{tabs[activeTab]}</main>
      </div>

      <div className="hidden min-h-screen lg:flex">
        <DesktopSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
        />

        <div
          className={cn(
            "flex flex-1 flex-col transition-all duration-300 ease-out",
            sidebarOpen ? "ml-72" : "ml-0"
          )}
        >
          <header className="sticky top-0 z-40 border-b border-white/70 bg-white/72 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-8 py-5 xl:px-10">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="size-11 rounded-2xl border border-white/80 bg-white/92 shadow-soft hover:bg-white"
                >
                  {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                </Button>

                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Giặt Sấy Vui</p>
                  <h1 className="mt-1 text-[1.75rem] font-semibold tracking-tight text-slate-800">{titles[activeTab]}</h1>
                </div>
              </div>

              <div className="rounded-full border border-white/80 bg-white/92 px-4 py-2 text-sm font-semibold text-slate-500 shadow-soft">
                {todayLabel}
              </div>
            </div>
          </header>

          <main className="flex-1 px-8 py-8 xl:px-10">
            <div className="mx-auto max-w-7xl">{tabs[activeTab]}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
