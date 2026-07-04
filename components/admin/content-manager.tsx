"use client"

import { useCallback, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Clock,
  ListChecks,
  Award,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  GripVertical,
} from "lucide-react"
import { toast } from "sonner"
import {
  upsertCourse,
  deleteCourse,
  toggleCoursePublished,
  upsertTask,
  deleteTask,
  upsertModule,
  deleteModule,
  upsertLesson,
  deleteLesson,
  saveTaskQuestions,
} from "@/lib/actions/admin"
import type { CourseWithTasks, ModuleWithLessons, TaskWithQuestions } from "@/lib/actions/admin"
import type { Course, Lesson, Task, TaskQuestion, TaskOption } from "@/lib/types"

// ---- local draft types for the MCQ builder ----
type DraftOption = { localId: string; text: string; is_correct: boolean }
type DraftQuestion = { localId: string; question: string; options: DraftOption[] }

function makeId() {
  return Math.random().toString(36).slice(2)
}

function emptyQuestion(): DraftQuestion {
  return {
    localId: makeId(),
    question: "",
    options: [
      { localId: makeId(), text: "", is_correct: false },
      { localId: makeId(), text: "", is_correct: false },
      { localId: makeId(), text: "", is_correct: false },
      { localId: makeId(), text: "", is_correct: false },
    ],
  }
}

// ---- MCQ builder sub-component ----
function McqBuilder({
  taskId,
  taskTitle,
  initial,
  onClose,
}: {
  taskId: string
  taskTitle: string
  initial: (TaskQuestion & { options: TaskOption[] })[]
  onClose: () => void
}) {
  const [questions, setQuestions] = useState<DraftQuestion[]>(() =>
    initial.length
      ? initial.map((q) => ({
          localId: q.id,
          question: q.question,
          options: q.options.map((o) => ({
            localId: o.id,
            text: o.text,
            is_correct: o.is_correct,
          })),
        }))
      : [emptyQuestion()],
  )
  const [pending, start] = useTransition()

  const setQuestion = useCallback((idx: number, val: string) => {
    setQuestions((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], question: val }
      return next
    })
  }, [])

  const setOption = useCallback((qi: number, oi: number, val: string) => {
    setQuestions((prev) => {
      const next = [...prev]
      const opts = [...next[qi].options]
      opts[oi] = { ...opts[oi], text: val }
      next[qi] = { ...next[qi], options: opts }
      return next
    })
  }, [])

  const setCorrect = useCallback((qi: number, oi: number) => {
    setQuestions((prev) => {
      const next = [...prev]
      // single-correct per question
      const opts = next[qi].options.map((o, i) => ({ ...o, is_correct: i === oi }))
      next[qi] = { ...next[qi], options: opts }
      return next
    })
  }, [])

  const addOption = useCallback((qi: number) => {
    setQuestions((prev) => {
      const next = [...prev]
      next[qi] = {
        ...next[qi],
        options: [...next[qi].options, { localId: makeId(), text: "", is_correct: false }],
      }
      return next
    })
  }, [])

  const removeOption = useCallback((qi: number, oi: number) => {
    setQuestions((prev) => {
      const next = [...prev]
      const opts = next[qi].options.filter((_, i) => i !== oi)
      next[qi] = { ...next[qi], options: opts }
      return next
    })
  }, [])

  const addQuestion = useCallback(() => {
    setQuestions((prev) => [...prev, emptyQuestion()])
  }, [])

  const removeQuestion = useCallback((idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const save = useCallback(() => {
    for (const q of questions) {
      if (!q.question.trim()) { toast.error("Every question needs text."); return }
      if (q.options.length < 2) { toast.error("Every question needs at least 2 options."); return }
      const hasCorrect = q.options.some((o) => o.is_correct)
      if (!hasCorrect) { toast.error(`Mark a correct answer for: "${q.question.slice(0, 40)}"`); return }
      for (const o of q.options) {
        if (!o.text.trim()) { toast.error("All answer options must have text."); return }
      }
    }

    start(async () => {
      const payload = questions.map((q, qi) => ({
        question: q.question.trim(),
        position: qi,
        options: q.options.map((o, oi) => ({
          text: o.text.trim(),
          is_correct: o.is_correct,
          position: oi,
        })),
      }))
      const res = await saveTaskQuestions(taskId, payload)
      if (res?.error) toast.error(res.error)
      else { toast.success("Questions saved"); onClose() }
    })
  }, [questions, taskId, onClose])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Building MCQ for: <span className="font-medium text-foreground">{taskTitle}</span>
      </p>

      <div className="max-h-[55vh] space-y-5 overflow-y-auto pr-1">
        {questions.map((q, qi) => (
          <div key={q.localId} className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <GripVertical className="mt-2 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Question {qi + 1}
                  </Label>
                  {questions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 text-destructive hover:text-destructive"
                      onClick={() => removeQuestion(qi)}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      <span className="sr-only">Remove question</span>
                    </Button>
                  )}
                </div>
                <Textarea
                  value={q.question}
                  onChange={(e) => setQuestion(qi, e.target.value)}
                  placeholder="Type your question here..."
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>

            <div className="space-y-2 pl-6">
              <p className="text-xs font-medium text-muted-foreground">
                Answer options — click the circle to mark correct
              </p>
              {q.options.map((o, oi) => (
                <div key={o.localId} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCorrect(qi, oi)}
                    aria-label={o.is_correct ? "Correct answer" : "Mark as correct"}
                    className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {o.is_correct
                      ? <CheckCircle2 className="size-5 text-primary" />
                      : <Circle className="size-5" />}
                  </button>
                  <Input
                    value={o.text}
                    onChange={(e) => setOption(qi, oi, e.target.value)}
                    placeholder={`Option ${oi + 1}`}
                    className="h-8 text-sm"
                  />
                  {q.options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => removeOption(qi, oi)}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      <span className="sr-only">Remove option</span>
                    </Button>
                  )}
                </div>
              ))}
              {q.options.length < 6 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs pl-0"
                  onClick={() => addOption(qi)}
                >
                  <Plus className="size-3.5" aria-hidden="true" /> Add option
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addQuestion} className="w-full">
        <Plus className="size-4" aria-hidden="true" /> Add question
      </Button>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="button" disabled={pending} onClick={save}>
          {pending ? "Saving..." : "Save questions"}
        </Button>
      </div>
    </div>
  )
}

// ---- Main ContentManager ----
export function ContentManager({ courses }: { courses: CourseWithTasks[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<CourseWithTasks | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleteFor, setDeleteFor] = useState<Course | null>(null)
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null)
  const [editingModule, setEditingModule] = useState<{ module: ModuleWithLessons | null; courseId: string } | null>(null)
  const [deleteModule_, setDeleteModule_] = useState<ModuleWithLessons | null>(null)
  const [editingLesson, setEditingLesson] = useState<{ lesson: Lesson | null; moduleId: string; courseId: string } | null>(null)
  const [deleteLesson_, setDeleteLesson_] = useState<Lesson | null>(null)
  const [editingTask, setEditingTask] = useState<{ task: TaskWithQuestions | null; courseId: string } | null>(null)
  const [deleteTask_, setDeleteTask_] = useState<Task | null>(null)
  const [mcqFor, setMcqFor] = useState<TaskWithQuestions | null>(null)
  const [pending, startTransition] = useTransition()

  const run = useCallback(
    (fn: () => Promise<{ error?: string; success?: boolean }>, ok: string, onDone?: () => void) => {
      startTransition(async () => {
        const res = await fn()
        if (res?.error) toast.error(res.error)
        else { toast.success(ok); onDone?.(); router.refresh() }
      })
    },
    [router],
  )

  const editingTaskCourse = useMemo(
    () => courses.find((c) => c.id === editingTask?.courseId) ?? null,
    [courses, editingTask?.courseId],
  )

  const editingLessonModule = useMemo(
    () => courses.flatMap((c) => c.modules).find((module) => module.id === editingLesson?.moduleId) ?? null,
    [courses, editingLesson?.moduleId],
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden="true" /> New course
        </Button>
      </div>

      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No courses yet. Create one above.</p>
      ) : (
        <div className="space-y-3">
          {courses.map((c) => (
            <Card key={c.id}>
              <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 pb-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base text-balance">{c.title}</CardTitle>
                    <Badge variant={c.published ? "default" : "secondary"}>
                      {c.published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {c.duration_hours ? (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" aria-hidden="true" />
                        {c.duration_hours}h
                      </span>
                    ) : null}
                    {c.category ? <span>{c.category}</span> : null}
                    {c.level ? <Badge variant="outline" className="text-xs">{c.level}</Badge> : null}
                    <span className="flex items-center gap-1">
                      <ListChecks className="size-3" aria-hidden="true" />
                      {c.tasks.length} task{c.tasks.length !== 1 ? "s" : ""}
                    </span>
                    <span>
                      {c.modules.length} module{c.modules.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {c.course_link ? (
                    <a
                      href={c.course_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                    >
                      <ExternalLink className="size-3" aria-hidden="true" /> Course link
                    </a>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                    <Pencil className="size-3.5" aria-hidden="true" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      run(
                        () => toggleCoursePublished(c.id, !c.published),
                        c.published ? "Unpublished" : "Published",
                      )
                    }
                    disabled={pending}
                  >
                    {c.published ? "Unpublish" : "Publish"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExpandedCourse(expandedCourse === c.id ? null : c.id)}
                    aria-expanded={expandedCourse === c.id}
                  >
                    {expandedCourse === c.id
                      ? <ChevronDown className="size-3.5" aria-hidden="true" />
                      : <ChevronRight className="size-3.5" aria-hidden="true" />}
                    Tasks ({c.tasks.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteFor(c)}
                    disabled={pending}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" /> Delete
                  </Button>
                </div>

                {expandedCourse === c.id && (
                  <div className="space-y-2 pt-2">
                    <Separator />
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Modules &amp; lessons</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingModule({ module: null, courseId: c.id })}
                      >
                        <Plus className="size-3.5" aria-hidden="true" /> Add module
                      </Button>
                    </div>

                    {c.modules.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No modules yet. Add a module, then add lessons inside it.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {c.modules.map((module, moduleIndex) => (
                          <div key={module.id} className="rounded-lg border border-border bg-background px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {moduleIndex + 1}. {module.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {module.lessons.length} lesson{module.lessons.length !== 1 ? "s" : ""}
                                </p>
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => setEditingLesson({ lesson: null, moduleId: module.id, courseId: c.id })}
                                >
                                  <Plus className="size-3.5" aria-hidden="true" /> Lesson
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7"
                                  onClick={() => setEditingModule({ module, courseId: c.id })}
                                >
                                  <Pencil className="size-3.5" aria-hidden="true" />
                                  <span className="sr-only">Edit module</span>
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteModule_(module)}
                                >
                                  <Trash2 className="size-3.5" aria-hidden="true" />
                                  <span className="sr-only">Delete module</span>
                                </Button>
                              </div>
                            </div>

                            {module.lessons.length > 0 ? (
                              <div className="mt-2 space-y-1 border-t pt-2">
                                {module.lessons.map((lesson, lessonIndex) => (
                                  <div key={lesson.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm">
                                        {moduleIndex + 1}.{lessonIndex + 1} {lesson.title}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {lesson.duration_minutes ? `${lesson.duration_minutes}m` : "No duration"}
                                      </p>
                                    </div>
                                    <div className="flex shrink-0 gap-1">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="size-7"
                                        onClick={() => setEditingLesson({ lesson, moduleId: module.id, courseId: c.id })}
                                      >
                                        <Pencil className="size-3.5" aria-hidden="true" />
                                        <span className="sr-only">Edit lesson</span>
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="size-7 text-destructive hover:text-destructive"
                                        onClick={() => setDeleteLesson_(lesson)}
                                      >
                                        <Trash2 className="size-3.5" aria-hidden="true" />
                                        <span className="sr-only">Delete lesson</span>
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}

                    <Separator />
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Tasks</p>
                      <Button
                        size="sm"
                        onClick={() => setEditingTask({ task: null, courseId: c.id })}
                      >
                        <Plus className="size-3.5" aria-hidden="true" /> Add task
                      </Button>
                    </div>

                    {c.tasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No tasks yet. Add one above.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {c.tasks.map((t, idx) => {
                          const lesson = c.modules.flatMap((module) => module.lessons).find((item) => item.id === t.lesson_id)
                          return (
                          <div
                            key={t.id}
                            className="rounded-lg border border-border bg-muted/30 px-3 py-2 space-y-1.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-xs tabular-nums text-muted-foreground">
                                    #{idx + 1}
                                  </span>
                                  {t.is_capstone && (
                                    <Badge variant="default" className="gap-1 text-xs">
                                      <Award className="size-3" aria-hidden="true" /> Capstone
                                    </Badge>
                                  )}
                                  <span className="text-sm font-medium">{t.title}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {t.max_points} pts
                                  {lesson ? ` · Lesson: ${lesson.title}` : " · Course-level"}
                                  {t.due_date ? ` · Due ${t.due_date}` : ""}
                                  {" · "}
                                  <span
                                    className={
                                      t.questions.length > 0
                                        ? "text-primary font-medium"
                                        : "text-amber-600"
                                    }
                                  >
                                    {t.questions.length} question{t.questions.length !== 1 ? "s" : ""}
                                  </span>
                                </p>
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => setMcqFor(t)}
                                >
                                  <ListChecks className="size-3.5" aria-hidden="true" />
                                  {t.questions.length > 0 ? "Edit MCQ" : "Add MCQ"}
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7"
                                  onClick={() => setEditingTask({ task: t, courseId: c.id })}
                                >
                                  <Pencil className="size-3.5" aria-hidden="true" />
                                  <span className="sr-only">Edit task</span>
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteTask_(t)}
                                >
                                  <Trash2 className="size-3.5" aria-hidden="true" />
                                  <span className="sr-only">Delete task</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ---- Course create/edit dialog ---- */}
      <Dialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null) } }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit course" : "New course"}</DialogTitle>
            <DialogDescription>
              Fill in course details. Published courses are visible to students.
            </DialogDescription>
          </DialogHeader>
          <form
            action={(fd) => {
              run(
                () => upsertCourse(fd),
                editing ? "Course updated" : "Course created",
                () => { setCreating(false); setEditing(null) },
              )
            }}
            className="space-y-4"
          >
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" defaultValue={editing?.title ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course_link">Course link (URL)</Label>
              <Input
                id="course_link"
                name="course_link"
                type="url"
                placeholder="https://..."
                defaultValue={editing?.course_link ?? ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="duration_hours">Duration (hours)</Label>
                <Input
                  id="duration_hours"
                  name="duration_hours"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="e.g. 6.5"
                  defaultValue={editing?.duration_hours ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <Input
                  id="level"
                  name="level"
                  placeholder="Beginner / Advanced"
                  defaultValue={editing?.level ?? ""}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" defaultValue={editing?.category ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={editing?.description ?? ""}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="objectives">Learning objectives (one per line)</Label>
              <Textarea
                id="objectives"
                name="objectives"
                rows={4}
                placeholder={"Understand core concepts\nBuild a project\nPass the capstone"}
                defaultValue={editing?.objectives?.join("\n") ?? ""}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="published"
                value="true"
                defaultChecked={editing?.published ?? false}
                className="size-4 rounded border-input"
              />
              Published (visible to students)
            </label>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {editing ? "Save changes" : "Create course"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---- Module create/edit dialog ---- */}
      <Dialog
        open={!!editingModule}
        onOpenChange={(o) => { if (!o) setEditingModule(null) }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingModule?.module ? "Edit module" : "New module"}</DialogTitle>
            <DialogDescription>
              Modules group lessons inside a course.
            </DialogDescription>
          </DialogHeader>
          <form
            action={(fd) => {
              run(
                () => upsertModule(fd),
                editingModule?.module ? "Module updated" : "Module added",
                () => setEditingModule(null),
              )
            }}
            className="space-y-4"
          >
            <input type="hidden" name="course_id" value={editingModule?.courseId ?? ""} />
            {editingModule?.module && <input type="hidden" name="id" value={editingModule.module.id} />}
            <input
              type="hidden"
              name="position"
              value={
                editingModule?.module?.position ??
                courses.find((course) => course.id === editingModule?.courseId)?.modules.length ?? 0
              }
            />
            <div className="space-y-2">
              <Label htmlFor="module-title">Module title *</Label>
              <Input
                id="module-title"
                name="title"
                defaultValue={editingModule?.module?.title ?? ""}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {editingModule?.module ? "Save module" : "Create module"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---- Lesson create/edit dialog ---- */}
      <Dialog
        open={!!editingLesson}
        onOpenChange={(o) => { if (!o) setEditingLesson(null) }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLesson?.lesson ? "Edit lesson" : "New lesson"}</DialogTitle>
            <DialogDescription>
              Lessons appear in the student learning view and can have tasks attached.
            </DialogDescription>
          </DialogHeader>
          <form
            action={(fd) => {
              run(
                () => upsertLesson(fd),
                editingLesson?.lesson ? "Lesson updated" : "Lesson added",
                () => setEditingLesson(null),
              )
            }}
            className="space-y-4"
          >
            <input type="hidden" name="module_id" value={editingLesson?.moduleId ?? ""} />
            {editingLesson?.lesson && <input type="hidden" name="id" value={editingLesson.lesson.id} />}
            <input
              type="hidden"
              name="position"
              value={editingLesson?.lesson?.position ?? editingLessonModule?.lessons.length ?? 0}
            />
            <div className="space-y-2">
              <Label htmlFor="lesson-title">Lesson title *</Label>
              <Input
                id="lesson-title"
                name="title"
                defaultValue={editingLesson?.lesson?.title ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-video">Video URL</Label>
              <Input
                id="lesson-video"
                name="video_url"
                type="url"
                placeholder="https://..."
                defaultValue={editingLesson?.lesson?.video_url ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-duration">Duration (minutes)</Label>
              <Input
                id="lesson-duration"
                name="duration_minutes"
                type="number"
                min="0"
                defaultValue={editingLesson?.lesson?.duration_minutes ?? 0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-content">Lesson content</Label>
              <Textarea
                id="lesson-content"
                name="content"
                rows={4}
                defaultValue={editingLesson?.lesson?.content ?? ""}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {editingLesson?.lesson ? "Save lesson" : "Create lesson"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---- Task create/edit dialog ---- */}
      <Dialog
        open={!!editingTask}
        onOpenChange={(o) => { if (!o) setEditingTask(null) }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask?.task ? "Edit task" : "New task"}</DialogTitle>
            <DialogDescription>
              Set the task details. After saving, use &quot;Add MCQ&quot; to add questions.
            </DialogDescription>
          </DialogHeader>
          <form
            action={(fd) => {
              run(
                () => upsertTask(fd),
                editingTask?.task ? "Task updated" : "Task added",
                () => setEditingTask(null),
              )
            }}
            className="space-y-4"
          >
            <input type="hidden" name="course_id" value={editingTask?.courseId ?? ""} />
            {editingTask?.task && (
              <input type="hidden" name="id" value={editingTask.task.id} />
            )}
            <input
              type="hidden"
              name="position"
              value={
                editingTask?.task?.position ??
                courses.find((c) => c.id === editingTask?.courseId)?.tasks.length ?? 0
              }
            />
            <div className="space-y-2">
              <Label htmlFor="task-title">Task title *</Label>
              <Input
                id="task-title"
                name="title"
                defaultValue={editingTask?.task?.title ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-lesson">Attach to lesson</Label>
              <select
                id="task-lesson"
                name="lesson_id"
                defaultValue={editingTask?.task?.lesson_id ?? ""}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="">Course-level task</option>
                {editingTaskCourse?.modules.map((module) => (
                  <optgroup key={module.id} label={module.title}>
                    {module.lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-desc">Description (shown to students)</Label>
              <Textarea
                id="task-desc"
                name="description"
                rows={3}
                defaultValue={editingTask?.task?.description ?? ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="task-points">Max points</Label>
                <Input
                  id="task-points"
                  name="max_points"
                  type="number"
                  min="1"
                  defaultValue={editingTask?.task?.max_points ?? 100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due">Due date</Label>
                <Input
                  id="task-due"
                  name="due_date"
                  type="date"
                  defaultValue={editingTask?.task?.due_date ?? ""}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_capstone"
                value="true"
                defaultChecked={editingTask?.task?.is_capstone ?? false}
                className="size-4 rounded border-input"
              />
              Capstone task (counts toward GPA)
            </label>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {editingTask?.task ? "Save task" : "Create task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---- MCQ builder dialog ---- */}
      <Dialog open={!!mcqFor} onOpenChange={(o) => { if (!o) setMcqFor(null) }}>
        <DialogContent className="max-h-[92dvh] overflow-hidden flex flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>MCQ Questions</DialogTitle>
            <DialogDescription>
              Build multiple-choice questions. Click the circle to mark the correct answer.
            </DialogDescription>
          </DialogHeader>
          {mcqFor && (
            <McqBuilder
              taskId={mcqFor.id}
              taskTitle={mcqFor.title}
              initial={mcqFor.questions}
              onClose={() => setMcqFor(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ---- Delete course confirmation ---- */}
      <Dialog open={!!deleteFor} onOpenChange={(o) => { if (!o) setDeleteFor(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete course</DialogTitle>
            <DialogDescription>
              This permanently deletes &quot;{deleteFor?.title}&quot; and all its tasks and
              submissions. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFor(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                const target = deleteFor
                if (!target) return
                run(() => deleteCourse(target.id), "Course deleted", () => setDeleteFor(null))
              }}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete module confirmation ---- */}
      <Dialog open={!!deleteModule_} onOpenChange={(o) => { if (!o) setDeleteModule_(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete module</DialogTitle>
            <DialogDescription>
              This permanently deletes &quot;{deleteModule_?.title}&quot; and all lessons in it.
              Tasks attached to those lessons become course-level tasks.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModule_(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                const target = deleteModule_
                if (!target) return
                run(() => deleteModule(target.id), "Module deleted", () => setDeleteModule_(null))
              }}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete lesson confirmation ---- */}
      <Dialog open={!!deleteLesson_} onOpenChange={(o) => { if (!o) setDeleteLesson_(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete lesson</DialogTitle>
            <DialogDescription>
              This permanently deletes &quot;{deleteLesson_?.title}&quot;. Tasks attached to it become
              course-level tasks.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteLesson_(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                const target = deleteLesson_
                if (!target) return
                run(() => deleteLesson(target.id), "Lesson deleted", () => setDeleteLesson_(null))
              }}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete task confirmation ---- */}
      <Dialog open={!!deleteTask_} onOpenChange={(o) => { if (!o) setDeleteTask_(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete task</DialogTitle>
            <DialogDescription>
              This permanently deletes &quot;{deleteTask_?.title}&quot; and all its questions and
              student submissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTask_(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                const target = deleteTask_
                if (!target) return
                run(() => deleteTask(target.id), "Task deleted", () => setDeleteTask_(null))
              }}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
