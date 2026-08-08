import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";

import { connectDB } from "./config/db.js";
import { connectRedis } from "./config/redis.js";

import authRoutes from "./routes/auth.js";
import roomRoutes from "./routes/rooms.js";
import messageRoutes from "./routes/messages.js";
import friendRoutes from "./routes/friends.js";

import { initChatSocket } from "./socket/chatSocket.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_URL || "*")
  .split(",")
  .map((url) => url.trim());

const corsOptions = {
  origin: function (origin, callback) {
    if (
      !origin ||
      allowedOrigins.includes("*") ||
      allowedOrigins.includes(origin)
    ) {
      callback(null, true);
    } else {
      callback(
        new Error(`CORS blocked: ${origin} not in allowed list`)
      );
    }
  },
  credentials: true,
};

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

app.use(cors(corsOptions));
app.use(express.json());

app.get("/api/health", (req, res) =>
  res.json({
    status: "ok",
    app: "Lychat API",
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/friends", friendRoutes);

app.use((req, res) =>
  res.status(404).json({
    message: "Route not found",
  })
);

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    message: "Server error",
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();

    initChatSocket(io);

    server.listen(PORT, () => {
      console.log(
        `🚀 Lychat API running on ${PORT}`
      );
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();