"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ConversationList from "./ConversationList";
import ChatWindow from "./ChatWindow";
import { getOrCreateConversation } from "@/actions/message.action";
import toast from "react-hot-toast";

interface MessagesContainerProps {
  initialConversations: any[];
}

export default function MessagesContainer({ initialConversations }: MessagesContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const conversationIdParam = searchParams.get("conversationId");
  const userIdParam = searchParams.get("userId");

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    conversationIdParam || initialConversations[0]?.id || null
  );

  // Handle ?userId= parameter to auto-initiate or open conversation
  useEffect(() => {
    if (userIdParam) {
      getOrCreateConversation(userIdParam).then((res) => {
        if (res.success && res.conversationId) {
          setSelectedConversationId(res.conversationId);
          router.replace(`/messages?conversationId=${res.conversationId}`);
        } else {
          toast.error(res.error || "Could not open conversation with this user");
        }
      });
    }
  }, [userIdParam, router]);

  // Handle ?conversationId= param if set
  useEffect(() => {
    if (conversationIdParam) {
      setSelectedConversationId(conversationIdParam);
    }
  }, [conversationIdParam]);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    router.replace(`/messages?conversationId=${id}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[600px]">
      {/* Conversation List */}
      <div
        className={`h-full md:col-span-5 lg:col-span-4 ${
          selectedConversationId ? "hidden md:block" : "block"
        }`}
      >
        <ConversationList
          initialConversations={initialConversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          onConversationCreated={handleSelectConversation}
        />
      </div>

      {/* Chat Window */}
      <div
        className={`h-full md:col-span-7 lg:col-span-8 ${
          !selectedConversationId ? "hidden md:block" : "block"
        }`}
      >
        <ChatWindow
          conversationId={selectedConversationId}
          onBack={() => {
            setSelectedConversationId(null);
            router.replace("/messages");
          }}
        />
      </div>
    </div>
  );
}
