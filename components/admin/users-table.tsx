"use client"

import { useCallback, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MessageSquare, MoreHorizontal, UserRound } from "lucide-react"
import { toast } from "sonner"
import {
  setUserStatus,
  setUserRole,
  resetUserPassword,
  deleteUser,
} from "@/lib/actions/admin"
import type { Profile, Role } from "@/lib/types"

type ConfirmAction =
  | { kind: "status"; user: Profile; status: "active" | "banned" }
  | { kind: "role"; user: Profile; role: Role }

export function UsersTable({ users, currentUserId }: { users: Profile[]; currentUserId: string }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [pending, startTransition] = useTransition()
  const [resetFor, setResetFor] = useState<Profile | null>(null)
  const [deleteFor, setDeleteFor] = useState<Profile | null>(null)
  const [confirmFor, setConfirmFor] = useState<ConfirmAction | null>(null)
  const [newPassword, setNewPassword] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      [u.full_name, u.role, u.status, u.track, u.cohort]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q)),
    )
  }, [users, query])

  const roleCounts = useMemo(
    () => ({
      admin: users.filter((u) => u.role === "admin").length,
      instructor: users.filter((u) => u.role === "instructor").length,
      student: users.filter((u) => u.role === "student").length,
      banned: users.filter((u) => u.status === "banned").length,
    }),
    [users],
  )

  const run = useCallback(
    (fn: () => Promise<{ error?: string; success?: boolean }>, ok: string) => {
      startTransition(async () => {
        const res = await fn()
        if (res?.error) toast.error(res.error)
        else {
          toast.success(ok)
          router.refresh()
        }
      })
    },
    [router],
  )

  const confirmTitle = confirmFor?.kind === "status"
    ? confirmFor.status === "banned" ? "Ban user" : "Restore access"
    : "Change user role"
  const confirmDescription = confirmFor?.kind === "status"
    ? confirmFor.status === "banned"
      ? `Ban ${confirmFor.user.full_name ?? "this user"}. They will be blocked from signing in until restored.`
      : `Restore access for ${confirmFor.user.full_name ?? "this user"}.`
    : `Change ${confirmFor?.user.full_name ?? "this user"} to ${confirmFor?.role}.`

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground">Admins</p>
          <p className="text-lg font-semibold tabular-nums">{roleCounts.admin}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground">Instructors</p>
          <p className="text-lg font-semibold tabular-nums">{roleCounts.instructor}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground">Students</p>
          <p className="text-lg font-semibold tabular-nums">{roleCounts.student}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground">Banned</p>
          <p className="text-lg font-semibold tabular-nums">{roleCounts.banned}</p>
        </div>
      </div>

      <Input
        placeholder="Search users by name, role, status, track, or cohort..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => {
              const isSelf = u.id === currentUserId
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <Link href={`/users/${u.id}`} className="underline-offset-4 hover:underline">
                      {u.full_name ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.status === "banned" ? "destructive" : "secondary"}>
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        disabled={isSelf}
                        render={<Button variant="ghost" size="icon" disabled={isSelf} />}
                      >
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Actions for {u.full_name}</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Manage</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/users/${u.id}`)}>
                          View profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/users/${u.id}?chat=1`)}>
                            Message user
                        </DropdownMenuItem>
                        {u.status === "banned" ? (
                          <DropdownMenuItem
                            onClick={() => setConfirmFor({ kind: "status", user: u, status: "active" })}
                          >
                            Restore access
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => setConfirmFor({ kind: "status", user: u, status: "banned" })}
                            className="text-destructive focus:text-destructive"
                          >
                            Ban user
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setResetFor(u)}>
                          Reset password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Change role</DropdownMenuLabel>
                        {(["student", "instructor", "admin"] as Role[]).map((r) => (
                          <DropdownMenuItem
                            key={r}
                            disabled={u.role === r}
                            onClick={() => setConfirmFor({ kind: "role", user: u, role: r })}
                            className="capitalize"
                          >
                            {r}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteFor(u)}
                        >
                          Delete user
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Reset password dialog */}
      <Dialog open={!!resetFor} onOpenChange={(o) => !o && setResetFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetFor?.full_name ?? "this user"}.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="text"
            placeholder="New password (min 6 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <DialogFooter>
            <Button
              disabled={pending}
              onClick={() => {
                const target = resetFor
                if (!target) return
                run(() => resetUserPassword(target.id, newPassword), "Password reset")
                setResetFor(null)
                setNewPassword("")
              }}
            >
              Reset password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status/role confirmation */}
      <Dialog open={!!confirmFor} onOpenChange={(open) => !open && setConfirmFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
            <DialogDescription>{confirmDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmFor(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmFor?.kind === "status" && confirmFor.status === "banned" ? "destructive" : "default"}
              disabled={pending}
              onClick={() => {
                const target = confirmFor
                if (!target) return
                if (target.kind === "status") {
                  run(
                    () => setUserStatus(target.user.id, target.status),
                    target.status === "banned" ? "User banned" : "User restored",
                  )
                } else {
                  run(() => setUserRole(target.user.id, target.role), `Role set to ${target.role}`)
                }
                setConfirmFor(null)
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteFor} onOpenChange={(o) => !o && setDeleteFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              This permanently deletes {deleteFor?.full_name ?? "this user"} and all of their data.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFor(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                const target = deleteFor
                if (!target) return
                run(() => deleteUser(target.id), "User deleted")
                setDeleteFor(null)
              }}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
