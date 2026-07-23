import { useCallback, useEffect, useState } from "react";
import supabase from "@/lib/supabase";

export interface SchoolRecord {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  timezone: string;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SchoolSubscriptionRecord {
  id: string;
  school_id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
  external_ref: string | null;
  created_at: string;
  updated_at: string;
  subscription_plans?: {
    id: string;
    name: string;
    max_students: number | null;
    max_teachers: number | null;
    price_cents: number;
    billing_cycle: string;
    features: unknown;
    is_active: boolean;
  } | null;
}

export function useSchoolDetails(schoolId: string | null) {
  const [school, setSchool] = useState<SchoolRecord | null>(null);
  const [subscription, setSubscription] = useState<SchoolSubscriptionRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchoolDetails = useCallback(async () => {
    if (!schoolId) {
      setSchool(null);
      setSubscription(null);
      return;
    }

    setLoading(true);
    setError(null);

    const [{ data: schoolData, error: schoolError }, { data: subscriptionData, error: subscriptionError }] = await Promise.all([
      supabase
        .from("schools")
        .select("*")
        .eq("id", schoolId)
        .maybeSingle(),
      supabase
        .from("school_subscriptions")
        .select(`
          *,
          subscription_plans (
            id,
            name,
            max_students,
            max_teachers,
            price_cents,
            billing_cycle,
            features,
            is_active
          )
        `)
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (schoolError) {
      setError(schoolError.message);
      setSchool(null);
    } else {
      setSchool((schoolData as SchoolRecord | null) ?? null);
    }

    if (subscriptionError) {
      setError((current) => current ?? subscriptionError.message);
      setSubscription(null);
    } else {
      setSubscription((subscriptionData as SchoolSubscriptionRecord | null) ?? null);
    }

    setLoading(false);
  }, [schoolId]);

  useEffect(() => {
    fetchSchoolDetails();
  }, [fetchSchoolDetails]);

  const updateSchool = useCallback(async (updates: {
    name?: string;
    timezone?: string;
    settings?: Record<string, unknown>;
    logo_url?: string | null;
  }) => {
    if (!schoolId) return { error: "No school selected" };

    const nextSettings = updates.settings
      ? { ...(school?.settings ?? {}), ...updates.settings }
      : school?.settings ?? {};

    const rpcArgs: Record<string, unknown> = {
      p_school_id: schoolId,
      p_settings: nextSettings,
    };

    if (typeof updates.name === "string") rpcArgs.p_name = updates.name;
    if (typeof updates.timezone === "string") rpcArgs.p_timezone = updates.timezone;
    if ("logo_url" in updates) rpcArgs.p_logo_url = updates.logo_url;

    const { error: rpcError } = await supabase.rpc("update_my_school_details", rpcArgs);

    if (rpcError) {
      const rpcUnavailable =
        rpcError.message.includes("Could not find the function public.update_my_school_details") ||
        rpcError.message.includes("Could not find the function update_my_school_details") ||
        rpcError.message.includes("PGRST202");

      if (!rpcUnavailable) {
        return { error: rpcError.message };
      }

      const payload: Record<string, unknown> = {
        settings: nextSettings,
      };

      if (typeof updates.name === "string") payload.name = updates.name;
      if (typeof updates.timezone === "string") payload.timezone = updates.timezone;
      if ("logo_url" in updates) payload.logo_url = updates.logo_url;

      const { error: updateError } = await supabase
        .from("schools")
        .update(payload)
        .eq("id", schoolId);

      if (updateError) {
        return {
          error:
            updateError.message.includes("row-level security")
              ? "School settings update is blocked by Supabase policy. Apply the latest migration, then try again."
              : updateError.message,
        };
      }
    }

    await fetchSchoolDetails();
    return { error: null };
  }, [fetchSchoolDetails, school?.settings, schoolId]);

  return { school, subscription, loading, error, fetchSchoolDetails, updateSchool };
}

export interface SchoolTeacherAssignment {
  id: string;
  school_id: string;
  class_id: string | null;
  teacher_id: string;
  subject_id: string;
  classes?: {
    id: string;
    name: string;
    grade_level_id: string;
    grade_levels?: { id: string; name: string; sort_order: number } | null;
  } | null;
  subjects?: { id: string; name: string } | null;
  teacher_profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useSchoolTeacherAssignments(schoolId: string | null) {
  const [assignments, setAssignments] = useState<SchoolTeacherAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    if (!schoolId) {
      setAssignments([]);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("teacher_subject_assignments")
      .select(`
        id,
        school_id,
        class_id,
        teacher_id,
        subject_id,
        classes (
          id,
          name,
          grade_level_id,
          grade_levels ( id, name, sort_order )
        ),
        subjects ( id, name ),
        teacher_profile:profiles!teacher_subject_assignments_teacher_id_fkey (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq("school_id", schoolId);

    if (fetchError) {
      setError(fetchError.message);
      setAssignments([]);
    } else {
      setAssignments((data as SchoolTeacherAssignment[] | null) ?? []);
    }

    setLoading(false);
  }, [schoolId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const replaceClassAssignments = useCallback(async (classId: string, items: Array<{ subject_id: string; teacher_id: string }>) => {
    if (!schoolId) return { error: "No school selected" };

    const { error: deleteError } = await supabase
      .from("teacher_subject_assignments")
      .delete()
      .eq("school_id", schoolId)
      .eq("class_id", classId);

    if (deleteError) return { error: deleteError.message };

    if (items.length > 0) {
      const { error: insertError } = await supabase
        .from("teacher_subject_assignments")
        .insert(items.map((item) => ({
          school_id: schoolId,
          class_id: classId,
          subject_id: item.subject_id,
          teacher_id: item.teacher_id,
        })));

      if (insertError) return { error: insertError.message };
    }

    await fetchAssignments();
    return { error: null };
  }, [fetchAssignments, schoolId]);

  return { assignments, loading, error, fetchAssignments, replaceClassAssignments };
}

export interface SchoolParentLink {
  id: string;
  school_id: string;
  parent_id: string;
  student_id: string;
  relationship: string;
  parent_profile?: {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useSchoolParentLinks(schoolId: string | null) {
  const [links, setLinks] = useState<SchoolParentLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    if (!schoolId) {
      setLinks([]);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("parent_student_links")
      .select(`
        id,
        school_id,
        parent_id,
        student_id,
        relationship,
        parent_profile:profiles!parent_student_links_parent_id_fkey (
          id,
          email,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq("school_id", schoolId);

    if (fetchError) {
      setError(fetchError.message);
      setLinks([]);
    } else {
      setLinks((data as SchoolParentLink[] | null) ?? []);
    }

    setLoading(false);
  }, [schoolId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  return { links, loading, error, fetchLinks };
}

export interface SchoolEnrollment {
  id: string;
  school_id: string;
  class_id: string;
  student_id: string;
  status: string;
  enrolled_at: string;
  classes?: {
    id: string;
    name: string;
    academic_year_id: string;
    grade_level_id: string;
    academic_years?: { id: string; name: string; is_current: boolean } | null;
    grade_levels?: { id: string; name: string; sort_order: number } | null;
  } | null;
  student_profile?: {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    phone: string | null;
    is_active: boolean;
  } | null;
}

export function useSchoolEnrollments(schoolId: string | null) {
  const [enrollments, setEnrollments] = useState<SchoolEnrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrollments = useCallback(async () => {
    if (!schoolId) {
      setEnrollments([]);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("class_enrollments")
      .select(`
        id,
        school_id,
        class_id,
        student_id,
        status,
        enrolled_at,
        classes (
          id,
          name,
          academic_year_id,
          grade_level_id,
          academic_years ( id, name, is_current ),
          grade_levels ( id, name, sort_order )
        ),
        student_profile:profiles!class_enrollments_student_id_fkey (
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
      .eq("status", "active")
      .order("enrolled_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setEnrollments([]);
    } else {
      setEnrollments((data as SchoolEnrollment[] | null) ?? []);
    }

    setLoading(false);
  }, [schoolId]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  return { enrollments, loading, error, fetchEnrollments };
}
