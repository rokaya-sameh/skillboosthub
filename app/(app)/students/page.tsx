import Link from "next/link"
import { getStudentsIndex } from "@/lib/actions/queries"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

export default async function StudentsPage() {
  const { students, submissions } = await getStudentsIndex()
  const list = students
  const statsByStudent = new Map<string, { graded: number; pending: number; avg: number; count: number }>()
  for (const s of submissions) {
    const cur = statsByStudent.get(s.student_id) ?? { graded: 0, pending: 0, avg: 0, count: 0 }
    if (s.status === "graded") cur.graded += 1
    if (s.status === "submitted") cur.pending += 1
    if (s.grade != null) {
      cur.avg += s.grade
      cur.count += 1
    }
    statsByStudent.set(s.student_id, cur)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Students" description="Track KPIs, progress, and task completion across your students." />

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No students yet.</p>
      ) : (
        <div className="space-y-2">
          {list.map((s) => {
            const name = s.full_name ?? "Student"
            const stats = statsByStudent.get(s.id)
            const avg = stats && stats.count ? Math.round(stats.avg / stats.count) : null
            const performance = avg == null ? null : avg >= 70 ? "good" : "needs-attention"
            return (
              <Card key={s.id} className="transition-colors hover:bg-muted/50">
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">{s.track ?? "No track"}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline">{stats?.graded ?? 0} graded</Badge>
                    {stats?.pending ? <Badge variant="secondary">{stats.pending} pending</Badge> : null}
                    {s.gpa != null ? <Badge variant="outline">GPA {s.gpa.toFixed(2)}</Badge> : null}
                    {performance ? (
                      <Badge variant={performance === "good" ? "default" : "destructive"}>
                        {performance === "good" ? "On track" : "Needs attention"}
                      </Badge>
                    ) : null}
                  </div>
                  {avg != null ? (
                    <div className="w-full sm:w-32">
                      <Progress value={avg} aria-label="Average grade" />
                    </div>
                  ) : null}
                  <div className="flex gap-2 sm:ml-auto">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/users/${s.id}`}>Profile</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link href={`/students/${s.id}`}>Review</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
