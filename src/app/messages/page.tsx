import { getConversations } from "@/actions/message.action";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

export default async function MessagesPage() {
  const conversations = await getConversations();

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {conversations.length === 0 && <p className="text-sm text-muted-foreground">No conversations yet.</p>}
          {conversations.map((conversation) => {
            const latest = conversation.messages[0];
            const other = conversation.participants.find((participant) => participant.user.id !== latest?.senderId)?.user ?? conversation.participants[0]?.user;
            const isOnline = other?.lastSeenAt && Date.now() - new Date(other.lastSeenAt).getTime() < 5 * 60 * 1000;
            return (
              <div key={conversation.id} className="flex items-center gap-3 rounded-md border p-3">
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={other?.image ?? "/avatar.png"} />
                  </Avatar>
                  <span className={`absolute bottom-0 right-0 size-3 rounded-full border ${isOnline ? "bg-green-500" : "bg-muted-foreground"}`} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{other?.name ?? other?.username ?? "Conversation"}</p>
                  <p className="truncate text-sm text-muted-foreground">{latest?.content ?? latest?.mediaUrl ?? "No messages yet"}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Card className="lg:col-span-8">
        <CardHeader>
          <CardTitle>Message history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {conversations[0]?.messages.map((message) => (
            <div key={message.id} className="rounded-md border p-3">
              <p className="text-sm font-medium">@{message.sender.username}</p>
              <p className="text-sm">{message.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })} · {message.reads.length} read
              </p>
            </div>
          )) ?? <p className="text-sm text-muted-foreground">Select or start a conversation.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
