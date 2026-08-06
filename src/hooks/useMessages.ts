import { useCallback, useEffect, useRef, useState } from "react";
import supabase from "@/lib/supabase";
import { formatDisplayName, isPlaceholderDisplayName, shouldPreferFallbackDisplayName } from "@/lib/display";

export interface MessageRecipient {
  id: string;
  message_id: string;
  recipient_id: string;
  is_read: boolean;
  read_at: string | null;
}

export interface Message {
  id: string;
  school_id: string;
  sender_id: string;
  subject: string | null;
  body: string;
  is_broadcast: boolean;
  deleted_at: string | null;
  created_at: string;
  message_recipients?: MessageRecipient[];
}

export interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  messages: Message[];
}

interface MessagePageRow {
  message_id: string;
  school_id: string;
  sender_id: string;
  recipient_id: string;
  partner_id: string;
  subject: string | null;
  body: string;
  is_broadcast: boolean;
  created_at: string;
  recipient_row_id: string;
  is_read: boolean;
  read_at: string | null;
  partner_email: string | null;
  partner_first_name: string | null;
  partner_last_name: string | null;
  partner_avatar_url: string | null;
}

function formatPartnerName(profile: {
  email?: string | null;
  first_name: string | null;
  last_name: string | null;
} | null) {
  if (!profile) return "User";
  return formatDisplayName([profile.first_name, profile.last_name], profile.email, "User");
}

export function useMessages(userId: string | null, schoolId: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!userId || !schoolId) {
      setConversations([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase.rpc("get_message_page", {
      p_school_id: schoolId,
      p_before: null,
      p_limit: 100,
    });
    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const conversationMap = new Map<string, Conversation>();
    for (const row of ((data as MessagePageRow[] | null) ?? [])) {
      const message: Message = {
        id: row.message_id,
        school_id: row.school_id,
        sender_id: row.sender_id,
        subject: row.subject,
        body: row.body,
        is_broadcast: row.is_broadcast,
        deleted_at: null,
        created_at: row.created_at,
        message_recipients: [{
          id: row.recipient_row_id,
          message_id: row.message_id,
          recipient_id: row.recipient_id,
          is_read: row.is_read,
          read_at: row.read_at,
        }],
      };
      const profile = {
        email: row.partner_email,
        first_name: row.partner_first_name,
        last_name: row.partner_last_name,
        avatar_url: row.partner_avatar_url,
      };
      const partnerName = formatPartnerName(profile);
      const existing = conversationMap.get(row.partner_id);
      const unread = row.sender_id !== userId && !row.is_read;
      if (!existing) {
        conversationMap.set(row.partner_id, {
          partnerId: row.partner_id,
          partnerName,
          partnerAvatar: row.partner_avatar_url,
          lastMessage: row.body,
          lastTime: row.created_at,
          unreadCount: unread ? 1 : 0,
          messages: [message],
        });
        continue;
      }
      existing.messages.push(message);
      if (unread) existing.unreadCount += 1;
      if (shouldPreferFallbackDisplayName(existing.partnerName) && !isPlaceholderDisplayName(partnerName)) {
        existing.partnerName = partnerName;
      }
      existing.partnerAvatar ||= row.partner_avatar_url;
    }

    const next = Array.from(conversationMap.values());
    next.forEach((conversation) => {
      conversation.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });
    next.sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());
    setConversations(next);
    setLoading(false);
  }, [userId, schoolId]);

  useEffect(() => { void fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    if (!userId || !schoolId) return;
    const scheduleRefresh = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        void fetchMessages();
      }, 250);
    };
    const channel = supabase
      .channel(`messages:${userId}:${schoolId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "message_recipients", filter: `recipient_id=eq.${userId}`,
      }, scheduleRefresh)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "message_recipients", filter: `recipient_id=eq.${userId}`,
      }, scheduleRefresh)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages", filter: `sender_id=eq.${userId}`,
      }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [userId, schoolId, fetchMessages]);

  const sendMessage = useCallback(async (recipientId: string, body: string, subject?: string) => {
    if (!userId || !schoolId) return { error: "Not authenticated" };
    const { error: sendError } = await supabase.rpc("send_private_message", {
      p_school_id: schoolId,
      p_recipient_id: recipientId,
      p_body: body,
      p_subject: subject ?? null,
    });
    return { error: sendError?.message ?? null };
  }, [userId, schoolId]);

  const sendBroadcast = useCallback(async (
    targetRole: "teacher" | "student" | "parent",
    body: string,
    classId?: string,
    subject?: string,
  ) => {
    if (!userId || !schoolId) return { error: "Not authenticated" };
    const { error: sendError } = await supabase.rpc("send_broadcast_message", {
      p_school_id: schoolId,
      p_target_role: targetRole,
      p_body: body,
      p_subject: subject ?? null,
      p_class_id: classId ?? null,
    });
    return { error: sendError?.message ?? null };
  }, [userId, schoolId]);

  const markAsRead = useCallback(async (messageId: string) => {
    if (!userId) return { error: "Not authenticated" };
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("message_recipients")
      .update({ is_read: true, read_at: now })
      .eq("message_id", messageId)
      .eq("recipient_id", userId);
    if (updateError) return { error: updateError.message };

    setConversations((previous) => previous.map((conversation) => {
      const messages = conversation.messages.map((message) => message.id === messageId
        ? {
            ...message,
            message_recipients: (message.message_recipients ?? []).map((recipient) =>
              recipient.recipient_id === userId ? { ...recipient, is_read: true, read_at: now } : recipient),
          }
        : message);
      const unreadCount = messages.reduce((sum, message) => sum + (
        message.sender_id !== userId && (message.message_recipients ?? []).some(
          (recipient) => recipient.recipient_id === userId && !recipient.is_read,
        ) ? 1 : 0
      ), 0);
      return { ...conversation, messages, unreadCount };
    }));
    return { error: null };
  }, [userId]);

  const totalUnread = conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0);
  return { conversations, loading, error, sendMessage, sendBroadcast, markAsRead, fetchMessages, totalUnread };
}
