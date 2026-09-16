"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { SearchIcon } from "lucide-react";
import { useSocket } from "@/context/SocketContext";
import NewConversationDialog from "./NewConversationDialog";
import { getConversations } from "@/actions/message.action";

interface ConversationListProps {
  initialConversations: any[];
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onConversationCreated: (conversationId: string) => void;
}

export default function ConversationList({
  initialConversations,
  selectedConversationId,
  onSelectConversation,
  onConversationCreated,
}: ConversationListProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [searchFilter, setSearchFilter] = useState("");
  const { socket, isUserOnline, currentDbUserId } = useSocket();

  // Sync initialConversations
  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);

  // Real-time updates when a message arrives
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMsg: any) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === newMsg.conversationId);
        if (index !== -1) {
          const updatedConv = {
            ...prev[index],
            updatedAt: new Date(newMsg.createdAt),
            messages: [newMsg],
          };
          const nextList = [...prev];
          nextList.splice(index, 1);
          return [updatedConv, ...nextList];
        } else {
          // New conversation was started from someone else, refresh conversations
          getConversations().then((fresh) => {
            if (fresh) setConversations(fresh);
          });
          return prev;
        }
      });
    };

    socket.on("message:new", handleNewMessage);

    return () => {
      socket.off("message:new", handleNewMessage);
    };
  }, [socket]);

  const filteredConversations = (conversations || []).filter((conv) => {
    if (!searchFilter.trim()) return true;
    const other =
      conv.participants?.find((p: any) => p?.user?.id !== currentDbUserId)?.user ||
      conv.participants?.[0]?.user;
    const name = other?.name?.toLowerCase() || "";
    const username = other?.username?.toLowerCase() || "";
    const term = searchFilter.toLowerCase();
    return name.includes(term) || username.includes(term);
  });

  return (
    <Card className="h-full flex flex-col border shadow-sm">
      <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg font-semibold">Messages</CardTitle>
        <NewConversationDialog
          onConversationCreated={(id) => {
            getConversations().then((fresh) => {
              if (fresh) setConversations(fresh);
            });
            onConversationCreated(id);
          }}
        />
      </CardHeader>

      <div className="px-4 pb-3">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>
      </div>

      <CardContent className="p-2 flex-1 overflow-y-auto space-y-1 divide-y divide-border/40">
        {filteredConversations.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {conversations.length === 0 ? "No conversations yet." : "No matching conversations."}
          </div>
        )}

        {filteredConversations.map((conversation) => {
          const latest = conversation.messages?.[0];
          const other =
            conversation.participants?.find((p: any) => p?.user?.id !== currentDbUserId)?.user ||
            conversation.participants?.[0]?.user;

          const isOnline = other ? isUserOnline(other.id) : false;
          const isSelected = conversation.id === selectedConversationId;

          return (
            <div
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={`flex items-center gap-3 rounded-lg p-3 cursor-pointer transition-colors pt-2.5 pb-2.5 ${
                isSelected
                  ? "bg-accent text-accent-foreground font-medium"
                  : "hover:bg-muted/60 text-muted-foreground"
              }`}
            >
              <div className="relative shrink-0">
                <Avatar className="size-11">
                  <AvatarImage src={other?.image || "/avatar.png"} />
                </Avatar>
                <span
                  className={`absolute bottom-0 right-0 size-3 rounded-full ring-2 ring-background ${
                    isOnline ? "bg-green-500" : "bg-muted-foreground/30"
                  }`}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <p className="truncate text-sm font-medium text-foreground">
                    {other?.name || other?.username || "Conversation"}
                  </p>
                  {latest?.createdAt && (
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(latest.createdAt), { addSuffix: false })}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {latest ? (
                    <>
                      {latest.senderId === currentDbUserId && <span className="font-semibold">You: </span>}
                      {latest.content || (latest.mediaUrl ? "Sent an attachment" : "")}
                    </>
                  ) : (
                    "No messages yet"
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
