import { requireRole } from "@/lib/auth"
import { getAdminContent } from "@/lib/actions/admin"
import { PageHeader } from "@/components/page-header"
import { ContentManager } from "@/components/admin/content-manager"

export default async function AdminContentPage() {
  await requireRole(["admin"])
  const courses = await getAdminContent()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses & Tasks"
        description="Create courses, build MCQ tasks, and manage content."
      />
      <ContentManager courses={courses} />
    </div>
  )
}
