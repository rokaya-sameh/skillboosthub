import { notFound } from "next/navigation"
import { getStudyGroupDetail } from "@/lib/actions/queries"
import { PageHeader } from "@/components/page-header"
import { StudyGroupDetail } from "@/components/study-groups/study-group-detail"

export default async function StudyGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await getStudyGroupDetail(id)
  if (!detail) notFound()

  return (
    <div className="space-y-6">
      <PageHeader title={detail.group.name} description={detail.group.description ?? undefined} />
      <StudyGroupDetail
        group={detail.group}
        isMember={detail.isMember}
        attendedToday={detail.attendedToday}
        attendanceCount={detail.attendanceCount}
        notes={detail.notes}
      />
    </div>
  )
}
