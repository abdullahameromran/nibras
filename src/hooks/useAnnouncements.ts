import { useState, useEffect, useCallback } from "react";
import supabase from "@/lib/supabase";
import { callSendAnnouncement } from "@/lib/storage";

export type AnnouncementTargetType = "school" | "grade_level" | "class" | "role";

export interface AnnouncementTarget {
  id: string;
  announcement_id: string;
  target_type: AnnouncementTargetType;
  target_id: string | null;
  target_role: string | null;
}

export interface Announcement {
  id: string;
  school_id: string;
  author_id: string;
  title: string;
  body: string;
  is_published: boolean;
  published_at: string | null;
  deleted_at: string | null;
  created_at: string;
  profiles?: { id: string; first_name: string | null; last_name: string | null };
  announcement_targets?: AnnouncementTarget[];
}

export function useAnnouncements(schoolId: string | null) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("announcements")
      .select(`
        *,
        profiles ( id, first_name, last_name ),
        announcement_targets ( id, target_type, target_id, target_role )
      `)
      .eq("school_id", schoolId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else setAnnouncements((data as Announcement[]) ?? []);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const createAnnouncement = useCallback(async (payload: {
    school_id: string;
    author_id: string;
    title: string;
    body: string;
    is_published?: boolean;
    targets: Array<{
      target_type: AnnouncementTargetType;
      target_id?: string | null;
      target_role?: string | null;
    }>;
  }) => {
    const { targets, ...annData } = payload;
    const { data: ann, error: annErr } = await supabase
      .from("announcements")
      .insert({
        ...annData,
        published_at: annData.is_published ? new Date().toISOString() : null,
      })
      .select()
      .single();
    if (annErr) return { error: annErr.message, data: null };

    if (targets.length > 0) {
      await supabase.from("announcement_targets").insert(
        targets.map(t => ({ announcement_id: ann.id, ...t }))
      );
    }

    // If published, trigger send-announcement edge function
    if (annData.is_published) {
      callSendAnnouncement(ann.id).catch(console.error);
    }

    await fetchAnnouncements();
    return { error: null, data: ann };
  }, [fetchAnnouncements]);

  const publishAnnouncement = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from("announcements")
      .update({ is_published: true, published_at: new Date().toISOString() })
      .eq("id", id);
    if (err) return { error: err.message };
    callSendAnnouncement(id).catch(console.error);
    await fetchAnnouncements();
    return { error: null };
  }, [fetchAnnouncements]);

  const deleteAnnouncement = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from("announcements")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (err) return { error: err.message };
    await fetchAnnouncements();
    return { error: null };
  }, [fetchAnnouncements]);

  return { announcements, loading, error, fetchAnnouncements, createAnnouncement, publishAnnouncement, deleteAnnouncement };
}
