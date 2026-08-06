import { useEffect, useMemo, useState } from "react"
import { BookOpen, Calendar, ChevronLeft, Edit, Eye, FileText, Layers, Plus, PlayCircle, Trash2, Upload, Users, Video } from "lucide-react"
import { Avatar, Badge, Btn, EmptyState, Input, LessonLinkPreview, LoadingState, Modal, Select, StatCard, Toast, useTranslation } from "./shared"
import { useAttendance, type AttendanceStatus } from "@/hooks/useAttendance"
import { useClasses } from "@/hooks/useClasses"
import { useHomework, type Homework } from "@/hooks/useHomework"
import { useLessons, type Lesson } from "@/hooks/useLessons"
import { useSchoolEnrollments, type SchoolTeacherAssignment } from "@/hooks/useSchoolAdminData"
import { useStorageObjectUrl, useStorageObjectUrlMap } from "@/hooks/useStorageUrls"
import { useStudents } from "@/hooks/useStudents"
import { useTests, type MonthlyTest } from "@/hooks/useTests"
import { formatDisplayName } from "@/lib/display"
import { uploadLessonAttachment } from "@/lib/storage"

type DetailView = "list" | "detail"

type LiveClassSummary = {
  id: string
  name: string
  gradeName: string
  subjectLabel: string
  studentCount: number
  lessons: Lesson[]
  homework: Homework[]
  assessments: MonthlyTest[]
  color: string
}

type ToastState = { msg: string; type: "success" | "error" } | null

type LessonAttachmentDraft = {
  file_name: string
  file_url: string
  file_kind: string
  file: File | null
}

type HomeworkEditorState = { id: string | null; title: string; due_date: string; questions: Array<{ text: string; choices: string[]; correctIndex: number }> }

type LessonFormState = {
  subject_id: string
  title: string
  description: string
  lesson_date: string
  video_url: string
  attachments: LessonAttachmentDraft[]
}

function formatName(firstName?: string | null, lastName?: string | null, fallback?: string | null) {
  return formatDisplayName([firstName, lastName], fallback, "Student")
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString(locale)
}

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return "-"
  return new Date(value).toLocaleString(locale)
}

function lessonKind(lesson: Lesson) {
  if (lesson.video_url) return "video" as const
  if ((lesson.lesson_attachments?.length ?? 0) > 0) return "pdf" as const
  return "lesson" as const
}

function getAttachmentKind(file: File) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "pdf"
  if (file.type.startsWith("image/")) return "image"
  if (file.type.startsWith("video/")) return "video"
  return "file"
}

export function TeacherClassesSectionLive({
  schoolId,
  teacherId,
  assignments = [],
}: {
  schoolId?: string | null
  teacherId?: string | null
  assignments?: SchoolTeacherAssignment[]
}) {
  const dbLessons = useLessons({ schoolId: schoolId ?? null, teacherId: teacherId ?? null })
  const dbHomework = useHomework({ schoolId: schoolId ?? null, teacherId: teacherId ?? null })
  const dbTests = useTests({ schoolId: schoolId ?? null, teacherId: teacherId ?? null })
  const dbAttendance = useAttendance({ schoolId: schoolId ?? null })
  const dbClasses = useClasses(schoolId ?? null)
  const dbEnrollments = useSchoolEnrollments(schoolId ?? null)
  const dbStudents = useStudents(schoolId ?? null)

  const [view, setView] = useState<DetailView>("list")
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, AttendanceStatus | "">>({})
  const [savingAttendance, setSavingAttendance] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [showCreateLesson, setShowCreateLesson] = useState(false)
  const [creatingLesson, setCreatingLesson] = useState(false)
  const [showEditLesson, setShowEditLesson] = useState(false)
  const [showAddAttachments, setShowAddAttachments] = useState(false)
  const [attachmentDrafts, setAttachmentDrafts] = useState<LessonAttachmentDraft[]>([{ file_name: "", file_url: "", file_kind: "pdf", file: null }])
  const [homeworkEditor, setHomeworkEditor] = useState<HomeworkEditorState | null>(null)
  const [savingHomework, setSavingHomework] = useState(false)
  const [lessonForm, setLessonForm] = useState<LessonFormState>({
    subject_id: "",
    title: "",
    description: "",
    lesson_date: "",
    video_url: "",
    attachments: [{ file_name: "", file_url: "", file_kind: "pdf", file: null }],
  })
  const { language, t } = useTranslation()
  const locale = language === "ar" ? "ar-EG" : "en-US"

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type })
    window.setTimeout(() => setToast(null), 3000)
  }

  const liveClasses = useMemo<LiveClassSummary[]>(() => {
    const palette = ["#955AC3", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#0EA5E9"]
    const classMetaById = new Map(dbClasses.classes.map((item) => [item.id, item]))
    const lessonIdsWithHomework = new Set(dbHomework.homework.map((item) => item.lesson_id))
    const grouped = new Map<
      string,
      {
        lessons: Lesson[]
        homework: Homework[]
        assessments: MonthlyTest[]
        subjects: Set<string>
      }
    >()

    assignments.forEach((assignment) => {
      if (assignment.teacher_id !== teacherId || !assignment.class_id) return
      const current = grouped.get(assignment.class_id) ?? {
        lessons: [],
        homework: [],
        assessments: [],
        subjects: new Set<string>(),
      }
      if (assignment.subjects?.name) current.subjects.add(assignment.subjects.name)
      grouped.set(assignment.class_id, current)
    })

    dbLessons.lessons.forEach((lesson) => {
      const current = grouped.get(lesson.class_id) ?? {
        lessons: [],
        homework: [],
        assessments: [],
        subjects: new Set<string>(),
      }
      current.lessons.push(lesson)
      if (lesson.subjects?.name) current.subjects.add(lesson.subjects.name)
      grouped.set(lesson.class_id, current)
    })

    dbHomework.homework.forEach((item) => {
      const classId = item.lessons?.class_id
      if (!classId) return
      const current = grouped.get(classId) ?? {
        lessons: [],
        homework: [],
        assessments: [],
        subjects: new Set<string>(),
      }
      current.homework.push(item)
      grouped.set(classId, current)
    })

    dbTests.tests.forEach((test) => {
      const current = grouped.get(test.class_id) ?? {
        lessons: [],
        homework: [],
        assessments: [],
        subjects: new Set<string>(),
      }
      current.assessments.push(test)
      if (test.subjects?.name) current.subjects.add(test.subjects.name)
      grouped.set(test.class_id, current)
    })

    return Array.from(grouped.entries())
      .map(([classId, group], index) => {
        const classMeta = classMetaById.get(classId)
        const enrollments = dbEnrollments.enrollments.filter((row) => row.class_id === classId)
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
          homework: group.homework.slice().sort((left, right) => new Date(right.due_date).getTime() - new Date(left.due_date).getTime()),
          assessments: group.assessments.slice().sort((left, right) => new Date(right.test_date).getTime() - new Date(left.test_date).getTime()),
          color: palette[index % palette.length],
        }
      })
      .sort((left, right) => {
        if (left.gradeName !== right.gradeName) return left.gradeName.localeCompare(right.gradeName)
        return left.name.localeCompare(right.name)
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
      }))
  }, [assignments, dbClasses.classes, dbEnrollments.enrollments, dbHomework.homework, dbLessons.lessons, dbTests.tests, teacherId])

  useEffect(() => {
    if (!liveClasses.length) {
      setSelectedClassId(null)
      return
    }
    if (!selectedClassId || !liveClasses.some((item) => item.id === selectedClassId)) {
      setSelectedClassId(liveClasses[0].id)
    }
  }, [liveClasses, selectedClassId])

  const selectedClass = useMemo(() => liveClasses.find((item) => item.id === selectedClassId) ?? null, [liveClasses, selectedClassId])
  const assignedSubjectOptions = useMemo(() => {
    if (!selectedClass || !teacherId) return []
    const seen = new Set<string>()
    return assignments
      .filter((assignment) => assignment.teacher_id === teacherId && assignment.class_id === selectedClass.id)
      .filter((assignment) => {
        if (seen.has(assignment.subject_id)) return false
        seen.add(assignment.subject_id)
        return true
      })
      .map((assignment) => ({
        value: assignment.subject_id,
        label: assignment.subjects?.name ?? t("Subject"),
      }))
  }, [assignments, selectedClass, t, teacherId])

  useEffect(() => {
    if (!selectedClass) {
      setSelectedLessonId(null)
      return
    }
    if (!selectedLessonId || !selectedClass.lessons.some((lesson) => lesson.id === selectedLessonId)) {
      setSelectedLessonId(selectedClass.lessons[0]?.id ?? null)
    }
  }, [selectedClass, selectedLessonId])

  const selectedLesson = useMemo(() => selectedClass?.lessons.find((lesson) => lesson.id === selectedLessonId) ?? null, [selectedClass, selectedLessonId])

  const attendanceDays = useMemo(() => {
    if (!selectedClass) return []
    const days = new Map<string, Lesson[]>()
    selectedClass.lessons.forEach((lesson) => {
      const day = lesson.lesson_date.slice(0, 10)
      days.set(day, [...(days.get(day) ?? []), lesson])
    })
    return Array.from(days.entries())
      .map(([date, lessons]) => ({ date, lessons }))
      .sort((left, right) => left.date.localeCompare(right.date))
  }, [selectedClass])

  const today = new Date().toLocaleDateString("en-CA")

  const rawSelectedLessonVideoUrl = useMemo(() => {
    if (selectedLesson?.video_url) return selectedLesson.video_url

    const videoAttachment = (selectedLesson?.lesson_attachments ?? []).find(
      (attachment) => attachment.file_kind?.toLowerCase().includes("video") || /\.(mp4|webm|ogg|mov|m4v)(?:[?#].*)?$/i.test(attachment.file_url),
    )

    return videoAttachment?.file_url ?? null
  }, [selectedLesson])
  const selectedLessonVideoUrl = useStorageObjectUrl("lesson-attachments", rawSelectedLessonVideoUrl)
  const selectedLessonAttachmentUrls = useStorageObjectUrlMap(
    "lesson-attachments",
    (selectedLesson?.lesson_attachments ?? []).map((attachment) => attachment.file_url),
  )

  const selectedLessonHomework = useMemo(() => selectedClass?.homework.filter((item) => item.lesson_id === selectedLesson?.id) ?? [], [selectedClass, selectedLesson])

  const studentDirectory = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string
        email: string
        first_name: string | null
        last_name: string | null
      }
    >()
    dbStudents.students.forEach((student) => {
      map.set(student.id, student)
    })
    return map
  }, [dbStudents.students])

  const attendanceRows = useMemo(() => {
    if (!selectedClass) return []
    const classStudentRows = dbEnrollments.enrollments.filter((row) => row.class_id === selectedClass.id)
    const classLessonIds = new Set(selectedClass.lessons.map((lesson) => lesson.id))
    const classAttendance = dbAttendance.records.filter((record) => classLessonIds.has(record.lesson_id))

    return classStudentRows
      .map((row) => {
        const studentId = row.student_id
        const profile = studentDirectory.get(studentId)
        const studentHomeworkScores = selectedClass.homework.flatMap((item) =>
          (item.homework_submissions ?? []).filter((submission) => submission.student_id === studentId && submission.score != null).map((submission) => Number(submission.score)),
        )
        const studentTestScores = selectedClass.assessments.flatMap((item) =>
          (item.test_submissions ?? []).filter((submission) => submission.student_id === studentId && submission.score != null).map((submission) => Number(submission.score)),
        )
        const allScores = [...studentHomeworkScores, ...studentTestScores]
        const studentAttendance = classAttendance.filter((record) => record.student_id === studentId)
        const participationCount =
          selectedClass.homework.reduce((sum, item) => sum + (item.homework_submissions?.some((submission) => submission.student_id === studentId) ? 1 : 0), 0) +
          selectedClass.assessments.reduce((sum, item) => sum + (item.test_submissions?.some((submission) => submission.student_id === studentId) ? 1 : 0), 0)

        return {
          id: studentId,
          name: formatName(profile?.first_name ?? row.student_profile?.first_name, profile?.last_name ?? row.student_profile?.last_name, profile?.email ?? row.student_profile?.email ?? "Student"),
          average: allScores.length ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length) : 0,
          attendanceCount: studentAttendance.filter((record) => record.status !== "absent").length,
          participationCount,
        }
      })
      .sort((left, right) => right.average - left.average || right.attendanceCount - left.attendanceCount || left.name.localeCompare(right.name))
  }, [dbAttendance.records, dbEnrollments.enrollments, selectedClass, studentDirectory])

  const selectedLessonStudentRows = useMemo(() => {
    if (!selectedClass) return []
    return dbEnrollments.enrollments
      .filter((row) => row.class_id === selectedClass.id)
      .map((row) => {
        const profile = studentDirectory.get(row.student_id)
        return {
          id: row.student_id,
          name: formatName(profile?.first_name ?? row.student_profile?.first_name, profile?.last_name ?? row.student_profile?.last_name, profile?.email ?? row.student_profile?.email ?? "Student"),
        }
      })
      .sort((left, right) => left.name.localeCompare(right.name))
  }, [dbEnrollments.enrollments, selectedClass, studentDirectory])

  const selectedLessonAttendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceStatus>()
    if (!selectedLesson) return map
    dbAttendance.records
      .filter((record) => record.lesson_id === selectedLesson.id)
      .forEach((record) => {
        map.set(record.student_id, record.status)
      })
    return map
  }, [dbAttendance.records, selectedLesson])

  const totalStudents = useMemo(() => new Set(dbEnrollments.enrollments.map((row) => row.student_id)).size, [dbEnrollments.enrollments])

  useEffect(() => {
    if (!selectedLesson) {
      setAttendanceDraft({})
      return
    }
    const nextDraft: Record<string, AttendanceStatus | ""> = {}
    selectedLessonStudentRows.forEach((student) => {
      nextDraft[student.id] = selectedLessonAttendanceMap.get(student.id) ?? ""
    })
    setAttendanceDraft(nextDraft)
  }, [selectedLesson, selectedLessonAttendanceMap, selectedLessonStudentRows])

  const markAllAttendance = (status: AttendanceStatus) => {
    setAttendanceDraft(Object.fromEntries(selectedLessonStudentRows.map((student) => [student.id, status])))
  }

  const addAttachmentDraft = () => {
    setLessonForm((current) => ({
      ...current,
      attachments: [...current.attachments, { file_name: "", file_url: "", file_kind: "pdf", file: null }],
    }))
  }

  const updateAttachmentDraft = (index: number, updates: Partial<LessonAttachmentDraft>) => {
    setLessonForm((current) => ({
      ...current,
      attachments: current.attachments.map((attachment, attachmentIndex) => (attachmentIndex === index ? { ...attachment, ...updates } : attachment)),
    }))
  }

  const removeAttachmentDraft = (index: number) => {
    setLessonForm((current) => ({
      ...current,
      attachments: current.attachments.filter((_, attachmentIndex) => attachmentIndex !== index),
    }))
  }

  const resetLessonForm = () => {
    setLessonForm({
      subject_id: "",
      title: "",
      description: "",
      lesson_date: "",
      video_url: "",
      attachments: [{ file_name: "", file_url: "", file_kind: "pdf", file: null }],
    })
  }

  const saveLesson = async () => {
    if (!schoolId || !teacherId || !selectedClass) return
    if (!lessonForm.title.trim() || !lessonForm.lesson_date) {
      showToast(t("Please complete the lesson title and date."), "error")
      return
    }
    const subjectId = lessonForm.subject_id || assignedSubjectOptions[0]?.value || selectedLesson?.subject_id || selectedClass.lessons[0]?.subject_id || ""
    if (!subjectId) {
      showToast(t("No subject assigned yet."), "error")
      return
    }

    const attachments = lessonForm.attachments
      .map((attachment) => ({
        file_name: attachment.file_name.trim() || attachment.file?.name || "",
        file_url: attachment.file_url.trim(),
        file_kind: attachment.file_kind.trim() || "file",
        file: attachment.file,
      }))
      .filter((attachment) => attachment.file_name.length > 0 && (attachment.file_url.length > 0 || attachment.file))

    setCreatingLesson(true)
    const result = await dbLessons.createLesson({
      school_id: schoolId,
      class_id: selectedClass.id,
      subject_id: subjectId,
      teacher_id: teacherId,
      title: lessonForm.title.trim(),
      description: lessonForm.description.trim() || undefined,
      video_url: lessonForm.video_url.trim() || undefined,
      lesson_date: lessonForm.lesson_date,
    })
    if (result.error || !result.data) {
      setCreatingLesson(false)
      showToast(result.error ?? t("Could not create lesson."), "error")
      return
    }

    for (const attachment of attachments) {
      const storedPath = attachment.file ? await uploadLessonAttachment(schoolId, result.data.id, attachment.file) : attachment.file_url
      if (!storedPath) {
        showToast(t("Could not upload attachment. Please check the file and try again."), "error")
        break
      }
      const attachmentResult = await dbLessons.addAttachment(result.data.id, {
        file_name: attachment.file_name,
        file_url: storedPath,
        file_kind: attachment.file ? getAttachmentKind(attachment.file) : attachment.file_kind,
      })
      if (attachmentResult.error) {
        showToast(attachmentResult.error, "error")
        break
      }
    }

    await dbLessons.fetchLessons()
    setCreatingLesson(false)
    setShowCreateLesson(false)
    resetLessonForm()
    setSelectedLessonId(result.data.id)
    setView("detail")
    showToast(t("Lesson saved successfully."))
  }

  const openLessonEditor = () => {
    if (!selectedLesson) return
    setLessonForm({ subject_id: selectedLesson.subject_id, title: selectedLesson.title, description: selectedLesson.description ?? "", lesson_date: selectedLesson.lesson_date, video_url: selectedLesson.video_url ?? "", attachments: [] })
    setShowEditLesson(true)
  }

  const openCreateLesson = () => {
    setLessonForm((current) => ({
      ...current,
      subject_id: assignedSubjectOptions[0]?.value ?? "",
    }))
    setShowCreateLesson(true)
  }

  const saveLessonEdits = async () => {
    if (!selectedLesson || !lessonForm.title.trim() || !lessonForm.lesson_date) return
    setCreatingLesson(true)
    const result = await dbLessons.updateLesson(selectedLesson.id, {
      title: lessonForm.title.trim(), description: lessonForm.description.trim() || null,
      video_url: lessonForm.video_url.trim() || null, lesson_date: lessonForm.lesson_date,
    })
    setCreatingLesson(false)
    if (result.error) return showToast(result.error, "error")
    setShowEditLesson(false)
    showToast(t("Lesson updated successfully."))
  }

  const removeLesson = async () => {
    if (!selectedLesson || !window.confirm(t("Delete this lesson and hide all related content?"))) return
    for (const homework of selectedLessonHomework) {
      const homeworkResult = await dbHomework.deleteHomework(homework.id)
      if (homeworkResult.error) return showToast(homeworkResult.error, "error")
    }
    const result = await dbLessons.deleteLesson(selectedLesson.id)
    if (result.error) return showToast(result.error, "error")
    setSelectedLessonId(null)
    showToast(t("Lesson deleted successfully."))
  }

  const saveNewAttachments = async () => {
    if (!schoolId || !selectedLesson) return
    setCreatingLesson(true)
    for (const attachment of attachmentDrafts) {
      const name = attachment.file_name.trim() || attachment.file?.name || ""
      if (!name || (!attachment.file && !attachment.file_url.trim())) continue
      const path = attachment.file ? await uploadLessonAttachment(schoolId, selectedLesson.id, attachment.file) : attachment.file_url.trim()
      if (!path) { setCreatingLesson(false); return showToast(t("Could not upload attachment. Please check the file and try again."), "error") }
      const result = await dbLessons.addAttachment(selectedLesson.id, { file_name: name, file_url: path, file_kind: attachment.file ? getAttachmentKind(attachment.file) : attachment.file_kind || "file" })
      if (result.error) { setCreatingLesson(false); return showToast(result.error, "error") }
    }
    setCreatingLesson(false)
    setShowAddAttachments(false)
    setAttachmentDrafts([{ file_name: "", file_url: "", file_kind: "pdf", file: null }])
    showToast(t("Attachments added successfully."))
  }

  const removeAttachment = async (attachment: NonNullable<Lesson["lesson_attachments"]>[number]) => {
    if (!window.confirm(t("Remove this attachment?"))) return
    const result = await dbLessons.deleteAttachment(attachment)
    showToast(result.error ?? t("Attachment removed."), result.error ? "error" : "success")
  }

  const openHomeworkEditor = (item?: Homework) => setHomeworkEditor({
    id: item?.id ?? null, title: item?.title ?? "", due_date: item?.due_date?.slice(0, 10) ?? "",
    questions: item ? [] : [{ text: "", choices: ["", ""], correctIndex: 0 }],
  })

  const saveHomework = async () => {
    if (!schoolId || !selectedLesson || !homeworkEditor?.title.trim() || !homeworkEditor.due_date) return
    if (!homeworkEditor.id) {
      const incomplete = homeworkEditor.questions.length === 0 || homeworkEditor.questions.some((question) => {
        const nonEmptyChoices = question.choices.filter((choice) => choice.trim())
        return !question.text.trim() || nonEmptyChoices.length < 2 || !question.choices[question.correctIndex]?.trim()
      })
      if (incomplete) return showToast(t("Please complete every question with at least two choices and one correct answer."), "error")
    }
    setSavingHomework(true)
    const result = homeworkEditor.id
      ? await dbHomework.updateHomework(homeworkEditor.id, { title: homeworkEditor.title.trim(), due_date: homeworkEditor.due_date })
      : await dbHomework.createHomework({
          school_id: schoolId, lesson_id: selectedLesson.id, title: homeworkEditor.title.trim(), due_date: homeworkEditor.due_date,
          questions: homeworkEditor.questions.filter((question) => question.text.trim()).map((question, questionIndex) => ({
            question_text: question.text.trim(), sort_order: questionIndex,
            choices: question.choices.map((choice, originalIndex) => ({ choice, originalIndex })).filter(({ choice }) => choice.trim()).map(({ choice, originalIndex }, choiceIndex) => ({ choice_text: choice.trim(), is_correct: originalIndex === question.correctIndex, sort_order: choiceIndex })),
          })),
        })
    setSavingHomework(false)
    if (result.error) return showToast(result.error, "error")
    setHomeworkEditor(null)
    showToast(t(homeworkEditor.id ? "Homework updated." : "Homework created."))
  }

  const removeHomework = async (item: Homework) => {
    if (!window.confirm(t("Delete this homework?"))) return
    const result = await dbHomework.deleteHomework(item.id)
    showToast(result.error ?? t("Homework deleted."), result.error ? "error" : "success")
  }

  const saveAttendance = async () => {
    if (!schoolId || !teacherId || !selectedLesson) return
    const rows = selectedLessonStudentRows
      .map((student) => {
        const status = attendanceDraft[student.id]
        if (!status) return null
        return {
          school_id: schoolId,
          lesson_id: selectedLesson.id,
          student_id: student.id,
          status,
          recorded_by: teacherId,
        }
      })
      .filter(
        (
          row,
        ): row is {
          school_id: string
          lesson_id: string
          student_id: string
          status: AttendanceStatus
          recorded_by: string
        } => Boolean(row),
      )

    if (rows.length === 0) return

    setSavingAttendance(true)
    try {
      const result = await dbAttendance.bulkUpsertAttendance(rows)
      if (result.error) {
        showToast(result.error, "error")
        return
      }
      showToast(t("Attendance saved"))
    } catch (error) {
      // A failed refresh must not unmount the teacher's class page after saving.
      showToast(error instanceof Error ? error.message : t("Could not save attendance."), "error")
    } finally {
      setSavingAttendance(false)
    }
  }

  const initialLoading =
    (dbLessons.loading && dbLessons.lessons.length === 0) ||
    (dbHomework.loading && dbHomework.homework.length === 0) ||
    (dbTests.loading && dbTests.tests.length === 0) ||
    (dbAttendance.loading && dbAttendance.records.length === 0) ||
    (dbClasses.loading && dbClasses.classes.length === 0) ||
    (dbEnrollments.loading && dbEnrollments.enrollments.length === 0)

  if (initialLoading) {
    return <LoadingState label="Loading class data..." />
  }

  if (!schoolId || !teacherId) {
    return <EmptyState title="No teacher context" description="Sign in again to load your classes from Supabase." />
  }

  if (!liveClasses.length) {
    return <EmptyState title="No class data yet" description="Your classes, lessons, homework, tests, and enrollments will appear here automatically from Supabase." />
  }

  if (view === "detail" && selectedClass) {
    return (
      <>
        <div className="space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <button onClick={() => setView("list")} className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm transition-colors hover:bg-gray-50">
                <ChevronLeft className="h-5 w-5 text-[#3F434A]" />
              </button>
              <div>
                <h2 className="text-[20px] font-semibold text-[#0E1B4A]">
                  {selectedClass.gradeName} • {selectedClass.name} • {selectedClass.subjectLabel}
                </h2>
                <p className="mt-1 text-xs text-[#999]">
                  {selectedClass.studentCount} {t("Students")} • {selectedClass.lessons.length} {t("Lessons")} • {selectedClass.homework.length} {t("Homework")} • {selectedClass.assessments.length}{" "}
                  {t("Tasks")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
              <Btn onClick={openCreateLesson} icon={<Plus className="h-4 w-4" />}>
                {t("Add Lesson")}
              </Btn>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-5">
            <div className="col-span-4 space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#0E1B4A]">{t("Record Attendance")}</h3>
                    <p className="mt-1 text-xs text-[#8B8FA3]">{t("Mark attendance for the selected lesson, then save it to Supabase.")}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Btn size="sm" variant="secondary" onClick={() => markAllAttendance("present")}>
                      {t("Mark all present")}
                    </Btn>
                    <Btn size="sm" onClick={() => void saveAttendance()} disabled={savingAttendance || !selectedLesson}>
                      {savingAttendance ? t("Saving...") : t("Save Attendance")}
                    </Btn>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-[#EDE5F5] bg-[#FCFAFE] p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-xs font-semibold text-[#563B72]">
                        <Calendar className="h-4 w-4 text-[#955AC3]" /> {t("Attendance dates")}
                      </p>
                      {selectedLesson && <span className="text-[11px] font-medium text-[#7D668F]">{formatDate(selectedLesson.lesson_date, locale)}</span>}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {attendanceDays.map((day) => {
                        const active = day.lessons.some((lesson) => lesson.id === selectedLesson?.id)
                        const date = new Date(`${day.date}T00:00:00`)
                        return (
                          <button
                            key={day.date}
                            type="button"
                            onClick={() => setSelectedLessonId(day.lessons[0].id)}
                            className={`min-w-[76px] rounded-xl border px-3 py-2 text-center transition-all ${
                              active ? "border-[#955AC3] bg-[#955AC3] text-white shadow-sm" : "border-[#E8DEF0] bg-white text-[#675376] hover:border-[#CDA9E8]"
                            }`}
                          >
                            <span className={`block text-[10px] font-medium ${active ? "text-white/80" : "text-[#8B779A]"}`}>{date.toLocaleDateString(locale, { weekday: "short" })}</span>
                            <span className="block text-lg font-bold leading-5">{date.toLocaleDateString(locale, { day: "numeric" })}</span>
                            <span className={`mt-1 block text-[10px] ${active ? "text-white/85" : "text-[#9A87A8]"}`}>{day.date === today ? t("Today") : `${day.lessons.length} ${t("Lessons")}`}</span>
                          </button>
                        )
                      })}
                      {attendanceDays.length === 0 && <p className="px-2 py-3 text-xs text-[#8B779A]">{t("No lessons scheduled")}</p>}
                    </div>
                  </div>
                  {selectedLessonStudentRows.map((student) => {
                    const currentStatus = attendanceDraft[student.id]
                    return (
                      <div key={student.id} className="flex flex-col gap-3 rounded-xl border border-[#EFE7F7] bg-[#FBF9FE] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar name={student.name} size="sm" />
                          <div>
                            <p className="text-sm font-semibold text-[#0E1B4A]">{student.name}</p>
                            <p className="text-xs text-[#8B8FA3]">{selectedLessonAttendanceMap.get(student.id) ? t("Saved in this lesson") : t("Not marked yet")}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: "present" as const, label: t("Present"), active: "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]" },
                            { value: "late" as const, label: t("Late"), active: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]" },
                            { value: "absent" as const, label: t("Absent"), active: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]" },
                            { value: "excused" as const, label: t("Excused"), active: "bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]" },
                          ].map((status) => (
                            <button
                              key={`${student.id}-${status.value}`}
                              type="button"
                              onClick={() =>
                                setAttendanceDraft((current) => ({
                                  ...current,
                                  [student.id]: current[student.id] === status.value ? "" : status.value,
                                }))
                              }
                              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                                currentStatus === status.value ? status.active : "border-[#E4E7EC] bg-white text-[#667085] hover:border-[#D6B9EA] hover:text-[#955AC3]"
                              }`}
                            >
                              {status.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {selectedLessonStudentRows.length === 0 && <EmptyState title="No enrolled students" description="Active students in this class will appear here for attendance recording." />}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                  <h3 className="text-[15px] font-semibold text-[#0E1B4A]">{t("Lessons")}</h3>
                  <span className="rounded-full bg-[#F5F0FF] px-2.5 py-1 text-xs font-medium text-[#955AC3]">
                    {selectedClass.lessons.length} {t("Total")}
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {selectedClass.lessons.map((lesson, index) => {
                    const kind = lessonKind(lesson)
                    const active = lesson.id === selectedLesson?.id
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setSelectedLessonId(lesson.id)}
                        className={`flex w-full items-center gap-3 px-5 py-4 text-left transition-colors ${active ? "bg-[#F8F4FF]" : "hover:bg-gray-50"}`}
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
                        {selectedClass.homework.some((item) => item.lesson_id === lesson.id) && <Badge color="purple">HW</Badge>}
                      </button>
                    )
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
                  {selectedLesson && <div className="flex flex-wrap items-center justify-end gap-2">
                    <Badge color="purple">{lessonKind(selectedLesson) === "video" ? t("Video") : lessonKind(selectedLesson) === "pdf" ? "PDF" : t("Lesson")}</Badge>
                    <Btn size="sm" variant="secondary" onClick={openLessonEditor}><Edit className="h-3.5 w-3.5" /> {t("Edit Lesson")}</Btn>
                    <Btn size="sm" variant="secondary" onClick={() => void removeLesson()}><Trash2 className="h-3.5 w-3.5" /> {t("Delete Lesson")}</Btn>
                  </div>}
                </div>
                {selectedLesson?.description && <p className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm leading-6 text-[#344054]">{selectedLesson.description}</p>}
                {selectedLessonVideoUrl && <div className="mt-4"><LessonLinkPreview url={selectedLessonVideoUrl} /></div>}
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[#955AC3]" />
                    <h3 className="text-[15px] font-semibold text-[#0E1B4A]">{t("Attachments")}</h3></div>
                    {selectedLesson && <button type="button" onClick={() => { setAttachmentDrafts([{ file_name: "", file_url: "", file_kind: "pdf", file: null }]); setShowAddAttachments(true) }} className="text-xs font-semibold text-[#955AC3]"><Plus className="me-1 inline h-3.5 w-3.5" />{t("Add")}</button>}
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
                        <button type="button" onClick={() => void removeAttachment(attachment)} className="ms-3 mt-3 inline-flex text-xs font-semibold text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                    {(selectedLesson?.lesson_attachments?.length ?? 0) === 0 && <EmptyState title="No lesson files" description="Lesson attachments from Supabase will appear here." />}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#10B981]" />
                    <h3 className="text-[15px] font-semibold text-[#0E1B4A]">{t("Homework")}</h3></div>
                    {selectedLesson && <button type="button" onClick={() => openHomeworkEditor()} className="text-xs font-semibold text-[#10B981]"><Plus className="me-1 inline h-3.5 w-3.5" />{t("Create")}</button>}
                  </div>
                  <div className="space-y-3">
                    {selectedLessonHomework.map((item) => (
                      <div key={item.id} className="rounded-xl border border-[#DFF6EC] bg-[#F3FFF8] p-3">
                        <p className="truncate text-sm font-semibold text-[#0E1B4A]">{item.title}</p>
                        <div className="mt-2 flex items-center justify-between text-xs text-[#2B7A5E]">
                          <span>
                            {item.homework_questions?.length ?? 0} {language === "ar" ? "أسئلة" : "questions"}
                          </span>
                          <span>
                            {item.homework_submissions?.length ?? 0} {t("Submitted")}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[#5D7A70]">
                          {t("Due")} {formatDateTime(item.due_date, locale)}
                        </p>
                        <div className="mt-3 flex gap-3">
                          <button type="button" onClick={() => openHomeworkEditor(item)} className="text-xs font-semibold text-[#2B7A5E]"><Edit className="me-1 inline h-3.5 w-3.5" />{t("Edit")}</button>
                          <button type="button" onClick={() => void removeHomework(item)} className="text-xs font-semibold text-red-600"><Trash2 className="me-1 inline h-3.5 w-3.5" />{t("Delete")}</button>
                        </div>
                      </div>
                    ))}
                    {selectedLessonHomework.length === 0 && <EmptyState title="No homework yet" description="Homework linked to this lesson will appear here from Supabase." />}
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
                              <span className="rounded bg-[#F5F0FF] px-2 py-1 text-xs font-semibold text-[#6E5D8B]">{index + 1}</span>
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

        {showCreateLesson && (
          <Modal title={t("Create Lesson")} onClose={() => setShowCreateLesson(false)}>
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-secondary/20 p-4">
                <p className="text-sm font-bold text-foreground">{t("Create Lesson")}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {language === "ar"
                    ? "أضف درسًا جديدًا مع رابط فيديو ومرفقات وروابط ملفات حتى يظهر للطلاب مباشرة."
                    : "Add a new lesson with a video link and file attachments so students can access it right away."}
                </p>
              </div>

              <Select
                label={t("Subject")}
                value={lessonForm.subject_id}
                onChange={(value) => setLessonForm((current) => ({ ...current, subject_id: value }))}
                options={assignedSubjectOptions}
                required
              />
              <Input label={t("Lesson Title")} value={lessonForm.title} onChange={(value) => setLessonForm((current) => ({ ...current, title: value }))} required />
              <Input label={t("Lesson Date")} type="date" value={lessonForm.lesson_date} onChange={(value) => setLessonForm((current) => ({ ...current, lesson_date: value }))} required />
              <Input label={t("Lesson Description")} value={lessonForm.description} onChange={(value) => setLessonForm((current) => ({ ...current, description: value }))} />
              <Input
                label={t("Video URL")}
                value={lessonForm.video_url}
                onChange={(value) => setLessonForm((current) => ({ ...current, video_url: value }))}
                placeholder={language === "ar" ? "رابط الفيديو" : "Video link"}
              />

              <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{t("Attachments")}</h4>
                    <p className="text-xs text-muted-foreground">
                      {language === "ar"
                        ? "يمكنك إضافة ملف PDF أو صورة أو أي رابط مرفق آخر."
                        : "Upload a file from your device or add an external link. Uploaded files are saved securely in the system."}
                    </p>
                  </div>
                  <Btn type="button" variant="secondary" size="sm" onClick={addAttachmentDraft}>
                    {t("Add Attachment")}
                  </Btn>
                </div>
                <div className="space-y-4">
                  {lessonForm.attachments.map((attachment, index) => (
                    <div key={`attachment-${index}`} className="rounded-xl border border-border bg-card p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">
                          {t("Attachment")} {index + 1}
                        </p>
                        {lessonForm.attachments.length > 1 && (
                          <button type="button" onClick={() => removeAttachmentDraft(index)} className="text-xs font-semibold text-destructive hover:opacity-80">
                            {t("Remove")}
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <Input label={t("Attachment Name")} value={attachment.file_name} onChange={(value) => updateAttachmentDraft(index, { file_name: value })} />
                        <Input label={t("Attachment URL")} value={attachment.file_url} onChange={(value) => updateAttachmentDraft(index, { file_url: value })} />
                        <Input label={t("Attachment Type")} value={attachment.file_kind} onChange={(value) => updateAttachmentDraft(index, { file_kind: value })} />
                      </div>
                      <div className="mt-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3">
                        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-primary">
                          <span className="flex items-center gap-2">
                            <Upload className="h-4 w-4" /> {t("Upload file")}
                          </span>
                          <input
                            type="file"
                            className="sr-only"
                            accept=".pdf,image/*,video/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null
                              if (!file) return
                              updateAttachmentDraft(index, {
                                file,
                                file_name: attachment.file_name || file.name,
                                file_kind: getAttachmentKind(file),
                              })
                            }}
                          />
                          <span className="text-xs text-muted-foreground">{attachment.file?.name ?? t("No file selected")}</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Btn onClick={() => void saveLesson()} className="flex-1" disabled={creatingLesson}>
                  {creatingLesson ? t("Saving...") : t("Save Lesson")}
                </Btn>
                <Btn variant="secondary" onClick={() => setShowCreateLesson(false)}>
                  {t("Cancel")}
                </Btn>
              </div>
            </div>
          </Modal>
        )}

        {showEditLesson && (
          <Modal title={t("Edit Lesson")} onClose={() => setShowEditLesson(false)}>
            <div className="space-y-4">
              <Input label={t("Lesson Title")} value={lessonForm.title} onChange={(value) => setLessonForm((current) => ({ ...current, title: value }))} required />
              <Input label={t("Lesson Date")} type="date" value={lessonForm.lesson_date} onChange={(value) => setLessonForm((current) => ({ ...current, lesson_date: value }))} required />
              <Input label={t("Lesson Description")} value={lessonForm.description} onChange={(value) => setLessonForm((current) => ({ ...current, description: value }))} />
              <Input label={t("Video URL")} value={lessonForm.video_url} onChange={(value) => setLessonForm((current) => ({ ...current, video_url: value }))} />
              <div className="flex gap-3"><Btn onClick={() => void saveLessonEdits()} className="flex-1" disabled={creatingLesson}>{creatingLesson ? t("Saving...") : t("Save Changes")}</Btn><Btn variant="secondary" onClick={() => setShowEditLesson(false)}>{t("Cancel")}</Btn></div>
            </div>
          </Modal>
        )}

        {showAddAttachments && (
          <Modal title={t("Add Attachment")} onClose={() => setShowAddAttachments(false)}>
            <div className="space-y-4">
              {attachmentDrafts.map((attachment, index) => (
                <div key={index} className="space-y-3 rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between"><strong className="text-sm">{t("Attachment")} {index + 1}</strong>{attachmentDrafts.length > 1 && <button type="button" className="text-xs text-red-600" onClick={() => setAttachmentDrafts((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}>{t("Remove")}</button>}</div>
                  <Input label={t("Attachment Name")} value={attachment.file_name} onChange={(value) => setAttachmentDrafts((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, file_name: value } : row))} />
                  <Input label={t("Attachment URL")} value={attachment.file_url} onChange={(value) => setAttachmentDrafts((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, file_url: value } : row))} />
                  <Input label={t("Attachment Type")} value={attachment.file_kind} onChange={(value) => setAttachmentDrafts((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, file_kind: value } : row))} />
                  <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 text-sm font-semibold text-primary"><span><Upload className="me-2 inline h-4 w-4" />{t("Upload file")}</span><input type="file" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) setAttachmentDrafts((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, file, file_name: row.file_name || file.name, file_kind: getAttachmentKind(file) } : row)) }} /><span className="text-xs text-muted-foreground">{attachment.file?.name ?? t("No file selected")}</span></label>
                </div>
              ))}
              <Btn type="button" variant="secondary" onClick={() => setAttachmentDrafts((rows) => [...rows, { file_name: "", file_url: "", file_kind: "pdf", file: null }])}><Plus className="h-4 w-4" />{t("Add Attachment")}</Btn>
              <div className="flex gap-3"><Btn onClick={() => void saveNewAttachments()} className="flex-1" disabled={creatingLesson}>{creatingLesson ? t("Saving...") : t("Save")}</Btn><Btn variant="secondary" onClick={() => setShowAddAttachments(false)}>{t("Cancel")}</Btn></div>
            </div>
          </Modal>
        )}

        {homeworkEditor && (
          <Modal title={t(homeworkEditor.id ? "Edit Homework" : "Create Homework")} onClose={() => setHomeworkEditor(null)}>
            <div className="space-y-4">
              <Input label={t("Homework Title")} value={homeworkEditor.title} onChange={(value) => setHomeworkEditor((current) => current ? { ...current, title: value } : current)} required />
              <Input label={t("Deadline Date")} type="date" value={homeworkEditor.due_date} onChange={(value) => setHomeworkEditor((current) => current ? { ...current, due_date: value } : current)} required />
              {!homeworkEditor.id && <div className="space-y-4">
                {homeworkEditor.questions.map((question, questionIndex) => <div key={questionIndex} className="space-y-3 rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between"><strong className="text-sm">{t("Question")} {questionIndex + 1}</strong>{homeworkEditor.questions.length > 1 && <button type="button" className="text-xs text-red-600" onClick={() => setHomeworkEditor((current) => current ? { ...current, questions: current.questions.filter((_, index) => index !== questionIndex) } : current)}>{t("Remove")}</button>}</div>
                  <Input label={t("Question text")} value={question.text} onChange={(value) => setHomeworkEditor((current) => current ? { ...current, questions: current.questions.map((row, index) => index === questionIndex ? { ...row, text: value } : row) } : current)} />
                  {question.choices.map((choice, choiceIndex) => <div key={choiceIndex} className="flex items-end gap-2"><input type="radio" aria-label={t("Correct Answer")} checked={question.correctIndex === choiceIndex} onChange={() => setHomeworkEditor((current) => current ? { ...current, questions: current.questions.map((row, index) => index === questionIndex ? { ...row, correctIndex: choiceIndex } : row) } : current)} className="mb-3" /><div className="flex-1"><Input label={`${t("Choice")} ${choiceIndex + 1}`} value={choice} onChange={(value) => setHomeworkEditor((current) => current ? { ...current, questions: current.questions.map((row, index) => index === questionIndex ? { ...row, choices: row.choices.map((item, itemIndex) => itemIndex === choiceIndex ? value : item) } : row) } : current)} /></div>{question.choices.length > 2 && <button type="button" className="mb-3 text-red-600" onClick={() => setHomeworkEditor((current) => current ? { ...current, questions: current.questions.map((row, index) => index === questionIndex ? { ...row, choices: row.choices.filter((_, itemIndex) => itemIndex !== choiceIndex), correctIndex: 0 } : row) } : current)}><Trash2 className="h-4 w-4" /></button>}</div>)}
                  <button type="button" className="text-xs font-semibold text-primary" onClick={() => setHomeworkEditor((current) => current ? { ...current, questions: current.questions.map((row, index) => index === questionIndex ? { ...row, choices: [...row.choices, ""] } : row) } : current)}><Plus className="me-1 inline h-3.5 w-3.5" />{t("Add Choice")}</button>
                </div>)}
                <Btn variant="secondary" onClick={() => setHomeworkEditor((current) => current ? { ...current, questions: [...current.questions, { text: "", choices: ["", ""], correctIndex: 0 }] } : current)}><Plus className="h-4 w-4" />{t("Add Question")}</Btn>
              </div>}
              {homeworkEditor.id && <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">{t("Existing questions remain unchanged to protect student submissions.")}</p>}
              <div className="flex gap-3"><Btn onClick={() => void saveHomework()} className="flex-1" disabled={savingHomework}>{savingHomework ? t("Saving...") : t("Save")}</Btn><Btn variant="secondary" onClick={() => setHomeworkEditor(null)}>{t("Cancel")}</Btn></div>
            </div>
          </Modal>
        )}

        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </>
    )
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
          const latestLesson = item.lessons[0] ?? null
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
                    <p className="text-[18px] font-bold leading-none" style={{ color: item.color }}>
                      {item.lessons.length}
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium" style={{ color: item.color }}>
                      {t("Lessons")}
                    </p>
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
                      <p className="truncate text-xs font-semibold text-[#0E1B4A]">
                        {t("Latest")}: {latestLesson.title}
                      </p>
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
                    setSelectedClassId(item.id)
                    setView("detail")
                  }}
                >
                  <Eye className="h-3.5 w-3.5" /> {t("View Class")}
                </button>
                <button
                  className="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors hover:bg-gray-50"
                  style={{ color: item.color }}
                  onClick={() => {
                    setSelectedClassId(item.id)
                    setSelectedLessonId(item.lessons[0]?.id ?? null)
                    setView("detail")
                  }}
                >
                  <Calendar className="h-3.5 w-3.5" /> {t("Open Latest Lesson")}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
