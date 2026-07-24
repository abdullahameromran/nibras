import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { resetPassword as requestPasswordReset, type SchoolSignupPayload, updatePassword } from "@/lib/auth";
import { LanguageSwitcher, useTranslation } from "./shared";
import nibrasLogo from "@/imports/WhatsApp_Image_2026-07-16_at_3.02.45_PM.jpeg";

type AuthMode = "login" | "signup";
type NoticeType = "error" | "success" | "info";

type NoticeState = {
  type: NoticeType;
  message: string;
} | null;

const AUTH_TEXT = {
  ar: {
    brandName: "منصة نبراس التعليمية",
    secureLoginBadge: "تسجيل دخول آمن لكل أدوار المدرسة",
    marketingTitle: "إدارة شاملة ومتكاملة لمدرستك من مكان واحد",
    marketingSubtitle: "تسجيل دخول موحد لمديري المدارس، المعلمين، أولياء الأمور والطلاب. متابعة فورية للأداء، الحضور والدرجات في منصة سحابية واحدة.",

    feature1Title: "إعداد المدرسة",
    feature1Desc: "أنشئ حساب مدرستك والحساب الإداري واشتراكك في خطوة واحدة بسيطة.",
    feature2Title: "صلاحيات مخصصة",
    feature2Desc: "توجيه تلقائي لكل مستخدم إلى لوحة التحكم الخاصة بدوره بعد تسجيل الدخول.",
    feature3Title: "بيانات حية ومحدثة",
    feature3Desc: "الدروس، الحضور، الدرجات والإعلانات متصلة فوراً بالنظام المركزي.",

    pill1Label: "الدخول",
    pill1Text: "تسجيل مباشر بالبريد الإلكتروني",
    pill2Label: "التهيئة",
    pill2Text: "دعوات الموظفين والطلاب بسهولة",
    pill3Label: "الأمان",
    pill3Text: "تشفير بيانات ورسائل تعيين المرور",

    cardBadge: "وصول آمن للنظام",
    loginTitle: "تسجيل الدخول إلى حسابك",
    signupTitle: "إنشاء حساب مدرسة جديدة",
    loginSubtitle: "أدخل البريد الإلكتروني وكلمة المرور المسجلة. ستقوم المنصة بتوجيهك تلقائياً إلى لوحة التحكم الخاصة بك.",
    signupSubtitle: "قم بتسجيل مدرستك وإنشاء حساب مدير المدرسة. المعلمون والطلاب وأولياء الأمور يحصلون على حساباتهم بعد إنشائها من اللوحة.",

    tabLogin: "تسجيل الدخول",
    tabSignup: "إنشاء حساب جديدة",

    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "name@school.com",
    passwordLabel: "كلمة المرور",
    passwordPlaceholder: "أدخل كلمة المرور",
    forgotPassword: "نسيت كلمة المرور؟",
    helperLoginInfo: "استخدم بيانات الدخول المزودة من مدرستك أو مدير المنصة.",
    loginButton: "تسجيل الدخول",
    loginBusy: "جاري تسجيل الدخول...",

    resetTitle: "إعادة تعيين كلمة المرور",
    resetSubtitle: "سنقوم بإرسال تعليمات إعادة التعيين إلى بريدك الإلكتروني المسجل.",
    sendResetButton: "إرسال رابط التعيين",
    sendingReset: "جاري الإرسال...",

    schoolNameLabel: "اسم المدرسة",
    schoolNamePlaceholder: "مثال: مدرسة النور الدولية",
    firstNameLabel: "الاسم الأول للمدير",
    firstNamePlaceholder: "أحمد",
    lastNameLabel: "اسم العائلة للمدير",
    lastNamePlaceholder: "محمود",
    adminEmailLabel: "البريد الإلكتروني للمدير",
    adminEmailPlaceholder: "admin@school.com",
    schoolSlugLabel: "معرّف المدرسة (اختياري)",
    schoolSlugPlaceholder: "sunrise-international-school",
    schoolSlugHint: "اختياري. يُستخدم لإنشاء رابط مخصص لنظام مدرستك.",
    createPasswordLabel: "كلمة المرور",
    createPasswordPlaceholder: "كلمة مرور (6 أحرف على الأقل)",
    confirmPasswordLabel: "تأكيد كلمة المرور",
    confirmPasswordPlaceholder: "أعد كتابة كلمة المرور",

    afterSignupTitle: "ماذا يحدث بعد إنشاء الحساب؟",
    afterSignupStep1: "يتم إنشاء حساب المدرسة وحساب المدير المسؤول في النظام فوراً.",
    afterSignupStep2: "يتم تسجيل دخولك تلقائياً ونقلك مباشرة إلى لوحة تحكم إدارة المدرسة.",
    afterSignupStep3: "يمكنك إضافة المعلمين والطلاب وأولياء الأمور لاحقاً من داخل لوحة التحكم.",

    createSchoolButton: "إنشاء حساب المدرسة",
    creatingSchoolBusy: "جاري إنشاء المدرسة...",

    resetHeaderTitle: "اختر كلمة مرور جديدة",
    resetHeaderDesc: "قم بتعيين كلمة مرور جديدة لحسابك، ثم عد إلى صفحة تسجيل الدخول للمتابعة إلى لوحة التحكم.",
    newPasswordLabel: "كلمة المرور الجديدة",
    newPasswordPlaceholder: "أدخل كلمة المرور الجديدة",
    confirmNewPasswordLabel: "تأكيد كلمة المرور الجديدة",
    confirmNewPasswordPlaceholder: "أعد كتابة كلمة المرور الجديدة",
    updatePasswordButton: "تحديث كلمة المرور",
    updatingPasswordBusy: "جاري تحديث كلمة المرور...",
    backToLogin: "العودة لتسجيل الدخول",
  },
  en: {
    brandName: "Nibras Educational Platform",
    secureLoginBadge: "One secure login for every school role",
    marketingTitle: "Run classes, people, and progress from one connected workspace",
    marketingSubtitle: "School admins, teachers, parents, and students all sign in with email and password. Real-time updates for attendance, grades, and schedules.",

    feature1Title: "School Setup",
    feature1Desc: "Create your school, admin account, and trial subscription in one simple step.",
    feature2Title: "Role-Based Access",
    feature2Desc: "Each user lands on the correct dashboard automatically after sign-in.",
    feature3Title: "Live School Data",
    feature3Desc: "Lessons, attendance, grades, and announcements stay connected live.",

    pill1Label: "ACCESS",
    pill1Text: "Direct email login",
    pill2Label: "ONBOARDING",
    pill2Text: "Admin invites for staff and students",
    pill3Label: "SECURITY",
    pill3Text: "Password reset and role-based routing",

    cardBadge: "Secure Access",
    loginTitle: "Sign in to your workspace",
    signupTitle: "Create your school account",
    loginSubtitle: "Use the email and password assigned to your account. You will be routed to the correct dashboard automatically.",
    signupSubtitle: "This signup creates a new school and its first school-admin account. Teachers, parents, and students receive invited credentials.",

    tabLogin: "Log in",
    tabSignup: "Sign up",

    emailLabel: "Email address",
    emailPlaceholder: "name@school.com",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter password",
    forgotPassword: "Forgot password?",
    helperLoginInfo: "Use the credentials created by your school or platform admin.",
    loginButton: "Log in",
    loginBusy: "Signing in...",

    resetTitle: "Reset your password",
    resetSubtitle: "We will send reset instructions to your registered email address.",
    sendResetButton: "Send reset email",
    sendingReset: "Sending...",

    schoolNameLabel: "School name",
    schoolNamePlaceholder: "Sunrise International School",
    firstNameLabel: "Admin first name",
    firstNamePlaceholder: "Amir",
    lastNameLabel: "Admin last name",
    lastNamePlaceholder: "Hassan",
    adminEmailLabel: "Admin email",
    adminEmailPlaceholder: "admin@school.com",
    schoolSlugLabel: "School slug (optional)",
    schoolSlugPlaceholder: "sunrise-international-school",
    schoolSlugHint: "Optional clean key used to generate a custom school URL.",
    createPasswordLabel: "Password",
    createPasswordPlaceholder: "At least 6 characters",
    confirmPasswordLabel: "Confirm password",
    confirmPasswordPlaceholder: "Repeat the password",

    afterSignupTitle: "What happens after signup?",
    afterSignupStep1: "Your school and first school-admin account are created instantly.",
    afterSignupStep2: "You are signed in automatically and sent to the school-admin dashboard.",
    afterSignupStep3: "Teachers, parents, and students are invited later from the dashboard.",

    createSchoolButton: "Create school account",
    creatingSchoolBusy: "Creating school...",

    resetHeaderTitle: "Choose a new password",
    resetHeaderDesc: "Set a new password for your account, then go back to the login page and continue to your dashboard.",
    newPasswordLabel: "New password",
    newPasswordPlaceholder: "Enter new password",
    confirmNewPasswordLabel: "Confirm new password",
    confirmNewPasswordPlaceholder: "Repeat new password",
    updatePasswordButton: "Update password",
    updatingPasswordBusy: "Updating password...",
    backToLogin: "Back to login",
  },
};

function normalizePath(pathname: string) {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed || "/";
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function NoticeBanner({ notice }: { notice: NoticeState }) {
  if (!notice) return null;

  const tone =
    notice.type === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : notice.type === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-purple-200 bg-purple-50 text-purple-700";

  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm font-medium shadow-sm transition-all animate-in fade-in ${tone}`}>
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="leading-relaxed">{notice.message}</p>
    </div>
  );
}

function AuthField({
  label,
  icon,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  trailingAction,
}: {
  label: string;
  icon: React.ReactNode;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
  trailingAction?: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-[#1e0f3e]">{label}</span>
      <div className="flex items-center rounded-2xl border border-purple-900/15 bg-white px-4 py-3.5 shadow-sm transition-all focus-within:border-[#7c3aed] focus-within:ring-2 focus-within:ring-[#7c3aed]/20">
        <span className="ml-3 text-purple-600/70 shrink-0">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-sm text-[#1e0f3e] outline-none placeholder:text-slate-400 font-medium"
        />
        {trailingAction}
      </div>
    </label>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  const { isRTL } = useTranslation();

  return (
    <div
      data-no-translate
      className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#180838_0%,#2e1065_40%,#4c1d95_70%,#6d28d9_100%)]"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Decorative ambient background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10rem] top-[-10rem] h-96 w-96 rounded-full bg-[#7c3aed]/25 blur-3xl" />
        <div className="absolute right-[-8rem] top-1/4 h-[500px] w-[500px] rounded-full bg-[#f59e0b]/15 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/3 h-[450px] w-[450px] rounded-full bg-[#6d28d9]/30 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/20 bg-white/95 shadow-[0_35px_90px_-20px_rgba(15,8,38,0.55)] backdrop-blur-xl xl:grid-cols-[1.05fr_0.95fr]">
          {children}
        </div>
      </div>
    </div>
  );
}

function MarketingPanel() {
  const { language } = useTranslation();
  const t = AUTH_TEXT[language === "ar" ? "ar" : "en"];

  return (
    <div className="relative overflow-hidden bg-[linear-gradient(160deg,#1e0f3e_0%,#2e1065_60%,#4c1d95_100%)] px-6 py-8 text-white sm:px-10 sm:py-10 lg:px-12 lg:py-12 flex flex-col justify-between">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.25),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.18),transparent_40%)] pointer-events-none" />
      
      <div className="relative z-10">
        {/* Header bar with Nibras Logo & Language Switcher */}
        <div className="mb-10 flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md">
            <img
              src={nibrasLogo}
              alt="نبراس"
              className="h-9 w-auto object-contain rounded-xl bg-white p-1"
            />
            <span className="font-bold text-sm tracking-wide text-white">{t.brandName}</span>
          </div>
          <LanguageSwitcher />
        </div>

        {/* Hero Section */}
        <div className="max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-300 backdrop-blur-md">
            <Sparkles className="h-4 w-4" />
            {t.secureLoginBadge}
          </div>
          <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
            {t.marketingTitle}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-purple-100/90 sm:text-base">
            {t.marketingSubtitle}
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4.5 backdrop-blur-md transition-all hover:bg-white/15">
            <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 mb-3">
              <Building2 className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-white">{t.feature1Title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-purple-200/80">{t.feature1Desc}</p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-4.5 backdrop-blur-md transition-all hover:bg-white/15">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 mb-3">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-white">{t.feature2Title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-purple-200/80">{t.feature2Desc}</p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-4.5 backdrop-blur-md transition-all hover:bg-white/15">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300 mb-3">
              <BookOpen className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-white">{t.feature3Title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-purple-200/80">{t.feature3Desc}</p>
          </div>
        </div>
      </div>

      {/* Footer Feature Pills */}
      <div className="relative z-10 mt-10 hidden pt-6 xl:block border-t border-white/10">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
            <p className="text-[10px] uppercase font-bold tracking-wider text-purple-300/70">{t.pill1Label}</p>
            <p className="mt-1 text-xs font-semibold text-white">{t.pill1Text}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
            <p className="text-[10px] uppercase font-bold tracking-wider text-purple-300/70">{t.pill2Label}</p>
            <p className="mt-1 text-xs font-semibold text-white">{t.pill2Text}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
            <p className="text-[10px] uppercase font-bold tracking-wider text-purple-300/70">{t.pill3Label}</p>
            <p className="mt-1 text-xs font-semibold text-white">{t.pill3Text}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthPage({
  onLogin,
  onSignUpSchool,
  authError,
}: {
  onLogin: (email: string, password: string) => Promise<string | null>;
  onSignUpSchool: (payload: SchoolSignupPayload) => Promise<string | null>;
  authError?: string | null;
}) {
  const { language, isRTL } = useTranslation();
  const t = AUTH_TEXT[language === "ar" ? "ar" : "en"];

  const [mode, setMode] = useState<AuthMode>(() => (normalizePath(window.location.pathname) === "/signup" ? "signup" : "login"));
  const [notice, setNotice] = useState<NoticeState>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [resetEmail, setResetEmail] = useState("");

  const [signup, setSignup] = useState({
    schoolName: "",
    slug: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Cairo",
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = normalizePath(window.location.pathname);
      setMode(path === "/signup" ? "signup" : "login");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const suggestedSlug = useMemo(() => slugify(signup.schoolName), [signup.schoolName]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setNotice(null);
    setShowReset(false);
    const nextPath = nextMode === "signup" ? "/signup" : "/login";
    if (normalizePath(window.location.pathname) !== nextPath) {
      window.history.replaceState(null, "", nextPath);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!login.email.trim() || !login.password.trim()) {
      setNotice({
        type: "error",
        message: language === "ar" ? "يرجى إدخال البريد الإلكتروني وكلمة المرور للمتابعة." : "Enter your email address and password to continue.",
      });
      return;
    }

    setIsBusy(true);
    const error = await onLogin(login.email.trim(), login.password);
    setIsBusy(false);

    if (error) {
      setNotice({ type: "error", message: error });
      return;
    }

    setNotice({
      type: "success",
      message: language === "ar" ? "تم تسجيل الدخول بنجاح. جاري التوجيه..." : "Signing you in now.",
    });
  };

  const handleResetRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resetEmail.trim()) {
      setNotice({
        type: "error",
        message: language === "ar" ? "يرجى إدخال البريد الإلكتروني لاستلام تعليمات التعيين." : "Enter your email address to receive reset instructions.",
      });
      return;
    }

    setIsBusy(true);
    const error = await requestPasswordReset(resetEmail.trim());
    setIsBusy(false);

    if (error) {
      setNotice({ type: "error", message: error });
      return;
    }

    setNotice({
      type: "success",
      message: language === "ar" ? "تم إرسال رابط تعيين كلمة المرور إلى بريدك الإلكتروني." : "Password reset instructions were sent to your email address.",
    });
    setShowReset(false);
  };

  const handleSchoolSignup = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !signup.schoolName.trim() ||
      !signup.firstName.trim() ||
      !signup.lastName.trim() ||
      !signup.email.trim() ||
      !signup.password
    ) {
      setNotice({
        type: "error",
        message: language === "ar" ? "يرجى استكمال جميع البيانات المطلوبة للمدرسة والمدير." : "Complete all required school and admin fields before creating the account.",
      });
      return;
    }

    if (!/\S+@\S+\.\S+/.test(signup.email)) {
      setNotice({
        type: "error",
        message: language === "ar" ? "يرجى إدخال بريد إلكتروني صحيح للمدير." : "Enter a valid admin email address.",
      });
      return;
    }

    if (signup.password.length < 6) {
      setNotice({
        type: "error",
        message: language === "ar" ? "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل." : "Use a password with at least 6 characters.",
      });
      return;
    }

    if (signup.password !== signup.confirmPassword) {
      setNotice({
        type: "error",
        message: language === "ar" ? "تأكيد كلمة المرور غير متطابق." : "Password confirmation does not match.",
      });
      return;
    }

    setIsBusy(true);
    const error = await onSignUpSchool({
      school_name: signup.schoolName.trim(),
      slug: signup.slug.trim() || undefined,
      timezone: signup.timezone.trim() || "Africa/Cairo",
      admin_email: signup.email.trim().toLowerCase(),
      admin_password: signup.password,
      admin_first_name: signup.firstName.trim(),
      admin_last_name: signup.lastName.trim(),
    });
    setIsBusy(false);

    if (error) {
      setNotice({ type: "error", message: error });
      return;
    }

    setNotice({
      type: "success",
      message: language === "ar" ? "تم إنشاء حساب المدرسة بنجاح! جاري التوجيه إلى لوحة التحكم..." : "Your school workspace is ready. Redirecting to the dashboard.",
    });
  };

  return (
    <AuthShell>
      <MarketingPanel />

      {/* Form Section */}
      <div className="bg-white px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12 flex flex-col justify-between">
        <div className="mx-auto flex h-full w-full max-w-xl flex-col">
          {/* Top Form Header */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <span className="inline-block rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                {t.cardBadge}
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black text-[#1e0f3e]">
                {mode === "login" ? t.loginTitle : t.signupTitle}
              </h2>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-500 font-medium">
                {mode === "login" ? t.loginSubtitle : t.signupSubtitle}
              </p>
            </div>
            <div className="hidden rounded-2xl border border-purple-100 bg-purple-50/50 p-3 text-purple-700 sm:block shrink-0">
              <ShieldCheck className="h-7 w-7 text-purple-600" />
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mb-6 grid grid-cols-2 rounded-2xl bg-purple-50 p-1.5 border border-purple-100/60">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                mode === "login"
                  ? "bg-white text-[#1e0f3e] shadow-md shadow-purple-900/5"
                  : "text-purple-700/60 hover:text-purple-900"
              }`}
            >
              {t.tabLogin}
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                mode === "signup"
                  ? "bg-white text-[#1e0f3e] shadow-md shadow-purple-900/5"
                  : "text-purple-700/60 hover:text-purple-900"
              }`}
            >
              {t.tabSignup}
            </button>
          </div>

          {/* Main Form Container */}
          <div className="space-y-5 rounded-3xl border border-purple-100 bg-purple-50/20 p-6 shadow-sm sm:p-7">
            <NoticeBanner notice={notice ?? (authError ? { type: "error", message: authError } : null)} />

            {mode === "login" ? (
              <>
                <form className="space-y-4" onSubmit={handleLogin}>
                  <AuthField
                    label={t.emailLabel}
                    icon={<Mail className="h-5 w-5" />}
                    type="email"
                    value={login.email}
                    onChange={(value) => {
                      setLogin((current) => ({ ...current, email: value }));
                      setNotice(null);
                    }}
                    placeholder={t.emailPlaceholder}
                    autoComplete="email"
                  />
                  <AuthField
                    label={t.passwordLabel}
                    icon={<KeyRound className="h-5 w-5" />}
                    type={showLoginPassword ? "text" : "password"}
                    value={login.password}
                    onChange={(value) => {
                      setLogin((current) => ({ ...current, password: value }));
                      setNotice(null);
                    }}
                    placeholder={t.passwordPlaceholder}
                    autoComplete="current-password"
                    trailingAction={
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((current) => !current)}
                        className="text-purple-600/60 transition hover:text-purple-900 px-1"
                        aria-label={showLoginPassword ? "Hide password" : "Show password"}
                      >
                        {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    }
                  />

                  <div className="flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between pt-1">
                    <p className="font-medium">{t.helperLoginInfo}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowReset((current) => !current);
                        setNotice(null);
                      }}
                      className="font-bold text-purple-600 transition hover:text-purple-800 shrink-0"
                    >
                      {t.forgotPassword}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isBusy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 px-6 font-bold text-white shadow-lg transition-all hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 mt-2"
                    style={{
                      background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)",
                      boxShadow: "0 10px 25px -5px rgba(124, 58, 237, 0.35)",
                    }}
                  >
                    <span>{isBusy ? t.loginBusy : t.loginButton}</span>
                    {!isBusy && <ArrowRight className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />}
                  </button>
                </form>

                {showReset && (
                  <form onSubmit={handleResetRequest} className="mt-4 rounded-2xl border border-purple-100 bg-white p-4.5 shadow-sm space-y-3">
                    <p className="text-sm font-bold text-[#1e0f3e]">{t.resetTitle}</p>
                    <p className="text-xs text-slate-500">{t.resetSubtitle}</p>
                    <AuthField
                      label={t.emailLabel}
                      icon={<Mail className="h-5 w-5" />}
                      type="email"
                      value={resetEmail}
                      onChange={(value) => {
                        setResetEmail(value);
                        setNotice(null);
                      }}
                      placeholder={t.emailPlaceholder}
                      autoComplete="email"
                    />
                    <button
                      type="submit"
                      disabled={isBusy}
                      className="w-full rounded-xl border border-purple-200 bg-purple-50 py-3 text-xs font-bold text-purple-700 transition hover:bg-purple-100 disabled:opacity-70"
                    >
                      {isBusy ? t.sendingReset : t.sendResetButton}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <form className="space-y-4" onSubmit={handleSchoolSignup}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <AuthField
                      label={t.schoolNameLabel}
                      icon={<Building2 className="h-5 w-5" />}
                      value={signup.schoolName}
                      onChange={(value) => {
                        setSignup((current) => ({
                          ...current,
                          schoolName: value,
                          slug: current.slug || slugify(value),
                        }));
                        setNotice(null);
                      }}
                      placeholder={t.schoolNamePlaceholder}
                    />
                  </div>

                  <AuthField
                    label={t.firstNameLabel}
                    icon={<Users className="h-5 w-5" />}
                    value={signup.firstName}
                    onChange={(value) => {
                      setSignup((current) => ({ ...current, firstName: value }));
                      setNotice(null);
                    }}
                    placeholder={t.firstNamePlaceholder}
                    autoComplete="given-name"
                  />

                  <AuthField
                    label={t.lastNameLabel}
                    icon={<Users className="h-5 w-5" />}
                    value={signup.lastName}
                    onChange={(value) => {
                      setSignup((current) => ({ ...current, lastName: value }));
                      setNotice(null);
                    }}
                    placeholder={t.lastNamePlaceholder}
                    autoComplete="family-name"
                  />

                  <div className="sm:col-span-2">
                    <AuthField
                      label={t.adminEmailLabel}
                      icon={<Mail className="h-5 w-5" />}
                      type="email"
                      value={signup.email}
                      onChange={(value) => {
                        setSignup((current) => ({ ...current, email: value }));
                        setNotice(null);
                      }}
                      placeholder={t.adminEmailPlaceholder}
                      autoComplete="email"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <AuthField
                      label={t.schoolSlugLabel}
                      icon={<Sparkles className="h-5 w-5" />}
                      value={signup.slug}
                      onChange={(value) => {
                        setSignup((current) => ({ ...current, slug: slugify(value) }));
                        setNotice(null);
                      }}
                      placeholder={suggestedSlug || t.schoolSlugPlaceholder}
                    />
                    <p className="mt-1 text-[11px] text-slate-400 font-medium">{t.schoolSlugHint}</p>
                  </div>

                  <AuthField
                    label={t.createPasswordLabel}
                    icon={<KeyRound className="h-5 w-5" />}
                    type={showSignupPassword ? "text" : "password"}
                    value={signup.password}
                    onChange={(value) => {
                      setSignup((current) => ({ ...current, password: value }));
                      setNotice(null);
                    }}
                    placeholder={t.createPasswordPlaceholder}
                    autoComplete="new-password"
                    trailingAction={
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword((current) => !current)}
                        className="text-purple-600/60 transition hover:text-purple-900 px-1"
                        aria-label={showSignupPassword ? "Hide password" : "Show password"}
                      >
                        {showSignupPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    }
                  />

                  <AuthField
                    label={t.confirmPasswordLabel}
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    type={showSignupPassword ? "text" : "password"}
                    value={signup.confirmPassword}
                    onChange={(value) => {
                      setSignup((current) => ({ ...current, confirmPassword: value }));
                      setNotice(null);
                    }}
                    placeholder={t.confirmPasswordPlaceholder}
                    autoComplete="new-password"
                  />
                </div>

                <div className="rounded-2xl border border-purple-100 bg-white p-4 text-xs text-slate-600 space-y-2">
                  <p className="font-bold text-[#1e0f3e]">{t.afterSignupTitle}</p>
                  <ul className="space-y-1.5">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span>{t.afterSignupStep1}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span>{t.afterSignupStep2}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span>{t.afterSignupStep3}</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 px-6 font-bold text-white shadow-lg transition-all hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 mt-2"
                  style={{
                    background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)",
                    boxShadow: "0 10px 25px -5px rgba(124, 58, 237, 0.35)",
                  }}
                >
                  <span>{isBusy ? t.creatingSchoolBusy : t.createSchoolButton}</span>
                  {!isBusy && <ArrowRight className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const { language, isRTL } = useTranslation();
  const t = AUTH_TEXT[language === "ar" ? "ar" : "en"];

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!password) {
      setNotice({
        type: "error",
        message: language === "ar" ? "يرجى إدخال كلمة المرور الجديدة." : "Enter your new password.",
      });
      return;
    }

    if (password.length < 6) {
      setNotice({
        type: "error",
        message: language === "ar" ? "يجب أن تكون كلمة المرور 6 أحرف على الأقل." : "Use a password with at least 6 characters.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setNotice({
        type: "error",
        message: language === "ar" ? "تأكيد كلمة المرور غير متطابق." : "Password confirmation does not match.",
      });
      return;
    }

    setIsBusy(true);
    const error = await updatePassword(password);
    setIsBusy(false);

    if (error) {
      setNotice({ type: "error", message: error });
      return;
    }

    setNotice({
      type: "success",
      message: language === "ar" ? "تم تحديث كلمة المرور بنجاح. يمكنك العودة لتسجيل الدخول." : "Your password has been updated. You can return to login now.",
    });
  };

  return (
    <AuthShell>
      <MarketingPanel />

      <div className="bg-white px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12 flex flex-col justify-center">
        <div className="mx-auto flex h-full w-full max-w-xl flex-col justify-center">
          <div className="rounded-3xl border border-purple-100 bg-purple-50/20 p-6 shadow-sm sm:p-7">
            <div className="mb-6 text-right">
              <span className="inline-block rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                {t.cardBadge}
              </span>
              <h2 className="mt-2 text-2xl font-black text-[#1e0f3e]">{t.resetHeaderTitle}</h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 font-medium">{t.resetHeaderDesc}</p>
            </div>

            <div className="space-y-5">
              <NoticeBanner notice={notice} />

              <form onSubmit={handleSubmit} className="space-y-4">
                <AuthField
                  label={t.newPasswordLabel}
                  icon={<KeyRound className="h-5 w-5" />}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(value) => {
                    setPassword(value);
                    setNotice(null);
                  }}
                  placeholder={t.newPasswordPlaceholder}
                  autoComplete="new-password"
                  trailingAction={
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="text-purple-600/60 transition hover:text-purple-900 px-1"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  }
                />

                <AuthField
                  label={t.confirmNewPasswordLabel}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(value) => {
                    setConfirmPassword(value);
                    setNotice(null);
                  }}
                  placeholder={t.confirmNewPasswordPlaceholder}
                  autoComplete="new-password"
                />

                <button
                  type="submit"
                  disabled={isBusy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 px-6 font-bold text-white shadow-lg transition-all hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                  style={{
                    background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)",
                    boxShadow: "0 10px 25px -5px rgba(124, 58, 237, 0.35)",
                  }}
                >
                  <span>{isBusy ? t.updatingPasswordBusy : t.updatePasswordButton}</span>
                </button>
              </form>

              <button
                type="button"
                onClick={() => window.location.replace("/login")}
                className="inline-flex w-full items-center justify-center rounded-2xl border border-purple-200 bg-white py-3 text-sm font-bold text-purple-700 transition hover:bg-purple-50"
              >
                {t.backToLogin}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
