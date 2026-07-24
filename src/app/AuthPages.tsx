import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { resetPassword as requestPasswordReset, type SchoolSignupPayload, updatePassword } from "@/lib/auth";
import { LanguageSwitcher, useTranslation } from "./shared";

type AuthMode = "login" | "signup";
type NoticeType = "error" | "success" | "info";

type NoticeState = {
  type: NoticeType;
  message: string;
} | null;

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
        : "border-sky-200 bg-sky-50 text-sky-700";

  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${tone}`}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{notice.message}</p>
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
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-[#16324f]">{label}</span>
      <div className="flex items-center rounded-2xl border border-[#d7e3ef] bg-white px-4 py-3 shadow-[0_12px_30px_-24px_rgba(12,39,68,0.9)] transition focus-within:border-[#0f766e] focus-within:shadow-[0_16px_35px_-24px_rgba(15,118,110,0.65)]">
        <span className="mr-3 text-[#5f7d98]">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-sm text-[#16324f] outline-none placeholder:text-[#8da4b8]"
        />
        {trailingAction}
      </div>
    </label>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  const { isRTL } = useTranslation();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f4f8fb_0%,#eef5fb_52%,#f9fcff_100%)]" dir={isRTL ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-10rem] h-72 w-72 rounded-full bg-[#22c55e]/10 blur-3xl" />
        <div className="absolute right-[-6rem] top-20 h-80 w-80 rounded-full bg-[#0ea5e9]/12 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-96 w-96 rounded-full bg-[#f59e0b]/10 blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/70 bg-white/85 shadow-[0_45px_120px_-48px_rgba(15,39,71,0.65)] backdrop-blur xl:grid-cols-[1.05fr_0.95fr]">
          {children}
        </div>
      </div>
    </div>
  );
}

function MarketingPanel() {
  return (
    <div className="relative overflow-hidden bg-[#0f2747] px-6 py-8 text-white sm:px-10 sm:py-10 lg:px-12 lg:py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.2),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.24),transparent_35%)]" />
      <div className="relative flex h-full flex-col">
        <div className="mb-10 flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold tracking-[0.14em] text-white/85 uppercase">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#0f2747]">
              <GraduationCap className="h-5 w-5" />
            </span>
            School Platform
          </div>
          <LanguageSwitcher />
        </div>

        <div className="max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/80">
            <Sparkles className="h-4 w-4" />
            One secure login for every school role
          </div>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Run classes, people, and progress from one connected workspace.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-200 sm:text-lg">
            School admins, teachers, parents, and students all sign in with email and password. New schools can create
            their workspace here and start using the Supabase-backed dashboards immediately.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <Building2 className="h-5 w-5 text-[#7dd3fc]" />
            <p className="mt-4 text-sm font-semibold">School setup</p>
            <p className="mt-2 text-sm text-slate-200">Create your school, admin account, and trial subscription in one step.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <Users className="h-5 w-5 text-[#86efac]" />
            <p className="mt-4 text-sm font-semibold">Role-based access</p>
            <p className="mt-2 text-sm text-slate-200">Each user lands on the correct dashboard automatically after sign-in.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <BookOpen className="h-5 w-5 text-[#fcd34d]" />
            <p className="mt-4 text-sm font-semibold">Live school data</p>
            <p className="mt-2 text-sm text-slate-200">Lessons, attendance, grades, and announcements stay connected to Supabase.</p>
          </div>
        </div>

        <div className="mt-auto hidden pt-10 xl:block">
          <div className="grid gap-3 rounded-[28px] border border-white/10 bg-white/8 p-5 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/55">Access</p>
              <p className="mt-2 text-lg font-semibold">Direct email login</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/55">Onboarding</p>
              <p className="mt-2 text-lg font-semibold">Admin invites for staff and students</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/55">Security</p>
              <p className="mt-2 text-lg font-semibold">Password reset and role-based routing</p>
            </div>
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
      setNotice({ type: "error", message: "Enter your email address and password to continue." });
      return;
    }

    setIsBusy(true);
    const error = await onLogin(login.email.trim(), login.password);
    setIsBusy(false);

    if (error) {
      setNotice({ type: "error", message: error });
      return;
    }

    setNotice({ type: "success", message: "Signing you in now." });
  };

  const handleResetRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resetEmail.trim()) {
      setNotice({ type: "error", message: "Enter your email address to receive reset instructions." });
      return;
    }

    setIsBusy(true);
    const error = await requestPasswordReset(resetEmail.trim());
    setIsBusy(false);

    if (error) {
      setNotice({ type: "error", message: error });
      return;
    }

    setNotice({ type: "success", message: "Password reset instructions were sent to your email address." });
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
      setNotice({ type: "error", message: "Complete all required school and admin fields before creating the account." });
      return;
    }

    if (!/\S+@\S+\.\S+/.test(signup.email)) {
      setNotice({ type: "error", message: "Enter a valid admin email address." });
      return;
    }

    if (signup.password.length < 6) {
      setNotice({ type: "error", message: "Use a password with at least 6 characters." });
      return;
    }

    if (signup.password !== signup.confirmPassword) {
      setNotice({ type: "error", message: "Password confirmation does not match." });
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

    setNotice({ type: "success", message: "Your school workspace is ready. Redirecting to the dashboard." });
  };

  return (
    <AuthShell>
      <MarketingPanel />
      <div className="bg-white px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
        <div className="mx-auto flex h-full w-full max-w-xl flex-col">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0f766e]">Secure access</p>
              <h2 className="mt-2 text-3xl font-semibold text-[#16324f]">
                {mode === "login" ? "Sign in to your workspace" : "Create your school account"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#5f7d98]">
                {mode === "login"
                  ? "Use the email and password assigned to your account. You will be routed to the correct dashboard automatically."
                  : "This signup creates a new school and its first school-admin account. Teachers, parents, and students should use their invited credentials."}
              </p>
            </div>
            <div className="hidden rounded-2xl border border-[#dce8f2] bg-[#f8fbfd] p-3 text-[#16324f] sm:block">
              <ShieldCheck className="h-6 w-6 text-[#0f766e]" />
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-2xl bg-[#edf3f8] p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`rounded-[18px] px-4 py-3 text-sm font-semibold transition ${
                mode === "login" ? "bg-white text-[#16324f] shadow-sm" : "text-[#64819a]"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`rounded-[18px] px-4 py-3 text-sm font-semibold transition ${
                mode === "signup" ? "bg-white text-[#16324f] shadow-sm" : "text-[#64819a]"
              }`}
            >
              Sign up
            </button>
          </div>

          <div className="space-y-6 rounded-[28px] border border-[#e3edf5] bg-[#fbfdff] p-6 shadow-[0_30px_70px_-52px_rgba(15,39,71,0.75)] sm:p-7">
            <NoticeBanner notice={notice ?? (authError ? { type: "error", message: authError } : null)} />

            {mode === "login" ? (
              <>
                <form className="space-y-5" onSubmit={handleLogin}>
                  <AuthField
                    label="Email address"
                    icon={<Mail className="h-5 w-5" />}
                    type="email"
                    value={login.email}
                    onChange={(value) => {
                      setLogin((current) => ({ ...current, email: value }));
                      setNotice(null);
                    }}
                    placeholder="name@school.com"
                    autoComplete="email"
                  />
                  <AuthField
                    label="Password"
                    icon={<KeyRound className="h-5 w-5" />}
                    type={showLoginPassword ? "text" : "password"}
                    value={login.password}
                    onChange={(value) => {
                      setLogin((current) => ({ ...current, password: value }));
                      setNotice(null);
                    }}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    trailingAction={
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((current) => !current)}
                        className="text-[#5f7d98] transition hover:text-[#16324f]"
                        aria-label={showLoginPassword ? "Hide password" : "Show password"}
                      >
                        {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    }
                  />
                  <div className="flex flex-col gap-3 text-sm text-[#5f7d98] sm:flex-row sm:items-center sm:justify-between">
                    <p>Use the credentials created by your school or platform admin.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowReset((current) => !current);
                        setNotice(null);
                      }}
                      className="font-semibold text-[#0f766e] transition hover:text-[#115e59]"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f766e] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isBusy ? "Signing in..." : "Log in"}
                    {!isBusy && <ArrowRight className="h-4 w-4" />}
                  </button>
                </form>

                {showReset && (
                  <form onSubmit={handleResetRequest} className="rounded-2xl border border-[#dbe8f1] bg-white p-4">
                    <p className="text-sm font-semibold text-[#16324f]">Reset your password</p>
                    <p className="mt-1 text-sm text-[#5f7d98]">We will send reset instructions to your registered email address.</p>
                    <div className="mt-4 space-y-4">
                      <AuthField
                        label="Email address"
                        icon={<Mail className="h-5 w-5" />}
                        type="email"
                        value={resetEmail}
                        onChange={(value) => {
                          setResetEmail(value);
                          setNotice(null);
                        }}
                        placeholder="name@school.com"
                        autoComplete="email"
                      />
                      <button
                        type="submit"
                        disabled={isBusy}
                        className="inline-flex w-full items-center justify-center rounded-2xl border border-[#d7e3ef] px-5 py-3 text-sm font-semibold text-[#16324f] transition hover:border-[#0f766e] hover:text-[#0f766e] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isBusy ? "Sending..." : "Send reset email"}
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <form className="space-y-5" onSubmit={handleSchoolSignup}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <AuthField
                      label="School name"
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
                      placeholder="Sunrise International School"
                    />
                  </div>
                  <AuthField
                    label="Admin first name"
                    icon={<Users className="h-5 w-5" />}
                    value={signup.firstName}
                    onChange={(value) => {
                      setSignup((current) => ({ ...current, firstName: value }));
                      setNotice(null);
                    }}
                    placeholder="Amir"
                    autoComplete="given-name"
                  />
                  <AuthField
                    label="Admin last name"
                    icon={<Users className="h-5 w-5" />}
                    value={signup.lastName}
                    onChange={(value) => {
                      setSignup((current) => ({ ...current, lastName: value }));
                      setNotice(null);
                    }}
                    placeholder="Hassan"
                    autoComplete="family-name"
                  />
                  <div className="sm:col-span-2">
                    <AuthField
                      label="Admin email"
                      icon={<Mail className="h-5 w-5" />}
                      type="email"
                      value={signup.email}
                      onChange={(value) => {
                        setSignup((current) => ({ ...current, email: value }));
                        setNotice(null);
                      }}
                      placeholder="admin@school.com"
                      autoComplete="email"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <AuthField
                      label="School slug"
                      icon={<Sparkles className="h-5 w-5" />}
                      value={signup.slug}
                      onChange={(value) => {
                        setSignup((current) => ({ ...current, slug: slugify(value) }));
                        setNotice(null);
                      }}
                      placeholder={suggestedSlug || "sunrise-international-school"}
                    />
                    <p className="mt-2 text-xs text-[#6e879b]">This is optional. It is used to generate a clean school URL key.</p>
                  </div>
                  <AuthField
                    label="Password"
                    icon={<KeyRound className="h-5 w-5" />}
                    type={showSignupPassword ? "text" : "password"}
                    value={signup.password}
                    onChange={(value) => {
                      setSignup((current) => ({ ...current, password: value }));
                      setNotice(null);
                    }}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    trailingAction={
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword((current) => !current)}
                        className="text-[#5f7d98] transition hover:text-[#16324f]"
                        aria-label={showSignupPassword ? "Hide password" : "Show password"}
                      >
                        {showSignupPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    }
                  />
                  <AuthField
                    label="Confirm password"
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    type={showSignupPassword ? "text" : "password"}
                    value={signup.confirmPassword}
                    onChange={(value) => {
                      setSignup((current) => ({ ...current, confirmPassword: value }));
                      setNotice(null);
                    }}
                    placeholder="Repeat the password"
                    autoComplete="new-password"
                  />
                </div>

                <div className="rounded-2xl border border-[#dce8f2] bg-white p-4 text-sm text-[#4d6882]">
                  <p className="font-semibold text-[#16324f]">What happens after signup?</p>
                  <ul className="mt-3 space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0f766e]" />
                      <span>Your school and first school-admin account are created in Supabase.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0f766e]" />
                      <span>You are signed in automatically and sent to the school-admin dashboard.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0f766e]" />
                      <span>Teachers, parents, and students are invited later from the dashboard.</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#16324f] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0f2747] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isBusy ? "Creating school..." : "Create school account"}
                  {!isBusy && <ArrowRight className="h-4 w-4" />}
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
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!password) {
      setNotice({ type: "error", message: "Enter your new password." });
      return;
    }

    if (password.length < 6) {
      setNotice({ type: "error", message: "Use a password with at least 6 characters." });
      return;
    }

    if (password !== confirmPassword) {
      setNotice({ type: "error", message: "Password confirmation does not match." });
      return;
    }

    setIsBusy(true);
    const error = await updatePassword(password);
    setIsBusy(false);

    if (error) {
      setNotice({ type: "error", message: error });
      return;
    }

    setNotice({ type: "success", message: "Your password has been updated. You can return to login now." });
  };

  return (
    <AuthShell>
      <MarketingPanel />
      <div className="bg-white px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
        <div className="mx-auto flex h-full w-full max-w-xl flex-col justify-center">
          <div className="rounded-[28px] border border-[#e3edf5] bg-[#fbfdff] p-6 shadow-[0_30px_70px_-52px_rgba(15,39,71,0.75)] sm:p-7">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0f766e]">Password reset</p>
              <h2 className="mt-2 text-3xl font-semibold text-[#16324f]">Choose a new password</h2>
              <p className="mt-3 text-sm leading-6 text-[#5f7d98]">
                Set a new password for your account, then go back to the login page and continue to your dashboard.
              </p>
            </div>

            <div className="space-y-6">
              <NoticeBanner notice={notice} />
              <form onSubmit={handleSubmit} className="space-y-5">
                <AuthField
                  label="New password"
                  icon={<KeyRound className="h-5 w-5" />}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(value) => {
                    setPassword(value);
                    setNotice(null);
                  }}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  trailingAction={
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="text-[#5f7d98] transition hover:text-[#16324f]"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  }
                />
                <AuthField
                  label="Confirm new password"
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(value) => {
                    setConfirmPassword(value);
                    setNotice(null);
                  }}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                />
                <button
                  type="submit"
                  disabled={isBusy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f766e] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isBusy ? "Updating password..." : "Update password"}
                </button>
              </form>

              <button
                type="button"
                onClick={() => window.location.replace("/login")}
                className="inline-flex w-full items-center justify-center rounded-2xl border border-[#d7e3ef] px-5 py-3 text-sm font-semibold text-[#16324f] transition hover:border-[#0f766e] hover:text-[#0f766e]"
              >
                Back to login
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
