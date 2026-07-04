"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { joinGroup, markAttendance, uploadNote } from "@/lib/actions/study-groups"
import { uploadFile } from "@/lib/upload"
import { toast } from "sonner"
import { CalendarCheck, FileText, Upload } from "lucide-react"
import type { StudyGroup } from "@/lib/types"

type Note = {
  id: string
  title: string
  file_url: string
  created_at: string
  profiles: { full_name: string | null } | null
}

export function StudyGroupDetail({
  group,
  isMember,
  attendedToday,
  attendanceCount,
  notes,
}: {
  group: StudyGroup
  isMember: boolean
  attendedToday: boolean
  attendanceCount: number
  notes: Note[]
}) {
  const [member, setMember] = useState(isMember)
  const [attended, setAttended] = useState(attendedToday)
  const [count, setCount] = useState(attendanceCount)
  const [title, setTitle] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [pending, startTransition] = useTransition()

  function handleJoin() {
    startTransition(async () => {
      const res = await joinGroup(group.id)
      if (res?.error) toast.error(res.error)
      else {
        setMember(true)
        toast.success("Joined group")
      }
    })
  }

  function handleAttendance() {
    startTransition(async () => {
      const res = await markAttendance(group.id)
      if (res?.error) toast.error(res.error)
      else {
        setAttended(true)
        setCount((c) => c + 1)
        toast.success("Attendance marked for today")
      }
    })
  }

  function handleUpload() {
    if (!title.trim() || !file) {
      toast.error("Add a title and choose a file")
      return
    }
    startTransition(async () => {
      try {
        const fileUrl = await uploadFile("uploads", `notes/${group.id}`, file)
        const fd = new FormData()
        fd.set("group_id", group.id)
        fd.set("title", title)
        fd.set("file_url", fileUrl)
        const res = await uploadNote(fd)
        if (res?.error) toast.error(res.error)
        else {
          toast.success("Note uploaded")
          setTitle("")
          setFile(null)
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed")
      }
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shared Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes shared yet.</p>
            ) : (
              notes.map((n) => (
                <a
                  key={n.id}
                  href={n.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted"
                >
                  <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {n.profiles?.full_name ?? "Member"} · {new Date(n.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </a>
              ))
            )}
          </CardContent>
        </Card>

        {member ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload a Note</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="note-title">Title</Label>
                <Input
                  id="note-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Week 3 summary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note-file">File</Label>
                <Input id="note-file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <Button onClick={handleUpload} disabled={pending}>
                <Upload className="size-4" aria-hidden="true" /> Upload
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Membership</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {group.schedule ? (
              <p className="text-sm text-muted-foreground">Meets: {group.schedule}</p>
            ) : null}
            {member ? (
              <Badge variant="secondary">You are a member</Badge>
            ) : (
              <Button onClick={handleJoin} disabled={pending} className="w-full">
                Join group
              </Button>
            )}
          </CardContent>
        </Card>

        {member ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Sessions attended: <span className="font-medium text-foreground tabular-nums">{count}</span>
              </p>
              <Button
                onClick={handleAttendance}
                disabled={pending || attended}
                variant={attended ? "outline" : "default"}
                className="w-full"
              >
                <CalendarCheck className="size-4" aria-hidden="true" />
                {attended ? "Marked for today" : "Mark attendance"}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
