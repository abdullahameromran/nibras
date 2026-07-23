import { useState, useEffect, useCallback } from "react";
import supabase from "@/lib/supabase";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface AttendanceRecord {
  id: string;
  school_id: string;
  lesson_id: string;
  student_id: string;
  status: AttendanceStatus;
  recorded_by: string;
  recorded_at: string;
  profiles?: { id: string; first_name: string | null; last_name: string | null };
  lessons?: { id: string; title: string; lesson_date: string };
}

export function useAttendance(filters: {
  schoolId?: string | null;
  lessonId?: string | null;
  studentId?: string | null;
  classId?: string | null;
}) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendance = useCallback(async () => {
    if (!filters.schoolId && !filters.lessonId && !filters.studentId) return;
    setLoading(true);
    setError(null);
    let query = supabase
      .from("attendance_records")
      .select(`
        *,
        profiles ( id, first_name, last_name ),
        lessons ( id, title, lesson_date )
      `)
      .order("recorded_at", { ascending: false });

    if (filters.schoolId) query = query.eq("school_id", filters.schoolId);
    if (filters.lessonId) query = query.eq("lesson_id", filters.lessonId);
    if (filters.studentId) query = query.eq("student_id", filters.studentId);

    const { data, error: err } = await query;
    if (err) setError(err.message);
    else setRecords((data as AttendanceRecord[]) ?? []);
    setLoading(false);
  }, [filters.schoolId, filters.lessonId, filters.studentId]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  const upsertAttendance = useCallback(async (record: {
    school_id: string;
    lesson_id: string;
    student_id: string;
    status: AttendanceStatus;
    recorded_by: string;
  }) => {
    const { error: err } = await supabase
      .from("attendance_records")
      .upsert(record, { onConflict: "lesson_id,student_id" });
    if (err) return { error: err.message };
    await fetchAttendance();
    return { error: null };
  }, [fetchAttendance]);

  const bulkUpsertAttendance = useCallback(async (records: Array<{
    school_id: string;
    lesson_id: string;
    student_id: string;
    status: AttendanceStatus;
    recorded_by: string;
  }>) => {
    if (records.length === 0) return { error: null };
    const { error: err } = await supabase
      .from("attendance_records")
      .upsert(records, { onConflict: "lesson_id,student_id" });
    if (err) return { error: err.message };
    await fetchAttendance();
    return { error: null };
  }, [fetchAttendance]);

  return { records, loading, error, fetchAttendance, upsertAttendance, bulkUpsertAttendance };
}
