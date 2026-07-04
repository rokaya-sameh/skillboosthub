"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sendMessage, markThreadRead } from "@/lib/actions/messages";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Send } from "lucide-react";
import type { Message, Profile } from "@/lib/types";

type Person = Pick<Profile, "id" | "full_name" | "role" | "avatar_url">;
type Contact = Pick<Profile, "id" | "full_name" | "role" | "avatar_url">;

export function MessagesHub({
  me,
  initialMessages,
  people,
  contacts,
}: {
  me: Profile;
  initialMessages: Message[];
  people: Person[];
  contacts: Contact[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const first = initialMessages[0];
    if (!first) return null;
    return first.sender_id === me.id ? first.recipient_id : first.sender_id;
  });
  const [query, setQuery] = useState("");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  const peopleById = useMemo(() => {
    const map = new Map<string, Person | Contact>();
    for (const person of people) map.set(person.id, person);
    for (const contact of contacts)
      if (!map.has(contact.id)) map.set(contact.id, contact);
    return map;
  }, [people, contacts]);

  const threads = useMemo(() => {
    const map = new Map<
      string,
      { id: string; last: Message; unread: number; messages: Message[] }
    >();
    for (const message of messages) {
      const otherId =
        message.sender_id === me.id ? message.recipient_id : message.sender_id;
      const entry = map.get(otherId);
      const unread = message.recipient_id === me.id && !message.read ? 1 : 0;
      if (!entry) {
        map.set(otherId, {
          id: otherId,
          last: message,
          unread,
          messages: [message],
        });
      } else {
        entry.messages.push(message);
        entry.unread += unread;
        if (
          new Date(message.created_at).getTime() >
          new Date(entry.last.created_at).getTime()
        ) {
          entry.last = message;
        }
      }
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.last.created_at).getTime() -
        new Date(a.last.created_at).getTime(),
    );
  }, [messages, me.id]);

  const selectedPerson = selectedId ? peopleById.get(selectedId) : null;
  const selectedName = selectedPerson?.full_name ?? "Unknown user";
  const selectedRole = selectedPerson?.role ?? "user";
  const selectedAvatarUrl = selectedPerson?.avatar_url ?? null;
  const selectedMessages = useMemo(
    () =>
      messages
        .filter(
          (message) =>
            selectedId &&
            ((message.sender_id === me.id &&
              message.recipient_id === selectedId) ||
              (message.sender_id === selectedId &&
                message.recipient_id === me.id)),
        )
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        ),
    [messages, me.id, selectedId],
  );

  const filteredThreads = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return threads;
    return threads.filter((thread) => {
      const person = peopleById.get(thread.id);
      return [person?.full_name, person?.role, thread.last.body]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(search));
    });
  }, [peopleById, query, threads]);

  const filteredContacts = useMemo(() => {
    const search = query.trim().toLowerCase();
    const threadIds = new Set(threads.map((thread) => thread.id));
    const availableContacts = contacts.filter((contact) => !threadIds.has(contact.id));
    if (!search) return availableContacts;
    return availableContacts.filter((contact) =>
      [contact.full_name, contact.role]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(search)),
    );
  }, [contacts, query, threads]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages-hub:${me.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const message = payload.new as Message;
          if (message.sender_id !== me.id && message.recipient_id !== me.id)
            return;
          setMessages((prev) =>
            prev.some((item) => item.id === message.id)
              ? prev
              : [...prev, message],
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [me.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedMessages]);

  useEffect(() => {
    if (!selectedId) return;
    startTransition(async () => {
      await markThreadRead(selectedId);
      setMessages((prev) =>
        prev.map((message) =>
          message.sender_id === selectedId && message.recipient_id === me.id
            ? { ...message, read: true }
            : message,
        ),
      );
    });
  }, [selectedId, me.id]);

  const handleSend = useCallback(() => {
    const text = body.trim();
    if (!selectedId || !text) return;
    setBody("");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("recipient_id", selectedId);
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
  }, [body, selectedId]);

  return (
    <div className="grid min-h-[calc(100dvh-12rem)] gap-4 lg:grid-cols-[22rem_1fr]">
      <Card className="min-h-0">
        <CardContent className="flex min-h-0 flex-col gap-3 p-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people..."
            aria-label="Search people"
          />

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {filteredThreads.map((thread) => {
              const person = peopleById.get(thread.id);
              const name = person?.full_name ?? "Unknown user";
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setSelectedId(thread.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
                    selectedId === thread.id && "border-primary bg-primary/5",
                  )}
                >
                  <Avatar>
                    {person?.avatar_url ? <AvatarImage src={person.avatar_url} alt="" /> : null}
                    <AvatarFallback>
                      {name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{name}</span>
                      {person?.role ? (
                        <Badge variant="outline" className="capitalize text-xs">
                          {person.role}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {thread.last.body || "Attachment"}
                    </p>
                  </div>
                  {thread.unread > 0 ? <Badge>{thread.unread}</Badge> : null}
                </button>
              );
            })}

            <div className="py-1 text-xs font-medium text-muted-foreground">
              Start a chat
            </div>

            {query.trim() && filteredThreads.length === 0 && filteredContacts.length === 0 ? (
              <div className="py-1 text-xs font-medium text-muted-foreground">
                No conversations or people match your search.
              </div>
            ) : null}

            {!query.trim() && filteredContacts.length === 0 ? (
              <div className="py-1 text-xs font-medium text-muted-foreground">
                No other active users found.
              </div>
            ) : null}

            {filteredContacts.map((contact) => {
              const name = contact.full_name ?? "User";
              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => setSelectedId(contact.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/50"
                >
                  <Avatar className="size-7">
                    {contact.avatar_url ? <AvatarImage src={contact.avatar_url} alt="" /> : null}
                    <AvatarFallback>
                      {name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {name}
                  </span>
                  <Badge variant="outline" className="capitalize text-xs">
                    {contact.role}
                  </Badge>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-0">
        <CardContent className="flex h-full min-h-128 flex-col p-0">
          {selectedId ? (
            <>
              <div className="flex items-center gap-3 border-b p-4">
                <Avatar>
                  {selectedAvatarUrl ? <AvatarImage src={selectedAvatarUrl} alt="" /> : null}
                  <AvatarFallback>
                    {selectedName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium leading-tight">
                    {selectedName}
                  </p>
                  {selectedPerson?.role ? (
                    <Badge variant="outline" className="capitalize">
                      {selectedRole}
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {selectedMessages.length === 0 ? (
                  <p className="py-16 text-center text-sm text-muted-foreground">
                    No messages yet. Start the conversation.
                  </p>
                ) : (
                  selectedMessages.map((message) => {
                    const mine = message.sender_id === me.id;
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
                            "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                            mine
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted",
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
                          <p
                            className={cn(
                              "mt-1 text-[11px] tabular-nums",
                              mine
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground",
                            )}
                          >
                            {formatMessageTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>

              <form
                className="flex items-center gap-2 border-t p-4"
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
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Select a conversation or choose a person to start chatting.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
