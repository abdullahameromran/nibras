import { useEffect, useRef } from "react"
import supabase from "@/lib/supabase"

type Listener = { tables: Set<string>; refresh: () => void }

const listeners = new Set<Listener>()
let channel: ReturnType<typeof supabase.channel> | null = null

function ensureChannel() {
  if (channel) return
  channel = supabase
    .channel("nibras-live-data")
    .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
      const table = payload.table
      listeners.forEach((listener) => {
        if (listener.tables.size === 0 || listener.tables.has(table)) listener.refresh()
      })
    })
    .subscribe()
}

export function useRealtimeRefresh(refresh: () => void | Promise<void>, tables: string[]) {
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  useEffect(() => {
    let timer: number | null = null
    const run = () => {
      if (timer != null) window.clearTimeout(timer)
      timer = window.setTimeout(() => { void refreshRef.current() }, 150)
    }
    const listener: Listener = { tables: new Set(tables), refresh: run }
    listeners.add(listener)
    ensureChannel()

    const onVisible = () => {
      if (document.visibilityState === "visible") run()
    }
    window.addEventListener("focus", run)
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      if (timer != null) window.clearTimeout(timer)
      listeners.delete(listener)
      window.removeEventListener("focus", run)
      document.removeEventListener("visibilitychange", onVisible)
      if (listeners.size === 0 && channel) {
        void supabase.removeChannel(channel)
        channel = null
      }
    }
  }, [tables.join("|")])
}
