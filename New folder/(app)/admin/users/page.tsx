import { requireRole } from "@/lib/auth"
import { getAdminUsers } from "@/lib/actions/admin"
import { PageHeader } from "@/components/page-header"
import { UsersTable } from "@/components/admin/users-table"

export default async function AdminUsersPage() {
  const me = await requireRole(["admin"])
  const users = await getAdminUsers()

  return (
    <div className="space-y-6">
      <PageHeader title="User Management" description="Ban, reset, promote, or remove accounts." />
      <UsersTable users={users} currentUserId={me.id} />
    </div>
  )
}
