"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2 } from "lucide-react";
import { updateProfile } from "@/lib/actions/profile";
import { uploadFile } from "@/lib/upload";
import type { Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [pending, startTransition] = useTransition();
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [resumeUrl, setResumeUrl] = useState(profile.resume_url ?? "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadFile("avatars", "avatar", file);
      setAvatarUrl(url);
      toast.success("Avatar uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleResume(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingResume(true);
    try {
      const url = await uploadFile("uploads", "resume", file);
      setResumeUrl(url);
      toast.success("File uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingResume(false);
    }
  }

  function action(formData: FormData) {
    formData.set("avatar_url", avatarUrl);
    formData.set("resume_url", resumeUrl);
    startTransition(async () => {
      const res = await updateProfile(formData);
      if (res?.error) toast.error(res.error);
      else toast.success("Profile saved");
    });
  }

  return (
    <form action={action} className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Avatar & files</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={avatarUrl || undefined} alt="" />
            <AvatarFallback className="bg-brand text-xl text-brand-foreground">
              {(profile.full_name ?? "?").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Badge variant="secondary" className="capitalize">
            {profile.role}
          </Badge>

          <label className="w-full">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatar}
            />
            <span className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted">
              {uploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Change avatar
            </span>
          </label>

          <label className="w-full">
            <input type="file" className="hidden" onChange={handleResume} />
            <span className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted">
              {uploadingResume ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Upload CV / resume
            </span>
          </label>
          {resumeUrl && (
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              View uploaded file
            </a>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Personal information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={profile.full_name ?? ""}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              name="headline"
              placeholder="e.g. Aspiring Frontend Engineer"
              defaultValue={profile.headline ?? ""}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              rows={3}
              defaultValue={profile.bio ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="track">Track</Label>
            <Input
              id="track"
              name="track"
              placeholder="e.g. Full Stack"
              defaultValue={profile.track ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cohort">Cohort</Label>
            <Input
              id="cohort"
              name="cohort"
              placeholder="e.g. Spring 2026"
              defaultValue={profile.cohort ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              defaultValue={profile.location ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
