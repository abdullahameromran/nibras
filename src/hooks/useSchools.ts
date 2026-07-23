import { useState, useEffect, useCallback } from "react";
import supabase from "@/lib/supabase";
import { callProvisionSchool, callSoftDelete } from "@/lib/storage";

export interface School {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  timezone: string;
  is_active: boolean;
  settings: Record<string, unknown>;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  admin_name?: string | null;
  admin_email?: string | null;
  student_count?: number;
  teacher_count?: number;
  school_subscriptions?: Array<{
    id: string;
    status: string;
    starts_at: string;
    ends_at: string | null;
    subscription_plans: {
      id: string;
      name: string;
      price_cents: number;
      max_students: number | null;
      max_teachers: number | null;
    } | null;
  }>;
}

export function useSchools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [{ data, error: schoolsError }, { data: rolesData, error: rolesError }] = await Promise.all([
      supabase
        .from("schools")
        .select(`
          *,
          school_subscriptions (
            id, status, starts_at, ends_at,
            subscription_plans ( id, name, price_cents, max_students, max_teachers )
          )
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("user_school_roles")
        .select(`
          school_id,
          user_id,
          role,
          profiles (
            email,
            first_name,
            last_name
          )
        `)
        .in("role", ["teacher", "student", "school_admin"])
        .eq("is_active", true),
    ]);

    if (schoolsError) {
      setError(schoolsError.message);
      setSchools([]);
      setLoading(false);
      return;
    }

    const teacherIdsBySchool = new Map<string, Set<string>>();
    const studentIdsBySchool = new Map<string, Set<string>>();
    const adminProfilesBySchool = new Map<string, { name: string | null; email: string | null }>();
    const roleRows = (rolesData ?? []) as Array<{
      school_id: string | null;
      user_id: string;
      role: string;
      profiles?: {
        email?: string | null;
        first_name?: string | null;
        last_name?: string | null;
      } | null;
    }>;

    roleRows.forEach((row) => {
      if (!row.school_id) return;
      if (row.role === "school_admin") {
        const firstName = row.profiles?.first_name?.trim() ?? "";
        const lastName = row.profiles?.last_name?.trim() ?? "";
        const email = row.profiles?.email?.trim() || null;
        const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
        adminProfilesBySchool.set(row.school_id, {
          name: fullName || email,
          email,
        });
        return;
      }
      const targetMap = row.role === "teacher" ? teacherIdsBySchool : studentIdsBySchool;
      const ids = targetMap.get(row.school_id) ?? new Set<string>();
      ids.add(row.user_id);
      targetMap.set(row.school_id, ids);
    });

    const schoolRows = ((data as School[]) ?? []).map((school) => {
      const settings = (school.settings ?? {}) as Record<string, unknown>;
      const liveAdmin = adminProfilesBySchool.get(school.id);
      const fallbackAdminName = typeof settings.admin_name === "string" && settings.admin_name.trim()
        ? settings.admin_name.trim()
        : null;
      const fallbackAdminEmail = typeof settings.admin_email === "string" && settings.admin_email.trim()
        ? settings.admin_email.trim()
        : null;
      const fallbackStudentCount = typeof settings.student_count === "number" ? settings.student_count : 0;
      const fallbackTeacherCount = typeof settings.teacher_count === "number" ? settings.teacher_count : 0;

      return {
        ...school,
        admin_name: liveAdmin?.name ?? fallbackAdminName,
        admin_email: liveAdmin?.email ?? fallbackAdminEmail,
        student_count: studentIdsBySchool.get(school.id)?.size ?? fallbackStudentCount,
        teacher_count: teacherIdsBySchool.get(school.id)?.size ?? fallbackTeacherCount,
      };
    });

    setSchools(schoolRows);
    if (rolesError) setError(rolesError.message);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSchools(); }, [fetchSchools]);

  const createSchool = useCallback(async (payload: {
    school_name: string;
    slug?: string;
    timezone?: string;
    plan_id: string;
    admin_email: string;
    admin_first_name?: string;
    admin_last_name?: string;
  }) => {
    const result = await callProvisionSchool(payload);
    if (result.error) return { error: result.error };
    await fetchSchools();
    return { data: result.school };
  }, [fetchSchools]);

  const updateSchool = useCallback(async (id: string, updates: Partial<Pick<School, "name" | "is_active" | "settings" | "logo_url" | "timezone">>) => {
    const { error: err } = await supabase
      .from("schools")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (err) return { error: err.message };
    await fetchSchools();
    return { error: null };
  }, [fetchSchools]);

  const activateSchool = useCallback(async (id: string) => {
    return updateSchool(id, { is_active: true });
  }, [updateSchool]);

  const deactivateSchool = useCallback(async (id: string) => {
    return updateSchool(id, { is_active: false });
  }, [updateSchool]);

  const deleteSchool = useCallback(async (id: string, hardDelete = false) => {
    const result = await callSoftDelete({ entity_type: "schools", entity_id: id, hard_delete: hardDelete });
    if (result.error) return { error: result.error };
    await fetchSchools();
    return { error: null };
  }, [fetchSchools]);

  return { schools, loading, error, fetchSchools, createSchool, updateSchool, activateSchool, deactivateSchool, deleteSchool };
}
