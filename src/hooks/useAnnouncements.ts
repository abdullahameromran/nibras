import { useState, useEffect, useCallback } from "react";
import supabase from "@/lib/supabase";
import { useRealtimeRefresh } from "./useRealtimeRefresh";
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
        id, school_id, author_id, title, body, is_published, published_at,
        deleted_at, created_at,
        profiles ( id, first_name, last_name ),
        announcement_targets ( id, target_type, target_id, target_role )
      `)
      .eq("school_id", schoolId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (err) setError(err.message);
    else setAnnouncements((data as Announcement[]) ?? []);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);
  useRealtimeRefresh(fetchAnnouncements, ["announcements", "announcement_targets"]);

  const createAnnouncement = useCallback(async (payload: {
    school_id: string;
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
      .rpc("create_announcement_with_targets", {
        p_school_id: annData.school_id,
        p_title: annData.title,
        p_body: annData.body,
        p_is_published: annData.is_published ?? false,
        p_targets: targets,
      });
    if (annErr) return { error: annErr.message, data: null };

    const createdAnnouncement = ann as Announcement;

    // If published, trigger send-announcement edge function
    if (annData.is_published) {
      callSendAnnouncement(createdAnnouncement.id).catch(console.error);
    }

    await fetchAnnouncements();
    return { error: null, data: createdAnnouncement };
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

  const updateAnnouncement = useCallback(async (id: string, updates: {
    title: string;
    body: string;
    targets: Array<{ target_type: AnnouncementTargetType; target_id?: string | null; target_role?: string | null }>;
  }) => {
    const { error: updateError } = await supabase.from("announcements").update({ title: updates.title, body: updates.body }).eq("id", id);
    if (updateError) return { error: updateError.message };
    const { error: deleteTargetsError } = await supabase.from("announcement_targets").delete().eq("announcement_id", id);
    if (deleteTargetsError) return { error: deleteTargetsError.message };
    if (updates.targets.length > 0) {
      const { error: targetsError } = await supabase.from("announcement_targets").insert(updates.targets.map((target) => ({ announcement_id: id, ...target })));
      if (targetsError) return { error: targetsError.message };
    }
    await fetchAnnouncements();
    return { error: null };
  }, [fetchAnnouncements]);

  const unpublishAnnouncement = useCallback(async (id: string) => {
    const { error: err } = await supabase.from("announcements").update({ is_published: false, published_at: null }).eq("id", id);
    if (err) return { error: err.message };
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

  return { announcements, loading, error, fetchAnnouncements, createAnnouncement, updateAnnouncement, publishAnnouncement, unpublishAnnouncement, deleteAnnouncement };
}
