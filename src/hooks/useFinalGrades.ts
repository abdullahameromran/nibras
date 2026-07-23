import { useState, useEffect, useCallback } from "react";
import supabase from "@/lib/supabase";

export type GradeStatus = "draft" | "submitted" | "approved";

export interface FinalGrade {
  id: string;
  school_id: string;
  academic_year_id: string;
  class_id: string;
  subject_id: string;
  student_id: string;
  grade_value: number | null;
  grade_letter: string | null;
  remarks: string | null;
  status: GradeStatus;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  deleted_at: string | null;
  subjects?: { id: string; name: string };
  classes?: { id: string; name: string };
  profiles?: { id: string; first_name: string | null; last_name: string | null };
}

export function useFinalGrades(filters: {
  schoolId?: string | null;
  academicYearId?: string | null;
  classId?: string | null;
  studentId?: string | null;
  subjectId?: string | null;
}) {
  const [grades, setGrades] = useState<FinalGrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGrades = useCallback(async () => {
    if (!filters.schoolId && !filters.studentId) return;
    setLoading(true);
    setError(null);
    let query = supabase
      .from("final_grades")
      .select(`
        *,
        subjects ( id, name ),
        classes ( id, name ),
        profiles ( id, first_name, last_name )
      `)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (filters.schoolId) query = query.eq("school_id", filters.schoolId);
    if (filters.academicYearId) query = query.eq("academic_year_id", filters.academicYearId);
    if (filters.classId) query = query.eq("class_id", filters.classId);
    if (filters.studentId) query = query.eq("student_id", filters.studentId);
    if (filters.subjectId) query = query.eq("subject_id", filters.subjectId);

    const { data, error: err } = await query;
    if (err) setError(err.message);
    else setGrades((data as FinalGrade[]) ?? []);
    setLoading(false);
  }, [filters.schoolId, filters.academicYearId, filters.classId, filters.studentId, filters.subjectId]);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  const upsertGrade = useCallback(async (grade: Partial<FinalGrade> & Pick<FinalGrade, "school_id" | "academic_year_id" | "class_id" | "subject_id" | "student_id">) => {
    const { error: err } = await supabase
      .from("final_grades")
      .upsert(grade, { onConflict: "academic_year_id,class_id,subject_id,student_id" });
    if (err) return { error: err.message };
    await fetchGrades();
    return { error: null };
  }, [fetchGrades]);

  const submitGrades = useCallback(async (ids: string[], submittedBy: string) => {
    const { error: err } = await supabase
      .from("final_grades")
      .update({ status: "submitted", submitted_by: submittedBy, submitted_at: new Date().toISOString() })
      .in("id", ids)
      .eq("status", "draft");
    if (err) return { error: err.message };
    await fetchGrades();
    return { error: null };
  }, [fetchGrades]);

  const approveGrades = useCallback(async (ids: string[], approvedBy: string) => {
    const { error: err } = await supabase
      .from("final_grades")
      .update({ status: "approved", approved_by: approvedBy, approved_at: new Date().toISOString() })
      .in("id", ids)
      .eq("status", "submitted");
    if (err) return { error: err.message };
    await fetchGrades();
    return { error: null };
  }, [fetchGrades]);

  return { grades, loading, error, fetchGrades, upsertGrade, submitGrades, approveGrades };
}
