import express from "express";
import Message from "../models/Message.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

// GET /api/messages/:roomId?page=1&limit=30
router.get("/:roomId", async (req, res) => {
  const { roomId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;

  const messages = await Message.find({ room: roomId })
    .populate("sender", "username avatar")
    .sort("-createdAt")
    .skip((page - 1) * limit)
    .limit(limit);

  res.json(messages.reverse());
});

export default router;
