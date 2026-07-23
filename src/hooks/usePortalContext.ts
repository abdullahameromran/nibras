import { useCallback, useEffect, useState } from "react";
import supabase from "@/lib/supabase";

export interface PortalClassContext {
  id: string;
  name: string;
  academic_year_id: string;
  grade_level_id: string;
  academic_years?: { id: string; name: string; is_current: boolean } | null;
  grade_levels?: { id: string; name: string; sort_order: number } | null;
}

export interface StudentEnrollment {
  id: string;
  school_id: string;
  class_id: string;
  student_id: string;
  status: string;
  enrolled_at: string;
  classes?: PortalClassContext | null;
}

export interface PortalTeacherAssignment {
  id: string;
  school_id: string;
  class_id: string | null;
  teacher_id: string;
  subject_id: string;
  subjects?: { id: string; name: string } | null;
  teacher_profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface ParentChild {
  link_id: string;
  school_id: string;
  student_id: string;
  relationship: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  class_id: string | null;
  class_name: string | null;
  academic_year_id: string | null;
  academic_year_name: string | null;
  grade_level_id: string | null;
  grade_level_name: string | null;
}

export function useStudentEnrollment(schoolId: string | null, studentId: string | null) {
  const [enrollment, setEnrollment] = useState<StudentEnrollment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrollment = useCallback(async () => {
    if (!studentId) {
      setEnrollment(null);
      return;
    }

    setLoading(true);
    setError(null);

    let query = supabase
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
        )
      `)
      .eq("student_id", studentId)
      .eq("status", "active")
      .order("enrolled_at", { ascending: false })
      .limit(1);

    if (schoolId) {
      query = query.eq("school_id", schoolId);
    }

    const { data, error: err } = await query.maybeSingle();
    if (err) {
      setError(err.message);
      setEnrollment(null);
    } else {
      setEnrollment((data as StudentEnrollment | null) ?? null);
    }

    setLoading(false);
  }, [schoolId, studentId]);

  useEffect(() => {
    fetchEnrollment();
  }, [fetchEnrollment]);

  return { enrollment, loading, error, fetchEnrollment };
}

export function useClassTeacherAssignments(schoolId: string | null, classId: string | null) {
  const [assignments, setAssignments] = useState<PortalTeacherAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    if (!schoolId || !classId) {
      setAssignments([]);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("teacher_subject_assignments")
      .select(`
        id,
        school_id,
        class_id,
        teacher_id,
        subject_id,
        subjects ( id, name ),
        teacher_profile:profiles!teacher_subject_assignments_teacher_id_fkey (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq("school_id", schoolId)
      .or(`class_id.eq.${classId},class_id.is.null`);

    if (err) {
      setError(err.message);
      setAssignments([]);
    } else {
      const rows = ((data as PortalTeacherAssignment[] | null) ?? []).slice();
      rows.sort((left, right) => {
        const leftName = left.subjects?.name ?? "";
        const rightName = right.subjects?.name ?? "";
        return leftName.localeCompare(rightName);
      });
      setAssignments(rows);
    }

    setLoading(false);
  }, [classId, schoolId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  return { assignments, loading, error, fetchAssignments };
}

export function useParentChildren(parentId: string | null, schoolId: string | null) {
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = useCallback(async () => {
    if (!parentId) {
      setChildren([]);
      return;
    }

    setLoading(true);
    setError(null);

    let linksQuery = supabase
      .from("parent_student_links")
      .select(`
        id,
        school_id,
        student_id,
        relationship,
        student_profile:profiles!parent_student_links_student_id_fkey (
          id,
          email,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq("parent_id", parentId);

    if (schoolId) {
      linksQuery = linksQuery.eq("school_id", schoolId);
    }

    const { data: linksData, error: linksError } = await linksQuery;

    if (linksError) {
      setError(linksError.message);
      setChildren([]);
      setLoading(false);
      return;
    }

    const links = ((linksData as Array<{
      id: string;
      school_id: string;
      student_id: string;
      relationship: string;
      student_profile?: {
        id: string;
        email: string | null;
        first_name: string | null;
        last_name: string | null;
        avatar_url: string | null;
      } | null;
    }> | null) ?? []);

    if (links.length === 0) {
      setChildren([]);
      setLoading(false);
      return;
    }

    const studentIds = links.map(link => link.student_id);
    const { data: enrollmentsData, error: enrollmentsError } = await supabase
      .from("class_enrollments")
      .select(`
        student_id,
        class_id,
        status,
        enrolled_at,
        classes (
          id,
          name,
          academic_year_id,
          grade_level_id,
          academic_years ( id, name, is_current ),
          grade_levels ( id, name, sort_order )
        )
      `)
      .in("student_id", studentIds)
      .eq("status", "active")
      .order("enrolled_at", { ascending: false });

    if (enrollmentsError) {
      setError(enrollmentsError.message);
      setChildren([]);
      setLoading(false);
      return;
    }

    const enrollments = ((enrollmentsData as Array<{
      student_id: string;
      class_id: string;
      status: string;
      enrolled_at: string;
      classes?: PortalClassContext | null;
    }> | null) ?? []);

    const latestEnrollmentByStudent = new Map<string, {
      student_id: string;
      class_id: string;
      status: string;
      enrolled_at: string;
      classes?: PortalClassContext | null;
    }>();

    for (const row of enrollments) {
      if (!latestEnrollmentByStudent.has(row.student_id)) {
        latestEnrollmentByStudent.set(row.student_id, row);
      }
    }

    setChildren(
      links.map(link => {
        const enrollment = latestEnrollmentByStudent.get(link.student_id);
        return {
          link_id: link.id,
          school_id: link.school_id,
          student_id: link.student_id,
          relationship: link.relationship,
          first_name: link.student_profile?.first_name ?? null,
          last_name: link.student_profile?.last_name ?? null,
          email: link.student_profile?.email ?? null,
          avatar_url: link.student_profile?.avatar_url ?? null,
          class_id: enrollment?.class_id ?? null,
          class_name: enrollment?.classes?.name ?? null,
          academic_year_id: enrollment?.classes?.academic_year_id ?? null,
          academic_year_name: enrollment?.classes?.academic_years?.name ?? null,
          grade_level_id: enrollment?.classes?.grade_level_id ?? null,
          grade_level_name: enrollment?.classes?.grade_levels?.name ?? null,
        };
      })
    );

    setLoading(false);
  }, [parentId, schoolId]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  return { children, loading, error, fetchChildren };
}
