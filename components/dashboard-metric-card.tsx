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
    chip: string
    value: string
  }
> = {
  blue: {
    chip: "bg-blue-50 text-blue-600 ring-blue-100/80",
    value: "text-blue-700",
  },
  emerald: {
    chip: "bg-emerald-50 text-emerald-600 ring-emerald-100/80",
    value: "text-emerald-600",
  },
  amber: {
    chip: "bg-amber-50 text-amber-600 ring-amber-100/80",
    value: "text-amber-600",
  },
  violet: {
    chip: "bg-violet-50 text-violet-600 ring-violet-100/80",
    value: "text-violet-700",
  },
  rose: {
    chip: "bg-rose-50 text-rose-600 ring-rose-100/80",
    value: "text-rose-600",
  },
  sky: {
    chip: "bg-sky-50 text-sky-600 ring-sky-100/80",
    value: "text-sky-700",
  },
  pink: {
    chip: "bg-pink-50 text-pink-600 ring-pink-100/80",
    value: "text-pink-700",
  },
  slate: {
    chip: "bg-slate-100 text-slate-600 ring-slate-200/80",
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
    <Card className={cn("dashboard-metric", className)}>
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
            <div className={cn("dashboard-value mt-4", style.value, valueClassName)}>{value}</div>
            {meta ? <p className="mt-2 text-sm leading-6 text-slate-500">{meta}</p> : null}
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
