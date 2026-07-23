import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import nibrasLogo from "@/imports/Profile_Picture.png";
import {
  LayoutDashboard, Users, BookOpen, Calendar, Bell, Settings,
  LogOut, Plus, X, Check, MessageSquare, Megaphone, Award,
  UserCheck, Upload, Eye, Edit, Trash2, Send, Home,
  CheckCircle, Star, TrendingUp, Video, FileText, Search, ChevronRight,
  Building2, PlayCircle, CheckSquare, Clock, Menu, Book, GraduationCap,
  Layers, ClipboardList, BarChart2, UserPlus, Globe, Shield, CreditCard,
  Hash, ChevronLeft, AlertCircle, FileSpreadsheet, ChevronDown,
  Activity, PieChart, Download, MoreHorizontal, Clipboard, Target,
  Zap, Coffee, Languages, LoaderCircle, Inbox, TriangleAlert
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  LineChart, Line, AreaChart, Area, PieChart as RPieChart, Pie, Cell
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
export type Portal = "login" | "super-admin" | "school-admin" | "teacher" | "student" | "parent";

export interface NavItem { id: string; label: string; icon: React.ReactNode; }

export type Language = "en" | "ar";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const ARABIC_TRANSLATIONS: Record<string, string> = {
  "Dashboard": "لوحة التحكم", "Home Page": "الصفحة الرئيسية", "Schools": "المدارس", "Leads": "العملاء المحتملون",
  "Analytics": "التحليلات", "Subscriptions": "الاشتراكات", "Settings": "الإعدادات", "School Settings": "إعدادات المدرسة",
  "Academic Setup": "الإعداد الأكاديمي", "Grades & Classes": "الصفوف والفصول", "Teachers": "المعلمون",
  "Students": "الطلاب", "Timetable": "الجدول الدراسي", "Final Grades": "الدرجات النهائية",
  "Announcements": "الإعلانات", "Messages": "الرسائل", "My Classes": "فصولي", "Tasks & Homework": "المهام والواجبات",
  "Tests & Quizzes": "الاختبارات", "Results": "النتائج", "Attendance": "الحضور", "My Courses": "مقرراتي",
  "Homework": "الواجبات", "My Children": "أبنائي", "Child Progress": "تقدم الابن",
  "Welcome Back!": "مرحبًا بعودتك!", "Welcome back": "مرحبًا بعودتك", "Login to continue": "سجّل الدخول للمتابعة",
  "New User?": "مستخدم جديد؟", "New User ? Sign Up": "مستخدم جديد؟ إنشاء حساب", "Buttons": "الأزرار",
  "Sign Up": "إنشاء حساب", "Email/User ID": "البريد الإلكتروني / اسم المستخدم",
  "Password": "كلمة المرور", "Keep me logged in": "تذكرني", "Forgot password": "نسيت كلمة المرور؟",
  "Log In": "تسجيل الدخول", "Enter registered email or user id": "أدخل البريد المسجل أو اسم المستخدم",
  "Enter password": "أدخل كلمة المرور", "Select your role to continue to your portal": "اختر دورك للمتابعة إلى بوابتك",
  "Enter Portal": "دخول البوابة", "Super Admin": "المسؤول العام", "School Admin": "مسؤول المدرسة",
  "Teacher": "معلم", "Student": "طالب", "Parent": "ولي الأمر", "Log Out": "تسجيل الخروج",
  "Platform Overview": "نظرة عامة على المنصة", "Manage Schools": "إدارة المدارس", "Platform Analytics": "تحليلات المنصة",
  "Platform Settings": "إعدادات المنصة", "Total Schools": "إجمالي المدارس", "Total Teachers": "إجمالي المعلمين",
  "Total Students": "إجمالي الطلاب", "Monthly Revenue": "الإيراد الشهري", "Monthly Growth": "النمو الشهري",
  "Recent Schools": "أحدث المدارس", "Schools by Plan": "المدارس حسب الباقة", "Revenue Overview": "نظرة عامة على الإيرادات",
  "New School": "مدرسة جديدة", "Create School": "إنشاء مدرسة", "Edit School": "تعديل المدرسة",
  "Delete Permanently": "حذف نهائيًا", "Deactivate": "تعطيل", "Confirm Activation": "تأكيد التفعيل",
  "School Name": "اسم المدرسة", "Admin": "المدير", "Admin Name": "اسم المدير", "Admin Email": "بريد المدير الإلكتروني",
  "Phone": "رقم الهاتف", "Address": "العنوان", "Plan": "الباقة", "Status": "الحالة", "Created": "تاريخ الإنشاء",
  "Actions": "الإجراءات", "Search schools…": "البحث عن مدرسة…", "No schools match your search.": "لا توجد مدارس مطابقة للبحث.",
  "All Governorates": "كل المحافظات", "All Types": "كل الأنواع", "Clear filters": "مسح المرشحات",
  "No leads match your filters.": "لا يوجد عملاء محتملون مطابقون للمرشحات.", "Create Plan": "إنشاء باقة",
  "Save Changes": "حفظ التغييرات", "Save Settings": "حفظ الإعدادات", "Cancel": "إلغاء", "Confirm": "تأكيد",
  "Delete": "حذف", "Active": "نشط", "Inactive": "غير نشط", "active": "نشط", "inactive": "غير نشط",
  "School Information": "معلومات المدرسة", "Academic Year": "العام الدراسي", "Grade Levels": "المراحل الدراسية",
  "Subjects": "المواد الدراسية", "Classes": "الفصول", "Configure Working Days": "إعداد أيام العمل",
  "Time Slots & Breaks": "الحصص وفترات الاستراحة", "Semesters": "الفصول الدراسية", "Add Semester": "إضافة فصل دراسي",
  "Add Slot": "إضافة حصة", "New Time Slot": "حصة جديدة", "Save Working Days": "حفظ أيام العمل",
  "Add Teacher": "إضافة معلم", "Add Student": "إضافة طالب", "Add Subject": "إضافة مادة", "Assign": "تعيين",
  "Assign Subjects": "تعيين المواد", "Assign Class Teacher": "تعيين معلم الفصل", "Assigned Teachers": "المعلمون المعيّنون",
  "Employment Info": "بيانات الوظيفة", "Import CSV": "استيراد ملف بيانات", "Export CSV": "تصدير ملف بيانات",
  "Export PDF": "تصدير مستند", "Publish Timetable": "نشر الجدول", "Auto Generate": "إنشاء تلقائي",
  "Quick Actions": "إجراءات سريعة", "Recent Activity": "النشاط الأخير", "Recent Announcements": "أحدث الإعلانات",
  "Recent Assignments": "أحدث التكليفات", "New Announcement": "إعلان جديد", "Publish Announcement": "نشر الإعلان",
  "Message": "رسالة", "Send": "إرسال", "Send Message": "إرسال رسالة", "View": "عرض", "View all": "عرض الكل",
  "View Plan": "عرض الباقة", "Current Plan": "الباقة الحالية", "Edit / Upgrade Plan": "تعديل / ترقية الباقة",
  "Subscription": "الاشتراك", "Usage": "الاستخدام", "Next Renewal": "التجديد القادم", "Max Students": "الحد الأقصى للطلاب",
  "Lessons": "الدروس", "Lesson": "درس", "Lesson Details": "تفاصيل الدرس", "Lesson Name": "اسم الدرس",
  "Add Lesson": "إضافة درس", "Video Lesson": "درس فيديو", "Upload Image": "رفع صورة", "Upload PDF": "رفع PDF",
  "Upload PDF file": "رفع ملف مستند", "Download": "تنزيل", "PDF Document": "مستند",
  "Homework Grades": "درجات الواجبات", "Student Submissions": "تسليمات الطلاب", "Submission Overview": "ملخص التسليمات",
  "Create Test": "إنشاء اختبار", "Test Results": "نتائج الاختبار", "Monthly Tests": "الاختبارات الشهرية",
  "Top Students": "أفضل الطلاب", "Top Performing Students": "الطلاب المتفوقون", "Class Progress": "تقدم الفصل",
  "Workload": "عبء العمل", "Upcoming Activities": "الأنشطة القادمة", "Published": "منشور", "Submitted": "تم التسليم",
  "Completed": "مكتمل", "Overdue": "متأخر", "Missing": "مفقود", "Online": "متصل", "Available": "متاح",
  "Break": "استراحة", "Time": "الوقت", "Previous": "السابق", "Next": "التالي", "Back to Tests": "العودة للاختبارات",
  "Submit Homework": "تسليم الواجب", "Submit Test": "تسليم الاختبار", "Homework Submitted!": "تم تسليم الواجب!",
  "Test Submitted!": "تم تسليم الاختبار!", "Your Score": "درجتك", "Message Teacher": "مراسلة المعلم",
  "Select a conversation": "اختر محادثة", "Select a teacher to message": "اختر معلمًا للمراسلة",
  "or start a new conversation": "أو ابدأ محادثة جديدة", "No lessons yet": "لا توجد دروس بعد",
  "No homework assigned yet": "لا توجد واجبات مسندة بعد", "No tasks assigned yet": "لا توجد مهام مسندة بعد",
  "No tests found for the selected filters": "لا توجد اختبارات وفق المرشحات المختارة",
  "Basic": "أساسية", "Standard": "قياسية", "Premium": "مميزة", "Private": "خاصة",
  "International": "دولية", "National": "وطنية", "New": "جديد", "Contacted": "تم التواصل",
  "Converted": "تم التحويل", "All": "الكل", "Parents": "أولياء الأمور",
  "Select…": "اختر…", "Search": "بحث", "Email": "البريد الإلكتروني", "Name": "الاسم",
  "Final Results": "النتائج النهائية", "Monthly Test": "الاختبار الشهري", "My Students": "طلابي", "Time Table": "الجدول الدراسي",
  "Ticketing System": "نظام الدعم", "School Dashboard": "لوحة تحكم المدرسة", "My Dashboard": "لوحتي", "School Administrator": "مدير المدرسة",
  "Mathematics Teacher": "معلم الرياضيات", "Add Homework": "إضافة واجب", "Add Task": "إضافة مهمة",
  "Create Homework": "إنشاء واجب", "Create Task": "إنشاء مهمة", "Review answers": "مراجعة الإجابات", "Submit homework": "تسليم الواجب",
  "Submit test": "تسليم الاختبار", "Back to edit": "العودة للتعديل", "Answered": "تمت الإجابة",
  "View grades": "عرض الدرجات",
  "Final Grade": "الدرجة النهائية", "Student Name": "اسم الطالب", "Max Score": "الدرجة الكلية",
  "Homework Assignments": "واجبات الدرس", "Tasks": "المهام", "Watch lesson video": "مشاهدة فيديو الدرس", "Class activity and participation": "نشاط الفصل ومشاركة الطلاب",
  "Add lesson": "إضافة درس", "Active items": "العناصر النشطة", "Archived items": "العناصر المؤرشفة",
  "Edit Lesson": "تعديل الدرس", "Edit Homework": "تعديل الواجب", "Edit Task": "تعديل المهمة", "Delete item": "حذف العنصر", "Archive item": "أرشفة العنصر",
  "Changes saved successfully": "تم حفظ التعديلات بنجاح", "Item deleted successfully": "تم حذف العنصر بنجاح", "Item archived. You can view it from archived items.": "تمت أرشفة العنصر. يمكنك عرضه من العناصر المؤرشفة.",
  "Publish Homework": "نشر واجب", "Publish Task": "نشر مهمة", "Publish Test": "نشر اختبار", "Question Type": "نوع السؤال", "Multiple Choice (MCQ)": "اختيار من متعدد", "True / False": "صح / خطأ",
  "Question": "السؤال", "Options": "الاختيارات", "Correct Answer": "الإجابة الصحيحة", "Deadline Date": "تاريخ التسليم", "Choose a CSV file": "اختر ملف CSV",
  "Match CSV columns": "مطابقة أعمدة CSV", "Validate & Import": "تحقق واستورد", "Rows needing attention": "صفوف تحتاج إلى مراجعة", "Nothing is saved until you confirm.": "لن يتم حفظ أي بيانات حتى تؤكد الاستيراد.",
  "Manage lessons, homework and student progress": "إدارة الدروس والواجبات وتقدم الطلاب", "Total Classes": "إجمالي الفصول", "Total Lessons": "إجمالي الدروس", "Homework Set": "الواجبات المسندة",
  "View Class": "عرض الفصل", "Latest:": "الأحدث:", "View Grades": "عرض الدرجات", "Assigned": "مُسند", "Pending": "قيد الانتظار", "Lesson Content": "محتوى الدرس",
  "Video Link": "رابط الفيديو", "PDF Materials": "مواد مستندية", "PDF up to 50MB": "مستند حتى 50 ميجابايت", "Choose File": "اختر ملفًا", "Uploaded": "تم الرفع",
  "Due:": "موعد التسليم:", "question": "سؤال", "questions": "أسئلة",
  "Create": "إنشاء", "All Results": "كل النتائج", "Subject": "المادة", "Type": "النوع",
  "Mathematics": "الرياضيات", "English": "اللغة الإنجليزية", "Physics": "الفيزياء", "Chemistry": "الكيمياء", "Biology": "الأحياء", "April": "أبريل", "May": "مايو",
  "Manage all schools and platform operations": "إدارة جميع المدارس وعمليات المنصة", "Manage your school, staff, and academics": "إدارة المدرسة والموظفين والشؤون الأكاديمية", "Create lessons, homework, and track students": "إنشاء الدروس والواجبات ومتابعة الطلاب", "Access courses, complete homework and tests": "الوصول للمقررات وإنجاز الواجبات والاختبارات", "Monitor your child's progress and grades": "متابعة تقدم الابن ودرجاته",
};

const ARABIC_WORDS: Record<string, string> = {
  Add: "إضافة", Create: "إنشاء", Edit: "تعديل", Save: "حفظ", View: "عرض", School: "مدرسة", Delete: "حذف", Archive: "أرشفة", Title: "العنوان", Manage: "إدارة", Progress: "تقدم", Total: "إجمالي", Set: "مسند", Latest: "الأحدث",
  Student: "طالب", Teacher: "معلم", Class: "فصل", Subject: "مادة", Course: "مقرر", Test: "اختبار", Lessons: "دروس", Track: "متابعة", Staff: "الموظفون", Operations: "العمليات",
  Homework: "واجب", Assignment: "تكليف", Grade: "درجة", Results: "نتائج", Report: "تقرير",
  Monthly: "شهري", Weekly: "أسبوعي", Daily: "يومي", Current: "الحالي", Plan: "باقة",
  Settings: "إعدادات", Information: "معلومات", Performance: "أداء", Attendance: "حضور",
  Messages: "رسائل", Announcement: "إعلان", Published: "منشور", Draft: "مسودة", Open: "مفتوح",
  Scheduled: "مجدول", Question: "سؤال", Answer: "إجابة", Correct: "صحيح", Options: "خيارات",
  Content: "محتوى", Deadline: "موعد", Date: "تاريخ", Features: "المميزات", Students: "طلاب", Archived: "مؤرشف", Items: "عناصر", Import: "استيراد", Export: "تصدير",
  Teachers: "معلمين", Schools: "مدارس", Active: "نشط", Inactive: "غير نشط",
  A: "أ", B: "ب", C: "ج", D: "د", E: "هـ", F: "و", JA: "ج أ", AA: "أ أ", AI: "أ إ", DO: "د أ", KH: "ك ح", MA: "م أ", MF: "م ف", MO: "م أ", ME: "م ع", MT: "م ت", DC: "د ش", DT: "د ت",
  Nibras: "نبراس", Mrs: "السيدة", Mr: "السيد", Dr: "دكتور", Fatima: "فاطمة", Bello: "بيلو", Joshua: "جوشوا", Ashiru: "أشيرو", Adeiola: "أديولا", Adewunyi: "أديوني", Ayo: "أيو", Ige: "إيجي", Damilola: "داميلولا", Obi: "أوبي", Mayowa: "مايووا", Hassan: "حسن", Kemi: "كيمي", Ade: "أدي", Dawori: "داوري", Tabi: "تابي", Okafor: "أوكافور", Adeyemi: "أدييمي", Amina: "أمينة", Chidi: "تشيدي", Emeka: "إميكا", Nwosu: "نووسو", Osei: "أوسي", Suleiman: "سليمان", Tunde: "توندي",
  All: "الكل", Academic: "أكاديمي", Annual: "سنوي", Apr: "أبريل", April: "أبريل", August: "أغسطس", December: "ديسمبر", February: "فبراير", January: "يناير", July: "يوليو", June: "يونيو", March: "مارس", May: "مايو", November: "نوفمبر", October: "أكتوبر", September: "سبتمبر", Months: "أشهر", Monday: "الاثنين", Tuesday: "الثلاثاء", Wednesday: "الأربعاء", Thursday: "الخميس", Friday: "الجمعة",
  Arabic: "العربية", English: "الإنجليزية", Language: "اللغة", Mathematics: "الرياضيات", Science: "العلوم", Sports: "الرياضة", Physics: "الفيزياء", Chemistry: "الكيمياء", Biology: "الأحياء", Exam: "اختبار", Assessment: "تقييم", Comprehension: "فهم", Cumulative: "تراكمي", Distinctions: "تميز", Rank: "ترتيب", Score: "درجة", Average: "متوسط", Final: "نهائي", Done: "مكتمل", GPA: "المعدل", HW: "واجب", PDF: "مستند", CSV: "بيانات", MCQ: "اختيار متعدد", mins: "دقيقة", pts: "نقطة", Hours: "ساعات",
  Courses: "المقررات", Lesson: "درس", lessons: "دروس", classes: "فصول", subjects: "مواد", tasks: "مهام", Parents: "أولياء الأمور", Parent: "ولي الأمر", Guardian: "الوصي", Form: "نموذج", image: "صورة", jpg: "صورة", files: "ملفات", file: "ملف", attached: "مرفق", imagejpg: "صورة",
  Conference: "مؤتمر", Equipment: "معدات", Examinations: "امتحانات", Lab: "معمل", Schedule: "جدول", Day: "يوم", Mid: "منتصف", term: "الفصل", New: "جديد", Start: "ابدأ", Publish: "نشر", Keep: "احتفظ", Make: "أنشئ", Meeting: "اجتماع", Reply: "رد", See: "عرض", Send: "إرسال", Select: "اختر", Good: "جيد", Hi: "مرحبًا", Please: "من فضلك", Remember: "تذكر", Can: "يمكن", You: "أنت", your: "الخاص بك", you: "أنت", my: "خاصتي", me: "أنا", ma: "مدام", am: "صباحًا", are: "هم", about: "عن", all: "الكل", and: "و", ask: "اسأل", asks: "يسأل", assist: "مساعدة", be: "يكون", by: "بواسطة", commence: "تبدأ", committee: "لجنة", complaint: "شكوى", completion: "إكمال", conference: "مؤتمر", day: "يوم", doing: "تفعل", early: "مبكرًا", encouraged: "مُشجَّعون", equipment: "معدات", events: "فعاليات", examinations: "امتحانات", explain: "اشرح", find: "اعثر", first: "الأول", for: "لـ", gave: "أعطيت", great: "رائع", has: "لديه", held: "أقيم", in: "في", inventory: "مخزون", isolate: "اعزل", knowledge: "معرفة", laboratory: "المعمل", like: "مثل", math: "الرياضيات", message: "رسالة", method: "طريقة", middle: "منتصف", minutes: "دقائق", morning: "صباح", new: "جديد", notes: "ملاحظات", of: "من", on: "في", or: "أو", out: "خارج", pm: "مساءً", points: "نقاط", preferred: "مفضَّل", procured: "تم توفيره", register: "سجّل", required: "مطلوب", review: "راجع", room: "غرفة", science: "العلوم", should: "ينبغي", solve: "حل", spreading: "نشر", start: "ابدأ", submission: "تسليم", submitted: "تم التسليم", tests: "اختبارات", the: "ال", their: "خاصتهم", this: "هذا", to: "إلى", using: "باستخدام", variable: "متغير", wanted: "أراد", week: "أسبوع", with: "مع", work: "عمل", would: "سوف", yesterday: "أمس", advance: "مسبقًا",
  cla: "فصل", evening: "مساء", Cosine: "جيب التمام", Functions: "دوال", Quadratic: "تربيعية", Rules: "قواعد", Sine: "جيب", Adeoila: "أديولا", Result: "نتيجة", Submitted: "تم التسليم", Tests: "اختبارات", Year: "سنة", The: "ال", will: "سوف", Message: "رسالة", Points: "نقاط", substitution: "التعويض",
  SA: "م ع", API: "واجهة برمجة", LMS: "إدارة التعلم", Academy: "أكاديمية", Administrator: "مدير المنصة", Advanced: "متقدم", Analytics: "تحليلات", Basic: "أساسي", Bright: "مشرق", Chukwu: "تشوكوو", College: "كلية", Core: "أساسي", Custom: "مخصص", Futures: "المستقبل", Greenfield: "جرينفيلد", Heritage: "التراث", High: "الثانوية", International: "دولي", Jan: "يناير", Feb: "فبراير", Jun: "يونيو", Jul: "يوليو", Mar: "مارس", Pinnacle: "القمة", Platform: "المنصة", Prof: "أستاذ", Sunridge: "صن ريدج", Standard: "قياسي", Renewal: "تجديد", Priority: "أولوية", Plans: "باقات", Max: "أقصى", Email: "البريد", Support: "الدعم", Up: "حتى", access: "وصول", branding: "هوية", builder: "منشئ", dashboard: "لوحة التحكم", mo: "شهريًا", plans: "باقات", portal: "بوابة", reports: "تقارير", subscribed: "مشترك", support: "دعم", per: "لكل",
  Ahmed: "أحمد", Alexandria: "الإسكندرية", Al: "ال", Iman: "إيمان", Nour: "نور", Assiut: "أسيوط", Ave: "شارع", Cairo: "القاهرة", Contact: "اتصال", Corniche: "الكورنيش", Dakahlia: "الدقهلية", Dalia: "داليا", Dar: "دار", Elm: "العلم", Geish: "الجيش", Nasr: "النصر", Zahraa: "الزهراء", Farouk: "فاروق", Future: "المستقبل", Gamal: "جمال", Gharbia: "الغربية", Giza: "الجيزة", Governorate: "محافظة", Hanan: "حنان", Horizon: "الأفق", Hurghada: "الغردقة", Ibrahim: "إبراهيم", Ismailia: "الإسماعيلية", Kamel: "كامل", Khalid: "خالد", Knowledge: "المعرفة", Leads: "عملاء محتملون", Lotfy: "لطفي", Mansour: "منصور", Mansoura: "المنصورة", Minds: "عقول", Modern: "حديث", Mona: "منى", Nabil: "نبيل", National: "وطني", Nile: "النيل", Owner: "المالك", Pioneers: "رواد", Port: "بورسعيد", Ramsis: "رمسيس", Rania: "رانيا", Rashid: "رشيد", Rd: "طريق", Red: "الأحمر", Said: "سعيد", Saleh: "صالح", Salem: "سالم", Samar: "سمر", Sea: "البحر", Sherif: "شريف", Showing: "عرض", St: "شارع", Stars: "نجوم", Suez: "السويس", Tahrir: "التحرير", Tanta: "طنطا", Tawfik: "توفيق", Tourism: "السياحة", University: "الجامعة", Valley: "الوادي", Youssef: "يوسف", leads: "عملاء محتملون",
  Dashboard: "لوحة التحكم", Improvement: "تحسن", Overall: "إجمالي", Trend: "اتجاه", Completed: "مكتمل", Taken: "تم أداؤه", wise: "حسب المادة", Absent: "غائب", Present: "حاضر", Rate: "معدل", days: "أيام", Summary: "ملخص",
  month: "شهر", Okonkwo: "أوكونكو", El: "ال", Messaging: "المراسلات", Name: "الاسم",
Enrolment: "التسجيل", enrolment: "التسجيل", Enrollment: "التسجيل", enrollment: "التسجيل", grade: "درجة", Grades: "الدرجات", grades: "الدرجات", Semester: "الفصل الدراسي", semester: "الفصل الدراسي", Semesters: "الفصول الدراسية", semesters: "الفصول الدراسية", subject: "المادة", Subjects: "المواد الدراسية",
};

Object.assign(ARABIC_TRANSLATIONS, {
  "Across all schools": "في جميع المدارس",
  "Converted Leads": "العملاء المحتملون المحولون",
  "Subscription Plans": "باقات الاشتراك",
  "Loading data...": "جارٍ تحميل البيانات...",
  "Loading data…": "جارٍ تحميل البيانات...",
  "Loading platform overview...": "جارٍ تحميل نظرة عامة على المنصة...",
  "Loading platform overview…": "جارٍ تحميل نظرة عامة على المنصة...",
  "Loading school administration data...": "جارٍ تحميل بيانات إدارة المدرسة...",
  "Connecting your student portal...": "جارٍ تجهيز بوابة الطالب...",
  "Loading your student data from Supabase...": "جارٍ تحميل بيانات الطالب من سوبابيس...",
  "Connecting your parent portal...": "جارٍ تجهيز بوابة ولي الأمر...",
  "Loading your parent portal from Supabase...": "جارٍ تحميل بيانات بوابة ولي الأمر من سوبابيس...",
  "Connecting to your workspace": "جارٍ ربط مساحة العمل الخاصة بك",
  "Fetching your account, school context, and role permissions.": "جارٍ جلب حسابك وسياق المدرسة وصلاحيات الدور.",
});

Object.assign(ARABIC_TRANSLATIONS, {
  "Activate School": "تفعيل المدرسة",
  "Deactivate School": "تعطيل المدرسة",
  "Delete School": "حذف المدرسة",
  "Contact Lead": "التواصل مع العميل المحتمل",
  "Edit Plan": "تعديل الباقة",
  "Create New Plan": "إنشاء باقة جديدة",
  "Request account access": "طلب الوصول إلى الحساب",
  "Reset your password": "إعادة تعيين كلمة المرور",
  "Show access instructions": "عرض تعليمات الوصول",
  "Send reset email": "إرسال بريد إعادة التعيين",
  "This action cannot be undone.": "لا يمكن التراجع عن هذا الإجراء.",
  "You can reactivate at any time.": "يمكنك إعادة التفعيل في أي وقت.",
  "The school admin will be notified by email.": "سيتم إشعار مدير المدرسة عبر البريد الإلكتروني.",
});

Object.assign(ARABIC_TRANSLATIONS, {
  "Active Classes": "الفصول النشطة",
  "Attendance This Week": "الحضور هذا الأسبوع",
  "Enrollment by Class": "التسجيل حسب الفصل",
  "Working Days": "أيام العمل",
  "Time Slots": "الحصص",
  "Academic Years": "الأعوام الدراسية",
  "Grade Structure": "هيكل الصفوف",
  "Post Announcement": "نشر إعلان",
  "Open Timetable": "فتح الجدول الدراسي",
  "Review Final Grades": "مراجعة الدرجات النهائية",
  "Configured in Supabase": "تم الإعداد في النظام",
  "Attendance records will appear here after classes are marked.": "ستظهر سجلات الحضور هنا بعد تسجيل الحضور للفصول.",
  "New lessons, tests, homework, and announcements will appear here.": "ستظهر هنا الدروس والاختبارات والواجبات والإعلانات الجديدة.",
  "No recent messages from Supabase yet.": "لا توجد رسائل حديثة في النظام بعد.",
  "Class averages will appear after students submit homework or tests.": "ستظهر متوسطات الفصول بعد تسليم الطلاب للواجبات أو الاختبارات.",
  "Conversations and teacher contacts from Supabase": "المحادثات وجهات اتصال المعلمين من النظام",
  "No contacts yet": "لا توجد جهات اتصال بعد",
  "Teacher contacts will appear once subjects are assigned to this class.": "ستظهر جهات اتصال المعلمين بعد تعيين المواد لهذا الفصل.",
  "No messages yet": "لا توجد رسائل بعد",
  "Start the conversation and your message will be sent through Supabase.": "ابدأ المحادثة وسيتم إرسال رسالتك عبر النظام.",
  "Type your message": "اكتب رسالتك",
  "Choose a teacher contact to read messages or send a new one.": "اختر جهة اتصال من المعلمين لقراءة الرسائل أو إرسال رسالة جديدة.",
  "No timetable published": "لم يتم نشر الجدول الدراسي بعد",
  "Timetable entries from Supabase will appear here once the school publishes them.": "ستظهر حصص الجدول هنا بعد أن تنشرها المدرسة في النظام.",
  "Start New Conversation": "بدء محادثة جديدة",
  "No conversations yet": "لا توجد محادثات بعد",
  "Messages are synced from Supabase.": "الرسائل متزامنة من النظام.",
  "Select an existing thread or choose a recipient to start a new one.": "اختر محادثة موجودة أو حدد مستلمًا لبدء محادثة جديدة.",
  "No message thread selected": "لم يتم اختيار محادثة",
  "Choose a conversation on the left or start one from the recipient picker.": "اختر محادثة من القائمة الجانبية أو ابدأ محادثة جديدة من اختيار المستلم.",
  "This student account is connected, but there is no active class enrollment yet in Supabase.": "حساب الطالب متصل، ولكن لا يوجد تسجيل نشط في فصل داخل النظام حتى الآن.",
  "No scored submissions yet": "لا توجد تسليمات مصححة بعد",
  "Homework and test scores from Supabase will populate your progress trend.": "ستظهر درجات الواجبات والاختبارات من النظام في مخطط تقدمك.",
  "No courses found": "لا توجد مقررات",
  "Lessons, tests, and grades from Supabase will build the course list automatically.": "سيتم إنشاء قائمة المقررات تلقائيًا من الدروس والاختبارات والدرجات الموجودة في النظام.",
  "Lesson details are available from Supabase.": "تفاصيل الدرس متاحة من النظام.",
  "No homework assigned": "لا توجد واجبات مسندة",
  "Homework created in Supabase for this subject will appear here.": "ستظهر هنا الواجبات التي تم إنشاؤها لهذه المادة في النظام.",
  "No final grade yet": "لا توجد درجة نهائية بعد",
  "Approved final grades from Supabase will appear here once they are entered.": "ستظهر هنا الدرجات النهائية المعتمدة من النظام بعد إدخالها.",
  "No tests found": "لا توجد اختبارات",
  "Try another course or month filter, or publish a new test in Supabase.": "جرّب مقررًا آخر أو شهرًا آخر، أو انشر اختبارًا جديدًا في النظام.",
  "No grades available": "لا توجد درجات متاحة",
  "Final grades from Supabase will appear here when teachers submit them.": "ستظهر هنا الدرجات النهائية من النظام عند اعتمادها من المعلمين.",
  "This parent account is connected, but there are no child records linked in Supabase yet.": "حساب ولي الأمر متصل، ولكن لا توجد سجلات أبناء مرتبطة في النظام حتى الآن.",
  "No scored work yet": "لا توجد أعمال مصححة بعد",
  "Homework and test scores from Supabase will populate the trend here.": "ستظهر هنا درجات الواجبات والاختبارات من النظام في المخطط.",
  "No grade data yet": "لا توجد بيانات درجات بعد",
  "Final grades for this child will appear here once they are approved in Supabase.": "ستظهر هنا الدرجات النهائية لهذا الابن بعد اعتمادها في النظام.",
  "No attendance records yet": "لا توجد سجلات حضور بعد",
  "Attendance recorded in Supabase will appear here for the selected child.": "ستظهر هنا سجلات الحضور المسجلة في النظام للابن المحدد.",
  "No homework records": "لا توجد سجلات واجبات",
  "Homework and submission scores from Supabase will appear here.": "ستظهر هنا الواجبات ودرجات التسليم من النظام.",
  "No test records": "لا توجد سجلات اختبارات",
  "Monthly tests and child submissions from Supabase will appear here.": "ستظهر هنا الاختبارات الشهرية وتسليمات الابن من النظام.",
  "No announcements yet": "لا توجد إعلانات بعد",
  "Parent-targeted announcements from Supabase will appear here.": "ستظهر هنا الإعلانات الموجهة لأولياء الأمور من النظام.",
  "Welcome back!": "مرحبًا بعودتك!",
  "Bring calculators": "أحضروا الآلات الحاسبة",
  "Parent Meeting": "اجتماع أولياء الأمور",
});

Object.assign(ARABIC_WORDS, {
  activate: "تفعيل",
  deactivating: "تعطيل",
  deactivate: "تعطيل",
  reactivate: "إعادة التفعيل",
  suspend: "تعليق",
  users: "المستخدمين",
  notified: "إشعار",
  permanently: "نهائيًا",
  associated: "المرتبطة",
  data: "البيانات",
  cannot: "لا يمكن",
  undone: "التراجع",
  delete: "حذف",
  lead: "عميل محتمل",
  subject: "الموضوع",
  password: "كلمة المرور",
  request: "طلب",
  account: "حساب",
});

Object.assign(ARABIC_WORDS, {
  Admin: "المدير",
  Section: "الشعبة",
  Sunday: "الأحد",
  Saturday: "السبت",
  Supabase: "النظام",
  Conversation: "محادثة",
  Thread: "محادثة",
  Recipient: "المستلم",
  Contacts: "جهات الاتصال",
  Contact: "جهة اتصال",
  synced: "متزامنة",
  enrollments: "تسجيلات",
  enrollment: "تسجيل",
  Working: "العمل",
  Slots: "الحصص",
  Years: "الأعوام",
  Structure: "الهيكل",
  Configured: "مُعد",
  PM: "م",
  AM: "ص",
});

function translateToArabic(value: string) {
  const text = value.trim();
  if (!text) return value;
  const translated = ARABIC_TRANSLATIONS[text];
  if (translated) return value.replace(text, translated);
  const protectedTokens: string[] = [];
  const safeValue = value.replace(/(?:https?:\/\/[^\s]+|\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b)/g, token => `¤${protectedTokens.push(token) - 1}¤`);
  const arabized = safeValue
    .replace(/You are about to activate/gi, "أنت على وشك تفعيل")
    .replace(/\.\s*The school admin will be notified by email\./gi, "، وسيتم إشعار مدير المدرسة عبر البريد الإلكتروني.")
    .replace(/Deactivating/gi, "سيؤدي تعطيل")
    .replace(/will suspend access for all users\. You can reactivate at any time\./gi, "إلى تعليق الوصول لجميع المستخدمين. ويمكنك إعادة التفعيل في أي وقت.")
    .replace(/This will permanently delete/gi, "سيؤدي هذا إلى حذف")
    .replace(/and all associated data\. This action cannot be undone\./gi, "وجميع البيانات المرتبطة بها. لا يمكن التراجع عن هذا الإجراء.")
    .replace(/Across all schools/gi, "في جميع المدارس")
    .replace(/Configured in Supabase/gi, "تم الإعداد في النظام")
    .replace(/Messages are synced from Supabase\./gi, "الرسائل متزامنة من النظام.")
    .replace(/Conversations and teacher contacts from Supabase/gi, "المحادثات وجهات اتصال المعلمين من النظام")
    .replace(/(.+?) was published for (.+?)\./gi, (_, title, target) => `تم نشر ${translateToArabic(title)} لـ ${translateToArabic(target)}.`)
    .replace(/(.+?) is due on (.+?)\./gi, (_, title, dueDate) => `موعد تسليم ${translateToArabic(title)} هو ${translateToArabic(dueDate)}.`)
    .replace(/(.+?) is scheduled for (.+?)\./gi, (_, title, target) => `تمت جدولة ${translateToArabic(title)} لـ ${translateToArabic(target)}.`)
    .replace(/(.+?) was posted to targeted groups\./gi, (_, title) => `تم نشر ${translateToArabic(title)} للمجموعات المستهدفة.`)
    .replace(/(.+?) was posted to the whole school\./gi, (_, title) => `تم نشر ${translateToArabic(title)} للمدرسة بالكامل.`)
    .replace(/Grade\s+(\d+)/gi, "الصف $1")
    .replace(/Section\s+([A-Za-z0-9\u0600-\u06FF]+)/gi, "الشعبة $1")
    .replace(/(\d+)\s+active enrollments\b/gi, "$1 تسجيلات نشطة")
    .replace(/(\d+)\s+grade levels\b/gi, "$1 مراحل دراسية")
    .replace(/from Supabase/gi, "من النظام")
    .replace(/through Supabase/gi, "عبر النظام")
    .replace(/in Supabase/gi, "في النظام")
    .replace(/Supabase-backed/gi, "المرتبطة بالنظام")
    .replace(/live Supabase inbox/gi, "صندوق الوارد المباشر في النظام")
    .replace(/Supabase inbox/gi, "صندوق الوارد في النظام")
    .replace(/(\d+)\s+total leads\b/gi, "إجمالي $1 عميل محتمل")
    .replace(/(\d+) students\b/gi, "$1 طلاب")
    .replace(/(\d+) teachers\b/gi, "$1 معلمين")
    .replace(/(\d+) schools\b/gi, "$1 مدارس")
    .replace(/out of (\d+)/gi, "من $1")
    .replace(/[A-Za-z]+/g, word => ARABIC_WORDS[word] ?? ARABIC_WORDS[word[0]?.toUpperCase() + word.slice(1).toLowerCase()] ?? word);
  return arabized.replace(/¤(\d+)¤/g, (_, index) => protectedTokens[Number(index)] ?? "");
}

/** Central translation API for all new and refactored screens. */
export function translate(key: string, language: Language, fallback = key) {
  if (language === "en") return fallback;
  return translateToArabic(key);
}

function BilingualContent({ language }: { language: Language }) {
  const originalText = useRef(new WeakMap<Text, string>());
  const originalAttributes = useRef(new WeakMap<Element, Record<string, string>>());

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.classList.toggle("rtl", language === "ar");
    const root = document.getElementById("root");
    if (!root) return;
    const shouldSkip = (node: Node) => node.parentElement?.closest("[data-no-translate], script, style") !== null;
    const updateText = (node: Text) => {
      if (shouldSkip(node)) return;
      const original = originalText.current.get(node) ?? node.nodeValue ?? "";
      originalText.current.set(node, original);
      const next = translate(original, language, original);
      if (node.nodeValue !== next) node.nodeValue = next;
    };
    const updateElement = (element: Element) => {
      if (element.closest("[data-no-translate]")) return;
      const values = originalAttributes.current.get(element) ?? {};
      ["placeholder", "title", "aria-label"].forEach(attribute => {
        const current = element.getAttribute(attribute);
        if (current === null) return;
        if (!(attribute in values)) values[attribute] = current;
        const next = translate(values[attribute], language, values[attribute]);
        if (current !== next) element.setAttribute(attribute, next);
      });
      originalAttributes.current.set(element, values);
    };
    const updateNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) updateText(node as Text);
      if (node.nodeType === Node.ELEMENT_NODE) {
        updateElement(node as Element);
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        let textNode = walker.nextNode();
        while (textNode) { updateText(textNode as Text); textNode = walker.nextNode(); }
        (node as Element).querySelectorAll("*").forEach(updateElement);
      }
    };
    updateNode(root);
    const observer = new MutationObserver(records => records.forEach(record => {
      if (record.type === "characterData") updateText(record.target as Text);
      if (record.type === "attributes" && record.target instanceof Element) updateElement(record.target);
      record.addedNodes.forEach(updateNode);
    }));
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "title", "aria-label"] });
    return () => observer.disconnect();
  }, [language]);
  return null;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => window.localStorage.getItem("nibras-language") === "ar" ? "ar" : "en");
  useEffect(() => { window.localStorage.setItem("nibras-language", language); }, [language]);
  return <LanguageContext.Provider value={{ language, setLanguage }}><BilingualContent language={language} />{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}

/** Use this in every new component instead of hard-coding a visible string. */
export function useTranslation() {
  const { language, setLanguage } = useLanguage();
  return {
    language,
    isRTL: language === "ar",
    setLanguage,
    t: (key: string, fallback = key) => translate(key, language, fallback),
  };
}

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  return (
    <button data-no-translate onClick={() => setLanguage(language === "en" ? "ar" : "en")} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-muted hover:bg-secondary text-sm font-semibold text-foreground transition-colors" title="Switch language">
      <Languages className="w-4 h-4" />
      {language === "en" ? "العربية" : "الإنجليزية"}
    </button>
  );
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
export const SCHOOLS = [
  { id: 1, name: "Greenfield Academy", admin: "Mr. Adeyemi", plan: "Premium", status: "active", students: 340, teachers: 24, created: "Jan 12, 2024" },
  { id: 2, name: "Sunridge High School", admin: "Mrs. Okafor", plan: "Standard", status: "inactive", students: 210, teachers: 16, created: "Feb 5, 2024" },
  { id: 3, name: "Bright Futures College", admin: "Dr. Ibrahim", plan: "Premium", status: "active", students: 520, teachers: 38, created: "Mar 1, 2024" },
  { id: 4, name: "Heritage International", admin: "Prof. Chukwu", plan: "Basic", status: "active", students: 180, teachers: 12, created: "Mar 20, 2024" },
  { id: 5, name: "Pinnacle School", admin: "Mr. Okonkwo", plan: "Standard", status: "inactive", students: 95, teachers: 8, created: "Apr 2, 2024" },
];

export const TEACHERS = [
  { id: 1, name: "Mrs. Fatima Bello", email: "f.bello@school.edu", subject: "Mathematics", classes: ["Class A", "Class B"], status: "active", avatar: "FB" },
  { id: 2, name: "Mr. Emeka Osei", email: "e.osei@school.edu", subject: "English", classes: ["Class A", "Class C"], status: "active", avatar: "EO" },
  { id: 3, name: "Dr. Chidi Nwosu", email: "c.nwosu@school.edu", subject: "Physics", classes: ["Class B", "Class D"], status: "active", avatar: "CN" },
  { id: 4, name: "Mrs. Amina Suleiman", email: "a.suleiman@school.edu", subject: "Chemistry", classes: ["Class C"], status: "active", avatar: "AS" },
  { id: 5, name: "Mr. Tunde Adeyemi", email: "t.adeyemi@school.edu", subject: "Biology", classes: ["Class D", "Class B"], status: "inactive", avatar: "TA" },
];

export const STUDENTS = [
  { id: 1, name: "Joshua Ashiru", class: "Class A", email: "j.ashiru@school.edu", parent: "Mr. Ashiru", grade: "A", points: 870, avatar: "JA", gender: "M" },
  { id: 2, name: "Adeiola Ayo", class: "Class A", email: "a.ayo@school.edu", parent: "Mrs. Ayo", grade: "B+", points: 470, avatar: "AA", gender: "F" },
  { id: 3, name: "Adewunyi Ige", class: "Class B", email: "a.ige@school.edu", parent: "Mr. Ige", grade: "A-", points: 490, avatar: "AI", gender: "M" },
  { id: 4, name: "Mayowa Ade", class: "Class B", email: "m.ade@school.edu", parent: "Mrs. Ade", grade: "B", points: 410, avatar: "MA", gender: "F" },
  { id: 5, name: "Damilola Obi", class: "Class C", email: "d.obi@school.edu", parent: "Mr. Obi", grade: "A+", points: 920, avatar: "DO", gender: "M" },
  { id: 6, name: "Kemi Hassan", class: "Class C", email: "k.hassan@school.edu", parent: "Mrs. Hassan", grade: "B-", points: 360, avatar: "KH", gender: "F" },
];

export const ANNOUNCEMENTS = [
  { id: 1, title: "Mid-term Examinations Schedule", body: "Mid-term examinations will commence on April 28. All students are required to report 30 minutes early.", audience: "All", date: "Apr 10, 2024", author: "School Admin" },
  { id: 2, title: "Parent-Teacher Conference", body: "Annual parent-teacher conference scheduled for May 5. Parents are encouraged to register in advance.", audience: "Parents", date: "Apr 8, 2024", author: "School Admin" },
  { id: 3, title: "New Science Lab Equipment", body: "The school has procured new laboratory equipment. All science teachers should review the inventory.", audience: "Teachers", date: "Apr 6, 2024", author: "School Admin" },
  { id: 4, title: "Sports Day 2024", body: "Annual sports day will be held on May 15. Students should register their preferred events by May 1.", audience: "Students", date: "Apr 4, 2024", author: "School Admin" },
];

export const MESSAGES = [
  { id: 1, from: "Mayowa Ade", avatar: "MA", time: "09:24 am", preview: "Good morning ma, I wanted to ask about the assignment you gave yesterday...", unread: true },
  { id: 2, from: "Dawori Tabi", avatar: "DT", time: "12:30 pm", preview: "Please find attached the homework submission files.", unread: false, attachments: ["image.jpg", "Form.jpg", "image 2.jpg"] },
  { id: 3, from: "Joshua Ashiru", avatar: "JA", time: "11:30 pm", preview: "Good evening ma'am. I would like to ask you to assist me on my math work.", unread: false },
];

export const HOMEWORK = [
  { id: 1, title: "Algebraic Equations - Chapter 5", subject: "Mathematics", class: "Class A", due: "Apr 20, 2024", questions: 10, submissions: 18, total: 25, published: true, points: 100 },
  { id: 2, title: "Essay: Environmental Pollution", subject: "English", class: "Class A", due: "Apr 22, 2024", questions: 3, submissions: 12, total: 25, published: true, points: 50 },
  { id: 3, title: "Newton's Laws of Motion", subject: "Physics", class: "Class B", due: "Apr 25, 2024", questions: 8, submissions: 0, total: 28, published: false, points: 80 },
];

export const TESTS = [
  { id: 1, title: "April Mathematics Assessment", subject: "Mathematics", class: "Class A", date: "Apr 18, 2024", duration: 60, questions: 20, submissions: 22, total: 25, published: true },
  { id: 2, title: "English Comprehension Test", subject: "English", class: "Class B", date: "Apr 20, 2024", duration: 45, questions: 15, submissions: 0, total: 28, published: false },
];

export const WORKLOAD_DATA = [
  { day: "M", lessons: 4 }, { day: "T", lessons: 6 }, { day: "W", lessons: 5 },
  { day: "T", lessons: 7 }, { day: "F", lessons: 5 }, { day: "S", lessons: 3 }, { day: "S", lessons: 1 },
];

export const PLATFORM_STATS = [
  { label: "Total Schools", value: "24", change: "+3", trend: "up" },
  { label: "Total Teachers", value: "1,284", change: "+48", trend: "up" },
  { label: "Total Students", value: "38,490", change: "+1,240", trend: "up" },
  { label: "Monthly Revenue", value: "$48,200", change: "+12%", trend: "up" },
];

export const GRADES_DATA = [
  { subject: "Mathematics", hw: 92, test: 88, final: 90, grade: "A" },
  { subject: "English", hw: 78, test: 82, final: 80, grade: "B+" },
  { subject: "Physics", hw: 85, test: 76, final: 80, grade: "B+" },
  { subject: "Chemistry", hw: 72, test: 68, final: 70, grade: "B" },
  { subject: "Biology", hw: 88, test: 91, final: 90, grade: "A" },
];

export const TIMETABLE: Record<string, string[]> = {
  Monday:    ["Mathematics", "English", "Physics", "Break", "Chemistry", "Biology", "Free"],
  Tuesday:   ["English", "Mathematics", "Chemistry", "Break", "Biology", "Physics", "Free"],
  Wednesday: ["Physics", "Biology", "Mathematics", "Break", "English", "Chemistry", "Free"],
  Thursday:  ["Chemistry", "Physics", "English", "Break", "Mathematics", "Biology", "Free"],
  Friday:    ["Biology", "Chemistry", "Physics", "Break", "English", "Mathematics", "Free"],
};

export const TIME_SLOTS = ["8:00 – 9:00", "9:00 – 10:00", "10:00 – 11:00", "11:00 – 11:30", "11:30 – 12:30", "12:30 – 1:30", "1:30 – 2:30"];

export const ATTENDANCE_DATA = [
  { month: "Jan", present: 19, absent: 1 }, { month: "Feb", present: 17, absent: 3 },
  { month: "Mar", present: 20, absent: 0 }, { month: "Apr", present: 15, absent: 2 },
];

export const PERF_TREND = [
  { month: "Jan", score: 72 }, { month: "Feb", score: 78 }, { month: "Mar", score: 74 },
  { month: "Apr", score: 82 }, { month: "May", score: 85 },
];

export const AVATAR_COLORS = ["#7C5CBF", "#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#EC4899", "#8B5CF6", "#06B6D4"];

// ─── Utilities ────────────────────────────────────────────────────────────────
export function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-12 h-12 text-base" : "w-10 h-10 text-sm";
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`${sz} rounded-full flex items-center justify-center text-white font-semibold shrink-0`} style={{ background: avatarColor(name) }}>
      {initials}
    </div>
  );
}

export function Badge({ children, color = "purple" }: { children: React.ReactNode; color?: "purple" | "green" | "red" | "yellow" | "blue" | "gray" }) {
  const cls: Record<string, string> = {
    purple: "bg-purple-100 text-purple-700",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    yellow: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    gray: "bg-gray-100 text-gray-600",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls[color]}`}>{children}</span>;
}

export function StatCard({ icon, label, value, sub, color = "#7C5CBF" }: { icon: React.ReactNode; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-card rounded-xl p-4 flex items-center gap-4 shadow-sm border border-border">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Toast({ message, type = "success", onClose }: { message: string; type?: "success" | "error" | "info"; onClose: () => void }) {
  const cls = type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : type === "error" ? "bg-red-50 border-red-200 text-red-800" : "bg-blue-50 border-blue-200 text-blue-800";
  const icon = type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : type === "error" ? <AlertCircle className="w-4 h-4 text-red-500" /> : <AlertCircle className="w-4 h-4 text-blue-500" />;
  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${cls} animate-in slide-in-from-right`}>
      {icon}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
    </div>
  );
}

export function LoadingState({
  label,
  title,
  description,
}: {
  label?: string;
  title?: string;
  description?: string;
}) {
  const heading = title ?? label ?? "Loading data...";
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-8 text-center">
      <LoaderCircle className="mb-3 h-7 w-7 animate-spin text-primary" />
      <p className="text-sm font-medium text-foreground">{heading}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

export function EmptyState({ title = "Nothing here yet", description = "New items will appear here when available.", action }: { title?: string; description?: string; action?: React.ReactNode }) {
  return <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-8 text-center"><Inbox className="mb-3 h-8 w-8 text-primary/60" /><p className="text-sm font-semibold text-foreground">{title}</p><p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

export function ErrorState({ title = "We could not load this data", description = "Please try again.", onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50/50 p-8 text-center"><TriangleAlert className="mb-3 h-8 w-8 text-red-500" /><p className="text-sm font-semibold text-foreground">{title}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p>{onRetry && <button onClick={onRetry} className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white">Try again</button>}</div>;
}

export function Input({ label, type = "text", value, onChange, placeholder, error, required }: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; error?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-foreground">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full px-3 py-2.5 rounded-xl border text-sm transition-all outline-none focus:ring-2 focus:ring-primary/30 bg-muted ${error ? "border-red-400 focus:ring-red-200" : "border-border focus:border-primary"}`}
      />
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

export function Select({ label, value, onChange, options, error, required }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; error?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-foreground">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        className={`w-full px-3 py-2.5 rounded-xl border text-sm transition-all outline-none focus:ring-2 focus:ring-primary/30 bg-muted ${error ? "border-red-400" : "border-border focus:border-primary"}`}
      >
        <option value="">Select…</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

export function Btn({ children, onClick, variant = "primary", size = "md", icon, disabled, className = "" }: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg"; icon?: React.ReactNode; disabled?: boolean; className?: string;
}) {
  const vs: Record<string, string> = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "bg-transparent text-muted-foreground hover:bg-muted",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
  };
  const ss: Record<string, string> = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  return (
    <button
      onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-2 font-semibold rounded-xl transition-all ${vs[variant]} ${ss[size]} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {icon}{children}
    </button>
  );
}

export function CircleProgress({ value, max, label, sub }: { value: number; max: number; label: string; sub?: string }) {
  const pct = (value / max) * 100;
  const r = 45; const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#EDE9FE" strokeWidth="10" />
          <circle cx="50" cy="50" r={r} fill="none" stroke="#7C5CBF" strokeWidth="10"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-foreground">{value}</span>
          <span className="text-[10px] text-muted-foreground">out of {max}</span>
        </div>
      </div>
      <p className="text-xs font-semibold text-foreground mt-2 text-center">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground text-center">{sub}</p>}
    </div>
  );
}

export function MiniProgress({ label, value, sub }: { label: string; value: number; sub: string }) {
  const r = 18; const circ = 2 * Math.PI * r; const offset = circ - (value / 100) * circ;
  return (
    <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <div className="relative w-12 h-12">
        <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
          <circle cx="20" cy="20" r={r} fill="none" stroke="#EDE9FE" strokeWidth="4" />
          <circle cx="20" cy="20" r={r} fill="none" stroke="#7C5CBF" strokeWidth="4"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[9px] font-bold text-primary">{value}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export function Sidebar({ items, active, onSelect, onLogout, userName, userRole }:
  { items: NavItem[]; active: string; onSelect: (id: string) => void; onLogout: () => void; userName: string; userRole: string }) {
  const { language } = useLanguage();
  return (
    <aside className={`w-[220px] h-screen bg-card flex flex-col shrink-0 ${language === "ar" ? "border-l" : "border-r"} border-border`}>
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <img src={nibrasLogo} alt="Nibras" className="w-8 h-8 object-contain rounded-lg" />
        <span className="font-bold text-foreground text-base leading-tight">Nibras</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map(item => (
          <button key={item.id} onClick={() => onSelect(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active === item.id ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            <span className="w-4 h-4 shrink-0">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl mb-2">
          <Avatar name={userName} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{userName}</p>
            <p className="text-[10px] text-muted-foreground truncate">{userRole}</p>
          </div>
        </div>
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all font-medium">
          <LogOut className="w-4 h-4" /><span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-20">
      <div>
        <h1 className="text-base font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <div className="relative">
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center cursor-pointer hover:bg-secondary transition-colors">
            <Bell className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">3</span>
        </div>
        <Avatar name="John Doe" size="sm" />
      </div>
    </div>
  );
}

export function AppShell({ children, navItems, activeView, onSelect, onLogout, headerTitle, userName, userRole }:
  { children: React.ReactNode; navItems: NavItem[]; activeView: string; onSelect: (v: string) => void;
    onLogout: () => void; headerTitle: string; userName: string; userRole: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { language } = useLanguage();
  return (
    <div className="flex h-screen bg-background font-[Plus_Jakarta_Sans,sans-serif] overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div
        className={`fixed top-0 h-full w-[220px] z-30 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : language === "ar" ? "translate-x-full md:translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        style={{ insetInlineStart: 0 }}
      >
        <Sidebar items={navItems} active={activeView} onSelect={(id) => { onSelect(id); setSidebarOpen(false); }} onLogout={onLogout} userName={userName} userRole={userRole} />
      </div>
      <div className="nibras-shell-content relative z-0 flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button className="md:hidden w-9 h-9 rounded-xl bg-muted flex items-center justify-center" onClick={() => setSidebarOpen(p => !p)}>
              <Menu className="w-4 h-4 text-muted-foreground" />
            </button>
            <h1 className="text-base font-bold text-foreground">{headerTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center cursor-pointer hover:bg-secondary transition-colors">
                <Bell className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">3</span>
            </div>
            <Avatar name={userName} size="sm" />
          </div>
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}


// ─── Role Selection ───────────────────────────────────────────────────────────
type LessonWorkspaceProps = {
  className: string;
  lessonTitle?: string;
  onBack: () => void;
  canAddLesson?: boolean;
  onAddLesson?: () => void;
  onOpenHomework?: () => void;
  canCreateAssignments?: boolean;
  onCreateHomework?: () => void;
  onCreateTask?: () => void;
};

/** Shared visual lesson page. Only the teacher receives an add-lesson action. */
export function LessonWorkspace({ className, lessonTitle = "Introduction to algebraic equations", onBack, canAddLesson = false, onAddLesson, onOpenHomework, canCreateAssignments = false, onCreateHomework, onCreateTask }: LessonWorkspaceProps) {
  const attendance = [
    ["Charlie Rawal", "53", "250", "up"], ["Ariana Agarwal", "88", "212", "down"],
    ["Mohamed Salah", "84", "208", "up"], ["Mariam Ahmed", "79", "196", "up"],
    ["Youssef Ali", "74", "189", "down"], ["Salma Hassan", "69", "175", "up"],
  ] as const;
  const groups = [
    { title: "Articles", items: ["Article 1", "Article 2"], icon: BookOpen },
    { title: "Homework", items: ["Homework 1", "Homework 2"], icon: ClipboardList },
    { title: "Tasks", items: ["Task 1", "Task 2"], icon: CheckSquare },
  ];
  return (
    <section className="rounded-2xl border border-[#EDE5F4] bg-white p-4 sm:p-7 shadow-sm" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="mb-7 flex flex-wrap items-center gap-3">
        <button onClick={onBack} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-xl text-[#172B5D] transition hover:bg-[#F5F0FF]"><ChevronLeft className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1"><h2 className="truncate text-xl font-bold text-[#172B5D]">{className}</h2><p className="mt-0.5 text-xs text-[#8B8FA3]">{lessonTitle}</p></div>
        {canAddLesson && <button onClick={onAddLesson} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95" style={{ background: "#955AC3" }}><Plus className="h-4 w-4" /> Add lesson</button>}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.9fr)]">
        <div className="min-w-0 space-y-6">
          <div className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-2xl border border-[#F0EAF5] bg-[radial-gradient(circle_at_30%_25%,#FFFFFF_0%,#F7F0FB_45%,#E9D7F5_100%)] p-8"><div className="absolute inset-x-10 bottom-8 h-14 rounded-2xl bg-[#DAC4E9]/45 blur-xl" /><div className="relative text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-4 border-white bg-white/80 shadow-lg"><PlayCircle className="h-11 w-11 text-[#955AC3]" fill="#955AC3" stroke="white" /></div><p className="mt-4 text-sm font-semibold text-[#59456B]">Watch lesson video</p></div></div>
          {groups.map(group => { const Icon = group.icon; const create = group.title === "Homework" ? onCreateHomework : group.title === "Tasks" ? onCreateTask : undefined; return <div key={group.title}><div className="mb-3 flex items-center justify-between"><h3 className="text-base font-semibold text-[#243767]">{group.title}</h3>{canCreateAssignments && create && <button onClick={create} className="inline-flex items-center gap-1 rounded-lg bg-[#F5F0FF] px-3 py-1.5 text-xs font-bold text-[#955AC3] hover:bg-[#EADAF5]"><Plus className="h-3.5 w-3.5" /> {group.title === "Homework" ? "Add Homework" : "Add Task"}</button>}</div><div className="grid gap-3 sm:grid-cols-2">{group.items.map((item, index) => <button key={item} onClick={group.title === "Homework" ? onOpenHomework : undefined} className="group min-h-36 rounded-xl border border-[#E7D8F4] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7F0FB] text-[#955AC3]"><Icon className="h-5 w-5" /></div><p className="text-sm font-semibold text-[#243767]">{item}</p><div className="mt-2 flex items-center gap-2 text-[11px] text-[#8B8FA3]"><BookOpen className="h-3.5 w-3.5" /> {index + 3} <span className="h-3 w-px bg-[#DCCAE9]" /> <Users className="h-3.5 w-3.5" /> 99</div></button>)}</div></div>; })}
        </div>
        <aside className="overflow-hidden rounded-2xl border border-[#F0EAF5] bg-white"><div className="border-b border-[#F4EEF7] px-5 py-4"><h3 className="text-base font-semibold text-[#243767]">Attendance</h3><p className="mt-1 text-xs text-[#8B8FA3]">Class activity and participation</p></div><div className="overflow-x-auto"><table className="w-full min-w-[330px] text-left"><thead className="text-[10px] uppercase tracking-wide text-[#9AA0B4]"><tr><th className="px-4 py-3 font-semibold">ID</th><th className="py-3 font-semibold">Student</th><th className="px-3 py-3 font-semibold">Rank</th><th className="px-4 py-3 text-right font-semibold">Hours</th></tr></thead><tbody>{attendance.map(([name, rank, hours, trend], index) => <tr key={name} className="border-t border-[#F7F2F9] text-xs"><td className="px-4 py-3"><span className="rounded bg-[#F5F0FF] px-1.5 py-1 text-[#6E5D8B]">{index + 1}</span></td><td className="py-3 font-semibold text-[#34446E]"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: trend === "up" ? "#36B7A2" : "#EF7C8E" }} />{name}</td><td className="px-3 py-3 text-[#6B7188]">{rank}</td><td className="px-4 py-3 text-right text-[#6B7188]">{hours}</td></tr>)}</tbody></table></div></aside>
      </div>
    </section>
  );
}

export const ROLES = [
  { id: "super-admin", label: "Super Admin", desc: "Manage all schools and platform operations", icon: <Shield className="w-7 h-7" />, color: "#7C5CBF" },
  { id: "school-admin", label: "School Admin", desc: "Manage your school, staff, and academics", icon: <Building2 className="w-7 h-7" />, color: "#3B82F6" },
  { id: "teacher", label: "Teacher", desc: "Create lessons, homework, and track students", icon: <Book className="w-7 h-7" />, color: "#10B981" },
  { id: "student", label: "Student", desc: "Access courses, complete homework and tests", icon: <GraduationCap className="w-7 h-7" />, color: "#F59E0B" },
  { id: "parent", label: "Parent", desc: "Monitor your child's progress and grades", icon: <Users className="w-7 h-7" />, color: "#EC4899" },
];

export function RoleSelection({ onSelect }: { onSelect: (p: Portal) => void }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="absolute top-5 right-5"><LanguageSwitcher /></div>
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <img src={nibrasLogo} alt="Nibras" className="w-14 h-14 object-contain" />
          <span className="text-2xl font-bold text-foreground">Nibras</span>
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Welcome back</h2>
        <p className="text-muted-foreground text-base">Select your role to continue to your portal</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 max-w-5xl w-full">
        {ROLES.map(r => (
          <button key={r.id} onClick={() => onSelect(r.id as Portal)}
            className="group bg-card rounded-2xl p-6 text-left border border-border hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all duration-200 flex flex-col gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all" style={{ background: `${r.color}18`, color: r.color }}>
              {r.icon}
            </div>
            <div>
              <p className="font-bold text-foreground text-base mb-1">{r.label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold mt-auto" style={{ color: r.color }}>
              <span>Enter Portal</span><ChevronRight className="w-3 h-3" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Super Admin Portal ───────────────────────────────────────────────────────
// ─── Leads mock data ──────────────────────────────────────────────────────────
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

function SuperAdminPortal({ view, setView, onLogout }: { view: string; setView: (v: string) => void; onLogout: () => void }) {
  const [schools, setSchools] = useState(SCHOOLS);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<number | null>(null);
  const [showDelete, setShowDelete] = useState<number | null>(null);
  const [showActivate, setShowActivate] = useState<number | null>(null);
  const [showDeactivate, setShowDeactivate] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({ name: "", admin: "", email: "", phone: "", address: "", plan: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [schoolSearch, setSchoolSearch] = useState("");
  // Subscriptions state
  const [plans, setPlans] = useState(SUBSCRIPTION_PLANS_DEFAULT);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<typeof SUBSCRIPTION_PLANS_DEFAULT[0] | null>(null);
  const [planForm, setPlanForm] = useState({ name: "", price: "", maxStudents: "", maxTeachers: "", features: "" });
  // Leads state
  const [leads, setLeads] = useState(LEADS_DATA);
  const [leadSearch, setLeadSearch] = useState("");
  const [leadGovFilter, setLeadGovFilter] = useState("");
  const [leadTypeFilter, setLeadTypeFilter] = useState("");
  const [showContactModal, setShowContactModal] = useState<number | null>(null);

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

  const createSchool = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSchools(prev => [...prev, { id: prev.length + 1, name: form.name, admin: form.admin, plan: form.plan, status: "inactive", students: 0, teachers: 0, created: "Apr 18, 2024" }]);
    setForm({ name: "", admin: "", email: "", phone: "", address: "", plan: "" });
    setErrors({});
    setShowCreate(false);
    showToast(`${form.name} created! Credentials sent to admin.`);
  };

  const saveEdit = () => {
    if (!form.name.trim()) { setErrors({ name: "School name is required" }); return; }
    setSchools(prev => prev.map(s => s.id === showEdit ? { ...s, name: form.name, admin: form.admin, plan: form.plan } : s));
    setShowEdit(null);
    showToast("School updated successfully.");
  };

  const activateSchool = (id: number) => {
    setSchools(prev => prev.map(s => s.id === id ? { ...s, status: "active" } : s));
    setShowActivate(null);
    showToast("School activated and admin notified.");
  };

  const deactivateSchool = (id: number) => {
    setSchools(prev => prev.map(s => s.id === id ? { ...s, status: "inactive" } : s));
    setShowDeactivate(null);
    showToast("School deactivated.", "error");
  };

  const deleteSchool = (id: number) => {
    setSchools(prev => prev.filter(s => s.id !== id));
    setShowDelete(null);
    showToast("School deleted permanently.", "error");
  };

  const openEdit = (s: typeof SCHOOLS[0]) => {
    setForm({ name: s.name, admin: s.admin, email: "", phone: "", address: "", plan: s.plan });
    setErrors({});
    setShowEdit(s.id);
  };

  const openPlanModal = (plan?: typeof SUBSCRIPTION_PLANS_DEFAULT[0]) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({ name: plan.name, price: String(plan.price), maxStudents: String(plan.maxStudents), maxTeachers: String(plan.maxTeachers), features: plan.features.join(", ") });
    } else {
      setEditingPlan(null);
      setPlanForm({ name: "", price: "", maxStudents: "", maxTeachers: "", features: "" });
    }
    setShowPlanModal(true);
  };

  const savePlan = () => {
    if (!planForm.name.trim() || !planForm.price) return;
    const feats = planForm.features.split(",").map(f => f.trim()).filter(Boolean);
    if (editingPlan) {
      setPlans(prev => prev.map(p => p.id === editingPlan.id ? { ...p, name: planForm.name, price: Number(planForm.price), maxStudents: Number(planForm.maxStudents), maxTeachers: Number(planForm.maxTeachers), features: feats } : p));
      showToast("Plan updated successfully.");
    } else {
      setPlans(prev => [...prev, { id: prev.length + 1, name: planForm.name, price: Number(planForm.price), period: "mo", maxStudents: Number(planForm.maxStudents), maxTeachers: Number(planForm.maxTeachers), features: feats, color: "#7C5CBF", schools: 0 }]);
      showToast("New plan created.");
    }
    setShowPlanModal(false);
  };

  const changeLeadStatus = (id: number, status: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
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

  const leadGovernorates = [...new Set(LEADS_DATA.map(l => l.governorate))];
  const leadStatusColor = (s: string) => s === "Converted" ? "green" : s === "Contacted" ? "blue" : "gray";

  const titleMap: Record<string, string> = { dashboard: "Platform Overview", schools: "Manage Schools", leads: "Leads", analytics: "Platform Analytics", subscriptions: "Subscription Plans", settings: "Settings" };

  return (
    <>
      <AppShell navItems={SA_NAV} activeView={view} onSelect={setView} onLogout={onLogout} headerTitle={titleMap[view] || "Dashboard"} userName="Super Admin" userRole="Platform Administrator">

        {/* ── Dashboard ── */}
        {view === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {PLATFORM_STATS.map(s => (
                <StatCard key={s.label} icon={<BarChart2 className="w-5 h-5" />} label={s.label} value={s.value} sub={`${s.change} this month`} />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-card rounded-2xl p-5 border border-border shadow-sm">
                <h3 className="font-bold text-foreground mb-4">Monthly Growth</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={[{m:"Jan",s:8},{m:"Feb",s:10},{m:"Mar",s:12},{m:"Apr",s:14},{m:"May",s:18},{m:"Jun",s:24}]}>
                    <defs><linearGradient id="sa-grad1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7C5CBF" stopOpacity={0.2}/><stop offset="95%" stopColor="#7C5CBF" stopOpacity={0}/></linearGradient></defs>
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
                        <td className="px-4 py-3"><Badge color={s.plan === "Premium" ? "purple" : s.plan === "Standard" ? "blue" : "gray"}>{s.plan}</Badge></td>
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
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {["School Name", "Owner / Contact", "Address", "Governorate", "Students", "Type", "Status", "Actions"].map(h => (
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
                        <td className="px-4 py-3 text-sm text-muted-foreground max-w-[180px] truncate" title={l.address}>{l.address}</td>
                        <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{l.governorate}</td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{l.students.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <Badge color={l.type === "International" ? "purple" : l.type === "Private" ? "blue" : "gray"}>{l.type}</Badge>
                        </td>
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
                      <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">No leads match your filters.</td></tr>
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
                  <RPieChart>
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
                  <BarChart data={[{month:"Jan",r:32000},{month:"Feb",r:38000},{month:"Mar",r:41000},{month:"Apr",r:48200}]}>
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
                        <h3 className="font-bold text-foreground text-lg">{p.name}</h3>
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
                        <td className="px-4 py-3"><Badge color={s.plan === "Premium" ? "purple" : s.plan === "Standard" ? "blue" : "gray"}>{s.plan}</Badge></td>
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
              options={plans.map(pl => ({ value: pl.name, label: `${pl.name} – $${pl.price}/mo` }))} />
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
              options={plans.map(pl => ({ value: pl.name, label: `${pl.name} – $${pl.price}/mo` }))} />
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
                <div className="p-4 bg-secondary rounded-xl mb-4">
                  <p className="font-semibold text-foreground">{l.schoolName}</p>
                  <p className="text-sm text-muted-foreground">{l.owner} · {l.governorate}</p>
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
