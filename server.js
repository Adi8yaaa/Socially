const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  });

  const io = new Server(httpServer, {
    path: "/api/socket/io",
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Track online users: userId -> Set(socketId)
  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;

    if (userId && typeof userId === "string") {
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId).add(socket.id);
      socket.join(`user:${userId}`);

      // Broadcast user online to everyone
      io.emit("user:online", { userId });

      // Send initial online users to connected client
      socket.emit("users:online", Array.from(onlineUsers.keys()));
    }

    // Join conversation room
    socket.on("join:conversation", (conversationId) => {
      if (conversationId) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    // Leave conversation room
    socket.on("leave:conversation", (conversationId) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    // Typing indicators
    socket.on("typing:start", ({ conversationId, userId, username }) => {
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit("typing:update", {
          conversationId,
          userId,
          username,
          isTyping: true,
        });
      }
    });

    socket.on("typing:stop", ({ conversationId, userId }) => {
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit("typing:update", {
          conversationId,
          userId,
          isTyping: false,
        });
      }
    });

    // Message events
    socket.on("message:send", (data) => {
      if (data?.conversationId && data?.message) {
        // Emit to conversation room (including sender if needed, or to all clients in conversation)
        io.to(`conversation:${data.conversationId}`).emit("message:new", data.message);

        // Also emit to recipient's personal user room
        if (data.recipientId) {
          io.to(`user:${data.recipientId}`).emit("message:new", data.message);
        }
      }
    });

    // Read receipts
    socket.on("message:read", ({ conversationId, readerId }) => {
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit("message:read_update", {
          conversationId,
          readerId,
        });
      }
    });

    socket.on("disconnect", () => {
      if (userId && onlineUsers.has(userId)) {
        const userSockets = onlineUsers.get(userId);
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit("user:offline", { userId });
        }
      }
    });
  });

  httpServer.once("error", (err) => {
    console.error(err);
    process.exit(1);
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO attached on path /api/socket/io`);
  });
});
