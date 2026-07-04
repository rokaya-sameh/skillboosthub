import { getMessagesOverview } from "@/lib/actions/queries"
import { PageHeader } from "@/components/page-header"
import { MessagesHub } from "@/components/messages/messages-hub"

export default async function MessagesPage() {
  const { profile, messages, people, contacts } = await getMessagesOverview()

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" description="Preview conversations and chat in real time." />
      <MessagesHub me={profile} initialMessages={messages} people={people} contacts={contacts} />
    </div>
  )
}
