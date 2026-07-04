"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/stat-card"
import {
  Users,
  ListChecks,
  Award,
  ExternalLink,
  Clock,
  CheckCircle2,
  Clock3,
} from "lucide-react"
import type { Course, Task, Submission } from "@/lib/types"

type SubmissionWithStudent = Submission & {
  student: { full_name: string | null } | null
}

export function InstructorCourseView({
  course,
  tasks,
  enrolledCount,
  submissions,
}: {
  course: Course
  tasks: Task[]
  enrolledCount: number
  submissions: SubmissionWithStudent[]
}) {
  const pendingSubmissions = useMemo(
    () => submissions.filter((s) => s.status !== "graded"),
    [submissions],
  )

  const submissionByTask = useMemo(() => {
    const map = new Map<string, SubmissionWithStudent[]>()
    for (const s of submissions) {
      const arr = map.get(s.task_id) ?? []
      arr.push(s)
      map.set(s.task_id, arr)
    }
    return map
  }, [submissions])

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Enrolled students" value={enrolledCount} icon={Users} />
        <StatCard label="Tasks" value={tasks.length} icon={ListChecks} tone="emerald" />
        <StatCard label="Pending grading" value={pendingSubmissions.length} icon={Clock3} tone="amber" />
      </div>

      {/* Course info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Course info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {course.category ? <Badge variant="secondary">{course.category}</Badge> : null}
            {course.level ? <Badge variant="outline">{course.level}</Badge> : null}
            {course.duration_hours ? (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="size-4" aria-hidden="true" />
                {course.duration_hours}h
              </span>
            ) : null}
            <Badge variant={course.published ? "default" : "secondary"}>
              {course.published ? "Published" : "Draft"}
            </Badge>
          </div>

          {course.course_link ? (
            <Button asChild variant="outline" size="sm">
              <a href={course.course_link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" aria-hidden="true" /> Open course link
              </a>
            </Button>
          ) : null}

          {course.objectives?.length ? (
            <div>
              <p className="mb-2 text-sm font-medium">Learning objectives</p>
              <ul className="list-inside list-disc space-y-1">
                {course.objectives.map((o, i) => (
                  <li key={i} className="text-sm text-muted-foreground">{o}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Tasks / questionnaire */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tasks &amp; questionnaire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks added yet. Admin can add tasks from Content Management.</p>
          ) : (
            tasks.map((task, idx) => {
              const taskSubs = submissionByTask.get(task.id) ?? []
              const graded = taskSubs.filter((s) => s.status === "graded").length
              const submitted = taskSubs.filter((s) => s.status !== "graded").length
              return (
                <div key={task.id} className="rounded-lg border border-border p-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground tabular-nums">#{idx + 1}</span>
                    {task.is_capstone ? (
                      <Badge className="gap-1 text-xs">
                        <Award className="size-3" aria-hidden="true" /> Capstone
                      </Badge>
                    ) : null}
                    <span className="font-medium">{task.title}</span>
                    <Badge variant="outline" className="ml-auto text-xs">{task.max_points} pts</Badge>
                  </div>
                  {task.description ? (
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  ) : null}
                  {task.instructions ? (
                    <p className="rounded-md bg-muted px-3 py-2 text-sm whitespace-pre-wrap">{task.instructions}</p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                    {task.due_date ? <span>Due: {task.due_date}</span> : null}
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="size-3 text-primary" aria-hidden="true" /> {graded} graded
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock3 className="size-3 text-amber" aria-hidden="true" /> {submitted} pending
                    </span>
                  </div>
                  {taskSubs.length > 0 ? (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                        {taskSubs.length} submission{taskSubs.length !== 1 ? "s" : ""}
                      </summary>
                      <div className="mt-2 space-y-1">
                        {taskSubs.map((s) => (
                          <div key={s.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-xs">
                            <span>{s.student?.full_name ?? "Unknown"}</span>
                            <Badge variant={s.status === "graded" ? "default" : "secondary"} className="capitalize text-xs">
                              {s.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
