"use client"

import { DollarSign, Home, Package, TrendingUp, Users, Zap } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import type { TabId } from "@/lib/types"
import { cn } from "@/lib/utils"

const items = [
  { title: "Hàng Ngày", icon: Home, id: "daily", color: "text-blue-600" },
  { title: "Doanh Thu", icon: TrendingUp, id: "revenue", color: "text-emerald-600" },
  { title: "Vật Tư", icon: Package, id: "supply", color: "text-orange-600" },
  { title: "Điện Nước", icon: Zap, id: "utility", color: "text-amber-600" },
  { title: "Lãi Thực", icon: DollarSign, id: "profit", color: "text-violet-600" },
  { title: "Khách Hàng", icon: Users, id: "customers", color: "text-pink-600" },
] as const

interface DesktopSidebarProps {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  isMobile?: boolean
}

export function DesktopSidebar({ activeTab, setActiveTab, isOpen, setIsOpen, isMobile = false }: DesktopSidebarProps) {
  if (!isOpen && !isMobile) {
    return null
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 h-full w-72 border-r border-slate-200/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,255,0.96)_100%)] backdrop-blur-xl transition-transform duration-300",
        isMobile ? "translate-x-0" : isOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-200/78 px-6 py-6">
          <div className="relative h-16 w-full">
            <Image
              src="/images/logo-full.png"
              alt="Giặt Sấy Vui Logo"
              fill
              priority
              sizes="240px"
              className="object-contain object-left"
            />
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 py-5">
          {items.map((item) => {
            const isActive = activeTab === item.id

            return (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "h-14 w-full justify-start gap-3 rounded-[1.35rem] px-3 text-left transition-all duration-200",
                  isActive
                    ? "border border-slate-200/72 bg-white text-slate-800 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.16)]"
                    : "text-slate-500 hover:bg-white/90 hover:text-slate-700",
                )}
                onClick={() => {
                  setActiveTab(item.id)
                  if (isMobile) {
                    setIsOpen(false)
                  }
                }}
              >
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-2xl border",
                    isActive ? "border-blue-100 bg-blue-50/80" : "border-transparent bg-transparent",
                  )}
                >
                  <item.icon className={cn("size-5", isActive ? item.color : "text-slate-400")} />
                </div>
                <span className="text-sm font-semibold">{item.title}</span>
              </Button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
