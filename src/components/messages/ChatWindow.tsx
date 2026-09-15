"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getConversation, sendMessage, markConversationRead } from "@/actions/message.action";
import { useSocket } from "@/context/SocketContext";
import { format } from "date-fns";
import { ArrowLeftIcon, CheckCheckIcon, CheckIcon, Loader2Icon, SendIcon, MessageSquareIcon } from "lucide-react";
import toast from "react-hot-toast";

interface ChatWindowProps {
  conversationId: string | null;
  onBack?: () => void;
}

export default function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
  const [conversation, setConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [typingStatus, setTypingStatus] = useState<{ isTyping: boolean; username: string }>({
    isTyping: false,
    username: "",
  });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    socket,
    isUserOnline,
    currentDbUserId,
    joinConversation,
    leaveConversation,
    emitTyping,
    emitSendMessage,
    emitMarkRead,
  } = useSocket();

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Fetch conversation when conversationId changes
  useEffect(() => {
    if (!conversationId) {
      setConversation(null);
      setMessages([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    joinConversation(conversationId);

    getConversation(conversationId)
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          setConversation(data);
          setMessages(data.messages || []);
          emitMarkRead(conversationId);
          setTimeout(() => scrollToBottom("auto"), 50);
        }
      })
      .catch((err) => console.error("Error loading chat:", err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      leaveConversation(conversationId);
    };
  }, [conversationId, joinConversation, leaveConversation, emitMarkRead]);

  // Socket event listeners for this conversation
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleNewMessage = (newMsg: any) => {
      if (newMsg.conversationId === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Mark read if it's from another user
        if (newMsg.senderId !== currentDbUserId) {
          markConversationRead(conversationId).catch(() => null);
          emitMarkRead(conversationId);
        }

        setTimeout(() => scrollToBottom("smooth"), 50);
      }
    };

    const handleTypingUpdate = (data: {
      conversationId: string;
      userId: string;
      username: string;
      isTyping: boolean;
    }) => {
      if (data.conversationId === conversationId && data.userId !== currentDbUserId) {
        setTypingStatus({
          isTyping: data.isTyping,
          username: data.username,
        });
      }
    };

    const handleReadUpdate = (data: { conversationId: string; readerId: string }) => {
      if (data.conversationId === conversationId && data.readerId !== currentDbUserId) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.senderId === currentDbUserId) {
              const alreadyRead = msg.reads?.some((r: any) => r.userId === data.readerId);
              if (!alreadyRead) {
                return {
                  ...msg,
                  reads: [...(msg.reads || []), { userId: data.readerId, readAt: new Date() }],
                };
              }
            }
            return msg;
          })
        );
      }
    };

    socket.on("message:new", handleNewMessage);
    socket.on("typing:update", handleTypingUpdate);
    socket.on("message:read_update", handleReadUpdate);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("typing:update", handleTypingUpdate);
      socket.off("message:read_update", handleReadUpdate);
    };
  }, [socket, conversationId, currentDbUserId, emitMarkRead]);

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);

    if (!conversationId) return;

    // Emit typing started
    emitTyping(conversationId, true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 1.5s of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(conversationId, false);
    }, 1500);
  };

  // Handle sending a message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmed = inputText.trim();
    if (!trimmed || !conversationId || isSending) return;

    try {
      setIsSending(true);

      // Stop typing indicator
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      emitTyping(conversationId, false);

      const res = await sendMessage({
        conversationId,
        content: trimmed,
      });

      if (res.success && res.message) {
        setInputText("");
        setMessages((prev) => [...prev, res.message]);

        // Find recipient ID to notify via socket
        const otherParticipant = conversation?.participants?.find(
          (p: any) => p.user.id !== currentDbUserId
        );
        const recipientId = otherParticipant?.user?.id;

        // Broadcast to socket room and recipient
        emitSendMessage(conversationId, res.message, recipientId);

        setTimeout(() => scrollToBottom("smooth"), 50);
      } else {
        toast.error(res.error || "Failed to send message");
      }
    } catch (err) {
      toast.error("Error sending message");
    } finally {
      setIsSending(false);
    }
  };

  if (!conversationId) {
    return (
      <Card className="h-[600px] flex flex-col items-center justify-center p-8 text-center border shadow-sm">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
          <MessageSquareIcon className="size-8" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Your Direct Messages</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Select a chat from the left or start a new conversation to begin real-time messaging.
        </p>
      </Card>
    );
  }

  const otherParticipant = conversation?.participants?.find(
    (p: any) => p.user.id !== currentDbUserId
  )?.user || conversation?.participants?.[0]?.user;

  const isOtherOnline = otherParticipant ? isUserOnline(otherParticipant.id) : false;

  return (
    <Card className="h-[600px] flex flex-col border shadow-sm overflow-hidden">
      {/* Header */}
      <CardHeader className="p-3.5 px-4 border-b flex flex-row items-center justify-between space-y-0 shrink-0 bg-card">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <Button variant="ghost" size="icon" className="md:hidden size-8 mr-1" onClick={onBack}>
              <ArrowLeftIcon className="size-4" />
            </Button>
          )}

          <div className="relative shrink-0">
            <Avatar className="size-10">
              <AvatarImage src={otherParticipant?.image || "/avatar.png"} />
            </Avatar>
            <span
              className={`absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-background ${
                isOtherOnline ? "bg-green-500" : "bg-muted-foreground/30"
              }`}
            />
          </div>

          <div className="min-w-0">
            <h4 className="font-semibold text-sm truncate">
              {otherParticipant?.name || otherParticipant?.username || "Direct Message"}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {isOtherOnline ? (
                <span className="text-green-600 dark:text-green-400 font-medium">Online</span>
              ) : (
                <span>Offline</span>
              )}
              {otherParticipant?.username && (
                <>
                  <span>•</span>
                  <span>@{otherParticipant.username}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Message Thread Area */}
      <CardContent className="flex-1 p-4 overflow-y-auto space-y-3 bg-muted/10">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <Loader2Icon className="size-6 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <p className="text-sm font-medium">No messages yet.</p>
            <p className="text-xs mt-1">Say hello to break the ice!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === currentDbUserId;
            const isRead = isMine && (msg.reads?.length || 0) > 1;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm break-words ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-card border text-foreground rounded-bl-none"
                  }`}
                >
                  {msg.mediaUrl && (
                    <div className="mb-2 overflow-hidden rounded-lg">
                      <img
                        src={msg.mediaUrl}
                        alt="attachment"
                        className="max-h-60 w-auto rounded object-cover"
                      />
                    </div>
                  )}
                  {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                </div>

                {/* Timestamp & read status */}
                <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground px-1">
                  <span>{format(new Date(msg.createdAt), "h:mm a")}</span>
                  {isMine && (
                    <span title={isRead ? "Read" : "Sent"}>
                      {isRead ? (
                        <CheckCheckIcon className="size-3 text-blue-500" />
                      ) : (
                        <CheckIcon className="size-3" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Live typing indicator */}
        {typingStatus.isTyping && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground italic py-1 animate-pulse">
            <div className="flex gap-1">
              <span className="size-1.5 rounded-full bg-muted-foreground inline-block animate-bounce [animation-delay:-0.3s]" />
              <span className="size-1.5 rounded-full bg-muted-foreground inline-block animate-bounce [animation-delay:-0.15s]" />
              <span className="size-1.5 rounded-full bg-muted-foreground inline-block animate-bounce" />
            </div>
            <span>{typingStatus.username} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {/* Message Input Footer */}
      <form onSubmit={handleSendMessage} className="p-3 border-t bg-card flex items-center gap-2">
        <Input
          placeholder="Type your message..."
          value={inputText}
          onChange={handleInputChange}
          disabled={isSending || !conversationId}
          className="flex-1 text-sm h-10"
        />
        <Button
          type="submit"
          size="icon"
          disabled={isSending || !inputText.trim()}
          className="size-10 shrink-0"
        >
          {isSending ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <SendIcon className="size-4" />
          )}
        </Button>
      </form>
    </Card>
  );
}
