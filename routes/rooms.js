import express from "express";
import Room from "../models/Room.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

// GET /api/rooms - list all public/group channels (excludes DMs)
router.get("/", async (req, res) => {
  const rooms = await Room.find({
    isDirectMessage: { $ne: true },
    $or: [{ isPrivate: false }, { members: req.user._id }],
  })
    .populate("createdBy", "username avatar")
    .sort("-createdAt");
  res.json(rooms);
});

// GET /api/rooms/dms - list my direct message conversations
router.get("/dms", async (req, res) => {
  const dms = await Room.find({
    isDirectMessage: true,
    members: req.user._id,
  }).populate("members", "username avatar status lastSeen");

  // Reshape so frontend gets the "other person" directly
  const shaped = dms.map((room) => {
    const other = room.members.find((m) => String(m._id) !== String(req.user._id));
    return { _id: room._id, isDirectMessage: true, user: other, updatedAt: room.updatedAt };
  });
  res.json(shaped);
});

// POST /api/rooms - create a room/channel
router.post("/", async (req, res) => {
  const { name, description, isPrivate } = req.body;
  if (!name) return res.status(400).json({ message: "Room name required" });

  const room = await Room.create({
    name,
    description,
    isPrivate: !!isPrivate,
    createdBy: req.user._id,
    members: [req.user._id],
  });
  res.status(201).json(room);
});

// POST /api/rooms/:id/join
router.post("/:id/join", async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ message: "Room not found" });
  if (!room.members.includes(req.user._id)) {
    room.members.push(req.user._id);
    await room.save();
  }
  res.json(room);
});

// GET /api/rooms/:id
router.get("/:id", async (req, res) => {
  const room = await Room.findById(req.params.id).populate("members", "username avatar status");
  if (!room) return res.status(404).json({ message: "Room not found" });
  res.json(room);
});

export default router;
