import { useState, useCallback, useEffect } from "react";
import {
  LayoutDashboard, Users, BookOpen, Calendar, Bell, Settings,
  LogOut, Plus, X, Check, MessageSquare, Megaphone, Award,
  UserCheck, Upload, Eye, Edit, Trash2, Send, Home,
  CheckCircle, Star, TrendingUp, Video, FileText, Search, ChevronRight,
  Building2, PlayCircle, CheckSquare, Clock, Menu, Book, GraduationCap,
  Layers, ClipboardList, BarChart2, UserPlus, Globe, Shield, CreditCard,
  Hash, ChevronLeft, AlertCircle, FileSpreadsheet, ChevronDown,
  Activity, PieChart, Download, MoreHorizontal, Clipboard, Target,
  Zap, Coffee, Archive
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  LineChart, Line, AreaChart, Area, PieChart as RPieChart, Pie, Cell
} from "recharts";
import {
  NavItem, TEACHERS, STUDENTS, ANNOUNCEMENTS, MESSAGES,
  Avatar, Badge, Btn, StatCard, Modal, Toast, Input, Select, CircleProgress, MiniProgress,
  AppShell, avatarColor, AVATAR_COLORS, TIMETABLE, TIME_SLOTS, LessonWorkspace,
  HOMEWORK, TESTS, GRADES_DATA, ATTENDANCE_DATA, PERF_TREND, WORKLOAD_DATA
} from "./shared";
import { PublishQuestionModal } from "./SchoolAdminPortal";
import { TeacherClassesSectionLive } from "./TeacherClassesSectionLive";
import { useLessons } from "@/hooks/useLessons";
import { useHomework } from "@/hooks/useHomework";
import { useTests } from "@/hooks/useTests";
import { useAttendance } from "@/hooks/useAttendance";
import { useClasses } from "@/hooks/useClasses";
import { useMessages } from "@/hooks/useMessages";
import { useFinalGrades } from "@/hooks/useFinalGrades";


const CLASS_DATA = [
  { id: "A", name: "Class A", students: 25, subject: "Mathematics", lessons: 12, homework: 4, color: "#955AC3", lessonList: [
    { id: 1, title: "Introduction to Algebra", date: "Apr 10, 2024", type: "pdf", hasHomework: true },
    { id: 2, title: "Linear Equations", date: "Apr 12, 2024", type: "video", hasHomework: true },
    { id: 3, title: "Quadratic Functions", date: "Apr 15, 2024", type: "pdf", hasHomework: false },
  ] },
  { id: "B", name: "Class B", students: 28, subject: "Mathematics", lessons: 10, homework: 3, color: "#3B82F6", lessonList: [
    { id: 1, title: "Trigonometry Basics", date: "Apr 9, 2024", type: "pdf", hasHomework: true },
    { id: 2, title: "Sine & Cosine Rules", date: "Apr 11, 2024", type: "video", hasHomework: false },
  ] },
];
const HW_GRADES = [
  { rank: 1, name: "Joshua Ashiru", hwScore: 95, testScore: 92, grade: "A+" },
  { rank: 2, name: "Damilola Obi", hwScore: 88, testScore: 86, grade: "A" },
  { rank: 3, name: "Adeoila Ayo", hwScore: 78, testScore: 81, grade: "B+" },
  { rank: 4, name: "Adewunyi Ige", hwScore: 72, testScore: 74, grade: "B" },
  { rank: 5, name: "Mayowa Ade", hwScore: 65, testScore: 67, grade: "C+" },
  { rank: 6, name: "Kemi Hassan", hwScore: 53, testScore: 58, grade: "C" },
];
type ClassSubView = "list" | "detail" | "lesson" | "add-lesson" | "hw-grades";
type LessonTab = "content" | "homework" | "tasks" | "results";
type QType = "mcq" | "true-false";
interface LessonAssignment { id: number; title: string; qType: QType; questions: number; deadline: string; published: boolean; submissions: number; total: number; }
type ManagedKind = "lesson" | "homework" | "task";
type ManagedItem = { kind: ManagedKind; id: number; title: string };

function TeacherClassesSection({ showToast }: { showToast: (msg: string, type?: "success" | "error") => void }) {
  const [subView, setSubView] = useState<ClassSubView>("list");
  const [selectedClass, setSelectedClass] = useState<typeof CLASS_DATA[0] | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<typeof CLASS_DATA[0]["lessonList"][0] | null>(null);
  const [lessonName, setLessonName] = useState("");
  const [lessons, setLessons] = useState(CLASS_DATA);
  const [calMonth] = useState({ month: "April", year: 2024 });
  const [lessonTab, setLessonTab] = useState<LessonTab>("content");
  const [lessonHW, setLessonHW] = useState<LessonAssignment[]>([
    { id: 1, title: "Algebraic Equations Practice", qType: "mcq", questions: 3, deadline: "2024-04-22 09:00", published: true, submissions: 18, total: 25 },
  ]);
  const [lessonTasks, setLessonTasks] = useState<LessonAssignment[]>([
    { id: 1, title: "Problem Set – Chapter 3", qType: "mcq", questions: 5, deadline: "2024-04-25 09:00", published: true, submissions: 22, total: 25 },
  ]);
  const [showPublish, setShowPublish] = useState<"homework" | "task" | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [lessonImage, setLessonImage] = useState<File | null>(null);
  const [lessonPdf, setLessonPdf] = useState<File | null>(null);
  const [editTarget, setEditTarget] = useState<ManagedItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<(ManagedItem & { action: "delete" | "archive" }) | null>(null);
  const [archivedLessons, setArchivedLessons] = useState<number[]>([]);
  const [archivedHomework, setArchivedHomework] = useState<number[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<number[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  const handleAddLesson = () => {
    if (!lessonName.trim()) { showToast("Lesson name is required", "error"); return; }
    setLessons(prev => prev.map(c =>
      c.id === selectedClass?.id
        ? { ...c, lessons: c.lessons + 1, lessonList: [...c.lessonList, { id: c.lessonList.length + 1, title: lessonName, date: "Apr 18, 2024", type: lessonPdf ? "pdf" : lessonImage ? "image" : "video", hasHomework: false }] }
        : c
    ));
    if (selectedClass) setSelectedClass(prev => prev ? { ...prev, lessons: prev.lessons + 1, lessonList: [...prev.lessonList, { id: prev.lessonList.length + 1, title: lessonName, date: "Apr 18, 2024", type: lessonPdf ? "pdf" : lessonImage ? "image" : "video", hasHomework: false }] } : null);
    setLessonName("");
    setLessonImage(null); setLessonPdf(null);
    showToast("Lesson and attachments saved successfully!");
    setSubView("detail");
  };

  const addHW = (item: Omit<LessonAssignment, "id" | "submissions" | "total" | "published">) => {
    setLessonHW(prev => [...prev, { ...item, id: prev.length + 1, submissions: 0, total: 25, published: true }]);
    showToast("Homework published! Students notified.");
  };

  const addTask = (item: Omit<LessonAssignment, "id" | "submissions" | "total" | "published">) => {
    setLessonTasks(prev => [...prev, { ...item, id: prev.length + 1, submissions: 0, total: 25, published: true }]);
    showToast("Task published! Students notified.");
  };

  const startEdit = (item: ManagedItem) => { setEditTarget(item); setEditTitle(item.title); };
  const saveEdit = () => {
    if (!editTarget || !editTitle.trim()) { showToast("A title is required", "error"); return; }
    if (editTarget.kind === "lesson") {
      setLessons(prev => prev.map(cls => cls.id === selectedClass?.id ? { ...cls, lessonList: cls.lessonList.map(lesson => lesson.id === editTarget.id ? { ...lesson, title: editTitle.trim() } : lesson) } : cls));
      setSelectedLesson(prev => prev?.id === editTarget.id ? { ...prev, title: editTitle.trim() } : prev);
    } else if (editTarget.kind === "homework") {
      setLessonHW(prev => prev.map(item => item.id === editTarget.id ? { ...item, title: editTitle.trim() } : item));
    } else {
      setLessonTasks(prev => prev.map(item => item.id === editTarget.id ? { ...item, title: editTitle.trim() } : item));
    }
    setEditTarget(null); showToast("Changes saved successfully");
  };
  const confirmManageAction = () => {
    if (!confirmTarget) return;
    const { kind, id, action } = confirmTarget;
    if (action === "archive") {
      if (kind === "lesson") setArchivedLessons(prev => [...prev, id]);
      else if (kind === "homework") setArchivedHomework(prev => [...prev, id]);
      else setArchivedTasks(prev => [...prev, id]);
      showToast("Item archived. You can view it from archived items.");
    } else {
      if (kind === "lesson") { setLessons(prev => prev.map(cls => cls.id === selectedClass?.id ? { ...cls, lessonList: cls.lessonList.filter(lesson => lesson.id !== id), lessons: Math.max(0, cls.lessons - 1) } : cls)); setSubView("detail"); }
      else if (kind === "homework") setLessonHW(prev => prev.filter(item => item.id !== id));
      else setLessonTasks(prev => prev.filter(item => item.id !== id));
      showToast("Item deleted successfully");
    }
    setConfirmTarget(null);
  };
  const managementDialogs = <>
    {editTarget && <Modal title={`Edit ${editTarget.kind === "lesson" ? "Lesson" : editTarget.kind === "homework" ? "Homework" : "Task"}`} onClose={() => setEditTarget(null)}><div className="space-y-4"><Input label="Title" value={editTitle} onChange={setEditTitle} required /><div className="flex gap-3"><Btn onClick={saveEdit} className="flex-1">Save Changes</Btn><Btn variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Btn></div></div></Modal>}
    {confirmTarget && <Modal title={confirmTarget.action === "delete" ? "Delete item" : "Archive item"} onClose={() => setConfirmTarget(null)}><div className="space-y-4"><p className="text-sm text-muted-foreground">{confirmTarget.action === "delete" ? `Delete “${confirmTarget.title}” permanently? This cannot be undone.` : `Archive “${confirmTarget.title}”? It will be hidden from the active lesson list.`}</p><div className="flex gap-3"><Btn onClick={confirmManageAction} className={`flex-1 ${confirmTarget.action === "delete" ? "!bg-red-500 hover:!bg-red-600" : ""}`}>{confirmTarget.action === "delete" ? "Delete" : "Archive"}</Btn><Btn variant="secondary" onClick={() => setConfirmTarget(null)}>Cancel</Btn></div></div></Modal>}
  </>;

  // Calendar helpers
  const calDays = Array.from({ length: 30 }, (_, i) => i + 1);
  const startDay = 1; // April 2024 starts on Monday

  const rankColor = (rank: number) => rank === 1 ? "#F59E0B" : rank === 2 ? "#9CA3AF" : rank === 3 ? "#B45309" : "#6B7280";
  const rankBg = (rank: number) => rank === 1 ? "#FEF3C7" : rank === 2 ? "#F3F4F6" : rank === 3 ? "#FDE8C8" : "#F9FAFB";

  if (subView === "add-lesson") {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" style={{ fontFamily: "'Poppins', sans-serif" }}>
        {/* Header */}
        <div className="flex items-center gap-4 px-8 py-5 border-b border-gray-100">
          <button
            onClick={() => setSubView("detail")}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[#3F434A]" />
          </button>
          <h2 className="text-[22px] font-semibold text-[#0E1B4A]">Add Lesson</h2>
        </div>

        <div className="p-8 space-y-8">
          {/* Lesson Name Input */}
          <div className="space-y-2">
            <label className="text-[15px] font-medium text-[#0E1B4A]">Lesson Name <span className="text-red-500 text-xs">*</span></label>
            <div className="relative">
              <input
                value={lessonName}
                onChange={e => setLessonName(e.target.value)}
                placeholder="Enter lesson name…"
                className="w-full border border-[#F2F4F7] rounded-lg px-4 py-3 text-sm text-[#0E1B4A] outline-none focus:border-[#955AC3] focus:ring-2 focus:ring-[#955AC3]/20 transition-all"
              />
            </div>
          </div>

          {/* Upload Area */}
          <div>
            <p className="text-[13px] font-medium text-[#999] mb-4">Lesson 1</p>
            <div className="flex gap-8">
              {/* Image Upload */}
              <label className="flex flex-col items-center justify-center w-64 h-64 border border-[#955AC3]/40 rounded-xl cursor-pointer hover:bg-[#955AC3]/5 transition-colors group">
                <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={e => { const file = e.target.files?.[0] || null; if (file && file.size > 10 * 1024 * 1024) { showToast("Image must be smaller than 10MB", "error"); return; } setLessonImage(file); }} />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 flex items-center justify-center">
                    <svg viewBox="0 0 52 47" fill="none" className="w-14 h-12 text-[#955AC3]">
                      <path d="M34.667 31.333l-8.667-8.666-8.667 8.666M26 22.667V46M44.2 39.987A11.667 11.667 0 0038.333 18H35.94A18.667 18.667 0 102 36.787" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-sm text-[#955AC3] font-medium">{lessonImage ? lessonImage.name : "Upload Image"}</span>
                  <span className="text-xs text-[#999]">PNG, JPG up to 10MB</span>
                </div>
              </label>
              {/* PDF Upload */}
              <label className="flex flex-col items-center justify-center w-64 h-64 border border-[#955AC3]/40 rounded-xl cursor-pointer hover:bg-[#955AC3]/5 transition-colors">
                <input type="file" accept="application/pdf" className="sr-only" onChange={e => { const file = e.target.files?.[0] || null; if (file && file.size > 20 * 1024 * 1024) { showToast("PDF must be smaller than 20MB", "error"); return; } setLessonPdf(file); }} />
                <p className="text-[22px] font-semibold text-[#955AC3]">Pdf</p>
                <p className="text-xs text-[#999] mt-2">{lessonPdf ? lessonPdf.name : "Upload PDF file"}</p>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleAddLesson}
              className="px-8 py-2.5 rounded-lg text-white text-sm font-medium transition-colors"
              style={{ background: "rgba(149,90,195,0.85)" }}
            >
              Save Lesson
            </button>
            <button
              onClick={() => setSubView("detail")}
              className="px-8 py-2.5 rounded-lg border border-gray-200 text-[#344054] text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (subView === "hw-grades") {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" style={{ fontFamily: "'Poppins', sans-serif" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <button onClick={() => setSubView("detail")} className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-5 h-5 text-[#3F434A]" />
            </button>
            <div>
              <h2 className="text-[20px] font-semibold text-[#0E1B4A]">Homework Grades</h2>
              <p className="text-xs text-[#999] mt-0.5">{selectedLesson?.title} · {selectedClass?.name}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="px-5 py-2 rounded-lg border border-gray-200 text-[#344054] text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Submitted", value: "18/25", color: "#10B981", bg: "#ECFDF5" },
              { label: "Class Average", value: "75%", color: "#955AC3", bg: "#F5F0FF" },
              { label: "Top Score", value: "95%", color: "#F59E0B", bg: "#FFFBEB" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4 flex items-center gap-3" style={{ background: s.bg }}>
                <div>
                  <p className="text-xs font-medium" style={{ color: s.color }}>{s.label}</p>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Grades Table */}
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-[#F7F4FF]">
                  {["#", "Student", "HW Score", "Test Score", "Grade"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#0E1B4A]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HW_GRADES.map(s => (
                  <tr key={s.rank} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: rankBg(s.rank), color: rankColor(s.rank) }}>
                        {s.rank}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} size="sm" />
                        <span className="text-sm font-semibold text-[#0E1B4A]">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full w-20">
                          <div className="h-1.5 rounded-full bg-[#955AC3] transition-all" style={{ width: `${s.hwScore}%` }} />
                        </div>
                        <span className="text-sm font-medium text-[#0E1B4A]">{s.hwScore}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full w-20">
                          <div className="h-1.5 rounded-full bg-blue-400 transition-all" style={{ width: `${s.testScore}%` }} />
                        </div>
                        <span className="text-sm font-medium text-[#0E1B4A]">{s.testScore}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.grade.startsWith("A") ? "bg-emerald-100 text-emerald-700" : s.grade.startsWith("B") ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                        {s.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (subView === "lesson" && selectedLesson) {
    const baseItems: LessonAssignment[] = lessonTab === "homework" ? lessonHW : lessonTasks;
    const archivedIds = lessonTab === "homework" ? archivedHomework : archivedTasks;
    const allItems = baseItems.filter(item => showArchived ? archivedIds.includes(item.id) : !archivedIds.includes(item.id));

    return (
      <>
      <div className="space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => setSubView("detail")} className="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm">
            <ChevronLeft className="w-5 h-5 text-[#3F434A]" />
          </button>
          <div className="flex-1">
            <h2 className="text-[20px] font-semibold text-[#0E1B4A]">{selectedLesson.title}</h2>
            <p className="text-xs text-[#999] mt-0.5">{selectedClass?.name} · {selectedLesson.date}</p>
          </div>
          <button onClick={() => setSubView("hw-grades")}
            className="px-5 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
            style={{ background: "#955AC3" }}>
            <BarChart2 className="w-4 h-4" /> View All Results
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-2 border-b border-gray-100 pb-0">
          {([["content","Lesson Content"],["homework","Homework"],["tasks","Tasks"],["results","Results"]] as [LessonTab, string][]).map(([t, lbl]) => (
            <button key={t} onClick={() => setLessonTab(t)}
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${lessonTab === t ? "border-[#955AC3] text-[#955AC3]" : "border-transparent text-[#999] hover:text-[#0E1B4A]"}`}>
              {lbl}
            </button>
          ))}
        </div>

        {/* ── Content Tab ── */}
        {lessonTab === "content" && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-8 space-y-5">
              {/* Lesson resource */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-br from-[#F5F0FF] to-[#EDE9FE] h-48 flex items-center justify-center relative">
                  {selectedLesson.type === "video"
                    ? <div className="flex flex-col items-center gap-2"><PlayCircle className="w-12 h-12 text-[#955AC3]" /><p className="text-[#955AC3] font-semibold text-sm">Video Lesson</p></div>
                    : <div className="flex flex-col items-center gap-2"><FileText className="w-12 h-12 text-[#955AC3]" /><p className="text-[#955AC3] font-semibold text-sm">PDF Document</p></div>}
                  <button className="absolute top-3 right-3 w-8 h-8 bg-white/80 rounded-lg flex items-center justify-center shadow-sm hover:bg-white transition-colors">
                    <Eye className="w-4 h-4 text-[#955AC3]" />
                  </button>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div><p className="text-sm font-semibold text-[#0E1B4A]">{selectedLesson.title}</p><p className="text-xs text-[#999]">Uploaded {selectedLesson.date}</p></div>
                  <button className="text-xs text-[#955AC3] font-medium hover:underline">Download</button>
                </div>
              </div>

              {/* Video link */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <h3 className="text-[15px] font-semibold text-[#0E1B4A] flex items-center gap-2"><Video className="w-4 h-4 text-[#955AC3]" /> Video Link</h3>
                <div className="flex gap-3">
                  <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="Paste YouTube or video URL…"
                    className="flex-1 px-4 py-2.5 rounded-lg border border-[#F2F4F7] text-sm text-[#0E1B4A] outline-none focus:border-[#955AC3] focus:ring-2 focus:ring-[#955AC3]/20" />
                  <button onClick={() => showToast("Video link saved")}
                    className="px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-colors" style={{ background: "#955AC3" }}>
                    Save
                  </button>
                </div>
                {videoUrl && (
                  <div className="flex items-center gap-2 p-3 bg-[#F5F0FF] rounded-lg">
                    <PlayCircle className="w-4 h-4 text-[#955AC3] shrink-0" />
                    <a href={videoUrl} target="_blank" rel="noreferrer" className="text-xs text-[#955AC3] font-medium truncate hover:underline">{videoUrl}</a>
                  </div>
                )}
              </div>

              {/* PDF upload */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <h3 className="text-[15px] font-semibold text-[#0E1B4A] flex items-center gap-2"><FileText className="w-4 h-4 text-[#955AC3]" /> PDF Materials</h3>
                <div className="border border-dashed border-[#955AC3]/40 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:bg-[#955AC3]/5 transition-colors">
                  <FileText className="w-10 h-10 text-[#955AC3]" />
                  <p className="text-sm font-semibold text-[#955AC3]">Upload PDF</p>
                  <p className="text-xs text-[#999]">PDF up to 50MB</p>
                  <button onClick={() => showToast("File picker opened")}
                    className="px-6 py-2 rounded-lg text-white text-xs font-medium mt-1" style={{ background: "#955AC3" }}>
                    Choose File
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Lesson details */}
            <div className="col-span-4 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <h4 className="text-sm font-semibold text-[#0E1B4A]">Lesson Details</h4>
                {[
                  { label: "Class", val: selectedClass?.name },
                  { label: "Subject", val: selectedClass?.subject },
                  { label: "Date", val: selectedLesson.date },
                  { label: "Type", val: selectedLesson.type.toUpperCase() },
                  { label: "Homework", val: lessonHW.length > 0 ? `${lessonHW.length} assigned` : "None" },
                  { label: "Tasks", val: lessonTasks.length > 0 ? `${lessonTasks.length} assigned` : "None" },
                ].map(d => (
                  <div key={d.label} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-[#999]">{d.label}</span>
                    <span className="text-xs font-semibold text-[#0E1B4A]">{d.val}</span>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <h4 className="text-sm font-semibold text-[#0E1B4A]">Submission Overview</h4>
                {[
                  { label: "Homework", val: lessonHW.reduce((a, h) => a + h.submissions, 0), total: lessonHW.reduce((a, h) => a + h.total, 0), color: "#955AC3" },
                  { label: "Tasks", val: lessonTasks.reduce((a, t) => a + t.submissions, 0), total: lessonTasks.reduce((a, t) => a + t.total, 0), color: "#3B82F6" },
                ].map(s => (
                  <div key={s.label} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#999]">{s.label}</span>
                      <span className="font-semibold" style={{ color: s.color }}>{s.val} / {s.total}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: s.total > 0 ? `${(s.val / s.total) * 100}%` : "0%", background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Homework / Tasks Tab ── */}
        {(lessonTab === "homework" || lessonTab === "tasks") && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-semibold text-[#0E1B4A]">{lessonTab === "homework" ? "Homework Assignments" : "Tasks"}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowArchived(value => !value)} className="px-3 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-[#59456B] hover:bg-gray-50">{showArchived ? "Active items" : "Archived items"}</button>
                <button onClick={() => setShowPublish(lessonTab === "homework" ? "homework" : "task")}
                  className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
                  style={{ background: "#955AC3" }}>
                  <Plus className="w-4 h-4" /> Create {lessonTab === "homework" ? "Homework" : "Task"}
                </button>
              </div>
            </div>
            {allItems.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                <ClipboardList className="w-10 h-10 text-gray-200 mb-3" />
                <p className="text-sm font-medium text-[#999]">No {lessonTab === "homework" ? "homework" : "tasks"} yet</p>
                <p className="text-xs text-gray-400 mt-1">Click "Create" to add one</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allItems.map(item => (
                  <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${item.published ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {item.published ? "Published" : "Draft"}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5F0FF] text-[#955AC3] font-semibold">{item.qType === "mcq" ? "MCQ" : "True / False"}</span>
                        </div>
                        <h4 className="text-sm font-semibold text-[#0E1B4A] mb-1">{item.title}</h4>
                        <div className="flex items-center gap-4 text-xs text-[#999]">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Due: {item.deadline}</span>
                          <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{item.questions} question{item.questions !== 1 ? "s" : ""}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{item.submissions}/{item.total} submitted</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => setLessonTab("results")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-[#344054] hover:bg-gray-50 transition-colors">
                          <Eye className="w-3 h-3" /> Results
                        </button>
                        <button title="Edit" onClick={() => startEdit({ kind: lessonTab === "homework" ? "homework" : "task", id: item.id, title: item.title })} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-secondary transition-colors"><Edit className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button title="Archive" onClick={() => setConfirmTarget({ kind: lessonTab === "homework" ? "homework" : "task", id: item.id, title: item.title, action: "archive" })} className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center hover:bg-amber-100 transition-colors"><Archive className="w-3.5 h-3.5 text-amber-600" /></button>
                        <button title="Delete" onClick={() => setConfirmTarget({ kind: lessonTab === "homework" ? "homework" : "task", id: item.id, title: item.title, action: "delete" })} className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                    {item.published && (
                      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                          <div className="h-1.5 bg-[#955AC3] rounded-full" style={{ width: `${(item.submissions / item.total) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold text-[#955AC3]">{Math.round((item.submissions / item.total) * 100)}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Results Tab ── */}
        {lessonTab === "results" && (
          <div className="space-y-5">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Submitted", value: "18/25", color: "#10B981", bg: "#ECFDF5" },
                { label: "Class Average", value: "75%", color: "#955AC3", bg: "#F5F0FF" },
                { label: "Top Score", value: "95%", color: "#F59E0B", bg: "#FFFBEB" },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: s.bg }}>
                  <div><p className="text-xs font-medium" style={{ color: s.color }}>{s.label}</p><p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p></div>
                </div>
              ))}
            </div>
            {/* Results table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-[#0E1B4A]">Student Submissions</h3>
                <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-[#344054] hover:bg-gray-50 transition-colors">
                  <Download className="w-3 h-3" /> Export
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px]">
                  <thead>
                    <tr className="bg-[#F7F4FF]">
                      {["#", "Student", "Score", "Max Score", "GPA", "Submitted At", "Status"].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#0E1B4A]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {HW_GRADES.map(s => (
                      <tr key={s.rank} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: rankBg(s.rank), color: rankColor(s.rank) }}>{s.rank}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3"><Avatar name={s.name} size="sm" /><span className="text-sm font-semibold text-[#0E1B4A]">{s.name}</span></div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm font-bold text-[#0E1B4A]">{s.hwScore}</span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-[#999]">100</td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm font-bold" style={{ color: s.hwScore >= 90 ? "#10B981" : s.hwScore >= 75 ? "#955AC3" : "#F59E0B" }}>
                            {s.hwScore >= 90 ? "4.0" : s.hwScore >= 80 ? "3.5" : s.hwScore >= 70 ? "3.0" : "2.5"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[#999]">Apr 21, 2024</td>
                        <td className="px-5 py-3.5">
                          <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-emerald-100 text-emerald-700">Submitted</span>
                        </td>
                      </tr>
                    ))}
                    {/* Not submitted */}
                    {[{ rank: 7, name: "Zara Okonkwo" }].map(s => (
                      <tr key={s.rank} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5"><div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">{s.rank}</div></td>
                        <td className="px-5 py-3.5"><div className="flex items-center gap-3"><Avatar name={s.name} size="sm" /><span className="text-sm font-semibold text-[#0E1B4A]">{s.name}</span></div></td>
                        <td className="px-5 py-3.5 text-sm text-[#999]">—</td>
                        <td className="px-5 py-3.5 text-sm text-[#999]">100</td>
                        <td className="px-5 py-3.5 text-sm text-[#999]">—</td>
                        <td className="px-5 py-3.5 text-xs text-[#999]">—</td>
                        <td className="px-5 py-3.5"><span className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-red-100 text-red-600">Missing</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Publish modal */}
        {showPublish && (
          <PublishQuestionModal
            mode={showPublish}
            onClose={() => setShowPublish(null)}
            onPublish={showPublish === "homework" ? addHW : addTask}
          />
        )}
      </div>
      {managementDialogs}
      </>
    );
  }

  if (subView === "detail" && selectedClass) {
    const cls = lessons.find(c => c.id === selectedClass.id) || selectedClass;

    return (
      <div className="space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
        {/* Back + Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSubView("list")} className="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm">
              <ChevronLeft className="w-5 h-5 text-[#3F434A]" />
            </button>
            <div>
              <h2 className="text-[20px] font-semibold text-[#0E1B4A]">{cls.name}</h2>
              <p className="text-xs text-[#999]">{cls.subject} · {cls.students} students</p>
            </div>
          </div>
          <button
            onClick={() => setSubView("add-lesson")}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
            style={{ background: "#955AC3" }}
          >
            <Plus className="w-4 h-4" /> Add Lesson
          </button>
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* Lessons List */}
          <div className="col-span-7 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-[#0E1B4A]">Lessons</h3>
                <span className="text-xs font-medium text-[#955AC3] bg-[#F5F0FF] px-2.5 py-1 rounded-full">{cls.lessonList.length} total</span>
              </div>
              <div className="divide-y divide-gray-50">
                {cls.lessonList.filter(lesson => !archivedLessons.includes(lesson.id)).map((lesson, i) => (
                  <div key={lesson.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => { setSelectedLesson(lesson); setSubView("lesson"); }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${cls.color}18` }}>
                      {lesson.type === "pdf" ? <FileText className="w-4 h-4" style={{ color: cls.color }} /> :
                       lesson.type === "video" ? <PlayCircle className="w-4 h-4" style={{ color: cls.color }} /> :
                       <BookOpen className="w-4 h-4" style={{ color: cls.color }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0E1B4A] truncate">Lesson {i + 1}: {lesson.title}</p>
                      <p className="text-xs text-[#999] mt-0.5">{lesson.date}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {lesson.hasHomework && (
                        <span className="text-[10px] bg-[#F5F0FF] text-[#955AC3] font-semibold px-2 py-0.5 rounded-full">HW</span>
                      )}
                      <button title="Edit lesson" className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all" onClick={e => { e.stopPropagation(); setSelectedLesson(lesson); setSubView("lesson"); startEdit({ kind: "lesson", id: lesson.id, title: lesson.title }); }}>
                        <Edit className="w-3.5 h-3.5 text-[#999]" />
                      </button>
                      <button title="Archive lesson" className="w-7 h-7 rounded-lg hover:bg-amber-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all" onClick={e => { e.stopPropagation(); setSelectedLesson(lesson); setSubView("lesson"); setConfirmTarget({ kind: "lesson", id: lesson.id, title: lesson.title, action: "archive" }); }}>
                        <Archive className="w-3.5 h-3.5 text-amber-500" />
                      </button>
                      <button title="Delete lesson" className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all" onClick={e => { e.stopPropagation(); setSelectedLesson(lesson); setSubView("lesson"); setConfirmTarget({ kind: "lesson", id: lesson.id, title: lesson.title, action: "delete" }); }}>
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#955AC3] transition-colors" />
                    </div>
                  </div>
                ))}
                {cls.lessonList.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BookOpen className="w-10 h-10 text-gray-200 mb-3" />
                    <p className="text-sm font-medium text-[#999]">No lessons yet</p>
                    <p className="text-xs text-gray-400 mt-1">Click "Add Lesson" to get started</p>
                  </div>
                )}
              </div>
            </div>

            {/* Homework summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-semibold text-[#0E1B4A]">Homework</h3>
                <button className="text-xs text-[#955AC3] font-medium hover:underline" onClick={() => { setSelectedLesson(cls.lessonList[0]); setSubView("hw-grades"); }}>
                  View Grades
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Assigned", value: cls.homework, color: "#955AC3", bg: "#F5F0FF" },
                  { label: "Submitted", value: 18, color: "#10B981", bg: "#ECFDF5" },
                  { label: "Pending", value: 7, color: "#F59E0B", bg: "#FFFBEB" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: s.bg }}>
                    <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs font-medium mt-0.5" style={{ color: s.color }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Calendar + Students */}
          <div className="col-span-5 space-y-4">
            {/* Mini Calendar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-semibold text-[#0E1B4A]">{calMonth.month} {calMonth.year}</h3>
                <div className="flex gap-1">
                  <button className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
                    <ChevronLeft className="w-4 h-4 text-[#999]" />
                  </button>
                  <button className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
                    <ChevronRight className="w-4 h-4 text-[#999]" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 mb-2">
                {["Mo","Tu","We","Th","Fr","Sa","Su"].map(d => (
                  <div key={d} className="text-center text-[11px] font-semibold text-[#999] py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {/* Empty cells for day offset */}
                {Array.from({ length: startDay }).map((_, i) => <div key={`e${i}`} />)}
                {calDays.map(d => {
                  const isLesson = [10, 12, 15, 17].includes(d);
                  const isToday = d === 18;
                  return (
                    <div key={d} className={`flex items-center justify-center h-7 w-7 mx-auto rounded-full text-[12px] cursor-pointer transition-colors font-medium
                      ${isToday ? "bg-[#955AC3] text-white" :
                        isLesson ? "bg-[#F5F0FF] text-[#955AC3]" :
                        "text-[#0E1B4A] hover:bg-gray-100"}`}>
                      {d}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-[#999]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#955AC3]" />Today
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#999]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F5F0FF]" />Lesson day
                </div>
              </div>
            </div>

            {/* Top Students */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-semibold text-[#0E1B4A]">Top Students</h3>
                <button className="text-xs text-[#955AC3] font-medium hover:underline">See all</button>
              </div>
              <div className="space-y-3">
                {HW_GRADES.slice(0, 4).map(s => (
                  <div key={s.rank} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: rankBg(s.rank), color: rankColor(s.rank) }}>
                      {s.rank}
                    </div>
                    <Avatar name={s.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#0E1B4A] truncate">{s.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="flex-1 h-1 bg-gray-100 rounded-full">
                          <div className="h-1 bg-[#955AC3] rounded-full" style={{ width: `${s.hwScore}%` }} />
                        </div>
                        <span className="text-[10px] font-semibold text-[#955AC3]">{s.hwScore}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Classes List ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold text-[#0E1B4A]">My Classes</h2>
          <p className="text-xs text-[#999] mt-0.5">Manage lessons, homework and student progress</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Classes", value: "2", icon: <Layers className="w-5 h-5" />, color: "#955AC3" },
          { label: "Total Lessons", value: "22", icon: <BookOpen className="w-5 h-5" />, color: "#3B82F6" },
          { label: "Total Students", value: "53", icon: <Users className="w-5 h-5" />, color: "#10B981" },
          { label: "Homework Set", value: "7", icon: <ClipboardList className="w-5 h-5" />, color: "#F59E0B" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-100">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${s.color}18` }}>
              <span style={{ color: s.color }}>{s.icon}</span>
            </div>
            <div>
              <p className="text-xs text-[#999] font-medium">{s.label}</p>
              <p className="text-xl font-bold text-[#0E1B4A]">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Class Cards */}
      <div className="grid grid-cols-2 gap-5">
        {CLASS_DATA.map(cls => (
          <div key={cls.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            {/* Card header */}
            <div className="px-6 pt-5 pb-4">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: `${cls.color}18` }}>
                  {cls.id === "A" ? (
                    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" style={{ color: cls.color }}>
                      <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" style={{ color: cls.color }}>
                      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-[17px] font-semibold text-[#0E1B4A]">{cls.name}</h3>
                  <p className="text-xs text-[#999]">{cls.subject}</p>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: `${cls.color}18`, color: cls.color }}>
                  {cls.students} students
                </span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { label: "Lessons", value: cls.lessons, icon: <BookOpen className="w-3.5 h-3.5" /> },
                  { label: "Homework", value: cls.homework, icon: <ClipboardList className="w-3.5 h-3.5" /> },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2.5 rounded-xl p-3" style={{ background: `${cls.color}0A` }}>
                    <span style={{ color: cls.color }}>{s.icon}</span>
                    <div>
                      <p className="text-[18px] font-bold leading-none" style={{ color: cls.color }}>{s.value}</p>
                      <p className="text-[10px] font-medium mt-0.5" style={{ color: cls.color }}>{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Latest lesson preview */}
              {cls.lessonList.slice(-1).map(lesson => (
                <div key={lesson.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${cls.color}18` }}>
                    <FileText className="w-4 h-4" style={{ color: cls.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#0E1B4A] truncate">Latest: {lesson.title}</p>
                    <p className="text-[10px] text-[#999]">{lesson.date}</p>
                  </div>
                  {lesson.hasHomework && <span className="text-[10px] font-semibold text-[#955AC3] bg-[#F5F0FF] px-2 py-0.5 rounded-full shrink-0">HW</span>}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 grid grid-cols-2 divide-x divide-gray-100">
              <button
                className="py-3 text-xs font-semibold transition-colors hover:bg-gray-50 flex items-center justify-center gap-1.5"
                style={{ color: cls.color }}
                onClick={() => { setSelectedClass(cls); setSubView("detail"); }}
              >
                <Eye className="w-3.5 h-3.5" /> View Class
              </button>
              <button
                className="py-3 text-xs font-semibold transition-colors hover:bg-gray-50 flex items-center justify-center gap-1.5"
                style={{ color: cls.color }}
                onClick={() => { setSelectedClass(cls); setSubView("add-lesson"); }}
              >
                <Plus className="w-3.5 h-3.5" /> Add Lesson
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Teacher Portal ───────────────────────────────────────────────────────────
const TEACHER_NAV: NavItem[] = [
  { id: "dashboard", label: "Home Page", icon: <Home className="w-4 h-4" /> },
  { id: "classes", label: "Classes", icon: <Layers className="w-4 h-4" /> },
  { id: "tests", label: "Monthly Test", icon: <FileText className="w-4 h-4" /> },
  { id: "results", label: "Final Results", icon: <Award className="w-4 h-4" /> },
  { id: "students", label: "My Students", icon: <Users className="w-4 h-4" /> },
  { id: "messages", label: "Ticketing System", icon: <MessageSquare className="w-4 h-4" /> },
  { id: "timetable", label: "Time Table", icon: <Calendar className="w-4 h-4" /> },
];

export function TeacherPortal({ view, setView, onLogout, schoolId, user }: { view: string; setView: (v: string) => void; onLogout: () => void; schoolId?: string | null; user?: any }) {
  const dbLessons = useLessons({ schoolId: schoolId ?? null, teacherId: user?.id ?? null });
  const dbHomework = useHomework({ schoolId: schoolId ?? null, teacherId: user?.id ?? null });
  const dbTests = useTests({ schoolId: schoolId ?? null, teacherId: user?.id ?? null });
  const dbClasses = useClasses(schoolId ?? null);
  const dbMessages = useMessages(user?.id ?? null, schoolId ?? null);

  const [homework, setHomework] = useState(HOMEWORK);
  const [tests, setTests] = useState(TESTS);

  useEffect(() => {
    if (dbHomework.homework.length > 0) {
      setHomework(dbHomework.homework.map((h, idx) => ({
        id: idx + 1,
        title: h.title,
        subject: h.lessons?.title || "Mathematics",
        class: "Class A",
        due: new Date(h.due_date).toLocaleDateString(),
        questions: h.homework_questions?.length || 0,
        submissions: h.homework_submissions?.length || 0,
        total: 25,
        published: true,
        points: 100,
      })));
    }
  }, [dbHomework.homework]);

  useEffect(() => {
    if (dbTests.tests.length > 0) {
      setTests(dbTests.tests.map((t, idx) => ({
        id: idx + 1,
        title: t.title,
        subject: t.subjects?.name || "Mathematics",
        class: t.classes?.name || "Class A",
        date: new Date(t.test_date).toLocaleDateString(),
        duration: t.duration_minutes,
        questions: t.test_questions?.length || 0,
        submissions: t.test_submissions?.length || 0,
        total: 25,
        published: true,
      })));
    }
  }, [dbTests.tests]);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showCreateHW, setShowCreateHW] = useState(false);
  const [showCreateTest, setShowCreateTest] = useState(false);
  const [showMCQ, setShowMCQ] = useState<number | null>(null);
  const [selectedHW, setSelectedHW] = useState<number | null>(null);
  const [showTestResults, setShowTestResults] = useState<number | null>(null);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<typeof STUDENTS[0] | null>(null);
  const [messageTarget, setMessageTarget] = useState<{ name: string; relationship: "student" | "parent" } | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [hwForm, setHwForm] = useState({ title: "", subject: "", class: "", due: "", description: "" });
  const [testForm, setTestForm] = useState({ title: "", subject: "", class: "", date: "", duration: "" });
  const [mcqForm, setMcqForm] = useState({ question: "", opt1: "", opt2: "", opt3: "", opt4: "", correct: "", points: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tasks, setTasks] = useState([
    { id: 1, text: "Create Arabic Lesson", done: true },
    { id: 2, text: "Create homework", done: true },
    { id: 3, text: "Make complaint", done: false },
    { id: 4, text: "Create English Exam", done: false },
    { id: 5, text: "Reply message", done: false },
  ]);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const classNameById = new Map(dbClasses.classes.map(cls => [cls.id, cls.name]));
  const uniqueCourseNames = Array.from(new Set([
    ...dbLessons.lessons.map(lesson => lesson.subjects?.name).filter(Boolean),
    ...dbTests.tests.map(test => test.subjects?.name).filter(Boolean),
  ]));
  const uniqueClassNames = Array.from(new Set([
    ...dbLessons.lessons.map(lesson => lesson.classes?.name).filter(Boolean),
    ...dbTests.tests.map(test => test.classes?.name).filter(Boolean),
    ...dbHomework.homework.map(item => classNameById.get(item.lessons?.class_id || "")).filter(Boolean),
  ]));

  const now = new Date();
  const currentDay = now.getDay();
  const distanceToMonday = (currentDay + 6) % 7;
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - distanceToMonday);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const lessonsThisWeek = dbLessons.lessons.filter(lesson => {
    const lessonDate = new Date(lesson.lesson_date);
    return lessonDate >= startOfWeek && lessonDate < endOfWeek;
  }).length;

  const studentScoreMap = new Map<string, { name: string; scores: number[] }>();
  const classScoreMap = new Map<string, { label: string; scores: number[]; students: Set<string> }>();

  for (const item of dbHomework.homework) {
    const classLabel = classNameById.get(item.lessons?.class_id || "") || "Class";
    for (const submission of item.homework_submissions ?? []) {
      if (submission.score == null) continue;
      const name = [submission.profiles?.first_name, submission.profiles?.last_name].filter(Boolean).join(" ") || "Student";
      const existingStudent = studentScoreMap.get(submission.student_id) ?? { name, scores: [] };
      existingStudent.scores.push(Number(submission.score));
      studentScoreMap.set(submission.student_id, existingStudent);

      const existingClass = classScoreMap.get(classLabel) ?? { label: classLabel, scores: [], students: new Set<string>() };
      existingClass.scores.push(Number(submission.score));
      existingClass.students.add(submission.student_id);
      classScoreMap.set(classLabel, existingClass);
    }
  }

  for (const test of dbTests.tests) {
    const classLabel = test.classes?.name || "Class";
    for (const submission of test.test_submissions ?? []) {
      if (submission.score == null) continue;
      const name = [submission.profiles?.first_name, submission.profiles?.last_name].filter(Boolean).join(" ") || "Student";
      const existingStudent = studentScoreMap.get(submission.student_id) ?? { name, scores: [] };
      existingStudent.scores.push(Number(submission.score));
      studentScoreMap.set(submission.student_id, existingStudent);

      const existingClass = classScoreMap.get(classLabel) ?? { label: classLabel, scores: [], students: new Set<string>() };
      existingClass.scores.push(Number(submission.score));
      existingClass.students.add(submission.student_id);
      classScoreMap.set(classLabel, existingClass);
    }
  }

  const topStudents = Array.from(studentScoreMap.values())
    .map(student => ({
      name: student.name,
      average: Math.round(student.scores.reduce((sum, score) => sum + score, 0) / student.scores.length),
    }))
    .sort((left, right) => right.average - left.average)
    .slice(0, 4);

  const classProgress = Array.from(classScoreMap.values())
    .map(item => ({
      label: item.label,
      value: Math.round(item.scores.reduce((sum, score) => sum + score, 0) / item.scores.length),
      sub: `${item.students.size} students`,
    }))
    .sort((left, right) => left.label.localeCompare(right.label))
    .slice(0, 4);

  const workloadMap = new Map<string, { day: string; lessons: number; ts: number }>();
  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(now.getDate() - index);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    workloadMap.set(key, {
      day: date.toLocaleDateString(undefined, { weekday: "short" }),
      lessons: 0,
      ts: date.getTime(),
    });
  }
  for (const lesson of dbLessons.lessons) {
    const lessonDate = new Date(lesson.lesson_date);
    lessonDate.setHours(0, 0, 0, 0);
    const key = `${lessonDate.getFullYear()}-${lessonDate.getMonth()}-${lessonDate.getDate()}`;
    const existing = workloadMap.get(key);
    if (existing) {
      existing.lessons += 1;
    }
  }
  const workloadData = Array.from(workloadMap.values()).sort((left, right) => left.ts - right.ts);

  const upcomingActivities = [
    ...dbLessons.lessons.map(lesson => ({
      date: lesson.lesson_date,
      day: new Date(lesson.lesson_date).getDate().toString().padStart(2, "0"),
      title: lesson.title,
      sub: `${lesson.classes?.name || "Class"} lesson`,
      overdue: new Date(lesson.lesson_date) < now,
    })),
    ...dbHomework.homework.map(item => ({
      date: item.due_date,
      day: new Date(item.due_date).getDate().toString().padStart(2, "0"),
      title: item.title,
      sub: `Homework due`,
      overdue: new Date(item.due_date) < now,
    })),
    ...dbTests.tests.map(test => ({
      date: test.test_date,
      day: new Date(test.test_date).getDate().toString().padStart(2, "0"),
      title: test.title,
      sub: `${test.classes?.name || "Class"} test`,
      overdue: new Date(test.test_date) < now,
    })),
  ]
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
    .slice(0, 4);

  const recentMessages = dbMessages.conversations.slice(0, 4).map(conversation => ({
    id: conversation.partnerId,
    from: conversation.partnerName,
    time: conversation.lastTime ? new Date(conversation.lastTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "",
    preview: conversation.lastMessage,
  }));

  const createHW = () => {
    const e: Record<string, string> = {};
    if (!hwForm.title.trim()) e.title = "Title required";
    if (!hwForm.subject) e.subject = "Subject required";
    if (!hwForm.class) e.class = "Class required";
    if (!hwForm.due) e.due = "Due date required";
    if (Object.keys(e).length) { setErrors(e); return; }
    const newHW = { id: homework.length + 1, title: hwForm.title, subject: hwForm.subject, class: hwForm.class, due: hwForm.due, questions: 0, submissions: 0, total: 25, published: false, points: 100 };
    setHomework(prev => [...prev, newHW]);
    setHwForm({ title: "", subject: "", class: "", due: "", description: "" });
    setErrors({});
    setShowCreateHW(false);
    showToast("Homework created! Add MCQ questions to publish.");
  };

  const createTest = () => {
    const e: Record<string, string> = {};
    if (!testForm.title.trim()) e.title = "Title required";
    if (!testForm.subject) e.subject = "Subject required";
    if (!testForm.class) e.class = "Class required";
    if (!testForm.date) e.date = "Date required";
    if (!testForm.duration) e.duration = "Duration required";
    if (Object.keys(e).length) { setErrors(e); return; }
    setTests(prev => [...prev, { id: prev.length + 1, title: testForm.title, subject: testForm.subject, class: testForm.class, date: testForm.date, duration: Number(testForm.duration), questions: 0, submissions: 0, total: 25, published: false }]);
    setTestForm({ title: "", subject: "", class: "", date: "", duration: "" });
    setErrors({});
    setShowCreateTest(false);
    showToast("Test created! Add questions to publish.");
  };

  const saveMCQ = () => {
    const e: Record<string, string> = {};
    if (!mcqForm.question.trim()) e.question = "Question text required";
    if (!mcqForm.opt1.trim() || !mcqForm.opt2.trim() || !mcqForm.opt3.trim() || !mcqForm.opt4.trim()) e.options = "All 4 options required";
    if (!mcqForm.correct) e.correct = "Mark the correct answer";
    if (!mcqForm.points) e.points = "Set points value";
    if (Object.keys(e).length) { setErrors(e); return; }
    setHomework(prev => prev.map(h => h.id === showMCQ ? { ...h, questions: h.questions + 1 } : h));
    setMcqForm({ question: "", opt1: "", opt2: "", opt3: "", opt4: "", correct: "", points: "" });
    setErrors({});
    showToast("Question saved!");
  };

  const publishHW = (id: number) => {
    const hw = homework.find(h => h.id === id);
    if (!hw || hw.questions === 0) { showToast("Add at least one question before publishing", "error"); return; }
    setHomework(prev => prev.map(h => h.id === id ? { ...h, published: true } : h));
    showToast("Homework published! Students notified.");
  };

  const titleMap: Record<string, string> = {
    dashboard: "Home Page", classes: "My Classes", homework: "Tasks & Homework",
    tests: "Monthly Test", results: "Final Results", students: "My Students",
    messages: "Ticketing System", timetable: "Time Table"
  };

  return (
    <>
      <AppShell navItems={TEACHER_NAV} activeView={view} onSelect={setView} onLogout={onLogout} headerTitle={titleMap[view] || "Dashboard"} userName="Mrs. Fatima Bello" userRole="Mathematics Teacher">

        {view === "dashboard" && (
          <div className="space-y-5">
            {/* Top Stats */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard icon={<BookOpen className="w-5 h-5" />} label="Courses" value={String(uniqueCourseNames.length)} color="#7C5CBF" />
              <StatCard icon={<Layers className="w-5 h-5" />} label="Classes" value={String(uniqueClassNames.length)} color="#3B82F6" />
              <StatCard icon={<Users className="w-5 h-5" />} label="Students" value={String(studentScoreMap.size)} color="#10B981" />
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-12 gap-5">
              {/* Left Column */}
              <div className="col-span-4 space-y-4">
                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm flex flex-col items-center">
                  <CircleProgress value={lessonsThisWeek} max={Math.max(lessonsThisWeek, 10)} label="lessons this week" />
                </div>
                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                  <h4 className="font-bold text-foreground text-sm mb-3">Top Performing Students</h4>
                  <div className="space-y-3">
                    {topStudents.map((student, i) => (
                      <div key={`${student.name}-${i}`} className="flex items-center gap-3">
                        <Avatar name={student.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{student.name}</p>
                          <p className="text-xs text-muted-foreground">{student.average}% average</p>
                        </div>
                        {i === 0 && <span className="text-base">🔥</span>}
                        {i === 1 && <span className="text-base">⭐</span>}
                        {i === 2 && <span className="text-base">🌟</span>}
                      </div>
                    ))}
                    {topStudents.length === 0 && (
                      <p className="text-xs text-muted-foreground">No scored submissions yet.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Center Column */}
              <div className="col-span-5 space-y-4">
                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-foreground text-sm">Workload</h4>
                      <p className="text-xs text-muted-foreground">Apr 10 – Apr 17</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart id="chart-8" data={workloadData} barSize={18}>
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} cursor={{ fill: "rgba(124,92,191,0.05)" }} />
                      <Bar dataKey="lessons" fill="#C4B5FD" radius={[4, 4, 0, 0]} name="Lessons" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-2 mt-3 p-3 bg-green-50 rounded-xl border border-green-100">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    <p className="text-xs text-green-700 font-medium">You are doing great! Keep spreading your knowledge.</p>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="col-span-3 space-y-4">
                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                  <h4 className="font-bold text-foreground text-sm mb-3">Tasks</h4>
                  <div className="space-y-2">
                    {tasks.map(t => (
                      <div key={t.id} className="flex items-center gap-2.5 cursor-pointer" onClick={() => setTasks(prev => prev.map(tk => tk.id === t.id ? { ...tk, done: !tk.done } : tk))}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${t.done ? "border-primary bg-primary" : "border-gray-300"}`}>
                          {t.done && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className={`text-xs ${t.done ? "line-through text-muted-foreground" : "text-foreground font-medium"}`}>{t.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-foreground text-sm">Upcoming Activities</h4>
                    <button className="text-xs text-primary font-semibold">See all</button>
                  </div>
                  <div className="space-y-3">
                    {[{d:"31",t:"Meeting with the…",sub:"Meeting the Parents committee",over:true},{d:"04",t:"Meeting with the…",sub:"Staff meeting — room 12"},{d:"12",t:"Class B middle s…",sub:"Mid-term test"},{d:"18",t:"Send Mr Ayo cla…",sub:"Send class notes"}].map((a, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">{a.d}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{a.t}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{a.sub}</p>
                        </div>
                        {a.over && <Badge color="red">Overdue</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-2 gap-5">
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-foreground text-sm">Messages</h4>
                  <button className="text-xs text-primary font-semibold" onClick={() => setView("messages")}>View All</button>
                </div>
                <div className="space-y-4">
                  {recentMessages.map(message => (
                    <div key={message.id} className="flex items-start gap-3">
                      <Avatar name={message.from} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-sm font-semibold text-foreground">{message.from}</p>
                          <span className="text-[10px] text-muted-foreground">{message.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{message.preview}</p>
                      </div>
                    </div>
                  ))}
                  {recentMessages.length === 0 && (
                    <p className="text-xs text-muted-foreground">No recent messages from Supabase yet.</p>
                  )}
                </div>
              </div>
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                <h4 className="font-bold text-foreground text-sm mb-4">Class Progress</h4>
                <div className="space-y-3">
                  {classProgress.map(progress => (
                    <MiniProgress key={progress.label} label={progress.label} value={progress.value} sub={progress.sub} />
                  ))}
                  {classProgress.length === 0 && (
                    <p className="text-xs text-muted-foreground">Class averages will appear after students submit homework or tests.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "tests" && !showTestResults && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground">Monthly Tests</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Create and manage scheduled tests for your classes</p>
              </div>
              <Btn icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreateTest(true)}>Create Test</Btn>
            </div>
            <div className="space-y-4">
              {tests.map(t => (
                <div key={t.id} className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge color={t.published ? "green" : "yellow"}>{t.published ? "Published" : "Draft"}</Badge>
                        <Badge color="purple">{t.subject}</Badge>
                        <Badge color="blue">{t.class}</Badge>
                      </div>
                      <h4 className="font-bold text-foreground mb-1">{t.title}</h4>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{t.date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.duration} mins</span>
                        <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{t.questions} questions</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{t.submissions}/{t.total} submitted</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!t.published && (
                        <Btn size="sm" onClick={() => { setTests(prev => prev.map(test => test.id === t.id ? { ...test, published: true } : test)); showToast("Test published! Students notified."); }}>Publish</Btn>
                      )}
                      {t.published && (
                        <Btn size="sm" variant="secondary" icon={<Eye className="w-3 h-3" />} onClick={() => setShowTestResults(t.id)}>View Results</Btn>
                      )}
                    </div>
                  </div>
                  {t.published && (
                    <div className="mt-3 pt-3 border-t border-border flex items-center gap-3">
                      <div className="flex-1 bg-muted rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${(t.submissions / t.total) * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-primary">{Math.round((t.submissions / t.total) * 100)}% submitted</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "tests" && showTestResults !== null && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowTestResults(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back to Tests
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[{ label: "Submissions", value: "22/25", color: "#10B981" }, { label: "Class Avg", value: "74%", color: "#7C5CBF" }, { label: "Top Score", value: "98%", color: "#F59E0B" }].map(s => (
                <div key={s.label} className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
                <h3 className="font-bold text-foreground text-sm">Test Results</h3>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">
                  <Download className="w-3 h-3" /> Export
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {["#", "Student Name", "Result", "Max Score", "GPA", "Grade"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {HW_GRADES.map(s => {
                      const score = s.testScore;
                      const gpa = score >= 90 ? 4.0 : score >= 80 ? 3.5 : score >= 70 ? 3.0 : 2.5;
                      return (
                        <tr key={s.rank} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-sm font-bold text-muted-foreground">#{s.rank}</td>
                          <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={s.name} size="sm" /><span className="text-sm font-semibold text-foreground">{s.name}</span></div></td>
                          <td className="px-4 py-3"><span className="text-sm font-bold text-foreground">{score}%</span></td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">100</td>
                          <td className="px-4 py-3"><span className="text-sm font-bold" style={{ color: gpa >= 3.5 ? "#10B981" : gpa >= 3.0 ? "#7C5CBF" : "#F59E0B" }}>{gpa.toFixed(1)}</span></td>
                          <td className="px-4 py-3"><Badge color={s.grade.startsWith("A") ? "green" : "blue"}>{s.grade}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {view === "results" && (
          <div className="space-y-5">
            <div className="grid grid-cols-4 gap-4">
              <StatCard icon={<CheckCircle className="w-5 h-5" />} label="HW Submitted" value="30" color="#10B981" />
              <StatCard icon={<FileText className="w-5 h-5" />} label="Tests Done" value="22" color="#F59E0B" />
              <StatCard icon={<Award className="w-5 h-5" />} label="Class Average" value="78%" color="#7C5CBF" />
              <StatCard icon={<Star className="w-5 h-5" />} label="Average GPA" value="3.4" color="#3B82F6" />
            </div>
            {/* Filters */}
            <div className="flex items-center gap-3">
              <Select label="" value="Class A" onChange={() => {}} options={["Class A","Class B","Class C","Class D"].map(c => ({ value: c, label: c }))} />
              <Select label="" value="Mathematics" onChange={() => {}} options={["Mathematics","English","Physics","Chemistry","Biology"].map(s => ({ value: s, label: s }))} />
            </div>
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
                <h3 className="font-bold text-foreground text-sm">Final Results – Mathematics · Class A</h3>
                <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors">
                  <Download className="w-3 h-3" /> Export PDF
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {["#", "Student Name", "Result", "Max Score", "GPA", "Grade"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {HW_GRADES.map(s => {
                      const gpa = s.hwScore >= 90 ? 4.0 : s.hwScore >= 80 ? 3.5 : s.hwScore >= 70 ? 3.0 : 2.5;
                      return (
                        <tr key={s.rank} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-sm font-bold text-muted-foreground">#{s.rank}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3"><Avatar name={s.name} size="sm" /><span className="text-sm font-semibold text-foreground">{s.name}</span></div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-muted rounded-full">
                                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${s.hwScore}%` }} />
                              </div>
                              <span className="text-sm font-bold text-foreground">{s.hwScore}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">100</td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-bold" style={{ color: gpa >= 3.5 ? "#10B981" : gpa >= 3.0 ? "#7C5CBF" : "#F59E0B" }}>{gpa.toFixed(1)}</span>
                          </td>
                          <td className="px-4 py-3"><Badge color={s.grade.startsWith("A") ? "green" : s.grade.startsWith("B") ? "blue" : "gray"}>{s.grade}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {view === "students" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Select label="" value="Class A" onChange={() => {}} options={["Class A","Class B","Class C","Class D"].map(c => ({ value: c, label: c }))} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {STUDENTS.map(s => (
                <button key={s.id} onClick={() => setSelectedStudentProfile(s)} className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-4 text-left hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md transition-all">
                  <Avatar name={s.name} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.class}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge color={s.grade.startsWith("A") ? "green" : "blue"}>{s.grade}</Badge>
                      <span className="text-xs text-muted-foreground">{s.points} pts</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {view === "timetable" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Badge color="green">Published</Badge>
              <span className="text-sm text-muted-foreground">2023/2024 Academic Year</span>
            </div>
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-24">Time</th>
                    {Object.keys(TIMETABLE).map(d => (
                      <th key={d} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((slot, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-xs text-muted-foreground font-medium whitespace-nowrap">{slot}</td>
                      {Object.values(TIMETABLE).map((days, di) => (
                        <td key={di} className="px-4 py-3">
                          {days[i] === "Break" ? (
                            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-lg font-medium">Break</span>
                          ) : days[i] === "Free" ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className={`rounded-lg px-2 py-1.5 ${days[i] === "Mathematics" ? "bg-purple-50" : "bg-blue-50"}`}>
                              <p className={`text-xs font-semibold ${days[i] === "Mathematics" ? "text-primary" : "text-blue-600"}`}>{days[i]}</p>
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === "messages" && (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden h-[calc(100vh-180px)]">
            <div className="flex h-full">
              <div className="w-72 border-r border-border flex flex-col">
                <div className="p-4 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input placeholder="Search…" className="pl-9 pr-4 py-2 rounded-xl border border-border bg-muted text-sm outline-none w-full" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {MESSAGES.map(m => (
                    <div key={m.id} className="p-4 border-b border-border hover:bg-muted cursor-pointer transition-colors">
                      <div className="flex items-start gap-3">
                        <Avatar name={m.from} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-foreground">{m.from}</p>
                            <span className="text-[10px] text-muted-foreground">{m.time}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{m.preview}</p>
                        </div>
                        {m.unread && <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <Avatar name="Mayowa Ade" size="sm" />
                  <div>
                    <p className="text-sm font-bold text-foreground">Mayowa Ade</p>
                    <p className="text-xs text-emerald-500">Online</p>
                  </div>
                </div>
                <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-muted/30">
                  <div className="flex gap-3">
                    <Avatar name="Mayowa Ade" size="sm" />
                    <div className="bg-card rounded-2xl rounded-tl-none p-3 max-w-xs shadow-sm">
                      <p className="text-sm text-foreground">Good morning ma, I wanted to ask about the assignment you gave yesterday…</p>
                      <p className="text-[10px] text-muted-foreground mt-1">09:24 am</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    <input placeholder="Type a message…" className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                    <Btn icon={<Send className="w-4 h-4" />} onClick={() => showToast("Message sent")}>Send</Btn>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "classes" && (
          <TeacherClassesSectionLive schoolId={schoolId ?? null} teacherId={user?.id ?? null} />
        )}
      </AppShell>

      {showCreateTest && (
        <PublishQuestionModal
          mode="test"
          onClose={() => setShowCreateTest(false)}
          onPublish={item => {
            setTests(prev => [...prev, { id: prev.length + 1, title: item.title, subject: "Mathematics", class: "Class A", date: item.deadline.split(" ")[0], duration: 60, questions: item.questions, submissions: 0, total: 25, published: true }]);
            setShowCreateTest(false);
            showToast("Test created and published! Students notified.");
          }}
        />
      )}

      {selectedStudentProfile && <Modal title={selectedStudentProfile.name} onClose={() => setSelectedStudentProfile(null)}>
        <div className="space-y-5">
          <div className="flex items-center gap-4 rounded-2xl bg-secondary/50 p-4"><Avatar name={selectedStudentProfile.name} size="lg" /><div><p className="font-bold text-foreground">{selectedStudentProfile.name}</p><p className="text-sm text-muted-foreground">{selectedStudentProfile.class} · {selectedStudentProfile.email}</p><p className="mt-1 text-xs text-muted-foreground">Parent: {selectedStudentProfile.parent}</p></div></div>
          <div className="grid grid-cols-3 gap-3"><div className="rounded-xl bg-muted p-3 text-center"><p className="text-lg font-bold text-primary">{selectedStudentProfile.grade}</p><p className="text-xs text-muted-foreground">Current grade</p></div><div className="rounded-xl bg-muted p-3 text-center"><p className="text-lg font-bold text-foreground">{selectedStudentProfile.points}</p><p className="text-xs text-muted-foreground">Points</p></div><div className="rounded-xl bg-muted p-3 text-center"><p className="text-lg font-bold text-emerald-600">92%</p><p className="text-xs text-muted-foreground">Attendance</p></div></div>
          <div className="rounded-xl border border-border p-4 text-sm"><p className="font-semibold text-foreground">Academic snapshot</p><p className="mt-1 text-muted-foreground">Homework completion 88% · Monthly-test average 84% · Last activity today.</p></div>
          <div className="grid grid-cols-2 gap-3"><Btn icon={<MessageSquare className="w-4 h-4" />} onClick={() => { setMessageTarget({ name: selectedStudentProfile.name, relationship: "student" }); setMessageDraft(""); }}>Message Student</Btn><Btn variant="secondary" icon={<Users className="w-4 h-4" />} onClick={() => { setMessageTarget({ name: selectedStudentProfile.parent, relationship: "parent" }); setMessageDraft(""); }}>Message Parent</Btn></div>
        </div>
      </Modal>}
      {messageTarget && <Modal title={`Message ${messageTarget.name}`} onClose={() => setMessageTarget(null)}><div className="space-y-4"><p className="text-sm text-muted-foreground">Sending to the student's {messageTarget.relationship}.</p><textarea value={messageDraft} onChange={event => setMessageDraft(event.target.value)} rows={4} placeholder="Write your message…" className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" /><div className="flex gap-3"><Btn className="flex-1" onClick={() => { if (!messageDraft.trim()) { showToast("Write a message before sending", "error"); return; } setMessageTarget(null); setSelectedStudentProfile(null); showToast("Message sent successfully"); }}>Send Message</Btn><Btn variant="secondary" onClick={() => setMessageTarget(null)}>Cancel</Btn></div></div></Modal>}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}

// ─── Student Portal ───────────────────────────────────────────────────────────
const STUDENT_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <Home className="w-4 h-4" /> },
  { id: "courses", label: "My Courses", icon: <BookOpen className="w-4 h-4" /> },
  { id: "tests", label: "Monthly Tests", icon: <FileText className="w-4 h-4" /> },
  { id: "grades", label: "Final Grades", icon: <Award className="w-4 h-4" /> },
  { id: "timetable", label: "Timetable", icon: <Calendar className="w-4 h-4" /> },
  { id: "announcements", label: "Announcements", icon: <Megaphone className="w-4 h-4" /> },
  { id: "messages", label: "Messages", icon: <MessageSquare className="w-4 h-4" /> },
];
