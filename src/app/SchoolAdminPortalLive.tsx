import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  Book,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronLeft,
  Download,
  Edit,
  Eye,
  GraduationCap,
  Layers,
  Megaphone,
  MessageSquare,
  Plus,
  Search,
  Send,
  Settings,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import supabase from "@/lib/supabase";
import {
  AppShell,
  Avatar,
  Badge,
  Btn,
  EmptyState,
  Input,
  LessonWorkspace,
  LoadingState,
  Modal,
  NavItem,
  Select,
  StatCard,
  Toast,
} from "./shared";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { useAttendance } from "@/hooks/useAttendance";
import { useClasses } from "@/hooks/useClasses";
import { useFinalGrades } from "@/hooks/useFinalGrades";
import { useGradeLevels } from "@/hooks/useGradeLevels";
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
import { useSubjects } from "@/hooks/useSubjects";
import { useTeachers } from "@/hooks/useTeachers";
import { useTests } from "@/hooks/useTests";
import { useTimetable, useTimeSlots, useWorkingDays } from "@/hooks/useTimetable";
import { formatPlanDisplayName } from "@/lib/plans";

const SCHOOL_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <Users className="w-4 h-4" /> },
  { id: "settings", label: "School Settings", icon: <Settings className="w-4 h-4" /> },
  { id: "academic", label: "Academic Setup", icon: <Layers className="w-4 h-4" /> },
  { id: "grades-classes", label: "Grades & Classes", icon: <GraduationCap className="w-4 h-4" /> },
  { id: "teachers", label: "Teachers", icon: <UserCheck className="w-4 h-4" /> },
  { id: "students", label: "Students", icon: <Users className="w-4 h-4" /> },
  { id: "timetable", label: "Timetable", icon: <Calendar className="w-4 h-4" /> },
  { id: "final-grades", label: "Final Grades", icon: <Award className="w-4 h-4" /> },
  { id: "announcements", label: "Announcements", icon: <Megaphone className="w-4 h-4" /> },
  { id: "messages", label: "Messages", icon: <MessageSquare className="w-4 h-4" /> },
];

type ToastState = { msg: string; type: "success" | "error" } | null;

type SemesterRow = {
  id: string;
  name: string;
  start: string;
  end: string;
};

type GradeClassSelection = {
  gradeId: string;
  grade: string;
  classId: string;
  cls: string;
};

type SubjectSelection = {
  id: string;
  name: string;
};

type TeacherRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  classes: string[];
  status: "active" | "inactive";
  weeklyHours: number;
};

type StudentRow = {
  id: string;
  name: string;
  email: string;
  classId: string | null;
  className: string;
  parentName: string;
  grade: string;
  points: number;
};

function formatName(firstName?: string | null, lastName?: string | null, email?: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ") || email || "Unknown";
}

function formatShortDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString();
}

function gradeFromAverage(value: number | null) {
  if (value === null) return "Pending";
  if (value >= 90) return "A";
  if (value >= 80) return "B";
  if (value >= 70) return "C";
  if (value >= 60) return "D";
  return "F";
}

function currencyFromPlan(priceCents?: number | null, cycle?: string | null) {
  if (typeof priceCents !== "number") return "Not assigned";
  return `$${(priceCents / 100).toFixed(0)}/${cycle === "yearly" ? "yr" : "mo"}`;
}

function toSemesterRows(value: unknown): SemesterRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        id: typeof row.id === "string" ? row.id : `semester-${index + 1}`,
        name: typeof row.name === "string" ? row.name : "",
        start: typeof row.start === "string" ? row.start : "",
        end: typeof row.end === "string" ? row.end : "",
      };
    })
    .filter((item): item is SemesterRow => Boolean(item?.name));
}

function exportCsv(rows: Array<Record<string, unknown>>, fileName: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [
    keys.join(","),
    ...rows.map((row) =>
      keys
        .map((key) => {
          const value = row[key];
          const text = value == null ? "" : String(value);
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(","),
    ),
  ].join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = fileName;
  link.click();
}

export function SchoolAdminPortalLive({
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
  const dbTeachers = useTeachers(schoolId ?? null);
  const dbStudents = useStudents(schoolId ?? null);
  const dbAnnouncements = useAnnouncements(schoolId ?? null);
  const dbGradeLevels = useGradeLevels(schoolId ?? null);
  const dbYears = useAcademicYears(schoolId ?? null);
  const dbClasses = useClasses(schoolId ?? null);
  const dbSubjects = useSubjects(schoolId ?? null);
  const dbTeacherAssignments = useSchoolTeacherAssignments(schoolId ?? null);
  const dbParentLinks = useSchoolParentLinks(schoolId ?? null);
  const dbEnrollments = useSchoolEnrollments(schoolId ?? null);
  const dbWorkingDays = useWorkingDays(schoolId ?? null);
  const dbTimeSlots = useTimeSlots(schoolId ?? null);
  const dbTimetable = useTimetable(schoolId ?? null, { academicYearId: dbYears.currentYear?.id });
  const dbLessons = useLessons({ schoolId: schoolId ?? null });
  const dbHomework = useHomework({ schoolId: schoolId ?? null });
  const dbTests = useTests({ schoolId: schoolId ?? null });
  const dbAttendance = useAttendance({ schoolId: schoolId ?? null });
  const dbFinalGrades = useFinalGrades({ schoolId: schoolId ?? null });
  const dbMessages = useMessages(user?.id ?? null, schoolId ?? null);

  const [toast, setToast] = useState<ToastState>(null);
  const [academicTab, setAcademicTab] = useState("working-days");
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [showAddClassForGrade, setShowAddClassForGrade] = useState<{ gradeId: string; grade: string } | null>(null);
  const [showAssignmentEditor, setShowAssignmentEditor] = useState<GradeClassSelection | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedGradeClass, setSelectedGradeClass] = useState<GradeClassSelection | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<SubjectSelection | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [gcTab, setGcTab] = useState<"lessons" | "homework" | "tests">("lessons");
  const [selectedHomeworkId, setSelectedHomeworkId] = useState<string | null>(null);
  const [timetableClassId, setTimetableClassId] = useState("");
  const [finalGradeLevelId, setFinalGradeLevelId] = useState("");
  const [finalClassId, setFinalClassId] = useState("");
  const [finalSubjectId, setFinalSubjectId] = useState("");
  const [workingDaysDraft, setWorkingDaysDraft] = useState<string[]>([]);
  const [schoolForm, setSchoolForm] = useState({ name: "", phone: "", address: "", email: "", timezone: "Africa/Cairo" });
  const [yearForm, setYearForm] = useState({ name: "", start: "", end: "" });
  const [subjectName, setSubjectName] = useState("");
  const [semesters, setSemesters] = useState<SemesterRow[]>([]);
  const [newSemester, setNewSemester] = useState({ name: "", start: "", end: "" });
  const [timeSlotDraft, setTimeSlotDraft] = useState({ start: "", end: "", isBreak: false });
  const [teacherForm, setTeacherForm] = useState({ name: "", email: "" });
  const [studentForm, setStudentForm] = useState({ name: "", email: "", classId: "" });
  const [announcementForm, setAnnouncementForm] = useState({ title: "", body: "", audience: "school" });
  const [newClassName, setNewClassName] = useState("");
  const [assignmentDraft, setAssignmentDraft] = useState<Record<string, string>>({});
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [composeRecipientId, setComposeRecipientId] = useState("");
  const [messageDraft, setMessageDraft] = useState("");

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const schoolSettings = useMemo(
    () => ((dbSchool.school?.settings as Record<string, unknown> | null) ?? {}),
    [dbSchool.school?.settings],
  );

  useEffect(() => {
    setSchoolForm({
      name: dbSchool.school?.name ?? "",
      phone: typeof schoolSettings.phone === "string" ? schoolSettings.phone : "",
      address: typeof schoolSettings.address === "string" ? schoolSettings.address : "",
      email: typeof schoolSettings.email === "string" ? schoolSettings.email : user?.email ?? "",
      timezone: dbSchool.school?.timezone ?? "Africa/Cairo",
    });
    setSemesters(toSemesterRows(schoolSettings.semesters));
  }, [dbSchool.school?.name, dbSchool.school?.timezone, schoolSettings.address, schoolSettings.email, schoolSettings.phone, schoolSettings.semesters, user?.email]);

  useEffect(() => {
    if (dbWorkingDays.workingDays.length > 0) {
      setWorkingDaysDraft(dbWorkingDays.workingDays.map((day) => day.label));
    }
  }, [dbWorkingDays.workingDays]);

  const gradeLevelNameById = useMemo(() => {
    const map = new Map<string, string>();
    dbGradeLevels.gradeLevels.forEach((gradeLevel) => {
      map.set(gradeLevel.id, gradeLevel.name);
    });
    return map;
  }, [dbGradeLevels.gradeLevels]);

  const teacherNameById = useMemo(() => {
    const map = new Map<string, string>();
    dbTeachers.teachers.forEach((teacher) => {
      map.set(teacher.id, formatName(teacher.first_name, teacher.last_name, teacher.email));
    });
    return map;
  }, [dbTeachers.teachers]);

  const classNameById = useMemo(() => {
    const map = new Map<string, string>();
    dbClasses.classes.forEach((schoolClass) => {
      map.set(schoolClass.id, schoolClass.name);
    });
    return map;
  }, [dbClasses.classes]);

  const parentNameByStudentId = useMemo(() => {
    const map = new Map<string, string>();
    dbParentLinks.links.forEach((link) => {
      map.set(link.student_id, formatName(link.parent_profile?.first_name, link.parent_profile?.last_name, link.parent_profile?.email) || "Not linked");
    });
    return map;
  }, [dbParentLinks.links]);

  const latestEnrollmentByStudentId = useMemo(() => {
    const map = new Map<string, typeof dbEnrollments.enrollments[number]>();
    dbEnrollments.enrollments.forEach((enrollment) => {
      if (!map.has(enrollment.student_id)) {
        map.set(enrollment.student_id, enrollment);
      }
    });
    return map;
  }, [dbEnrollments.enrollments]);

  const attendanceCountByStudentId = useMemo(() => {
    const map = new Map<string, number>();
    dbAttendance.records.forEach((record) => {
      if (record.status === "present" || record.status === "late") {
        map.set(record.student_id, (map.get(record.student_id) ?? 0) + 1);
      }
    });
    return map;
  }, [dbAttendance.records]);

  const averageFinalGradeByStudentId = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    dbFinalGrades.grades.forEach((grade) => {
      if (typeof grade.grade_value !== "number") return;
      const current = map.get(grade.student_id) ?? { total: 0, count: 0 };
      current.total += grade.grade_value;
      current.count += 1;
      map.set(grade.student_id, current);
    });
    return map;
  }, [dbFinalGrades.grades]);

  const teacherRows = useMemo<TeacherRow[]>(() => {
    return dbTeachers.teachers.map((teacher) => {
      const assignments = dbTeacherAssignments.assignments.filter((assignment) => assignment.teacher_id === teacher.id);
      const subjectNames = Array.from(new Set(assignments.map((assignment) => assignment.subjects?.name).filter((value): value is string => Boolean(value))));
      const classNames = Array.from(new Set(assignments.map((assignment) => assignment.classes?.name).filter((value): value is string => Boolean(value))));
      return {
        id: teacher.id,
        name: formatName(teacher.first_name, teacher.last_name, teacher.email),
        email: teacher.email,
        subject: subjectNames.join(", ") || "Not assigned",
        classes: classNames,
        status: teacher.is_active ? "active" : "inactive",
        weeklyHours: dbTimetable.entries.filter((entry) => entry.teacher_id === teacher.id).length,
      };
    });
  }, [dbTeacherAssignments.assignments, dbTeachers.teachers, dbTimetable.entries]);

  const studentRows = useMemo<StudentRow[]>(() => {
    return dbStudents.students.map((student) => {
      const enrollment = latestEnrollmentByStudentId.get(student.id);
      const averageGrade = averageFinalGradeByStudentId.get(student.id);
      const score = averageGrade && averageGrade.count > 0 ? averageGrade.total / averageGrade.count : null;
      return {
        id: student.id,
        name: formatName(student.first_name, student.last_name, student.email),
        email: student.email,
        classId: enrollment?.class_id ?? null,
        className: enrollment?.classes?.name ?? "Unassigned",
        parentName: parentNameByStudentId.get(student.id) ?? "Not linked",
        grade: gradeFromAverage(score),
        points: attendanceCountByStudentId.get(student.id) ?? 0,
      };
    });
  }, [attendanceCountByStudentId, averageFinalGradeByStudentId, dbStudents.students, latestEnrollmentByStudentId, parentNameByStudentId]);

  const gradeStructures = useMemo(() => {
    return dbGradeLevels.gradeLevels.map((gradeLevel) => {
      const classes = dbClasses.classes.filter((schoolClass) => schoolClass.grade_level_id === gradeLevel.id);
      const classIds = new Set(classes.map((schoolClass) => schoolClass.id));
      const assignments = dbTeacherAssignments.assignments.filter((assignment) => assignment.class_id && classIds.has(assignment.class_id));
      const subjects = Array.from(new Set(assignments.map((assignment) => assignment.subjects?.name).filter((value): value is string => Boolean(value))));
      const teachers = Array.from(new Set(assignments.map((assignment) => teacherNameById.get(assignment.teacher_id)).filter((value): value is string => Boolean(value))));
      return {
        gradeId: gradeLevel.id,
        grade: gradeLevel.name,
        classes,
        subjects: subjects.length > 0 ? subjects : dbSubjects.subjects.map((subject) => subject.name),
        teachers,
      };
    });
  }, [dbClasses.classes, dbGradeLevels.gradeLevels, dbSubjects.subjects, dbTeacherAssignments.assignments, teacherNameById]);

  const announcementRows = useMemo(() => {
    return dbAnnouncements.announcements.map((announcement) => ({
      id: announcement.id,
      announcementId: announcement.id,
      title: announcement.title,
      body: announcement.body,
      audience:
        announcement.announcement_targets?.length
          ? Array.from(
              new Set(
                announcement.announcement_targets.map((target) => target.target_role ?? target.target_type),
              ),
            ).join(", ")
          : "school",
      date: formatShortDate(announcement.created_at),
      author: formatName(announcement.profiles?.first_name, announcement.profiles?.last_name, "School Admin"),
    }));
  }, [dbAnnouncements.announcements]);

  const enrollmentByClass = useMemo(() => {
    const counts = new Map<string, number>();
    dbEnrollments.enrollments.forEach((enrollment) => {
      counts.set(enrollment.class_id, (counts.get(enrollment.class_id) ?? 0) + 1);
    });
    return counts;
  }, [dbEnrollments.enrollments]);

  const attendanceByClass = useMemo(() => {
    const lessonClassMap = new Map<string, string>();
    dbLessons.lessons.forEach((lesson) => {
      lessonClassMap.set(lesson.id, lesson.class_id);
    });

    const stats = new Map<string, { attended: number; total: number }>();
    dbAttendance.records.forEach((record) => {
      const classId = lessonClassMap.get(record.lesson_id);
      if (!classId) return;
      const current = stats.get(classId) ?? { attended: 0, total: 0 };
      current.total += 1;
      if (record.status === "present" || record.status === "late") current.attended += 1;
      stats.set(classId, current);
    });

    return dbClasses.classes.map((schoolClass) => {
      const current = stats.get(schoolClass.id) ?? { attended: 0, total: 0 };
      return {
        classId: schoolClass.id,
        className: schoolClass.name,
        pct: current.total > 0 ? Math.round((current.attended / current.total) * 100) : 0,
      };
    });
  }, [dbAttendance.records, dbClasses.classes, dbLessons.lessons]);

  const recentActivity = useMemo(() => {
    const items: Array<{ id: string; text: string; time: string }> = [];

    dbLessons.lessons.slice(0, 2).forEach((lesson) => {
      items.push({
        id: `lesson-${lesson.id}`,
        text: `${lesson.title} was published for ${lesson.classes?.name ?? classNameById.get(lesson.class_id) ?? "a class"}.`,
        time: formatShortDate(lesson.created_at),
      });
    });

    dbHomework.homework.slice(0, 2).forEach((homework) => {
      items.push({
        id: `homework-${homework.id}`,
        text: `${homework.title} is due on ${formatDateTime(homework.due_date)}.`,
        time: formatShortDate(homework.created_at),
      });
    });

    dbTests.tests.slice(0, 2).forEach((test) => {
      items.push({
        id: `test-${test.id}`,
        text: `${test.title} is scheduled for ${test.classes?.name ?? "a class"}.`,
        time: formatShortDate(test.created_at),
      });
    });

    dbAnnouncements.announcements.slice(0, 2).forEach((announcement) => {
      items.push({
        id: `announcement-${announcement.id}`,
        text: `${announcement.title} was posted to ${announcement.announcement_targets?.length ? "targeted groups" : "the whole school"}.`,
        time: formatShortDate(announcement.created_at),
      });
    });

    return items.slice(0, 6);
  }, [classNameById, dbAnnouncements.announcements, dbHomework.homework, dbLessons.lessons, dbTests.tests]);

  const classOptions = useMemo(
    () => dbClasses.classes.map((schoolClass) => ({ value: schoolClass.id, label: `${schoolClass.grade_levels?.name ?? "Grade"} - ${schoolClass.name}` })),
    [dbClasses.classes],
  );

  useEffect(() => {
    if (!timetableClassId && classOptions.length > 0) setTimetableClassId(classOptions[0].value);
  }, [classOptions, timetableClassId]);

  useEffect(() => {
    if (selectedConversationId) return;
    if (dbMessages.conversations.length > 0) {
      setSelectedConversationId(dbMessages.conversations[0].partnerId);
    }
  }, [dbMessages.conversations, selectedConversationId]);

  const selectedConversation = useMemo(
    () => dbMessages.conversations.find((conversation) => conversation.partnerId === selectedConversationId) ?? null,
    [dbMessages.conversations, selectedConversationId],
  );

  useEffect(() => {
    if (!selectedConversation) return;
    selectedConversation.messages
      .filter((message) => message.sender_id !== user?.id)
      .forEach((message) => {
        const recipient = message.message_recipients?.find((row) => row.recipient_id === user?.id && !row.is_read);
        if (recipient) void dbMessages.markAsRead(message.id);
      });
  }, [dbMessages, selectedConversation, user?.id]);

  const recipientOptions = useMemo(() => {
    const rows = [
      ...teacherRows.map((teacher) => ({ value: teacher.id, label: `${teacher.name} • Teacher` })),
      ...studentRows.map((student) => ({ value: student.id, label: `${student.name} • Student` })),
    ];
    return rows.filter((row) => row.value !== user?.id);
  }, [studentRows, teacherRows, user?.id]);

  const selectedTeacher = useMemo(
    () => teacherRows.find((teacher) => teacher.id === selectedTeacherId) ?? null,
    [selectedTeacherId, teacherRows],
  );

  const teacherDetailStats = useMemo(() => {
    if (!selectedTeacher) return null;
    const lessons = dbLessons.lessons.filter((lesson) => lesson.teacher_id === selectedTeacher.id);
    const homework = dbHomework.homework.filter((item) => lessons.some((lesson) => lesson.id === item.lesson_id));
    const tests = dbTests.tests.filter((item) => item.teacher_id === selectedTeacher.id);
    const teacherGrades = dbFinalGrades.grades.filter((grade) =>
      grade.subject_id && dbTeacherAssignments.assignments.some((assignment) => assignment.teacher_id === selectedTeacher.id && assignment.subject_id === grade.subject_id),
    );
    const averageGrade =
      teacherGrades.length > 0
        ? teacherGrades.reduce((sum, grade) => sum + (grade.grade_value ?? 0), 0) / teacherGrades.length
        : null;

    return {
      lessons: lessons.length,
      homework: homework.length,
      tests: tests.length,
      averageGrade,
      schedule: dbTimetable.entries.filter((entry) => entry.teacher_id === selectedTeacher.id),
    };
  }, [dbFinalGrades.grades, dbHomework.homework, dbLessons.lessons, dbTeacherAssignments.assignments, dbTests.tests, dbTimetable.entries, selectedTeacher]);

  const classSubjectOptions = useMemo(() => {
    if (!selectedGradeClass) return [];
    const assignments = dbTeacherAssignments.assignments.filter((assignment) => assignment.class_id === selectedGradeClass.classId);
    const options = assignments.map((assignment) => ({
      id: assignment.subject_id,
      name: assignment.subjects?.name ?? "Subject",
    }));
    if (options.length > 0) return options;
    return dbSubjects.subjects.map((subject) => ({ id: subject.id, name: subject.name }));
  }, [dbSubjects.subjects, dbTeacherAssignments.assignments, selectedGradeClass]);

  const classLessons = useMemo(() => {
    if (!selectedGradeClass || !selectedSubject) return [];
    return dbLessons.lessons
      .filter((lesson) => lesson.class_id === selectedGradeClass.classId && lesson.subject_id === selectedSubject.id)
      .map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        subject: selectedSubject.name,
        date: formatShortDate(lesson.lesson_date),
        status: lesson.video_url || (lesson.lesson_attachments?.length ?? 0) > 0 ? "Published" : "Draft",
      }));
  }, [dbLessons.lessons, selectedGradeClass, selectedSubject]);

  const classHomework = useMemo(() => {
    if (!selectedGradeClass || !selectedSubject) return [];
    return dbHomework.homework
      .filter((item) => {
        const lesson = dbLessons.lessons.find((candidate) => candidate.id === item.lesson_id);
        return lesson?.class_id === selectedGradeClass.classId && lesson.subject_id === selectedSubject.id;
      })
      .map((item) => ({
        id: item.id,
        title: item.title,
        due: formatDateTime(item.due_date),
        submissions: item.homework_submissions?.length ?? 0,
        total: enrollmentByClass.get(selectedGradeClass.classId) ?? 0,
        avg:
          item.homework_submissions && item.homework_submissions.length > 0
            ? `${Math.round(item.homework_submissions.reduce((sum, submission) => sum + (submission.score ?? 0), 0) / item.homework_submissions.length)}%`
            : "Pending",
      }));
  }, [dbHomework.homework, dbLessons.lessons, enrollmentByClass, selectedGradeClass, selectedSubject]);

  const classTests = useMemo(() => {
    if (!selectedGradeClass || !selectedSubject) return [];
    return dbTests.tests
      .filter((test) => test.class_id === selectedGradeClass.classId && test.subject_id === selectedSubject.id)
      .map((test) => ({
        id: test.id,
        title: test.title,
        date: formatDateTime(test.test_date),
        type: "Test" as const,
        status: new Date(test.test_date) > new Date() ? "Scheduled" as const : "Completed" as const,
      }));
  }, [dbTests.tests, selectedGradeClass, selectedSubject]);

  const selectedLesson = useMemo(
    () => classLessons.find((lesson) => lesson.id === selectedLessonId) ?? null,
    [classLessons, selectedLessonId],
  );

  const timetableDays = dbWorkingDays.workingDays;
  const timetableSlots = dbTimeSlots.timeSlots;
  const selectedTimetableEntries = useMemo(
    () => dbTimetable.entries.filter((entry) => entry.class_id === timetableClassId),
    [dbTimetable.entries, timetableClassId],
  );

  const finalGradeStructures = gradeStructures;

  useEffect(() => {
    if (!finalGradeLevelId && finalGradeStructures.length > 0) setFinalGradeLevelId(finalGradeStructures[0].gradeId);
  }, [finalGradeLevelId, finalGradeStructures]);

  const finalGradeClassOptions = useMemo(() => {
    const grade = finalGradeStructures.find((item) => item.gradeId === finalGradeLevelId);
    return (grade?.classes ?? []).map((schoolClass) => ({ value: schoolClass.id, label: schoolClass.name }));
  }, [finalGradeLevelId, finalGradeStructures]);

  useEffect(() => {
    if (!finalClassId && finalGradeClassOptions.length > 0) setFinalClassId(finalGradeClassOptions[0].value);
  }, [finalClassId, finalGradeClassOptions]);

  const finalGradeSubjectOptions = useMemo(() => {
    if (!finalClassId) return [];
    const assignments = dbTeacherAssignments.assignments.filter((assignment) => assignment.class_id === finalClassId);
    const rows = assignments.map((assignment) => ({
      value: assignment.subject_id,
      label: assignment.subjects?.name ?? "Subject",
    }));
    return rows.length > 0 ? rows : dbSubjects.subjects.map((subject) => ({ value: subject.id, label: subject.name }));
  }, [dbSubjects.subjects, dbTeacherAssignments.assignments, finalClassId]);

  useEffect(() => {
    if (!finalSubjectId && finalGradeSubjectOptions.length > 0) setFinalSubjectId(finalGradeSubjectOptions[0].value);
  }, [finalGradeSubjectOptions, finalSubjectId]);

  const finalGradeStudents = useMemo(
    () => studentRows.filter((student) => student.classId === finalClassId),
    [finalClassId, studentRows],
  );

  const finalGradeRows = useMemo(() => {
    return finalGradeStudents.map((student) => {
      const grade = dbFinalGrades.grades.find(
        (item) =>
          item.student_id === student.id &&
          item.class_id === finalClassId &&
          item.subject_id === finalSubjectId &&
          (!dbYears.currentYear || item.academic_year_id === dbYears.currentYear.id),
      );
      return {
        student,
        grade,
      };
    });
  }, [dbFinalGrades.grades, dbYears.currentYear, finalClassId, finalGradeStudents, finalSubjectId]);

  const openAssignmentEditor = (selection: GradeClassSelection) => {
    const existing = dbTeacherAssignments.assignments.filter((assignment) => assignment.class_id === selection.classId);
    const draft = Object.fromEntries(existing.map((assignment) => [assignment.subject_id, assignment.teacher_id]));
    setAssignmentDraft(draft);
    setShowAssignmentEditor(selection);
  };

  const saveSchoolSettings = async () => {
    const result = await dbSchool.updateSchool({
      name: schoolForm.name,
      timezone: schoolForm.timezone,
      settings: {
        phone: schoolForm.phone,
        address: schoolForm.address,
        email: schoolForm.email,
        semesters,
        timetablePublished: Boolean(schoolSettings.timetablePublished),
      },
    });
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    showToast("School settings updated");
  };

  const createAcademicYear = async () => {
    if (!schoolId) return;
    if (!yearForm.name || !yearForm.start || !yearForm.end) {
      showToast("Complete the academic year form first.", "error");
      return;
    }
    const result = await dbYears.createYear({
      school_id: schoolId,
      name: yearForm.name,
      start_date: yearForm.start,
      end_date: yearForm.end,
      is_current: dbYears.years.length === 0,
    });
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    setYearForm({ name: "", start: "", end: "" });
    showToast("Academic year created");
  };

  const addSemester = async () => {
    if (!newSemester.name || !newSemester.start || !newSemester.end) {
      showToast("Complete the semester form first.", "error");
      return;
    }
    const next = [
      ...semesters,
      {
        id: `semester-${Date.now()}`,
        name: newSemester.name,
        start: newSemester.start,
        end: newSemester.end,
      },
    ];
    setSemesters(next);
    setNewSemester({ name: "", start: "", end: "" });
    const result = await dbSchool.updateSchool({ settings: { semesters: next } });
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    showToast("Semester saved");
  };

  const saveWorkingDays = async () => {
    if (!schoolId) return;
    if (workingDaysDraft.length === 0) {
      showToast("Select at least one working day.", "error");
      return;
    }
    const allDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const result = await dbWorkingDays.saveWorkingDays(
      workingDaysDraft.map((label) => ({
        school_id: schoolId,
        label,
        day_of_week: allDays.indexOf(label),
      })),
    );
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    showToast("Working days updated");
  };

  const addTimeSlot = async () => {
    if (!schoolId) return;
    if (!timeSlotDraft.start || !timeSlotDraft.end) {
      showToast("Enter both start and end times.", "error");
      return;
    }
    const label = timeSlotDraft.isBreak
      ? `Break • ${timeSlotDraft.start} - ${timeSlotDraft.end}`
      : `${timeSlotDraft.start} - ${timeSlotDraft.end}`;
    const result = await dbTimeSlots.createTimeSlot({
      school_id: schoolId,
      label,
      start_time: timeSlotDraft.start,
      end_time: timeSlotDraft.end,
      sort_order: dbTimeSlots.timeSlots.length,
    });
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    setTimeSlotDraft({ start: "", end: "", isBreak: false });
    showToast("Time slot added");
  };

  const removeTimeSlot = async (id: string) => {
    const result = await dbTimeSlots.deleteTimeSlot(id);
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    showToast("Time slot removed");
  };

  const createSubject = async () => {
    if (!schoolId) return;
    if (!subjectName.trim()) {
      showToast("Enter a subject name.", "error");
      return;
    }
    const result = await dbSubjects.createSubject({
      school_id: schoolId,
      name: subjectName.trim(),
      code: null,
    });
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    setSubjectName("");
    showToast("Subject created");
  };

  const createTeacher = async () => {
    const [firstName = "", ...rest] = teacherForm.name.trim().split(" ");
    if (!teacherForm.name.trim() || !teacherForm.email.trim()) {
      showToast("Enter the teacher name and email.", "error");
      return;
    }
    const result = await dbTeachers.inviteTeacher({
      email: teacherForm.email.trim(),
      first_name: firstName,
      last_name: rest.join(" ") || undefined,
    });
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    setTeacherForm({ name: "", email: "" });
    setShowAddTeacher(false);
    showToast("Teacher invited successfully");
  };

  const createStudent = async () => {
    const [firstName = "", ...rest] = studentForm.name.trim().split(" ");
    if (!studentForm.name.trim() || !studentForm.email.trim() || !studentForm.classId) {
      showToast("Enter the student name, email, and class.", "error");
      return;
    }
    const result = await dbStudents.inviteStudent({
      email: studentForm.email.trim(),
      first_name: firstName,
      last_name: rest.join(" ") || undefined,
      class_id: studentForm.classId,
    });
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    setStudentForm({ name: "", email: "", classId: "" });
    setShowAddStudent(false);
    showToast("Student invited successfully");
  };

  const publishAnnouncement = async () => {
    if (!schoolId || !user?.id) return;
    if (!announcementForm.title.trim() || !announcementForm.body.trim()) {
      showToast("Enter the announcement title and body.", "error");
      return;
    }
    const result = await dbAnnouncements.createAnnouncement({
      school_id: schoolId,
      author_id: user.id,
      title: announcementForm.title.trim(),
      body: announcementForm.body.trim(),
      is_published: true,
      targets: [{ target_type: announcementForm.audience === "role" ? "role" : "school", target_role: announcementForm.audience === "role" ? "teacher" : null }],
    });
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    setAnnouncementForm({ title: "", body: "", audience: "school" });
    setShowAnnouncement(false);
    showToast("Announcement published");
  };

  const deleteAnnouncement = async (announcementId: string) => {
    const result = await dbAnnouncements.deleteAnnouncement(announcementId);
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    showToast("Announcement removed");
  };

  const saveNewClass = async () => {
    if (!schoolId || !showAddClassForGrade || !newClassName.trim()) {
      showToast("Enter the new class name first.", "error");
      return;
    }
    if (!dbYears.currentYear) {
      showToast("Create an academic year before adding classes.", "error");
      return;
    }
    const result = await dbClasses.createClass({
      school_id: schoolId,
      academic_year_id: dbYears.currentYear.id,
      grade_level_id: showAddClassForGrade.gradeId,
      name: newClassName.trim(),
    });
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    setNewClassName("");
    setShowAddClassForGrade(null);
    showToast("Class created");
  };

  const saveAssignments = async () => {
    if (!showAssignmentEditor) return;
    const rows = Object.entries(assignmentDraft)
      .filter(([, teacherId]) => teacherId)
      .map(([subjectId, teacherId]) => ({ subject_id: subjectId, teacher_id: teacherId }));
    const result = await dbTeacherAssignments.replaceClassAssignments(showAssignmentEditor.classId, rows);
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    setShowAssignmentEditor(null);
    showToast("Class assignments updated");
  };

  const autoGenerateTimetable = async () => {
    if (!schoolId || !dbYears.currentYear || !timetableClassId) {
      showToast("Select a class and make sure the current academic year exists.", "error");
      return;
    }
    const assignments = dbTeacherAssignments.assignments.filter((assignment) => assignment.class_id === timetableClassId);
    const slots = dbTimeSlots.timeSlots.filter((slot) => !slot.label.toLowerCase().includes("break"));
    if (assignments.length === 0 || dbWorkingDays.workingDays.length === 0 || slots.length === 0) {
      showToast("You need working days, time slots, and class assignments before generating a timetable.", "error");
      return;
    }
    const { error: deleteError } = await supabase
      .from("timetable_entries")
      .delete()
      .eq("school_id", schoolId)
      .eq("academic_year_id", dbYears.currentYear.id)
      .eq("class_id", timetableClassId);
    if (deleteError) {
      showToast(deleteError.message, "error");
      return;
    }

    const rows = [];
    let pointer = 0;
    for (const day of dbWorkingDays.workingDays) {
      for (const slot of slots) {
        const assignment = assignments[pointer % assignments.length];
        rows.push({
          school_id: schoolId,
          academic_year_id: dbYears.currentYear.id,
          working_day_id: day.id,
          time_slot_id: slot.id,
          class_id: timetableClassId,
          subject_id: assignment.subject_id,
          teacher_id: assignment.teacher_id,
        });
        pointer += 1;
      }
    }

    const { error: insertError } = await supabase.from("timetable_entries").insert(rows);
    if (insertError) {
      showToast(insertError.message, "error");
      return;
    }
    await dbTimetable.fetchTimetable();
    showToast("Timetable generated from live assignments");
  };

  const toggleTimetablePublished = async () => {
    const result = await dbSchool.updateSchool({
      settings: { timetablePublished: !Boolean(schoolSettings.timetablePublished) },
    });
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    showToast(Boolean(schoolSettings.timetablePublished) ? "Timetable unpublished" : "Timetable published");
  };

  const sendMessage = async () => {
    const recipientId = composeRecipientId || selectedConversationId;
    if (!recipientId || !messageDraft.trim()) {
      showToast("Choose a recipient and write a message first.", "error");
      return;
    }
    const result = await dbMessages.sendMessage(recipientId, messageDraft.trim());
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    setMessageDraft("");
    setComposeRecipientId("");
    setSelectedConversationId(recipientId);
    showToast("Message sent");
  };

  const titleMap: Record<string, string> = {
    dashboard: "School Dashboard",
    settings: "School Settings",
    academic: "Academic Setup",
    "grades-classes": "Grades & Classes",
    teachers: "Teachers",
    students: "Students",
    timetable: "Timetable",
    "final-grades": "Final Grades",
    announcements: "Announcements",
    messages: "Messages",
  };

  const coreLoading =
    dbSchool.loading ||
    dbTeachers.loading ||
    dbStudents.loading ||
    dbClasses.loading ||
    dbGradeLevels.loading ||
    dbYears.loading ||
    dbSubjects.loading;

  const userName = formatName(user?.first_name, user?.last_name, user?.email);

  return (
    <>
      <AppShell
        navItems={SCHOOL_NAV}
        activeView={view}
        onSelect={(nextView) => {
          setView(nextView);
          setSelectedTeacherId(null);
          setSelectedGradeClass(null);
          setSelectedSubject(null);
          setSelectedLessonId(null);
        }}
        onLogout={onLogout}
        headerTitle={
          selectedTeacher?.name ??
          (selectedGradeClass ? `${selectedGradeClass.grade} • ${selectedGradeClass.cls}` : titleMap[view] || "School Dashboard")
        }
        userName={userName}
        userRole="School Administrator"
      >
        {coreLoading && <LoadingState label="Loading school administration data..." />}

        {!coreLoading && view === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={<Users className="w-5 h-5" />} label="Total Students" value={String(studentRows.length)} sub={`${dbEnrollments.enrollments.length} active enrollments`} color="#3B82F6" />
              <StatCard icon={<BookOpen className="w-5 h-5" />} label="Total Subjects" value={String(dbSubjects.subjects.length)} sub="Configured in Supabase" color="#10B981" />
              <StatCard icon={<UserCheck className="w-5 h-5" />} label="Total Teachers" value={String(teacherRows.length)} sub={`${teacherRows.filter((teacher) => teacher.status === "active").length} active`} color="#7C5CBF" />
              <StatCard icon={<Layers className="w-5 h-5" />} label="Active Classes" value={String(dbClasses.classes.length)} sub={`${dbGradeLevels.gradeLevels.length} grade levels`} color="#F59E0B" />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-4 font-bold text-foreground">Attendance This Week</h3>
                <div className="space-y-3">
                  {attendanceByClass.length === 0 && <p className="text-sm text-muted-foreground">Attendance records will appear here after classes are marked.</p>}
                  {attendanceByClass.map((row) => (
                    <div key={row.classId} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">{row.className}</span>
                      <div className="h-2 flex-1 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${row.pct}%` }} />
                      </div>
                      <span className="w-10 text-right text-xs font-bold text-foreground">{row.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
                <h3 className="mb-4 font-bold text-foreground">Enrollment by Class</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={dbClasses.classes.map((schoolClass) => ({ cls: schoolClass.name, count: enrollmentByClass.get(schoolClass.id) ?? 0 }))}>
                    <XAxis dataKey="cls" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "none" }} />
                    <Bar dataKey="count" fill="#7C5CBF" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-4 font-bold text-foreground">Quick Actions</h3>
                <div className="space-y-2">
                  {[
                    { label: "Add Teacher", action: () => setShowAddTeacher(true) },
                    { label: "Add Student", action: () => setShowAddStudent(true) },
                    { label: "Post Announcement", action: () => setShowAnnouncement(true) },
                    { label: "Open Timetable", action: () => setView("timetable") },
                    { label: "Review Final Grades", action: () => setView("final-grades") },
                  ].map((item) => (
                    <button key={item.label} onClick={item.action} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground transition hover:bg-muted">
                      <span>{item.label}</span>
                      <Plus className="h-4 w-4 text-primary" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-4 font-bold text-foreground">Recent Activity</h3>
                <div className="space-y-3">
                  {recentActivity.length === 0 && <p className="text-sm text-muted-foreground">New lessons, tests, homework, and announcements will appear here.</p>}
                  {recentActivity.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                        <CheckCircle className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-foreground">{item.text}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-foreground">Recent Announcements</h3>
                  <Btn size="sm" variant="ghost" onClick={() => setView("announcements")}>View all</Btn>
                </div>
                <div className="space-y-3">
                  {announcementRows.slice(0, 3).map((announcement) => (
                    <div key={announcement.id} className="rounded-xl bg-muted p-3">
                      <p className="text-xs font-semibold text-foreground">{announcement.title}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{announcement.audience} • {announcement.date}</p>
                    </div>
                  ))}
                  {announcementRows.length === 0 && <p className="text-sm text-muted-foreground">Announcements will appear here after they are published.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {!coreLoading && view === "settings" && (
          <div className="max-w-3xl space-y-5">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-foreground">School Information</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="School Name" value={schoolForm.name} onChange={(value) => setSchoolForm((current) => ({ ...current, name: value }))} required />
                <Input label="Timezone" value={schoolForm.timezone} onChange={(value) => setSchoolForm((current) => ({ ...current, timezone: value }))} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Phone" value={schoolForm.phone} onChange={(value) => setSchoolForm((current) => ({ ...current, phone: value }))} />
                <Input label="Support Email" value={schoolForm.email} onChange={(value) => setSchoolForm((current) => ({ ...current, email: value }))} />
              </div>
              <Input label="Address" value={schoolForm.address} onChange={(value) => setSchoolForm((current) => ({ ...current, address: value }))} />
              <div className="flex gap-3">
                <Btn onClick={() => void saveSchoolSettings()}>Save Changes</Btn>
                <Btn variant="secondary" onClick={() => setSchoolForm({
                  name: dbSchool.school?.name ?? "",
                  phone: typeof schoolSettings.phone === "string" ? schoolSettings.phone : "",
                  address: typeof schoolSettings.address === "string" ? schoolSettings.address : "",
                  email: typeof schoolSettings.email === "string" ? schoolSettings.email : user?.email ?? "",
                  timezone: dbSchool.school?.timezone ?? "Africa/Cairo",
                })}>Reset</Btn>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground">Subscription</h3>
                <Badge color={dbSchool.subscription?.status === "active" ? "green" : dbSchool.subscription?.status === "trialing" ? "blue" : "gray"}>
                  {dbSchool.subscription?.status ?? "unknown"}
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Current Plan</p>
                  <p className="font-bold text-foreground">
                    {formatPlanDisplayName(dbSchool.subscription?.subscription_plans?.name)} • {currencyFromPlan(dbSchool.subscription?.subscription_plans?.price_cents, dbSchool.subscription?.subscription_plans?.billing_cycle)}
                  </p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Next Renewal</p>
                  <p className="font-bold text-foreground">{formatShortDate(dbSchool.subscription?.ends_at)}</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Max Students</p>
                  <p className="font-bold text-foreground">{dbSchool.subscription?.subscription_plans?.max_students ?? "Unlimited"}</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Usage</p>
                  <p className="font-bold text-foreground">{studentRows.length} / {dbSchool.subscription?.subscription_plans?.max_students ?? "∞"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!coreLoading && view === "academic" && (
          <div className="space-y-5">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { id: "working-days", label: "Working Days" },
                { id: "time-slots", label: "Time Slots" },
                { id: "academic-year", label: "Academic Years" },
                { id: "grades", label: "Grade Structure" },
                { id: "subjects", label: "Subjects" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAcademicTab(tab.id)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${academicTab === tab.id ? "bg-primary text-white" : "border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {academicTab === "working-days" && (
              <div className="max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
                <h3 className="font-bold text-foreground">Configure Working Days</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => {
                    const active = workingDaysDraft.includes(day);
                    return (
                      <button
                        key={day}
                        onClick={() => setWorkingDaysDraft((current) => (active ? current.filter((item) => item !== day) : [...current, day]))}
                        className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${active ? "border-primary bg-secondary text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <Btn onClick={() => void saveWorkingDays()}>Save Working Days</Btn>
              </div>
            )}

            {academicTab === "time-slots" && (
              <div className="max-w-2xl space-y-4">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-foreground">Time Slots</h3>
                  </div>
                  <div className="space-y-3">
                    {dbTimeSlots.timeSlots.map((slot, index) => (
                      <div key={slot.id} className="flex items-center justify-between rounded-xl bg-muted p-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Period {index + 1}</p>
                          <p className="text-xs text-muted-foreground">{slot.label}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge color={slot.label.toLowerCase().includes("break") ? "yellow" : "blue"}>
                            {slot.label.toLowerCase().includes("break") ? "Break" : "Lesson"}
                          </Badge>
                          <button onClick={() => void removeTimeSlot(slot.id)} className="rounded-lg bg-red-50 p-2 text-red-500 transition hover:bg-red-100">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {dbTimeSlots.timeSlots.length === 0 && <p className="text-sm text-muted-foreground">No time slots configured yet.</p>}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-foreground">Add Time Slot</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input label="Start Time" type="time" value={timeSlotDraft.start} onChange={(value) => setTimeSlotDraft((current) => ({ ...current, start: value }))} />
                    <Input label="End Time" type="time" value={timeSlotDraft.end} onChange={(value) => setTimeSlotDraft((current) => ({ ...current, end: value }))} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={timeSlotDraft.isBreak} onChange={(event) => setTimeSlotDraft((current) => ({ ...current, isBreak: event.target.checked }))} className="h-4 w-4 accent-primary" />
                    Mark as break
                  </label>
                  <Btn onClick={() => void addTimeSlot()}>Save Time Slot</Btn>
                </div>
              </div>
            )}

            {academicTab === "academic-year" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-foreground">Academic Years</h3>
                  <div className="space-y-3">
                    {dbYears.years.map((year) => (
                      <div key={year.id} className="flex items-center justify-between rounded-xl bg-muted p-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{year.name}</p>
                          <p className="text-xs text-muted-foreground">{formatShortDate(year.start_date)} - {formatShortDate(year.end_date)}</p>
                        </div>
                        {year.is_current ? <Badge color="green">Current</Badge> : <Btn size="sm" variant="secondary" onClick={() => void dbYears.setCurrentYear(year.id)}>Set Current</Btn>}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Input label="Year Name" value={yearForm.name} onChange={(value) => setYearForm((current) => ({ ...current, name: value }))} placeholder="2026/2027" />
                    <Input label="Start Date" type="date" value={yearForm.start} onChange={(value) => setYearForm((current) => ({ ...current, start: value }))} />
                    <Input label="End Date" type="date" value={yearForm.end} onChange={(value) => setYearForm((current) => ({ ...current, end: value }))} />
                  </div>
                  <Btn onClick={() => void createAcademicYear()}>Create Academic Year</Btn>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-foreground">Semesters</h3>
                  <div className="space-y-3">
                    {semesters.map((semester) => (
                      <div key={semester.id} className="rounded-xl bg-muted p-3">
                        <p className="text-sm font-semibold text-foreground">{semester.name}</p>
                        <p className="text-xs text-muted-foreground">{formatShortDate(semester.start)} - {formatShortDate(semester.end)}</p>
                      </div>
                    ))}
                    {semesters.length === 0 && <p className="text-sm text-muted-foreground">No semesters saved in the school settings yet.</p>}
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Input label="Semester Name" value={newSemester.name} onChange={(value) => setNewSemester((current) => ({ ...current, name: value }))} placeholder="Term 1" />
                    <Input label="Start Date" type="date" value={newSemester.start} onChange={(value) => setNewSemester((current) => ({ ...current, start: value }))} />
                    <Input label="End Date" type="date" value={newSemester.end} onChange={(value) => setNewSemester((current) => ({ ...current, end: value }))} />
                  </div>
                  <Btn onClick={() => void addSemester()}>Save Semester</Btn>
                </div>
              </div>
            )}

            {academicTab === "grades" && (
              <div className="space-y-4">
                {gradeStructures.map((grade) => (
                  <div key={grade.gradeId} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3">
                      <span className="font-bold text-foreground">{grade.grade}</span>
                      <div className="flex gap-2">
                        <Badge color="purple">{grade.classes.length} classes</Badge>
                        <Badge color="blue">{grade.subjects.length} subjects</Badge>
                      </div>
                    </div>
                    <div className="grid gap-5 p-5 md:grid-cols-3">
                      <div>
                        <p className="mb-2 text-xs font-semibold text-muted-foreground">Classes</p>
                        <div className="space-y-2">
                          {grade.classes.map((schoolClass) => (
                            <div key={schoolClass.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                              <span className="text-sm text-foreground">{schoolClass.name}</span>
                              <button onClick={() => openAssignmentEditor({ gradeId: grade.gradeId, grade: grade.grade, classId: schoolClass.id, cls: schoolClass.name })} className="text-xs font-semibold text-primary hover:underline">
                                Assign
                              </button>
                            </div>
                          ))}
                          <button onClick={() => setShowAddClassForGrade({ gradeId: grade.gradeId, grade: grade.grade })} className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition hover:border-primary hover:text-primary">
                            <Plus className="h-3 w-3" /> Add Class
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold text-muted-foreground">Subjects</p>
                        <div className="space-y-2">
                          {grade.subjects.map((subject) => (
                            <div key={`${grade.gradeId}-${subject}`} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                              <Book className="h-3 w-3 text-primary" />
                              <span className="text-sm text-foreground">{subject}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold text-muted-foreground">Assigned Teachers</p>
                        <div className="space-y-2">
                          {grade.teachers.map((teacher) => (
                            <div key={`${grade.gradeId}-${teacher}`} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                              <Avatar name={teacher} size="sm" />
                              <span className="text-xs text-foreground">{teacher}</span>
                            </div>
                          ))}
                          {grade.teachers.length === 0 && <p className="text-sm text-muted-foreground">No teacher assignments yet.</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {academicTab === "subjects" && (
              <div className="max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-foreground">Subjects</h3>
                <div className="space-y-2">
                  {dbSubjects.subjects.map((subject) => (
                    <div key={subject.id} className="flex items-center justify-between rounded-xl bg-muted p-3">
                      <span className="text-sm font-medium text-foreground">{subject.name}</span>
                      <span className="text-xs text-muted-foreground">{subject.code ?? "No code"}</span>
                    </div>
                  ))}
                </div>
                <Input label="New Subject" value={subjectName} onChange={setSubjectName} placeholder="Enter subject name" />
                <Btn onClick={() => void createSubject()}>Add Subject</Btn>
              </div>
            )}
          </div>
        )}

        {!coreLoading && view === "grades-classes" && !selectedGradeClass && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">Select a class to browse its live lessons, homework, and tests.</p>
            {gradeStructures.map((grade) => (
              <div key={grade.gradeId} className="space-y-3">
                <div className="border-b border-border bg-muted/40 px-5 py-3">
                  <span className="font-bold text-foreground">{grade.grade}</span>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {grade.classes.map((schoolClass) => (
                    <button
                      key={schoolClass.id}
                      onClick={() => {
                        setSelectedGradeClass({ gradeId: grade.gradeId, grade: grade.grade, classId: schoolClass.id, cls: schoolClass.name });
                        setSelectedSubject(null);
                        setSelectedLessonId(null);
                        setGcTab("lessons");
                      }}
                      className="rounded-xl border border-[#E7D8F4] bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="mb-4 flex h-20 items-center justify-center rounded-xl bg-gradient-to-br from-[#F8F3FC] to-[#EEE4F5]">
                        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white shadow-sm">
                          <GraduationCap className="h-7 w-7 text-primary" />
                        </div>
                      </div>
                      <p className="text-sm font-bold text-foreground">{schoolClass.name}</p>
                      <p className="text-xs text-muted-foreground">{grade.grade} • {(enrollmentByClass.get(schoolClass.id) ?? 0)} students</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!coreLoading && view === "grades-classes" && selectedGradeClass && (
          <div className="space-y-5">
            <button onClick={() => { setSelectedGradeClass(null); setSelectedSubject(null); setSelectedLessonId(null); }} className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
              <ChevronLeft className="h-4 w-4" /> Back to Grades & Classes
            </button>

            {!selectedSubject && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-foreground">Choose a subject</h3>
                  <p className="text-sm text-muted-foreground">Open a subject to see its live lessons, homework, and tests for {selectedGradeClass.cls}.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {classSubjectOptions.map((subject) => {
                    const assignment = dbTeacherAssignments.assignments.find((item) => item.class_id === selectedGradeClass.classId && item.subject_id === subject.id);
                    return (
                      <button key={subject.id} onClick={() => { setSelectedSubject(subject); setSelectedLessonId(null); setGcTab("lessons"); }} className="rounded-2xl border border-[#E7D8F4] bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <p className="font-bold text-foreground">{subject.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Teacher: {assignment ? teacherNameById.get(assignment.teacher_id) : "Not assigned"}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedSubject && !selectedLesson && (
              <div className="space-y-5">
                <button onClick={() => setSelectedSubject(null)} className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
                  <ChevronLeft className="h-4 w-4" /> Back to subjects
                </button>

                <div className="flex gap-2 overflow-x-auto">
                  {[
                    { id: "lessons", label: "Lessons" },
                    { id: "homework", label: "Homework" },
                    { id: "tests", label: "Tests" },
                  ].map((tab) => (
                    <button key={tab.id} onClick={() => setGcTab(tab.id as "lessons" | "homework" | "tests")} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${gcTab === tab.id ? "bg-primary text-white" : "border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"}`}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {gcTab === "lessons" && (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {classLessons.map((lesson) => (
                      <button key={lesson.id} onClick={() => setSelectedLessonId(lesson.id)} className="rounded-2xl border border-[#E7D8F4] bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <p className="font-bold text-foreground">{lesson.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{lesson.date} • {lesson.status}</p>
                      </button>
                    ))}
                    {classLessons.length === 0 && <EmptyState title="No lessons yet" description="Lessons for this class and subject will appear here when teachers publish them." />}
                  </div>
                )}

                {gcTab === "homework" && (
                  <div className="space-y-3">
                    {classHomework.map((homework) => (
                      <div key={homework.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <div className="mb-3 flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-foreground">{homework.title}</p>
                            <p className="text-xs text-muted-foreground">Due: {homework.due} • Avg: {homework.avg}</p>
                          </div>
                          <Badge color="blue">{homework.submissions}/{homework.total} submitted</Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-2 flex-1 rounded-full bg-muted">
                            <div className="h-2 rounded-full bg-primary" style={{ width: `${homework.total > 0 ? (homework.submissions / homework.total) * 100 : 0}%` }} />
                          </div>
                          <span className="text-xs font-bold text-foreground">{homework.total > 0 ? Math.round((homework.submissions / homework.total) * 100) : 0}%</span>
                        </div>
                      </div>
                    ))}
                    {classHomework.length === 0 && <EmptyState title="No homework yet" description="Homework tied to this class and subject will appear here." />}
                  </div>
                )}

                {gcTab === "tests" && (
                  <div className="space-y-3">
                    {classTests.map((test) => (
                      <div key={test.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <div>
                          <p className="text-sm font-bold text-foreground">{test.title}</p>
                          <p className="text-xs text-muted-foreground">{test.type} • {test.date}</p>
                        </div>
                        <Badge color={test.status === "Scheduled" ? "purple" : "green"}>{test.status}</Badge>
                      </div>
                    ))}
                    {classTests.length === 0 && <EmptyState title="No tests yet" description="Monthly tests for this class and subject will appear here." />}
                  </div>
                )}
              </div>
            )}

            {selectedLesson && selectedSubject && selectedGradeClass && (
              <LessonWorkspace
                className={`${selectedGradeClass.grade} • ${selectedGradeClass.cls} • ${selectedSubject.name}`}
                lessonTitle={selectedLesson.title}
                onBack={() => setSelectedLessonId(null)}
                onOpenHomework={() => setGcTab("homework")}
              />
            )}
          </div>
        )}

        {!coreLoading && view === "teachers" && !selectedTeacher && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Btn icon={<UserPlus className="w-4 h-4" />} onClick={() => setShowAddTeacher(true)}>Add Teacher</Btn>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {["Teacher", "Subject", "Classes", "Weekly Hours", "Status", "Actions"].map((heading) => (
                        <th key={heading} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teacherRows.map((teacher) => (
                      <tr key={teacher.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={teacher.name} size="sm" />
                            <div>
                              <p className="text-sm font-semibold text-foreground">{teacher.name}</p>
                              <p className="text-xs text-muted-foreground">{teacher.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{teacher.subject}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {teacher.classes.map((className) => <Badge key={`${teacher.id}-${className}`} color="purple">{className}</Badge>)}
                            {teacher.classes.length === 0 && <span className="text-xs text-muted-foreground">Not assigned</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{teacher.weeklyHours} slots</td>
                        <td className="px-4 py-3"><Badge color={teacher.status === "active" ? "green" : "gray"}>{teacher.status}</Badge></td>
                        <td className="px-4 py-3">
                          <button onClick={() => setSelectedTeacherId(teacher.id)} className="rounded-lg bg-muted p-2 text-muted-foreground transition hover:bg-secondary">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!coreLoading && view === "teachers" && selectedTeacher && teacherDetailStats && (
          <div className="space-y-5">
            <button onClick={() => setSelectedTeacherId(null)} className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
              <ChevronLeft className="h-4 w-4" /> Back to Teachers
            </button>
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm text-center">
                <div className="flex flex-col items-center gap-3">
                  <Avatar name={selectedTeacher.name} size="lg" />
                  <div>
                    <p className="text-lg font-bold text-foreground">{selectedTeacher.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedTeacher.subject}</p>
                    <p className="text-xs text-muted-foreground">{selectedTeacher.email}</p>
                  </div>
                  <Badge color={selectedTeacher.status === "active" ? "green" : "gray"}>{selectedTeacher.status}</Badge>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
                <h3 className="font-bold text-foreground">Employment Info</h3>
                {[
                  { label: "Department", value: selectedTeacher.subject },
                  { label: "Classes", value: selectedTeacher.classes.join(", ") || "Not assigned" },
                  { label: "Weekly Hours", value: `${selectedTeacher.weeklyHours} timetable slots` },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between border-b border-border py-1.5 last:border-0">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className="text-sm font-semibold text-foreground">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
                <h3 className="font-bold text-foreground">Workload</h3>
                {[
                  { label: "Lessons", value: String(teacherDetailStats.lessons) },
                  { label: "Homework", value: String(teacherDetailStats.homework) },
                  { label: "Tests", value: String(teacherDetailStats.tests) },
                  { label: "Average Grade", value: teacherDetailStats.averageGrade === null ? "Pending" : `${Math.round(teacherDetailStats.averageGrade)}%` },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between border-b border-border py-1.5 last:border-0">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className="text-sm font-semibold text-foreground">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-4 font-bold text-foreground">Weekly Schedule</h3>
              <div className="grid gap-3 md:grid-cols-5">
                {dbWorkingDays.workingDays.map((day) => (
                  <div key={day.id} className="rounded-xl bg-muted p-3">
                    <p className="mb-2 text-sm font-semibold text-foreground">{day.label}</p>
                    <div className="space-y-2">
                      {teacherDetailStats.schedule
                        .filter((entry) => entry.working_days?.id === day.id)
                        .sort((left, right) => (left.time_slots?.sort_order ?? 0) - (right.time_slots?.sort_order ?? 0))
                        .map((entry) => (
                          <div key={entry.id} className="rounded-lg bg-card p-2">
                            <p className="text-xs font-semibold text-primary">{entry.subjects?.name}</p>
                            <p className="text-[10px] text-muted-foreground">{entry.classes?.name} • {entry.time_slots?.label}</p>
                          </div>
                        ))}
                      {teacherDetailStats.schedule.filter((entry) => entry.working_days?.id === day.id).length === 0 && <p className="text-xs text-muted-foreground">No lessons</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!coreLoading && view === "students" && (
          <div className="space-y-5">
            <div className="flex justify-end">
              <Btn icon={<UserPlus className="w-4 h-4" />} onClick={() => setShowAddStudent(true)}>Add Student</Btn>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {["Student", "Class", "Parent / Guardian", "Grade", "Attendance Points"].map((heading) => (
                        <th key={heading} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {studentRows.map((student) => (
                      <tr key={student.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={student.name} size="sm" />
                            <div>
                              <p className="text-sm font-semibold text-foreground">{student.name}</p>
                              <p className="text-xs text-muted-foreground">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><Badge color="purple">{student.className}</Badge></td>
                        <td className="px-4 py-3 text-sm text-foreground">{student.parentName}</td>
                        <td className="px-4 py-3"><Badge color={student.grade === "A" ? "green" : student.grade === "B" ? "blue" : student.grade === "Pending" ? "gray" : "yellow"}>{student.grade}</Badge></td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{student.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!coreLoading && view === "timetable" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-end gap-3">
              <Select label="Class" value={timetableClassId} onChange={setTimetableClassId} options={classOptions} />
              <Btn icon={<Zap className="w-4 h-4" />} onClick={() => void autoGenerateTimetable()}>Auto Generate</Btn>
              <Btn variant={Boolean(schoolSettings.timetablePublished) ? "secondary" : "primary"} onClick={() => void toggleTimetablePublished()}>
                {Boolean(schoolSettings.timetablePublished) ? "Unpublish Timetable" : "Publish Timetable"}
              </Btn>
              {Boolean(schoolSettings.timetablePublished) && <Badge color="green">Published</Badge>}
            </div>

            <div className="overflow-auto rounded-2xl border border-border bg-card shadow-sm">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Time</th>
                    {timetableDays.map((day) => (
                      <th key={day.id} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{day.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timetableSlots.map((slot) => (
                    <tr key={slot.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-xs font-medium text-muted-foreground">{slot.label}</td>
                      {timetableDays.map((day) => {
                        const entry = selectedTimetableEntries.find((item) => item.time_slot_id === slot.id && item.working_day_id === day.id);
                        return (
                          <td key={day.id} className="px-4 py-3">
                            {slot.label.toLowerCase().includes("break") ? (
                              <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">Break</span>
                            ) : entry ? (
                              <div className="rounded-lg bg-secondary px-2 py-1.5">
                                <p className="text-xs font-semibold text-primary">{entry.subjects?.name}</p>
                                <p className="text-[10px] text-muted-foreground">{teacherNameById.get(entry.teacher_id)}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!coreLoading && view === "final-grades" && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-end gap-4">
                <Select label="Grade" value={finalGradeLevelId} onChange={setFinalGradeLevelId} options={finalGradeStructures.map((item) => ({ value: item.gradeId, label: item.grade }))} />
                <Select label="Class" value={finalClassId} onChange={setFinalClassId} options={finalGradeClassOptions} />
                <Select label="Subject" value={finalSubjectId} onChange={setFinalSubjectId} options={finalGradeSubjectOptions} />
                <Btn
                  size="sm"
                  variant="secondary"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={() =>
                    exportCsv(
                      finalGradeRows.map((row, index) => ({
                        rank: index + 1,
                        student: row.student.name,
                        email: row.student.email,
                        grade_value: row.grade?.grade_value ?? "",
                        grade_letter: row.grade?.grade_letter ?? "",
                        status: row.grade?.status ?? "draft",
                      })),
                      "school-final-grades.csv",
                    )
                  }
                >
                  Export CSV
                </Btn>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border bg-muted/40 px-5 py-3">
                <span className="text-sm font-semibold text-foreground">
                  {gradeLevelNameById.get(finalGradeLevelId) ?? "Grade"} • {classNameById.get(finalClassId) ?? "Class"} • {finalGradeSubjectOptions.find((item) => item.value === finalSubjectId)?.label ?? "Subject"}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px]">
                  <thead>
                    <tr className="border-b border-border">
                      {["#", "Student Name", "Final Grade", "Letter", "Remarks", "Status"].map((heading) => (
                        <th key={heading} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {finalGradeRows.map((row, index) => (
                      <tr key={row.student.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 text-sm font-bold text-muted-foreground">#{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={row.student.name} size="sm" />
                            <span className="text-sm font-semibold text-foreground">{row.student.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{row.grade?.grade_value ?? "Pending"}</td>
                        <td className="px-4 py-3">
                          <Badge color={row.grade?.grade_letter?.startsWith("A") ? "green" : row.grade?.grade_letter?.startsWith("B") ? "blue" : "gray"}>
                            {row.grade?.grade_letter ?? "Pending"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{row.grade?.remarks ?? "—"}</td>
                        <td className="px-4 py-3"><Badge color={row.grade?.status === "approved" ? "green" : row.grade?.status === "submitted" ? "blue" : "gray"}>{row.grade?.status ?? "draft"}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {finalGradeRows.length === 0 && <div className="p-6"><EmptyState title="No grades for this selection" description="Choose a class and subject that already has final grades in Supabase." /></div>}
            </div>
          </div>
        )}

        {!coreLoading && view === "announcements" && (
          <div className="space-y-5">
            <div className="flex justify-end">
              <Btn icon={<Plus className="w-4 h-4" />} onClick={() => setShowAnnouncement(true)}>New Announcement</Btn>
            </div>
            <div className="space-y-4">
              {announcementRows.map((announcement) => (
                <div key={announcement.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge color={announcement.audience.includes("teacher") ? "blue" : announcement.audience.includes("student") ? "green" : "purple"}>{announcement.audience}</Badge>
                        <span className="text-xs text-muted-foreground">{announcement.date}</span>
                      </div>
                      <h4 className="mb-1 font-bold text-foreground">{announcement.title}</h4>
                      <p className="text-sm leading-relaxed text-muted-foreground">{announcement.body}</p>
                    </div>
                    <button onClick={() => void deleteAnnouncement(announcement.announcementId)} className="rounded-lg bg-red-50 p-2 text-red-500 transition hover:bg-red-100">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {announcementRows.length === 0 && <EmptyState title="No announcements yet" description="Published announcements for this school will appear here." />}
            </div>
          </div>
        )}

        {!coreLoading && view === "messages" && (
          <div className="h-[calc(100vh-180px)] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex h-full">
              <div className="flex w-80 flex-col border-r border-border">
                <div className="space-y-3 border-b border-border p-4">
                  <Select label="Start New Conversation" value={composeRecipientId} onChange={setComposeRecipientId} options={recipientOptions} />
                </div>
                <div className="flex-1 overflow-y-auto">
                  {dbMessages.conversations.map((conversation) => (
                    <button key={conversation.partnerId} onClick={() => { setSelectedConversationId(conversation.partnerId); setComposeRecipientId(""); }} className={`w-full border-b border-border p-4 text-left transition hover:bg-muted ${selectedConversationId === conversation.partnerId ? "bg-muted" : ""}`}>
                      <div className="flex items-start gap-3">
                        <Avatar name={conversation.partnerName} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-foreground">{conversation.partnerName}</p>
                            <span className="text-[10px] text-muted-foreground">{formatShortDate(conversation.lastTime)}</span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{conversation.lastMessage}</p>
                        </div>
                        {conversation.unreadCount > 0 && <div className="mt-1 h-2 w-2 rounded-full bg-primary" />}
                      </div>
                    </button>
                  ))}
                  {dbMessages.conversations.length === 0 && <div className="p-6"><EmptyState title="No conversations yet" description="Choose a teacher or student above to start messaging from the live Supabase inbox." /></div>}
                </div>
              </div>
              <div className="flex flex-1 flex-col">
                <div className="border-b border-border p-4">
                  <p className="text-sm font-bold text-foreground">{selectedConversation?.partnerName ?? "Choose a conversation"}</p>
                  <p className="text-xs text-muted-foreground">{selectedConversation ? "Messages are synced from Supabase." : "Select an existing thread or choose a recipient to start a new one."}</p>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto bg-muted/30 p-4">
                  {selectedConversation?.messages
                    .slice()
                    .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())
                    .map((message) => {
                      const mine = message.sender_id === user?.id;
                      return (
                        <div key={message.id} className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
                          <Avatar name={mine ? userName : selectedConversation.partnerName} size="sm" />
                          <div className={`max-w-md rounded-2xl p-3 shadow-sm ${mine ? "rounded-tr-none bg-primary text-white" : "rounded-tl-none bg-card text-foreground"}`}>
                            {message.subject && <p className={`mb-1 text-[10px] font-semibold ${mine ? "text-purple-100" : "text-muted-foreground"}`}>{message.subject}</p>}
                            <p className="text-sm">{message.body}</p>
                            <p className={`mt-1 text-[10px] ${mine ? "text-purple-100" : "text-muted-foreground"}`}>{formatDateTime(message.created_at)}</p>
                          </div>
                        </div>
                      );
                    })}
                  {!selectedConversation && <EmptyState title="No message thread selected" description="Choose a conversation on the left or start one from the recipient picker." />}
                </div>
                <div className="border-t border-border p-4">
                  <div className="flex items-center gap-3">
                    <input value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Type a message..." className="flex-1 rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
                    <Btn icon={<Send className="w-4 h-4" />} onClick={() => void sendMessage()}>Send</Btn>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AppShell>

      {showAddTeacher && (
        <Modal title="Invite Teacher" onClose={() => setShowAddTeacher(false)}>
          <div className="space-y-4">
            <Input label="Full Name" value={teacherForm.name} onChange={(value) => setTeacherForm((current) => ({ ...current, name: value }))} required />
            <Input label="Email" type="email" value={teacherForm.email} onChange={(value) => setTeacherForm((current) => ({ ...current, email: value }))} required />
            <div className="flex gap-3">
              <Btn onClick={() => void createTeacher()} className="flex-1">Invite Teacher</Btn>
              <Btn variant="secondary" onClick={() => setShowAddTeacher(false)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {showAddStudent && (
        <Modal title="Invite Student" onClose={() => setShowAddStudent(false)}>
          <div className="space-y-4">
            <Input label="Full Name" value={studentForm.name} onChange={(value) => setStudentForm((current) => ({ ...current, name: value }))} required />
            <Input label="Email" type="email" value={studentForm.email} onChange={(value) => setStudentForm((current) => ({ ...current, email: value }))} required />
            <Select label="Class" value={studentForm.classId} onChange={(value) => setStudentForm((current) => ({ ...current, classId: value }))} options={classOptions} required />
            <div className="flex gap-3">
              <Btn onClick={() => void createStudent()} className="flex-1">Invite Student</Btn>
              <Btn variant="secondary" onClick={() => setShowAddStudent(false)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {showAnnouncement && (
        <Modal title="Create Announcement" onClose={() => setShowAnnouncement(false)}>
          <div className="space-y-4">
            <Input label="Title" value={announcementForm.title} onChange={(value) => setAnnouncementForm((current) => ({ ...current, title: value }))} required />
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-foreground">Body</label>
              <textarea value={announcementForm.body} onChange={(event) => setAnnouncementForm((current) => ({ ...current, body: event.target.value }))} rows={4} className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>
            <Select label="Audience" value={announcementForm.audience} onChange={(value) => setAnnouncementForm((current) => ({ ...current, audience: value }))} options={[{ value: "school", label: "Whole School" }, { value: "role", label: "Teachers" }]} />
            <div className="flex gap-3">
              <Btn onClick={() => void publishAnnouncement()} className="flex-1">Publish Announcement</Btn>
              <Btn variant="secondary" onClick={() => setShowAnnouncement(false)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {showAddClassForGrade && (
        <Modal title={`Add Class • ${showAddClassForGrade.grade}`} onClose={() => setShowAddClassForGrade(null)}>
          <div className="space-y-4">
            <Input label="Class Name" value={newClassName} onChange={setNewClassName} placeholder="Section A" required />
            <div className="flex gap-3">
              <Btn onClick={() => void saveNewClass()} className="flex-1">Create Class</Btn>
              <Btn variant="secondary" onClick={() => setShowAddClassForGrade(null)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {showAssignmentEditor && (
        <Modal title={`Assign Teachers • ${showAssignmentEditor.cls}`} onClose={() => setShowAssignmentEditor(null)}>
          <div className="space-y-4">
            {dbSubjects.subjects.map((subject) => (
              <Select
                key={subject.id}
                label={subject.name}
                value={assignmentDraft[subject.id] ?? ""}
                onChange={(value) => setAssignmentDraft((current) => ({ ...current, [subject.id]: value }))}
                options={teacherRows.map((teacher) => ({ value: teacher.id, label: teacher.name }))}
              />
            ))}
            <div className="flex gap-3">
              <Btn onClick={() => void saveAssignments()} className="flex-1">Save Assignments</Btn>
              <Btn variant="secondary" onClick={() => setShowAssignmentEditor(null)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.msg} type=