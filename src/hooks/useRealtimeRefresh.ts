import { useEffect, useRef } from "react"
import supabase from "@/lib/supabase"

type Listener = { tables: Set<string>; refresh: () => void }

const REFRESH_DEBOUNCE_MS = 300
const REFRESH_COOLDOWN_MS = 1_000

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
    let running = false
    let queued = false
    let lastStartedAt = 0
    let disposed = false

    const execute = async () => {
      if (disposed) return
      if (running) {
        queued = true
        return
      }

      const remainingCooldown = REFRESH_COOLDOWN_MS - (Date.now() - lastStartedAt)
      if (remainingCooldown > 0) {
        if (timer != null) window.clearTimeout(timer)
        timer = window.setTimeout(() => {
          timer = null
          void execute()
        }, remainingCooldown)
        return
      }

      running = true
      queued = false
      lastStartedAt = Date.now()
      try {
        await refreshRef.current()
      } finally {
        running = false
        if (queued && !disposed) run()
      }
    }

    const run = () => {
      if (timer != null) window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        timer = null
        void execute()
      }, REFRESH_DEBOUNCE_MS)
    }
    const listener: Listener = { tables: new Set(tables), refresh: run }
    listeners.add(listener)
    ensureChannel()

    return () => {
      disposed = true
      if (timer != null) window.clearTimeout(timer)
      listeners.delete(listener)
      if (listeners.size === 0 && channel) {
        void supabase.removeChannel(channel)
        channel = null
      }
    }
  }, [tables.join("|")])
}
