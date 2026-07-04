"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { enroll } from "@/lib/actions/learning"
import { toast } from "sonner"
import type { Course } from "@/lib/types"
import { BookOpen, ArrowRight, Clock, ExternalLink } from "lucide-react"

export function CourseCard({ course, enrolled, role }: { course: Course; enrolled: boolean; role?: string }) {
  const [isEnrolled, setIsEnrolled] = useState(enrolled)
  const [pending, startTransition] = useTransition()

  function handleEnroll() {
    startTransition(async () => {
      const res = await enroll(course.id)
      if (res?.error) {
        toast.error(res.error)
      } else {
        setIsEnrolled(true)
        toast.success(`Enrolled in ${course.title}`)
      }
    })
  }

  const isInstructor = role === "instructor" || role === "admin"

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex h-32 items-center justify-center bg-muted">
        <BookOpen className="size-10 text-muted-foreground" aria-hidden="true" />
      </div>
      <CardHeader className="gap-1">
        <div className="flex flex-wrap items-center gap-2">
          {course.category ? <Badge variant="secondary">{course.category}</Badge> : null}
          {course.level ? <Badge variant="outline">{course.level}</Badge> : null}
          {course.duration_hours ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" aria-hidden="true" />
              {course.duration_hours}h
            </span>
          ) : null}
        </div>
        <CardTitle className="text-balance text-base">{course.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {course.description ?? "No description provided."}
        </p>
        {course.objectives?.length ? (
          <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
            {course.objectives.slice(0, 2).map((o, i) => (
              <li key={i} className="truncate">{o}</li>
            ))}
          </ul>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        {course.course_link ? (
          <Button asChild variant="outline" className="w-full" size="sm">
            <a href={course.course_link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" aria-hidden="true" /> Open course
            </a>
          </Button>
        ) : null}
        {isInstructor ? (
          <Button asChild variant="secondary" className="w-full">
            <Link href={`/courses/${course.id}`}>
              View details <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : isEnrolled ? (
          <Button asChild className="w-full">
            <Link href={`/courses/${course.id}`}>
              Continue <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button className="w-full" onClick={handleEnroll} disabled={pending}>
            {pending ? "Enrolling..." : "Enroll"}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
