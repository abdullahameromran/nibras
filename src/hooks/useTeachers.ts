import { useState, useEffect, useCallback } from "react";
import supabase from "@/lib/supabase";
import { callInviteUser } from "@/lib/storage";

export interface Teacher {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  role_id?: string;
  school_id?: string;
  subjects?: Array<{ id: string; name: string }>;
}

function normalizeProfile(
  profile: Partial<Teacher> | Array<Partial<Teacher>> | null | undefined,
) {
  return Array.isArray(profile) ? profile[0] ?? null : profile ?? null;
}

export function useTeachers(schoolId: string | null) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeachers = useCallback(async () => {
    if (!schoolId) {
      setTeachers([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    // Join profiles through user_school_roles
    const { data, error: err } = await supabase
      .from("user_school_roles")
      .select(`
        id,
        user_id,
        school_id,
        profiles (
          id, email, first_name, last_name, avatar_url, phone, is_active
        )
      `)
      .eq("school_id", schoolId)
      .eq("role", "teacher")
      .eq("is_active", true);
    if (err) { setError(err.message); setLoading(false); return; }

    // Flatten: each row has a profiles object
    const rows = (data ?? []) as Array<{
      id: string;
      user_id: string;
      school_id: string;
      profiles: Partial<Teacher> | Array<Partial<Teacher>> | null;
    }>;
    const seen = new Set<string>();
    const flat = rows
      .map((row) => {
        const profile = normalizeProfile(row.profiles);
        return {
          id: profile?.id ?? row.user_id,
          email: profile?.email ?? "",
          first_name: profile?.first_name ?? null,
          last_name: profile?.last_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          phone: profile?.phone ?? null,
          is_active: profile?.is_active ?? true,
          role_id: row.id,
          school_id: row.school_id,
        } satisfies Teacher;
      })
      .filter((teacher) => {
        if (!teacher.id || seen.has(teacher.id)) return false;
        seen.add(teacher.id);
        return true;
      });
    setTeachers(flat);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const inviteTeacher = useCallback(async (payload: {
    email: string;
    first_name?: string;
    last_name?: string;
  }) => {
    if (!schoolId) return { error: "No school selected" };
    const result = await callInviteUser({
      school_id: schoolId,
      email: payload.email,
      role: "teacher",
      first_name: payload.first_name,
      last_name: payload.last_name,
    });
    if (result.error) return { error: result.error };
    await fetchTeachers();
    return { error: null };
  }, [schoolId, fetchTeachers]);

  const deactivateTeacher = useCallback(async (userId: string) => {
    const { error: err } = await supabase
      .from("user_school_roles")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("school_id", schoolId)
      .eq("role", "teacher");
    if (err) return { error: err.message };
    await fetchTeachers();
    return { error: null };
  }, [schoolId, fetchTeachers]);

  return { teachers, loading, error, fetchTeachers, inviteTeacher, deactivateTeacher };
}
