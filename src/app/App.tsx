import { useState, useCallback, useEffect, useMemo } from "react";
import {
  LayoutDashboard, Users, BookOpen, Calendar, Bell, Settings,
  LogOut, Plus, X, Check, MessageSquare, Megaphone, Award,
  UserCheck, Upload, Eye, Edit, Trash2, Send, Home,
  CheckCircle, Star, TrendingUp, Video, FileText, Search, ChevronRight,
  Building2, PlayCircle, CheckSquare, Clock, Menu, Book, GraduationCap,
  Layers, ClipboardList, BarChart2, UserPlus, Globe, Shield, CreditCard,
  Hash, ChevronLeft, AlertCircle, FileSpreadsheet, ChevronDown,
  Activity, PieChart, Download, MoreHorizontal, Clipboard, Target,
  Zap, Coffee, EyeOff
} from "lucide-react";
import LoginImport from "@/imports/Login/index";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  LineChart, Line, AreaChart, Area, PieChart as RPieChart, Pie, Cell
} from "recharts";
import {
  Portal, NavItem, TEACHERS, STUDENTS, ANNOUNCEMENTS, MESSAGES,
  Avatar, Badge, Btn, StatCard, Modal, Toast, Input, Select, CircleProgress,
  AppShell, avatarColor, AVATAR_COLORS, TIMETABLE, TIME_SLOTS,
  HOMEWORK, TESTS, GRADES_DATA, ATTENDANCE_DATA, PERF_TREND,
  PLATFORM_STATS, WORKLOAD_DATA, ROLES, LanguageProvider, LanguageSwitcher, useLanguage, LessonWorkspace, EmptyState, LoadingState, ErrorState
} from "./shared";
import { SchoolAdminPortalLive as SchoolAdminPortal } from "./SchoolAdminPortalLive";
import { TeacherPortalLive as TeacherPortal } from "./TeacherPortalLive";
import { ParentPortal as ParentPortalLive, StudentPortal as StudentPortalLive } from "./StudentParentPortals";
import { AuthPage, ResetPasswordPage } from "./AuthPages";
import { useAuth } from "@/hooks/useAuth";
import { useSchools } from "@/hooks/useSchools";
import { useLeads } from "@/hooks/useLeads";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import supabase from "@/lib/supabase";
import { resetPassword as requestPasswordReset } from "@/lib/auth";
import { formatPlanDisplayName } from "@/lib/plans";

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({
  onLogin,
  onRequestPasswordReset,
}: {
  onLogin: (email: string, password: string) => Promise<string | null>;
  onRequestPasswordReset: (email: string) => Promise<string | null>;
}) {

  const { language } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [authModal, setAuthModal] = useState<"signup" | "reset" | null>(null);
  const [authNotice, setAuthNotice] = useState("");
  const [signUp, setSignUp] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [resetEmail, setResetEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError("Please enter your email and password"); return; }
    const err = await onLogin(email.trim(), password);
    if (err) setError(err);
  };


  const createAccount = () => {
    if (!signUp.email.trim() || !/^\S+@\S+\.\S+$/.test(signUp.email)) {
      setAuthNotice("Enter the email address you want your school administrator to activate.");
      return;
    }
    setAuthNotice("Accounts are created by your school administrator. Please contact your admin and share this email address.");
  };

  const requestReset = async () => {
    if (!/^\S+@\S+\.\S+$/.test(resetEmail)) { setAuthNotice("Enter a valid email address."); return; }
    const err = await onRequestPasswordReset(resetEmail.trim());
    setAuthNotice(err ?? "Password reset instructions were sent to your email address.");
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"} style={{ fontFamily: language === "ar" ? "Tahoma, Arial, sans-serif" : "'Poppins', sans-serif" }}>
      {/* Imported visual base: background + illustration */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <LoginImport />
      </div>

      {/* Interactive right panel — covers the white form area of the card */}
      {/* Card: 1051×604, centered: left=calc(50%-525.5px), top=calc(50%-320px) */}
      {/* Right panel starts at x=442 in card, full height */}
      <div
        className="absolute rounded-r-[12px] flex flex-col"
        style={{
          [language === "ar" ? "right" : "left"]: "calc(50% - 83.5px)",
          top: "calc(50% - 320px)",
          width: "609px",
          height: "604px",
          background: "#f5f5f5",
        }}
      >
        {/* Top bar: New User? Sign Up */}
        <div className="flex items-center justify-between px-8 pt-6 pb-0">
          <LanguageSwitcher />
          <p className="text-[14px] text-[#0e1b4a]">
            New User?{"  "}
            <button type="button" onClick={() => { setAuthModal("signup"); setAuthNotice(""); }} className="text-[#955ac3] font-medium hover:underline">Sign Up</button>
          </p>
        </div>

        {/* Form — matches the Figma layout: top=143px inside card */}
        <div className="flex-1 flex items-start" style={{ paddingTop: "78px", paddingLeft: "108px" }}>
          <form onSubmit={handleSubmit} className="w-[333px]">
            {/* Welcome */}
            <div className="mb-10">
              <p className="text-[26px] font-semibold text-[#0e1b4a] leading-tight">Welcome Back!</p>
              <p className="text-[16px] text-[#0e1b4a] opacity-80 mt-1">Login to continue</p>
            </div>

            {/* Email */}
            <div className="mb-4">
              <p className="text-[16px] text-[#955ac3] mb-[10px]">Email/User ID</p>
              <div className="relative w-full h-[44px] rounded-[8px]" style={{ background: "rgba(214,186,234,0.25)" }}>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
                    <path d="M1.5 1.5h19a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-19a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1z" stroke="#955AC3" strokeWidth="1.8" strokeLinejoin="round"/>
                    <path d="M1.5 2.5l9.5 7.5 9.5-7.5" stroke="#955AC3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(""); }}
                  placeholder="Enter registered email or user id"
                  className="absolute inset-0 w-full h-full bg-transparent outline-none pl-12 pr-3 text-[12px] font-medium text-[#2d2d2d] rounded-[8px]"
                  style={{ color: "#2d2d2d" }}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-4">
              <p className="text-[16px] text-[#955ac3] mb-[10px]">Password</p>
              <div className="relative w-full h-[44px] rounded-[8px]" style={{ background: "rgba(214,186,234,0.25)" }}>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
                    <rect x="1" y="9" width="16" height="10" rx="2" stroke="#955AC3" strokeWidth="1.8"/>
                    <path d="M5 9V6a4 4 0 0 1 8 0v3" stroke="#955AC3" strokeWidth="1.8" strokeLinecap="round"/>
                    <circle cx="9" cy="14" r="1.5" fill="#955AC3"/>
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  placeholder="Enter password"
                  className="absolute inset-0 w-full h-full bg-transparent outline-none pl-12 pr-10 text-[12px] font-medium text-[#2d2d2d] rounded-[8px]"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#955ac3] opacity-60 hover:opacity-100 transition-opacity"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Keep logged in / Forgot password */}
            <div className="flex items-center justify-between w-full mb-10">
              <button
                type="button"
                onClick={() => setKeepLoggedIn(p => !p)}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <div
                  className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors"
                  style={{ background: keepLoggedIn ? "#955ac3" : "transparent", border: keepLoggedIn ? "none" : "1.5px solid #955ac3" }}
                >
                  {keepLoggedIn && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                </div>
                <span className="text-[12px] font-medium text-[#955ac3]">Keep me logged in</span>
              </button>
              <button type="button" onClick={() => { setAuthModal("reset"); setAuthNotice(""); }} className="text-[12px] font-medium text-[#955ac3] opacity-70 hover:opacity-100 transition-opacity">
                Forgot password
              </button>
            </div>

            {error && (
              <p className="text-red-500 text-[11px] mb-3 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {error}
              </p>
            )}

            {/* Log In button */}
            <button
              type="submit"
              className="w-full h-[34px] rounded-[8px] text-white text-[12px] font-medium hover:opacity-90 active:scale-[0.99] transition-all"
              style={{ background: "#955ac3" }}
            >
              Log In
            </button>
          </form>
        </div>
      </div>

      {authModal === "signup" && <Modal title="Request account access" onClose={() => setAuthModal(null)}>
        <div className="space-y-3"><p className="text-sm text-muted-foreground">Student, teacher, parent, and school-admin accounts are provisioned by your school administrator.</p><Input label="Full name" value={signUp.name} onChange={value => setSignUp(s => ({ ...s, name: value }))} required /><Input label="Email" type="email" value={signUp.email} onChange={value => setSignUp(s => ({ ...s, email: value }))} required />{authNotice && <p className="text-xs text-primary">{authNotice}</p>}<Btn onClick={createAccount} className="w-full">Show access instructions</Btn></div>
      </Modal>}
      {authModal === "reset" && <Modal title="Reset your password" onClose={() => setAuthModal(null)}>
        <div className="space-y-4"><p className="text-sm text-muted-foreground">We will send password reset instructions to your registered email address.</p><Input label="Email" type="email" value={resetEmail} onChange={setResetEmail} required /><Btn onClick={requestReset} className="w-full">Send reset email</Btn>{authNotice && <p className="text-xs text-primary">{authNotice}</p>}</div>
      </Modal>}
    </div>
  );
}

// ─── Super Admin Portal ───────────────────────────────────────────────────────
// ─── Leads mock data ──────────────────────────────────────────────────────────
function RoleSelectionPage({
  roles,
  onSelect,
}: {
  roles: Array<{ role: string; school_id: string | null }>;
  onSelect: (role: string, schoolId: string | null) => void;
}) {
  const options = roles.map((item, index) => {
    const meta = ROLES.find(role => role.id === item.role.replace("_", "-"));
    return {
      key: `${item.role}-${item.school_id ?? "global"}-${index}`,
      role: item.role,
      schoolId: item.school_id,
      label: meta?.label ?? item.role,
      desc: meta?.desc ?? "Continue to your portal",
      icon: meta?.icon ?? <Shield className="w-7 h-7" />,
      color: meta?.color ?? "#7C5CBF",
      schoolLabel: item.school_id ? `School ${item.school_id.slice(0, 8)}` : "Platform-wide access",
    };
  });

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="absolute top-5 right-5"><LanguageSwitcher /></div>
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-foreground mb-2">Choose your portal</h2>
        <p className="text-muted-foreground text-base">Select the role and school context you want to open right now.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-w-5xl w-full">
        {options.map(option => (
          <button
            key={option.key}
            onClick={() => onSelect(option.role, option.schoolId)}
            className="group bg-card rounded-2xl p-6 text-left border border-border hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all duration-200 flex flex-col gap-4"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all" style={{ background: `${option.color}18`, color: option.color }}>
              {option.icon}
            </div>
            <div>
              <p className="font-bold text-foreground text-base mb-1">{option.label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{option.desc}</p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: option.color }}>{option.schoolLabel}</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold mt-auto" style={{ color: option.color }}>
              <span>Enter Portal</span><ChevronRight className="w-3 h-3" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

const LEADS_DATA = [
  { id: 1, schoolName: "Al-Nour Academy", owner: "Dr. Khalid Mansour", address: "12 Tahrir St, Cairo", governorate: "Cairo", students: 820, type: "Private", status: "New" },
  { id: 2, schoolName: "Future Stars School", owner: "Mrs. Hanan Rashid", address: "45 Corniche Rd, Alexandria", governorate: "Alexandria", students: 1200, type: "International", status: "Contacted" },
  { id: 3, schoolName: "Al-Iman National School", owner: "Mr. Youssef Salem", address: "7 El-Geish St, Giza", governorate: "Giza", students: 650, type: "National", status: "Converted" },
  { id: 4, schoolName: "Pioneers International", owner: "Dr. Mona Farouk", address: "22 Port Said Ave, Suez", governorate: "Suez", students: 430, type: "International", status: "New" },
  { id: 5, schoolName: "Dar El-Elm School", owner: "Mr. Ahmed Nabil", address: "3 Ramsis St, Cairo", governorate: "Cairo", students: 980, type: "Private", status: "Contacted" },
  { id: 6, schoolName: "Horizon Academy", owner: "Mrs. Samar Tawfik", address: "18 El-Nasr Rd, Mansoura", governorate: "Dakahlia", students: 550, type: "Private", status: "New" },
  { id: 7, schoolName: "El-Zahraa National", owner: "Dr. Ibrahim Lotfy", address: "9 Gamal St, Tanta", governorate: "Gharbia", students: 710, type: "National", status: "New" },
  { id: 8, schoolName: "Nile Valley School", owner: "Mr. Sherif Kamel", address: "55 University St, Assiut", governorate: "Assiut", students: 390, type: "National", status: "Contacted" },
  { id: 9, schoolName: "Modern Knowledge Academy", owner: "Mrs. Dalia Hassan", address: "31 October Rd, Ismailia", governorate: "Ismailia", students: 870, type: "Private", status: "New" },
  { id: 10, schoolName: "Bright Minds International", owner: "Dr. Rania Saleh", address: "14 Tourism Rd, Hurghada", governorate: "Red Sea", students: 290, type: "International", status: "Converted" },
];

const SUBSCRIPTION_PLANS_DEFAULT = [
  { id: 1, name: "Basic", price: 99, period: "mo", maxStudents: 300, maxTeachers: 20, features: ["Core LMS", "Homework builder", "Timetable"], color: "#6B7280", schools: 6 },
  { id: 2, name: "Standard", price: 249, period: "mo", maxStudents: 800, maxTeachers: 60, features: ["All Basic features", "Analytics dashboard", "Parent portal", "Messaging"], color: "#3B82F6", schools: 8 },
  { id: 3, name: "Premium", price: 499, period: "mo", maxStudents: 2000, maxTeachers: 150, features: ["All Standard features", "Advanced reports", "API access", "Priority support", "Custom branding"], color: "#7C5CBF", schools: 10 },
];

const SA_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "schools", label: "Schools", icon: <Building2 className="w-4 h-4" /> },
  { id: "leads", label: "Leads", icon: <Target className="w-4 h-4" /> },
  { id: "analytics", label: "Analytics", icon: <BarChart2 className="w-4 h-4" /> },
  { id: "subscriptions", label: "Subscriptions", icon: <CreditCard className="w-4 h-4" /> },
  { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
];

type AdminSchoolRow = {
  id: string;
  name: string;
  admin: string;
  adminEmail: string;
  phone: string;
  address: string;
  plan: string;
  status: "active" | "inactive";
  students: number;
  teachers: number;
  created: string;
};

type AdminPlanRow = {
  id: string;
  name: string;
  price: number;
  period: string;
  maxStudents: number;
  maxTeachers: number;
  features: string[];
  color: string;
  schools: number;
};

type AdminLeadRow = {
  id: string;
  schoolName: string;
  owner: string;
  phone: string;
  email: string;
  address: string;
  governorate: string;
  studentCount: string;
  students: number;
  type: string;
  status: string;
  message: string;
  createdAt: string;
};

const PLAN_COLORS = ["#6B7280", "#3B82F6", "#7C5CBF", "#10B981", "#F59E0B"];
type DashboardPortal = Exclude<Portal, "login">;

const PORTAL_VIEWS: Record<DashboardPortal, string[]> = {
  "super-admin": ["dashboard", "schools", "leads", "analytics", "subscriptions", "settings"],
  "school-admin": ["dashboard", "settings", "academic", "grades-classes", "teachers", "students", "timetable", "final-grades", "announcements", "messages"],
  teacher: ["dashboard", "classes", "tests", "results", "students", "messages", "timetable"],
  student: ["dashboard", "courses", "tests", "grades", "timetable", "announcements", "messages"],
  parent: ["dashboard", "progress", "attendance", "homework", "tests", "grades", "announcements", "messages"],
};

function normalizeAppPath(path: string) {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed || "/";
}

function getViewFromPath(path: string, portal: DashboardPortal) {
  const segments = normalizeAppPath(path).split("/").filter(Boolean);
  if (segments[0] !== "dashboard") return "dashboard";
  const candidate = segments[1] || "dashboard";
  return PORTAL_VIEWS[portal].includes(candidate) ? candidate : "dashboard";
}

function getDashboardPath(view: string) {
  return view === "dashboard" ? "/dashboard" : `/dashboard/${view}`;
}

function roleContextLabel(role: string, schoolName?: string | null) {
  const roleLabel = ROLES.find((item) => item.id === role.replace("_", "-"))?.label
    ?? role.replace(/_/g, " ");
  if (role === "super_admin") return roleLabel;
  return schoolName ? `${roleLabel} • ${schoolName}` : roleLabel;
}

function ActiveContextSwitcher({
  roles,
  activeRole,
  activeSchoolId,
  onSwitch,
}: {
  roles: Array<{ role: string; school_id: string | null }>;
  activeRole: string | null;
  activeSchoolId: string | null;
  onSwitch: (role: string, schoolId: string | null) => void;
}) {
  const { language } = useLanguage();
  const [schoolNames, setSchoolNames] = useState<Record<string, string>>({});
  const uniqueRoles = useMemo(
    () =>
      Array.from(
        new Map(
          roles.map((role) => [`${role.role}::${role.school_id ?? ""}`, role] as const),
        ).values(),
      ),
    [roles],
  );

  useEffect(() => {
    const schoolIds = Array.from(
      new Set(
        uniqueRoles
          .map((role) => role.school_id)
          .filter((schoolId): schoolId is string => Boolean(schoolId)),
      ),
    );

    if (schoolIds.length === 0) {
      setSchoolNames({});
      return;
    }

    let cancelled = false;
    void supabase
      .from("schools")
      .select("id, name")
      .in("id", schoolIds)
      .then(({ data }) => {
        if (cancelled) return;
        const nextMap = Object.fromEntries(
          ((data as Array<{ id: string; name: string }> | null) ?? []).map((school) => [school.id, school.name]),
        );
        setSchoolNames(nextMap);
      });

    return () => {
      cancelled = true;
    };
  }, [uniqueRoles]);

  const currentKey = `${activeRole ?? ""}::${activeSchoolId ?? ""}`;

  return (
    <div className="fixed bottom-4 left-4 z-40 w-72 rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {language === "ar" ? "سياق العمل" : "Active Context"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {language === "ar"
          ? "بدّل بين الأدوار أو المدارس المسموح بها."
          : "Switch between the roles and schools assigned to your account."}
      </p>
      <select
        value={currentKey}
        onChange={(event) => {
          const [role, schoolId] = event.target.value.split("::");
          onSwitch(role, schoolId || null);
        }}
        className="mt-3 w-full cursor-pointer rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
      >
        {uniqueRoles.map((role) => {
          const optionKey = `${role.role}::${role.school_id ?? ""}`;
          return (
            <option key={optionKey} value={optionKey}>
              {roleContextLabel(role.role, role.school_id ? schoolNames[role.school_id] ?? `School ${role.school_id.slice(0, 8)}` : null)}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function extractPlanFeatures(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.items)) {
      return record.items.filter((item): item is string => typeof item === "string");
    }
    return Object.entries(record)
      .filter(([, enabled]) => enabled === true)
      .map(([feature]) => feature);
  }
  return [];
}

function normalizeLeadStatus(status: string) {
  switch (status.toLowerCase()) {
    case "contacted":
      return "Contacted";
    case "qualified":
    case "closed":
    case "converted":
      return "Converted";
    default:
      return "New";
  }
}

function SuperAdminPortal({ view, setView, onLogout, userId }: { view: string; setView: (v: string) => void; onLogout: () => void; userId?: string | null }) {
  const dbSchools = useSchools();
  const dbLeads = useLeads();
  const dbPlans = useSubscriptionPlans();

  const schools: AdminSchoolRow[] = dbSchools.schools.map((school) => {
    const settings = (school.settings ?? {}) as Record<string, unknown>;
    const preferredPlan = typeof settings.preferred_plan === "string" && settings.preferred_plan.trim()
      ? settings.preferred_plan
      : null;
    const adminName = typeof school.admin_name === "string" && school.admin_name.trim()
      ? school.admin_name
      : typeof settings.admin_name === "string" && settings.admin_name.trim()
      ? settings.admin_name
      : "-";
    const adminEmail = typeof school.admin_email === "string" && school.admin_email.trim()
      ? school.admin_email
      : typeof settings.admin_email === "string"
      ? settings.admin_email
      : "";

    return {
      id: school.id,
      name: school.name,
      admin: adminName,
      adminEmail,
      phone: typeof settings.phone === "string" ? settings.phone : "",
      address: typeof settings.address === "string" ? settings.address : "",
      plan: school.school_subscriptions?.[0]?.subscription_plans?.name || preferredPlan || "-",
      status: school.is_active ? "active" : "inactive",
      students: typeof school.student_count === "number" ? school.student_count : (typeof settings.student_count === "number" ? settings.student_count : 0),
      teachers: typeof school.teacher_count === "number" ? school.teacher_count : (typeof settings.teacher_count === "number" ? settings.teacher_count : 0),
      created: new Date(school.created_at).toLocaleDateString(),
    };
  });

  const leads: AdminLeadRow[] = dbLeads.leads.map((lead) => ({
    id: lead.id,
    schoolName: lead.school_name,
    owner: lead.director_name,
    phone: lead.phone?.trim() || "-",
    email: lead.email?.trim() || "-",
    address: lead.address?.trim() || "-",
    governorate: lead.governorate?.trim() || "-",
    studentCount: lead.student_count?.trim() || "-",
    students: 0,
    type: lead.school_type?.trim() || "-",
    status: normalizeLeadStatus(lead.status),
    message: lead.message?.trim() || "",
    createdAt: new Date(lead.created_at).toLocaleDateString(),
  }));

  const plans: AdminPlanRow[] = dbPlans.plans.map((plan, idx) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price_cents / 100,
    period: plan.billing_cycle === "yearly" ? "yr" : "mo",
    maxStudents: plan.max_students ?? 0,
    maxTeachers: plan.max_teachers ?? 0,
    features: extractPlanFeatures(plan.features),
    color: PLAN_COLORS[idx % PLAN_COLORS.length],
    schools: schools.filter((school) => school.plan === plan.name).length,
  }));
  const setSchools = (_value: AdminSchoolRow[]) => {};
  const setPlans = (_value: AdminPlanRow[]) => {};
  const setLeads = (_value: AdminLeadRow[]) => {};

  useEffect(() => {
    if (!dbSchools.loading) {
      setSchools(dbSchools.schools.map((s) => {
        const settings = (s.settings ?? {}) as Record<string, unknown>;
        const preferredPlan = typeof settings.preferred_plan === "string" && settings.preferred_plan.trim()
          ? settings.preferred_plan
          : null;
        const adminName = typeof settings.admin_name === "string" && settings.admin_name.trim()
          ? settings.admin_name
          : "—";
        return {
        id: s.id,
        name: s.name,
        admin: adminName,
        adminEmail: typeof settings.admin_email === "string" ? settings.admin_email : "",
        phone: typeof settings.phone === "string" ? settings.phone : "",
        address: typeof settings.address === "string" ? settings.address : "",
        plan: s.school_subscriptions?.[0]?.subscription_plans?.name || preferredPlan || "—",
        status: s.is_active ? "active" : "inactive",
        students: typeof s.student_count === "number" ? s.student_count : (typeof settings.student_count === "number" ? settings.student_count : 0),
        teachers: typeof s.teacher_count === "number" ? s.teacher_count : (typeof settings.teacher_count === "number" ? settings.teacher_count : 0),
        created: new Date(s.created_at).toLocaleDateString(),
      };}));
    }
  }, [dbSchools.loading, dbSchools.schools]);

  useEffect(() => {
    if (!dbLeads.loading) {
      setLeads(dbLeads.leads.map(l => ({
        id: l.id,
        schoolName: l.school_name,
        owner: l.director_name,
        address: l.address?.trim() || "—",
        governorate: l.governorate?.trim() || "—",
        students: Number.isFinite(Number.parseInt(l.student_count ?? "", 10)) ? Number.parseInt(l.student_count ?? "", 10) : 0,
        type: l.school_type?.trim() || "—",
        status: normalizeLeadStatus(l.status),
      })));
    }
  }, [dbLeads.loading, dbLeads.leads]);

  useEffect(() => {
    if (!dbPlans.loading) {
      setPlans(dbPlans.plans.map((plan, idx) => ({
        id: plan.id,
        name: plan.name,
        price: plan.price_cents / 100,
        period: plan.billing_cycle === "yearly" ? "yr" : "mo",
        maxStudents: plan.max_students ?? 0,
        maxTeachers: plan.max_teachers ?? 0,
        features: extractPlanFeatures(plan.features),
        color: PLAN_COLORS[idx % PLAN_COLORS.length],
        schools: schools.filter(school => school.plan === plan.name).length,
      })));
    }
  }, [dbPlans.loading, dbPlans.plans, schools]);

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [showActivate, setShowActivate] = useState<string | null>(null);
  const [showDeactivate, setShowDeactivate] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({ name: "", admin: "", email: "", phone: "", address: "", plan: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [schoolSearch, setSchoolSearch] = useState("");
  // Subscriptions state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AdminPlanRow | null>(null);
  const [planForm, setPlanForm] = useState({ name: "", price: "", maxStudents: "", maxTeachers: "", features: "" });
  // Leads state
  const [leadSearch, setLeadSearch] = useState("");
  const [leadGovFilter, setLeadGovFilter] = useState("");
  const [leadTypeFilter, setLeadTypeFilter] = useState("");
  const [showContactModal, setShowContactModal] = useState<string | null>(null);


  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "School name is required";
    if (!form.admin.trim()) e.admin = "Admin name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.plan) e.plan = "Select a subscription plan";
    return e;
  };

  const createSchool = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const selectedPlan = dbPlans.plans.find(plan => plan.name === form.plan);
    if (!selectedPlan) {
      setErrors({ plan: "This subscription plan is not available in Supabase yet" });
      return;
    }
    const [adminFirstName, ...adminLastNameParts] = form.admin.trim().split(/\s+/);
    const result = await dbSchools.createSchool({
      school_name: form.name.trim(),
      plan_id: selectedPlan.id,
      admin_email: form.email.trim(),
      admin_first_name: adminFirstName,
      admin_last_name: adminLastNameParts.join(" "),
    });
    const createError = (result as { error?: string }).error;
    if (createError) {
      showToast(createError, "error");
      return;
    }
    const createdSchoolId = (result as { data?: { id?: string } }).data?.id;
    if (createdSchoolId) {
      await dbSchools.updateSchool(createdSchoolId, {
        settings: {
          admin_name: form.admin.trim(),
          admin_email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          preferred_plan: form.plan,
          student_count: 0,
          teacher_count: 0,
        },
      });
    }
    setForm({ name: "", admin: "", email: "", phone: "", address: "", plan: "" });
    setErrors({});
    setShowCreate(false);
    showToast(`${form.name} created! Credentials sent to admin.`);
  };

  const saveEdit = async () => {
    if (!form.name.trim() || !showEdit) { setErrors({ name: "School name is required" }); return; }
    const result = await dbSchools.updateSchool(showEdit, {
      name: form.name.trim(),
      settings: {
        admin_name: form.admin.trim(),
        admin_email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        preferred_plan: form.plan,
      },
    });
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    setShowEdit(null);
    showToast("School updated successfully.");
  };

  const activateSchool = async (id: string) => {
    const result = await dbSchools.activateSchool(id);
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    setShowActivate(null);
    showToast("School activated and admin notified.");
  };

  const deactivateSchool = async (id: string) => {
    const result = await dbSchools.deactivateSchool(id);
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    setShowDeactivate(null);
    showToast("School deactivated.", "error");
  };

  const deleteSchool = async (id: string) => {
    const result = await dbSchools.deleteSchool(id, true);
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    setShowDelete(null);
    showToast("School deleted permanently.", "error");
  };

  const openEdit = (s: AdminSchoolRow) => {
    setForm({ name: s.name, admin: s.admin, email: s.adminEmail, phone: s.phone, address: s.address, plan: s.plan });
    setErrors({});
    setShowEdit(s.id);
  };

  const openPlanModal = (plan?: AdminPlanRow) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({ name: plan.name, price: String(plan.price), maxStudents: String(plan.maxStudents), maxTeachers: String(plan.maxTeachers), features: plan.features.join(", ") });
    } else {
      setEditingPlan(null);
      setPlanForm({ name: "", price: "", maxStudents: "", maxTeachers: "", features: "" });
    }
    setShowPlanModal(true);
  };

  const savePlan = async () => {
    if (!planForm.name.trim() || !planForm.price) return;
    const feats = planForm.features.split(",").map(f => f.trim()).filter(Boolean);
    if (editingPlan) {
      const result = await dbPlans.updatePlan(editingPlan.id, {
        name: planForm.name.trim(),
        price_cents: Math.round(Number(planForm.price) * 100),
        max_students: Number(planForm.maxStudents) || null,
        max_teachers: Number(planForm.maxTeachers) || null,
        billing_cycle: "monthly",
        features: { items: feats },
        is_active: true,
      });
      if (result.error) {
        showToast(result.error, "error");
        return;
      }
      showToast("Plan updated successfully.");
    } else {
      const result = await dbPlans.createPlan({
        name: planForm.name.trim(),
        price_cents: Math.round(Number(planForm.price) * 100),
        max_students: Number(planForm.maxStudents) || null,
        max_teachers: Number(planForm.maxTeachers) || null,
        billing_cycle: "monthly",
        features: { items: feats },
        is_active: true,
      });
      if (result.error) {
        showToast(result.error, "error");
        return;
      }
      showToast("New plan created.");
    }
    setShowPlanModal(false);
  };

  const changeLeadStatus = async (id: string, status: string) => {
    const backendStatus = status === "Converted" ? "closed" : status.toLowerCase();
    const result = await dbLeads.updateLeadStatus(id, backendStatus);
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    showToast(`Lead status updated to "${status}".`);
  };

  const exportLeadsCSV = () => {
    const rows = [
      ["School Name", "Owner / Contact", "Address", "Governorate", "Students", "Type", "Status"],
      ...filteredLeads.map(l => [l.schoolName, l.owner, l.address, l.governorate, l.students, l.type, l.status])
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "leads.csv"; a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exported successfully.");
  };

  const filteredSchools = schools.filter(s => s.name.toLowerCase().includes(schoolSearch.toLowerCase()) || s.admin.toLowerCase().includes(schoolSearch.toLowerCase()));

  const filteredLeads = leads.filter(l => {
    const matchSearch = !leadSearch || l.schoolName.toLowerCase().includes(leadSearch.toLowerCase()) || l.owner.toLowerCase().includes(leadSearch.toLowerCase());
    const matchGov = !leadGovFilter || l.governorate === leadGovFilter;
    const matchType = !leadTypeFilter || l.type === leadTypeFilter;
    return matchSearch && matchGov && matchType;
  });

  const leadGovernorates = [...new Set(leads.map(l => l.governorate))];
  const leadStatusColor = (s: string) => s === "Converted" ? "green" : s === "Contacted" ? "blue" : "gray";

  const titleMap: Record<string, string> = { dashboard: "Platform Overview", schools: "Manage Schools", leads: "Leads", analytics: "Platform Analytics", subscriptions: "Subscription Plans", settings: "Settings" };
  const totalStudents = schools.reduce((sum, school) => sum + (school.students || 0), 0);
  const totalTeachers = schools.reduce((sum, school) => sum + (school.teachers || 0), 0);
  const activeSchools = schools.filter(school => school.status === "active").length;
  const convertedLeads = leads.filter(lead => lead.status === "Converted").length;
  const platformOverviewLoading = dbSchools.loading || dbLeads.loading;
  const platformOverviewError = dbSchools.error || dbLeads.error;
  const dashboardStats = [
    { label: "Total Schools", value: String(schools.length), sub: `${activeSchools} active` },
    { label: "Total Students", value: String(totalStudents), sub: "Across all schools" },
    { label: "Total Teachers", value: String(totalTeachers), sub: "Across all schools" },
    { label: "Converted Leads", value: String(convertedLeads), sub: `${leads.length} total leads` },
  ];
  const growthBuckets = new Map<string, { m: string; s: number; ts: number }>();
  for (const school of dbSchools.schools) {
    if (!school.created_at) continue;
    const date = new Date(school.created_at);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const existing = growthBuckets.get(key);
    if (existing) {
      existing.s += 1;
    } else {
      growthBuckets.set(key, {
        m: date.toLocaleDateString(undefined, { month: "short" }),
        s: 1,
        ts: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
      });
    }
  }
  const monthlyGrowth = Array.from(growthBuckets.values())
    .sort((left, right) => left.ts - right.ts)
    .slice(-6);

  return (
    <>
      <AppShell navItems={SA_NAV} activeView={view} onSelect={setView} onLogout={onLogout} headerTitle={titleMap[view] || "Dashboard"} userName="Super Admin" userRole="Platform Administrator" userId={userId}>

        {/* ── Dashboard ── */}
        {view === "dashboard" && (
          platformOverviewLoading ? (
            <LoadingState label="Loading platform overview…" />
          ) : platformOverviewError ? (
            <ErrorState title="We could not load the platform overview" description={platformOverviewError} onRetry={() => { dbSchools.fetchSchools(); dbLeads.fetchLeads(); }} />
          ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {dashboardStats.map(stat => (
                <StatCard key={stat.label} icon={<BarChart2 className="w-5 h-5" />} label={stat.label} value={stat.value} sub={stat.sub} />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-card rounded-2xl p-5 border border-border shadow-sm">
                <h3 className="font-bold text-foreground mb-4">Monthly Growth</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart id="chart-1" data={monthlyGrowth}>
                    <defs key="sa-grad-defs"><linearGradient id="sa-grad1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7C5CBF" stopOpacity={0.2}/><stop offset="95%" stopColor="#7C5CBF" stopOpacity={0}/></linearGradient></defs>
                    <XAxis dataKey="m" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                    <Area type="monotone" dataKey="s" stroke="#7C5CBF" fill="url(#sa-grad1)" strokeWidth={2} name="Schools" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                <h3 className="font-bold text-foreground mb-4">Recent Schools</h3>
                <div className="space-y-3">
                  {schools.slice(0, 5).map(s => (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.students} students</p>
                      </div>
                      <Badge color={s.status === "active" ? "green" : "gray"}>{s.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          )
        )}

        {/* ── Schools ── */}
        {view === "schools" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={schoolSearch} onChange={e => setSchoolSearch(e.target.value)} placeholder="Search schools…" className="pl-9 pr-4 py-2 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/30 w-60" />
              </div>
              <Btn icon={<Plus className="w-4 h-4" />} onClick={() => { setForm({ name: "", admin: "", email: "", phone: "", address: "", plan: "" }); setErrors({}); setShowCreate(true); }}>New School</Btn>
            </div>
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {["School Name", "Admin", "Plan", "Students", "Teachers", "Status", "Created", "Actions"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchools.map(s => (
                      <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                              <Building2 className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <span className="text-sm font-semibold text-foreground">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{s.admin}</td>
                        <td className="px-4 py-3"><Badge color={s.plan === "Premium" ? "purple" : s.plan === "Standard" ? "blue" : "gray"}>{formatPlanDisplayName(s.plan)}</Badge></td>
                        <td className="px-4 py-3 text-sm text-foreground">{s.students}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{s.teachers}</td>
                        <td className="px-4 py-3"><Badge color={s.status === "active" ? "green" : "yellow"}>{s.status}</Badge></td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{s.created}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => openEdit(s)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-secondary transition-colors" title="Edit">
                              <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            {s.status === "inactive" ? (
                              <button onClick={() => setShowActivate(s.id)} className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center hover:bg-green-100 transition-colors" title="Activate">
                                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                              </button>
                            ) : (
                              <button onClick={() => setShowDeactivate(s.id)} className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center hover:bg-amber-100 transition-colors" title="Deactivate">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                              </button>
                            )}
                            <button onClick={() => setShowDelete(s.id)} className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors" title="Delete">
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredSchools.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">No schools match your search.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Leads ── */}
        {view === "leads" && (
          <div className="space-y-5">
            {/* Summary pills */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Leads", value: leads.length, color: "#7C5CBF", bg: "#F5F0FF" },
                { label: "Contacted", value: leads.filter(l => l.status === "Contacted").length, color: "#3B82F6", bg: "#EFF6FF" },
                { label: "Converted", value: leads.filter(l => l.status === "Converted").length, color: "#10B981", bg: "#ECFDF5" },
              ].map(p => (
                <div key={p.label} className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: p.bg }}>
                    <Target className="w-5 h-5" style={{ color: p.color }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{p.value}</p>
                    <p className="text-xs text-muted-foreground">{p.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters row */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={leadSearch} onChange={e => setLeadSearch(e.target.value)} placeholder="Search by school or contact name…" className="pl-9 pr-4 py-2 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/30 w-full" />
              </div>
              <select value={leadGovFilter} onChange={e => setLeadGovFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground">
                <option value="">All Governorates</option>
                {leadGovernorates.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <select value={leadTypeFilter} onChange={e => setLeadTypeFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground">
                <option value="">All Types</option>
                {["Private", "International", "National"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {(leadSearch || leadGovFilter || leadTypeFilter) && (
                <button onClick={() => { setLeadSearch(""); setLeadGovFilter(""); setLeadTypeFilter(""); }} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">Clear filters</button>
              )}
              <div className="ml-auto">
                <Btn icon={<Download className="w-4 h-4" />} variant="secondary" onClick={exportLeadsCSV}>Export CSV</Btn>
              </div>
            </div>

            {/* Table */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {["School Name", "Director", "Phone", "Email", "Governorate", "Students", "Type", "Date", "Status", "Actions"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map(l => (
                      <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                              <Building2 className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <span className="text-sm font-semibold text-foreground whitespace-nowrap">{l.schoolName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{l.owner}</td>
                        <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap" dir="ltr">{l.phone}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground max-w-[180px] truncate" title={l.email} dir="ltr">{l.email}</td>
                        <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{l.governorate}</td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">{l.studentCount}</td>
                        <td className="px-4 py-3">
                          <Badge color={l.type === "دولية" || l.type === "International" ? "purple" : l.type === "لغات" || l.type === "Private" ? "blue" : "gray"}>{l.type}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{l.createdAt}</td>
                        <td className="px-4 py-3">
                          <Badge color={leadStatusColor(l.status)}>{l.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setShowContactModal(l.id)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary text-xs font-medium text-primary hover:bg-primary hover:text-white transition-all">
                              <Send className="w-3 h-3" /> Contact
                            </button>
                            <div className="relative group">
                              <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-xs font-medium text-foreground hover:bg-secondary transition-all">
                                <ChevronDown className="w-3 h-3" /> Status
                              </button>
                              <div className="absolute right-0 top-8 z-50 bg-card border border-border rounded-xl shadow-lg py-1 w-36 hidden group-hover:block">
                                {["New", "Contacted", "Converted"].map(st => (
                                  <button key={st} onClick={() => changeLeadStatus(l.id, st)} className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${l.status === st ? "font-semibold text-primary" : "text-foreground"}`}>{st}</button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredLeads.length === 0 && (
                      <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">No leads match your filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Showing {filteredLeads.length} of {leads.length} leads</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Analytics ── */}
        {view === "analytics" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                <h3 className="font-bold text-foreground mb-4">Schools by Plan</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <RPieChart id="chart-2">
                    <Pie data={[{name:"Premium",value:10},{name:"Standard",value:8},{name:"Basic",value:6}]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name, value}) => `${name}: ${value}`}>
                      {["#7C5CBF","#A78BFA","#DDD6FE"].map((c, i) => <Cell key={`plan-cell-${i}`} fill={c} />)}
                    </Pie>
                    <Tooltip />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                <h3 className="font-bold text-foreground mb-4">Revenue Overview</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart id="chart-3" data={[{month:"Jan",r:32000},{month:"Feb",r:38000},{month:"Mar",r:41000},{month:"Apr",r:48200}]}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "none" }} formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                    <Bar dataKey="r" fill="#7C5CBF" radius={[6, 6, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex justify-end">
              <Btn icon={<Download className="w-4 h-4" />} variant="secondary">Export Report</Btn>
            </div>
          </div>
        )}

        {/* ── Subscriptions ── */}
        {view === "subscriptions" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{plans.length} active plans · {schools.length} schools subscribed</p>
              <Btn icon={<Plus className="w-4 h-4" />} onClick={() => openPlanModal()}>Create Plan</Btn>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {plans.map(p => (
                <div key={p.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="h-1.5 w-full" style={{ background: p.color }} />
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${p.color}18` }}>
                          <CreditCard className="w-5 h-5" style={{ color: p.color }} />
                        </div>
                        <h3 className="font-bold text-foreground text-lg">{formatPlanDisplayName(p.name)}</h3>
                        <p className="text-sm text-muted-foreground">{p.schools} schools subscribed</p>
                      </div>
                      <button onClick={() => openPlanModal(p)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-secondary transition-colors">
                        <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <p className="text-3xl font-bold mb-1" style={{ color: p.color }}>${p.price}<span className="text-base font-medium text-muted-foreground">/{p.period}</span></p>
                    <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                      <p>Up to <strong className="text-foreground">{p.maxStudents.toLocaleString()}</strong> students</p>
                      <p>Up to <strong className="text-foreground">{p.maxTeachers}</strong> teachers</p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border space-y-2">
                      {p.features.map(f => (
                        <div key={f} className="flex items-center gap-2 text-xs text-foreground">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: p.color }} />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Assigned schools table */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Schools & Active Plans</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {["School", "Admin", "Plan", "Students", "Status", "Renewal"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {schools.map((s, i) => (
                      <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-semibold text-foreground">{s.name}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{s.admin}</td>
                        <td className="px-4 py-3"><Badge color={s.plan === "Premium" ? "purple" : s.plan === "Standard" ? "blue" : "gray"}>{formatPlanDisplayName(s.plan)}</Badge></td>
                        <td className="px-4 py-3 text-sm text-foreground">{s.students}</td>
                        <td className="px-4 py-3"><Badge color={s.status === "active" ? "green" : "yellow"}>{s.status}</Badge></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">Jul {14 + i}, 2024</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Settings ── */}
        {view === "settings" && (
          <div className="max-w-xl space-y-5">
            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm space-y-4">
              <h3 className="font-bold text-foreground">Platform Settings</h3>
              <Input label="Platform Name" value="Nibras" onChange={() => {}} />
              <Input label="Support Email" value="support@nibras.edu" onChange={() => {}} type="email" />
              <Input label="Max Schools per Plan" value="50" onChange={() => {}} />
              <Btn>Save Settings</Btn>
            </div>
          </div>
        )}
      </AppShell>

      {/* Create School Modal */}
      {showCreate && (
        <Modal title="Create New School" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <Input label="School Name" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="e.g. Greenfield Academy" required error={errors.name} />
            <Input label="Admin Name" value={form.admin} onChange={v => setForm(p => ({ ...p, admin: v }))} placeholder="e.g. Mr. John Adeyemi" required error={errors.admin} />
            <Input label="Admin Email" type="email" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} placeholder="admin@school.edu" required error={errors.email} />
            <Input label="Phone" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} placeholder="+20 100 000 0000" />
            <Input label="Address" value={form.address} onChange={v => setForm(p => ({ ...p, address: v }))} placeholder="School address" />
            <Select label="Subscription Plan" value={form.plan} onChange={v => setForm(p => ({ ...p, plan: v }))} required error={errors.plan}
              options={plans.map(pl => ({ value: pl.name, label: `${formatPlanDisplayName(pl.name)} – $${pl.price}/mo` }))} />
            <div className="flex gap-3 pt-2">
              <Btn onClick={createSchool} className="flex-1">Create School</Btn>
              <Btn variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit School Modal */}
      {showEdit !== null && (
        <Modal title="Edit School" onClose={() => setShowEdit(null)}>
          <div className="space-y-4">
            <Input label="School Name" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} required error={errors.name} />
            <Input label="Admin Name" value={form.admin} onChange={v => setForm(p => ({ ...p, admin: v }))} />
            <Select label="Subscription Plan" value={form.plan} onChange={v => setForm(p => ({ ...p, plan: v }))}
              options={plans.map(pl => ({ value: pl.name, label: `${formatPlanDisplayName(pl.name)} – $${pl.price}/mo` }))} />
            <div className="flex gap-3 pt-2">
              <Btn onClick={saveEdit} className="flex-1">Save Changes</Btn>
              <Btn variant="secondary" onClick={() => setShowEdit(null)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Activate Modal */}
      {showActivate !== null && (
        <Modal title="Activate School" onClose={() => setShowActivate(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              <p className="text-sm text-green-800">You are about to activate <strong>{schools.find(s => s.id === showActivate)?.name}</strong>. The school admin will be notified by email.</p>
            </div>
            <div className="flex gap-3">
              <Btn onClick={() => activateSchool(showActivate!)} className="flex-1">Confirm Activation</Btn>
              <Btn variant="secondary" onClick={() => setShowActivate(null)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Deactivate Modal */}
      {showDeactivate !== null && (
        <Modal title="Deactivate School" onClose={() => setShowDeactivate(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-800">Deactivating <strong>{schools.find(s => s.id === showDeactivate)?.name}</strong> will suspend access for all users. You can reactivate at any time.</p>
            </div>
            <div className="flex gap-3">
              <Btn onClick={() => deactivateSchool(showDeactivate!)} className="flex-1 !bg-amber-500 hover:!bg-amber-600">Deactivate</Btn>
              <Btn variant="secondary" onClick={() => setShowDeactivate(null)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Modal */}
      {showDelete !== null && (
        <Modal title="Delete School" onClose={() => setShowDelete(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
              <Trash2 className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-800">This will permanently delete <strong>{schools.find(s => s.id === showDelete)?.name}</strong> and all associated data. This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <Btn onClick={() => deleteSchool(showDelete!)} className="flex-1 !bg-red-500 hover:!bg-red-600">Delete Permanently</Btn>
              <Btn variant="secondary" onClick={() => setShowDelete(null)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Contact Lead Modal */}
      {showContactModal !== null && (
        <Modal title="Contact Lead" onClose={() => setShowContactModal(null)}>
          <div className="space-y-4">
            {(() => { const l = leads.find(x => x.id === showContactModal); return l ? (
              <div>
                <div className="p-4 bg-secondary rounded-xl mb-4 space-y-1">
                  <p className="font-semibold text-foreground">{l.schoolName}</p>
                  <p className="text-sm text-muted-foreground">{l.owner} · {l.governorate}</p>
                  <p className="text-sm text-muted-foreground" dir="ltr">📞 {l.phone}</p>
                  {l.email !== "-" && <p className="text-sm text-muted-foreground" dir="ltr">✉️ {l.email}</p>}
                  {l.studentCount !== "-" && <p className="text-sm text-muted-foreground">👥 {l.studentCount} طالب</p>}
                  {l.type !== "-" && <p className="text-sm text-muted-foreground">🏫 {l.type}</p>}
                  {l.message && <p className="text-sm text-muted-foreground italic mt-2">"{l.message}"</p>}
                </div>
                <Input label="Subject" value={`Partnership Inquiry – ${l.schoolName}`} onChange={() => {}} />
                <div className="mt-3">
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Message</label>
                  <textarea rows={4} className="w-full px-3 py-2 rounded-xl border border-border bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" defaultValue={`Dear ${l.owner},\n\nWe would like to discuss how Nibras can serve ${l.schoolName}…`} />
                </div>
                <div className="flex gap-3 pt-2">
                  <Btn icon={<Send className="w-4 h-4" />} onClick={() => { changeLeadStatus(l.id, "Contacted"); setShowContactModal(null); showToast("Message sent and status updated to Contacted."); }} className="flex-1">Send Message</Btn>
                  <Btn variant="secondary" onClick={() => setShowContactModal(null)}>Cancel</Btn>
                </div>
              </div>
            ) : null; })()}
          </div>
        </Modal>
      )}

      {/* Plan Create/Edit Modal */}
      {showPlanModal && (
        <Modal title={editingPlan ? "Edit Plan" : "Create New Plan"} onClose={() => setShowPlanModal(false)}>
          <div className="space-y-4">
            <Input label="Plan Name" value={planForm.name} onChange={v => setPlanForm(p => ({ ...p, name: v }))} placeholder="e.g. Enterprise" required />
            <Input label="Monthly Price (USD)" value={planForm.price} onChange={v => setPlanForm(p => ({ ...p, price: v }))} placeholder="e.g. 799" required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Max Students" value={planForm.maxStudents} onChange={v => setPlanForm(p => ({ ...p, maxStudents: v }))} placeholder="e.g. 5000" />
              <Input label="Max Teachers" value={planForm.maxTeachers} onChange={v => setPlanForm(p => ({ ...p, maxTeachers: v }))} placeholder="e.g. 300" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Features <span className="font-normal">(comma-separated)</span></label>
              <textarea rows={3} value={planForm.features} onChange={e => setPlanForm(p => ({ ...p, features: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="All Standard features, Custom branding, API access" />
            </div>
            <div className="flex gap-3 pt-2">
              <Btn onClick={savePlan} className="flex-1">{editingPlan ? "Save Changes" : "Create Plan"}</Btn>
              <Btn variant="secondary" onClick={() => setShowPlanModal(false)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}


const STUDENT_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <Home className="w-4 h-4" /> },
  { id: "courses", label: "My Courses", icon: <BookOpen className="w-4 h-4" /> },
  { id: "tests", label: "Monthly Tests", icon: <FileText className="w-4 h-4" /> },
  { id: "grades", label: "Final Grades", icon: <Award className="w-4 h-4" /> },
  { id: "timetable", label: "Timetable", icon: <Calendar className="w-4 h-4" /> },
  { id: "announcements", label: "Announcements", icon: <Megaphone className="w-4 h-4" /> },
  { id: "messages", label: "Messages", icon: <MessageSquare className="w-4 h-4" /> },
];

function StudentPortal({ view, setView, onLogout }: { view: string; setView: (v: string) => void; onLogout: () => void }) {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [activeTest, setActiveTest] = useState<number | null>(null);
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testQ, setTestQ] = useState(0);
  const [testDone, setTestDone] = useState(false);
  const [testReview, setTestReview] = useState(false);
  const [testSeconds, setTestSeconds] = useState(45 * 60);
  const [activeHW, setActiveHW] = useState<number | null>(null);
  const [hwAnswers, setHwAnswers] = useState<Record<number, string>>({});
  const [hwQ, setHwQ] = useState(0);
  const [hwDone, setHwDone] = useState(false);
  const [submittedHW, setSubmittedHW] = useState<number[]>([]);
  const [takenTests, setTakenTests] = useState<number[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedCourseLesson, setSelectedCourseLesson] = useState<{ id: number; title: string } | null>(null);
  const [courseTab, setCourseTab] = useState<"lessons" | "homework" | "tasks" | "grades">("lessons");
  const [activeCourseHW, setActiveCourseHW] = useState<number | null>(null);
  const [courseHWAnswers, setCourseHWAnswers] = useState<Record<number, string>>({});
  const [courseHWQ, setCourseHWQ] = useState(0);
  const [courseHWDone, setCourseHWDone] = useState(false);
  const [courseHWReview, setCourseHWReview] = useState(false);
  const [courseHWSeconds, setCourseHWSeconds] = useState(30 * 60);
  const [draftSavedAt, setDraftSavedAt] = useState("");
  const [testCourseFilter, setTestCourseFilter] = useState("All");
  const [testMonthFilter, setTestMonthFilter] = useState("All");

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    if (activeTest === null || testDone) return;
    const id = window.setInterval(() => setTestSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [activeTest, testDone]);
  useEffect(() => { if (activeTest !== null && !testDone && testSeconds === 0) { setTestReview(true); showToast("Time is up. Review and submit your test.", "error"); } }, [activeTest, testDone, testSeconds, showToast]);
  useEffect(() => {
    if (activeTest === null || testDone) return;
    window.localStorage.setItem(`nibras-test-draft-${activeTest}`, JSON.stringify({ answers: testAnswers, question: testQ, seconds: testSeconds }));
    setDraftSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }, [activeTest, testAnswers, testQ, testSeconds, testDone]);
  useEffect(() => {
    if (activeCourseHW === null || courseHWDone) return;
    const id = window.setInterval(() => setCourseHWSeconds(value => Math.max(0, value - 1)), 1000);
    window.localStorage.setItem(`nibras-homework-draft-${selectedCourse}-${activeCourseHW}`, JSON.stringify({ answers: courseHWAnswers, question: courseHWQ, seconds: courseHWSeconds }));
    setDraftSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    return () => window.clearInterval(id);
  }, [activeCourseHW, courseHWAnswers, courseHWQ, courseHWSeconds, courseHWDone, selectedCourse]);
  useEffect(() => { if (activeCourseHW !== null && !courseHWDone && courseHWSeconds === 0) { setCourseHWReview(true); showToast("Time is up. Review and submit your homework.", "error"); } }, [activeCourseHW, courseHWDone, courseHWSeconds, showToast]);

  const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const startTest = (id: number) => {
    const saved = JSON.parse(window.localStorage.getItem(`nibras-test-draft-${id}`) || "null") as { answers?: Record<number, string>; question?: number; seconds?: number } | null;
    setActiveTest(id); setTestAnswers(saved?.answers || {}); setTestQ(saved?.question || 0); setTestSeconds(saved?.seconds ?? 45 * 60); setTestDone(false); setTestReview(false);
  };
  const submitTest = () => { if (activeTest === null) return; window.localStorage.removeItem(`nibras-test-draft-${activeTest}`); setTestReview(false); setTestDone(true); setTakenTests(p => p.includes(activeTest) ? p : [...p, activeTest]); };
  const startCourseHomework = (id: number) => {
    const saved = JSON.parse(window.localStorage.getItem(`nibras-homework-draft-${selectedCourse}-${id}`) || "null") as { answers?: Record<number, string>; question?: number; seconds?: number } | null;
    setActiveCourseHW(id); setCourseHWAnswers(saved?.answers || {}); setCourseHWQ(saved?.question || 0); setCourseHWSeconds(saved?.seconds ?? 30 * 60); setCourseHWDone(false); setCourseHWReview(false);
  };
  const submitCourseHomework = () => { if (activeCourseHW === null) return; window.localStorage.removeItem(`nibras-homework-draft-${selectedCourse}-${activeCourseHW}`); setCourseHWReview(false); setCourseHWDone(true); showToast("Homework submitted!"); };

  const mockQuestions = [
    { q: "What is the derivative of x²?", opts: ["2x", "x²", "2", "x"] },
    { q: "Solve: 2x + 5 = 13", opts: ["x = 4", "x = 9", "x = 3", "x = 5"] },
    { q: "What is the value of π (pi) to 2 decimal places?", opts: ["3.14", "3.16", "3.12", "3.18"] },
    { q: "Which of these is a prime number?", opts: ["9", "15", "17", "21"] },
  ];

  const titleMap: Record<string, string> = {
    dashboard: "My Dashboard", courses: "My Courses",
    tests: "Monthly Tests", grades: "Final Grades",
    timetable: "Class Timetable", announcements: "Announcements", messages: "Messages"
  };

  const COURSE_LESSONS: Record<string, { id: number; title: string; date: string; duration: string; videoUrl?: string }[]> = {
    "Mathematics": [
      { id: 1, title: "Introduction to Algebra", date: "Apr 1, 2024", duration: "45 min", videoUrl: "https://youtube.com/watch?v=example" },
      { id: 2, title: "Quadratic Equations", date: "Apr 8, 2024", duration: "50 min" },
      { id: 3, title: "Algebraic Expressions", date: "Apr 15, 2024", duration: "40 min" },
    ],
    "English Language": [
      { id: 1, title: "Essay Writing Basics", date: "Apr 2, 2024", duration: "45 min" },
      { id: 2, title: "Reading Comprehension", date: "Apr 9, 2024", duration: "40 min" },
    ],
    "Physics": [
      { id: 1, title: "Newton's Laws of Motion", date: "Apr 3, 2024", duration: "55 min" },
      { id: 2, title: "Work, Energy & Power", date: "Apr 10, 2024", duration: "50 min" },
    ],
    "Chemistry": [
      { id: 1, title: "Periodic Table Overview", date: "Apr 4, 2024", duration: "45 min" },
    ],
    "Biology": [
      { id: 1, title: "Cell Structure & Function", date: "Apr 5, 2024", duration: "50 min" },
      { id: 2, title: "Photosynthesis", date: "Apr 12, 2024", duration: "45 min" },
    ],
  };

  const COURSE_HW: Record<string, { id: number; title: string; qType: string; questions: number; deadline: string; submitted: boolean; score?: number; maxScore: number }[]> = {
    "Mathematics": [
      { id: 1, title: "Algebraic Equations Practice", qType: "MCQ", questions: 5, deadline: "Apr 22, 2024", submitted: true, score: 88, maxScore: 100 },
      { id: 2, title: "Chapter 3 Problem Set", qType: "MCQ", questions: 3, deadline: "Apr 28, 2024", submitted: false, maxScore: 100 },
    ],
    "English Language": [
      { id: 1, title: "Essay: Environmental Impact", qType: "True/False", questions: 4, deadline: "Apr 24, 2024", submitted: true, score: 75, maxScore: 100 },
    ],
    "Physics": [
      { id: 1, title: "Newton's Laws Quiz", qType: "MCQ", questions: 6, deadline: "Apr 25, 2024", submitted: false, maxScore: 100 },
    ],
    "Chemistry": [], "Biology": [],
  };

  const COURSE_TASKS: Record<string, { id: number; title: string; qType: string; questions: number; deadline: string; submitted: boolean; score?: number; maxScore: number }[]> = {
    "Mathematics": [
      { id: 1, title: "Differentiation Exercise", qType: "MCQ", questions: 4, deadline: "Apr 30, 2024", submitted: false, maxScore: 100 },
    ],
    "English Language": [], "Physics": [], "Chemistry": [], "Biology": [],
  };

  const FINAL_GRADES_DATA = [
    { course: "Mathematics", score: 90, maxScore: 100, gpa: "4.0", grade: "A" },
    { course: "English Language", score: 80, maxScore: 100, gpa: "3.5", grade: "B+" },
    { course: "Physics", score: 80, maxScore: 100, gpa: "3.5", grade: "B+" },
    { course: "Chemistry", score: 70, maxScore: 100, gpa: "3.0", grade: "B" },
    { course: "Biology", score: 90, maxScore: 100, gpa: "4.0", grade: "A" },
  ];

  return (
    <>
      <AppShell navItems={STUDENT_NAV} activeView={view} onSelect={setView} onLogout={onLogout} headerTitle={titleMap[view] || "Dashboard"} userName="Joshua Ashiru" userRole="Student – Class A">

        {view === "dashboard" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<BookOpen className="w-5 h-5" />} label="My Courses" value="5" color="#7C5CBF" />
              <StatCard icon={<ClipboardList className="w-5 h-5" />} label="Pending HW" value="2" color="#F59E0B" />
              <StatCard icon={<FileText className="w-5 h-5" />} label="Tests This Month" value="1" color="#3B82F6" />
              <StatCard icon={<Award className="w-5 h-5" />} label="Overall Grade" value="A" color="#10B981" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-card rounded-2xl p-5 border border-border shadow-sm">
                <h3 className="font-bold text-foreground mb-4">Performance Trend</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart id="chart-4" data={PERF_TREND}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[60, 100]} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "none" }} />
                    <Line type="monotone" dataKey="score" stroke="#7C5CBF" strokeWidth={2.5} dot={{ fill: "#7C5CBF", r: 4 }} name="Score" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                  <h4 className="font-bold text-foreground text-sm mb-3">Upcoming</h4>
                  <div className="space-y-3">
                    {HOMEWORK.filter(h => h.published).slice(0, 2).map(hw => (
                      <div key={hw.id} className="flex items-start gap-3 p-3 bg-muted rounded-xl">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                          <ClipboardList className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{hw.title}</p>
                          <p className="text-[10px] text-muted-foreground">Due {hw.due}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm flex flex-col items-center">
                  <CircleProgress value={870} max={1000} label="Total Points Earned" sub="Rank #1 in Class A" />
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "courses" && !selectedCourse && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {["Mathematics","English Language","Physics","Chemistry","Biology"].map((sub, i) => (
              <div key={sub} onClick={() => { setSelectedCourse(sub); setSelectedCourseLesson(null); setCourseTab("lessons"); setCourseHWDone(false); setActiveCourseHW(null); }}
                className="bg-white rounded-xl p-5 border border-[#E7D8F4] shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer group">
                <div className="h-28 rounded-xl mb-4 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${AVATAR_COLORS[i]}18, ${AVATAR_COLORS[i]}05)` }}>
                  <div className="w-16 h-16 rounded-3xl bg-white/85 flex items-center justify-center shadow-sm"><Book className="w-8 h-8" style={{ color: AVATAR_COLORS[i] }} /></div>
                </div>
                <h4 className="font-semibold text-[#0E1B4A] mb-1">{sub}</h4>
                <p className="text-xs text-[#999] mb-3">{TEACHERS[i % TEACHERS.length].name}</p>
                <div className="rounded-lg bg-[#F0E3F8] px-3 py-2 flex items-center justify-between text-xs text-[#0E1B4A]">
                  <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> {(COURSE_LESSONS[sub] || []).length}</span>
                  <span className="h-4 w-px bg-[#8C8C8C]/40" />
                  <span className="flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> {i + 2}</span>
                  <span className="h-4 w-px bg-[#8C8C8C]/40" />
                  <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Class</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === "courses" && selectedCourse && selectedCourseLesson && !activeCourseHW && courseTab === "lessons" && (
          <LessonWorkspace
            className={selectedCourse}
            lessonTitle={selectedCourseLesson.title}
            onBack={() => setSelectedCourseLesson(null)}
            onOpenHomework={() => { setSelectedCourseLesson(null); setCourseTab("homework"); }}
          />
        )}

        {view === "courses" && selectedCourse && !selectedCourseLesson && !activeCourseHW && (
          <div className="space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {/* Header */}
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedCourse(null)} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-4 h-4 text-[#0E1B4A]" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-[#0E1B4A]">{selectedCourse}</h2>
                <p className="text-xs text-[#999]">{TEACHERS[["Mathematics","English Language","Physics","Chemistry","Biology"].indexOf(selectedCourse) % TEACHERS.length].name}</p>
              </div>
            </div>
            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-100">
              {(["lessons","homework","tasks","grades"] as const).map(tab => (
                <button key={tab} onClick={() => setCourseTab(tab)}
                  className={`px-5 py-2.5 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${courseTab === tab ? "border-[#955AC3] text-[#955AC3]" : "border-transparent text-[#999] hover:text-[#0E1B4A]"}`}>
                  {tab === "homework" ? "Homework" : tab === "tasks" ? "Tasks" : tab === "grades" ? "Grade Review" : "Lessons"}
                </button>
              ))}
            </div>

            {/* Lessons Tab */}
            {courseTab === "lessons" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {(COURSE_LESSONS[selectedCourse] || []).map((lesson, li) => (
                  <button key={lesson.id} onClick={() => setSelectedCourseLesson({ id: lesson.id, title: lesson.title })} className="bg-white rounded-xl border border-[#E7D8F4] shadow-sm overflow-hidden text-left hover:-translate-y-0.5 hover:shadow-md transition-all">
                    <div className="h-28 bg-gradient-to-br from-[#F8F3FC] to-[#EEE4F5] flex items-center justify-center"><div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm"><span className="text-lg font-bold text-[#955AC3]">{String(li + 1).padStart(2, "0")}</span></div></div>
                    <div className="p-4">
                      <h4 className="text-sm font-semibold text-[#0E1B4A] mb-2">{lesson.title}</h4>
                      <div className="flex items-center gap-3 text-xs text-[#999] mb-3"><span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{lesson.date}</span><span className="flex items-center gap-1"><Clock className="w-3 h-3" />{lesson.duration}</span></div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "#955AC3" }}><PlayCircle className="w-3.5 h-3.5" /> Watch lesson</span>
                    </div>
                  </button>
                ))}
                {(COURSE_LESSONS[selectedCourse] || []).length === 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center text-center">
                    <BookOpen className="w-10 h-10 text-gray-200 mb-3" />
                    <p className="text-sm text-[#999]">No lessons published yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Homework Tab */}
            {courseTab === "homework" && (
              <div className="space-y-3">
                {(COURSE_HW[selectedCourse] || []).length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center text-center">
                    <ClipboardList className="w-10 h-10 text-gray-200 mb-3" />
                    <p className="text-sm text-[#999]">No homework assigned yet</p>
                  </div>
                ) : (COURSE_HW[selectedCourse] || []).map(hw => (
                  <div key={hw.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#F5F0FF] text-[#955AC3]">{hw.qType}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${hw.submitted ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {hw.submitted ? "Submitted" : "Pending"}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-[#0E1B4A] mb-1">{hw.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-[#999]">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Due: {hw.deadline}</span>
                          <span>{hw.questions} questions</span>
                        </div>
                      </div>
                      {hw.submitted ? (
                        <div className="text-right shrink-0">
                          <p className="text-xl font-bold" style={{ color: (hw.score || 0) >= 80 ? "#10B981" : "#F59E0B" }}>{hw.score}%</p>
                          <p className="text-[10px] text-[#999]">{hw.score}/{hw.maxScore} pts</p>
                        </div>
                      ) : (
                        <button onClick={() => startCourseHomework(hw.id)}
                          className="px-4 py-2 rounded-lg text-white text-xs font-semibold shrink-0" style={{ background: "#955AC3" }}>
                          Start
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tasks Tab */}
            {courseTab === "tasks" && (
              <div className="space-y-3">
                {(COURSE_TASKS[selectedCourse] || []).length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center text-center">
                    <FileText className="w-10 h-10 text-gray-200 mb-3" />
                    <p className="text-sm text-[#999]">No tasks assigned yet</p>
                  </div>
                ) : (COURSE_TASKS[selectedCourse] || []).map(task => (
                  <div key={task.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#F5F0FF] text-[#955AC3]">{task.qType}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${task.submitted ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {task.submitted ? "Submitted" : "Pending"}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-[#0E1B4A] mb-1">{task.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-[#999]">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Due: {task.deadline}</span>
                          <span>{task.questions} questions</span>
                        </div>
                      </div>
                      {task.submitted ? (
                        <div className="text-right shrink-0">
                          <p className="text-xl font-bold text-[#955AC3]">{task.score}%</p>
                          <p className="text-[10px] text-[#999]">{task.score}/{task.maxScore} pts</p>
                        </div>
                      ) : (
                        <button className="px-4 py-2 rounded-lg text-white text-xs font-semibold shrink-0" style={{ background: "#955AC3" }}>
                          Start
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Grade Review Tab */}
            {courseTab === "grades" && (
              <div className="space-y-4">
                {/* Summary card */}
                {(() => {
                  const g = FINAL_GRADES_DATA.find(d => d.course === selectedCourse);
                  if (!g) return null;
                  return (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "#F5F0FF" }}>
                        <Award className="w-8 h-8 text-[#955AC3]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-[#0E1B4A] mb-1">{g.course} — Final Grade</h3>
                        <div className="flex items-center gap-6">
                          <div><p className="text-2xl font-bold text-[#955AC3]">{g.score}/{g.maxScore}</p><p className="text-xs text-[#999]">Score / Max</p></div>
                          <div><p className="text-2xl font-bold text-[#0E1B4A]">{g.gpa}</p><p className="text-xs text-[#999]">GPA</p></div>
                          <div><span className="px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-700">{g.grade}</span></div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {/* Component breakdown */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50">
                    <h4 className="text-sm font-semibold text-[#0E1B4A]">Assessment Breakdown</h4>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {[{ label: "Homework Average", score: 85, max: 100 }, { label: "Monthly Test", score: 88, max: 100 }, { label: "Final Exam", score: 90, max: 100 }].map(item => (
                      <div key={item.label} className="px-5 py-4 flex items-center gap-4">
                        <span className="text-sm font-medium text-[#0E1B4A] w-44 shrink-0">{item.label}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full">
                          <div className="h-2 rounded-full" style={{ width: `${(item.score / item.max) * 100}%`, background: "#955AC3" }} />
                        </div>
                        <span className="text-sm font-bold text-[#0E1B4A] w-16 text-right">{item.score}/{item.max}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Course HW submission flow */}
        {view === "courses" && selectedCourse && activeCourseHW !== null && !courseHWDone && !courseHWReview && (
          <div className="space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
            <div className="flex items-center gap-3">
              <button onClick={() => setActiveCourseHW(null)} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4 text-[#0E1B4A]" />
              </button>
              <h2 className="text-base font-bold text-[#0E1B4A]">Submit Homework</h2>
            </div>
            <div className="max-w-2xl bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <span className="text-sm font-semibold text-[#999]">Question {courseHWQ + 1} of {mockQuestions.length}</span>
                <span className="text-xs font-bold text-[#955AC3]">{formatTime(courseHWSeconds)} · Draft saved {draftSavedAt || "now"}</span>
                <div className="flex-1 mx-5 h-2 bg-gray-100 rounded-full">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(courseHWQ / mockQuestions.length) * 100}%`, background: "#955AC3" }} />
                </div>
              </div>
              <h4 className="font-bold text-[#0E1B4A] text-base mb-6">{mockQuestions[courseHWQ].q}</h4>
              <div className="space-y-3">
                {mockQuestions[courseHWQ].opts.map((opt, i) => (
                  <button key={i} onClick={() => setCourseHWAnswers(p => ({ ...p, [courseHWQ]: opt }))}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-sm font-medium text-left transition-all ${courseHWAnswers[courseHWQ] === opt ? "border-[#955AC3] bg-[#F5F0FF] text-[#955AC3]" : "border-gray-200 hover:border-[#955AC3]/40 text-[#0E1B4A]"}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${courseHWAnswers[courseHWQ] === opt ? "border-[#955AC3] bg-[#955AC3]" : "border-gray-300"}`}>
                      {courseHWAnswers[courseHWQ] === opt && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    {opt}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between mt-6">
                <button onClick={() => setCourseHWQ(q => Math.max(0, q - 1))} disabled={courseHWQ === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-[#0E1B4A] disabled:opacity-40 hover:bg-gray-50">
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                {courseHWQ < mockQuestions.length - 1 ? (
                  <button onClick={() => { if (!courseHWAnswers[courseHWQ]) { showToast("Please select an answer", "error"); return; } setCourseHWQ(q => q + 1); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: "#955AC3" }}>
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={() => setCourseHWReview(true)}
                    className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: "#955AC3" }}>
                    Submit Homework
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {view === "courses" && selectedCourse && activeCourseHW !== null && !courseHWDone && courseHWReview && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-[#E7D8F4] shadow-sm p-6 space-y-5"><div><h2 className="text-lg font-bold text-[#0E1B4A]">Review homework</h2><p className="text-sm text-[#999]">{Object.keys(courseHWAnswers).length} of {mockQuestions.length} questions answered. You can return and edit before final submission.</p></div><div className="grid grid-cols-2 gap-3">{mockQuestions.map((_, index) => <button key={index} onClick={() => { setCourseHWQ(index); setCourseHWReview(false); }} className={`rounded-xl border p-3 text-sm font-semibold ${courseHWAnswers[index] ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>Question {index + 1}: {courseHWAnswers[index] ? "Answered" : "Missing"}</button>)}</div><div className="flex justify-between"><Btn variant="secondary" onClick={() => setCourseHWReview(false)}>Back to edit</Btn><Btn onClick={submitCourseHomework}>Submit homework</Btn></div></div>
        )}

        {view === "courses" && selectedCourse && activeCourseHW !== null && courseHWDone && (
          <div className="max-w-md mx-auto" style={{ fontFamily: "'Poppins', sans-serif" }}>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-[#0E1B4A] mb-2">Homework Submitted!</h3>
              <p className="text-sm text-[#999] mb-6">Your answers have been recorded and your teacher will review them.</p>
              <div className="p-4 rounded-2xl mb-6" style={{ background: "#F5F0FF" }}>
                <p className="text-3xl font-bold text-[#955AC3]">88%</p>
                <p className="text-sm text-[#999]">Your Score</p>
              </div>
              <button onClick={() => { setActiveCourseHW(null); setCourseHWDone(false); }}
                className="w-full py-2.5 rounded-xl text-white font-semibold" style={{ background: "#955AC3" }}>
                Back to Course
              </button>
            </div>
          </div>
        )}


        {view === "tests" && !activeTest && (
          <div className="space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-2">
                <BookOpen className="w-4 h-4 text-[#999]" />
                <select value={testCourseFilter} onChange={e => setTestCourseFilter(e.target.value)} className="text-sm font-medium text-[#0E1B4A] bg-transparent outline-none cursor-pointer">
                  <option value="All">All Courses</option>
                  {["Mathematics","English Language","Physics","Chemistry","Biology"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-2">
                <Calendar className="w-4 h-4 text-[#999]" />
                <select value={testMonthFilter} onChange={e => setTestMonthFilter(e.target.value)} className="text-sm font-medium text-[#0E1B4A] bg-transparent outline-none cursor-pointer">
                  <option value="All">All Months</option>
                  {["January","February","March","April","May","June","July","August","September","October","November","December"].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            {/* Test list */}
            <div className="space-y-4">
              {TESTS.filter(t => t.published && (testCourseFilter === "All" || t.subject.startsWith(testCourseFilter.split(" ")[0]))).map(t => (
                <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#F5F0FF] text-[#955AC3]">{t.subject}</span>
                        {takenTests.includes(t.id)
                          ? <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700">Completed</span>
                          : <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700">Available</span>}
                      </div>
                      <h4 className="font-bold text-[#0E1B4A] mb-1">{t.title}</h4>
                      <div className="flex items-center gap-4 text-xs text-[#999]">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{t.date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.duration} mins</span>
                        <span>{t.questions} questions</span>
                      </div>
                    </div>
                    {takenTests.includes(t.id) ? (
                      <div className="text-center shrink-0">
                        <p className="text-2xl font-bold text-[#955AC3]">85%</p>
                        <p className="text-xs text-[#999]">34/{t.questions * 2} pts</p>
                      </div>
                    ) : (
                      <button onClick={() => startTest(t.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shrink-0" style={{ background: "#955AC3" }}>
                        <PlayCircle className="w-4 h-4" /> Start Test
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {TESTS.filter(t => t.published && (testCourseFilter === "All" || t.subject.startsWith(testCourseFilter.split(" ")[0]))).length === 0 && (
                <EmptyState title="No tests found" description="Try changing the course or month filters." />
              )}
            </div>
          </div>
        )}

        {view === "tests" && activeTest !== null && !testDone && !testReview && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="flex items-center justify-between bg-card rounded-xl p-3 border border-border shadow-sm">
              <span className="text-sm font-semibold text-foreground">April Mathematics Assessment</span>
              <div className="flex items-center gap-2 text-primary">
                <Clock className="w-4 h-4" /><span className="text-sm font-bold">{formatTime(testSeconds)}</span><span className="text-[10px] text-muted-foreground">Draft saved {draftSavedAt || "now"}</span>
              </div>
            </div>
            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-muted-foreground">Question {testQ + 1} of {mockQuestions.length}</span>
                <div className="flex-1 mx-4 bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${((testQ) / mockQuestions.length) * 100}%` }} />
                </div>
              </div>
              <h4 className="font-bold text-foreground text-base mb-6">{mockQuestions[testQ].q}</h4>
              <div className="space-y-3">
                {mockQuestions[testQ].opts.map((opt, i) => (
                  <button key={i} onClick={() => setTestAnswers(p => ({ ...p, [testQ]: opt }))}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-sm font-medium transition-all text-left ${testAnswers[testQ] === opt ? "border-primary bg-secondary text-primary" : "border-border hover:border-primary/50 text-foreground"}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${testAnswers[testQ] === opt ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                      {testAnswers[testQ] === opt && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    {opt}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between mt-6">
                <Btn variant="secondary" onClick={() => setTestQ(q => Math.max(0, q - 1))} disabled={testQ === 0} icon={<ChevronLeft className="w-4 h-4" />}>Previous</Btn>
                {testQ < mockQuestions.length - 1 ? (
                  <Btn onClick={() => setTestQ(q => q + 1)} icon={<ChevronRight className="w-4 h-4" />}>Next</Btn>
                ) : (
                  <Btn onClick={() => setTestReview(true)}>Review answers</Btn>
                )}
              </div>
            </div>
          </div>
        )}

        {view === "tests" && activeTest !== null && !testDone && testReview && (
          <div className="max-w-2xl mx-auto bg-card rounded-2xl p-6 border border-border shadow-sm space-y-5"><div><h2 className="text-lg font-bold text-foreground">Review test answers</h2><p className="text-sm text-muted-foreground">{Object.keys(testAnswers).length} of {mockQuestions.length} questions answered. Unanswered questions are marked for review.</p></div><div className="grid grid-cols-2 gap-3">{mockQuestions.map((_, index) => <button key={index} onClick={() => { setTestQ(index); setTestReview(false); }} className={`rounded-xl border p-3 text-sm font-semibold ${testAnswers[index] ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>Question {index + 1}: {testAnswers[index] ? "Answered" : "Missing"}</button>)}</div><div className="flex justify-between"><Btn variant="secondary" onClick={() => setTestReview(false)}>Back to edit</Btn><Btn onClick={submitTest}>Submit test</Btn></div></div>
        )}

        {view === "tests" && activeTest !== null && testDone && (
          <div className="max-w-md mx-auto">
            <div className="bg-card rounded-2xl p-8 border border-border shadow-sm text-center">
              <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Test Submitted!</h3>
              <div className="p-4 bg-secondary rounded-xl mb-6">
                <p className="text-3xl font-bold text-primary">85%</p>
                <p className="text-sm text-muted-foreground">34 / 40 correct</p>
              </div>
              <Btn onClick={() => { setActiveTest(null); setTestDone(false); }} className="w-full">Back to Tests</Btn>
            </div>
          </div>
        )}

        {view === "grades" && (
          <div className="space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#F5F0FF" }}>
                  <Award className="w-5 h-5 text-[#955AC3]" />
                </div>
                <div><p className="text-xs text-[#999]">Cumulative GPA</p><p className="text-xl font-bold text-[#0E1B4A]">3.80</p></div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#ECFDF5" }}>
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
                <div><p className="text-xs text-[#999]">Class Rank</p><p className="text-xl font-bold text-[#0E1B4A]">#2</p></div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#FFFBEB" }}>
                  <Star className="w-5 h-5 text-amber-500" />
                </div>
                <div><p className="text-xs text-[#999]">Distinctions</p><p className="text-xl font-bold text-[#0E1B4A]">2 Courses</p></div>
              </div>
            </div>
            {/* Final Grades table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-[#0E1B4A]">Final Exam Results — 2023/2024</h3>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-[#344054] hover:bg-gray-50">
                  <Download className="w-3 h-3" /> Export
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px]">
                  <thead>
                    <tr className="bg-[#F7F4FF]">
                      {["Course", "Score", "Max Score", "GPA", "Grade"].map(h => (
                        <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-[#0E1B4A]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FINAL_GRADES_DATA.map(g => (
                      <tr key={g.course} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#F5F0FF" }}>
                              <BookOpen className="w-4 h-4 text-[#955AC3]" />
                            </div>
                            <span className="text-sm font-semibold text-[#0E1B4A]">{g.course}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-[#0E1B4A]">{g.score}</td>
                        <td className="px-6 py-4 text-sm text-[#999]">{g.maxScore}</td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold" style={{ color: parseFloat(g.gpa) >= 3.7 ? "#10B981" : parseFloat(g.gpa) >= 3.0 ? "#955AC3" : "#F59E0B" }}>{g.gpa}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${g.grade.startsWith("A") ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{g.grade}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


        {view === "timetable" && (
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
                          <div className="bg-secondary rounded-lg px-2 py-1.5">
                            <p className="text-xs font-semibold text-primary">{days[i]}</p>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === "announcements" && (
          <div className="space-y-4">
            {ANNOUNCEMENTS.map(a => (
              <div key={a.id} className="bg-card rounded-2xl p-5 border border-border shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <Megaphone className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">{a.date} · {a.author}</span>
                </div>
                <h4 className="font-bold text-foreground mb-1">{a.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{a.body}</p>
              </div>
            ))}
          </div>
        )}

        {view === "messages" && (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden h-[calc(100vh-180px)]">
            <div className="flex h-full">
              <div className="w-64 border-r border-border flex flex-col">
                <div className="p-4 border-b border-border">
                  <Btn icon={<Plus className="w-4 h-4" />} className="w-full justify-center" size="sm">New Message</Btn>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {TEACHERS.slice(0, 3).map(t => (
                    <div key={t.id} className="p-3 border-b border-border hover:bg-muted cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar name={t.name} size="sm" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.subject}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold">Select a conversation</p>
                  <p className="text-xs mt-1">or start a new message</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </AppShell>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}

// ─── Parent Portal ────────────────────────────────────────────────────────────
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

function ParentPortal({ view, setView, onLogout }: { view: string; setView: (v: string) => void; onLogout: () => void }) {
  const [selectedChild, setSelectedChild] = useState("Joshua Ashiru");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const titleMap: Record<string, string> = {
    dashboard: "Parent Dashboard", progress: "Child Progress", attendance: "Attendance",
    homework: "Homework Results", tests: "Test Results", grades: "Final Grades",
    announcements: "Announcements", messages: "Messages"
  };

  return (
    <>
      <AppShell navItems={PARENT_NAV} activeView={view} onSelect={setView} onLogout={onLogout} headerTitle={titleMap[view] || "Dashboard"} userName="Mr. Ashiru" userRole="Parent">

        <div className="mb-5 flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card rounded-xl border border-border px-3 py-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)} className="text-sm font-semibold text-foreground bg-transparent outline-none cursor-pointer">
              <option>Joshua Ashiru</option>
              <option>Adeiola Ashiru</option>
            </select>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <Avatar name={selectedChild} size="sm" />
            <div>
              <p className="text-sm font-bold text-foreground">{selectedChild}</p>
              <p className="text-xs text-muted-foreground">Class A · 2023/2024</p>
            </div>
          </div>
        </div>

        {view === "dashboard" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<Award className="w-5 h-5" />} label="Overall Grade" value="A+" color="#7C5CBF" />
              <StatCard icon={<Activity className="w-5 h-5" />} label="Attendance" value="92%" color="#10B981" />
              <StatCard icon={<Star className="w-5 h-5" />} label="Class Rank" value="#1" color="#F59E0B" />
              <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Improvement" value="+8%" color="#3B82F6" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-card rounded-2xl p-5 border border-border shadow-sm">
                <h3 className="font-bold text-foreground mb-4">Academic Performance Trend</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart id="chart-5" data={PERF_TREND}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[60, 100]} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "none" }} />
                    <Line type="monotone" dataKey="score" stroke="#7C5CBF" strokeWidth={2.5} dot={{ fill: "#7C5CBF", r: 4 }} name="Score" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                  <h4 className="font-bold text-foreground text-sm mb-3">Subject Performance</h4>
                  <div className="space-y-3">
                    {GRADES_DATA.slice(0, 3).map(g => (
                      <div key={g.subject}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-foreground">{g.subject}</span>
                          <span className="font-semibold text-primary">{g.final}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full">
                          <div className="h-2 bg-primary rounded-full" style={{ width: `${g.final}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                  <h4 className="font-bold text-foreground text-sm mb-2">Recent Announcements</h4>
                  <div className="space-y-2">
                    {ANNOUNCEMENTS.slice(0, 2).map(a => (
                      <div key={a.id} className="text-xs">
                        <p className="font-semibold text-foreground truncate">{a.title}</p>
                        <p className="text-muted-foreground">{a.date}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "progress" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<Award className="w-5 h-5" />} label="GPA" value="3.92" color="#7C5CBF" />
              <StatCard icon={<Star className="w-5 h-5" />} label="Class Rank" value="#1 / 25" color="#10B981" />
              <StatCard icon={<CheckCircle className="w-5 h-5" />} label="HW Completed" value="8/10" color="#3B82F6" />
              <StatCard icon={<FileText className="w-5 h-5" />} label="Tests Taken" value="2/2" color="#F59E0B" />
            </div>
            <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
              <h3 className="font-bold text-foreground mb-4">Subject-wise Performance</h3>
              <div className="space-y-4">
                {GRADES_DATA.map(g => (
                  <div key={g.subject} className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-foreground w-36 shrink-0">{g.subject}</span>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-3 rounded-full transition-all duration-500" style={{ width: `${g.final}%`, background: g.grade.startsWith("A") ? "#7C5CBF" : "#3B82F6" }} />
                    </div>
                    <span className="text-sm font-bold text-foreground w-8 text-right">{g.final}%</span>
                    <Badge color={g.grade.startsWith("A") ? "green" : "blue"}>{g.grade}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === "attendance" && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Present" value="71 days" color="#10B981" />
              <StatCard icon={<AlertCircle className="w-5 h-5" />} label="Absent" value="6 days" color="#EF4444" />
              <StatCard icon={<Activity className="w-5 h-5" />} label="Rate" value="92%" color="#7C5CBF" />
            </div>
            <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
              <h3 className="font-bold text-foreground mb-4">Monthly Attendance Trend</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart id="chart-6" data={ATTENDANCE_DATA}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none" }} />
                  <Bar dataKey="present" fill="#7C5CBF" radius={[4, 4, 0, 0]} name="Present" />
                  <Bar dataKey="absent" fill="#FCA5A5" radius={[4, 4, 0, 0]} name="Absent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {view === "homework" && (
          <div className="space-y-4">
            {HOMEWORK.filter(h => h.published).map((hw, i) => (
              <div key={hw.id} className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge color="purple">{hw.subject}</Badge>
                      <Badge color="green">Submitted</Badge>
                    </div>
                    <h4 className="font-bold text-foreground mb-1">{hw.title}</h4>
                    <p className="text-xs text-muted-foreground">Submitted on {hw.due} · {hw.class}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{80 + i * 5}%</p>
                    <p className="text-xs text-muted-foreground">{hw.points * (80 + i * 5) / 100}/{hw.points} pts</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === "tests" && (
          <div className="space-y-4">
            {TESTS.filter(t => t.published).map((t, i) => (
              <div key={t.id} className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge color="purple">{t.subject}</Badge>
                      <Badge color="green">Completed</Badge>
                    </div>
                    <h4 className="font-bold text-foreground mb-1">{t.title}</h4>
                    <p className="text-xs text-muted-foreground">{t.date} · {t.class} · Rank #1</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{85 + i * 5}%</p>
                    <p className="text-xs text-muted-foreground">Class avg: {72 + i * 3}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === "grades" && (
          <div className="space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#0E1B4A]">Final Results — {selectedChild} · 2023/2024</h3>
              <button onClick={() => showToast("PDF report generated")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-[#344054] hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4" /> Export PDF
              </button>
            </div>
            {/* Summary row */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Cumulative GPA", value: "3.80", color: "#955AC3", bg: "#F5F0FF", icon: <Award className="w-5 h-5" /> },
                { label: "Class Rank", value: "#1 / 25", color: "#10B981", bg: "#ECFDF5", icon: <TrendingUp className="w-5 h-5" /> },
                { label: "Overall Grade", value: "A", color: "#F59E0B", bg: "#FFFBEB", icon: <Star className="w-5 h-5" /> },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-5 flex items-center gap-3 border border-gray-100" style={{ background: s.bg }}>
                  <div style={{ color: s.color }}>{s.icon}</div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: s.color }}>{s.label}</p>
                    <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Course results table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50">
                <h4 className="text-[15px] font-semibold text-[#0E1B4A]">Course Results Summary</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px]">
                  <thead>
                    <tr className="bg-[#F7F4FF]">
                      {["Course", "Score", "Max Score", "GPA", "Grade"].map(h => (
                        <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-[#0E1B4A]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { course: "Mathematics", score: 90, maxScore: 100, gpa: "4.0", grade: "A" },
                      { course: "English Language", score: 80, maxScore: 100, gpa: "3.5", grade: "B+" },
                      { course: "Physics", score: 80, maxScore: 100, gpa: "3.5", grade: "B+" },
                      { course: "Chemistry", score: 70, maxScore: 100, gpa: "3.0", grade: "B" },
                      { course: "Biology", score: 90, maxScore: 100, gpa: "4.0", grade: "A" },
                    ].map(g => (
                      <tr key={g.course} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#F5F0FF" }}>
                              <BookOpen className="w-4 h-4 text-[#955AC3]" />
                            </div>
                            <span className="text-sm font-semibold text-[#0E1B4A]">{g.course}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-[#0E1B4A]">{g.score}</td>
                        <td className="px-6 py-4 text-sm text-[#999]">{g.maxScore}</td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold" style={{ color: parseFloat(g.gpa) >= 3.7 ? "#10B981" : parseFloat(g.gpa) >= 3.0 ? "#955AC3" : "#F59E0B" }}>{g.gpa}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${g.grade.startsWith("A") ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{g.grade}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {view === "announcements" && (
          <div className="space-y-4">
            {ANNOUNCEMENTS.map(a => (
              <div key={a.id} className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <Megaphone className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">{a.date} · {a.author}</span>
                </div>
                <h4 className="font-bold text-foreground mb-1">{a.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{a.body}</p>
              </div>
            ))}
          </div>
        )}

        {view === "messages" && (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden h-[calc(100vh-200px)]">
            <div className="flex h-full">
              <div className="w-64 border-r border-border flex flex-col">
                <div className="p-4 border-b border-border">
                  <Btn icon={<Plus className="w-4 h-4" />} className="w-full justify-center" size="sm">Message Teacher</Btn>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {TEACHERS.slice(0, 3).map(t => (
                    <div key={t.id} className="p-3 border-b border-border hover:bg-muted cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar name={t.name} size="sm" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.subject}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold">Select a teacher to message</p>
                  <p className="text-xs mt-1">or start a new conversation</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </AppShell>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const auth = useAuth();
  const [view, setView] = useState("dashboard");
  const [currentPath, setCurrentPath] = useState(() => normalizeAppPath(window.location.pathname));
  const isResetRoute = currentPath === "/reset";

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(normalizeAppPath(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (auth.loading || isResetRoute) return;

    if (auth.portal === "login") {
      const desiredAuthPath = currentPath === "/signup" ? "/signup" : "/login";
      if (currentPath !== desiredAuthPath) {
        window.history.replaceState(null, "", desiredAuthPath);
        setCurrentPath(desiredAuthPath);
      }
      if (view !== "dashboard") {
        setView("dashboard");
      }
      return;
    }

    const nextView = getViewFromPath(currentPath, auth.portal as DashboardPortal);
    if (view !== nextView) {
      setView(nextView);
    }

    const desiredPath = getDashboardPath(nextView);
    if (currentPath !== desiredPath) {
      window.history.replaceState(null, "", desiredPath);
      setCurrentPath(desiredPath);
    }
  }, [auth.loading, auth.portal, currentPath, isResetRoute, view]);

  const handleLogout = async () => {
    await auth.signOut();
    setView("dashboard");
  };

  const handleViewChange = (v: string) => {
    setView(v);
    if (auth.portal !== "login") {
      const nextPath = getDashboardPath(v);
      if (currentPath !== nextPath) {
        window.history.pushState(null, "", nextPath);
        setCurrentPath(nextPath);
      }
    }
  };

  const handleContextSwitch = (role: string, schoolId: string | null) => {
    auth.setActiveRole(role, schoolId);
    setView("dashboard");
    const nextPath = getDashboardPath("dashboard");
    if (currentPath !== nextPath) {
      window.history.replaceState(null, "", nextPath);
      setCurrentPath(nextPath);
    }
  };

  return (
    <LanguageProvider>
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {auth.loading && <LoadingState title="Connecting to your workspace" description="Fetching your account, school context, and role permissions." />}
        {!auth.loading && isResetRoute && <ResetPasswordPage />}
        {!auth.loading && !isResetRoute && auth.portal === "login" && (
          <AuthPage
            onLogin={auth.signIn}
            onSignUpSchool={auth.signUpSchool}
            authError={auth.error}
          />
        )}
        {!auth.loading && !isResetRoute && auth.portal === "super-admin" && <SuperAdminPortal view={view} setView={handleViewChange} onLogout={handleLogout} userId={auth.user?.id ?? null} />}
        {!auth.loading && !isResetRoute && auth.portal === "school-admin" && <SchoolAdminPortal view={view} setView={handleViewChange} onLogout={handleLogout} schoolId={auth.activeSchoolId} user={auth.user} />}
        {!auth.loading && !isResetRoute && auth.portal === "teacher" && <TeacherPortal view={view} setView={handleViewChange} onLogout={handleLogout} schoolId={auth.activeSchoolId} user={auth.user} />}
        {!auth.loading && !isResetRoute && auth.portal === "student" && <StudentPortalLive view={view} setView={handleViewChange} onLogout={handleLogout} schoolId={auth.activeSchoolId} user={auth.user} />}
        {!auth.loading && !isResetRoute && auth.portal === "parent" && <ParentPortalLive view={view} setView={handleViewChange} onLogout={handleLogout} schoolId={auth.activeSchoolId} user={auth.user} />}
        {!auth.loading && !isResetRoute && auth.user && auth.roles.length > 1 && (
          <ActiveContextSwitcher
            roles={auth.roles}
            activeRole={auth.activeRole}
            activeSchoolId={auth.activeSchoolId}
            onSwitch={handleContextSwitch}
          />
        )}
      </div>
    </LanguageProvider>
  );
}
