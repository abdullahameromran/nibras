import { useCallback, useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import { callInviteUser } from "@/lib/storage";

export interface ParentUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  role_id?: string;
  school_id?: string;
  linked_student_ids: string[];
}

type ParentRoleRow = {
  id: string;
  user_id: string;
  school_id: string;
  profiles:
    | {
        id?: string;
        email?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        avatar_url?: string | null;
        phone?: string | null;
        is_active?: boolean;
      }
    | Array<{
        id?: string;
        email?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        avatar_url?: string | null;
        phone?: string | null;
        is_active?: boolean;
      }>
    | null;
};

type ParentLinkRow = {
  parent_id: string;
  student_id: string;
};

function normalizeProfile(
  profile: ParentRoleRow["profiles"],
) {
  return Array.isArray(profile) ? profile[0] ?? null : profile ?? null;
}

export function useParents(schoolId: string | null) {
  const [parents, setParents] = useState<ParentUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchParents = useCallback(async () => {
    if (!schoolId) {
      setParents([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const [{ data: roleData, error: roleError }, { data: linkData, error: linkError }] = await Promise.all([
      supabase
        .from("user_school_roles")
        .select(`
          id,
          user_id,
          school_id,
          profiles (
            id,
            email,
            first_name,
            last_name,
            avatar_url,
            phone,
            is_active
          )
        `)
        .eq("school_id", schoolId)
        .eq("role", "parent")
        .eq("is_active", true),
      supabase
        .from("parent_student_links")
        .select("parent_id, student_id")
        .eq("school_id", schoolId),
    ]);

    if (roleError) {
      setParents([]);
      setLoading(false);
      setError(roleError.message);
      return;
    }

    if (linkError) {
      setError(linkError.message);
    }

    const linkedStudentIdsByParent = new Map<string, string[]>();
    ((linkData as ParentLinkRow[] | null) ?? []).forEach((row) => {
      const rows = linkedStudentIdsByParent.get(row.parent_id) ?? [];
      rows.push(row.student_id);
      linkedStudentIdsByParent.set(row.parent_id, rows);
    });

    const seen = new Set<string>();
    const nextParents = ((roleData as ParentRoleRow[] | null) ?? [])
      .map((row) => {
        const profile = normalizeProfile(row.profiles);
        const parentId = profile?.id ?? row.user_id;
        return {
          id: parentId,
          email: profile?.email ?? "",
          first_name: profile?.first_name ?? null,
          last_name: profile?.last_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          phone: profile?.phone ?? null,
          is_active: profile?.is_active ?? true,
          role_id: row.id,
          school_id: row.school_id,
          linked_student_ids: linkedStudentIdsByParent.get(parentId) ?? [],
        } satisfies ParentUser;
      })
      .filter((parent) => {
        if (!parent.id || seen.has(parent.id)) return false;
        seen.add(parent.id);
        return true;
      });

    setParents(nextParents);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => {
    fetchParents();
  }, [fetchParents]);

  const inviteParent = useCallback(async (payload: {
    email: string;
    first_name?: string;
    last_name?: string;
  }) => {
    if (!schoolId) return { error: "No school selected", user_id: null as string | null };
    const result = await callInviteUser({
      school_id: schoolId,
      email: payload.email,
      role: "parent",
      first_name: payload.first_name,
      last_name: payload.last_name,
    });
    if (result.error) {
      return { error: String(result.error), user_id: null as string | null };
    }
    await fetchParents();
    return { error: null, user_id: typeof result.user_id === "string" ? result.user_id : null };
  }, [fetchParents, schoolId]);

  const linkParentToStudent = useCallback(async (payload: {
    parent_id: string;
    student_id: string;
    relationship?: string;
  }) => {
    if (!schoolId) return { error: "No school selected" };
    const { error: linkInsertError } = await supabase
      .from("parent_student_links")
      .upsert(
        {
          school_id: schoolId,
          parent_id: payload.parent_id,
          student_id: payload.student_id,
          relationship: payload.relationship?.trim() || "parent",
        },
        { onConflict: "parent_id,student_id" },
      );
    if (linkInsertError) return { error: linkInsertError.message };
    await fetchParents();
    return { error: null };
  }, [fetchParents, schoolId]);

  const unlinkParentFromStudent = useCallback(async (linkId: string) => {
    const { error: deleteError } = await supabase
      .from("parent_student_links")
      .delete()
      .eq("id", linkId);
    if (deleteError) return { error: deleteError.message };
    await fetchParents();
    return { error: null };
  }, [fetchParents]);

  return {
    parents,
    loading,
    error,
    fetchParents,
    inviteParent,
    linkParentToStudent,
    unlinkParentFromStudent,
  };
}
