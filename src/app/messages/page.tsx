import { getConversations } from "@/actions/message.action";
import MessagesContainer from "@/components/messages/MessagesContainer";
import { Suspense } from "react";
import { Loader2Icon } from "lucide-react";

export default async function MessagesPage() {
  const conversations = await getConversations();

  return (
    <div className="w-full">
      <Suspense
        fallback={
          <div className="h-[600px] flex items-center justify-center text-muted-foreground">
            <Loader2Icon className="size-6 animate-spin" />
          </div>
        }
      >
        <MessagesContainer initialConversations={conversations} />
      </Suspense>
    </div>
  );
}
