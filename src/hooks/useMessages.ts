import { useState, useEffect, useCallback, useRef } from "react";
import supabase from "@/lib/supabase";

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
  sender?: {
    id: string;
    email?: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
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

function normalizePartnerProfile<T>(profile: T | T[] | null | undefined) {
  return Array.isArray(profile) ? profile[0] ?? null : profile ?? null;
}

function formatPartnerName(profile: {
  email?: string | null;
  first_name: string | null;
  last_name: string | null;
} | null) {
  if (!profile) return "User";
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  return fullName || profile.email || "User";
}

export function useMessages(userId: string | null, schoolId: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!userId || !schoolId) {
      setConversations([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    // Fetch all messages where user is sender or recipient
    const { data: sentData } = await supabase
      .from("messages")
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey ( id, email, first_name, last_name, avatar_url ),
        message_recipients ( id, recipient_id, is_read, read_at,
          recipient_profile:profiles!message_recipients_recipient_id_fkey ( id, email, first_name, last_name, avatar_url )
        )
      `)
      .eq("school_id", schoolId)
      .eq("sender_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    const { data: receivedData } = await supabase
      .from("message_recipients")
      .select(`
        id, message_id, recipient_id, is_read, read_at,
        messages (
          id, school_id, sender_id, body, subject, is_broadcast, created_at,
          sender:profiles!messages_sender_id_fkey ( id, email, first_name, last_name, avatar_url )
        )
      `)
      .eq("recipient_id", userId)
      .order("message_id", { ascending: false });

    // Build conversations map keyed by partner user_id
    const convoMap = new Map<string, Conversation>();

    const addMessage = (
      msg: Message,
      partnerId: string,
      partnerProfile: {
        email?: string | null;
        first_name: string | null;
        last_name: string | null;
        avatar_url: string | null;
      } | null,
      isRead: boolean,
    ) => {
      const name = formatPartnerName(partnerProfile);
      const existing = convoMap.get(partnerId);
      if (!existing) {
        convoMap.set(partnerId, {
          partnerId,
          partnerName: name,
          partnerAvatar: partnerProfile?.avatar_url ?? null,
          lastMessage: msg.body,
          lastTime: msg.created_at,
          unreadCount: isRead ? 0 : 1,
          messages: [msg],
        });
      } else {
        existing.messages.push(msg);
        if (!isRead) existing.unreadCount++;
        if (existing.partnerName === "User" && name !== "User") {
          existing.partnerName = name;
        }
        if (!existing.partnerAvatar && partnerProfile?.avatar_url) {
          existing.partnerAvatar = partnerProfile.avatar_url;
        }
        if (new Date(msg.created_at) > new Date(existing.lastTime)) {
          existing.lastMessage = msg.body;
          existing.lastTime = msg.created_at;
        }
      }
    };

    // Process sent messages
    for (const msg of ((sentData as Message[]) ?? [])) {
      const recipients = msg.message_recipients ?? [];
      for (const r of recipients) {
        const profile = normalizePartnerProfile(
          (r as any).recipient_profile as
            | { first_name: string | null; last_name: string | null; avatar_url: string | null }
            | Array<{ first_name: string | null; last_name: string | null; avatar_url: string | null }>
            | null,
        );
        addMessage(msg, r.recipient_id, profile, true); // sent = always "read" from sender's view
      }
    }

    // Process received messages
    for (const row of ((receivedData as any[]) ?? [])) {
      const msg = row.messages as Message;
      if (!msg) continue;
      const senderProfile = normalizePartnerProfile(msg.sender as any);
      const messageWithRecipient: Message = {
        ...msg,
        message_recipients: [
          {
            id: row.id,
            message_id: row.message_id,
            recipient_id: row.recipient_id,
            is_read: row.is_read,
            read_at: row.read_at,
          },
        ],
      };
      addMessage(messageWithRecipient, msg.sender_id, senderProfile, row.is_read);
    }

    const unresolvedPartnerIds = Array.from(convoMap.entries())
      .filter(([, conversation]) => conversation.partnerName === "User")
      .map(([partnerId]) => partnerId);

    if (unresolvedPartnerIds.length > 0) {
      const { data: partnerProfiles } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, avatar_url")
        .in("id", unresolvedPartnerIds);

      ((partnerProfiles as Array<{
        id: string;
        email: string | null;
        first_name: string | null;
        last_name: string | null;
        avatar_url: string | null;
      }> | null) ?? []).forEach((profile) => {
        const conversation = convoMap.get(profile.id);
        if (!conversation) return;
        conversation.partnerName = formatPartnerName(profile);
        conversation.partnerAvatar = conversation.partnerAvatar ?? profile.avatar_url;
      });
    }

    setConversations(Array.from(convoMap.values()).sort((a, b) =>
      new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
    ));
    setLoading(false);
  }, [userId, schoolId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!userId || !schoolId) return;

    const channel = supabase
      .channel(`messages:${userId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "message_recipients",
        filter: `recipient_id=eq.${userId}`,
      }, () => { fetchMessages(); })
      .subscribe();

    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [userId, schoolId, fetchMessages]);

  const sendMessage = useCallback(async (recipientId: string, body: string, subject?: string) => {
    if (!userId || !schoolId) return { error: "Not authenticated" };
    // Use the send_private_message RPC
    const { error: err } = await supabase.rpc("send_private_message", {
      p_school_id: schoolId,
      p_recipient_id: recipientId,
      p_body: body,
      p_subject: subject ?? null,
    });
    if (err) return { error: err.message };
    await fetchMessages();
    return { error: null };
  }, [userId, schoolId, fetchMessages]);

  const markAsRead = useCallback(async (messageId: string) => {
    const { error: err } = await supabase
      .from("message_recipients")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("message_id", messageId)
      .eq("recipient_id", userId!);
    if (err) return { error: err.message };
    setConversations((prev) =>
      prev.map((conversation) => {
        const messages = conversation.messages.map((message) =>
          message.id === messageId
            ? {
                ...message,
                message_recipients: (message.message_recipients ?? []).map((recipient) =>
                  recipient.recipient_id === userId
                    ? {
                        ...recipient,
                        is_read: true,
                        read_at: new Date().toISOString(),
                      }
                    : recipient,
                ),
              }
            : message,
        );
        const unreadCount = messages.reduce((sum, message) => {
          if (message.sender_id === userId) return sum;
          const isUnread = (message.message_recipients ?? []).some(
            (recipient) => recipient.recipient_id === userId && !recipient.is_read,
          );
          return sum + (isUnread ? 1 : 0);
        }, 0);
        return {
          ...conversation,
          messages,
          unreadCount,
        };
      }),
    );
    return { error: null };
  }, [userId]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return { conversations, loading, error, sendMessage, markAsRead, fetchMessages, totalUnread };
}
