import { getCoursesCatalog } from "@/lib/actions/queries"
import { PageHeader } from "@/components/page-header"
import { CourseCard } from "@/components/courses/course-card"

export default async function CoursesPage() {
  const { profile, courses, enrollments } = await getCoursesCatalog()
  const enrolledIds = new Set(enrollments.map((e) => e.course_id))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Browse Courses"
        description="Explore the catalog and enroll to start tracking your progress."
      />

      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No published courses yet. Check back soon.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} enrolled={enrolledIds.has(course.id)} role={profile.role} />
          ))}
        </div>
      )}
    </div>
  )
}
