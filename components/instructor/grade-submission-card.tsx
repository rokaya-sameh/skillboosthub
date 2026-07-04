"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { gradeSubmission } from "@/lib/actions/grading"
import { toast } from "sonner"
import type { Submission } from "@/lib/types"

type SubmissionWithTask = Submission & {
  tasks: { title: string; max_points: number; course_id: string }
}

export function GradeSubmissionCard({ submission }: { submission: SubmissionWithTask }) {
  const [grade, setGrade] = useState(submission.grade?.toString() ?? "")
  const [feedback, setFeedback] = useState(submission.feedback ?? "")
  const [status, setStatus] = useState(submission.status)
  const [pending, startTransition] = useTransition()

  function submit(returnForRevision: boolean) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set("submission_id", submission.id)
      fd.set("grade", grade)
      fd.set("feedback", feedback)
      fd.set("return", String(returnForRevision))
      const res = await gradeSubmission(fd)
      if (res?.error) toast.error(res.error)
      else {
        setStatus(returnForRevision ? "returned" : "graded")
        toast.success(returnForRevision ? "Returned for revision" : "Submission graded")
      }
    })
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm">{submission.tasks?.title ?? "Task"}</CardTitle>
        <Badge variant={status === "graded" ? "default" : status === "returned" ? "destructive" : "secondary"}>
          {status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {submission.content ? (
          <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm leading-relaxed">
            {submission.content}
          </p>
        ) : null}
        {submission.file_url ? (
          <a
            href={submission.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline underline-offset-4"
          >
            View attachment
          </a>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="space-y-1.5 sm:w-32">
            <Label htmlFor={`grade-${submission.id}`}>
              Grade / {submission.tasks?.max_points ?? 100}
            </Label>
            <Input
              id={`grade-${submission.id}`}
              type="number"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              min={0}
              max={submission.tasks?.max_points ?? 100}
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor={`feedback-${submission.id}`}>Feedback</Label>
            <Textarea
              id={`feedback-${submission.id}`}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => submit(false)} disabled={pending} size="sm">
            Save grade
          </Button>
          <Button onClick={() => submit(true)} disabled={pending} size="sm" variant="outline">
            Return for revision
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
