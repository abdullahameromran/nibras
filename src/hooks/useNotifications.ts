import { useState, useEffect, useCallback, useRef } from "react";
import supabase from "@/lib/supabase";

export interface Notification {
  id: string;
  school_id: string | null;
  recipient_id: string;
  channel: string;
  title: string | null;
  body: string | null;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
  sent_at: string | null;
}

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications((data as Notification[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Real-time: listen for new notifications
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `recipient_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();
    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [userId]);

  const unreadCount = notifications.filter(n => n.status === "pending").length;

  return { notifications, loading, fetchNotifications, unreadCount };
}
