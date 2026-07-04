import Link from "next/link"
import { getStudyGroups } from "@/lib/actions/queries"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Users, ArrowRight } from "lucide-react"

export default async function StudyGroupsPage() {
  const list = await getStudyGroups()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Study Groups"
        description="Join a group, mark attendance, and share notes with your peers."
      />

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No study groups yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((g) => (
            <Card key={g.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-base text-balance">{g.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {g.description ?? "No description."}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5" aria-hidden="true" />
                    {g.study_group_members?.[0]?.count ?? 0} members
                  </span>
                  {g.schedule ? (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3.5" aria-hidden="true" />
                      {g.schedule}
                    </span>
                  ) : null}
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/study-groups/${g.id}`}>
                    Open <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
