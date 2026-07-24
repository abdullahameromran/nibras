import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  ClipboardList,
  ExternalLink,
  FileText,
  GraduationCap,
  Home,
  Megaphone,
  MessageSquare,
  PlayCircle,
  Send,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Announcement,
  useAnnouncements,
} from "@/hooks/useAnnouncements";
import { AttendanceRecord, useAttendance } from "@/hooks/useAttendance";
import { FinalGrade, useFinalGrades } from "@/hooks/useFinalGrades";
import { Homework, HomeworkSubmission, useHomework } from "@/hooks/useHomework";
import { Lesson, useLessons } from "@/hooks/useLessons";
import { Conversation, Message, useMessages } from "@/hooks/useMessages";
import {
  ParentChild,
  PortalTeacherAssignment,
  useClassTeacherAssignments,
  useParentChildren,
  useStudentEnrollment,
} from "@/hooks/usePortalContext";
import { useProfile } from "@/hooks/useProfile";
import { useStorageObjectUrl, useStorageObjectUrlMap } from "@/hooks/useStorageUrls";
import { MonthlyTest, TestSubmission, useTests } from "@/hooks/useTests";
import { TimetableEntry, useTimetable } from "@/hooks/useTimetable";
import { formatDisplayName, shouldPreferFallbackDisplayName } from "@/lib/display";
import {
  AppShell,
  Avatar,
  Badge,
  Btn,
  EmptyState,
  LoadingState,
  NavItem,
  StatCard,
  Toast,
} from "./shared";

type PortalUser = { id: string; email?: string | null } | null;

type StudentPortalProps = {
  view: string;
  setView: (view: string) => void;
  onLogout: () => void;
  schoolId: string | null;
  user: PortalUser;
};

type ParentPortalProps = StudentPortalProps;

type RunnerChoice = {
  id: string;
  choice_text: string;
  sort_order: number;
};

type RunnerQuestion = {
  id: string;
  question_text: string;
  sort_order: number;
  choices: RunnerChoice[];
};

type CourseSummary = {
  key: string;
  subjectId: string | null;
  name: string;
  teacherId: string | null;
  teacherName: string;
  lessons: Lesson[];
  homework: Homework[];
  tests: MonthlyTest[];
  finalGrade: FinalGrade | null;
};

type ContactListItem = {
  id: string;
  name: string;
  subtitle: string;
  lastMessage: string;
  lastTime: string | null;
  unreadCount: number;
};

const STUDENT_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <Home className="w-4 h-4" /> },
  { id: "courses", label: "My Courses", icon: <BookOpen className="w-4 h-4" /> },
  { id: "tests", label: "Monthly Tests", icon: <FileText className="w-4 h-4" /> },
  { id: "grades", label: "Final Grades", icon: <Award className="w-4 h-4" /> },
  { id: "timetable", label: "Timetable", icon: <Calendar className="w-4 h-4" /> },
  { id: "announcements", label: "Announcements", icon: <Megaphone className="w-4 h-4" /> },
  { id: "messages", label: "Messages", icon: <MessageSquare className="w-4 h-4" /> },
];

const PARENT_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <Home className="w-4 h-4" /> },
  { id: "progress", label: "Child Progress", icon: <TrendingUp className="w-4 h-4" /> },
  { id: "attendance", label: "Attendance", icon: <CheckSquare className="w-4 h-4" /> },
  { id: "homework", label: "Homework Results", icon: <ClipboardList className="w-4 h-4" /> },
  { id: "tests", label: "Test Results", icon: <FileText className="w-4 h-4" /> },
  { id: "grades", label: "Final Grades", icon: <Award className="w-4 h-4" /> },
  { id: "announcements", label: "Announcements", icon: <Megaphone className="w-4 h-4" /> },
  { id: "messages", label: "Messages", icon: <MessageSquare className="w-4 h-4" /> },
];

function formatName(parts: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}, fallback = "User") {
  return formatDisplayName([parts.first_name, parts.last_name], parts.email || fallback, fallback);
}

function formatDate(value: string | null | undefined, includeYear = true) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleDateString(undefined, includeYear
    ? { month: "short", day: "numeric", year: "numeric" }
    : { month: "short", day: "numeric" });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeLabel(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
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

function getHomeworkSubmission(homework: Homework, studentId: string | null) {
  if (!studentId) return null;
  return (homework.homework_submissions ?? []).find(submission => submission.student_id === studentId) ?? null;
}

function getTestSubmission(test: MonthlyTest, studentId: string | null) {
  if (!studentId) return null;
  return (test.test_submissions ?? []).find(submission => submission.student_id === studentId) ?? null;
}

function buildScoreTrend(entries: Array<{ date: string; score: number | null }>) {
  const buckets = new Map<string, { month: string; timestamp: number; total: number; count: number }>();

  for (const entry of entries) {
    if (entry.score == null || !entry.date) continue;
    const date = new Date(entry.date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.total += Number(entry.score);
      existing.count += 1;
    } else {
      buckets.set(key, {
        month: date.toLocaleDateString(undefined, { month: "short" }),
        timestamp: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
        total: Number(entry.score),
        count: 1,
      });
    }
  }

  return Array.from(buckets.values())
    .sort((left, right) => left.timestamp - right.timestamp)
    .slice(-6)
    .map(item => ({
      month: item.month,
      score: Number((item.total / item.count).toFixed(1)),
    }));
}

function buildAttendanceTrend(records: AttendanceRecord[]) {
  const buckets = new Map<string, { month: string; timestamp: number; present: number; absent: number; late: number }>();

  for (const record of records) {
    const rawDate = record.lessons?.lesson_date ?? record.recorded_at;
    if (!rawDate) continue;
    const date = new Date(rawDate);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const existing = buckets.get(key) ?? {
      month: date.toLocaleDateString(undefined, { month: "short" }),
      timestamp: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
      present: 0,
      absent: 0,
      late: 0,
    };

    if (record.status === "present") existing.present += 1;
    if (record.status === "absent") existing.absent += 1;
    if (record.status === "late") existing.late += 1;

    buckets.set(key, existing);
  }

  return Array.from(buckets.values())
    .sort((left, right) => left.timestamp - right.timestamp)
    .slice(-6);
}

function isAnnouncementVisible(
  announcement: Announcement,
  role: "student" | "parent",
  classId: string | null,
  gradeLevelId: string | null
) {
  if (!announcement.is_published) return false;

  const targets = announcement.announcement_targets ?? [];
  if (targets.length === 0) return true;

  return targets.some(target => {
    if (target.target_type === "school") return true;
    if (target.target_type === "role" && target.target_role === role) return true;
    if (target.target_type === "class" && classId && target.target_id === classId) return true;
    if (target.target_type === "grade_level" && gradeLevelId && target.target_id === gradeLevelId) return true;
    return false;
  });
}

function buildCourseSummaries(
  lessons: Lesson[],
  homework: Homework[],
  tests: MonthlyTest[],
  finalGrades: FinalGrade[],
  assignments: PortalTeacherAssignment[]
) {
  const bySubject = new Map<string, CourseSummary>();

  const ensureCourse = (subjectId: string | null, name: string) => {
    const key = subjectId ?? name;
    let course = bySubject.get(key);
    if (!course) {
      const assignment = assignments.find(row =>
        (subjectId && row.subject_id === subjectId) || row.subjects?.name === name
      );
      course = {
        key,
        subjectId,
        name,
        teacherId: assignment?.teacher_id ?? null,
        teacherName: assignment
          ? formatName({
              first_name: assignment.teacher_profile?.first_name,
              last_name: assignment.teacher_profile?.last_name,
            }, "Teacher")
          : "Teacher",
        lessons: [],
        homework: [],
        tests: [],
        finalGrade: null,
      };
      bySubject.set(key, course);
    }
    return course;
  };

  for (const lesson of lessons) {
    const course = ensureCourse(lesson.subject_id, lesson.subjects?.name ?? "Course");
    course.lessons.push(lesson);
  }

  for (const item of homework) {
    const lesson = lessons.find(row => row.id === item.lesson_id);
    const course = ensureCourse(lesson?.subject_id ?? item.lessons?.subject_id ?? null, lesson?.subjects?.name ?? "Course");
    course.homework.push(item);
  }

  for (const test of tests) {
    const course = ensureCourse(test.subject_id, test.subjects?.name ?? "Course");
    course.tests.push(test);
  }

  for (const grade of finalGrades) {
    const course = ensureCourse(grade.subject_id, grade.subjects?.name ?? "Course");
    course.finalGrade = grade;
  }

  return Array.from(bySubject.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function buildContacts(
  assignments: PortalTeacherAssignment[],
  conversations: Conversation[]
) {
  const merged = new Map<string, ContactListItem>();

  for (const assignment of assignments) {
    const id = assignment.teacher_id;
    if (!merged.has(id)) {
      merged.set(id, {
        id,
        name: formatName({
          first_name: assignment.teacher_profile?.first_name,
          last_name: assignment.teacher_profile?.last_name,
        }, "Teacher"),
        subtitle: assignment.subjects?.name ?? "Class Teacher",
        lastMessage: "",
        lastTime: null,
        unreadCount: 0,
      });
    }
  }

  for (const conversation of conversations) {
    const existing = merged.get(conversation.partnerId);
    const nextValue: ContactListItem = {
      id: conversation.partnerId,
      name:
        existing && shouldPreferFallbackDisplayName(conversation.partnerName)
          ? existing.name
          : conversation.partnerName,
      subtitle: existing?.subtitle ?? "Conversation",
      lastMessage: conversation.lastMessage,
      lastTime: conversation.lastTime,
      unreadCount: conversation.unreadCount,
    };
    merged.set(conversation.partnerId, nextValue);
  }

  return Array.from(merged.values()).sort((left, right) => {
    if (left.lastTime && right.lastTime) {
      return new Date(right.lastTime).getTime() - new Date(left.lastTime).getTime();
    }
    if (left.lastTime) return -1;
    if (right.lastTime) return 1;
    return left.name.localeCompare(right.name);
  });
}

function normalizeQuestions(questions: RunnerQuestion[]) {
  return questions
    .slice()
    .sort((left, right) => left.sort_order - right.sort_order)
    .map(question => ({
      ...question,
      choices: question.choices.slice().sort((left, right) => left.sort_order - right.sort_order),
    }));
}

function renderGradeBadge(grade: string | null | undefined) {
  if (!grade) return <Badge color="gray">Pending</Badge>;
  if (grade.startsWith("A")) return <Badge color="green">{grade}</Badge>;
  if (grade.startsWith("B")) return <Badge color="blue">{grade}</Badge>;
  if (grade.startsWith("C")) return <Badge color="yellow">{grade}</Badge>;
  return <Badge color="gray">{grade}</Badge>;
}

function TimetableGrid({ entries }: { entries: TimetableEntry[] }) {
  if (entries.length === 0) {
    return <EmptyState title="No timetable published" description="Timetable entries from Supabase will appear here once the school publishes them." />;
  }

  const dayMap = new Map<string, { id: string; label: string; day_of_week: number }>();
  const slotMap = new Map<string, { id: string; label: string; start_time: string; end_time: string; sort_order: number }>();

  for (const entry of entries) {
    if (entry.working_days) {
      dayMap.set(entry.working_days.id, entry.working_days);
    }
    if (entry.time_slots) {
      slotMap.set(entry.time_slots.id, entry.time_slots);
    }
  }

  const days = Array.from(dayMap.values()).sort((left, right) => left.day_of_week - right.day_of_week);
  const slots = Array.from(slotMap.values()).sort((left, right) => left.sort_order - right.sort_order);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-auto">
      <table className="w-full min-w-[760px]">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-36">Time</th>
            {days.map(day => (
              <th key={day.id} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                {day.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map(slot => (
            <tr key={slot.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 align-top">
                <p className="text-xs font-semibold text-foreground">{slot.label}</p>
                <p className="text-[11px] text-muted-foreground">{slot.start_time} - {slot.end_time}</p>
              </td>
              {days.map(day => {
                const entry = entries.find(row => row.working_day_id === day.id && row.time_slot_id === slot.id);
                return (
                  <td key={`${day.id}-${slot.id}`} className="px-4 py-3">
                    {entry ? (
                      <div className="rounded-xl bg-secondary px-3 py-2.5">
                        <p className="text-sm font-semibold text-primary">{entry.subjects?.name ?? "Class"}</p>
                        <p className="text-xs text-muted-foreground">{entry.classes?.name ?? ""}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {formatName({
                            first_name: entry.profiles?.first_name,
                            last_name: entry.profiles?.last_name,
                          }, "Teacher")}
                        </p>
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
    </div>
  );
}

function MessageCenter({
  currentUserId,
  contacts,
  conversations,
  selectedPartnerId,
  onSelectPartner,
  draft,
  setDraft,
  onSend,
  sendLabel,
}: {
  currentUserId: string;
  contacts: ContactListItem[];
  conversations: Conversation[];
  selectedPartnerId: string | null;
  onSelectPartner: (partnerId: string) => void;
  draft: string;
  setDraft: (value: string) => void;
  onSend: () => void;
  sendLabel: string;
}) {
  const activeConversation = conversations.find(conversation => conversation.partnerId === selectedPartnerId) ?? null;
  const sortedMessages = activeConversation
    ? activeConversation.messages.slice().sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())
    : [];
  const activeContact = contacts.find(contact => contact.id === selectedPartnerId) ?? null;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden h-[calc(100vh-200px)]">
      <div className="flex h-full">
        <div className="w-72 border-r border-border flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">{sendLabel}</h3>
            <p className="text-xs text-muted-foreground mt-1">Conversations and teacher contacts from Supabase</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contacts.length === 0 && (
              <div className="p-4">
                <EmptyState title="No contacts yet" description="Teacher contacts will appear once subjects are assigned to this class." />
              </div>
            )}
            {contacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => onSelectPartner(contact.id)}
                className={`w-full text-left px-4 py-3 border-b border-border transition-colors ${selectedPartnerId === contact.id ? "bg-secondary" : "hover:bg-muted"}`}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={contact.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{contact.name}</p>
                      {contact.lastTime && <span className="text-[10px] text-muted-foreground">{formatTimeLabel(contact.lastTime)}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{contact.lastMessage || contact.subtitle}</p>
                  </div>
                  {contact.unreadCount > 0 && (
                    <span className="min-w-5 h-5 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                      {contact.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          {activeContact ? (
            <>
              <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                <Avatar name={activeContact.name} size="sm" />
                <div>
                  <p className="text-sm font-bold text-foreground">{activeContact.name}</p>
                  <p className="text-xs text-muted-foreground">{activeContact.subtitle}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-muted/20 space-y-4">
                {sortedMessages.length === 0 && (
                  <EmptyState title="No messages yet" description="Start the conversation and your message will be sent through Supabase." />
                )}
                {sortedMessages.map(message => {
                  const mine = message.sender_id === currentUserId;
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-md rounded-2xl px-4 py-3 shadow-sm ${mine ? "bg-primary text-white rounded-tr-md" : "bg-card text-foreground rounded-tl-md border border-border"}`}>
                        {message.subject && <p className={`text-xs font-semibold mb-1 ${mine ? "text-white/80" : "text-primary"}`}>{message.subject}</p>}
                        <p className="text-sm leading-relaxed">{message.body}</p>
                        <p className={`text-[10px] mt-2 ${mine ? "text-white/70" : "text-muted-foreground"}`}>{formatDateTime(message.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-3">
                  <input
                    value={draft}
                    onChange={event => setDraft(event.target.value)}
                    placeholder="Type your message"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Btn icon={<Send className="w-4 h-4" />} onClick={onSend}>Send</Btn>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState title="Select a conversation" description="Choose a teacher contact to read messages or send a new one." />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssessmentRunner({
  title,
  subtitle,
  questions,
  answers,
  currentIndex,
  setCurrentIndex,
  secondsRemaining,
  draftSavedAt,
  reviewMode,
  setReviewMode,
  onAnswer,
  onBack,
  onSubmit,
  submitting,
  submitLabel,
}: {
  title: string;
  subtitle: string;
  questions: RunnerQuestion[];
  answers: Record<string, string>;
  currentIndex: number;
  setCurrentIndex: (value: number) => void;
  secondsRemaining: number;
  draftSavedAt: string;
  reviewMode: boolean;
  setReviewMode: (value: boolean) => void;
  onAnswer: (questionId: string, choiceId: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const normalizedQuestions = normalizeQuestions(questions);

  if (normalizedQuestions.length === 0) {
    return <EmptyState title="No questions found" description="This assessment does not have any questions published yet." />;
  }

  const question = normalizedQuestions[currentIndex];
  const minutes = String(Math.floor(secondsRemaining / 60)).padStart(2, "0");
  const seconds = String(secondsRemaining % 60).padStart(2, "0");

  if (reviewMode) {
    return (
      <div className="max-w-3xl mx-auto bg-card rounded-2xl border border-border shadow-sm p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {Object.keys(answers).length} of {normalizedQuestions.length} questions answered.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {normalizedQuestions.map((item, index) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentIndex(index);
                setReviewMode(false);
              }}
              className={`rounded-xl border p-3 text-left text-sm font-semibold ${answers[item.id] ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
            >
              Question {index + 1}: {answers[item.id] ? "Answered" : "Missing"}
            </button>
          ))}
        </div>
        <div className="flex justify-between gap-3">
          <Btn variant="secondary" onClick={() => setReviewMode(false)}>Back to questions</Btn>
          <Btn onClick={onSubmit} disabled={submitting}>{submitting ? "Submitting..." : submitLabel}</Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors">
          <ChevronLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground truncate">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-primary">{minutes}:{seconds}</p>
          <p className="text-[11px] text-muted-foreground">Draft saved {draftSavedAt || "now"}</p>
        </div>
      </div>
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <span className="text-sm font-semibold text-muted-foreground">
            Question {currentIndex + 1} of {normalizedQuestions.length}
          </span>
          <div className="flex-1 h-2 bg-muted rounded-full">
            <div className="h-2 bg-primary rounded-full transition-all" style={{ width: `${((currentIndex + 1) / normalizedQuestions.length) * 100}%` }} />
          </div>
        </div>
        <h3 className="text-base font-bold text-foreground mb-5">{question.question_text}</h3>
        <div className="space-y-3">
          {question.choices.map(choice => {
            const selected = answers[question.id] === choice.id;
            return (
              <button
                key={choice.id}
                onClick={() => onAnswer(question.id, choice.id)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${selected ? "border-primary bg-secondary text-primary" : "border-border hover:border-primary/40 text-foreground"}`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                  {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className="text-sm font-medium">{choice.choice_text}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-3 mt-6">
          <Btn variant="secondary" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>
            Previous
          </Btn>
          {currentIndex < normalizedQuestions.length - 1 ? (
            <Btn icon={<ChevronRight className="w-4 h-4" />} onClick={() => setCurrentIndex(currentIndex + 1)}>
              Next
            </Btn>
          ) : (
            <Btn onClick={() => setReviewMode(true)}>Review answers</Btn>
          )}
        </div>
      </div>
    </div>
  );
}

export function StudentPortal({ view, setView, onLogout, schoolId, user }: StudentPortalProps) {
  const userId = user?.id ?? null;
  const profileQuery = useProfile(userId);
  const enrollmentQuery = useStudentEnrollment(schoolId, userId);
  const classId = enrollmentQuery.enrollment?.class_id ?? null;
  const gradeLevelId = enrollmentQuery.enrollment?.classes?.grade_level_id ?? null;
  const academicYearId = enrollmentQuery.enrollment?.classes?.academic_year_id ?? null;

  const assignmentsQuery = useClassTeacherAssignments(schoolId, classId);
  const lessonsQuery = useLessons({ schoolId, classId, studentId: userId });
  const homeworkQuery = useHomework({ schoolId, classId, studentId: userId });
  const testsQuery = useTests({ schoolId, classId, studentId: userId, kind: "monthly" });
  const gradesQuery = useFinalGrades({ schoolId, classId, studentId: userId, academicYearId });
  const attendanceQuery = useAttendance({ schoolId, studentId: userId });
  const announcementsQuery = useAnnouncements(schoolId);
  const timetableQuery = useTimetable(schoolId, { classId: classId ?? undefined, academicYearId: academicYearId ?? undefined });
  const messagesQuery = useMessages(userId, schoolId);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [selectedCourseKey, setSelectedCourseKey] = useState<string | null>(null);
  const [courseTab, setCourseTab] = useState<"lessons" | "homework" | "tests" | "grades">("lessons");
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [testCourseFilter, setTestCourseFilter] = useState("All");
  const [testMonthFilter, setTestMonthFilter] = useState("All");
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<Record<string, string>>({});
  const [testQuestionIndex, setTestQuestionIndex] = useState(0);
  const [testReviewMode, setTestReviewMode] = useState(false);
  const [testSeconds, setTestSeconds] = useState(45 * 60);
  const [testDraftSavedAt, setTestDraftSavedAt] = useState("");
  const [submittingTest, setSubmittingTest] = useState(false);
  const [activeHomeworkId, setActiveHomeworkId] = useState<string | null>(null);
  const [homeworkAnswers, setHomeworkAnswers] = useState<Record<string, string>>({});
  const [homeworkQuestionIndex, setHomeworkQuestionIndex] = useState(0);
  const [homeworkReviewMode, setHomeworkReviewMode] = useState(false);
  const [homeworkSeconds, setHomeworkSeconds] = useState(30 * 60);
  const [homeworkDraftSavedAt, setHomeworkDraftSavedAt] = useState("");
  const [submittingHomework, setSubmittingHomework] = useState(false);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const announcements = announcementsQuery.announcements.filter(item =>
    isAnnouncementVisible(item, "student", classId, gradeLevelId)
  );
  const courses = buildCourseSummaries(
    lessonsQuery.lessons,
    homeworkQuery.homework,
    testsQuery.tests,
    gradesQuery.grades,
    assignmentsQuery.assignments
  );
  const selectedCourse = selectedCourseKey ? courses.find(course => course.key === selectedCourseKey) ?? null : null;
  const selectedLesson = selectedCourse?.lessons.find(lesson => lesson.id === selectedLessonId) ?? null;
  const selectedLessonVideoSource =
    selectedLesson?.video_url ??
    selectedLesson?.lesson_attachments?.find(
      attachment =>
        attachment.file_kind?.toLowerCase().includes("video") ||
        /\.(mp4|webm|ogg|mov|m4v)(?:[?#].*)?$/i.test(attachment.file_url),
    )?.file_url ??
    null;
  const selectedLessonVideoUrl = useStorageObjectUrl("lesson-attachments", selectedLessonVideoSource);
  const selectedLessonAttachmentUrls = useStorageObjectUrlMap(
    "lesson-attachments",
    (selectedLesson?.lesson_attachments ?? []).map((attachment) => attachment.file_url),
  );
  const teacherContacts = buildContacts(assignmentsQuery.assignments, messagesQuery.conversations);
  const activeConversation = messagesQuery.conversations.find(conversation => conversation.partnerId === selectedPartnerId) ?? null;
  const pendingHomework = homeworkQuery.homework.filter(item => !getHomeworkSubmission(item, userId));
  const testsThisMonth = testsQuery.tests.filter(item => {
    const date = new Date(item.test_date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  const finalGradeScores = gradesQuery.grades
    .map(item => item.grade_value)
    .filter((value): value is number => value != null);
  const submissionScores = [
    ...homeworkQuery.homework
      .map(item => getHomeworkSubmission(item, userId)?.score)
      .filter((value): value is number => value != null),
    ...testsQuery.tests
      .map(item => getTestSubmission(item, userId)?.score)
      .filter((value): value is number => value != null),
  ];
  const overallAverage = average(finalGradeScores) ?? average(submissionScores);
  const overallGrade = scoreToLetter(overallAverage);
  const completedLessons = lessonsQuery.lessons.filter(lesson => lesson.student_lesson_progress?.some(row => row.completed_at)).length;
  const attendancePresent = attendanceQuery.records.filter(record => record.status === "present" || record.status === "late").length;
  const attendanceRate = attendanceQuery.records.length > 0
    ? Math.round((attendancePresent / attendanceQuery.records.length) * 100)
    : 0;
  const performanceTrend = buildScoreTrend([
    ...homeworkQuery.homework.map(item => ({
      date: getHomeworkSubmission(item, userId)?.submitted_at ?? item.due_date,
      score: getHomeworkSubmission(item, userId)?.score ?? null,
    })),
    ...testsQuery.tests.map(item => ({
      date: getTestSubmission(item, userId)?.submitted_at ?? item.test_date,
      score: getTestSubmission(item, userId)?.score ?? null,
    })),
  ]);
  const activeTest = testsQuery.tests.find(item => item.id === activeTestId) ?? null;
  const activeHomework = homeworkQuery.homework.find(item => item.id === activeHomeworkId) ?? null;
  const activeTestQuestions: RunnerQuestion[] = normalizeQuestions(
    (activeTest?.test_questions ?? []).map(question => ({
      id: question.id,
      question_text: question.question_text,
      sort_order: question.sort_order,
      choices: (question.test_choices ?? []).map(choice => ({
        id: choice.id,
        choice_text: choice.choice_text,
        sort_order: choice.sort_order,
      })),
    }))
  );
  const activeHomeworkQuestions: RunnerQuestion[] = normalizeQuestions(
    (activeHomework?.homework_questions ?? []).map(question => ({
      id: question.id,
      question_text: question.question_text,
      sort_order: question.sort_order,
      choices: (question.homework_choices ?? []).map(choice => ({
        id: choice.id,
        choice_text: choice.choice_text,
        sort_order: choice.sort_order,
      })),
    }))
  );

  useEffect(() => {
    if (!selectedPartnerId && teacherContacts.length > 0) {
      setSelectedPartnerId(teacherContacts[0].id);
    }
  }, [selectedPartnerId, teacherContacts]);

  useEffect(() => {
    if (!activeConversation || !userId) return;
    const unreadMessages = activeConversation.messages.filter(message =>
      message.sender_id !== userId && (message.message_recipients ?? []).some(recipient => recipient.recipient_id === userId && !recipient.is_read)
    );
    if (unreadMessages.length === 0) return;
    Promise.all(unreadMessages.map(message => messagesQuery.markAsRead(message.id))).catch(() => null);
  }, [activeConversation, messagesQuery, userId]);

  useEffect(() => {
    if (!activeTestId || testReviewMode) return;
    const timerId = window.setInterval(() => {
      setTestSeconds(value => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [activeTestId, testReviewMode]);

  useEffect(() => {
    if (!activeTestId) return;
    window.localStorage.setItem(`nibras-live-test-${activeTestId}`, JSON.stringify({
      answers: testAnswers,
      currentIndex: testQuestionIndex,
      secondsRemaining: testSeconds,
    }));
    setTestDraftSavedAt(formatTimeLabel(new Date().toISOString()));
  }, [activeTestId, testAnswers, testQuestionIndex, testSeconds]);

  useEffect(() => {
    if (activeTestId && testSeconds === 0 && !testReviewMode) {
      setTestReviewMode(true);
      showToast("Time is up. Review and submit your test.", "error");
    }
  }, [activeTestId, showToast, testReviewMode, testSeconds]);

  useEffect(() => {
    if (!activeHomeworkId || homeworkReviewMode) return;
    const timerId = window.setInterval(() => {
      setHomeworkSeconds(value => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [activeHomeworkId, homeworkReviewMode]);

  useEffect(() => {
    if (!activeHomeworkId) return;
    window.localStorage.setItem(`nibras-live-homework-${activeHomeworkId}`, JSON.stringify({
      answers: homeworkAnswers,
      currentIndex: homeworkQuestionIndex,
      secondsRemaining: homeworkSeconds,
    }));
    setHomeworkDraftSavedAt(formatTimeLabel(new Date().toISOString()));
  }, [activeHomeworkAnswersKey(activeHomeworkId), activeHomeworkId, homeworkAnswers, homeworkQuestionIndex, homeworkSeconds]);

  useEffect(() => {
    if (activeHomeworkId && homeworkSeconds === 0 && !homeworkReviewMode) {
      setHomeworkReviewMode(true);
      showToast("Time is up. Review and submit your homework.", "error");
    }
  }, [activeHomeworkId, homeworkReviewMode, homeworkSeconds, showToast]);

  const handleOpenCourse = (courseKey: string) => {
    setSelectedCourseKey(courseKey);
    setCourseTab("lessons");
    setSelectedLessonId(null);
  };

  const handleMarkLessonComplete = async (lessonId: string) => {
    if (!schoolId || !userId) return;
    const result = await lessonsQuery.markComplete(lessonId, userId, schoolId);
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    await lessonsQuery.fetchLessons();
    showToast("Lesson marked as completed.");
  };

  const handleStartTest = (testId: string) => {
    const test = testsQuery.tests.find(item => item.id === testId);
    if (!test || (test.test_questions?.length ?? 0) === 0) {
      showToast("This test has no questions yet.", "error");
      return;
    }
    const draft = JSON.parse(window.localStorage.getItem(`nibras-live-test-${testId}`) || "null") as {
      answers?: Record<string, string>;
      currentIndex?: number;
      secondsRemaining?: number;
    } | null;
    setActiveTestId(testId);
    setTestAnswers(draft?.answers ?? {});
    setTestQuestionIndex(draft?.currentIndex ?? 0);
    setTestReviewMode(false);
    setTestSeconds(draft?.secondsRemaining ?? (test.duration_minutes || 45) * 60);
  };

  const handleSubmitTest = async () => {
    if (!activeTest || !userId) return;
    setSubmittingTest(true);
    const result = await testsQuery.submitTest({
      test_id: activeTest.id,
      student_id: userId,
      answers: activeTestQuestions.map(question => ({
        question_id: question.id,
        selected_choice_id: testAnswers[question.id] ?? null,
      })),
    });
    setSubmittingTest(false);
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    await testsQuery.fetchTests();
    window.localStorage.removeItem(`nibras-live-test-${activeTest.id}`);
    setActiveTestId(null);
    setTestAnswers({});
    setTestQuestionIndex(0);
    setTestReviewMode(false);
    setTestSeconds(45 * 60);
    showToast("Test submitted successfully.");
  };

  const handleStartHomework = (homeworkId: string) => {
    const item = homeworkQuery.homework.find(row => row.id === homeworkId);
    if (!item || (item.homework_questions?.length ?? 0) === 0) {
      showToast("This homework has no questions yet.", "error");
      return;
    }
    const draft = JSON.parse(window.localStorage.getItem(`nibras-live-homework-${homeworkId}`) || "null") as {
      answers?: Record<string, string>;
      currentIndex?: number;
      secondsRemaining?: number;
    } | null;
    setActiveHomeworkId(homeworkId);
    setHomeworkAnswers(draft?.answers ?? {});
    setHomeworkQuestionIndex(draft?.currentIndex ?? 0);
    setHomeworkReviewMode(false);
    setHomeworkSeconds(draft?.secondsRemaining ?? 30 * 60);
  };

  const handleSubmitHomework = async () => {
    if (!activeHomework || !userId) return;
    setSubmittingHomework(true);
    const result = await homeworkQuery.submitHomework({
      homework_id: activeHomework.id,
      student_id: userId,
      answers: activeHomeworkQuestions.map(question => ({
        question_id: question.id,
        selected_choice_id: homeworkAnswers[question.id] ?? null,
      })),
    });
    setSubmittingHomework(false);
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    await homeworkQuery.fetchHomework();
    window.localStorage.removeItem(`nibras-live-homework-${activeHomework.id}`);
    setActiveHomeworkId(null);
    setHomeworkAnswers({});
    setHomeworkQuestionIndex(0);
    setHomeworkReviewMode(false);
    setHomeworkSeconds(30 * 60);
    showToast("Homework submitted successfully.");
  };

  const handleSendMessage = async () => {
    if (!selectedPartnerId || !messageDraft.trim()) {
      showToast("Write a message before sending.", "error");
      return;
    }
    const result = await messagesQuery.sendMessage(selectedPartnerId, messageDraft.trim());
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    setMessageDraft("");
    showToast("Message sent.");
  };

  const filteredTests = testsQuery.tests.filter(item => {
    const subjectName = item.subjects?.name ?? "Course";
    const monthName = new Date(item.test_date).toLocaleDateString(undefined, { month: "long" });
    const courseMatch = testCourseFilter === "All" || subjectName === testCourseFilter;
    const monthMatch = testMonthFilter === "All" || monthName === testMonthFilter;
    return courseMatch && monthMatch;
  });

  const studentName = profileQuery.displayName || user?.email || "Student";
  const studentRole = enrollmentQuery.enrollment?.classes?.name
    ? `Student - ${enrollmentQuery.enrollment.classes.name}`
    : "Student";

  if (!userId || !schoolId) {
    return <LoadingState label="Connecting your student portal..." />;
  }

  if (profileQuery.loading || enrollmentQuery.loading) {
    return <LoadingState label="Loading your student data from Supabase..." />;
  }

  return (
    <>
      <AppShell
        navItems={STUDENT_NAV}
        activeView={view}
        onSelect={setView}
        onLogout={onLogout}
        headerTitle={{
          dashboard: "My Dashboard",
          courses: selectedCourse ? selectedCourse.name : "My Courses",
          tests: "Monthly Tests",
          grades: "Final Grades",
          timetable: "Timetable",
          announcements: "Announcements",
          messages: "Messages",
        }[view] ?? "Student Portal"}
        userName={studentName}
        userRole={studentRole}
        userId={userId}
      >
        {!classId && (
          <EmptyState
            title="No active enrollment found"
            description="This student account is connected, but there is no active class enrollment yet in Supabase."
          />
        )}

        {classId && activeTest && (
          <AssessmentRunner
            title={activeTest.title}
            subtitle={`${activeTest.subjects?.name ?? "Course"} - ${formatDate(activeTest.test_date)}`}
            questions={activeTestQuestions}
            answers={testAnswers}
            currentIndex={testQuestionIndex}
            setCurrentIndex={setTestQuestionIndex}
            secondsRemaining={testSeconds}
            draftSavedAt={testDraftSavedAt}
            reviewMode={testReviewMode}
            setReviewMode={setTestReviewMode}
            onAnswer={(questionId, choiceId) => setTestAnswers(previous => ({ ...previous, [questionId]: choiceId }))}
            onBack={() => {
              setActiveTestId(null);
              setTestReviewMode(false);
            }}
            onSubmit={handleSubmitTest}
            submitting={submittingTest}
            submitLabel="Submit test"
          />
        )}

        {classId && !activeTest && activeHomework && (
          <AssessmentRunner
            title={activeHomework.title}
            subtitle={`Due ${formatDate(activeHomework.due_date)}`}
            questions={activeHomeworkQuestions}
            answers={homeworkAnswers}
            currentIndex={homeworkQuestionIndex}
            setCurrentIndex={setHomeworkQuestionIndex}
            secondsRemaining={homeworkSeconds}
            draftSavedAt={homeworkDraftSavedAt}
            reviewMode={homeworkReviewMode}
            setReviewMode={setHomeworkReviewMode}
            onAnswer={(questionId, choiceId) => setHomeworkAnswers(previous => ({ ...previous, [questionId]: choiceId }))}
            onBack={() => {
              setActiveHomeworkId(null);
              setHomeworkReviewMode(false);
            }}
            onSubmit={handleSubmitHomework}
            submitting={submittingHomework}
            submitLabel="Submit homework"
          />
        )}

        {classId && !activeTest && !activeHomework && view === "dashboard" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<BookOpen className="w-5 h-5" />} label="My Courses" value={String(courses.length)} color="#7C5CBF" />
              <StatCard icon={<ClipboardList className="w-5 h-5" />} label="Pending Homework" value={String(pendingHomework.length)} color="#F59E0B" />
              <StatCard icon={<FileText className="w-5 h-5" />} label="Tests This Month" value={String(testsThisMonth.length)} color="#3B82F6" />
              <StatCard icon={<Award className="w-5 h-5" />} label="Overall Grade" value={overallGrade} color="#10B981" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-card rounded-2xl p-5 border border-border shadow-sm">
                <h3 className="font-bold text-foreground mb-4">Performance Trend</h3>
                {performanceTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={performanceTrend}>
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "none" }} />
                      <Line type="monotone" dataKey="score" stroke="#7C5CBF" strokeWidth={2.5} dot={{ fill: "#7C5CBF", r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState title="No scored submissions yet" description="Homework and test scores from Supabase will populate your progress trend." />
                )}
              </div>
              <div className="space-y-4">
                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                  <h4 className="font-bold text-foreground text-sm mb-3">Upcoming Homework</h4>
                  <div className="space-y-3">
                    {pendingHomework.slice(0, 3).map(item => (
                      <div key={item.id} className="p-3 bg-muted rounded-xl">
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">Due {formatDate(item.due_date)}</p>
                      </div>
                    ))}
                    {pendingHomework.length === 0 && (
                      <p className="text-sm text-muted-foreground">No pending homework.</p>
                    )}
                  </div>
                </div>
                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Attendance Rate</span>
                    <span className="text-lg font-bold text-primary">{attendanceRate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Completed Lessons</span>
                    <span className="text-sm font-semibold text-foreground">{completedLessons}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Unread Messages</span>
                    <span className="text-sm font-semibold text-foreground">{messagesQuery.totalUnread}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Announcements</span>
                    <span className="text-sm font-semibold text-foreground">{announcements.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {classId && !activeTest && !activeHomework && view === "courses" && !selectedCourse && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {courses.map(course => {
              const averageScore = average([
                ...course.homework
                  .map(item => getHomeworkSubmission(item, userId)?.score)
                  .filter((value): value is number => value != null),
                ...course.tests
                  .map(item => getTestSubmission(item, userId)?.score)
                  .filter((value): value is number => value != null),
              ]);
              return (
                <button
                  key={course.key}
                  onClick={() => handleOpenCourse(course.key)}
                  className="bg-card rounded-2xl border border-border shadow-sm p-5 text-left hover:-translate-y-0.5 hover:shadow-md transition-all"
                >
                  <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                    <GraduationCap className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1">{course.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4">{course.teacherName}</p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-muted px-3 py-2">
                      <p className="font-bold text-foreground">{course.lessons.length}</p>
                      <p className="text-muted-foreground mt-1">Lessons</p>
                    </div>
                    <div className="rounded-xl bg-muted px-3 py-2">
                      <p className="font-bold text-foreground">{course.homework.length}</p>
                      <p className="text-muted-foreground mt-1">Homework</p>
                    </div>
                    <div className="rounded-xl bg-muted px-3 py-2">
                      <p className="font-bold text-foreground">{averageScore != null ? `${Math.round(averageScore)}%` : "-"}</p>
                      <p className="text-muted-foreground mt-1">Average</p>
                    </div>
                  </div>
                </button>
              );
            })}
            {courses.length === 0 && (
              <div className="col-span-full">
                <EmptyState title="No courses found" description="Lessons, tests, and grades from Supabase will build the course list automatically." />
              </div>
            )}
          </div>
        )}

        {classId && !activeTest && !activeHomework && view === "courses" && selectedCourse && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedCourseKey(null)} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors">
                <ChevronLeft className="w-4 h-4 text-foreground" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-foreground">{selectedCourse.name}</h2>
                <p className="text-xs text-muted-foreground">{selectedCourse.teacherName}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-b border-border">
              {(["lessons", "homework", "tests", "grades"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setCourseTab(tab)}
                  className={`px-4 py-2 text-sm font-semibold capitalize border-b-2 -mb-px transition-colors ${courseTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {courseTab === "lessons" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedCourse.lessons.map(lesson => {
                    const completed = lesson.student_lesson_progress?.some(row => row.completed_at);
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setSelectedLessonId(lesson.id)}
                        className={`bg-card rounded-2xl border shadow-sm p-5 text-left transition-all ${selectedLessonId === lesson.id ? "border-primary" : "border-border hover:border-primary/40"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-bold text-foreground">{lesson.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1">{formatDate(lesson.lesson_date)}</p>
                          </div>
                          {completed ? <Badge color="green">Completed</Badge> : <Badge color="blue">Available</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{lesson.description || "Lesson details are available from Supabase."}</p>
                      </button>
                    );
                  })}
                </div>
                {selectedCourse.lessons.length === 0 && (
                  <EmptyState title="No lessons published" description="Lessons created for this subject will appear here." />
                )}
                {selectedLesson && (
                  <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{selectedLesson.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{formatDate(selectedLesson.lesson_date)}</p>
                      </div>
                      <div className="flex gap-3">
                        {selectedLessonVideoUrl && (
                          <a href={selectedLessonVideoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-primary text-sm font-semibold hover:brightness-95">
                            <PlayCircle className="w-4 h-4" />
                            Watch video
                          </a>
                        )}
                        <Btn onClick={() => handleMarkLessonComplete(selectedLesson.id)}>Mark complete</Btn>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedLesson.description || "No description was added for this lesson yet."}</p>
                    <div>
                      <h4 className="text-sm font-bold text-foreground mb-3">Attachments</h4>
                      <div className="space-y-2">
                        {selectedLesson.lesson_attachments?.map(attachment => (
                          <a key={attachment.id} href={selectedLessonAttachmentUrls[attachment.file_url] ?? "#"} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-border px-4 py-3 hover:bg-muted transition-colors" onClick={event => {
                            if (!selectedLessonAttachmentUrls[attachment.file_url]) {
                              event.preventDefault();
                            }
                          }}>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{attachment.file_name}</p>
                              <p className="text-xs text-muted-foreground mt-1">{attachment.file_kind}</p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </a>
                        ))}
                        {(!selectedLesson.lesson_attachments || selectedLesson.lesson_attachments.length === 0) && (
                          <p className="text-sm text-muted-foreground">No attachments uploaded for this lesson.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {courseTab === "homework" && (
              <div className="space-y-4">
                {selectedCourse.homework.map(item => {
                  const submission = getHomeworkSubmission(item, userId);
                  return (
                    <div key={item.id} className="bg-card rounded-2xl border border-border shadow-sm p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {submission ? <Badge color="green">Submitted</Badge> : <Badge color="yellow">Pending</Badge>}
                            <Badge color="purple">{item.homework_questions?.length ?? 0} Questions</Badge>
                          </div>
                          <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                          <p className="text-xs text-muted-foreground mt-2">Due {formatDate(item.due_date)}</p>
                        </div>
                        {submission ? (
                          <div className="text-right shrink-0">
                            <p className="text-2xl font-bold text-primary">{submission.score != null ? `${Math.round(submission.score)}%` : "Pending"}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatDate(submission.submitted_at)}</p>
                          </div>
                        ) : (
                          <Btn onClick={() => handleStartHomework(item.id)}>Open</Btn>
                        )}
                      </div>
                    </div>
                  );
                })}
                {selectedCourse.homework.length === 0 && (
                  <EmptyState title="No homework assigned" description="Homework created in Supabase for this subject will appear here." />
                )}
              </div>
            )}

            {courseTab === "tests" && (
              <div className="space-y-4">
                {selectedCourse.tests.map(item => {
                  const submission = getTestSubmission(item, userId);
                  return (
                    <div key={item.id} className="bg-card rounded-2xl border border-border shadow-sm p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {submission ? <Badge color="green">Completed</Badge> : <Badge color="blue">Available</Badge>}
                            <Badge color="purple">{item.duration_minutes} mins</Badge>
                          </div>
                          <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                          <p className="text-xs text-muted-foreground mt-2">{formatDate(item.test_date)} - {item.test_questions?.length ?? 0} questions</p>
                        </div>
                        {submission ? (
                          <div className="text-right shrink-0">
                            <p className="text-2xl font-bold text-primary">{submission.score != null ? `${Math.round(submission.score)}%` : "Pending"}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatDate(submission.submitted_at)}</p>
                          </div>
                        ) : (
                          <Btn onClick={() => handleStartTest(item.id)}>Start test</Btn>
                        )}
                      </div>
                    </div>
                  );
                })}
                {selectedCourse.tests.length === 0 && (
                  <EmptyState title="No tests scheduled" description="Monthly tests for this subject will appear here once they are published." />
                )}
              </div>
            )}

            {courseTab === "grades" && (
              <div className="space-y-4">
                {selectedCourse.finalGrade ? (
                  <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{selectedCourse.name} final grade</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Status: {selectedCourse.finalGrade.status}
                        </p>
                      </div>
                      {renderGradeBadge(selectedCourse.finalGrade.grade_letter || scoreToLetter(selectedCourse.finalGrade.grade_value))}
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-5">
                      <div className="rounded-2xl bg-muted px-4 py-4">
                        <p className="text-xs text-muted-foreground">Score</p>
                        <p className="text-2xl font-bold text-foreground mt-1">{selectedCourse.finalGrade.grade_value ?? "-"}</p>
                      </div>
                      <div className="rounded-2xl bg-muted px-4 py-4">
                        <p className="text-xs text-muted-foreground">GPA</p>
                        <p className="text-2xl font-bold text-foreground mt-1">{scoreToGpa(selectedCourse.finalGrade.grade_value)}</p>
                      </div>
                      <div className="rounded-2xl bg-muted px-4 py-4">
                        <p className="text-xs text-muted-foreground">Remarks</p>
                        <p className="text-sm font-semibold text-foreground mt-2">{selectedCourse.finalGrade.remarks || "No remarks added"}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState title="No final grade yet" description="Approved final grades from Supabase will appear here once they are entered." />
                )}
              </div>
            )}
          </div>
        )}

        {classId && !activeTest && !activeHomework && view === "tests" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-card rounded-xl border border-border px-3 py-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <select value={testCourseFilter} onChange={event => setTestCourseFilter(event.target.value)} className="text-sm font-medium text-foreground bg-transparent outline-none cursor-pointer">
                  <option value="All">All Courses</option>
                  {courses.map(course => <option key={course.key} value={course.name}>{course.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 bg-card rounded-xl border border-border px-3 py-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <select value={testMonthFilter} onChange={event => setTestMonthFilter(event.target.value)} className="text-sm font-medium text-foreground bg-transparent outline-none cursor-pointer">
                  <option value="All">All Months</option>
                  {Array.from(new Set(testsQuery.tests.map(item => new Date(item.test_date).toLocaleDateString(undefined, { month: "long" })))).map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-4">
              {filteredTests.map(item => {
                const submission = getTestSubmission(item, userId);
                return (
                  <div key={item.id} className="bg-card rounded-2xl border border-border shadow-sm p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge color="purple">{item.subjects?.name ?? "Course"}</Badge>
                          {submission ? <Badge color="green">Completed</Badge> : <Badge color="blue">Available</Badge>}
                        </div>
                        <h3 className="font-bold text-foreground">{item.title}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-2">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(item.test_date)}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.duration_minutes} mins</span>
                          <span>{item.test_questions?.length ?? 0} questions</span>
                        </div>
                      </div>
                      {submission ? (
                        <div className="text-center shrink-0">
                          <p className="text-2xl font-bold text-primary">{submission.score != null ? `${Math.round(submission.score)}%` : "Pending"}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(submission.submitted_at)}</p>
                        </div>
                      ) : (
                        <Btn icon={<PlayCircle className="w-4 h-4" />} onClick={() => handleStartTest(item.id)}>Start test</Btn>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredTests.length === 0 && (
                <EmptyState title="No tests found" description="Try another course or month filter, or publish a new test in Supabase." />
              )}
            </div>
          </div>
        )}

        {classId && !activeTest && !activeHomework && view === "grades" && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <StatCard icon={<Award className="w-5 h-5" />} label="Average GPA" value={scoreToGpa(overallAverage)} color="#7C5CBF" />
              <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Scored Subjects" value={String(finalGradeScores.length)} color="#3B82F6" />
              <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Approved Grades" value={String(gradesQuery.grades.filter(item => item.status === "approved").length)} color="#10B981" />
            </div>
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-sm font-bold text-foreground">Final Grades</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px]">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      {["Course", "Score", "GPA", "Grade", "Status"].map(header => (
                        <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gradesQuery.grades.map(item => {
                      const score = item.grade_value ?? null;
                      const gradeLabel = item.grade_letter || scoreToLetter(score);
                      return (
                        <tr key={item.id} className="border-b border-border last:border-0">
                          <td className="px-6 py-4 text-sm font-semibold text-foreground">{item.subjects?.name ?? "Course"}</td>
                          <td className="px-6 py-4 text-sm text-foreground">{score ?? "-"}</td>
                          <td className="px-6 py-4 text-sm text-foreground">{scoreToGpa(score)}</td>
                          <td className="px-6 py-4">{renderGradeBadge(gradeLabel)}</td>
                          <td className="px-6 py-4 text-sm capitalize text-muted-foreground">{item.status}</td>
                        </tr>
                      );
                    })}
                    {gradesQuery.grades.length === 0 && (
                      <tr>
                        <td className="px-6 py-10" colSpan={5}>
                          <EmptyState title="No grades available" description="Final grades from Supabase will appear here when teachers submit them." />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {classId && !activeTest && !activeHomework && view === "timetable" && (
          <TimetableGrid entries={timetableQuery.entries} />
        )}

        {classId && !activeTest && !activeHomework && view === "announcements" && (
          <div className="space-y-4">
            {announcements.map(item => (
              <div key={item.id} className="bg-card rounded-2xl border border-border shadow-sm p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <Megaphone className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(item.published_at || item.created_at)} - {formatName({
                      first_name: item.profiles?.first_name,
                      last_name: item.profiles?.last_name,
                    }, "School Admin")}
                  </span>
                </div>
                <h3 className="font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            ))}
            {announcements.length === 0 && (
              <EmptyState title="No announcements yet" description="Published announcements targeted to this student will appear here." />
            )}
          </div>
        )}

        {classId && !activeTest && !activeHomework && view === "messages" && (
          <MessageCenter
            currentUserId={userId}
            contacts={teacherContacts}
            conversations={messagesQuery.conversations}
            selectedPartnerId={selectedPartnerId}
            onSelectPartner={setSelectedPartnerId}
            draft={messageDraft}
            setDraft={setMessageDraft}
            onSend={handleSendMessage}
            sendLabel="Teacher Messages"
          />
        )}
      </AppShell>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}

export function ParentPortal({ view, setView, onLogout, schoolId, user }: ParentPortalProps) {
  const userId = user?.id ?? null;
  const profileQuery = useProfile(userId);
  const childrenQuery = useParentChildren(userId, schoolId);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const selectedChild = childrenQuery.children.find(child => child.student_id === selectedChildId) ?? childrenQuery.children[0] ?? null;

  const assignmentsQuery = useClassTeacherAssignments(schoolId, selectedChild?.class_id ?? null);
  const homeworkQuery = useHomework({ schoolId, classId: selectedChild?.class_id ?? null, studentId: selectedChild?.student_id ?? null });
  const testsQuery = useTests({ schoolId, classId: selectedChild?.class_id ?? null, studentId: selectedChild?.student_id ?? null, kind: "monthly" });
  const gradesQuery = useFinalGrades({
    schoolId,
    classId: selectedChild?.class_id ?? null,
    studentId: selectedChild?.student_id ?? null,
    academicYearId: selectedChild?.academic_year_id ?? null,
  });
  const attendanceQuery = useAttendance({ schoolId, studentId: selectedChild?.student_id ?? null });
  const announcementsQuery = useAnnouncements(schoolId);
  const messagesQuery = useMessages(userId, schoolId);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    if (!selectedChildId && childrenQuery.children.length > 0) {
      setSelectedChildId(childrenQuery.children[0].student_id);
    }
  }, [childrenQuery.children, selectedChildId]);

  const announcements = announcementsQuery.announcements.filter(item =>
    isAnnouncementVisible(item, "parent", selectedChild?.class_id ?? null, selectedChild?.grade_level_id ?? null)
  );
  const contacts = buildContacts(assignmentsQuery.assignments, messagesQuery.conversations);
  const activeConversation = messagesQuery.conversations.find(conversation => conversation.partnerId === selectedPartnerId) ?? null;

  useEffect(() => {
    if (!selectedPartnerId && contacts.length > 0) {
      setSelectedPartnerId(contacts[0].id);
    }
  }, [contacts, selectedPartnerId]);

  useEffect(() => {
    if (!activeConversation || !userId) return;
    const unreadMessages = activeConversation.messages.filter(message =>
      message.sender_id !== userId && (message.message_recipients ?? []).some(recipient => recipient.recipient_id === userId && !recipient.is_read)
    );
    if (unreadMessages.length === 0) return;
    Promise.all(unreadMessages.map(message => messagesQuery.markAsRead(message.id))).catch(() => null);
  }, [activeConversation, messagesQuery, userId]);

  const childHomework = homeworkQuery.homework.map(item => ({
    item,
    submission: getHomeworkSubmission(item, selectedChild?.student_id ?? null),
  }));
  const childTests = testsQuery.tests.map(item => ({
    item,
    submission: getTestSubmission(item, selectedChild?.student_id ?? null),
  }));
  const gradeScores = gradesQuery.grades.map(item => item.grade_value).filter((value): value is number => value != null);
  const overallAverage = average(gradeScores) ?? average([
    ...childHomework.map(entry => entry.submission?.score).filter((value): value is number => value != null),
    ...childTests.map(entry => entry.submission?.score).filter((value): value is number => value != null),
  ]);
  const overallGrade = scoreToLetter(overallAverage);
  const attendancePresent = attendanceQuery.records.filter(record => record.status === "present" || record.status === "late").length;
  const attendanceRate = attendanceQuery.records.length > 0
    ? Math.round((attendancePresent / attendanceQuery.records.length) * 100)
    : 0;
  const performanceTrend = buildScoreTrend([
    ...childHomework.map(entry => ({ date: entry.submission?.submitted_at ?? entry.item.due_date, score: entry.submission?.score ?? null })),
    ...childTests.map(entry => ({ date: entry.submission?.submitted_at ?? entry.item.test_date, score: entry.submission?.score ?? null })),
  ]);
  const attendanceTrend = buildAttendanceTrend(attendanceQuery.records);

  const handleSendMessage = async () => {
    if (!selectedPartnerId || !messageDraft.trim()) {
      showToast("Write a message before sending.", "error");
      return;
    }
    const result = await messagesQuery.sendMessage(selectedPartnerId, messageDraft.trim());
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    setMessageDraft("");
    showToast("Message sent.");
  };

  const parentName = profileQuery.displayName || user?.email || "Parent";

  if (!userId || !schoolId) {
    return <LoadingState label="Connecting your parent portal..." />;
  }

  if (profileQuery.loading || childrenQuery.loading) {
    return <LoadingState label="Loading your parent portal from Supabase..." />;
  }

  return (
    <>
      <AppShell
        navItems={PARENT_NAV}
        activeView={view}
        onSelect={setView}
        onLogout={onLogout}
        headerTitle={{
          dashboard: "Parent Dashboard",
          progress: "Child Progress",
          attendance: "Attendance",
          homework: "Homework Results",
          tests: "Test Results",
          grades: "Final Grades",
          announcements: "Announcements",
          messages: "Messages",
        }[view] ?? "Parent Portal"}
        userName={parentName}
        userRole="Parent"
        userId={userId}
      >
        {childrenQuery.children.length === 0 && (
          <EmptyState
            title="No linked children found"
            description="This parent account is connected, but there are no child records linked in Supabase yet."
          />
        )}

        {selectedChild && (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 bg-card rounded-xl border border-border px-3 py-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <select
                  value={selectedChild.student_id}
                  onChange={event => setSelectedChildId(event.target.value)}
                  className="text-sm font-semibold text-foreground bg-transparent outline-none cursor-pointer"
                >
                  {childrenQuery.children.map(child => (
                    <option key={child.student_id} value={child.student_id}>
                      {formatName(child, "Student")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <Avatar name={formatName(selectedChild, "Student")} size="sm" />
                <div>
                  <p className="text-sm font-bold text-foreground">{formatName(selectedChild, "Student")}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedChild.class_name ?? "No class"} {selectedChild.academic_year_name ? `- ${selectedChild.academic_year_name}` : ""}
                  </p>
                </div>
              </div>
            </div>

            {view === "dashboard" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={<Award className="w-5 h-5" />} label="Overall Grade" value={overallGrade} color="#7C5CBF" />
                  <StatCard icon={<Activity className="w-5 h-5" />} label="Attendance" value={`${attendanceRate}%`} color="#10B981" />
                  <StatCard icon={<ClipboardList className="w-5 h-5" />} label="Pending Homework" value={String(childHomework.filter(entry => !entry.submission).length)} color="#F59E0B" />
                  <StatCard icon={<FileText className="w-5 h-5" />} label="Completed Tests" value={String(childTests.filter(entry => entry.submission).length)} color="#3B82F6" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2 bg-card rounded-2xl p-5 border border-border shadow-sm">
                    <h3 className="font-bold text-foreground mb-4">Academic Performance Trend</h3>
                    {performanceTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={performanceTrend}>
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                          <Tooltip contentStyle={{ borderRadius: 12, border: "none" }} />
                          <Line type="monotone" dataKey="score" stroke="#7C5CBF" strokeWidth={2.5} dot={{ fill: "#7C5CBF", r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyState title="No scored work yet" description="Homework and test scores from Supabase will populate the trend here." />
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                      <h4 className="font-bold text-foreground text-sm mb-3">Subject Performance</h4>
                      <div className="space-y-3">
                        {gradesQuery.grades.slice(0, 4).map(item => {
                          const score = item.grade_value ?? 0;
                          return (
                            <div key={item.id}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium text-foreground">{item.subjects?.name ?? "Course"}</span>
                                <span className="font-semibold text-primary">{score}%</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full">
                                <div className="h-2 bg-primary rounded-full" style={{ width: `${score}%` }} />
                              </div>
                            </div>
                          );
                        })}
                        {gradesQuery.grades.length === 0 && (
                          <p className="text-sm text-muted-foreground">No subject grades published yet.</p>
                        )}
                      </div>
                    </div>
                    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                      <h4 className="font-bold text-foreground text-sm mb-2">Recent Announcements</h4>
                      <div className="space-y-3">
                        {announcements.slice(0, 3).map(item => (
                          <div key={item.id} className="text-xs">
                            <p className="font-semibold text-foreground truncate">{item.title}</p>
                            <p className="text-muted-foreground mt-1">{formatDate(item.published_at || item.created_at)}</p>
                          </div>
                        ))}
                        {announcements.length === 0 && (
                          <p className="text-sm text-muted-foreground">No announcements published for parents yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {view === "progress" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={<Award className="w-5 h-5" />} label="Average GPA" value={scoreToGpa(overallAverage)} color="#7C5CBF" />
                  <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Homework Submitted" value={String(childHomework.filter(entry => entry.submission).length)} color="#10B981" />
                  <StatCard icon={<FileText className="w-5 h-5" />} label="Tests Taken" value={String(childTests.filter(entry => entry.submission).length)} color="#3B82F6" />
                  <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Overall Average" value={overallAverage != null ? `${Math.round(overallAverage)}%` : "-"} color="#F59E0B" />
                </div>
                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                  <h3 className="font-bold text-foreground mb-4">Subject-wise Performance</h3>
                  <div className="space-y-4">
                    {gradesQuery.grades.map(item => {
                      const score = item.grade_value ?? 0;
                      const gradeLabel = item.grade_letter || scoreToLetter(score);
                      return (
                        <div key={item.id} className="flex items-center gap-4">
                          <span className="text-sm font-semibold text-foreground w-40 shrink-0">{item.subjects?.name ?? "Course"}</span>
                          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                            <div className="h-3 rounded-full bg-primary" style={{ width: `${score}%` }} />
                          </div>
                          <span className="text-sm font-bold text-foreground w-12 text-right">{score}%</span>
                          {renderGradeBadge(gradeLabel)}
                        </div>
                      );
                    })}
                    {gradesQuery.grades.length === 0 && (
                      <EmptyState title="No grade data yet" description="Final grades for this child will appear here once they are approved in Supabase." />
                    )}
                  </div>
                </div>
              </div>
            )}

            {view === "attendance" && (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Present or Late" value={String(attendancePresent)} color="#10B981" />
                  <StatCard icon={<Activity className="w-5 h-5" />} label="Attendance Rate" value={`${attendanceRate}%`} color="#7C5CBF" />
                  <StatCard icon={<CheckSquare className="w-5 h-5" />} label="Total Records" value={String(attendanceQuery.records.length)} color="#3B82F6" />
                </div>
                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                  <h3 className="font-bold text-foreground mb-4">Monthly Attendance Trend</h3>
                  {attendanceTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={attendanceTrend}>
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: "none" }} />
                        <Bar dataKey="present" fill="#7C5CBF" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="absent" fill="#FCA5A5" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="late" fill="#93C5FD" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState title="No attendance records yet" description="Attendance recorded in Supabase will appear here for the selected child." />
                  )}
                </div>
              </div>
            )}

            {view === "homework" && (
              <div className="space-y-4">
                {childHomework.map(entry => (
                  <div key={entry.item.id} className="bg-card rounded-2xl border border-border shadow-sm p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge color="purple">{entry.item.lessons?.title ?? "Lesson"}</Badge>
                          {entry.submission ? <Badge color="green">Submitted</Badge> : <Badge color="yellow">Pending</Badge>}
                        </div>
                        <h3 className="font-bold text-foreground">{entry.item.title}</h3>
                        <p className="text-xs text-muted-foreground mt-2">
                          Due {formatDate(entry.item.due_date)} {selectedChild.class_name ? `- ${selectedChild.class_name}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold text-primary">
                          {entry.submission?.score != null ? `${Math.round(entry.submission.score)}%` : "Pending"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {entry.submission ? formatDate(entry.submission.submitted_at) : "Waiting for submission"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {childHomework.length === 0 && (
                  <EmptyState title="No homework records" description="Homework and submission scores from Supabase will appear here." />
                )}
              </div>
            )}

            {view === "tests" && (
              <div className="space-y-4">
                {childTests.map(entry => (
                  <div key={entry.item.id} className="bg-card rounded-2xl border border-border shadow-sm p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge color="purple">{entry.item.subjects?.name ?? "Course"}</Badge>
                          {entry.submission ? <Badge color="green">Completed</Badge> : <Badge color="blue">Scheduled</Badge>}
                        </div>
                        <h3 className="font-bold text-foreground">{entry.item.title}</h3>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDate(entry.item.test_date)} {selectedChild.class_name ? `- ${selectedChild.class_name}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold text-primary">
                          {entry.submission?.score != null ? `${Math.round(entry.submission.score)}%` : "Pending"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {entry.submission ? formatDate(entry.submission.submitted_at) : "Awaiting completion"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {childTests.length === 0 && (
                  <EmptyState title="No test records" description="Monthly tests and child submissions from Supabase will appear here." />
                )}
              </div>
            )}

            {view === "grades" && (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  <StatCard icon={<Award className="w-5 h-5" />} label="Overall Grade" value={overallGrade} color="#7C5CBF" />
                  <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Average GPA" value={scoreToGpa(overallAverage)} color="#10B981" />
                  <StatCard icon={<BookOpen className="w-5 h-5" />} label="Subjects Graded" value={String(gradesQuery.grades.length)} color="#3B82F6" />
                </div>
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-border">
                    <h3 className="font-bold text-foreground">Final Results</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px]">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border">
                          {["Course", "Score", "GPA", "Grade", "Status"].map(header => (
                            <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {gradesQuery.grades.map(item => {
                          const score = item.grade_value ?? null;
                          const gradeLabel = item.grade_letter || scoreToLetter(score);
                          return (
                            <tr key={item.id} className="border-b border-border last:border-0">
                              <td className="px-6 py-4 text-sm font-semibold text-foreground">{item.subjects?.name ?? "Course"}</td>
                              <td className="px-6 py-4 text-sm text-foreground">{score ?? "-"}</td>
                              <td className="px-6 py-4 text-sm text-foreground">{scoreToGpa(score)}</td>
                              <td className="px-6 py-4">{renderGradeBadge(gradeLabel)}</td>
                              <td className="px-6 py-4 text-sm capitalize text-muted-foreground">{item.status}</td>
                            </tr>
                          );
                        })}
                        {gradesQuery.grades.length === 0 && (
                          <tr>
                            <td className="px-6 py-10" colSpan={5}>
                              <EmptyState title="No final grades published" description="Approved grade rows for this child will appear here." />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {view === "announcements" && (
              <div className="space-y-4">
                {announcements.map(item => (
                  <div key={item.id} className="bg-card rounded-2xl border border-border shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                        <Megaphone className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.published_at || item.created_at)} - {formatName({
                          first_name: item.profiles?.first_name,
                          last_name: item.profiles?.last_name,
                        }, "School Admin")}
                      </span>
                    </div>
                    <h3 className="font-bold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <EmptyState title="No announcements yet" description="Parent-targeted announcements from Supabase will appear here." />
                )}
              </div>
            )}

            {view === "messages" && (
              <MessageCenter
                currentUserId={userId}
                contacts={contacts}
                conversations={messagesQuery.conversations}
                selectedPartnerId={selectedPartnerId}
                onSelectPartner={setSelectedPartnerId}
                draft={messageDraft}
                setDraft={setMessageDraft}
                onSend={handleSendMessage}
                sendLabel="Teacher Messages"
              />
            )}
          </>
        )}
      </AppShell>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}

function activeHomeworkAnswersKey(activeHomeworkId: string | null) {
  return activeHomeworkId ?? "none";
}
