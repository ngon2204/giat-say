"use client"

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type DashboardMetricAccent =
  | "blue"
  | "emerald"
  | "amber"
  | "violet"
  | "rose"
  | "sky"
  | "pink"
  | "slate"

const accentStyles: Record<
  DashboardMetricAccent,
  {
    panel: string
    chip: string
    label: string
    meta: string
    value: string
  }
> = {
  blue: {
    panel:
      "border-blue-100/80 bg-[linear-gradient(135deg,rgba(239,246,255,0.98)_0%,rgba(255,255,255,0.94)_100%)]",
    chip: "bg-white text-blue-600 ring-blue-100/90 shadow-[0_16px_30px_-22px_rgba(37,99,235,0.35)]",
    label: "text-blue-700",
    meta: "text-slate-600",
    value: "text-blue-700",
  },
  emerald: {
    panel:
      "border-emerald-100/80 bg-[linear-gradient(135deg,rgba(236,253,245,0.98)_0%,rgba(255,255,255,0.94)_100%)]",
    chip: "bg-white text-emerald-600 ring-emerald-100/90 shadow-[0_16px_30px_-22px_rgba(5,150,105,0.3)]",
    label: "text-emerald-700",
    meta: "text-slate-600",
    value: "text-emerald-600",
  },
  amber: {
    panel:
      "border-amber-100/80 bg-[linear-gradient(135deg,rgba(255,247,237,0.98)_0%,rgba(255,255,255,0.94)_100%)]",
    chip: "bg-white text-amber-600 ring-amber-100/90 shadow-[0_16px_30px_-22px_rgba(217,119,6,0.28)]",
    label: "text-amber-700",
    meta: "text-slate-600",
    value: "text-amber-600",
  },
  violet: {
    panel:
      "border-violet-100/80 bg-[linear-gradient(135deg,rgba(245,243,255,0.98)_0%,rgba(255,255,255,0.94)_100%)]",
    chip: "bg-white text-violet-600 ring-violet-100/90 shadow-[0_16px_30px_-22px_rgba(124,58,237,0.28)]",
    label: "text-violet-700",
    meta: "text-slate-600",
    value: "text-violet-700",
  },
  rose: {
    panel:
      "border-rose-100/80 bg-[linear-gradient(135deg,rgba(255,241,242,0.98)_0%,rgba(255,255,255,0.94)_100%)]",
    chip: "bg-white text-rose-600 ring-rose-100/90 shadow-[0_16px_30px_-22px_rgba(225,29,72,0.26)]",
    label: "text-rose-700",
    meta: "text-slate-600",
    value: "text-rose-600",
  },
  sky: {
    panel:
      "border-sky-100/80 bg-[linear-gradient(135deg,rgba(240,249,255,0.98)_0%,rgba(255,255,255,0.94)_100%)]",
    chip: "bg-white text-sky-600 ring-sky-100/90 shadow-[0_16px_30px_-22px_rgba(2,132,199,0.28)]",
    label: "text-sky-700",
    meta: "text-slate-600",
    value: "text-sky-700",
  },
  pink: {
    panel:
      "border-pink-100/80 bg-[linear-gradient(135deg,rgba(253,242,248,0.98)_0%,rgba(255,255,255,0.94)_100%)]",
    chip: "bg-white text-pink-600 ring-pink-100/90 shadow-[0_16px_30px_-22px_rgba(219,39,119,0.28)]",
    label: "text-pink-700",
    meta: "text-slate-600",
    value: "text-pink-700",
  },
  slate: {
    panel:
      "border-slate-200/78 bg-[linear-gradient(135deg,rgba(248,250,252,0.98)_0%,rgba(255,255,255,0.94)_100%)]",
    chip: "bg-white text-slate-600 ring-slate-200/80 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.2)]",
    label: "text-slate-600",
    meta: "text-slate-500",
    value: "text-slate-800",
  },
}

interface DashboardMetricCardProps {
  label: string
  value: ReactNode
  icon: LucideIcon
  meta?: ReactNode
  accent?: DashboardMetricAccent
  className?: string
  valueClassName?: string
}

export function DashboardMetricCard({
  label,
  value,
  icon: Icon,
  meta,
  accent = "slate",
  className,
  valueClassName,
}: DashboardMetricCardProps) {
  const style = accentStyles[accent]

  return (
    <Card className={cn("dashboard-metric overflow-hidden", style.panel, className)}>
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className={cn("text-[0.72rem] font-semibold uppercase tracking-[0.18em]", style.label)}>{label}</p>
            <div className={cn("dashboard-value mt-4", style.value, valueClassName)}>{value}</div>
            {meta ? <p className={cn("mt-2 text-sm leading-6", style.meta)}>{meta}</p> : null}
          </div>

          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-2xl ring-1 shadow-xs",
              style.chip,
            )}
          >
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
