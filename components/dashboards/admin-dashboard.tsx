import Link from 'next/link'
import { getAdminDashboardData } from '@/lib/actions/queries'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, BookOpen, GraduationCap, ClipboardCheck } from 'lucide-react'

export async function AdminDashboard() {
  const stats = await getAdminDashboardData()

  return (
    <div>
      <PageHeader title="Admin dashboard" description="Platform overview." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total users" value={stats.totalUsers} icon={Users} hint={`${stats.banned} banned`} />
        <StatCard label="Courses" value={stats.courses} icon={BookOpen} tone="emerald" />
        <StatCard label="Enrollments" value={stats.enrollments} icon={GraduationCap} tone="amber" />
        <StatCard label="Pending submissions" value={stats.pending} icon={ClipboardCheck} tone="gold" hint={`${stats.submissions} total`} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Button asChild variant="outline" className="h-auto justify-start py-3">
            <Link href="/admin/users">
              <Users className="h-4 w-4" /> Manage users
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto justify-start py-3">
            <Link href="/admin/content">
              <BookOpen className="h-4 w-4" /> Manage courses
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto justify-start py-3">
            <Link href="/courses">
              <GraduationCap className="h-4 w-4" /> All courses
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
