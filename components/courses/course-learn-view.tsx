"use client"

import { useMemo, useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toggleLessonComplete } from "@/lib/actions/learning"
import { TaskSubmitDialog } from "@/components/courses/task-submit-dialog"
import type { Course, Module, Lesson, Task, Submission, TaskOption, TaskQuestion } from "@/lib/types"
import { CheckCircle2, Circle, PlayCircle, FileText, Award } from "lucide-react"
import { toast } from "sonner"

type LearnTask = Task & { questions?: (TaskQuestion & { options: TaskOption[] })[] }

export function CourseLearnView({
  course,
  modules,
  lessons,
  tasks,
  completedLessonIds,
  submissions,
}: {
  course: Course
  modules: Module[]
  lessons: Lesson[]
  tasks: LearnTask[]
  completedLessonIds: string[]
  submissions: Submission[]
}) {
  const [completed, setCompleted] = useState<Set<string>>(new Set(completedLessonIds))
  const [pending, startTransition] = useTransition()

  const progressPct = useMemo(
    () => (lessons.length === 0 ? 0 : Math.round((completed.size / lessons.length) * 100)),
    [completed, lessons.length],
  )

  const submissionByTask = useMemo(() => {
    const map = new Map<string, Submission>()
    for (const s of submissions) map.set(s.task_id, s)
    return map
  }, [submissions])

  function toggle(lesson: Lesson) {
    const next = !completed.has(lesson.id)
    setCompleted((prev) => {
      const copy = new Set(prev)
      if (next) copy.add(lesson.id)
      else copy.delete(lesson.id)
      return copy
    })
    startTransition(async () => {
      const res = await toggleLessonComplete(lesson.id, course.id, next)
      if (res?.error) toast.error(res.error)
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completed.size} of {lessons.length} lessons complete
            </span>
            <span className="font-medium tabular-nums">{progressPct}%</span>
          </div>
          <Progress value={progressPct} aria-label="Course completion" />
        </CardContent>
      </Card>

      <Tabs defaultValue="lessons">
        <TabsList>
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="lessons" className="space-y-4">
          {modules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lessons published yet.</p>
          ) : (
            modules.map((mod) => {
              const modLessons = lessons.filter((l) => l.module_id === mod.id)
              return (
                <Card key={mod.id}>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">{mod.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {modLessons.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No lessons in this module.</p>
                    ) : (
                      modLessons.map((lesson) => {
                        const done = completed.has(lesson.id)
                        return (
                          <button
                            key={lesson.id}
                            type="button"
                            onClick={() => toggle(lesson)}
                            disabled={pending}
                            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted disabled:opacity-60"
                          >
                            {done ? (
                              <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
                            ) : (
                              <Circle className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                            )}
                            <PlayCircle className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <span className="flex-1">{lesson.title}</span>
                            {lesson.duration_minutes ? (
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {lesson.duration_minutes}m
                              </span>
                            ) : null}
                            <span className="sr-only">{done ? "Mark incomplete" : "Mark complete"}</span>
                          </button>
                        )
                      })
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-3">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks for this course yet.</p>
          ) : (
            tasks.map((task) => {
              const sub = submissionByTask.get(task.id)
              return (
                <Card key={task.id}>
                  <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {task.is_capstone ? (
                          <Badge className="gap-1">
                            <Award className="size-3" aria-hidden="true" /> Capstone
                          </Badge>
                        ) : (
                          <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
                        )}
                        <span className="font-medium">{task.title}</span>
                      </div>
                      {task.description ? (
                        <p className="text-sm leading-relaxed text-muted-foreground">{task.description}</p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{task.max_points} pts</span>
                        {sub ? <SubmissionBadge sub={sub} /> : <Badge variant="outline">Not submitted</Badge>}
                        {task.questions?.length ? <Badge variant="outline">{task.questions.length} MCQ</Badge> : null}
                        {sub?.grade != null ? (
                          <span className="font-medium text-foreground">
                            Grade: {sub.grade}/{task.max_points}
                          </span>
                        ) : null}
                      </div>
                      {sub?.feedback ? (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Feedback:</span> {sub.feedback}
                        </p>
                      ) : null}
                    </div>
                    <TaskSubmitDialog task={task} courseId={course.id} existing={sub} />
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SubmissionBadge({ sub }: { sub: Submission }) {
  const variant =
    sub.status === "graded" ? "default" : sub.status === "returned" ? "destructive" : "secondary"
  return <Badge variant={variant}>{sub.status}</Badge>
}
