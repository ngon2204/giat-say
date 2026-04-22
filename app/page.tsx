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
      <div className="flex min-h-[100dvh] flex-col overflow-x-hidden lg:hidden">
        <MobileNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="mx-auto w-full max-w-xl flex-1 pb-[calc(env(safe-area-inset-bottom)+7.2rem)] pt-3">
          {tabs[activeTab]}
        </main>
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
            sidebarOpen ? "ml-[21rem]" : "ml-0"
          )}
        >
          <header className="dashboard-shell-header">
            <div className="dashboard-shell-header-inner">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="size-11 rounded-2xl border border-slate-200/78 bg-white/94 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.16)] hover:bg-white"
                >
                  {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                </Button>

                <div>
                  <p className="dashboard-shell-kicker">Giặt Sấy Vui</p>
                  <h1 className="dashboard-shell-title">{titles[activeTab]}</h1>
                </div>
              </div>

              <div className="dashboard-shell-date">
                {todayLabel}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-5 lg:px-8 xl:px-10">
            <div className="mx-auto max-w-7xl">{tabs[activeTab]}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
