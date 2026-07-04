import { requireProfile } from '@/lib/auth'
import { PageHeader } from '@/components/page-header'
import { ProfileForm } from '@/components/profile/profile-form'

export default async function ProfilePage() {
  const profile = await requireProfile()
  return (
    <div>
      <PageHeader title="My Profile" description="Manage your personal information and uploads." />
      <ProfileForm profile={profile} />
    </div>
  )
}
