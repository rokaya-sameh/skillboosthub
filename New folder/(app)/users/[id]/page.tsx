import { notFound } from "next/navigation";
import { getUserProfileDetail } from "@/lib/actions/queries";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatPopover } from "@/components/messages/chat-popover";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  GraduationCap,
  Shield,
  Users,
} from "lucide-react";

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ chat?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const detail = await getUserProfileDetail(id);
  if (!detail) notFound();

  const { viewer, user, messages, stats } = detail;
  const name = user.full_name ?? "User";
  const canMessage = viewer.id !== user.id && user.status === "active";
  const canViewCv =
    (viewer.role === "admin" || viewer.role === "instructor") &&
    !!user.resume_url;

  return (
    <div className="space-y-6">
      <PageHeader
        title={name}
        description={user.headline ?? user.track ?? undefined}
      >
        {canMessage ? (
          <ChatPopover
            me={viewer.id}
            other={user}
            initialMessages={messages}
            initialOpen={query.chat === "1"}
          />
        ) : null}
      </PageHeader>

      <Card>
        <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
          <Avatar className="size-16">
            {user.avatar_url ? (
              <AvatarImage src={user.avatar_url} alt="" />
            ) : null}
            <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {user.role}
              </Badge>
              <Badge
                variant={user.status === "banned" ? "destructive" : "secondary"}
                className="capitalize"
              >
                {user.status}
              </Badge>
              {user.cohort ? (
                <Badge variant="outline">{user.cohort}</Badge>
              ) : null}
            </div>
            {user.bio ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {user.bio}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {user.location ? <span>{user.location}</span> : null}
              {user.track ? <span>{user.track}</span> : null}
              {user.gpa != null ? <span>GPA {user.gpa.toFixed(2)}</span> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {user.role === "student" && "submissions" in stats ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Submissions"
            value={stats.submissions}
            icon={CheckCircle2}
          />
          <StatCard
            label="Graded"
            value={stats.graded}
            icon={GraduationCap}
            tone="emerald"
          />
          <StatCard
            label="Pending review"
            value={stats.pending}
            icon={Clock}
            tone="amber"
          />
          <StatCard
            label="Avg. grade"
            value={stats.averageGrade != null ? `${stats.averageGrade}%` : "-"}
            icon={GraduationCap}
            tone="gold"
          />
        </div>
      ) : null}

      {user.role === "instructor" && "courses" in stats ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard label="Courses" value={stats.courses} icon={BookOpen} />
          <StatCard
            label="Published"
            value={stats.publishedCourses}
            icon={CheckCircle2}
            tone="emerald"
          />
          <StatCard
            label="Enrolled students"
            value={stats.enrolledStudents}
            icon={Users}
            tone="amber"
          />
        </div>
      ) : null}

      {user.role === "admin" ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard label="Platform role" value="Admin" icon={Shield} />
          <StatCard
            label="Account status"
            value={user.status}
            icon={CheckCircle2}
            tone={user.status === "active" ? "emerald" : "amber"}
          />
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <ProfileField label="Headline" value={user.headline} />
          <ProfileField label="Track" value={user.track} />
          <ProfileField label="Cohort" value={user.cohort} />
          <ProfileField label="Location" value={user.location} />
          <ProfileField label="Phone" value={user.phone} />
          <ProfileField
            label="Joined"
            value={new Date(user.created_at).toLocaleDateString()}
          />
        </CardContent>
      </Card>

      {canViewCv ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CV / resume</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <a
                href={user.resume_url!}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="size-4" aria-hidden="true" /> View or
                download CV
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ProfileField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value || "-"}</p>
    </div>
  );
}
