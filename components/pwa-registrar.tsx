"use client"

import { useEffect } from "react"

/**
 * Registers the online-only service worker so the app is installable as a PWA.
 * The SW does no caching, so the app always uses live (online) data.
 */
export function PwaRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return
    if (process.env.NODE_ENV !== "production") return

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failures are non-fatal for an online-only app.
      })
    }

    if (document.readyState === "complete") register()
    else window.addEventListener("load", register, { once: true })
  }, [])

  return null
}
