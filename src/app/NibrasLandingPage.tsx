import React, { useState, useEffect, useRef } from "react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { supabase } from "@/lib/supabase";
import nibrasLogo from "@/imports/WhatsApp_Image_2026-07-16_at_3.02.45_PM.jpeg";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import {
  ChevronDown,
  Check,
  X,
  BarChart3,
  Users,
  Calendar,
  BookOpen,
  Bell,
  MessageSquare,
  GraduationCap,
  Shield,
  Clock,
  Zap,
  TrendingUp,
  FileText,
  Phone,
  Mail,
  MapPin,
  Star,
  ArrowLeft,
  Menu,
  AlertCircle,
  Layers,
  Settings,
  Eye,
  Award,
  Building2,
  ChevronRight,
  Twitter,
  Linkedin,
  Facebook,
  Globe,
} from "lucide-react";

// ─── Color tokens ──────────────────────────────────────────────
const PURPLE = "#7C3AED";
const PURPLE_LIGHT = "#9f6fec";
const PURPLE_PALE = "#f5f3ff";
const PURPLE_DARK = "#5b21b6";
const GOLD = "#F0B429";
const GOLD_LIGHT = "#fde68a";

// ─── Utility ───────────────────────────────────────────────────
function useCountUp(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

async function saveSchoolDemoRequest(payload: {
  schoolName: string;
  directorName: string;
  phone: string;
  email: string;
  address: string;
  governorate: string;
  studentCount: string;
  schoolType: string;
  message: string;
  agree: boolean;
}) {
  const { error } = await supabase.from("school_demo_requests").insert({
    school_name: payload.schoolName.trim(),
    director_name: payload.directorName.trim(),
    phone: payload.phone.trim(),
    email: payload.email.trim() ? payload.email.trim().toLowerCase() : null,
    address: payload.address.trim() || null,
    governorate: payload.governorate.trim() || null,
    student_count: payload.studentCount.trim() || null,
    school_type: payload.schoolType.trim() || null,
    message: payload.message.trim() || null,
    agreed_to_contact: payload.agree,
    source: "landing_page_modal",
  });

  if (error) {
    throw error;
  }
}

// ─── Lead Form Modal ───────────────────────────────────────────
function LeadFormModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    schoolName: "", directorName: "", phone: "", email: "",
    address: "", governorate: "", studentCount: "", schoolType: "",
    message: "", agree: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const governorates = [
    "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "البحر الأحمر",
    "البحيرة", "الفيوم", "الغربية", "الإسماعيلية", "المنوفية",
    "المنيا", "القليوبية", "الوادي الجديد", "السويس", "أسوان",
    "أسيوط", "بني سويف", "بورسعيد", "دمياط", "الشرقية",
    "جنوب سيناء", "كفر الشيخ", "مطروح", "الأقصر", "قنا", "شمال سيناء",
  ];

  function normalizeText(value: string, maxLength: number) {
    return value.replace(/\s{2,}/g, " ").trimStart().slice(0, maxLength);
  }

  function handleFieldChange(key: string, value: string) {
    setForm(f => {
      if (key === "phone") {
        return { ...f, phone: value.replace(/\D/g, "").slice(0, 11) };
      }

      if (key === "schoolName" || key === "directorName") {
        return { ...f, [key]: normalizeText(value, 150) };
      }

      if (key === "address") {
        return { ...f, address: normalizeText(value, 255) };
      }

      if (key === "email") {
        return { ...f, email: value.trimStart().slice(0, 255) };
      }

      if (key === "message") {
        return { ...f, message: value.slice(0, 1000) };
      }

      return { ...f, [key]: value };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const schoolName = form.schoolName.trim();
    const directorName = form.directorName.trim();
    const phoneDigits = form.phone.replace(/\D/g, "");
    const emailValue = form.email.trim();

    if (schoolName.length < 3) {
      setSubmitError("يرجى إدخال اسم مدرسة واضح لا يقل عن 3 أحرف.");
      return;
    }

    if (directorName.length < 3) {
      setSubmitError("يرجى إدخال اسم مدير المدرسة بشكل صحيح.");
      return;
    }

    if (phoneDigits.length !== 11) {
      setSubmitError("رقم الهاتف يجب أن يتكون من 11 رقمًا فقط.");
      return;
    }

    if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setSubmitError("يرجى إدخال بريد إلكتروني صحيح.");
      return;
    }

    try {
      setSubmitting(true);
      await saveSchoolDemoRequest({
        ...form,
        schoolName,
        directorName,
        phone: phoneDigits,
        email: emailValue,
        address: form.address.trim(),
        governorate: form.governorate.trim(),
        studentCount: form.studentCount.trim(),
        schoolType: form.schoolType.trim(),
        message: form.message.trim(),
      });
      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "تعذر حفظ بيانات المدرسة الآن. يرجى المحاولة مرة أخرى.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(30,15,62,0.7)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="relative bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        style={{ fontFamily: "'Cairo', sans-serif" }}
      >
        <button
          onClick={onClose}
          className="absolute top-5 left-5 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={{ background: PURPLE_PALE, color: PURPLE }}
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div className="flex flex-col items-center justify-center p-16 text-center gap-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: PURPLE_PALE }}
            >
              <Check size={36} style={{ color: PURPLE }} />
            </div>
            <h2 className="text-3xl font-bold" style={{ color: PURPLE }}>
              شكرًا لك!
            </h2>
            <p className="text-lg" style={{ color: "#6b5c8a", lineHeight: 1.8 }}>
              تم استلام بيانات مدرستك بنجاح. سيتواصل معك أحد مستشاري نبراس خلال 24 ساعة لتحديد موعد العرض التوضيحي.
            </p>
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-2xl font-bold text-white transition-all hover:opacity-90"
              style={{ background: PURPLE }}
            >
              إغلاق
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 md:p-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: "#1e0f3e" }}>
                ابدأ رحلة التحول الرقمي لمدرستك
              </h2>
              <p style={{ color: "#6b5c8a", lineHeight: 1.8 }}>
                املأ البيانات وسيتواصل معك أحد مستشاري نبراس لتقديم عرض توضيحي.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "اسم المدرسة *", key: "schoolName", type: "text", required: true },
                { label: "اسم مدير المدرسة *", key: "directorName", type: "text", required: true },
                { label: "رقم الهاتف *", key: "phone", type: "tel", required: true },
                { label: "البريد الإلكتروني", key: "email", type: "email", required: false },
                { label: "عنوان المدرسة", key: "address", type: "text", required: false },
              ].map(({ label, key, type, required }) => (
                <div key={key} className={key === "address" ? "md:col-span-2" : ""}>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1e0f3e" }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    required={required}
                    value={(form as any)[key]}
                    onChange={e => handleFieldChange(key, e.target.value)}
                    inputMode={key === "phone" ? "numeric" : key === "email" ? "email" : "text"}
                    autoComplete={
                      key === "schoolName"
                        ? "organization"
                        : key === "directorName"
                          ? "name"
                          : key === "phone"
                            ? "tel-national"
                            : key === "email"
                              ? "email"
                              : key === "address"
                                ? "street-address"
                                : "off"
                    }
                    maxLength={
                      key === "phone"
                        ? 11
                        : key === "schoolName" || key === "directorName"
                          ? 150
                          : key === "email"
                            ? 255
                            : key === "address"
                              ? 255
                              : undefined
                    }
                    minLength={key === "phone" ? 11 : undefined}
                    pattern={key === "phone" ? "[0-9]{11}" : undefined}
                    placeholder={key === "phone" ? "01XXXXXXXXX" : undefined}
                    dir={key === "phone" || key === "email" ? "ltr" : "rtl"}
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                    style={{
                      borderColor: "rgba(124,58,237,0.2)",
                      background: "#f8f6ff",
                      fontFamily: "'Cairo', sans-serif",
                    }}
                    onFocus={e => (e.target.style.borderColor = PURPLE)}
                    onBlur={e => (e.target.style.borderColor = "rgba(124,58,237,0.2)")}
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1e0f3e" }}>المحافظة</label>
                <select
                  value={form.governorate}
                  onChange={e => setForm(f => ({ ...f, governorate: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                  style={{
                    borderColor: "rgba(124,58,237,0.2)", background: "#f8f6ff",
                    fontFamily: "'Cairo', sans-serif",
                  }}
                >
                  <option value="">اختر المحافظة</option>
                  {governorates.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1e0f3e" }}>عدد الطلاب</label>
                <select
                  value={form.studentCount}
                  onChange={e => setForm(f => ({ ...f, studentCount: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                  style={{
                    borderColor: "rgba(124,58,237,0.2)", background: "#f8f6ff",
                    fontFamily: "'Cairo', sans-serif",
                  }}
                >
                  <option value="">اختر العدد</option>
                  {["أقل من 200", "200 – 500", "500 – 1000", "1000 – 2000", "أكثر من 2000"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2" style={{ color: "#1e0f3e" }}>نوع المدرسة</label>
                <div className="flex gap-3 flex-wrap">
                  {["عربي", "لغات", "دولية"].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, schoolType: type }))}
                      className="px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all"
                      style={{
                        borderColor: form.schoolType === type ? PURPLE : "rgba(124,58,237,0.2)",
                        background: form.schoolType === type ? PURPLE_PALE : "#f8f6ff",
                        color: form.schoolType === type ? PURPLE : "#6b5c8a",
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1e0f3e" }}>رسالة إضافية</label>
                <textarea
                  rows={3}
                  value={form.message}
                  onChange={e => handleFieldChange("message", e.target.value)}
                  maxLength={1000}
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none"
                  style={{
                    borderColor: "rgba(124,58,237,0.2)", background: "#f8f6ff",
                    fontFamily: "'Cairo', sans-serif",
                  }}
                  onFocus={e => (e.target.style.borderColor = PURPLE)}
                  onBlur={e => (e.target.style.borderColor = "rgba(124,58,237,0.2)")}
                />
              </div>
            </div>

            <div className="flex items-start gap-3 mt-4">
              <input
                type="checkbox"
                id="agree"
                required
                checked={form.agree}
                onChange={e => setForm(f => ({ ...f, agree: e.target.checked }))}
                className="mt-1 w-4 h-4 accent-purple-600 cursor-pointer"
              />
              <label htmlFor="agree" className="text-sm cursor-pointer" style={{ color: "#6b5c8a", lineHeight: 1.7 }}>
                أوافق على أن يتواصل معي فريق نبراس لتقديم العرض التوضيحي
              </label>
            </div>

            {submitError && (
              <div
                className="mt-4 rounded-2xl border px-4 py-3 text-sm font-medium"
                style={{
                  borderColor: "rgba(239,68,68,0.16)",
                  background: "rgba(254,242,242,0.95)",
                  color: "#b91c1c",
                }}
              >
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full py-4 rounded-2xl font-bold text-lg text-white transition-all hover:opacity-90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
              style={{ background: `linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})` }}
            >
              {submitting ? "جاري إرسال البيانات..." : "أرسل بيانات المدرسة ←"}
            </button>

            <p className="text-center text-xs mt-3" style={{ color: "#9ca3af" }}>
              🔒 لن نشارك بياناتك مع أي جهة أخرى
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Navbar ────────────────────────────────────────────────────
function Navbar({ onCTAClick }: { onCTAClick: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const links = [
    { label: "المميزات", href: "#features" },
    { label: "كيف يعمل", href: "#how-it-works" },
    { label: "من يستفيد", href: "#benefits" },
    { label: "الأسئلة الشائعة", href: "#faq" },
  ];

  return (
    <nav
      className="fixed inset-x-0 top-0 z-40 w-full transition-all duration-300"
      style={{
        background: scrolled ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.28)",
        backdropFilter: "blur(18px)",
        borderBottom: scrolled ? "1px solid rgba(124,58,237,0.08)" : "1px solid transparent",
        boxShadow: scrolled ? "0 10px 30px rgba(15,23,42,0.06)" : "none",
      }}
    >
      <div
        className="mx-auto flex h-[76px] w-full max-w-[1440px] flex-row-reverse items-center justify-between gap-4 px-4 sm:px-6 lg:px-10"
        style={{}}
      >
        <div className="order-3 flex min-w-[180px] items-center justify-start">
          <ImageWithFallback
            src={nibrasLogo}
            alt="شعار نبراس"
            className="h-11 w-auto object-contain md:h-12"
          />
        </div>

        <div className="order-2 hidden flex-1 items-center justify-center gap-10 md:flex">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="text-[15px] font-semibold transition-colors hover:opacity-70"
              style={{ color: "#1e0f3e" }}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="order-1 flex min-w-[180px] items-center justify-end gap-3">
          <button
            onClick={onCTAClick}
            className="hidden md:flex items-center rounded-2xl px-6 py-3 font-bold text-sm text-white transition-all hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})`,
              boxShadow: "0 12px 28px rgba(124,58,237,0.18)",
            }}
          >
            احجز عرضك المجاني
          </button>
          <button
            className="md:hidden flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{ background: "rgba(124,58,237,0.1)", color: PURPLE }}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          className="border-t bg-white/95 px-6 py-4 backdrop-blur md:hidden"
          style={{ borderColor: "rgba(124,58,237,0.1)" }}
        >
          <div className="flex flex-col gap-3">
            {links.map(l => (
              <a key={l.href} href={l.href} className="font-semibold text-sm py-1" style={{ color: "#1e0f3e" }} onClick={() => setMenuOpen(false)}>
                {l.label}
              </a>
            ))}
          </div>
          <button
            onClick={() => { setMenuOpen(false); onCTAClick(); }}
            className="mt-4 w-full py-3 rounded-2xl font-bold text-sm text-white"
            style={{ background: `linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})` }}
          >
            احجز عرضك المجاني
          </button>
        </div>
      )}
    </nav>
  );
}

// ─── Hero ──────────────────────────────────────────────────────
function Hero({ onCTAClick }: { onCTAClick: () => void }) {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-24 pb-16"
      style={{ background: "linear-gradient(160deg, #faf8ff 0%, #f0edfb 40%, #fff9e6 100%)" }}
    >
      {/* Decorative blobs */}
      <div
        className="absolute top-20 right-[-10%] w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: PURPLE }}
      />
      <div
        className="absolute bottom-10 left-[-5%] w-80 h-80 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: GOLD }}
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10">
        <div className="flex flex-col items-center text-center gap-6 mb-14">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border"
            style={{ borderColor: `${PURPLE}30`, background: PURPLE_PALE, color: PURPLE }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: GOLD }}
            />
            المنصة التعليمية الأولى للمدارس الخاصة في مصر
          </div>

          <h1
            className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight"
            style={{ color: "#1e0f3e", lineHeight: 1.3 }}
          >
            منصة واحدة...
            <br />
            <span style={{ color: PURPLE }}>لإدارة مدرسة</span>
            <br />
            <span style={{ color: GOLD }}>أكثر تنظيمًا وكفاءة</span>
          </h1>

          <p
            className="max-w-2xl text-lg md:text-xl leading-relaxed"
            style={{ color: "#6b5c8a", lineHeight: 1.9 }}
          >
            نبراس يجمع جميع عمليات مدرستك — الطلاب، المعلمون، الحضور، الدرجات، الجداول،
            والتواصل — في منصة واحدة تمنحك رؤية كاملة بنقرة واحدة.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onCTAClick}
              className="px-8 py-4 rounded-2xl font-bold text-lg text-white transition-all hover:opacity-90 hover:shadow-xl hover:-translate-y-0.5"
              style={{ background: `linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})`, boxShadow: `0 8px 32px ${PURPLE}40` }}
            >
              ابدأ رحلتك مع نبراس ←
            </button>
            <button
              className="px-8 py-4 rounded-2xl font-bold text-lg border-2 transition-all hover:bg-purple-50"
              style={{ borderColor: `${PURPLE}30`, color: PURPLE }}
            >
              شاهد كيف يعمل
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex items-center gap-6 flex-wrap justify-center mt-2">
            {[
              { icon: <Shield size={14} />, text: "بيانات آمنة 100%" },
              { icon: <Zap size={14} />, text: "تشغيل فوري" },
              { icon: <Users size={14} />, text: "+50 مدرسة موثوقة" },
            ].map(b => (
              <div key={b.text} className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "#6b5c8a" }}>
                <span style={{ color: PURPLE }}>{b.icon}</span>
                {b.text}
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="relative max-w-5xl mx-auto">
          <div
            className="rounded-3xl overflow-hidden shadow-2xl border"
            style={{ borderColor: "rgba(124,58,237,0.15)", background: "#1e0f3e" }}
          >
            {/* Browser chrome */}
            <div
              className="flex items-center gap-2 px-5 py-3 border-b"
              style={{ background: "#150a2e", borderColor: "rgba(124,58,237,0.2)" }}
            >
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400 opacity-70" />
                <div className="w-3 h-3 rounded-full bg-yellow-400 opacity-70" />
                <div className="w-3 h-3 rounded-full bg-green-400 opacity-70" />
              </div>
              <div
                className="flex-1 mx-3 rounded-lg px-4 py-1.5 text-xs text-center font-mono"
                style={{ background: "rgba(124,58,237,0.2)", color: "rgba(255,255,255,0.4)" }}
              >
                app.nibras.edu.eg
              </div>
            </div>

            {/* Dashboard content */}
            <div style={{ background: "#f8f6ff", padding: "20px" }}>
              <div className="flex gap-4">
                {/* Sidebar */}
                <div
                  className="hidden md:flex flex-col gap-1 rounded-2xl p-3 w-44 shrink-0"
                  style={{ background: "#1e0f3e" }}
                >
                  <div className="flex items-center gap-2 p-2 mb-2">
                    <ImageWithFallback src={nibrasLogo} alt="نبراس" className="h-8 w-auto object-contain" />
                  </div>
                  {[
                    { icon: <BarChart3 size={14} />, label: "لوحة التحكم" },
                    { icon: <Users size={14} />, label: "الطلاب" },
                    { icon: <GraduationCap size={14} />, label: "المعلمون" },
                    { icon: <Calendar size={14} />, label: "الحضور" },
                    { icon: <BookOpen size={14} />, label: "الدرجات" },
                    { icon: <FileText size={14} />, label: "التقارير" },
                    { icon: <Bell size={14} />, label: "الإشعارات" },
                    { icon: <MessageSquare size={14} />, label: "الرسائل" },
                  ].map((item, i) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                      style={{
                        background: i === 0 ? PURPLE : "transparent",
                        color: i === 0 ? "#fff" : "rgba(255,255,255,0.5)",
                      }}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="flex-1 flex flex-col gap-3 min-w-0">
                  {/* KPI row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "إجمالي الطلاب", value: "1,247", icon: <Users size={16} />, color: PURPLE, change: "+12" },
                      { label: "الحضور اليوم", value: "94.2%", icon: <Check size={16} />, color: "#10b981", change: "+2.1%" },
                      { label: "المعلمون النشطون", value: "68", icon: <GraduationCap size={16} />, color: GOLD, change: "68/72" },
                      { label: "الدرجة العامة", value: "87.4", icon: <TrendingUp size={16} />, color: "#3b82f6", change: "ممتاز" },
                    ].map(kpi => (
                      <div
                        key={kpi.label}
                        className="rounded-2xl p-3 border"
                        style={{ background: "#fff", borderColor: "rgba(124,58,237,0.08)" }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold" style={{ color: "#6b5c8a" }}>{kpi.label}</span>
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ background: `${kpi.color}18`, color: kpi.color }}
                          >
                            {kpi.icon}
                          </div>
                        </div>
                        <div className="text-xl font-black" style={{ color: "#1e0f3e" }}>{kpi.value}</div>
                        <div className="text-xs mt-0.5" style={{ color: kpi.color }}>{kpi.change}</div>
                      </div>
                    ))}
                  </div>

                  {/* Charts row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div
                      className="rounded-2xl p-4 border"
                      style={{ background: "#fff", borderColor: "rgba(124,58,237,0.08)" }}
                    >
                      <div className="text-xs font-bold mb-3" style={{ color: "#1e0f3e" }}>نسبة الحضور - الأسبوع الحالي</div>
                      <div className="flex items-end gap-2 h-20">
                        {[88, 94, 91, 96, 93, 89, 95].map((v, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              className="w-full rounded-t-lg transition-all"
                              style={{ height: `${(v / 100) * 64}px`, background: i === 4 ? PURPLE : `${PURPLE}40` }}
                            />
                            <span className="text-[9px]" style={{ color: "#9ca3af" }}>
                              {["أ", "إ", "ث", "أر", "خ", "جم", "سب"][i]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div
                      className="rounded-2xl p-4 border"
                      style={{ background: "#fff", borderColor: "rgba(124,58,237,0.08)" }}
                    >
                      <div className="text-xs font-bold mb-3" style={{ color: "#1e0f3e" }}>آخر الأنشطة</div>
                      <div className="flex flex-col gap-2">
                        {[
                          { text: "سجّل أ. محمد حضور الصف الثالث", time: "منذ 2 دقيقة", color: "#10b981" },
                          { text: "رُفعت درجات الاختبار النهائي - الرياضيات", time: "منذ 15 دقيقة", color: PURPLE },
                          { text: "إشعار للأهالي: غداء مدرسي اليوم", time: "منذ 30 دقيقة", color: GOLD },
                        ].map((a, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div
                              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                              style={{ background: a.color }}
                            />
                            <div>
                              <div className="text-xs font-semibold leading-tight" style={{ color: "#1e0f3e" }}>{a.text}</div>
                              <div className="text-[10px]" style={{ color: "#9ca3af" }}>{a.time}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating cards */}
          <div
            className="absolute -top-4 -right-4 md:-right-8 hidden md:block rounded-2xl p-4 shadow-xl border"
            style={{ background: "#fff", borderColor: "rgba(124,58,237,0.1)", minWidth: 160 }}
          >
            <div className="text-xs font-semibold mb-1" style={{ color: "#6b5c8a" }}>رضا أولياء الأمور</div>
            <div className="text-2xl font-black" style={{ color: "#1e0f3e" }}>98%</div>
            <div className="flex gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} fill={GOLD} color={GOLD} />)}
            </div>
          </div>

          <div
            className="absolute -bottom-4 -left-4 md:-left-8 hidden md:block rounded-2xl p-4 shadow-xl border"
            style={{ background: "#1e0f3e", borderColor: "rgba(124,58,237,0.3)", minWidth: 180 }}
          >
            <div className="text-xs font-semibold mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>تقارير لحظية</div>
            <div className="text-xl font-black text-white">360°</div>
            <div className="text-xs mt-1" style={{ color: GOLD }}>رؤية شاملة للمدرسة</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Pain Points ───────────────────────────────────────────────
function PainPoints() {
  const pains = [
    { icon: <FileText size={22} />, title: "ملفات Excel بلا نهاية", desc: "ساعات طويلة في إدخال البيانات يدويًا مع خطر الخطأ في كل خطوة." },
    { icon: <AlertCircle size={22} />, title: "البيانات تضيع", desc: "ملفات مبعثرة، أوراق مفقودة، وتاريخ طلاب غير موثق في مكان واحد." },
    { icon: <Calendar size={22} />, title: "الحضور فوضى كاملة", desc: "لا تعرف غياب الطلاب إلا نهاية اليوم بعد مراجعة دفاتر متعددة." },
    { icon: <Clock size={22} />, title: "تأخير إدخال الدرجات", desc: "الدرجات تصل متأخرة لأولياء الأمور مما يسبب شكاوى لا تنتهي." },
    { icon: <MessageSquare size={22} />, title: "التواصل عبر واتساب", desc: "رسائل مبعثرة، إعلانات غير رسمية، وتواصل بلا أرشيف ولا نظام." },
    { icon: <Eye size={22} />, title: "لا رقابة على المعلمين", desc: "لا تعرف من حضر ومن غاب، ولا مستوى أداء كل معلم بشكل موثق." },
    { icon: <BarChart3 size={22} />, title: "تقارير غير دقيقة", desc: "قرارات إدارية مبنية على أرقام غير موثوقة تؤثر على سمعة المدرسة." },
    { icon: <Layers size={22} />, title: "الاعتماد على الورق", desc: "أطنان من الأوراق تُضيع الوقت والمال وتجعل التدقيق مستحيلًا." },
  ];

  return (
    <section className="py-24 px-6 md:px-10" style={{ background: "#fff" }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold mb-4"
            style={{ background: "#fff4e6", color: "#b45309" }}
          >
            <AlertCircle size={14} />
            هل تعاني من هذه المشاكل؟
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-4" style={{ color: "#1e0f3e" }}>
            هل تواجه مدرستك هذه التحديات؟
          </h2>
          <p className="max-w-xl mx-auto text-lg" style={{ color: "#6b5c8a", lineHeight: 1.8 }}>
            إذا كانت إجابتك "نعم" على أي منها، فأنت تحتاج نبراس الآن.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pains.map((p, i) => (
            <div
              key={p.title}
              className="rounded-2xl p-6 border group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              style={{ borderColor: "rgba(124,58,237,0.1)", background: "#faf9ff" }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors group-hover:scale-110 duration-200"
                style={{ background: `${PURPLE}15`, color: PURPLE }}
              >
                {p.icon}
              </div>
              <h3 className="font-bold mb-2" style={{ color: "#1e0f3e" }}>{p.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#6b5c8a" }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Comparison ────────────────────────────────────────────────
function Comparison({ onCTAClick }: { onCTAClick: () => void }) {
  const rows = [
    { label: "تسجيل الحضور", old: "دفاتر ورقية يومية", nibras: "تسجيل لحظي بنقرة واحدة" },
    { label: "متابعة الدرجات", old: "Excel وأخطاء بشرية", nibras: "نتائج فورية وتحليلية" },
    { label: "التواصل مع الأهالي", old: "واتساب وأوراق مطبوعة", nibras: "إشعارات فورية ومنظمة" },
    { label: "تقارير الأداء", old: "لا تقارير أو بيانات ناقصة", nibras: "تقارير تفصيلية في ثوانٍ" },
    { label: "الجداول الدراسية", old: "Excel يدوي يتعطل دائمًا", nibras: "جداول ذكية تلقائية" },
    { label: "إدارة المعلمين", old: "لا رقابة ولا بيانات", nibras: "متابعة أداء شاملة ومستمرة" },
    { label: "متابعة المالكين", old: "أرقام مقدّرة غير دقيقة", nibras: "لوحة تحكم تنفيذية مباشرة" },
  ];

  return (
    <section className="py-24 px-6 md:px-10" style={{ background: PURPLE_PALE }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-5xl font-black mb-4" style={{ color: "#1e0f3e" }}>
            الطريقة القديمة <span style={{ color: "#9ca3af" }}>مقابل</span>{" "}
            <span style={{ color: PURPLE }}>نبراس</span>
          </h2>
          <p className="text-lg" style={{ color: "#6b5c8a" }}>
            الفرق ليس في الأدوات — الفرق في النتائج.
          </p>
        </div>

        <div className="rounded-3xl overflow-hidden shadow-xl border" style={{ borderColor: "rgba(124,58,237,0.1)" }}>
          {/* Header */}
          <div className="grid grid-cols-3 text-sm font-bold">
            <div className="p-4 text-center" style={{ background: "#f3f4f6", color: "#6b7280" }}>العملية</div>
            <div className="p-4 text-center border-x" style={{ background: "#fef2f2", color: "#ef4444", borderColor: "rgba(0,0,0,0.05)" }}>
              الطريقة التقليدية
            </div>
            <div className="p-4 text-center" style={{ background: PURPLE, color: "#fff" }}>
              مع نبراس
            </div>
          </div>

          {rows.map((row, i) => (
            <div
              key={row.label}
              className="grid grid-cols-3 border-t text-sm"
              style={{ borderColor: "rgba(124,58,237,0.08)", background: i % 2 === 0 ? "#fff" : "#faf9ff" }}
            >
              <div className="p-4 font-semibold" style={{ color: "#1e0f3e" }}>{row.label}</div>
              <div className="p-4 border-x flex items-center gap-2" style={{ borderColor: "rgba(0,0,0,0.05)", color: "#6b7280" }}>
                <X size={14} className="shrink-0" style={{ color: "#ef4444" }} />
                {row.old}
              </div>
              <div className="p-4 flex items-center gap-2" style={{ color: PURPLE_DARK }}>
                <Check size={14} className="shrink-0" style={{ color: "#10b981" }} />
                <span className="font-semibold">{row.nibras}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <button
            onClick={onCTAClick}
            className="px-10 py-4 rounded-2xl font-bold text-lg text-white transition-all hover:opacity-90 hover:shadow-xl"
            style={{ background: `linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})` }}
          >
            أريد نبراس لمدرستي ←
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ──────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      n: "01", icon: <Clock size={24} />, title: "تبدأ المدرسة يومها",
      desc: "يفتح مدير المدرسة لوحة تحكم نبراس ويرى ملخص اليوم فورًا — الحضور المتوقع، المهام المعلقة، والإشعارات.",
    },
    {
      n: "02", icon: <Users size={24} />, title: "المعلمون يسجلون الحضور",
      desc: "بنقرة واحدة من هاتف المعلم يُسجَّل حضور وغياب كل طالب، وتصل إشعارات تلقائية للأهالي فورًا.",
    },
    {
      n: "03", icon: <Bell size={24} />, title: "الأهالي يتابعون أبناءهم",
      desc: "يستلم ولي الأمر إشعارًا بالحضور أو الغياب، الدرجات، الواجبات، والإعلانات المدرسية على هاتفه مباشرة.",
    },
    {
      n: "04", icon: <BookOpen size={24} />, title: "الواجبات والاختبارات",
      desc: "يُرسل المعلمون الواجبات رقميًا، ويسجلون الدرجات مباشرة في النظام دون أوراق أو Excel.",
    },
    {
      n: "05", icon: <TrendingUp size={24} />, title: "الدرجات والتحليل",
      desc: "تُحلّل نبراس الدرجات تلقائيًا وتُنشئ تقارير أداء لكل طالب وصف وفصل دراسي.",
    },
    {
      n: "06", icon: <BarChart3 size={24} />, title: "المالك يرى كل شيء",
      desc: "من أي مكان، يفتح مالك المدرسة لوحة التحكم ليرى أداء كل شيء — الطلاب، المعلمون، الحضور، والمالية.",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-6 md:px-10" style={{ background: "#fff" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black mb-4" style={{ color: "#1e0f3e" }}>
            يوم مدرسي كامل مع <span style={{ color: PURPLE }}>نبراس</span>
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "#6b5c8a", lineHeight: 1.8 }}>
            من أول لحظة في الصباح حتى نهاية اليوم — نبراس يدير كل شيء.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div
              key={s.n}
              className="relative rounded-2xl p-7 border group transition-all hover:-translate-y-1 hover:shadow-lg duration-300"
              style={{ borderColor: "rgba(124,58,237,0.1)", background: "#faf9ff" }}
            >
              <div
                className="absolute top-5 right-5 text-4xl font-black opacity-10"
                style={{ color: PURPLE, fontFamily: "monospace" }}
              >
                {s.n}
              </div>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: `${PURPLE}15`, color: PURPLE }}
              >
                {s.icon}
              </div>
              <h3 className="font-bold text-lg mb-2" style={{ color: "#1e0f3e" }}>{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#6b5c8a" }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Screenshots / Features Showcase ─────────────────────────
function Screenshots() {
  const [active, setActive] = useState(0);
  const screens = [
    { label: "لوحة التحكم", color: PURPLE, icon: <BarChart3 size={16} /> },
    { label: "الطلاب", color: "#3b82f6", icon: <Users size={16} /> },
    { label: "الحضور", color: "#10b981", icon: <Calendar size={16} /> },
    { label: "الدرجات", color: GOLD, icon: <Star size={16} /> },
    { label: "الرسائل", color: "#8b5cf6", icon: <MessageSquare size={16} /> },
    { label: "التقارير", color: "#ef4444", icon: <FileText size={16} /> },
  ];

  const mockContent = [
    // Dashboard
    <div key="d" className="p-5 flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { v: "1,247", l: "طالب", c: PURPLE },
          { v: "94%", l: "الحضور", c: "#10b981" },
          { v: "68", l: "معلم", c: GOLD },
          { v: "87.4", l: "المعدل العام", c: "#3b82f6" },
        ].map(k => (
          <div key={k.l} className="rounded-xl p-3 text-center border" style={{ background: "#fff", borderColor: "rgba(0,0,0,0.05)" }}>
            <div className="text-xl font-black" style={{ color: k.c }}>{k.v}</div>
            <div className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{k.l}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-4 border" style={{ background: "#fff", borderColor: "rgba(0,0,0,0.05)" }}>
        <div className="text-sm font-bold mb-3" style={{ color: "#1e0f3e" }}>أداء الطلاب هذا الشهر</div>
        <div className="flex items-end gap-1.5 h-24">
          {[72, 85, 78, 91, 88, 76, 94, 89, 83, 87, 92, 80].map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-md"
              style={{ height: `${(v / 100) * 96}px`, background: i === 10 ? PURPLE : `${PURPLE}35` }}
            />
          ))}
        </div>
      </div>
    </div>,
    // Students
    <div key="s" className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold" style={{ color: "#1e0f3e" }}>قائمة الطلاب</h3>
        <div className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: PURPLE_PALE, color: PURPLE }}>
          1,247 طالب
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {[
          { name: "أحمد محمد علي", grade: "الصف الخامس أ", gpa: "95.2", status: "حاضر" },
          { name: "سارة أحمد حسن", grade: "الصف الخامس أ", gpa: "88.7", status: "حاضر" },
          { name: "محمد عبدالله", grade: "الصف الرابع ب", gpa: "91.3", status: "غائب" },
          { name: "فاطمة علي محمود", grade: "الصف السادس أ", gpa: "97.1", status: "حاضر" },
          { name: "عمر خالد إبراهيم", grade: "الصف الثالث ج", gpa: "82.4", status: "حاضر" },
        ].map(st => (
          <div key={st.name} className="flex items-center justify-between p-3 rounded-xl border" style={{ background: "#fff", borderColor: "rgba(0,0,0,0.05)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: PURPLE }}>
                {st.name[0]}
              </div>
              <div>
                <div className="text-xs font-bold" style={{ color: "#1e0f3e" }}>{st.name}</div>
                <div className="text-[10px]" style={{ color: "#9ca3af" }}>{st.grade}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold" style={{ color: "#1e0f3e" }}>{st.gpa}</span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: st.status === "حاضر" ? "#d1fae5" : "#fee2e2",
                  color: st.status === "حاضر" ? "#059669" : "#dc2626",
                }}
              >
                {st.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>,
    // Attendance
    <div key="a" className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold" style={{ color: "#1e0f3e" }}>سجل الحضور اليوم</h3>
        <div className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: "#d1fae5", color: "#059669" }}>
          الأحد 19 يوليو
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { v: "1,173", l: "حضروا", c: "#10b981", bg: "#d1fae5" },
          { v: "74", l: "غائبون", c: "#ef4444", bg: "#fee2e2" },
          { v: "94.1%", l: "نسبة الحضور", c: "#3b82f6", bg: "#dbeafe" },
        ].map(k => (
          <div key={k.l} className="rounded-xl p-3 text-center" style={{ background: k.bg }}>
            <div className="text-xl font-black" style={{ color: k.c }}>{k.v}</div>
            <div className="text-xs mt-0.5 font-semibold" style={{ color: k.c }}>{k.l}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-4 border" style={{ background: "#fff", borderColor: "rgba(0,0,0,0.05)" }}>
        <div className="text-xs font-bold mb-3" style={{ color: "#1e0f3e" }}>الحضور حسب الصف</div>
        {["الصف الثالث أ", "الصف الرابع ب", "الصف الخامس أ", "الصف السادس ج"].map((cls, i) => {
          const pct = [96, 88, 100, 92][i];
          return (
            <div key={cls} className="flex items-center gap-3 mb-2">
              <div className="text-xs w-28 shrink-0" style={{ color: "#6b5c8a" }}>{cls}</div>
              <div className="flex-1 h-2 rounded-full" style={{ background: "#f0edfb" }}>
                <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? "#10b981" : PURPLE }} />
              </div>
              <div className="text-xs font-bold w-8 text-left" style={{ color: "#1e0f3e" }}>{pct}%</div>
            </div>
          );
        })}
      </div>
    </div>,
    // Grades
    <div key="g" className="p-5">
      <h3 className="font-bold mb-4" style={{ color: "#1e0f3e" }}>كشف الدرجات - الفصل الأول</h3>
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
        <div className="grid grid-cols-5 text-[10px] font-bold p-2" style={{ background: PURPLE, color: "#fff" }}>
          <div>الطالب</div><div className="text-center">عربي</div><div className="text-center">رياضيات</div><div className="text-center">علوم</div><div className="text-center">المجموع</div>
        </div>
        {[
          ["أحمد م.", 95, 88, 92, "275"],
          ["سارة أ.", 87, 94, 90, "271"],
          ["محمد ع.", 78, 85, 80, "243"],
          ["فاطمة م.", 98, 97, 95, "290"],
        ].map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-5 text-[10px] p-2 border-t"
            style={{ background: i % 2 ? "#faf9ff" : "#fff", borderColor: "rgba(0,0,0,0.04)" }}
          >
            <div className="font-semibold" style={{ color: "#1e0f3e" }}>{r[0]}</div>
            {[r[1], r[2], r[3]].map((v, j) => (
              <div key={j} className="text-center font-semibold" style={{ color: Number(v) >= 90 ? "#10b981" : "#1e0f3e" }}>{v}</div>
            ))}
            <div className="text-center font-black" style={{ color: PURPLE }}>{r[4]}</div>
          </div>
        ))}
      </div>
    </div>,
    // Messages
    <div key="m" className="p-5 flex flex-col gap-3">
      <h3 className="font-bold" style={{ color: "#1e0f3e" }}>الرسائل والإشعارات</h3>
      {[
        { from: "إدارة المدرسة", msg: "تذكير: يوم الأربعاء إجازة رسمية", time: "٩:٠٠ ص", unread: true },
        { from: "أ. خالد - الرياضيات", msg: "تم رفع نتائج اختبار الفصل الأول", time: "٨:٣٠ ص", unread: true },
        { from: "الإدارة المالية", msg: "تذكير بسداد رسوم الفصل الثاني", time: "أمس", unread: false },
        { from: "أ. منى - اللغة العربية", msg: "الواجب المنزلي: صفحة ٤٥-٤٧", time: "أمس", unread: false },
      ].map((msg, i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-3 rounded-xl border transition-colors"
          style={{
            background: msg.unread ? PURPLE_PALE : "#fff",
            borderColor: msg.unread ? `${PURPLE}25` : "rgba(0,0,0,0.05)",
          }}
        >
          <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: PURPLE }}>
            {msg.from[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold truncate" style={{ color: "#1e0f3e" }}>{msg.from}</span>
              <span className="text-[10px] shrink-0" style={{ color: "#9ca3af" }}>{msg.time}</span>
            </div>
            <p className="text-[11px] mt-0.5 truncate" style={{ color: "#6b5c8a" }}>{msg.msg}</p>
          </div>
          {msg.unread && <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: PURPLE }} />}
        </div>
      ))}
    </div>,
    // Reports
    <div key="r" className="p-5 flex flex-col gap-4">
      <h3 className="font-bold" style={{ color: "#1e0f3e" }}>التقارير والتحليلات</h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          { title: "تقرير الحضور الشهري", date: "يوليو ٢٠٢٦", color: "#10b981", icon: <Calendar size={14} /> },
          { title: "تقرير الأداء الأكاديمي", date: "الفصل الأول", color: PURPLE, icon: <TrendingUp size={14} /> },
          { title: "تقرير أداء المعلمين", date: "يوليو ٢٠٢٦", color: GOLD, icon: <GraduationCap size={14} /> },
          { title: "التقرير المالي", date: "٢٠٢٥-٢٠٢٦", color: "#3b82f6", icon: <BarChart3 size={14} /> },
        ].map(rep => (
          <div
            key={rep.title}
            className="p-4 rounded-xl border flex flex-col gap-2 cursor-pointer hover:shadow-md transition-all"
            style={{ background: "#fff", borderColor: "rgba(0,0,0,0.05)" }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${rep.color}18`, color: rep.color }}>
              {rep.icon}
            </div>
            <div className="text-xs font-bold" style={{ color: "#1e0f3e" }}>{rep.title}</div>
            <div className="text-[10px]" style={{ color: "#9ca3af" }}>{rep.date}</div>
            <div className="text-[10px] font-semibold flex items-center gap-1" style={{ color: rep.color }}>
              عرض التقرير <ChevronRight size={10} />
            </div>
          </div>
        ))}
      </div>
    </div>,
  ];

  return (
    <section className="py-24 px-6 md:px-10" style={{ background: "#f8f6ff" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-black mb-4" style={{ color: "#1e0f3e" }}>
            شاهد نبراس من الداخل
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "#6b5c8a" }}>
            كل قسم مصمم ليوفر عليك الوقت ويمنحك السيطرة الكاملة.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {screens.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setActive(i)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: active === i ? s.color : "#fff",
                color: active === i ? "#fff" : "#6b5c8a",
                boxShadow: active === i ? `0 4px 16px ${s.color}40` : "none",
                border: `1px solid ${active === i ? s.color : "rgba(0,0,0,0.08)"}`,
              }}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>

        <div
          className="rounded-3xl overflow-hidden shadow-2xl border"
          style={{ borderColor: "rgba(124,58,237,0.15)", background: "#fff" }}
        >
          {/* Browser chrome */}
          <div
            className="flex items-center gap-3 px-5 py-3 border-b"
            style={{ background: "#1e0f3e", borderColor: "rgba(124,58,237,0.2)" }}
          >
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400 opacity-70" />
              <div className="w-3 h-3 rounded-full bg-yellow-400 opacity-70" />
              <div className="w-3 h-3 rounded-full bg-green-400 opacity-70" />
            </div>
            <div
              className="flex-1 rounded-lg px-4 py-1.5 text-xs font-mono text-center"
              style={{ background: "rgba(124,58,237,0.2)", color: "rgba(255,255,255,0.4)" }}
            >
              app.nibras.edu.eg / {screens[active].label}
            </div>
          </div>
          <div style={{ minHeight: 360 }}>
            {mockContent[active]}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features Bento ────────────────────────────────────────────
function Features() {
  const features = [
    { icon: <BarChart3 size={24} />, title: "لوحة تحكم تنفيذية", desc: "اعرف حالة مدرستك كاملة — حضور، درجات، أداء، مالية — في نظرة واحدة.", wide: true },
    { icon: <Users size={24} />, title: "متابعة كل طالب", desc: "تابع كل طالب في المدرسة لحظة بلحظة من لوحة تحكم واحدة." },
    { icon: <GraduationCap size={24} />, title: "أداء المعلمين", desc: "اعرف أداء كل معلم بدقة — الحضور، التفاعل، نتائج طلابه." },
    { icon: <Calendar size={24} />, title: "الحضور الذكي", desc: "اعرف الغياب اليومي في ثوانٍ دون مراجعة دفاتر أو ملفات Excel." },
    { icon: <BookOpen size={24} />, title: "الدرجات والاختبارات", desc: "رفع الدرجات وتحليلها تلقائيًا مع إشعارات فورية للأهالي." },
    { icon: <Bell size={24} />, title: "إشعارات وإعلانات", desc: "أرسل إعلانات للأهالي والمعلمين بضغطة زر — فورية ومؤرشفة.", wide: true },
    { icon: <MessageSquare size={24} />, title: "منصة تواصل رسمية", desc: "بدّل واتساب برسائل رسمية منظمة داخل نبراس." },
    { icon: <FileText size={24} />, title: "تقارير لحظية", desc: "تقارير احترافية جاهزة بنقرة — لا Excel ولا انتظار." },
    { icon: <Shield size={24} />, title: "أمان البيانات", desc: "بياناتك مشفرة على خوادم سحابية آمنة — لا مخاطر." },
    { icon: <Layers size={24} />, title: "إدارة العام الدراسي", desc: "فصول، مواد، جداول — كل شيء في منظومة واحدة متكاملة." },
    { icon: <Settings size={24} />, title: "صلاحيات مرنة", desc: "تحكم في صلاحيات كل مستخدم — مدير، معلم، ولي أمر، طالب." },
    { icon: <TrendingUp size={24} />, title: "تحليلات ذكية", desc: "توقع مشاكل الأداء قبل حدوثها بمؤشرات تحليلية ذكية.", wide: true },
  ];

  return (
    <section id="features" className="py-24 px-6 md:px-10" style={{ background: "#fff" }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-5xl font-black mb-4" style={{ color: "#1e0f3e" }}>
            كل ما تحتاجه مدرستك <span style={{ color: PURPLE }}>في مكان واحد</span>
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "#6b5c8a" }}>
            نبراس يغطي كل جانب من جوانب إدارة مدرستك بأدوات احترافية مبنية لاحتياجاتك.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`rounded-2xl p-7 border group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${f.wide ? "lg:col-span-1" : ""}`}
              style={{ borderColor: "rgba(124,58,237,0.1)", background: i % 5 === 0 ? "#1e0f3e" : "#faf9ff" }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: i % 5 === 0 ? `${PURPLE}40` : `${PURPLE}15`,
                  color: i % 5 === 0 ? "#fff" : PURPLE,
                }}
              >
                {f.icon}
              </div>
              <h3 className="font-bold text-lg mb-2" style={{ color: i % 5 === 0 ? "#fff" : "#1e0f3e" }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: i % 5 === 0 ? "rgba(255,255,255,0.6)" : "#6b5c8a" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Who Benefits ──────────────────────────────────────────────
function WhoBenesits() {
  const users = [
    {
      role: "مالك المدرسة",
      icon: <Building2 size={28} />,
      color: PURPLE,
      benefits: [
        "رؤية مالية وأكاديمية شاملة 360°",
        "تقارير لحظية من أي مكان",
        "قرارات مبنية على بيانات دقيقة",
        "متابعة أداء الإدارة والمعلمين",
      ],
    },
    {
      role: "مدير المدرسة",
      icon: <Award size={28} />,
      color: "#3b82f6",
      benefits: [
        "إدارة كاملة بلا فوضى إدارية",
        "جداول وفصول ومواد بضغطة زر",
        "متابعة الحضور والغياب فورًا",
        "تواصل رسمي مع الأهالي والمعلمين",
      ],
    },
    {
      role: "المعلم",
      icon: <GraduationCap size={28} />,
      color: "#10b981",
      benefits: [
        "تسجيل الحضور في ثوانٍ",
        "رفع الدرجات والواجبات رقميًا",
        "التواصل مع الأهالي بسهولة",
        "لا أوراق ولا Excel بعد اليوم",
      ],
    },
    {
      role: "ولي الأمر",
      icon: <Users size={28} />,
      color: GOLD,
      benefits: [
        "إشعارات فورية بالحضور والدرجات",
        "متابعة واجبات الأبناء يوميًا",
        "تواصل مباشر مع المعلمين",
        "طمأنينة كاملة على أبنائه",
      ],
    },
    {
      role: "الطالب",
      icon: <BookOpen size={28} />,
      color: "#8b5cf6",
      benefits: [
        "جداول دراسية واضحة دائمًا",
        "استلام الواجبات إلكترونيًا",
        "معرفة درجاته فورًا",
        "بيئة تعليمية منظمة ومحفزة",
      ],
    },
  ];

  return (
    <section id="benefits" className="py-24 px-6 md:px-10" style={{ background: PURPLE_PALE }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-5xl font-black mb-4" style={{ color: "#1e0f3e" }}>
            نبراس يخدم <span style={{ color: PURPLE }}>الجميع</span>
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "#6b5c8a" }}>
            منصة واحدة تُلبّي احتياجات كل شخص في المنظومة المدرسية.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {users.map(u => (
            <div
              key={u.role}
              className="rounded-2xl p-6 border bg-white transition-all hover:-translate-y-1 hover:shadow-lg duration-300"
              style={{ borderColor: `${u.color}20` }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: `${u.color}15`, color: u.color }}
              >
                {u.icon}
              </div>
              <h3 className="font-bold text-lg mb-4" style={{ color: "#1e0f3e" }}>{u.role}</h3>
              <ul className="flex flex-col gap-2.5">
                {u.benefits.map(b => (
                  <li key={b} className="flex items-start gap-2 text-sm" style={{ color: "#6b5c8a" }}>
                    <Check size={14} className="shrink-0 mt-0.5" style={{ color: u.color }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Implementation Timeline ───────────────────────────────────
function Implementation({ onCTAClick }: { onCTAClick: () => void }) {
  const steps = [
    { n: 1, label: "تقدّم بطلبك", desc: "أرسل بيانات مدرستك عبر النموذج", icon: <FileText size={20} />, days: "اليوم" },
    { n: 2, label: "تواصل المستشار", desc: "يتصل بك مستشار نبراس خلال 24 ساعة", icon: <Phone size={20} />, days: "خلال 24 ساعة" },
    { n: 3, label: "عرض توضيحي", desc: "جلسة تجريبية مباشرة على مدرستك", icon: <Eye size={20} />, days: "خلال 3 أيام" },
    { n: 4, label: "الاتفاقية", desc: "توقيع العقد وتحديد موعد البدء", icon: <Check size={20} />, days: "حسب الاتفاق" },
    { n: 5, label: "إعداد المدرسة", desc: "إدخال بيانات المدرسة وإعداد الحسابات", icon: <Settings size={20} />, days: "أسبوع واحد" },
    { n: 6, label: "التدريب", desc: "تدريب فريق المدرسة على استخدام نبراس", icon: <GraduationCap size={20} />, days: "يومان" },
    { n: 7, label: "الإطلاق 🚀", desc: "مدرستك تعمل بنظام نبراس بالكامل", icon: <Zap size={20} />, days: "في أقل من أسبوعين" },
  ];

  return (
    <section className="py-24 px-6 md:px-10" style={{ background: "#fff" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-5xl font-black mb-4" style={{ color: "#1e0f3e" }}>
            من الفكرة إلى <span style={{ color: PURPLE }}>الإطلاق</span>
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "#6b5c8a" }}>
            عملية بسيطة وسريعة — مدرستك جاهزة في أقل من أسبوعين.
          </p>
        </div>

        <div className="flex flex-col gap-0">
          {steps.map((s, i) => (
            <div key={s.n} className="flex gap-6 items-start">
              <div className="flex flex-col items-center">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black text-white shadow-lg"
                  style={{ background: i === steps.length - 1 ? GOLD : PURPLE }}
                >
                  {s.icon}
                </div>
                {i < steps.length - 1 && (
                  <div className="w-0.5 h-10 my-1" style={{ background: `${PURPLE}25` }} />
                )}
              </div>
              <div className="pb-6 pt-2 flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-black text-lg" style={{ color: "#1e0f3e" }}>{s.label}</span>
                  <span
                    className="text-xs px-3 py-1 rounded-full font-semibold"
                    style={{ background: i === steps.length - 1 ? "#fef9e7" : PURPLE_PALE, color: i === steps.length - 1 ? "#b45309" : PURPLE }}
                  >
                    {s.days}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "#6b5c8a" }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={onCTAClick}
            className="px-10 py-4 rounded-2xl font-bold text-lg text-white transition-all hover:opacity-90 hover:shadow-xl"
            style={{ background: `linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})` }}
          >
            ابدأ الآن ←
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Founding Schools Trust Section ───────────────────────────
function TrustMetrics({ onCTAClick }: { onCTAClick: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [mouse, setMouse] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      setMouse({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  // Floating star particles (4-pointed, like Nibras logo)
  const stars = [
    { top: "8%", right: "12%", size: 14, opacity: 0.35, delay: "0s" },
    { top: "18%", right: "38%", size: 8, opacity: 0.2, delay: "0.8s" },
    { top: "55%", right: "6%", size: 10, opacity: 0.25, delay: "1.4s" },
    { top: "70%", right: "55%", size: 6, opacity: 0.18, delay: "0.4s" },
    { top: "85%", right: "22%", size: 12, opacity: 0.28, delay: "1s" },
    { top: "12%", left: "8%", size: 8, opacity: 0.2, delay: "0.6s" },
    { top: "40%", left: "3%", size: 14, opacity: 0.3, delay: "1.2s" },
    { top: "78%", left: "14%", size: 7, opacity: 0.15, delay: "0.2s" },
  ];

  const FourPointedStar = ({ size, color }: { size: number; color: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2 C12 2 13 8 18 12 C13 12 13 16 12 22 C11 16 11 12 6 12 C11 12 11 8 12 2Z" />
    </svg>
  );

  const bentoCards = [
    {
      id: "large",
      colSpan: "md:col-span-2",
      rowSpan: "md:row-span-2",
      bg: `linear-gradient(145deg, #1e0f3e 0%, ${PURPLE_DARK} 60%, #2d1060 100%)`,
      border: `rgba(124,58,237,0.4)`,
      content: (
        <div className="h-full flex flex-col justify-between p-8">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-5"
              style={{ background: `${PURPLE}40`, color: GOLD_LIGHT, border: `1px solid ${GOLD}30` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
              مُصنوع في مصر، لمصر
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white mb-3 leading-snug">
              مصمم خصيصًا<br />
              <span style={{ color: GOLD }}>للمدارس الخاصة</span>
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
              ليس نظامًا عامًا تم تعديله للمدارس. بل منصة بُنيت من البداية لتناسب الإدارة اليومية داخل المدارس الخاصة المصرية.
            </p>
          </div>
          {/* Mini dashboard illustration */}
          <div
            className="mt-6 rounded-2xl overflow-hidden border"
            style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="flex items-center gap-1.5 px-4 py-2 border-b"
              style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(255,255,255,0.06)" }}
            >
              <div className="w-2 h-2 rounded-full bg-red-400 opacity-60" />
              <div className="w-2 h-2 rounded-full bg-yellow-400 opacity-60" />
              <div className="w-2 h-2 rounded-full bg-green-400 opacity-60" />
              <div className="flex-1 text-center text-[10px]" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>nibras.edu.eg</div>
            </div>
            <div className="p-4 flex gap-3">
              <div className="flex flex-col gap-2 flex-1">
                {[
                  { w: "100%", c: PURPLE },
                  { w: "75%", c: GOLD },
                  { w: "90%", c: "#10b981" },
                  { w: "60%", c: "#3b82f6" },
                ].map((bar, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-2 rounded-full opacity-70" style={{ width: bar.w, background: bar.c }} />
                    <div className="text-[9px] shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>{[94, 87, 72, 61][i]}%</div>
                  </div>
                ))}
              </div>
              <div
                className="rounded-xl flex items-center justify-center w-16 shrink-0"
                style={{ background: `${PURPLE}30` }}
              >
                <BarChart3 size={22} style={{ color: GOLD }} />
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "cloud",
      colSpan: "md:col-span-1",
      rowSpan: "",
      bg: `linear-gradient(135deg, #f8f6ff 0%, #ede9fe 100%)`,
      border: `rgba(124,58,237,0.15)`,
      content: (
        <div className="p-7 h-full flex flex-col justify-between">
          <div>
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: `${PURPLE}15`, color: PURPLE }}
            >
              <Globe size={22} />
            </div>
            <h3 className="font-black text-xl mb-2" style={{ color: "#1e0f3e" }}>سحابي بالكامل</h3>
            <p className="text-sm leading-relaxed" style={{ color: "#6b5c8a" }}>
              اعمل من أي مكان. لا سيرفرات. لا تثبيت. لا صيانة داخلية.
            </p>
          </div>
          <div className="flex gap-1.5 mt-4 flex-wrap">
            {["موبايل", "كمبيوتر", "تابلت"].map(d => (
              <span
                key={d}
                className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                style={{ background: `${PURPLE}12`, color: PURPLE }}
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "xp",
      colSpan: "md:col-span-1",
      rowSpan: "",
      bg: `linear-gradient(135deg, #fff9e6 0%, #fef3c7 100%)`,
      border: `rgba(240,180,41,0.25)`,
      content: (
        <div className="p-7 h-full flex flex-col justify-between">
          <div>
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: `${GOLD}20`, color: "#92400e" }}
            >
              <Award size={22} />
            </div>
            <h3 className="font-black text-xl mb-2" style={{ color: "#1e0f3e" }}>خبرة عملية</h3>
            <p className="text-sm leading-relaxed" style={{ color: "#6b5c8a" }}>
              فريق نبراس يمتلك خبرة في تصميم أنظمة ERP وSaaS مع دراسة عميقة لرحلة المستخدم داخل المدارس.
            </p>
          </div>
          <div className="flex items-end gap-1 mt-4 h-8">
            {[40, 55, 48, 70, 65, 80, 75, 90, 85, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{ height: `${h}%`, background: i >= 7 ? GOLD : `${GOLD}40` }}
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "updates",
      colSpan: "md:col-span-1",
      rowSpan: "",
      bg: "#fff",
      border: `rgba(124,58,237,0.1)`,
      content: (
        <div className="p-6 flex flex-col items-start gap-3 h-full">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "#dbeafe", color: "#2563eb" }}
          >
            <Zap size={18} />
          </div>
          <div>
            <h3 className="font-black text-base" style={{ color: "#1e0f3e" }}>تحديثات مستمرة</h3>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "#9ca3af" }}>ميزات جديدة كل شهر مجانًا</p>
          </div>
        </div>
      ),
    },
    {
      id: "security",
      colSpan: "md:col-span-1",
      rowSpan: "",
      bg: "#fff",
      border: `rgba(124,58,237,0.1)`,
      content: (
        <div className="p-6 flex flex-col items-start gap-3 h-full">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "#dcfce7", color: "#16a34a" }}
          >
            <Shield size={18} />
          </div>
          <div>
            <h3 className="font-black text-base" style={{ color: "#1e0f3e" }}>حماية متقدمة</h3>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "#9ca3af" }}>تشفير SSL وخوادم آمنة</p>
          </div>
        </div>
      ),
    },
    {
      id: "roles",
      colSpan: "md:col-span-1",
      rowSpan: "",
      bg: "#fff",
      border: `rgba(124,58,237,0.1)`,
      content: (
        <div className="p-6 flex flex-col items-start gap-3 h-full">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${PURPLE}12`, color: PURPLE }}
          >
            <Settings size={18} />
          </div>
          <div>
            <h3 className="font-black text-base" style={{ color: "#1e0f3e" }}>صلاحيات مرنة</h3>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "#9ca3af" }}>تحكم كامل في كل مستخدم</p>
          </div>
        </div>
      ),
    },
  ];

  const chips = [
    { icon: "🔒", text: "حماية متقدمة للبيانات" },
    { icon: "☁️", text: "منصة سحابية بالكامل" },
    { icon: "⚡", text: "أداء سريع" },
    { icon: "🛟", text: "دعم فني متخصص" },
    { icon: "🔄", text: "تحديثات مجانية" },
    { icon: "👥", text: "صلاحيات متعددة" },
    { icon: "📊", text: "تقارير لحظية" },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative py-28 px-6 md:px-10 overflow-hidden"
      style={{ background: "#ffffff" }}
    >
      {/* Background mesh gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full blur-3xl"
          style={{
            width: 600, height: 600,
            top: "-10%", right: "-5%",
            background: `radial-gradient(circle, ${PURPLE}12 0%, transparent 70%)`,
          }}
        />
        <div
          className="absolute rounded-full blur-3xl"
          style={{
            width: 400, height: 400,
            bottom: "5%", left: "-5%",
            background: `radial-gradient(circle, ${GOLD}18 0%, transparent 70%)`,
          }}
        />
        {/* Mouse-following glow */}
        <div
          className="absolute rounded-full blur-3xl transition-all duration-700 ease-out"
          style={{
            width: 500, height: 500,
            top: `calc(${mouse.y}% - 250px)`,
            left: `calc(${mouse.x}% - 250px)`,
            background: `radial-gradient(circle, ${PURPLE}08 0%, transparent 70%)`,
          }}
        />
        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "128px",
          }}
        />
      </div>

      {/* Floating star particles */}
      {stars.map((s, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            top: s.top, right: (s as any).right, left: (s as any).left,
            opacity: s.opacity,
            animation: `float ${3 + i * 0.4}s ease-in-out infinite alternate`,
            animationDelay: s.delay,
          }}
        >
          <FourPointedStar size={s.size} color={GOLD} />
        </div>
      ))}

      <style>{`
        @keyframes float { from { transform: translateY(0px) rotate(0deg); } to { transform: translateY(-8px) rotate(15deg); } }
        @keyframes shimmer { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
        @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 20px ${GOLD}40; } 50% { box-shadow: 0 0 40px ${GOLD}80, 0 0 60px ${GOLD}40; } }
      `}</style>

      <div className="relative z-10 max-w-7xl mx-auto">

        {/* Top badge */}
        <div className="flex flex-col items-center text-center mb-14">
          <div
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-bold mb-3 border"
            style={{
              background: `linear-gradient(135deg, ${GOLD}18, ${GOLD}08)`,
              borderColor: `${GOLD}40`,
              color: "#92400e",
              backdropFilter: "blur(12px)",
              boxShadow: `0 4px 24px ${GOLD}25`,
            }}
          >
            <span style={{ animation: "shimmer 2s ease-in-out infinite", color: GOLD }}>✨</span>
            دعوة حصرية لأول 20 مدرسة خاصة في مصر
          </div>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#9ca3af", letterSpacing: "0.15em" }}>
            الإطلاق الرسمي يقترب
          </p>
        </div>

        {/* Main title */}
        <div className="text-center mb-16 max-w-4xl mx-auto">
          <h2
            className="text-4xl md:text-6xl font-black mb-6"
            style={{ lineHeight: 1.25, color: "#1e0f3e" }}
          >
            كن من أوائل المدارس التي تشارك في{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${PURPLE}, ${GOLD})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              صناعة مستقبل الإدارة المدرسية
            </span>
          </h2>
          <p className="text-lg md:text-xl leading-relaxed" style={{ color: "#6b5c8a" }}>
            صمم نبراس بعد دراسة حقيقية لاحتياجات المدارس الخاصة في مصر، ويُفتح اليوم باب الانضمام لعدد محدود من المدارس قبل الإطلاق الرسمي.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 auto-rows-auto">
          {/* Large card - col-span-2, row-span-2 */}
          <div
            className="md:col-span-2 md:row-span-2 rounded-3xl overflow-hidden border group transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl cursor-default"
            style={{
              background: bentoCards[0].bg,
              borderColor: bentoCards[0].border,
              minHeight: 280,
            }}
          >
            {bentoCards[0].content}
          </div>

          {/* Cloud card */}
          <div
            className="rounded-3xl overflow-hidden border group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-default"
            style={{ background: bentoCards[1].bg, borderColor: bentoCards[1].border }}
          >
            {bentoCards[1].content}
          </div>

          {/* XP card */}
          <div
            className="rounded-3xl overflow-hidden border group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-default"
            style={{ background: bentoCards[2].bg, borderColor: bentoCards[2].border }}
          >
            {bentoCards[2].content}
          </div>

          {/* 3 small cards */}
          {bentoCards.slice(3).map((card) => (
            <div
              key={card.id}
              className="rounded-3xl overflow-hidden border group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-default"
              style={{
                background: card.bg,
                borderColor: card.border,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              {card.content}
            </div>
          ))}
        </div>

        {/* Founding Schools Panel */}
        <div
          className="relative rounded-3xl overflow-hidden border mb-12"
          style={{
            background: `linear-gradient(135deg, #0f0620 0%, #1e0f3e 40%, ${PURPLE_DARK} 80%, #2d1060 100%)`,
            borderColor: `${PURPLE}40`,
            boxShadow: `0 0 0 1px ${PURPLE}20, 0 32px 80px ${PURPLE}30`,
          }}
        >
          {/* Inner glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 20% 50%, ${GOLD}12 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, ${PURPLE}20 0%, transparent 50%)`,
            }}
          />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12 p-8 md:p-12">
            {/* Left: Shield with logo */}
            <div className="shrink-0 flex items-center justify-center">
              <div className="relative" style={{ animation: "pulse-glow 3s ease-in-out infinite" }}>
                {/* Outer glow rings */}
                <div
                  className="absolute inset-0 rounded-full blur-2xl"
                  style={{ background: `${GOLD}30`, transform: "scale(1.4)" }}
                />
                <div
                  className="absolute inset-0 rounded-full blur-xl"
                  style={{ background: `${GOLD}20`, transform: "scale(1.2)" }}
                />
                {/* Shield SVG */}
                <div className="relative w-32 h-36 md:w-40 md:h-44 flex items-center justify-center">
                  <svg
                    viewBox="0 0 160 180"
                    className="absolute inset-0 w-full h-full"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={GOLD} stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#d97706" stopOpacity="0.7" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M80 8 L148 36 L148 96 C148 132 80 172 80 172 C80 172 12 132 12 96 L12 36 Z"
                      fill="url(#shieldGrad)"
                      opacity="0.15"
                      stroke={GOLD}
                      strokeWidth="1.5"
                      strokeOpacity="0.6"
                    />
                    <path
                      d="M80 22 L136 46 L136 96 C136 124 80 158 80 158 C80 158 24 124 24 96 L24 46 Z"
                      fill={GOLD}
                      opacity="0.08"
                    />
                  </svg>
                  <div
                    className="relative z-10 rounded-2xl p-3 flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.95)", boxShadow: `0 4px 24px ${GOLD}40` }}
                  >
                    <ImageWithFallback
                      src={nibrasLogo}
                      alt="شعار نبراس"
                      className="h-16 md:h-20 w-auto object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Content */}
            <div className="flex-1 text-right">
              <div className="mb-4">
                <h3 className="text-2xl md:text-3xl font-black text-white mb-2">
                  🚀 برنامج المدارس المؤسسة
                </h3>
                <p style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.8 }}>
                  فرصة محدودة للمشاركة في إطلاق نبراس قبل الإطلاق الرسمي.
                </p>
              </div>

              {/* Feature chips */}
              <div className="flex flex-wrap gap-2 mb-6">
                {[
                  { text: "أسعار تأسيسية", icon: "💎" },
                  { text: "تدريب مجاني", icon: "🎓" },
                  { text: "أولوية الإعداد", icon: "⚡" },
                  { text: "أولوية الدعم", icon: "🛟" },
                  { text: "التأثير على تطوير المنتج", icon: "🔧" },
                  { text: "اجتماعات مع فريق التطوير", icon: "🤝" },
                ].map(chip => (
                  <div
                    key={chip.text}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      borderColor: "rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.8)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <span>{chip.icon}</span>
                    {chip.text}
                  </div>
                ))}
              </div>

              {/* Glowing divider */}
              <div
                className="w-full h-px mb-5"
                style={{
                  background: `linear-gradient(90deg, transparent, ${GOLD}60, transparent)`,
                  boxShadow: `0 0 8px ${GOLD}40`,
                }}
              />

              {/* Warning banner */}
              <div
                className="flex items-center gap-3 px-5 py-3.5 rounded-2xl border"
                style={{
                  background: `${GOLD}15`,
                  borderColor: `${GOLD}30`,
                  backdropFilter: "blur(8px)",
                }}
              >
                <span className="text-xl shrink-0">⚠️</span>
                <p className="text-sm font-semibold" style={{ color: GOLD_LIGHT }}>
                  سيتم إغلاق باب الانضمام بمجرد اكتمال أول 20 مدرسة.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="flex flex-col items-center gap-3 mb-14">
          <button
            onClick={onCTAClick}
            className="group px-10 py-5 rounded-2xl font-black text-xl text-white transition-all duration-300 hover:-translate-y-1"
            style={{
              background: `linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})`,
              boxShadow: `0 8px 32px ${PURPLE}50`,
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = `0 16px 48px ${PURPLE}70`)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${PURPLE}50`)}
          >
            أرغب في الانضمام إلى المدارس المؤسسة ←
          </button>
          <p className="text-sm" style={{ color: "#9ca3af" }}>
            الانضمام مجاني حالياً ويتم التواصل معكم لتقديم عرض توضيحي.
          </p>
        </div>

        {/* Bottom trust bar — glass chips */}
        <div className="flex flex-wrap justify-center gap-3">
          {chips.map(chip => (
            <div
              key={chip.text}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:-translate-y-0.5 duration-200"
              style={{
                background: "rgba(255,255,255,0.7)",
                borderColor: `${PURPLE}15`,
                color: "#4b3a6e",
                backdropFilter: "blur(12px)",
                boxShadow: "0 2px 8px rgba(124,58,237,0.06)",
              }}
            >
              <span>{chip.icon}</span>
              {chip.text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ────────────────────────────────────────────────────────
function FAQ() {
  const faqs = [
    {
      q: "هل يصعب تطبيق نبراس في مدرستنا؟",
      a: "لا على الإطلاق. فريق نبراس يتولى كل شيء — إعداد النظام، إدخال البيانات، وتدريب فريقك. في أقل من أسبوعين مدرستك تعمل بالكامل على النظام الجديد.",
    },
    {
      q: "كم يستغرق وقت التطبيق والإعداد؟",
      a: "من توقيع الاتفاقية حتى الإطلاق الفعلي لا يزيد عن 10-14 يوم عمل. نعمل معك خطوة بخطوة لضمان انطلاق سلس.",
    },
    {
      q: "هل يحتاج فريق مدرستنا تدريبًا خاصًا؟",
      a: "نبراس مصمم ليكون بسيطًا وبديهيًا. نقدم جلسات تدريبية مباشرة للمديرين والمعلمين، وتوفير دعم مستمر بعد الإطلاق.",
    },
    {
      q: "هل بيانات مدرستنا آمنة؟",
      a: "الأمان أولويتنا القصوى. نستخدم تشفير SSL وخوادم سحابية معتمدة. بياناتك خاصة بك ولا يمكن لأي طرف ثالث الوصول إليها.",
    },
    {
      q: "هل النظام سحابي أم يحتاج تركيب؟",
      a: "نبراس سحابي بالكامل. لا تحتاج أي تركيبات أو أجهزة خاصة. يعمل من أي متصفح وعلى أي جهاز — كمبيوتر، تابلت، أو موبايل.",
    },
    {
      q: "ما هو نوع الدعم الفني المتاح؟",
      a: "نوفر دعم فني مخصص عبر الهاتف والواتساب والبريد الإلكتروني. فريق الدعم متاح خلال أوقات العمل مع استجابة سريعة لأي مشكلة.",
    },
    {
      q: "هل يمكن نقل بيانات مدرستنا الحالية إلى نبراس؟",
      a: "نعم، فريقنا يتولى استيراد بياناتك الحالية من Excel أو أي نظام آخر. لا تفقد أي بيانات في عملية الانتقال.",
    },
  ];

  const [open, setOpen] = useState<string | undefined>(undefined);

  return (
    <section id="faq" className="py-24 px-6 md:px-10" style={{ background: "#f8f6ff" }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-5xl font-black mb-4" style={{ color: "#1e0f3e" }}>
            أسئلة <span style={{ color: PURPLE }}>شائعة</span>
          </h2>
          <p className="text-lg" style={{ color: "#6b5c8a" }}>
            إجابات على أكثر الأسئلة التي يسألها مديرو المدارس.
          </p>
        </div>

        <AccordionPrimitive.Root
          type="single"
          collapsible
          value={open}
          onValueChange={setOpen}
          className="flex flex-col gap-3"
        >
          {faqs.map((faq, i) => (
            <AccordionPrimitive.Item
              key={i}
              value={String(i)}
              className="rounded-2xl border overflow-hidden transition-all"
              style={{
                borderColor: open === String(i) ? `${PURPLE}30` : "rgba(124,58,237,0.1)",
                background: "#fff",
              }}
            >
              <AccordionPrimitive.Trigger
                className="w-full flex items-center justify-between p-6 text-right gap-4 font-bold text-base transition-colors"
                style={{ color: "#1e0f3e" }}
              >
                <span className="text-right flex-1">{faq.q}</span>
                <ChevronDown
                  size={18}
                  className="shrink-0 transition-transform duration-200"
                  style={{
                    color: PURPLE,
                    transform: open === String(i) ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </AccordionPrimitive.Trigger>
              <AccordionPrimitive.Content
                className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up"
              >
                <p
                  className="px-6 pb-6 text-sm leading-relaxed"
                  style={{ color: "#6b5c8a" }}
                >
                  {faq.a}
                </p>
              </AccordionPrimitive.Content>
            </AccordionPrimitive.Item>
          ))}
        </AccordionPrimitive.Root>
      </div>
    </section>
  );
}

// ─── Lead Form Section ─────────────────────────────────────────
function LeadSection({ onCTAClick }: { onCTAClick: () => void }) {
  return (
    <section className="py-24 px-6 md:px-10" style={{ background: "#fff" }}>
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${PURPLE_DARK} 0%, ${PURPLE} 60%, #9f6fec 100%)` }}
        >
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: GOLD }} />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: "#fff" }} />

          <div className="relative z-10">
            <ImageWithFallback
              src={nibrasLogo}
              alt="شعار نبراس"
              className="h-16 w-auto object-contain mx-auto mb-6 brightness-0 invert"
            />
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4" style={{ lineHeight: 1.3 }}>
              ابدأ رحلة التحول الرقمي لمدرستك
            </h2>
            <p
              className="text-lg md:text-xl mb-8 max-w-xl mx-auto"
              style={{ color: "rgba(255,255,255,0.8)", lineHeight: 1.8 }}
            >
              احجز عرضك التوضيحي المجاني الآن. سيتواصل معك مستشار نبراس خلال 24 ساعة.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onCTAClick}
                className="px-10 py-4 rounded-2xl font-black text-lg transition-all hover:shadow-2xl hover:-translate-y-0.5"
                style={{ background: GOLD, color: "#1e0f3e" }}
              >
                أرسل بيانات مدرستك ←
              </button>
              <a
                href="tel:+201234567890"
                className="px-8 py-4 rounded-2xl font-bold text-lg border-2 border-white/30 text-white transition-all hover:bg-white/10 flex items-center justify-center gap-2"
              >
                <Phone size={18} />
                أو اتصل بنا الآن
              </a>
            </div>

            <p className="mt-6 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              🔒 بياناتك آمنة ولن نشاركها مع أي جهة أخرى
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="py-16 px-6 md:px-10 border-t" style={{ background: "#1e0f3e", borderColor: "rgba(124,58,237,0.2)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div
              className="inline-flex items-center justify-center rounded-2xl p-2 mb-4"
              style={{ background: "rgba(255,255,255,0.95)" }}
            >
              <ImageWithFallback
                src={nibrasLogo}
                alt="شعار نبراس"
                className="h-12 w-auto object-contain"
              />
            </div>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
              نبراس — المنصة التعليمية الأولى للمدارس الخاصة في مصر. نحول إدارة مدرستك إلى تجربة رقمية احترافية.
            </p>
            <div className="flex gap-3">
              {[
                { icon: <Facebook size={16} />, href: "#" },
                { icon: <Twitter size={16} />, href: "#" },
                { icon: <Linkedin size={16} />, href: "#" },
              ].map((s, i) => (
                <a
                  key={i}
                  href={s.href}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-white">روابط سريعة</h4>
            <ul className="flex flex-col gap-2">
              {["المميزات", "كيف يعمل", "من يستفيد", "الأسئلة الشائعة", "احجز عرضًا"].map(link => (
                <li key={link}>
                  <a href="#" className="text-sm transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-white">تواصل معنا</h4>
            <ul className="flex flex-col gap-3">
              {[
                { icon: <Phone size={14} />, text: "01234 567 890" },
                { icon: <Mail size={14} />, text: "hello@nibras.edu.eg" },
                { icon: <MapPin size={14} />, text: "القاهرة، مصر" },
              ].map(c => (
                <li key={c.text} className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <span style={{ color: GOLD }}>{c.icon}</span>
                  {c.text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t text-sm"
          style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}
        >
          <p>© {new Date().getFullYear()} نبراس. جميع الحقوق محفوظة.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">سياسة الخصوصية</a>
            <a href="#" className="hover:text-white transition-colors">شروط الاستخدام</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Sticky CTA ────────────────────────────────────────────────
function StickyCTA({ onCTAClick }: { onCTAClick: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500"
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none", transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)` }}
    >
      <button
        onClick={onCTAClick}
        className="flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-white shadow-2xl transition-all hover:opacity-90 hover:scale-105"
        style={{ background: `linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})`, boxShadow: `0 8px 32px ${PURPLE}60` }}
      >
        <span
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: GOLD }}
        />
        احجز عرضك المجاني الآن
      </button>
    </div>
  );
}

// ─── App ────────────────────────────────────────────────────────
export default function App() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div
      dir="rtl"
      lang="ar"
      style={{ fontFamily: "'Cairo', sans-serif" }}
      className="bg-background text-foreground"
    >
      <Navbar onCTAClick={() => setShowModal(true)} />
      <Hero onCTAClick={() => setShowModal(true)} />
      <PainPoints />
      <Comparison onCTAClick={() => setShowModal(true)} />
      <HowItWorks />
      <Screenshots />
      <Features />
      <WhoBenesits />
      <Implementation onCTAClick={() => setShowModal(true)} />
      <TrustMetrics onCTAClick={() => setShowModal(true)} />
      <FAQ />
      <LeadSection onCTAClick={() => setShowModal(true)} />
      <Footer />
      <StickyCTA onCTAClick={() => setShowModal(true)} />

      {showModal && <LeadFormModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
