"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { PlusIcon, SearchIcon, Loader2Icon } from "lucide-react";
import { searchSocially } from "@/actions/search.action";
import { getOrCreateConversation } from "@/actions/message.action";
import { useSocket } from "@/context/SocketContext";
import toast from "react-hot-toast";

interface NewConversationDialogProps {
  onConversationCreated: (conversationId: string) => void;
  trigger?: React.ReactNode;
}

export default function NewConversationDialog({
  onConversationCreated,
  trigger,
}: NewConversationDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState<string | null>(null);
  const { isUserOnline, currentDbUserId } = useSocket();

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        setIsLoading(true);
        try {
          const res = await searchSocially({ query: searchQuery, type: "users" });
          // Filter out current user from search results
          const filtered = (res.users || []).filter((u: any) => u.id !== currentDbUserId);
          setResults(filtered);
        } catch (err) {
          console.error("Failed to search users:", err);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, open, currentDbUserId]);

  const handleStartChat = async (userId: string) => {
    try {
      setIsStarting(userId);
      const res = await getOrCreateConversation(userId);
      if (res.success && res.conversationId) {
        setOpen(false);
        onConversationCreated(res.conversationId);
        toast.success("Conversation ready");
      } else {
        toast.error(res.error || "Could not start conversation");
      }
    } catch (err) {
      toast.error("Failed to start conversation");
    } finally {
      setIsStarting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-1">
            <PlusIcon className="size-4" />
            <span>New Chat</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or @username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {isLoading && (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2Icon className="size-5 animate-spin" />
              </div>
            )}

            {!isLoading && searchQuery.trim().length > 0 && results.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">
                No users found for &quot;{searchQuery}&quot;
              </p>
            )}

            {!isLoading && searchQuery.trim().length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-6">
                Type a name or username above to find someone to chat with.
              </p>
            )}

            {results.map((u) => {
              const online = isUserOnline(u.id);
              return (
                <div
                  key={u.id}
                  onClick={() => handleStartChat(u.id)}
                  className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <Avatar className="size-10">
                        <AvatarImage src={u.image || "/avatar.png"} />
                      </Avatar>
                      <span
                        className={`absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-background ${
                          online ? "bg-green-500" : "bg-muted-foreground/40"
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{u.name || u.username}</p>
                      <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isStarting === u.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartChat(u.id);
                    }}
                  >
                    {isStarting === u.id ? (
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : (
                      "Message"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
