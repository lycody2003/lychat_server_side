import { verifyToken } from "../middleware/auth.js";
import User from "../models/User.js";
import Room from "../models/Room.js";
import Message from "../models/Message.js";

export const initChatSocket = (io) => {
  // Auth middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token"));
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error("User not found"));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", async (socket) => {
    const user = socket.user;
    user.status = "online";
    await user.save();
    io.emit("user:status", { userId: user._id, status: "online" });

    console.log(`🟢 ${user.username} connected (${socket.id})`);

    // Join a room/channel
    socket.on("room:join", async ({ roomId }) => {
      socket.join(roomId);
      socket.to(roomId).emit("room:userJoined", {
        roomId,
        user: { id: user._id, username: user.username, avatar: user.avatar },
      });
    });

    socket.on("room:leave", ({ roomId }) => {
      socket.leave(roomId);
      socket.to(roomId).emit("room:userLeft", { roomId, userId: user._id });
    });

    // Send message
    socket.on("message:send", async ({ roomId, text, attachment }) => {
      try {
        if (!text?.trim() && !attachment) return;
        const room = await Room.findById(roomId);
        if (!room) return socket.emit("error:message", { message: "Room not found" });

        const message = await Message.create({
          room: roomId,
          sender: user._id,
          text: text?.trim() || "",
          attachment: attachment || "",
        });

        const payload = {
          _id: message._id,
          room: roomId,
          text: message.text,
          attachment: message.attachment,
          createdAt: message.createdAt,
          sender: { _id: user._id, username: user.username, avatar: user.avatar },
        };

        io.to(roomId).emit("message:new", payload);
      } catch (err) {
        socket.emit("error:message", { message: err.message });
      }
    });

    // Typing indicator
    socket.on("typing:start", ({ roomId }) => {
      socket.to(roomId).emit("typing:start", { roomId, userId: user._id, username: user.username });
    });
    socket.on("typing:stop", ({ roomId }) => {
      socket.to(roomId).emit("typing:stop", { roomId, userId: user._id });
    });

    // Disconnect
    socket.on("disconnect", async () => {
      user.status = "offline";
      user.lastSeen = new Date();
      await user.save();
      io.emit("user:status", { userId: user._id, status: "offline", lastSeen: user.lastSeen });
      console.log(`🔴 ${user.username} disconnected`);
    });
  });
};
