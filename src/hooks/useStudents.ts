import { useState, useEffect, useCallback } from "react";
import supabase from "@/lib/supabase";
import { callInviteUser } from "@/lib/storage";

export interface Student {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  // from class_enrollments join
  enrollment_id?: string;
  class_id?: string;
  class_name?: string;
  enrollment_status?: string;
}

export function useStudents(schoolId: string | null, classId?: string | null) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);

    // If classId provided, fetch via class_enrollments; otherwise fetch all students in school
    if (classId) {
      const { data, error: err } = await supabase
        .from("class_enrollments")
        .select(`
          id,
          class_id,
          status,
          classes ( name ),
          profiles ( id, email, first_name, last_name, avatar_url, phone, is_active )
        `)
        .eq("school_id", schoolId)
        .eq("class_id", classId)
        .eq("status", "active");
      if (err) { setError(err.message); setLoading(false); return; }
      const rows = (data ?? []) as Array<{
        id: string; class_id: string; status: string;
        classes: { name: string } | null;
        profiles: Student;
      }>;
      setStudents(rows.map(r => ({
        ...r.profiles,
        enrollment_id: r.id,
        class_id: r.class_id,
        class_name: r.classes?.name ?? undefined,
        enrollment_status: r.status,
      })));
    } else {
      // All students in school via user_school_roles
      const { data, error: err } = await supabase
        .from("user_school_roles")
        .select(`
          id,
          school_id,
          profiles ( id, email, first_name, last_name, avatar_url, phone, is_active )
        `)
        .eq("school_id", schoolId)
        .eq("role", "student")
        .eq("is_active", true);
      if (err) { setError(err.message); setLoading(false); return; }
      const rows = (data ?? []) as Array<{
        id: string; school_id: string;
        profiles: Student;
      }>;
      setStudents(rows.map(r => ({ ...r.profiles, enrollment_id: r.id })));
    }
    setLoading(false);
  }, [schoolId, classId]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const inviteStudent = useCallback(async (payload: {
    email: string;
    first_name?: string;
    last_name?: string;
    class_id?: string;
  }) => {
    if (!schoolId) return { error: "No school selected" };
    const result = await callInviteUser({
      school_id: schoolId,
      email: payload.email,
      role: "student",
      first_name: payload.first_name,
      last_name: payload.last_name,
    });
    if (result.error) return { error: result.error };
    // If class_id provided, enroll in class
    if (payload.class_id && result.user_id) {
      const { error: enrollError } = await supabase.from("class_enrollments").insert({
        school_id: schoolId,
        class_id: payload.class_id,
        student_id: result.user_id,
      });
      if (enrollError) {
        await fetchStudents();
        return { error: `Student account created, but class enrollment failed: ${enrollError.message}` };
      }
    }
    await fetchStudents();
    return { error: null };
  }, [schoolId, fetchStudents]);

  const enrollStudent = useCallback(async (studentId: string, newClassId: string) => {
    const { error: err } = await supabase
      .from("class_enrollments")
      .upsert({
        school_id: schoolId,
        class_id: newClassId,
        student_id: studentId,
        status: "active",
      }, { onConflict: "class_id,student_id" });
    if (err) return { error: err.message };
    await fetchStudents();
    return { error: null };
  }, [schoolId, fetchStudents]);

  return { students, loading, error, fetchStudents, inviteStudent, enrollStudent };
}
