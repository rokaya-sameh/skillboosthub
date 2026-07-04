import { requireProfile } from '@/lib/auth'
import { StudentDashboard } from '@/components/dashboards/student-dashboard'
import { InstructorDashboard } from '@/components/dashboards/instructor-dashboard'
import { AdminDashboard } from '@/components/dashboards/admin-dashboard'

export default async function DashboardPage() {
  const profile = await requireProfile()

  if (profile.role === 'admin') return <AdminDashboard />
  if (profile.role === 'instructor') return <InstructorDashboard profile={profile} />
  return <StudentDashboard profile={profile} />
}
