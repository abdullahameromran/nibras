import { useState, useEffect, useCallback } from "react";
import supabase from "@/lib/supabase";
import { useRealtimeRefresh } from "./useRealtimeRefresh";

export interface HomeworkChoice {
  id: string;
  question_id: string;
  choice_text: string;
  is_correct: boolean;
  sort_order: number;
}

export interface HomeworkQuestion {
  id: string;
  homework_id: string;
  question_text: string;
  sort_order: number;
  homework_choices?: HomeworkChoice[];
}

export interface HomeworkSubmission {
  id: string;
  homework_id: string;
  student_id: string;
  submitted_at: string;
  score: number | null;
  graded_at: string | null;
  profiles?: { id: string; first_name: string | null; last_name: string | null; avatar_url: string | null };
  homework_answers?: Array<{
    id: string;
    question_id: string;
    selected_choice_id: string | null;
    is_correct: boolean | null;
  }>;
}

export interface Homework {
  id: string;
  school_id: string;
  lesson_id: string;
  title: string;
  due_date: string;
  deleted_at: string | null;
  created_at: string;
  lessons?: { id: string; title: string; class_id: string; subject_id: string; subjects?: { id: string; name: string } | null };
  homework_questions?: HomeworkQuestion[];
  homework_submissions?: HomeworkSubmission[];
}

export function useHomework(filters: {
  schoolId?: string | null;
  lessonId?: string | null;
  classId?: string | null;
  teacherId?: string | null;
  studentId?: string | null; // for student view
}) {
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHomework = useCallback(async () => {
    if (!filters.schoolId && !filters.lessonId && !filters.classId) return;
    setLoading(true);
    setError(null);

    const lessonRelation = filters.classId ? "lessons!inner" : "lessons";
    let selectStr = `
      id, school_id, lesson_id, title, due_date, deleted_at, created_at,
      ${lessonRelation} ( id, title, class_id, subject_id, subjects ( id, name ) ),
      homework_questions (
        id, question_text, sort_order,
        homework_choices ( id, choice_text, is_correct, sort_order )
      )
    `;
    {
      const profileEmbed = "";
      const answerEmbed = filters.studentId
        ? ", homework_answers(id, question_id, selected_choice_id, is_correct)"
        : "";
      selectStr += `, homework_submissions ( id, student_id, submitted_at, score, graded_at${profileEmbed}${answerEmbed} )`;
    }

    let query = supabase
      .from("homework")
      .select(selectStr)
      .is("deleted_at", null)
      .order("due_date", { ascending: false })
      .limit(100);

    if (filters.schoolId) query = query.eq("school_id", filters.schoolId);
    if (filters.lessonId) query = query.eq("lesson_id", filters.lessonId);
    if (filters.classId) query = query.eq("lessons.class_id", filters.classId);

    const { data, error: err } = await query;
    if (err) { setError(err.message); setLoading(false); return; }

    setHomework((data as Homework[]) ?? []);
    setLoading(false);
  }, [filters.schoolId, filters.lessonId, filters.classId, filters.teacherId, filters.studentId]);

  useEffect(() => { fetchHomework(); }, [fetchHomework]);
  useRealtimeRefresh(fetchHomework, ["homework", "homework_questions", "homework_choices", "homework_submissions", "homework_answers"]);

  const createHomework = useCallback(async (payload: {
    school_id: string;
    lesson_id: string;
    title: string;
    due_date: string;
    questions: Array<{ question_text: string; sort_order: number; choices: Array<{ choice_text: string; is_correct: boolean; sort_order: number }> }>;
  }) => {
    const { questions, ...hwData } = payload;
    const { data: hw, error: hwErr } = await supabase.rpc("create_homework_with_questions", {
      p_homework: hwData,
      p_questions: questions,
    });
    if (hwErr) return { error: hwErr.message, data: null };
    await fetchHomework();
    return { error: null, data: hw };
  }, [fetchHomework]);

  const deleteHomework = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from("homework")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (err) return { error: err.message };
    await fetchHomework();
    return { error: null };
  }, [fetchHomework]);

  const updateHomework = useCallback(async (id: string, updates: { title?: string; due_date?: string }) => {
    const { error: err } = await supabase.from("homework").update(updates).eq("id", id);
    if (err) return { error: err.message };
    await fetchHomework();
    return { error: null };
  }, [fetchHomework]);

  const submitHomework = useCallback(async (payload: {
    homework_id: string;
    student_id: string;
    answers: Array<{ question_id: string; selected_choice_id: string | null }>;
  }) => {
    const { data: submission, error: subErr } = await supabase
      .from("homework_submissions")
      .upsert({ homework_id: payload.homework_id, student_id: payload.student_id }, { onConflict: "homework_id,student_id" })
      .select("id")
      .single();
    if (subErr) return { error: subErr.message };

    if (payload.answers.length > 0) {
      const { error: answersError } = await supabase.from("homework_answers").upsert(
        payload.answers.map(a => ({ submission_id: submission.id, ...a })),
        { onConflict: "submission_id,question_id" }
      );
      if (answersError) return { error: answersError.message };
    }
    await fetchHomework();
    return { error: null };
  }, [fetchHomework]);

  return { homework, loading, error, fetchHomework, createHomework, updateHomework, deleteHomework, submitHomework };
}
