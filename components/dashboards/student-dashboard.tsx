import Link from 'next/link'
import { getStudentDashboardData } from '@/lib/actions/queries'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, CheckCircle2, GraduationCap, Trophy, ArrowRight } from 'lucide-react'
import type { Profile } from '@/lib/types'

export async function StudentDashboard({ profile }: { profile: Profile }) {
  const { enrollments, submissions, completedLessons } = await getStudentDashboardData(profile.id)

  const courseList = enrollments
  const subs = submissions
  const graded = subs.filter((s) => s.status === 'graded' && s.grade != null)
  const avgGrade =
    graded.length > 0
      ? Math.round(graded.reduce((a, s) => a + Number(s.grade), 0) / graded.length)
      : null

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${profile.full_name?.split(' ')[0] ?? 'learner'}`}
        description="Here's your learning snapshot."
      >
        <Button asChild>
          <Link href="/courses">
            Browse courses <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Enrolled courses" value={courseList.length} icon={BookOpen} />
        <StatCard label="Lessons completed" value={completedLessons} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Tasks submitted" value={subs.length} icon={GraduationCap} tone="amber" />
        <StatCard
          label="Avg. grade"
          value={avgGrade != null ? `${avgGrade}%` : '—'}
          icon={Trophy}
          tone="gold"
          hint={profile.gpa != null ? `GPA ${profile.gpa}` : undefined}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Continue learning</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {courseList.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              You haven&apos;t enrolled in any courses yet.{' '}
              <Link href="/courses" className="font-medium text-primary hover:underline">
                Browse courses
              </Link>
            </div>
          )}
          {courseList.map((e) => {
            const course = e.course
            if (!course) return null
            return (
              <Link
                key={e.id}
                href={`/courses/${course.id}`}
                className="flex items-center gap-4 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{course.title}</p>
                  <p className="text-xs text-muted-foreground">{course.category}</p>
                </div>
                <Badge variant="secondary" className="capitalize">{e.status}</Badge>
              </Link>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
