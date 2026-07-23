import { useState, useEffect, useCallback } from "react";
import supabase from "@/lib/supabase";

export interface LessonAttachment {
  id: string;
  lesson_id: string;
  file_name: string;
  file_url: string;
  file_kind: string;
  uploaded_at: string;
}

export interface Lesson {
  id: string;
  school_id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  lesson_date: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  subjects?: { id: string; name: string };
  classes?: { id: string; name: string };
  profiles?: { id: string; first_name: string | null; last_name: string | null };
  lesson_attachments?: LessonAttachment[];
  // For student view: progress
  student_lesson_progress?: Array<{ completed_at: string; last_viewed_at: string }>;
}

export function useLessons(filters: {
  schoolId?: string | null;
  classId?: string | null;
  teacherId?: string | null;
  studentId?: string | null; // to fetch with progress
}) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLessons = useCallback(async () => {
    if (!filters.schoolId && !filters.teacherId && !filters.classId) return;
    setLoading(true);
    setError(null);
    let selectStr = `
      *,
      subjects ( id, name ),
      classes ( id, name ),
      profiles ( id, first_name, last_name ),
      lesson_attachments ( id, file_name, file_url, file_kind, uploaded_at )
    `;
    if (filters.studentId) {
      selectStr += `, student_lesson_progress ( completed_at, last_viewed_at )`;
    }
    let query = supabase
      .from("lessons")
      .select(selectStr)
      .is("deleted_at", null)
      .order("lesson_date", { ascending: false });

    if (filters.schoolId) query = query.eq("school_id", filters.schoolId);
    if (filters.classId) query = query.eq("class_id", filters.classId);
    if (filters.teacherId) query = query.eq("teacher_id", filters.teacherId);

    const { data, error: err } = await query;
    if (err) setError(err.message);
    else setLessons((data as Lesson[]) ?? []);
    setLoading(false);
  }, [filters.schoolId, filters.classId, filters.teacherId, filters.studentId]);

  useEffect(() => { fetchLessons(); }, [fetchLessons]);

  const createLesson = useCallback(async (lesson: {
    school_id: string;
    class_id: string;
    subject_id: string;
    teacher_id: string;
    title: string;
    description?: string;
    video_url?: string;
    lesson_date: string;
  }) => {
    const { data, error: err } = await supabase
      .from("lessons")
      .insert(lesson)
      .select()
      .single();
    if (err) return { error: err.message, data: null };
    await fetchLessons();
    return { error: null, data };
  }, [fetchLessons]);

  const updateLesson = useCallback(async (id: string, updates: Partial<Lesson>) => {
    const { error: err } = await supabase
      .from("lessons")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (err) return { error: err.message };
    await fetchLessons();
    return { error: null };
  }, [fetchLessons]);

  const deleteLesson = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from("lessons")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (err) return { error: err.message };
    await fetchLessons();
    return { error: null };
  }, [fetchLessons]);

  const addAttachment = useCallback(async (lessonId: string, attachment: {
    file_name: string;
    file_url: string;
    file_kind: string;
  }) => {
    const { error: err } = await supabase
      .from("lesson_attachments")
      .insert({ lesson_id: lessonId, ...attachment });
    if (err) return { error: err.message };
    await fetchLessons();
    return { error: null };
  }, [fetchLessons]);

  const markComplete = useCallback(async (lessonId: string, studentId: string, schoolId: string) => {
    const { error: err } = await supabase
      .from("student_lesson_progress")
      .upsert({
        school_id: schoolId,
        lesson_id: lessonId,
        student_id: studentId,
        completed_at: new Date().toISOString(),
        last_viewed_at: new Date().toISOString(),
      }, { onConflict: "lesson_id,student_id" });
    return { error: err?.message ?? null };
  }, []);

  return { lessons, loading, error, fetchLessons, createLesson, updateLesson, deleteLesson, addAttachment, markComplete };
}
