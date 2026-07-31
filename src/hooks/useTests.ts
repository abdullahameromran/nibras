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

  const computeTestScore = useCallback((test: MonthlyTest, answers: Array<{ question_id: string; selected_choice_id: string | null }>) => {
    const questions = test.test_questions ?? [];
    if (questions.length === 0) return null;

    const correctChoiceByQuestionId = new Map<string, string | null>();
    questions.forEach((question) => {
      const correctChoice = (question.test_choices ?? []).find((choice) => choice.is_correct);
      correctChoiceByQuestionId.set(question.id, correctChoice?.id ?? null);
    });

    let correctCount = 0;
    questions.forEach((question) => {
      const selectedChoiceId = answers.find((answer) => answer.question_id === question.id)?.selected_choice_id ?? null;
      const correctChoiceId = correctChoiceByQuestionId.get(question.id) ?? null;
      if (selectedChoiceId && correctChoiceId && selectedChoiceId === correctChoiceId) {
        correctCount += 1;
      }
    });

    return Math.round((correctCount / questions.length) * 100);
  }, []);

  const persistComputedScore = useCallback(async (submissionId: string, score: number, answers: Array<{ question_id: string; selected_choice_id: string | null }>) => {
    const timestamp = new Date().toISOString();
    await supabase
      .from("test_submissions")
      .update({ score, graded_at: timestamp })
      .eq("id", submissionId);

    if (answers.length > 0) {
      const answerRows = answers.map((answer) => ({
        submission_id: submissionId,
        ...answer,
      }));
      const { error: answersError } = await supabase.from("test_answers").upsert(answerRows, { onConflict: "submission_id,question_id" });
      if (answersError) return { error: answersError.message };
    }
  }, []);

  const fetchTests = useCallback(async () => {
    if (!filters.schoolId && !filters.classId) return;
    setLoading(true);
    setError(null);

    let selectStr = `
      *,
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
      .order("test_date", { ascending: false });

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

    const nextTests = (data as MonthlyTest[]) ?? [];
    const updates: Promise<unknown>[] = [];
    const normalizedTests = nextTests.map((test) => {
      const questions = test.test_questions ?? [];
      const submissions = test.test_submissions ?? [];
      const nextSubmissions = submissions.map((submission) => {
        if (submission.score != null) return submission;
        const answers = submission.test_answers ?? [];
        if (questions.length === 0 || answers.length === 0) return submission;
        const computedScore = computeTestScore(test, answers);
        if (computedScore == null) return submission;

        updates.push(persistComputedScore(submission.id, computedScore, answers));
        return {
          ...submission,
          score: computedScore,
          graded_at: new Date().toISOString(),
        };
      });
      return {
        ...test,
        test_submissions: nextSubmissions,
      };
    });

    setTests(normalizedTests);
    if (updates.length > 0) {
      Promise.allSettled(updates).catch(() => null);
    }
    setLoading(false);
  }, [computeTestScore, filters.schoolId, filters.classId, filters.teacherId, filters.studentId, filters.kind, persistComputedScore]);

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
    const { data: test, error: testErr } = await supabase
      .from("monthly_tests")
      .insert(testData)
      .select()
      .single();
    if (testErr) return { error: testErr.message, data: null };

    for (const q of questions) {
      const { choices, ...qData } = q;
      const { data: question, error: qErr } = await supabase
        .from("test_questions")
        .insert({ test_id: test.id, ...qData })
        .select()
        .single();
      if (qErr) continue;
      if (choices.length > 0) {
        await supabase.from("test_choices").insert(
          choices.map(c => ({ question_id: question.id, ...c }))
        );
      }
    }
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
      .select()
      .single();
    if (subErr) return { error: subErr.message };

    if (payload.answers.length > 0) {
      const currentTest = tests.find((test) => test.id === payload.test_id);
      const correctChoiceByQuestionId = new Map<string, string | null>();
      currentTest?.test_questions?.forEach((question) => {
        const correctChoice = (question.test_choices ?? []).find((choice) => choice.is_correct);
        correctChoiceByQuestionId.set(question.id, correctChoice?.id ?? null);
      });

      const answerRows = payload.answers.map((answer) => ({
        submission_id: submission.id,
        ...answer,
        is_correct:
          currentTest && answer.selected_choice_id != null
            ? correctChoiceByQuestionId.get(answer.question_id) === answer.selected_choice_id
            : null,
      }));
      await supabase.from("test_answers").upsert(answerRows, { onConflict: "submission_id,question_id" });

      const computedScore = currentTest ? computeTestScore(currentTest, payload.answers) : null;
      if (computedScore != null) {
        const { error: scoreError } = await supabase
          .from("test_submissions")
          .update({ score: computedScore, graded_at: new Date().toISOString() })
          .eq("id", submission.id);
        // In production, students cannot write scores. The database trigger
        // computes it securely; ignore only that expected authorization error.
        if (scoreError && !/row-level security|permission denied/i.test(scoreError.message)) {
          return { error: scoreError.message };
        }
      }
    }
    await fetchTests();
    return { error: null };
  }, [computeTestScore, fetchTests, tests]);

  return { tests, loading, error, fetchTests, createTest, deleteTest, submitTest };
}
