"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { io as ClientIO, Socket } from "socket.io-client";
import { useUser } from "@clerk/nextjs";
import { getDbUserId } from "@/actions/user.action";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: string[];
  isUserOnline: (userId: string) => boolean;
  currentDbUserId: string | null;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  emitTyping: (conversationId: string, isTyping: boolean, username?: string) => void;
  emitSendMessage: (conversationId: string, message: any, recipientId?: string) => void;
  emitMarkRead: (conversationId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  onlineUsers: [],
  isUserOnline: () => false,
  currentDbUserId: null,
  joinConversation: () => {},
  leaveConversation: () => {},
  emitTyping: () => {},
  emitSendMessage: () => {},
  emitMarkRead: () => {},
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, user } = useUser();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [currentDbUserId, setCurrentDbUserId] = useState<string | null>(null);
  const activeConversationRef = useRef<string | null>(null);

  // Fetch current user DB ID
  useEffect(() => {
    let mounted = true;
    if (isSignedIn && user) {
      getDbUserId().then((dbId) => {
        if (mounted && dbId) {
          setCurrentDbUserId(dbId);
        }
      });
    } else {
      setCurrentDbUserId(null);
    }
    return () => {
      mounted = false;
    };
  }, [isSignedIn, user]);

  // Connect socket when currentDbUserId is available
  useEffect(() => {
    if (!currentDbUserId) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setOnlineUsers([]);
      }
      return;
    }

    const socketUrl = typeof window !== "undefined" ? window.location.origin : "";
    const socketInstance = ClientIO(socketUrl, {
      path: "/api/socket/io",
      auth: { userId: currentDbUserId },
      query: { userId: currentDbUserId },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
      // Re-join active conversation room if we reconnected
      if (activeConversationRef.current) {
        socketInstance.emit("join:conversation", activeConversationRef.current);
      }
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    socketInstance.on("users:online", (users: string[]) => {
      setOnlineUsers(users);
    });

    socketInstance.on("user:online", ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
    });

    socketInstance.on("user:offline", ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [currentDbUserId]);

  const isUserOnline = useCallback(
    (userId: string) => {
      return onlineUsers.includes(userId);
    },
    [onlineUsers]
  );

  const joinConversation = useCallback(
    (conversationId: string) => {
      activeConversationRef.current = conversationId;
      if (socket && conversationId) {
        socket.emit("join:conversation", conversationId);
      }
    },
    [socket]
  );

  const leaveConversation = useCallback(
    (conversationId: string) => {
      if (activeConversationRef.current === conversationId) {
        activeConversationRef.current = null;
      }
      if (socket && conversationId) {
        socket.emit("leave:conversation", conversationId);
      }
    },
    [socket]
  );

  const emitTyping = useCallback(
    (conversationId: string, isTyping: boolean, username?: string) => {
      if (!socket || !conversationId) return;
      const event = isTyping ? "typing:start" : "typing:stop";
      socket.emit(event, {
        conversationId,
        userId: currentDbUserId,
        username: username || user?.username || user?.firstName || "Someone",
      });
    },
    [socket, currentDbUserId, user]
  );

  const emitSendMessage = useCallback(
    (conversationId: string, message: any, recipientId?: string) => {
      if (!socket || !conversationId) return;
      socket.emit("message:send", {
        conversationId,
        message,
        recipientId,
      });
    },
    [socket]
  );

  const emitMarkRead = useCallback(
    (conversationId: string) => {
      if (!socket || !conversationId || !currentDbUserId) return;
      socket.emit("message:read", {
        conversationId,
        readerId: currentDbUserId,
      });
    },
    [socket, currentDbUserId]
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers,
        isUserOnline,
        currentDbUserId,
        joinConversation,
        leaveConversation,
        emitTyping,
        emitSendMessage,
        emitMarkRead,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
