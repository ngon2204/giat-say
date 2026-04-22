"use client"

import { DollarSign, Home, Package, TrendingUp, Users, Zap } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import type { TabId } from "@/lib/types"
import { cn } from "@/lib/utils"

const items = [
  { title: "Ngày", icon: Home, id: "daily", color: "text-blue-600" },
  { title: "Thu", icon: TrendingUp, id: "revenue", color: "text-emerald-600" },
  { title: "Kho", icon: Package, id: "supply", color: "text-orange-600" },
  { title: "Điện", icon: Zap, id: "utility", color: "text-amber-600" },
  { title: "Lãi", icon: DollarSign, id: "profit", color: "text-violet-600" },
  { title: "KH", icon: Users, id: "customers", color: "text-pink-600" },
] as const

const labels: Record<(typeof items)[number]["id"], string> = {
  daily: "Hàng Ngày",
  revenue: "Doanh Thu",
  supply: "Vật Tư",
  utility: "Điện Nước",
  profit: "Lãi Thực",
  customers: "Khách Hàng",
}

interface MobileNavigationProps {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
}

export function MobileNavigation({ activeTab, setActiveTab }: MobileNavigationProps) {
  const currentLabel = labels[activeTab as keyof typeof labels] ?? labels.daily

  return (
    <>
      <header className="mobile-shell-header">
        <div className="mobile-shell-card">
          <div className="flex size-11 items-center justify-center rounded-[1rem] bg-white shadow-xs ring-1 ring-slate-200/70">
            <Image src="/images/logo.png" alt="Giặt Sấy Vui Logo" width={36} height={36} className="object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="dashboard-shell-kicker">Giặt Sấy Vui</p>
            <h1 className="truncate text-[1.1rem] font-semibold tracking-tight text-slate-800">{currentLabel}</h1>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+0.7rem)]">
        <div className="mx-auto max-w-xl rounded-[1.7rem] border border-slate-200/78 bg-white/92 p-2 shadow-float backdrop-blur-xl">
          <div className="grid grid-cols-6 gap-1">
            {items.map((item) => {
              const isActive = activeTab === item.id

              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "flex h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 transition-all duration-200 active:scale-95",
                    isActive
                      ? `bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(243,247,255,0.95)_100%)] ring-1 ring-slate-200/72 shadow-[0_16px_32px_-24px_rgba(15,23,42,0.18)] ${item.color}`
                      : "text-slate-400 hover:bg-slate-50 hover:text-slate-600",
                  )}
                  onClick={() => setActiveTab(item.id)}
                >
                  <item.icon className={cn("size-5", isActive && "stroke-[2.4px]")} />
                  <span className="text-[10px] font-semibold leading-none">{item.title}</span>
                </Button>
              )
            })}
          </div>
        </div>
      </nav>
    </>
  )
}
