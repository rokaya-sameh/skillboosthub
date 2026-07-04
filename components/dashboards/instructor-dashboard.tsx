import Link from 'next/link'
import { getInstructorDashboardData } from '@/lib/actions/queries'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Users, ClipboardCheck, Clock, ArrowRight } from 'lucide-react'
import type { Profile } from '@/lib/types'

export async function InstructorDashboard({ profile }: { profile: Profile }) {
  const { courses, enrolledCount, pending } = await getInstructorDashboardData(profile.id)

  return (
    <div>
      <PageHeader
        title="Instructor overview"
        description="Track your courses, students, and grading queue."
      >
        <Button asChild>
          <Link href="/courses">
            Manage courses <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Your courses" value={courses.length} icon={BookOpen} />
        <StatCard label="Enrolled students" value={enrolledCount} icon={Users} tone="emerald" />
        <StatCard label="Awaiting grading" value={pending.length} icon={ClipboardCheck} tone="amber" />
        <StatCard
          label="Published"
          value={courses.filter((c) => c.published).length}
          icon={BookOpen}
          tone="gold"
        />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Grading queue</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/grading">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {pending.length === 0 && (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No submissions waiting. You&apos;re all caught up.
            </p>
          )}
          {pending.map((s) => {
            const task = s.task
            const student = s.student
            return (
              <Link
                key={s.id}
                href="/grading"
                className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
              >
                <Clock className="h-4 w-4 shrink-0 text-amber" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{task?.title}</p>
                  <p className="text-xs text-muted-foreground">{student?.full_name}</p>
                </div>
                <Badge variant="outline" className="capitalize">{s.status}</Badge>
              </Link>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
