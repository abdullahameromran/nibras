import { useState, useEffect, useCallback } from "react";
import supabase from "@/lib/supabase";
import { useRealtimeRefresh } from "./useRealtimeRefresh";

export interface TestChoice {
  id: string;
  question_id: string;
  choice_text: string;
  is_correct: boolean;
  sort_order: number;
}

export interface TestQuestion {
  id: string;
  test_id: string;
  question_text: string;
  sort_order: number;
  test_choices?: TestChoice[];
}

export interface TestSubmission {
  id: string;
  test_id: string;
  student_id: string;
  submitted_at: string;
  score: number | null;
  graded_at: string | null;
  profiles?: { id: string; first_name: string | null; last_name: string | null; avatar_url: string | null };
  test_answers?: Array<{
    id: string;
    question_id: string;
    selected_choice_id: string | null;
    is_correct: boolean | null;
  }>;
}

export interface MonthlyTest {
  id: string;
  school_id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  title: string;
  test_date: string;
  duration_minutes: number;
  kind: "monthly" | "final";
  deleted_at: string | null;
  created_at: string;
  classes?: { id: string; name: string };
  subjects?: { id: string; name: string };
  test_questions?: TestQuestion[];
  test_submissions?: TestSubmission[];
}

export function useTests(filters: {
  schoolId?: string | null;
  classId?: string | null;
  teacherId?: string | null;
  studentId?: string | null;
  kind?: "monthly" | "final";
}) {
  const [tests, setTests] = useState<MonthlyTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTests = useCallback(async () => {
    if (!filters.schoolId && !filters.classId) return;
    setLoading(true);
    setError(null);

    let selectStr = `
      id, school_id, class_id, subject_id, teacher_id, title, test_date,
      duration_minutes, kind, deleted_at, created_at,
      classes ( id, name ),
      subjects ( id, name ),
      test_questions (
        id, question_text, sort_order,
        test_choices ( id, choice_text, is_correct, sort_order )
      )
    `;
    if (filters.studentId) {
      selectStr += `, test_submissions ( id, student_id, submitted_at, score, graded_at, test_answers(id, question_id, selected_choice_id, is_correct) )`;
    } else {
      selectStr += `, test_submissions ( id, student_id, submitted_at, score, graded_at )`;
    }

    let query = supabase
      .from("monthly_tests")
      .select(selectStr)
      .is("deleted_at", null)
      .order("test_date", { ascending: false })
      .limit(100);

    if (filters.schoolId) query = query.eq("school_id", filters.schoolId);
    if (filters.classId) query = query.eq("class_id", filters.classId);
    if (filters.teacherId) query = query.eq("teacher_id", filters.teacherId);
    if (filters.kind) query = query.eq("kind", filters.kind);

    const { data, error: err } = await query;
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setTests((data as MonthlyTest[]) ?? []);
    setLoading(false);
  }, [filters.schoolId, filters.classId, filters.teacherId, filters.studentId, filters.kind]);

  useEffect(() => { fetchTests(); }, [fetchTests]);
  useRealtimeRefresh(fetchTests, ["monthly_tests", "test_questions", "test_choices", "test_submissions", "test_answers"]);

  const createTest = useCallback(async (payload: {
    school_id: string;
    class_id: string;
    subject_id: string;
    teacher_id: string;
    title: string;
    test_date: string;
    duration_minutes?: number;
    kind?: "monthly" | "final";
    questions: Array<{
      question_text: string;
      sort_order: number;
      choices: Array<{ choice_text: string; is_correct: boolean; sort_order: number }>;
    }>;
  }) => {
    const { questions, ...testData } = payload;
    const { data: test, error: testErr } = await supabase.rpc("create_test_with_questions", {
      p_test: testData,
      p_questions: questions,
    });
    if (testErr) return { error: testErr.message, data: null };
    await fetchTests();
    return { error: null, data: test };
  }, [fetchTests]);

  const deleteTest = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from("monthly_tests")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (err) return { error: err.message };
    await fetchTests();
    return { error: null };
  }, [fetchTests]);

  const submitTest = useCallback(async (payload: {
    test_id: string;
    student_id: string;
    answers: Array<{ question_id: string; selected_choice_id: string | null }>;
  }) => {
    const { data: submission, error: subErr } = await supabase
      .from("test_submissions")
      .upsert({ test_id: payload.test_id, student_id: payload.student_id }, { onConflict: "test_id,student_id" })
      .select("id")
      .single();
    if (subErr) return { error: subErr.message };

    if (payload.answers.length > 0) {
      const answerRows = payload.answers.map((answer) => ({
        submission_id: submission.id,
        ...answer,
      }));
      const { error: answerError } = await supabase
        .from("test_answers")
        .upsert(answerRows, { onConflict: "submission_id,question_id" });
      if (answerError) return { error: answerError.message };
    }
    await fetchTests();
    return { error: null };
  }, [fetchTests]);

  return { tests, loading, error, fetchTests, createTest, deleteTest, submitTest };
}
