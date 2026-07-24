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

type StudentProfileRow = Pick<
  Student,
  "id" | "email" | "first_name" | "last_name" | "avatar_url" | "phone" | "is_active"
>;

type EnrollmentRow = {
  id: string;
  student_id: string;
  class_id: string;
  status: string;
  classes: { name: string } | Array<{ name: string }> | null;
};

type StudentRoleRow = {
  id: string;
  user_id: string;
  school_id: string;
};

function normalizeClassRow(
  schoolClass: EnrollmentRow["classes"],
) {
  return Array.isArray(schoolClass) ? schoolClass[0] ?? null : schoolClass ?? null;
}

function buildStudentRecord(args: {
  profile: StudentProfileRow | null;
  fallbackId: string;
  enrollmentId?: string;
  classId?: string;
  className?: string;
  enrollmentStatus?: string;
}) {
  return {
    id: args.profile?.id ?? args.fallbackId,
    email: args.profile?.email ?? "",
    first_name: args.profile?.first_name ?? null,
    last_name: args.profile?.last_name ?? null,
    avatar_url: args.profile?.avatar_url ?? null,
    phone: args.profile?.phone ?? null,
    is_active: args.profile?.is_active ?? true,
    enrollment_id: args.enrollmentId,
    class_id: args.classId,
    class_name: args.className,
    enrollment_status: args.enrollmentStatus,
  } satisfies Student;
}

export function useStudents(schoolId: string | null, classId?: string | null) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    if (!schoolId) {
      setStudents([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const fetchProfilesByIds = async (ids: string[]) => {
      if (ids.length === 0) {
        return { error: null, map: new Map<string, StudentProfileRow>() };
      }

      const { data, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, avatar_url, phone, is_active")
        .in("id", ids);

      if (profilesError) {
        return { error: profilesError.message, map: new Map<string, StudentProfileRow>() };
      }

      const map = new Map<string, StudentProfileRow>();
      ((data as StudentProfileRow[] | null) ?? []).forEach((profile) => {
        map.set(profile.id, profile);
      });
      return { error: null, map };
    };

    const fetchEnrollmentRows = async (targetClassId?: string | null) => {
      let query = supabase
        .from("class_enrollments")
        .select(`
          id,
          student_id,
          class_id,
          status,
          classes ( name )
        `)
        .eq("school_id", schoolId)
        .eq("status", "active");

      if (targetClassId) {
        query = query.eq("class_id", targetClassId);
      }

      const { data, error: enrollmentsError } = await query.order("enrolled_at", { ascending: false });

      return {
        error: enrollmentsError?.message ?? null,
        rows: ((data as EnrollmentRow[] | null) ?? []),
      };
    };

    if (classId) {
      const { error: enrollmentsError, rows } = await fetchEnrollmentRows(classId);
      if (enrollmentsError) {
        setError(enrollmentsError);
        setLoading(false);
        return;
      }

      const profileResult = await fetchProfilesByIds(
        Array.from(new Set(rows.map((row) => row.student_id).filter(Boolean))),
      );
      if (profileResult.error) {
        setError(profileResult.error);
        setLoading(false);
        return;
      }

      const profilesById = profileResult.map;
      const nextStudents = rows
        .map((row) => {
          const schoolClass = normalizeClassRow(row.classes);
          return buildStudentRecord({
            profile: profilesById.get(row.student_id) ?? null,
            fallbackId: row.student_id,
            enrollmentId: row.id,
            classId: row.class_id,
            className: schoolClass?.name ?? undefined,
            enrollmentStatus: row.status,
          });
        })
        .filter((student) => Boolean(student.id));
      setStudents(nextStudents);
    } else {
      // School admins can read student roles directly. Teachers cannot, so we also
      // collect visible students from class_enrollments, which respects teacher RLS.
      const { data: roleData, error: roleError } = await supabase
        .from("user_school_roles")
        .select(`
          id,
          user_id,
          school_id
        `)
        .eq("school_id", schoolId)
        .eq("role", "student")
        .eq("is_active", true);

      const roleRows = ((roleData as StudentRoleRow[] | null) ?? []);
      const { error: enrollmentsError, rows: enrollmentRows } = await fetchEnrollmentRows();

      if (roleError && enrollmentsError) {
        setError(roleError.message || enrollmentsError);
        setLoading(false);
        return;
      }

      const candidateIds = Array.from(
        new Set([
          ...roleRows.map((row) => row.user_id),
          ...enrollmentRows.map((row) => row.student_id),
        ].filter(Boolean)),
      );

      const profileResult = await fetchProfilesByIds(candidateIds);
      if (profileResult.error) {
        setError(profileResult.error);
        setLoading(false);
        return;
      }

      const profilesById = profileResult.map;
      const firstEnrollmentByStudentId = new Map<string, EnrollmentRow>();
      enrollmentRows.forEach((row) => {
        if (!firstEnrollmentByStudentId.has(row.student_id)) {
          firstEnrollmentByStudentId.set(row.student_id, row);
        }
      });

      const nextStudents = candidateIds
        .map((studentId) => {
          const enrollment = firstEnrollmentByStudentId.get(studentId);
          const schoolClass = normalizeClassRow(enrollment?.classes ?? null);
          return buildStudentRecord({
            profile: profilesById.get(studentId) ?? null,
            fallbackId: studentId,
            enrollmentId: enrollment?.id,
            classId: enrollment?.class_id,
            className: schoolClass?.name ?? undefined,
            enrollmentStatus: enrollment?.status,
          });
        })
        .filter((student) => Boolean(student.id));
      setStudents(nextStudents);
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
