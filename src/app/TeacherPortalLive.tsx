import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronLeft,
  Clock,
  Download,
  FileText,
  Home,
  Layers,
  MessageSquare,
  Plus,
  Send,
  Users,
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { useAttendance } from "@/hooks/useAttendance";
import { useFinalGrades } from "@/hooks/useFinalGrades";
import { useHomework } from "@/hooks/useHomework";
import { useLessons } from "@/hooks/useLessons";
import { useMessages } from "@/hooks/useMessages";
import {
  useSchoolDetails,
  useSchoolEnrollments,
  useSchoolParentLinks,
  useSchoolTeacherAssignments,
} from "@/hooks/useSchoolAdminData";
import { useStudents } from "@/hooks/useStudents";
import { useTests } from "@/hooks/useTests";
import { useTimetable, useTimeSlots, useWorkingDays } from "@/hooks/useTimetable";
import {
  AppShell,
  Avatar,
  Badge,
  Btn,
  EmptyState,
  Input,
  LoadingState,
  Modal,
  NavItem,
  Select,
  StatCard,
  Toast,
} from "./shared";
import { TeacherClassesSectionLive } from "./TeacherClassesSectionLive";

const TEACHER_NAV: NavItem[] = [
  { id: "dashboard", label: "Home Page", icon: <Home className="w-4 h-4" /> },
  { id: "classes", label: "Classes", icon: <Layers className="w-4 h-4" /> },
  { id: "tests", label: "Monthly Test", icon: <FileText className="w-4 h-4" /> },
  { id: "results", label: "Final Results", icon: <Award className="w-4 h-4" /> },
  { id: "students", label: "My Students", icon: <Users className="w-4 h-4" /> },
  { id: "messages", label: "Ticketing System", icon: <MessageSquare className="w-4 h-4" /> },
  { id: "timetable", label: "Time Table", icon: <Calendar className="w-4 h-4" /> },
];

type ToastState = { msg: string; type: "success" | "error" } | null;

type TeacherStudentCard = {
  id: string;
  name: string;
  email: string;
  classId: string;
  className: string;
  parentName: string;
  parentId: string | null;
  averageScore: number | null;
  grade: string;
  attendanceRate: number;
  homeworkSubmitted: number;
  testsCompleted: number;
};

type ContactRow = {
  id: string;
  name: string;
  subtitle: string;
  lastMessage: string;
  lastTime: string | null;
  unreadCount: number;
};

type TestFormState = {
  classId: string;
  subjectId: string;
  title: string;
  date: string;
  duration: string;
};

type MessageTarget = {
  id: string;
  name: string;
  subtitle: string;
};

function formatName(
  firstName?: string | null,
  lastName?: string | null,
  fallback?: string | null,
) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || fallback || "User";
}

function isGenericContactName(value?: string | null) {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return normalized === "user" || normalized === "conversation";
}

function formatDate(value?: string | null) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString();
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function scoreToLetter(score: number | null | undefined) {
  if (score == null) return "Pending";
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 60) return "D";
  return "F";
}

function scoreToGpa(score: number | null | undefined) {
  if (score == null) return "0.0";
  if (score >= 93) return "4.0";
  if (score >= 90) return "3.7";
  if (score >= 87) return "3.3";
  if (score >= 83) return "3.0";
  if (score >= 80) return "2.7";
  if (score >= 77) return "2.3";
  if (score >= 73) return "2.0";
  if (score >= 70) return "1.7";
  if (score >= 67) return "1.3";
  if (score >= 65) return "1.0";
  return "0.0";
}

function formatTimetableLabel(start: string, end: string) {
  return `${start} - ${end}`;
}

export function TeacherPortalLive({
  view,
  setView,
  onLogout,
  schoolId,
  user,
}: {
  view: string;
  setView: (v: string) => void;
  onLogout: () => void;
  schoolId?: string | null;
  user?: { id?: string; email?: string; first_name?: string; last_name?: string } | null;
}) {
  const dbSchool = useSchoolDetails(schoolId ?? null);
  const dbAssignments = useSchoolTeacherAssignments(schoolId ?? null);
  const dbEnrollments = useSchoolEnrollments(schoolId ?? null);
  const dbParentLinks = useSchoolParentLinks(schoolId ?? null);
  const dbStudents = useStudents(schoolId ?? null);
  const dbYears = useAcademicYears(schoolId ?? null);
  const dbLessons = useLessons({ schoolId: schoolId ?? null, teacherId: user?.id ?? null });
  const dbHomework = useHomework({ schoolId: schoolId ?? null, teacherId: user?.id ?? null });
  const dbTests = useTests({ schoolId: schoolId ?? null, teacherId: user?.id ?? null });
  const dbAttendance = useAttendance({ schoolId: schoolId ?? null });
  const dbMessages = useMessages(user?.id ?? null, schoolId ?? null);
  const dbFinalGrades = useFinalGrades({
    schoolId: schoolId ?? null,
    academicYearId: dbYears.currentYear?.id ?? null,
  });
  const dbTimetable = useTimetable(schoolId ?? null, {
    teacherId: user?.id ?? null,
    academicYearId: dbYears.currentYear?.id ?? undefined,
  });
  const dbWorkingDays = useWorkingDays(schoolId ?? null);
  const dbTimeSlots = useTimeSlots(schoolId ?? null);

  const [toast, setToast] = useState<ToastState>(null);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [composeTarget, setComposeTarget] = useState<MessageTarget | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [messagesSearch, setMessagesSearch] = useState("");
  const [showCreateTest, setShowCreateTest] = useState(false);
  const [testForm, setTestForm] = useState<TestFormState>({
    classId: "",
    subjectId: "",
    title: "",
    date: "",
    duration: "60",
  });
  const [resultClassId, setResultClassId] = useState("");
  const [resultSubjectId, setResultSubjectId] = useState("");
  const [hasLoadedCoreData, setHasLoadedCoreData] = useState(false);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const teacherAssignments = useMemo(
    () => dbAssignments.assignments.filter((assignment) => assignment.teacher_id === user?.id),
    [dbAssignments.assignments, user?.id],
  );

  const classOptions = useMemo(() => {
    const seen = new Set<string>();
    return teacherAssignments
      .filter((assignment) => assignment.class_id && assignment.classes)
      .map((assignment) => assignment.classes!)
      .filter((schoolClass) => {
        if (seen.has(schoolClass.id)) return false;
        seen.add(schoolClass.id);
        return true;
      })
      .map((schoolClass) => ({
        value: schoolClass.id,
        label: `${schoolClass.grade_levels?.name ?? "Grade"} - ${schoolClass.name}`,
      }));
  }, [teacherAssignments]);

  const subjectsByClassId = useMemo(() => {
    const map = new Map<string, Array<{ value: string; label: string }>>();
    teacherAssignments.forEach((assignment) => {
      if (!assignment.class_id || !assignment.subjects?.name) return;
      const rows = map.get(assignment.class_id) ?? [];
      if (!rows.some((row) => row.value === assignment.subject_id)) {
        rows.push({ value: assignment.subject_id, label: assignment.subjects.name });
      }
      map.set(assignment.class_id, rows);
    });
    return map;
  }, [teacherAssignments]);

  const teacherClassIds = useMemo(
    () => classOptions.map((option) => option.value),
    [classOptions],
  );

  const teacherSubjectIds = useMemo(
    () => Array.from(new Set(teacherAssignments.map((assignment) => assignment.subject_id))),
    [teacherAssignments],
  );

  const teacherLessons = dbLessons.lessons;
  const teacherHomework = dbHomework.homework;
  const teacherTests = dbTests.tests;

  const teacherLessonIds = useMemo(
    () => new Set(teacherLessons.map((lesson) => lesson.id)),
    [teacherLessons],
  );

  const teacherAttendance = useMemo(
    () => dbAttendance.records.filter((record) => teacherLessonIds.has(record.lesson_id)),
    [dbAttendance.records, teacherLessonIds],
  );

  const teacherEnrollments = useMemo(
    () =>
      dbEnrollments.enrollments.filter(
        (enrollment) => enrollment.class_id && teacherClassIds.includes(enrollment.class_id),
      ),
    [dbEnrollments.enrollments, teacherClassIds],
  );

  const studentDirectory = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
        avatar_url: string | null;
        phone: string | null;
        is_active: boolean;
      }
    >();
    dbStudents.students.forEach((student) => {
      map.set(student.id, student);
    });
    return map;
  }, [dbStudents.students]);

  const parentLinkByStudentId = useMemo(() => {
    const map = new Map<
      string,
      Array<{ id: string; name: string; email: string | null }>
    >();
    dbParentLinks.links.forEach((link) => {
      const rows = map.get(link.student_id) ?? [];
      rows.push({
        id: link.parent_id,
        name: formatName(
          link.parent_profile?.first_name,
          link.parent_profile?.last_name,
          link.parent_profile?.email,
        ),
        email: link.parent_profile?.email ?? null,
      });
      map.set(link.student_id, rows);
    });
    return map;
  }, [dbParentLinks.links]);

  const classStudentCount = useMemo(() => {
    const counts = new Map<string, number>();
    teacherEnrollments.forEach((enrollment) => {
      counts.set(enrollment.class_id, (counts.get(enrollment.class_id) ?? 0) + 1);
    });
    return counts;
  }, [teacherEnrollments]);

  const homeworkStatsByStudent = useMemo(() => {
    const map = new Map<string, { scores: number[]; submissions: number }>();
    teacherHomework.forEach((item) => {
      (item.homework_submissions ?? []).forEach((submission) => {
        const current = map.get(submission.student_id) ?? { scores: [], submissions: 0 };
        current.submissions += 1;
        if (typeof submission.score === "number") current.scores.push(Number(submission.score));
        map.set(submission.student_id, current);
      });
    });
    return map;
  }, [teacherHomework]);

  const testStatsByStudent = useMemo(() => {
    const map = new Map<string, { scores: number[]; submissions: number }>();
    teacherTests.forEach((test) => {
      (test.test_submissions ?? []).forEach((submission) => {
        const current = map.get(submission.student_id) ?? { scores: [], submissions: 0 };
        current.submissions += 1;
        if (typeof submission.score === "number") current.scores.push(Number(submission.score));
        map.set(submission.student_id, current);
      });
    });
    return map;
  }, [teacherTests]);

  const attendanceStatsByStudent = useMemo(() => {
    const map = new Map<string, { present: number; total: number }>();
    teacherAttendance.forEach((record) => {
      const current = map.get(record.student_id) ?? { present: 0, total: 0 };
      current.total += 1;
      if (record.status === "present" || record.status === "late") current.present += 1;
      map.set(record.student_id, current);
    });
    return map;
  }, [teacherAttendance]);

  const teacherStudents = useMemo<TeacherStudentCard[]>(() => {
    const latestEnrollment = new Map<string, typeof teacherEnrollments[number]>();
    teacherEnrollments.forEach((enrollment) => {
      if (!latestEnrollment.has(enrollment.student_id)) {
        latestEnrollment.set(enrollment.student_id, enrollment);
      }
    });

    return Array.from(latestEnrollment.values())
      .map((enrollment) => {
        const studentId = enrollment.student_id;
        const profile = studentDirectory.get(studentId);
        const studentName = formatName(
          profile?.first_name ?? enrollment.student_profile?.first_name,
          profile?.last_name ?? enrollment.student_profile?.last_name,
          profile?.email ?? enrollment.student_profile?.email,
        );
        const homeworkStats = homeworkStatsByStudent.get(studentId) ?? { scores: [], submissions: 0 };
        const testStats = testStatsByStudent.get(studentId) ?? { scores: [], submissions: 0 };
        const attendanceStats = attendanceStatsByStudent.get(studentId) ?? { present: 0, total: 0 };
        const scores = [...homeworkStats.scores, ...testStats.scores];
        const averageScore = average(scores);
        const parents = parentLinkByStudentId.get(studentId) ?? [];
        const totalClassHomework = teacherHomework.filter(
          (item) => item.lessons?.class_id === enrollment.class_id,
        ).length;
        const homeworkCompletion =
          totalClassHomework > 0
            ? Math.round((homeworkStats.submissions / totalClassHomework) * 100)
            : 0;
        return {
          id: studentId,
          name: studentName,
          email: profile?.email ?? enrollment.student_profile?.email ?? "",
          classId: enrollment.class_id,
          className: enrollment.classes?.name ?? "Class",
          parentName: parents.map((parent) => parent.name).join(", ") || "Not linked",
          parentId: parents[0]?.id ?? null,
          averageScore,
          grade: scoreToLetter(averageScore),
          attendanceRate:
            attendanceStats.total > 0
              ? Math.round((attendanceStats.present / attendanceStats.total) * 100)
              : 0,
          homeworkSubmitted: homeworkStats.submissions,
          testsCompleted: testStats.submissions,
        };
      })
      .sort((left, right) => {
        const rightAverage = right.averageScore ?? -1;
        const leftAverage = left.averageScore ?? -1;
        return rightAverage - leftAverage || left.name.localeCompare(right.name);
      });
  }, [
    attendanceStatsByStudent,
    studentDirectory,
    homeworkStatsByStudent,
    parentLinkByStudentId,
    teacherEnrollments,
    teacherHomework,
    testStatsByStudent,
  ]);

  const selectedStudent = useMemo(
    () => teacherStudents.find((student) => student.id === selectedStudentId) ?? null,
    [selectedStudentId, teacherStudents],
  );

  const topStudents = useMemo(
    () => teacherStudents.filter((student) => student.averageScore !== null).slice(0, 4),
    [teacherStudents],
  );

  const classProgress = useMemo(() => {
    const map = new Map<string, { label: string; scores: number[] }>();
    teacherStudents.forEach((student) => {
      const current = map.get(student.classId) ?? { label: student.className, scores: [] };
      if (typeof student.averageScore === "number") current.scores.push(student.averageScore);
      map.set(student.classId, current);
    });
    return Array.from(map.values())
      .map((item) => ({
        label: item.label,
        value: Math.round(average(item.scores) ?? 0),
        sub: `${item.scores.length} graded students`,
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [teacherStudents]);

  const lessonsThisWeek = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = (currentDay + 6) % 7;
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - distanceToMonday);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    return teacherLessons.filter((lesson) => {
      const lessonDate = new Date(lesson.lesson_date);
      return lessonDate >= startOfWeek && lessonDate < endOfWeek;
    }).length;
  }, [teacherLessons]);

  const workloadData = useMemo(() => {
    const now = new Date();
    const map = new Map<string, { day: string; lessons: number; ts: number }>();

    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date(now);
      date.setHours(0, 0, 0, 0);
      date.setDate(now.getDate() - index);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      map.set(key, {
        day: date.toLocaleDateString(undefined, { weekday: "short" }),
        lessons: 0,
        ts: date.getTime(),
      });
    }

    teacherLessons.forEach((lesson) => {
      const lessonDate = new Date(lesson.lesson_date);
      lessonDate.setHours(0, 0, 0, 0);
      const key = `${lessonDate.getFullYear()}-${lessonDate.getMonth()}-${lessonDate.getDate()}`;
      const existing = map.get(key);
      if (existing) existing.lessons += 1;
    });

    return Array.from(map.values()).sort((left, right) => left.ts - right.ts);
  }, [teacherLessons]);

  const upcomingActivities = useMemo(() => {
    const now = new Date();
    return [
      ...teacherLessons.map((lesson) => ({
        id: `lesson-${lesson.id}`,
        date: lesson.lesson_date,
        day: new Date(lesson.lesson_date).getDate().toString().padStart(2, "0"),
        title: lesson.title,
        sub: `${lesson.classes?.name ?? "Class"} lesson`,
        overdue: new Date(lesson.lesson_date) < now,
      })),
      ...teacherHomework.map((item) => ({
        id: `homework-${item.id}`,
        date: item.due_date,
        day: new Date(item.due_date).getDate().toString().padStart(2, "0"),
        title: item.title,
        sub: "Homework due",
        overdue: new Date(item.due_date) < now,
      })),
      ...teacherTests.map((test) => ({
        id: `test-${test.id}`,
        date: test.test_date,
        day: new Date(test.test_date).getDate().toString().padStart(2, "0"),
        title: test.title,
        sub: `${test.classes?.name ?? "Class"} test`,
        overdue: new Date(test.test_date) < now,
      })),
    ]
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
      .slice(0, 6);
  }, [teacherHomework, teacherLessons, teacherTests]);

  const dashboardTasks = useMemo(
    () => [
      {
        id: "messages",
        text: `Reply to ${dbMessages.totalUnread} unread messages`,
        done: dbMessages.totalUnread === 0,
      },
      {
        id: "tests",
        text: `${teacherTests.filter((test) => (test.test_questions?.length ?? 0) === 0).length} tests need questions`,
        done: teacherTests.every((test) => (test.test_questions?.length ?? 0) > 0),
      },
      {
        id: "homework",
        text: `${teacherHomework.filter((item) => (item.homework_questions?.length ?? 0) === 0).length} homework items need questions`,
        done: teacherHomework.every((item) => (item.homework_questions?.length ?? 0) > 0),
      },
      {
        id: "activities",
        text: `${upcomingActivities.length} upcoming teaching activities`,
        done: upcomingActivities.length === 0,
      },
    ],
    [dbMessages.totalUnread, teacherHomework, teacherTests, upcomingActivities.length],
  );

  const recentMessages = useMemo(
    () =>
      dbMessages.conversations.slice(0, 4).map((conversation) => ({
        id: conversation.partnerId,
        from: conversation.partnerName,
        time: conversation.lastTime
          ? new Date(conversation.lastTime).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })
          : "",
        preview: conversation.lastMessage,
      })),
    [dbMessages.conversations],
  );

  const contactRows = useMemo(() => {
    const map = new Map<string, ContactRow>();

    teacherStudents.forEach((student) => {
      map.set(student.id, {
        id: student.id,
        name: student.name,
        subtitle: `${student.className} student`,
        lastMessage: "",
        lastTime: null,
        unreadCount: 0,
      });
    });

    teacherStudents.forEach((student) => {
      const parents = parentLinkByStudentId.get(student.id) ?? [];
      parents.forEach((parent) => {
        if (!map.has(parent.id)) {
          map.set(parent.id, {
            id: parent.id,
            name: parent.name,
            subtitle: `${student.name}'s parent`,
            lastMessage: "",
            lastTime: null,
            unreadCount: 0,
          });
        }
      });
    });

    dbMessages.conversations.forEach((conversation) => {
      const existing = map.get(conversation.partnerId);
      map.set(conversation.partnerId, {
        id: conversation.partnerId,
        name:
          existing && isGenericContactName(conversation.partnerName)
            ? existing.name
            : conversation.partnerName,
        subtitle: existing?.subtitle ?? "Conversation",
        lastMessage: conversation.lastMessage,
        lastTime: conversation.lastTime ?? null,
        unreadCount: conversation.unreadCount,
      });
    });

    return Array.from(map.values()).sort((left, right) => {
      if (left.lastTime && right.lastTime) {
        return new Date(right.lastTime).getTime() - new Date(left.lastTime).getTime();
      }
      if (left.lastTime) return -1;
      if (right.lastTime) return 1;
      return left.name.localeCompare(right.name);
    });
  }, [dbMessages.conversations, parentLinkByStudentId, teacherStudents]);

  const filteredContacts = useMemo(() => {
    const query = messagesSearch.trim().toLowerCase();
    if (!query) return contactRows;
    return contactRows.filter((contact) =>
      `${contact.name} ${contact.subtitle}`.toLowerCase().includes(query),
    );
  }, [contactRows, messagesSearch]);

  const selectedConversation = useMemo(
    () =>
      dbMessages.conversations.find((conversation) => conversation.partnerId === selectedConversationId) ??
      null,
    [dbMessages.conversations, selectedConversationId],
  );

  const activeContact = useMemo(
    () =>
      filteredContacts.find((contact) => contact.id === selectedConversationId) ??
      contactRows.find((contact) => contact.id === selectedConversationId) ??
      composeTarget,
    [composeTarget, contactRows, filteredContacts, selectedConversationId],
  );

  const selectedTest = useMemo(
    () => teacherTests.find((test) => test.id === selectedTestId) ?? null,
    [selectedTestId, teacherTests],
  );

  const testResultRows = useMemo(() => {
    if (!selectedTest) return [];
    return (selectedTest.test_submissions ?? [])
      .map((submission) => {
        const profile = studentDirectory.get(submission.student_id);
        return {
          id: submission.id,
          name: formatName(
            profile?.first_name ?? submission.profiles?.first_name,
            profile?.last_name ?? submission.profiles?.last_name,
            profile?.email ?? "Student",
          ),
          score: submission.score == null ? null : Number(submission.score),
        };
      })
      .sort((left, right) => (right.score ?? -1) - (left.score ?? -1));
  }, [selectedTest, studentDirectory]);

  const resultClassOptions = classOptions;

  const resultSubjectOptions = useMemo(
    () => (resultClassId ? subjectsByClassId.get(resultClassId) ?? [] : []),
    [resultClassId, subjectsByClassId],
  );

  const resultRows = useMemo(() => {
    if (!resultClassId || !resultSubjectId) return [];
    return teacherStudents
      .filter((student) => student.classId === resultClassId)
      .map((student) => {
        const grade =
          dbFinalGrades.grades.find(
            (item) =>
              item.student_id === student.id &&
              item.class_id === resultClassId &&
              item.subject_id === resultSubjectId,
          ) ?? null;
        return { student, grade };
      })
      .sort((left, right) => {
        const leftValue = left.grade?.grade_value ?? -1;
        const rightValue = right.grade?.grade_value ?? -1;
        return rightValue - leftValue || left.student.name.localeCompare(right.student.name);
      });
  }, [dbFinalGrades.grades, resultClassId, resultSubjectId, teacherStudents]);

  const resultAverage = useMemo(() => {
    const values = resultRows
      .map((row) => row.grade?.grade_value)
      .filter((value): value is number => typeof value === "number");
    return average(values);
  }, [resultRows]);

  const coreLoading =
    dbSchool.loading ||
    dbAssignments.loading ||
    dbEnrollments.loading ||
    dbParentLinks.loading ||
    dbYears.loading ||
    dbLessons.loading ||
    dbHomework.loading ||
    dbTests.loading ||
    dbAttendance.loading ||
    dbMessages.loading ||
    dbFinalGrades.loading ||
    dbTimetable.loading ||
    dbWorkingDays.loading ||
    dbTimeSlots.loading;

  useEffect(() => {
    if (!coreLoading) {
      setHasLoadedCoreData(true);
    }
  }, [coreLoading]);

  const showInitialLoader = !hasLoadedCoreData && coreLoading;

  useEffect(() => {
    if (selectedConversationId) return;
    if (dbMessages.conversations.length > 0) {
      setSelectedConversationId(dbMessages.conversations[0].partnerId);
    }
  }, [dbMessages.conversations, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversation) return;
    selectedConversation.messages
      .filter((message) => message.sender_id !== user?.id)
      .forEach((message) => {
        const unreadRecipient = message.message_recipients?.find(
          (recipient) => recipient.recipient_id === user?.id && !recipient.is_read,
        );
        if (unreadRecipient) void dbMessages.markAsRead(message.id);
      });
  }, [dbMessages, selectedConversation, user?.id]);

  useEffect(() => {
    if (!resultClassId && resultClassOptions.length > 0) {
      setResultClassId(resultClassOptions[0].value);
    }
  }, [resultClassId, resultClassOptions]);

  useEffect(() => {
    if (!resultSubjectId && resultSubjectOptions.length > 0) {
      setResultSubjectId(resultSubjectOptions[0].value);
    }
  }, [resultSubjectId, resultSubjectOptions]);

  useEffect(() => {
    if (resultSubjectId && resultSubjectOptions.some((option) => option.value === resultSubjectId)) {
      return;
    }
    if (resultSubjectOptions.length > 0) {
      setResultSubjectId(resultSubjectOptions[0].value);
    }
  }, [resultSubjectId, resultSubjectOptions]);

  useEffect(() => {
    if (!showCreateTest) return;
    if (!testForm.classId && classOptions.length > 0) {
      const nextClassId = classOptions[0].value;
      const nextSubjectId = subjectsByClassId.get(nextClassId)?.[0]?.value ?? "";
      setTestForm((current) => ({
        ...current,
        classId: nextClassId,
        subjectId: nextSubjectId,
      }));
    }
  }, [classOptions, showCreateTest, subjectsByClassId, testForm.classId]);

  useEffect(() => {
    if (!testForm.classId) return;
    const subjectOptions = subjectsByClassId.get(testForm.classId) ?? [];
    if (subjectOptions.length === 0) return;
    if (!subjectOptions.some((option) => option.value === testForm.subjectId)) {
      setTestForm((current) => ({ ...current, subjectId: subjectOptions[0].value }));
    }
  }, [subjectsByClassId, testForm.classId, testForm.subjectId]);

  const createTest = async () => {
    if (!schoolId || !user?.id) return;
    if (!testForm.classId || !testForm.subjectId || !testForm.title.trim() || !testForm.date) {
      showToast("Complete the test form first.", "error");
      return;
    }
    const duration = Number(testForm.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
      showToast("Enter a valid test duration.", "error");
      return;
    }

    const result = await dbTests.createTest({
      school_id: schoolId,
      class_id: testForm.classId,
      subject_id: testForm.subjectId,
      teacher_id: user.id,
      title: testForm.title.trim(),
      test_date: testForm.date,
      duration_minutes: duration,
      kind: "monthly",
      questions: [],
    });

    if (result.error) {
      showToast(result.error, "error");
      return;
    }

    setTestForm({
      classId: classOptions[0]?.value ?? "",
      subjectId: subjectsByClassId.get(classOptions[0]?.value ?? "")?.[0]?.value ?? "",
      title: "",
      date: "",
      duration: "60",
    });
    setShowCreateTest(false);
    showToast("Test saved to Supabase");
  };

  const sendMessage = async () => {
    const targetId = composeTarget?.id ?? selectedConversationId;
    if (!targetId || !messageDraft.trim()) {
      showToast("Choose a contact and write a message first.", "error");
      return;
    }
    const result = await dbMessages.sendMessage(targetId, messageDraft.trim());
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    setSelectedConversationId(targetId);
    setComposeTarget(null);
    setMessageDraft("");
    showToast("Message sent");
  };

  const openDirectMessage = (target: MessageTarget) => {
    setComposeTarget(target);
    setSelectedConversationId(target.id);
    setMessageDraft("");
  };

  const userName = formatName(user?.first_name, user?.last_name, user?.email);

  if (!schoolId || !user?.id) {
    return (
      <EmptyState
        title="No teacher context"
        description="Sign in again to load your teacher dashboard from Supabase."
      />
    );
  }

  return (
    <>
      <AppShell
        navItems={TEACHER_NAV}
        activeView={view}
        onSelect={setView}
        onLogout={onLogout}
        headerTitle={
          {
            dashboard: "Home Page",
            classes: "My Classes",
            tests: "Monthly Test",
            results: "Final Results",
            students: "My Students",
            messages: "Ticketing System",
            timetable: "Time Table",
          }[view] ?? "Teacher Dashboard"
        }
        userName={userName}
        userRole="Teacher"
      >
        {showInitialLoader && (
          <LoadingState
            label="Loading teacher dashboard..."
            description="Fetching your classes, students, tests, timetable, and messages from Supabase."
          />
        )}

        {!showInitialLoader && view === "dashboard" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={<BookOpen className="w-5 h-5" />} label="Courses" value={String(teacherSubjectIds.length)} color="#7C5CBF" />
              <StatCard icon={<Layers className="w-5 h-5" />} label="Classes" value={String(teacherClassIds.length)} color="#3B82F6" />
              <StatCard icon={<Users className="w-5 h-5" />} label="Students" value={String(teacherStudents.length)} color="#10B981" />
              <StatCard icon={<FileText className="w-5 h-5" />} label="Tests" value={String(teacherTests.length)} color="#F59E0B" />
            </div>

            <div className="grid grid-cols-12 gap-5">
              <div className="col-span-12 space-y-4 xl:col-span-4">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex flex-col items-center">
                    <div className="mb-4 text-center">
                      <p className="text-sm font-semibold text-foreground">Lessons This Week</p>
                      <p className="text-xs text-muted-foreground">Live count from your Supabase lessons</p>
                    </div>
                    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-secondary">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-primary">{lessonsThisWeek}</p>
                        <p className="text-xs text-muted-foreground">lessons</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <h4 className="mb-3 text-sm font-bold text-foreground">Top Performing Students</h4>
                  <div className="space-y-3">
                    {topStudents.map((student) => (
                      <div key={student.id} className="flex items-center gap-3">
                        <Avatar name={student.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{student.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {student.averageScore != null ? `${Math.round(student.averageScore)}% average` : "No scores yet"}
                          </p>
                        </div>
                        <Badge color={student.grade.startsWith("A") ? "green" : student.grade.startsWith("B") ? "blue" : "gray"}>
                          {student.grade}
                        </Badge>
                      </div>
                    ))}
                    {topStudents.length === 0 && (
                      <p className="text-xs text-muted-foreground">Top students will appear once submissions are graded.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-span-12 space-y-4 xl:col-span-5">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-4">
                    <h4 className="text-sm font-bold text-foreground">Workload</h4>
                    <p className="text-xs text-muted-foreground">Lessons delivered over the last 7 days</p>
                  </div>
                  <ResponsiveContainer width="100%" height={170}>
                    <BarChart data={workloadData} barSize={18}>
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "none" }} />
                      <Bar dataKey="lessons" fill="#C4B5FD" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <h4 className="mb-4 text-sm font-bold text-foreground">Class Progress</h4>
                  <div className="space-y-3">
                    {classProgress.map((progress) => (
                      <div key={progress.label}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">{progress.label}</span>
                          <span className="text-muted-foreground">{progress.sub}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${progress.value}%` }} />
                        </div>
                        <p className="mt-1 text-[11px] text-primary">{progress.value}% average</p>
                      </div>
                    ))}
                    {classProgress.length === 0 && (
                      <p className="text-xs text-muted-foreground">Class averages will appear after scored work is available.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-span-12 space-y-4 xl:col-span-3">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <h4 className="mb-3 text-sm font-bold text-foreground">Tasks</h4>
                  <div className="space-y-2">
                    {dashboardTasks.map((task) => (
                      <div key={task.id} className="flex items-start gap-2.5">
                        <div className={`mt-0.5 grid h-4 w-4 place-items-center rounded border ${task.done ? "border-primary bg-primary" : "border-border bg-card"}`}>
                          {task.done && <CheckCircle className="h-3 w-3 text-white" />}
                        </div>
                        <span className={`text-xs ${task.done ? "text-muted-foreground line-through" : "font-medium text-foreground"}`}>
                          {task.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <h4 className="mb-3 text-sm font-bold text-foreground">Upcoming Activities</h4>
                  <div className="space-y-3">
                    {upcomingActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-xl bg-secondary text-xs font-bold text-primary">
                          {activity.day}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">{activity.title}</p>
                          <p className="truncate text-[10px] text-muted-foreground">{activity.sub}</p>
                        </div>
                        {activity.overdue && <Badge color="red">Overdue</Badge>}
                      </div>
                    ))}
                    {upcomingActivities.length === 0 && (
                      <p className="text-xs text-muted-foreground">Your next lessons, homework, and tests will appear here.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground">Messages</h4>
                  <button className="text-xs font-semibold text-primary" onClick={() => setView("messages")}>
                    View All
                  </button>
                </div>
                <div className="space-y-4">
                  {recentMessages.map((message) => (
                    <div key={message.id} className="flex items-start gap-3">
                      <Avatar name={message.from} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground">{message.from}</p>
                          <span className="text-[10px] text-muted-foreground">{message.time}</span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{message.preview}</p>
                      </div>
                    </div>
                  ))}
                  {recentMessages.length === 0 && (
                    <p className="text-xs text-muted-foreground">No recent messages from Supabase yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h4 className="mb-4 text-sm font-bold text-foreground">Recent Assessments</h4>
                <div className="space-y-3">
                  {teacherTests.slice(0, 4).map((test) => (
                    <div key={test.id} className="rounded-xl bg-muted p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{test.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {test.classes?.name ?? "Class"} • {formatDate(test.test_date)}
                          </p>
                        </div>
                        <Badge color="purple">{test.test_submissions?.length ?? 0} submissions</Badge>
                      </div>
                    </div>
                  ))}
                  {teacherTests.length === 0 && (
                    <p className="text-xs text-muted-foreground">Tests saved in Supabase will appear here.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {!showInitialLoader && view === "tests" && !selectedTest && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground">Monthly Tests</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Scheduled tests are loaded directly from Supabase.</p>
              </div>
              <Btn icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreateTest(true)}>
                Create Test
              </Btn>
            </div>

            <div className="space-y-4">
              {teacherTests.map((test) => {
                const totalStudents = classStudentCount.get(test.class_id) ?? 0;
                const submissions = test.test_submissions?.length ?? 0;
                return (
                  <div key={test.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge color="green">Live</Badge>
                          <Badge color="purple">{test.subjects?.name ?? "Subject"}</Badge>
                          <Badge color="blue">{test.classes?.name ?? "Class"}</Badge>
                        </div>
                        <h4 className="mb-1 font-bold text-foreground">{test.title}</h4>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(test.test_date)}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{test.duration_minutes} mins</span>
                          <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{test.test_questions?.length ?? 0} questions</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{submissions}/{totalStudents} submitted</span>
                        </div>
                      </div>
                      <Btn size="sm" variant="secondary" onClick={() => setSelectedTestId(test.id)}>
                        View Results
                      </Btn>
                    </div>
                    {totalStudents > 0 && (
                      <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
                        <div className="h-1.5 flex-1 rounded-full bg-muted">
                          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.round((submissions / totalStudents) * 100)}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-primary">
                          {Math.round((submissions / totalStudents) * 100)}% submitted
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              {teacherTests.length === 0 && (
                <EmptyState
                  title="No tests yet"
                  description="Create your first monthly test and it will be stored in Supabase."
                />
              )}
            </div>
          </div>
        )}

        {!showInitialLoader && view === "tests" && selectedTest && (
          <div className="space-y-5">
            <button
              onClick={() => setSelectedTestId(null)}
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Tests
            </button>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard icon={<Users className="w-5 h-5" />} label="Submissions" value={`${testResultRows.length}/${classStudentCount.get(selectedTest.class_id) ?? 0}`} color="#10B981" />
              <StatCard icon={<Award className="w-5 h-5" />} label="Class Avg" value={testResultRows.length ? `${Math.round(average(testResultRows.map((row) => row.score).filter((score): score is number => typeof score === "number")) ?? 0)}%` : "-"} color="#7C5CBF" />
              <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Top Score" value={testResultRows.length ? `${Math.max(...testResultRows.map((row) => row.score ?? 0))}%` : "-"} color="#F59E0B" />
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{selectedTest.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {selectedTest.subjects?.name ?? "Subject"} • {selectedTest.classes?.name ?? "Class"}
                  </p>
                </div>
                <button className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                  <Download className="w-3 h-3" /> Export
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {["#", "Student Name", "Result", "Max Score", "GPA", "Grade"].map((heading) => (
                        <th key={heading} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {testResultRows.map((row, index) => (
                      <tr key={row.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 text-sm font-bold text-muted-foreground">#{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={row.name} size="sm" />
                            <span className="text-sm font-semibold text-foreground">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-foreground">{row.score ?? "Pending"}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">100</td>
                        <td className="px-4 py-3 text-sm font-bold text-primary">{scoreToGpa(row.score)}</td>
                        <td className="px-4 py-3">
                          <Badge color={scoreToLetter(row.score).startsWith("A") ? "green" : scoreToLetter(row.score).startsWith("B") ? "blue" : "gray"}>
                            {scoreToLetter(row.score)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {testResultRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10">
                          <EmptyState
                            title="No test submissions yet"
                            description="Student results will appear here after they submit this test."
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!showInitialLoader && view === "results" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={<CheckCircle className="w-5 h-5" />} label="HW Submitted" value={String(teacherHomework.reduce((sum, item) => sum + (item.homework_submissions?.length ?? 0), 0))} color="#10B981" />
              <StatCard icon={<FileText className="w-5 h-5" />} label="Tests Done" value={String(teacherTests.reduce((sum, test) => sum + (test.test_submissions?.length ?? 0), 0))} color="#F59E0B" />
              <StatCard icon={<Award className="w-5 h-5" />} label="Class Average" value={resultAverage != null ? `${Math.round(resultAverage)}%` : "-"} color="#7C5CBF" />
              <StatCard icon={<BookOpen className="w-5 h-5" />} label="Average GPA" value={resultAverage != null ? scoreToGpa(resultAverage) : "-"} color="#3B82F6" />
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <Select label="Class" value={resultClassId} onChange={setResultClassId} options={resultClassOptions} />
              <Select label="Subject" value={resultSubjectId} onChange={setResultSubjectId} options={resultSubjectOptions} />
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Final Results • {resultClassOptions.find((option) => option.value === resultClassId)?.label ?? "Class"}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {resultSubjectOptions.find((option) => option.value === resultSubjectId)?.label ?? "Subject"}
                  </p>
                </div>
                <button className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                  <Download className="w-3 h-3" /> Export
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {["#", "Student Name", "Result", "Max Score", "GPA", "Grade"].map((heading) => (
                        <th key={heading} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resultRows.map((row, index) => {
                      const score = row.grade?.grade_value ?? null;
                      const gradeLabel = row.grade?.grade_letter ?? scoreToLetter(score);
                      return (
                        <tr key={row.student.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 text-sm font-bold text-muted-foreground">#{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={row.student.name} size="sm" />
                              <span className="text-sm font-semibold text-foreground">{row.student.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-foreground">{score ?? "Pending"}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">100</td>
                          <td className="px-4 py-3 text-sm font-bold text-primary">{scoreToGpa(score)}</td>
                          <td className="px-4 py-3">
                            <Badge color={gradeLabel.startsWith("A") ? "green" : gradeLabel.startsWith("B") ? "blue" : "gray"}>
                              {gradeLabel}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                    {resultRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10">
                          <EmptyState
                            title="No results yet"
                            description="Final grades for your selected class and subject will appear here from Supabase."
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!showInitialLoader && view === "students" && (
          <div className="space-y-5">
            <div>
              <h3 className="font-bold text-foreground">My Students</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Students in your assigned classes are loaded from Supabase.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {teacherStudents.map((student) => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className="rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <Avatar name={student.name} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-foreground">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.className}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge color={student.grade.startsWith("A") ? "green" : student.grade.startsWith("B") ? "blue" : "gray"}>{student.grade}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {student.averageScore != null ? `${Math.round(student.averageScore)}% average` : "No scores yet"}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {teacherStudents.length === 0 && (
                <EmptyState
                  title="No students found"
                  description="Students enrolled in your classes will appear here automatically from Supabase."
                />
              )}
            </div>
          </div>
        )}

        {!showInitialLoader && view === "messages" && (
          <div className="h-[calc(100vh-180px)] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex h-full">
              <div className="flex w-80 flex-col border-r border-border">
                <div className="space-y-3 border-b border-border p-4">
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      placeholder="Search contacts..."
                      value={messagesSearch}
                      onChange={(event) => setMessagesSearch(event.target.value)}
                      className="w-full rounded-xl border border-border bg-muted py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => { setSelectedConversationId(contact.id); setComposeTarget(null); }}
                      className={`w-full border-b border-border p-4 text-left transition hover:bg-muted ${selectedConversationId === contact.id ? "bg-muted" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar name={contact.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">{contact.name}</p>
                            {contact.lastTime && <span className="text-[10px] text-muted-foreground">{formatDate(contact.lastTime)}</span>}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {contact.lastMessage || contact.subtitle}
                          </p>
                        </div>
                        {contact.unreadCount > 0 && <div className="mt-1 h-2 w-2 rounded-full bg-primary" />}
                      </div>
                    </button>
                  ))}
                  {filteredContacts.length === 0 && (
                    <div className="p-6">
                      <EmptyState
                        title="No contacts found"
                        description="Students, parents, and message threads from Supabase will appear here."
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-1 flex-col">
                <div className="border-b border-border p-4">
                  <p className="text-sm font-bold text-foreground">{activeContact?.name ?? "Choose a conversation"}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeContact?.subtitle ?? "Select a student, parent, or existing thread to start messaging."}
                  </p>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto bg-muted/30 p-4">
                  {(selectedConversation?.messages ?? [])
                    .slice()
                    .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())
                    .map((message) => {
                      const mine = message.sender_id === user?.id;
                      return (
                        <div key={message.id} className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
                          <Avatar name={mine ? userName : activeContact?.name ?? "User"} size="sm" />
                          <div className={`max-w-md rounded-2xl p-3 shadow-sm ${mine ? "rounded-tr-none bg-primary text-white" : "rounded-tl-none bg-card text-foreground"}`}>
                            {message.subject && <p className={`mb-1 text-[10px] font-semibold ${mine ? "text-purple-100" : "text-muted-foreground"}`}>{message.subject}</p>}
                            <p className="text-sm">{message.body}</p>
                            <p className={`mt-1 text-[10px] ${mine ? "text-purple-100" : "text-muted-foreground"}`}>{formatDateTime(message.created_at)}</p>
                          </div>
                        </div>
                      );
                    })}
                  {!selectedConversation && activeContact && (
                    <EmptyState
                      title="No messages yet"
                      description={`Start your first conversation with ${activeContact.name}.`}
                    />
                  )}
                  {!activeContact && (
                    <EmptyState
                      title="No conversation selected"
                      description="Choose a thread on the left to read or send live messages."
                    />
                  )}
                </div>
                <div className="border-t border-border p-4">
                  <div className="flex items-center gap-3">
                    <input
                      value={messageDraft}
                      onChange={(event) => setMessageDraft(event.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                    />
                    <Btn icon={<Send className="w-4 h-4" />} onClick={() => void sendMessage()}>
                      Send
                    </Btn>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!showInitialLoader && view === "timetable" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Badge color={Boolean((dbSchool.school?.settings as Record<string, unknown> | undefined)?.timetablePublished) ? "green" : "gray"}>
                {Boolean((dbSchool.school?.settings as Record<string, unknown> | undefined)?.timetablePublished) ? "Published" : "Draft"}
              </Badge>
              <span className="text-sm text-muted-foreground">{dbYears.currentYear?.name ?? "Current academic year"}</span>
            </div>
            <div className="overflow-auto rounded-2xl border border-border bg-card shadow-sm">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Time</th>
                    {dbWorkingDays.workingDays.map((day) => (
                      <th key={day.id} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                        {day.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dbTimeSlots.timeSlots.map((slot) => (
                    <tr key={slot.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-foreground">{formatTimetableLabel(slot.start_time, slot.end_time)}</p>
                        <p className="text-[11px] text-muted-foreground">{slot.label}</p>
                      </td>
                      {dbWorkingDays.workingDays.map((day) => {
                        const entry = dbTimetable.entries.find(
                          (item) => item.time_slot_id === slot.id && item.working_day_id === day.id,
                        );
                        return (
                          <td key={`${day.id}-${slot.id}`} className="px-4 py-3">
                            {entry ? (
                              <div className="rounded-lg bg-secondary px-3 py-2.5">
                                <p className="text-sm font-semibold text-primary">{entry.subjects?.name ?? "Subject"}</p>
                                <p className="text-xs text-muted-foreground">{entry.classes?.name ?? "Class"}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Free</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {dbWorkingDays.workingDays.length === 0 || dbTimeSlots.timeSlots.length === 0 || dbTimetable.entries.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="No timetable published"
                    description="Your timetable will appear here once the school publishes working days, time slots, and teacher entries."
                  />
                </div>
              ) : null}
            </div>
          </div>
        )}

        {!showInitialLoader && view === "classes" && (
          <TeacherClassesSectionLive schoolId={schoolId ?? null} teacherId={user?.id ?? null} />
        )}
      </AppShell>

      {showCreateTest && (
        <Modal title="Create Test" onClose={() => setShowCreateTest(false)}>
          <div className="space-y-4">
            <Select
              label="Class"
              value={testForm.classId}
              onChange={(value) => setTestForm((current) => ({ ...current, classId: value }))}
              options={classOptions}
              required
            />
            <Select
              label="Subject"
              value={testForm.subjectId}
              onChange={(value) => setTestForm((current) => ({ ...current, subjectId: value }))}
              options={subjectsByClassId.get(testForm.classId) ?? []}
              required
            />
            <Input
              label="Title"
              value={testForm.title}
              onChange={(value) => setTestForm((current) => ({ ...current, title: value }))}
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Test Date"
                type="date"
                value={testForm.date}
                onChange={(value) => setTestForm((current) => ({ ...current, date: value }))}
                required
              />
              <Input
                label="Duration (minutes)"
                type="number"
                value={testForm.duration}
                onChange={(value) => setTestForm((current) => ({ ...current, duration: value }))}
                required
              />
            </div>
            <div className="flex gap-3">
              <Btn onClick={() => void createTest()} className="flex-1">Save Test</Btn>
              <Btn variant="secondary" onClick={() => setShowCreateTest(false)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {selectedStudent && (
        <Modal title={selectedStudent.name} onClose={() => setSelectedStudentId(null)}>
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-2xl bg-secondary/50 p-4">
              <Avatar name={selectedStudent.name} size="lg" />
              <div className="min-w-0">
                <p className="font-bold text-foreground">{selectedStudent.name}</p>
                <p className="text-sm text-muted-foreground">{selectedStudent.className} • {selectedStudent.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">Parent: {selectedStudent.parentName}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl bg-muted p-3 text-center">
                <p className="text-lg font-bold text-primary">{selectedStudent.grade}</p>
                <p className="text-xs text-muted-foreground">Current grade</p>
              </div>
              <div className="rounded-xl bg-muted p-3 text-center">
                <p className="text-lg font-bold text-foreground">{selectedStudent.averageScore != null ? `${Math.round(selectedStudent.averageScore)}%` : "-"}</p>
                <p className="text-xs text-muted-foreground">Average score</p>
              </div>
              <div className="rounded-xl bg-muted p-3 text-center">
                <p className="text-lg font-bold text-emerald-600">{selectedStudent.attendanceRate}%</p>
                <p className="text-xs text-muted-foreground">Attendance</p>
              </div>
              <div className="rounded-xl bg-muted p-3 text-center">
                <p className="text-lg font-bold text-foreground">{selectedStudent.testsCompleted}</p>
                <p className="text-xs text-muted-foreground">Tests completed</p>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4 text-sm">
              <p className="font-semibold text-foreground">Academic snapshot</p>
              <p className="mt-1 text-muted-foreground">
                Homework submissions: {selectedStudent.homeworkSubmitted} • Tests completed: {selectedStudent.testsCompleted} • Attendance rate: {selectedStudent.attendanceRate}%.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Btn
                icon={<MessageSquare className="w-4 h-4" />}
                onClick={() => openDirectMessage({
                  id: selectedStudent.id,
                  name: selectedStudent.name,
                  subtitle: `${selectedStudent.className} student`,
                })}
              >
                Message Student
              </Btn>
              <Btn
                variant="secondary"
                icon={<Users className="w-4 h-4" />}
                disabled={!selectedStudent.parentId}
                onClick={() => {
                  if (!selectedStudent.parentId) return;
                  openDirectMessage({
                    id: selectedStudent.parentId,
                    name: selectedStudent.parentName,
                    subtitle: `${selectedStudent.name}'s parent`,
                  });
                }}
              >
                Message Parent
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {composeTarget && (
        <Modal title={`Message ${composeTarget.name}`} onClose={() => setComposeTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{composeTarget.subtitle}</p>
            <textarea
              value={messageDraft}
              onChange={(event) => setMessageDraft(event.target.value)}
              rows={4}
              placeholder="Write your message..."
              className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex gap-3">
              <Btn className="flex-1" onClick={() => void sendMessage()}>Send Message</Btn>
              <Btn variant="secondary" onClick={() => setComposeTarget(null)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
