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

const NOTIFICATIONS_LAST_READ_AT_STORAGE_KEY = "school-platform-notifications-last-read-at";

function readStoredLastReadAt(userId: string | null) {
  if (!userId || typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(`${NOTIFICATIONS_LAST_READ_AT_STORAGE_KEY}:${userId}`);
    return raw && raw.trim() ? raw : null;
  } catch {
    return null;
  }
}

function persistLastReadAt(userId: string | null, value: string | null) {
  if (!userId || typeof window === "undefined") return;

  try {
    const key = `${NOTIFICATIONS_LAST_READ_AT_STORAGE_KEY}:${userId}`;
    if (!value) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore localStorage failures and continue with in-memory state.
  }
}

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastReadAt, setLastReadAt] = useState<string | null>(() => readStoredLastReadAt(userId));
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }
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

  useEffect(() => {
    setLastReadAt(readStoredLastReadAt(userId));
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

  const isUnread = useCallback((notification: Notification) => {
    if (notification.status !== "pending") return false;
    if (!lastReadAt) return true;

    return new Date(notification.created_at).getTime() > new Date(lastReadAt).getTime();
  }, [lastReadAt]);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return { error: "Not authenticated" };

    const nextReadAt = new Date().toISOString();
    setLastReadAt(nextReadAt);
    persistLastReadAt(userId, nextReadAt);
    return { error: null };
  }, [userId]);

  const unreadCount = notifications.filter(isUnread).length;

  return { notifications, loading, fetchNotifications, unreadCount, isUnread, markAllAsRead };
}
