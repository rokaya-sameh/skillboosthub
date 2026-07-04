"use client"

import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { uploadFile } from "@/lib/upload"
import { submitTask } from "@/lib/actions/learning"
import { toast } from "sonner"
import type { Task, Submission, TaskOption, TaskQuestion } from "@/lib/types"

type TaskWithQuestions = Task & { questions?: (TaskQuestion & { options: TaskOption[] })[] }

export function TaskSubmitDialog({
  task,
  courseId,
  existing,
}: {
  task: TaskWithQuestions
  courseId: string
  existing?: Submission
}) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState(existing?.content ?? "")
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [file, setFile] = useState<File | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit() {
    startTransition(async () => {
      try {
        let fileUrl = existing?.file_url ?? ""
        if (file) {
          fileUrl = await uploadFile("uploads", `submissions/${task.id}`, file)
        }
        const fd = new FormData()
        fd.set("task_id", task.id)
        fd.set("course_id", courseId)
        fd.set("content", content)
        fd.set("file_url", fileUrl)
        fd.set(
          "answers",
          JSON.stringify(
            Object.entries(answers).map(([question_id, option_id]) => ({ question_id, option_id })),
          ),
        )
        const res = await submitTask(fd)
        if (res?.error) {
          toast.error(res.error)
        } else {
          toast.success("Submission saved")
          setOpen(false)
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed")
      }
    })
  }

  const graded = existing?.status === "graded"
  const questions = task.questions ?? []
  const missingRequiredAnswer = questions.some((question) => !answers[question.id])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={existing ? "outline" : "default"} className="shrink-0" disabled={graded} />
        }
      >
        {graded ? "Graded" : existing ? "Edit submission" : "Submit"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription>
            Submit your work for this task. You can include text, a file, or both.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {questions.length > 0 ? (
            <div className="space-y-3 rounded-lg border p-3">
              {questions.map((question, index) => (
                <fieldset key={question.id} className="space-y-2">
                  <legend className="text-sm font-medium">
                    {index + 1}. {question.question}
                  </legend>
                  <div className="space-y-1.5">
                    {question.options.map((option) => (
                      <label key={option.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={option.id}
                          checked={answers[question.id] === option.id}
                          onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: option.id }))}
                          className="size-4"
                        />
                        {option.text}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="submission-content">Your response</Label>
            <Textarea
              id="submission-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe your work or paste a link..."
              rows={5}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="submission-file">Attachment (optional)</Label>
            <Input
              id="submission-file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {existing?.file_url ? (
              <a
                href={existing.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline underline-offset-4"
              >
                View current attachment
              </a>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={pending || missingRequiredAnswer}>
            {pending ? "Saving..." : "Save submission"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
