"use client"

import { useEffect, useRef } from "react"

export function useRefreshOnFocus(refresh: () => void) {
  const refreshRef = useRef(refresh)
  const lastRefreshAtRef = useRef(0)

  refreshRef.current = refresh

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState !== "visible") {
        return
      }

      const now = Date.now()
      if (now - lastRefreshAtRef.current < 1000) {
        return
      }

      lastRefreshAtRef.current = now
      refreshRef.current()
    }

    refreshIfVisible()
    window.addEventListener("focus", refreshIfVisible)
    document.addEventListener("visibilitychange", refreshIfVisible)

    return () => {
      window.removeEventListener("focus", refreshIfVisible)
      document.removeEventListener("visibilitychange", refreshIfVisible)
    }
  }, [])
}
