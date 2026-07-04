"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { saveCapstoneEvaluation } from "@/lib/actions/grading"
import { toast } from "sonner"
import type { Course } from "@/lib/types"

export function CapstoneEvaluationForm({
  studentId,
  courses,
}: {
  studentId: string
  courses: Pick<Course, "id" | "title">[]
}) {
  const [title, setTitle] = useState("")
  const [courseId, setCourseId] = useState<string>("")
  const [score, setScore] = useState("")
  const [feedback, setFeedback] = useState("")
  const [pending, startTransition] = useTransition()

  const previewGpa = score && !Number.isNaN(Number(score))
    ? Math.round((Number(score) / 100) * 4 * 100) / 100
    : null

  function submit() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set("student_id", studentId)
      fd.set("course_id", courseId)
      fd.set("title", title || "Capstone")
      fd.set("score", score)
      fd.set("feedback", feedback)
      const res = await saveCapstoneEvaluation(fd)
      if (res?.error) toast.error(res.error)
      else {
        toast.success(`Capstone saved · GPA ${res.gpa?.toFixed(2)}`)
        setTitle("")
        setScore("")
        setFeedback("")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Rate Capstone</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cap-title">Title</Label>
          <Input
            id="cap-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Final capstone project"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cap-course">Course (optional)</Label>
          <Select value={courseId} onValueChange={(v) => setCourseId(v ?? "")}>
            <SelectTrigger id="cap-course">
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cap-score">Score (0–100)</Label>
          <Input
            id="cap-score"
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />
          {previewGpa != null ? (
            <p className="text-xs text-muted-foreground">Equivalent GPA: {previewGpa.toFixed(2)} / 4.0</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="cap-feedback">Feedback</Label>
          <Textarea
            id="cap-feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
          />
        </div>
        <Button onClick={submit} disabled={pending || !score}>
          {pending ? "Saving..." : "Save evaluation"}
        </Button>
      </CardContent>
    </Card>
  )
}
