import { notFound } from "next/navigation"
import { getStudentDetail, getUserProfileDetail } from "@/lib/actions/queries"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { GradeSubmissionCard } from "@/components/instructor/grade-submission-card"
import { CapstoneEvaluationForm } from "@/components/instructor/capstone-evaluation-form"
import { ChatPopover } from "@/components/messages/chat-popover"
import { GraduationCap, CheckCircle2, Clock } from "lucide-react"

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [detail, profileDetail] = await Promise.all([getStudentDetail(id), getUserProfileDetail(id)])
  if (!detail || !profileDetail) notFound()

  const { student: p, submissions, courses, evaluations } = detail

  const graded = submissions.filter((s) => s.status === "graded").length
  const pending = submissions.filter((s) => s.status === "submitted").length

  return (
    <div className="space-y-6">
      <PageHeader title={p.full_name ?? "Student"} description={p.track ?? undefined}>
        <ChatPopover
          me={profileDetail.viewer.id}
          other={profileDetail.user}
          initialMessages={profileDetail.messages}
        />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Submissions" value={submissions.length} icon={CheckCircle2} />
        <StatCard label="Graded" value={graded} icon={CheckCircle2} />
        <StatCard label="Pending review" value={pending} icon={Clock} />
        <StatCard label="GPA" value={p.gpa != null ? p.gpa.toFixed(2) : "—"} icon={GraduationCap} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Submissions</h2>
          {submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            submissions.map((s) => <GradeSubmissionCard key={s.id} submission={s} />)
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Capstone & GPA</h2>
          <CapstoneEvaluationForm studentId={p.id} courses={courses} />
          {evaluations.length > 0 ? (
            <div className="space-y-2">
              {evaluations.map((e) => (
                <div key={e.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{e.title}</span>
                    <span className="tabular-nums">
                      {e.score}/100 · GPA {e.gpa?.toFixed(2)}
                    </span>
                  </div>
                  {e.feedback ? <p className="mt-1 text-muted-foreground">{e.feedback}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
