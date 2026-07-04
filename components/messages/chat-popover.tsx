"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sendMessage } from "@/lib/actions/messages";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Send, X } from "lucide-react";
import type { Message, Profile } from "@/lib/types";

export function ChatPopover({
  me,
  other,
  initialMessages,
  initialOpen = false,
}: {
  me: string;
  other: Pick<Profile, "id" | "full_name" | "role" | "avatar_url">;
  initialMessages: Message[];
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const name = other.full_name ?? "User";

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`profile-chat:${me}:${other.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const message = payload.new as Message;
          const inThread =
            (message.sender_id === me && message.recipient_id === other.id) ||
            (message.sender_id === other.id && message.recipient_id === me);
          if (inThread) {
            setMessages((prev) =>
              prev.some((item) => item.id === message.id)
                ? prev
                : [...prev, message],
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, other.id]);

  const handleSend = useCallback(() => {
    const text = body.trim();
    if (!text) return;
    setBody("");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("recipient_id", other.id);
      formData.set("body", text);
      const result = await sendMessage(formData);
      if (result?.error) {
        toast.error(result.error);
        setBody(text);
      } else if (result?.message) {
        setMessages((prev) =>
          prev.some((message) => message.id === result.message.id)
            ? prev
            : [...prev, result.message as Message],
        );
      }
    });
  }, [body, other.id]);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <MessageSquare className="size-4" aria-hidden="true" /> Message
      </Button>

      {open ? (
        <div className="fixed right-4 bottom-4 z-50 flex h-[min(32rem,calc(100dvh-2rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl">
          <div className="flex items-center gap-3 border-b bg-muted/50 p-3">
            <Avatar>
              <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium leading-tight">{name}</p>
              <Badge variant="outline" className="capitalize">
                {other.role}
              </Badge>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Close chat</span>
            </Button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No messages yet.
              </p>
            ) : (
              messages.map((message) => {
                const mine = message.sender_id === me;
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      mine ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                        mine
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground",
                      )}
                    >
                      {message.body ? (
                        <p className="whitespace-pre-wrap wrap-break-word">
                          {message.body}
                        </p>
                      ) : null}
                      {message.file_url ? (
                        <a
                          href={message.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-4"
                        >
                          View attachment
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          <form
            className="flex items-center gap-2 border-t p-3"
            onSubmit={(event) => {
              event.preventDefault();
              handleSend();
            }}
          >
            <Input
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Type a message..."
              aria-label="Message"
            />
            <Button
              type="submit"
              size="icon"
              disabled={pending || !body.trim()}
            >
              <Send className="size-4" aria-hidden="true" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      ) : null}
    </>
  );
}
