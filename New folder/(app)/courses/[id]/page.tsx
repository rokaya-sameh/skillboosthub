import { notFound } from "next/navigation"
import { requireProfile } from "@/lib/auth"
import { getInstructorCourseData, getStudentCourseData } from "@/lib/actions/queries"
import { PageHeader } from "@/components/page-header"
import { CourseLearnView } from "@/components/courses/course-learn-view"
import { InstructorCourseView } from "@/components/courses/instructor-course-view"

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await requireProfile()

  const isInstructor = profile.role === "instructor" || profile.role === "admin"

  if (isInstructor) {
    const data = await getInstructorCourseData(id)
    if (!data.course) notFound()

    return (
      <div className="space-y-6">
        <PageHeader
          title={data.course.title}
          description={data.course.description ?? undefined}
        />
        <InstructorCourseView
          course={data.course}
          tasks={data.tasks}
          enrolledCount={data.enrolledCount}
          submissions={data.submissions}
        />
      </div>
    )
  }

  const data = await getStudentCourseData(id)
  if (!data.course) notFound()

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.course.title}
        description={data.course.description ?? undefined}
      />
      <CourseLearnView
        course={data.course}
        modules={data.modules}
        lessons={data.lessons}
        tasks={data.tasks}
        completedLessonIds={data.completedLessonIds}
        submissions={data.submissions}
      />
    </div>
  )
}
