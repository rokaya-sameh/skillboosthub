import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAdminDashboardStats } from "@/lib/actions/admin";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  GraduationCap,
  BookOpen,
  FileCheck,
  MessageSquare,
  Settings,
} from "lucide-react";

export default async function AdminDashboardPage() {
  await requireRole(["admin"]);
  const stats = await getAdminDashboardStats();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Console"
        description="System-wide analytics and controls."
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/users">
              <Users className="size-4" aria-hidden="true" /> Users
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/content">
              <Settings className="size-4" aria-hidden="true" /> Content
            </Link>
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Students"
          value={stats.studentCount}
          icon={GraduationCap}
        />
        <StatCard
          label="Instructors"
          value={stats.instructorCount}
          icon={Users}
        />
        <StatCard label="Courses" value={stats.courseCount} icon={BookOpen} />
        <StatCard
          label="Submissions"
          value={stats.submissionCount}
          icon={FileCheck}
        />
        <StatCard
          label="Pending review"
          value={stats.pendingCount}
          icon={FileCheck}
        />
        <StatCard
          label="Messages"
          value={stats.messageCount}
          icon={MessageSquare}
        />
        <StatCard label="Study groups" value={stats.groupCount} icon={Users} />
        <StatCard label="Banned users" value={stats.bannedCount} icon={Users} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">User Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Ban or restore accounts, reset passwords, change roles, and delete
              users.
            </p>
            <Button asChild>
              <Link href="/admin/users">Manage users</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Create, edit, publish, or delete courses across the platform.</p>
            <Button asChild>
              <Link href="/admin/content">Manage content</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
