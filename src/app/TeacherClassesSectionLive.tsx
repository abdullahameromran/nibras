import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Calendar,
  CheckSquare,
  ChevronLeft,
  Eye,
  FileText,
  Layers,
  PlayCircle,
  Users,
  Video,
} from "lucide-react";
import { Avatar, Badge, Btn, EmptyState, LoadingState, StatCard, useTranslation } from "./shared";
import { useAttendance } from "@/hooks/useAttendance";
import { useClasses } from "@/hooks/useClasses";
import { useHomework, type Homework } from "@/hooks/useHomework";
import { useLessons, type Lesson } from "@/hooks/useLessons";
import { useSchoolEnrollments } from "@/hooks/useSchoolAdminData";
import { useStorageObjectUrl, useStorageObjectUrlMap } from "@/hooks/useStorageUrls";
import { useStudents } from "@/hooks/useStudents";
import { useTests, type MonthlyTest } from "@/hooks/useTests";

type DetailView = "list" | "detail";

type LiveClassSummary = {
  id: string;
  name: string;
  gradeName: string;
  subjectLabel: string;
  studentCount: number;
  lessons: Lesson[];
  homework: Homework[];
  assessments: MonthlyTest[];
  color: string;
};

function formatName(firstName?: string | null, lastName?: string | null, fallback?: string | null) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || fallback || "Student";
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(locale);
}

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale);
}

function lessonKind(lesson: Lesson) {
  if (lesson.video_url) return "video" as const;
  if ((lesson.lesson_attachments?.length ?? 0) > 0) return "pdf" as const;
  return "lesson" as const;
}

export function TeacherClassesSectionLive({
  schoolId,
  teacherId,
}: {
  schoolId?: string | null;
  teacherId?: string | null;
}) {
  const dbLessons = useLessons({ schoolId: schoolId ?? null, teacherId: teacherId ?? null });
  const dbHomework = useHomework({ schoolId: schoolId ?? null, teacherId: teacherId ?? null });
  const dbTests = useTests({ schoolId: schoolId ?? null, teacherId: teacherId ?? null });
  const dbAttendance = useAttendance({ schoolId: schoolId ?? null });
  const dbClasses = useClasses(schoolId ?? null);
  const dbEnrollments = useSchoolEnrollments(schoolId ?? null);
  const dbStudents = useStudents(schoolId ?? null);

  const [view, setView] = useState<DetailView>("list");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const { language, t } = useTranslation();
  const locale = language === "ar" ? "ar-EG" : "en-US";

  const liveClasses = useMemo<LiveClassSummary[]>(() => {
    const palette = ["#955AC3", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#0EA5E9"];
    const classMetaById = new Map(dbClasses.classes.map((item) => [item.id, item]));
    const lessonIdsWithHomework = new Set(dbHomework.homework.map((item) => item.lesson_id));
    const grouped = new Map<
      string,
      {
        lessons: Lesson[];
        homework: Homework[];
        assessments: MonthlyTest[];
        subjects: Set<string>;
      }
    >();

    dbLessons.lessons.forEach((lesson) => {
      const current = grouped.get(lesson.class_id) ?? {
        lessons: [],
        homework: [],
        assessments: [],
        subjects: new Set<string>(),
      };
      current.lessons.push(lesson);
      if (lesson.subjects?.name) current.subjects.add(lesson.subjects.name);
      grouped.set(lesson.class_id, current);
    });

    dbHomework.homework.forEach((item) => {
      const classId = item.lessons?.class_id;
      if (!classId) return;
      const current = grouped.get(classId) ?? {
        lessons: [],
        homework: [],
        assessments: [],
        subjects: new Set<string>(),
      };
      current.homework.push(item);
      grouped.set(classId, current);
    });

    dbTests.tests.forEach((test) => {
      const current = grouped.get(test.class_id) ?? {
        lessons: [],
        homework: [],
        assessments: [],
        subjects: new Set<string>(),
      };
      current.assessments.push(test);
      if (test.subjects?.name) current.subjects.add(test.subjects.name);
      grouped.set(test.class_id, current);
    });

    return Array.from(grouped.entries())
      .map(([classId, group], index) => {
        const classMeta = classMetaById.get(classId);
        const enrollments = dbEnrollments.enrollments.filter((row) => row.class_id === classId);
        return {
          id: classId,
          name: classMeta?.name ?? group.lessons[0]?.classes?.name ?? "Class",
          gradeName: classMeta?.grade_levels?.name ?? enrollments[0]?.classes?.grade_levels?.name ?? "Grade",
          subjectLabel: Array.from(group.subjects).join(" • ") || "Subject",
          studentCount: enrollments.length,
          lessons: group.lessons
            .slice()
            .sort((left, right) => new Date(right.lesson_date).getTime() - new Date(left.lesson_date).getTime())
            .map((lesson) => ({
              ...lesson,
              lesson_attachments: lesson.lesson_attachments ?? [],
            })),
          homework: group.homework
            .slice()
            .sort((left, right) => new Date(right.due_date).getTime() - new Date(left.due_date).getTime()),
          assessments: group.assessments
            .slice()
            .sort((left, right) => new Date(right.test_date).getTime() - new Date(left.test_date).getTime()),
          color: palette[index % palette.length],
        };
      })
      .sort((left, right) => {
        if (left.gradeName !== right.gradeName) return left.gradeName.localeCompare(right.gradeName);
        return left.name.localeCompare(right.name);
      })
      .map((item) => ({
        ...item,
        lessons: item.lessons.map((lesson) => ({
          ...lesson,
          description: lesson.description ?? "",
          lesson_attachments: lesson.lesson_attachments ?? [],
        })),
        homework: item.homework.map((itemHomework) => ({
          ...itemHomework,
          homework_submissions: itemHomework.homework_submissions ?? [],
          homework_questions: itemHomework.homework_questions ?? [],
        })),
        assessments: item.assessments.map((assessment) => ({
          ...assessment,
          test_questions: assessment.test_questions ?? [],
          test_submissions: assessment.test_submissions ?? [],
        })),
      }))
      .filter((item) => item.lessons.length > 0 || item.homework.length > 0 || item.assessments.length > 0 || item.studentCount > 0)
      .map((item) => ({
        ...item,
        lessons: item.lessons.map((lesson) => ({
          ...lesson,
          lesson_attachments: lesson.lesson_attachments ?? [],
        })),
      }))
      .map((item) => ({
        ...item,
        lessons: item.lessons.map((lesson) => ({
          ...lesson,
          classes: lesson.classes ?? { id: item.id, name: item.name },
        })),
      }))
      .map((item) => ({
        ...item,
        lessons: item.lessons.map((lesson) => ({
          ...lesson,
          homeworkCount: lessonIdsWithHomework.has(lesson.id),
        })) as Lesson[],
      }));
  }, [dbClasses.classes, dbEnrollments.enrollments, dbHomework.homework, dbLessons.lessons, dbTests.tests]);

  useEffect(() => {
    if (!liveClasses.length) {
      setSelectedClassId(null);
      return;
    }
    if (!selectedClassId || !liveClasses.some((item) => item.id === selectedClassId)) {
      setSelectedClassId(liveClasses[0].id);
    }
  }, [liveClasses, selectedClassId]);

  const selectedClass = useMemo(
    () => liveClasses.find((item) => item.id === selectedClassId) ?? null,
    [liveClasses, selectedClassId],
  );

  useEffect(() => {
    if (!selectedClass) {
      setSelectedLessonId(null);
      return;
    }
    if (!selectedLessonId || !selectedClass.lessons.some((lesson) => lesson.id === selectedLessonId)) {
      setSelectedLessonId(selectedClass.lessons[0]?.id ?? null);
    }
  }, [selectedClass, selectedLessonId]);

  const selectedLesson = useMemo(
    () => selectedClass?.lessons.find((lesson) => lesson.id === selectedLessonId) ?? null,
    [selectedClass, selectedLessonId],
  );

  const rawSelectedLessonVideoUrl = useMemo(() => {
    if (selectedLesson?.video_url) return selectedLesson.video_url;

    const videoAttachment = (selectedLesson?.lesson_attachments ?? []).find((attachment) =>
      attachment.file_kind?.toLowerCase().includes("video") ||
      /\.(mp4|webm|ogg|mov|m4v)(?:[?#].*)?$/i.test(attachment.file_url),
    );

    return videoAttachment?.file_url ?? null;
  }, [selectedLesson]);
  const selectedLessonVideoUrl = useStorageObjectUrl("lesson-attachments", rawSelectedLessonVideoUrl);
  const selectedLessonAttachmentUrls = useStorageObjectUrlMap(
    "lesson-attachments",
    (selectedLesson?.lesson_attachments ?? []).map((attachment) => attachment.file_url),
  );

  const selectedLessonHomework = useMemo(
    () => selectedClass?.homework.filter((item) => item.lesson_id === selectedLesson?.id) ?? [],
    [selectedClass, selectedLesson],
  );

  const selectedLessonAssessments = useMemo(() => {
    if (!selectedClass) return [];
    if (!selectedLesson) return selectedClass.assessments;
    return selectedClass.assessments.filter((item) => item.subject_id === selectedLesson.subject_id);
  }, [selectedClass, selectedLesson]);

  const studentDirectory = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
      }
    >();
    dbStudents.students.forEach((student) => {
      map.set(student.id, student);
    });
    return map;
  }, [dbStudents.students]);

  const attendanceRows = useMemo(() => {
    if (!selectedClass) return [];
    const classStudentRows = dbEnrollments.enrollments.filter((row) => row.class_id === selectedClass.id);
    const classLessonIds = new Set(selectedClass.lessons.map((lesson) => lesson.id));
    const classAttendance = dbAttendance.records.filter((record) => classLessonIds.has(record.lesson_id));

    return classStudentRows
      .map((row) => {
        const studentId = row.student_id;
        const profile = studentDirectory.get(studentId);
        const studentHomeworkScores = selectedClass.homework.flatMap((item) =>
          (item.homework_submissions ?? [])
            .filter((submission) => submission.student_id === studentId && submission.score != null)
            .map((submission) => Number(submission.score)),
        );
        const studentTestScores = selectedClass.assessments.flatMap((item) =>
          (item.test_submissions ?? [])
            .filter((submission) => submission.student_id === studentId && submission.score != null)
            .map((submission) => Number(submission.score)),
        );
        const allScores = [...studentHomeworkScores, ...studentTestScores];
        const studentAttendance = classAttendance.filter((record) => record.student_id === studentId);
        const participationCount =
          selectedClass.homework.reduce(
            (sum, item) => sum + (item.homework_submissions?.some((submission) => submission.student_id === studentId) ? 1 : 0),
            0,
          ) +
          selectedClass.assessments.reduce(
            (sum, item) => sum + (item.test_submissions?.some((submission) => submission.student_id === studentId) ? 1 : 0),
            0,
          );

        return {
          id: studentId,
          name: formatName(
            profile?.first_name ?? row.student_profile?.first_name,
            profile?.last_name ?? row.student_profile?.last_name,
            profile?.email ?? row.student_profile?.email ?? "Student",
          ),
          average: allScores.length
            ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length)
            : 0,
          attendanceCount: studentAttendance.filter((record) => record.status !== "absent").length,
          participationCount,
        };
      })
      .sort((left, right) => right.average - left.average || right.attendanceCount - left.attendanceCount || left.name.localeCompare(right.name));
  }, [dbAttendance.records, dbEnrollments.enrollments, selectedClass, studentDirectory]);

  const totalStudents = useMemo(
    () => new Set(dbEnrollments.enrollments.map((row) => row.student_id)).size,
    [dbEnrollments.enrollments],
  );

  const coreLoading =
    dbLessons.loading ||
    dbHomework.loading ||
    dbTests.loading ||
    dbAttendance.loading ||
    dbClasses.loading ||
    dbEnrollments.loading;

  if (coreLoading) {
    return <LoadingState label="Loading class data..." />;
  }

  if (!schoolId || !teacherId) {
    return <EmptyState title="No teacher context" description="Sign in again to load your classes from Supabase." />;
  }

  if (!liveClasses.length) {
    return (
      <EmptyState
        title="No class data yet"
        description="Your classes, lessons, homework, tests, and enrollments will appear here automatically from Supabase."
      />
    );
  }

  if (view === "detail" && selectedClass) {
    return (
      <div className="space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => setView("list")}
              className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm transition-colors hover:bg-gray-50"
            >
              <ChevronLeft className="h-5 w-5 text-[#3F434A]" />
            </button>
            <div>
              <h2 className="text-[20px] font-semibold text-[#0E1B4A]">
                {selectedClass.gradeName} • {selectedClass.name} • {selectedClass.subjectLabel}
              </h2>
              <p className="mt-1 text-xs text-[#999]">
                {selectedClass.studentCount} {t("Students")} • {selectedClass.lessons.length} {t("Lessons")} • {selectedClass.homework.length} {t("Homework")} • {selectedClass.assessments.length} {t("Tasks")}
              </p>
            </div>
          </div>
          {selectedLessonVideoUrl ? (
            <a
              href={selectedLessonVideoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#955AC3] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#7f4cad]"
            >
              <PlayCircle className="h-4 w-4" /> {t("Watch lesson video")}
            </a>
          ) : rawSelectedLessonVideoUrl ? (
            <Btn variant="secondary" className="pointer-events-none opacity-70">
              <Video className="h-4 w-4" /> {t("Preparing lesson video...")}
            </Btn>
          ) : (
            <Btn variant="secondary" className="pointer-events-none opacity-70">
              <Video className="h-4 w-4" /> {t("No lesson video")}
            </Btn>
          )}
        </div>

        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-4 space-y-4">
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <h3 className="text-[15px] font-semibold text-[#0E1B4A]">{t("Lessons")}</h3>
                <span className="rounded-full bg-[#F5F0FF] px-2.5 py-1 text-xs font-medium text-[#955AC3]">
                  {selectedClass.lessons.length} {t("Total")}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {selectedClass.lessons.map((lesson, index) => {
                  const kind = lessonKind(lesson);
                  const active = lesson.id === selectedLesson?.id;
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLessonId(lesson.id)}
                      className={`flex w-full items-center gap-3 px-5 py-4 text-left transition-colors ${
                        active ? "bg-[#F8F4FF]" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F0FF]">
                        {kind === "video" ? (
                          <PlayCircle className="h-4 w-4 text-[#955AC3]" />
                        ) : kind === "pdf" ? (
                          <FileText className="h-4 w-4 text-[#955AC3]" />
                        ) : (
                          <BookOpen className="h-4 w-4 text-[#955AC3]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#0E1B4A]">
                          {t("Lesson")} {selectedClass.lessons.length - index}: {lesson.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[#999]">{formatDate(lesson.lesson_date, locale)}</p>
                      </div>
                      {selectedClass.homework.some((item) => item.lesson_id === lesson.id) && (
                        <Badge color="purple">HW</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-[15px] font-semibold text-[#0E1B4A]">{t("Class Overview")}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#F5F0FF] p-4 text-center">
                  <p className="text-xl font-bold text-[#955AC3]">{selectedClass.studentCount}</p>
                  <p className="mt-1 text-xs font-medium text-[#955AC3]">{t("Students")}</p>
                </div>
                <div className="rounded-xl bg-[#EEF5FF] p-4 text-center">
                  <p className="text-xl font-bold text-[#3B82F6]">{selectedClass.lessons.length}</p>
                  <p className="mt-1 text-xs font-medium text-[#3B82F6]">{t("Lessons")}</p>
                </div>
                <div className="rounded-xl bg-[#ECFDF5] p-4 text-center">
                  <p className="text-xl font-bold text-[#10B981]">{selectedClass.homework.length}</p>
                  <p className="mt-1 text-xs font-medium text-[#10B981]">{t("Homework")}</p>
                </div>
                <div className="rounded-xl bg-[#FFF7ED] p-4 text-center">
                  <p className="text-xl font-bold text-[#F59E0B]">{selectedClass.assessments.length}</p>
                  <p className="mt-1 text-xs font-medium text-[#F59E0B]">{t("Tasks")}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-8 space-y-5">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#955AC3]">{t("Selected Lesson")}</p>
                  <h3 className="mt-1 text-[20px] font-semibold text-[#0E1B4A]">{selectedLesson?.title ?? t("No lesson selected")}</h3>
                  <p className="mt-1 text-xs text-[#999]">
                    {selectedLesson ? `${formatDate(selectedLesson.lesson_date, locale)} • ${selectedClass.subjectLabel}` : t("Choose a lesson from the left to view its live data.")}
                  </p>
                </div>
                {selectedLesson && <Badge color="purple">{lessonKind(selectedLesson) === "video" ? t("Video") : lessonKind(selectedLesson) === "pdf" ? "PDF" : t("Lesson")}</Badge>}
              </div>
              {selectedLesson?.description && (
                <p className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm leading-6 text-[#344054]">
                  {selectedLesson.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#955AC3]" />
                  <h3 className="text-[15px] font-semibold text-[#0E1B4A]">{t("Articles")}</h3>
                </div>
                <div className="space-y-3">
                  {(selectedLesson?.lesson_attachments ?? []).map((attachment) => (
                    <div key={attachment.id} className="rounded-xl border border-[#F1EAF8] bg-[#FBF9FE] p-3">
                      <p className="truncate text-sm font-semibold text-[#0E1B4A]">{attachment.file_name}</p>
                      <div className="mt-2 flex items-center justify-between text-xs text-[#7C6A91]">
                        <span>{attachment.file_kind}</span>
                        <span>{formatDate(attachment.uploaded_at, locale)}</span>
                      </div>
                      {selectedLessonAttachmentUrls[attachment.file_url] ? (
                        <a
                          href={selectedLessonAttachmentUrls[attachment.file_url]}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#955AC3] hover:underline"
                        >
                          <Eye className="h-3.5 w-3.5" /> {t("Open")}
                        </a>
                      ) : (
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#955AC3]/70">
                          <Eye className="h-3.5 w-3.5" /> {t("Preparing file...")}
                        </span>
                      )}
                    </div>
                  ))}
                  {(selectedLesson?.lesson_attachments?.length ?? 0) === 0 && (
                    <EmptyState title="No lesson files" description="Lesson attachments from Supabase will appear here." />
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#10B981]" />
                  <h3 className="text-[15px] font-semibold text-[#0E1B4A]">Homework</h3>
                </div>
                <div className="space-y-3">
                  {selectedLessonHomework.map((item) => (
                    <div key={item.id} className="rounded-xl border border-[#DFF6EC] bg-[#F3FFF8] p-3">
                      <p className="truncate text-sm font-semibold text-[#0E1B4A]">{item.title}</p>
                      <div className="mt-2 flex items-center justify-between text-xs text-[#2B7A5E]">
                        <span>{item.homework_questions?.length ?? 0} {t("Questions")}</span>
                        <span>{item.homework_submissions?.length ?? 0} {t("Submitted")}</span>
                      </div>
                      <p className="mt-2 text-xs text-[#5D7A70]">{t("Due")} {formatDateTime(item.due_date, locale)}</p>
                    </div>
                  ))}
                  {selectedLessonHomework.length === 0 && (
                    <EmptyState title="No homework yet" description="Homework linked to this lesson will appear here from Supabase." />
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-[#F59E0B]" />
                  <h3 className="text-[15px] font-semibold text-[#0E1B4A]">Tasks</h3>
                </div>
                <div className="space-y-3">
                  {selectedLessonAssessments.map((item) => (
                    <div key={item.id} className="rounded-xl border border-[#FDE7C2] bg-[#FFF9EE] p-3">
                      <p className="truncate text-sm font-semibold text-[#0E1B4A]">{item.title}</p>
                      <div className="mt-2 flex items-center justify-between text-xs text-[#9A6A15]">
                        <span>{item.test_questions?.length ?? 0} {t("Questions")}</span>
                        <span>{item.test_submissions?.length ?? 0} {t("Submitted")}</span>
                      </div>
                      <p className="mt-2 text-xs text-[#8B6A34]">{formatDateTime(item.test_date, locale)}</p>
                    </div>
                  ))}
                  {selectedLessonAssessments.length === 0 && (
                    <EmptyState title="No assessments yet" description="Live tests for this class and subject will appear here." />
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-4">
                <h3 className="text-[15px] font-semibold text-[#0E1B4A]">{t("Attendance")}</h3>
                <p className="mt-1 text-xs text-[#8B8FA3]">{t("Class activity and participation")}</p>
              </div>
              {attendanceRows.length === 0 ? (
                <div className="p-6">
                  <EmptyState title="No students or activity yet" description="Student enrollments, submissions, and attendance will appear here from Supabase." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left">
                    <thead className="bg-[#F8F6FC] text-[11px] uppercase tracking-wide text-[#9AA0B4]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">ID</th>
                        <th className="px-4 py-3 font-semibold">{t("Student")}</th>
                        <th className="px-4 py-3 font-semibold">{t("Rank")}</th>
                        <th className="px-4 py-3 font-semibold">{t("Hours")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRows.map((row, index) => (
                        <tr key={row.id} className="border-t border-[#F7F2F9] text-sm">
                          <td className="px-4 py-3">
                            <span className="rounded bg-[#F5F0FF] px-2 py-1 text-xs font-semibold text-[#6E5D8B]">
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={row.name} size="sm" />
                              <span className="font-semibold text-[#34446E]">{row.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#0E1B4A]">{row.average}</td>
                          <td className="px-4 py-3 text-[#6B7188]">{row.attendanceCount + row.participationCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div>
        <h2 className="text-[20px] font-semibold text-[#0E1B4A]">{t("My Classes")}</h2>
        <p className="mt-0.5 text-xs text-[#999]">{t("Manage lessons, homework and student progress")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Layers className="h-5 w-5" />} label="Total Classes" value={String(liveClasses.length)} color="#955AC3" />
        <StatCard icon={<BookOpen className="h-5 w-5" />} label="Total Lessons" value={String(dbLessons.lessons.length)} color="#3B82F6" />
        <StatCard icon={<Users className="h-5 w-5" />} label="Total Students" value={String(totalStudents)} color="#10B981" />
        <StatCard icon={<FileText className="h-5 w-5" />} label="Homework Set" value={String(dbHomework.homework.length)} color="#F59E0B" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {liveClasses.map((item) => {
          const latestLesson = item.lessons[0] ?? null;
          return (
            <div key={item.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
              <div className="px-6 pb-5 pt-5">
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm" style={{ background: `${item.color}18` }}>
                    <BookOpen className="h-6 w-6" style={{ color: item.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[17px] font-semibold text-[#0E1B4A]">
                      {item.gradeName} • {item.name}
                    </h3>
                    <p className="truncate text-xs text-[#999]">{item.subjectLabel}</p>
                  </div>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${item.color}18`, color: item.color }}>
                    {item.studentCount} {t("Students")}
                  </span>
                </div>

                <div className="mb-5 grid grid-cols-3 gap-3">
                  <div className="rounded-xl p-3" style={{ background: `${item.color}0A` }}>
                    <p className="text-[18px] font-bold leading-none" style={{ color: item.color }}>{item.lessons.length}</p>
                    <p className="mt-0.5 text-[10px] font-medium" style={{ color: item.color }}>{t("Lessons")}</p>
                  </div>
                  <div className="rounded-xl bg-[#F0F9FF] p-3">
                    <p className="text-[18px] font-bold leading-none text-[#0EA5E9]">{item.homework.length}</p>
                    <p className="mt-0.5 text-[10px] font-medium text-[#0EA5E9]">{t("Homework")}</p>
                  </div>
                  <div className="rounded-xl bg-[#FFF7ED] p-3">
                    <p className="text-[18px] font-bold leading-none text-[#F59E0B]">{item.assessments.length}</p>
                    <p className="mt-0.5 text-[10px] font-medium text-[#F59E0B]">{t("Tasks")}</p>
                  </div>
                </div>

                {latestLesson ? (
                  <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F0FF]">
                      <FileText className="h-4 w-4 text-[#955AC3]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[#0E1B4A]">{t("Latest")}: {latestLesson.title}</p>
                      <p className="text-[10px] text-[#999]">{formatDate(latestLesson.lesson_date, locale)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-gray-50 p-3 text-xs text-[#999]">No lessons published for this class yet.</div>
                )}
              </div>

              <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100">
                <button
                  className="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors hover:bg-gray-50"
                  style={{ color: item.color }}
                  onClick={() => {
                    setSelectedClassId(item.id);
                    setView("detail");
                  }}
                >
                  <Eye className="h-3.5 w-3.5" /> {t("View Class")}
                </button>
                <button
                  className="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors hover:bg-gray-50"
                  style={{ color: item.color }}
                  onClick={() => {
                    setSelectedClassId(item.id);
                    setSelectedLessonId(item.lessons[0]?.id ?? null);
                    setView("detail");
                  }}
                >
                  <Calendar className="h-3.5 w-3.5" /> {t("Open Latest Lesson")}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
