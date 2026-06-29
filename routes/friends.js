import express from "express";
import User from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";
import Room from "../models/Room.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

// GET /api/friends/search?q=username
router.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json([]);
  const users = await User.find({
    _id: { $ne: req.user._id },
    username: { $regex: q, $options: "i" },
  })
    .select("username avatar status")
    .limit(15);
  res.json(users);
});

// GET /api/friends - my friend list
router.get("/", async (req, res) => {
  const me = await req.user.populate("friends", "username avatar status lastSeen");
  res.json(me.friends);
});

// GET /api/friends/requests - pending requests sent TO me
router.get("/requests", async (req, res) => {
  const requests = await FriendRequest.find({ to: req.user._id, status: "pending" }).populate(
    "from",
    "username avatar"
  );
  res.json(requests);
});

// GET /api/friends/requests/sent - requests I sent (pending)
router.get("/requests/sent", async (req, res) => {
  const requests = await FriendRequest.find({ from: req.user._id, status: "pending" }).populate(
    "to",
    "username avatar"
  );
  res.json(requests);
});

// POST /api/friends/requests - send a friend request { toUserId }
router.post("/requests", async (req, res) => {
  const { toUserId } = req.body;
  if (!toUserId || toUserId === String(req.user._id)) {
    return res.status(400).json({ message: "Invalid target user" });
  }
  if (req.user.friends.includes(toUserId)) {
    return res.status(409).json({ message: "Already friends" });
  }
  try {
    const request = await FriendRequest.create({ from: req.user._id, to: toUserId, status: "pending" });
    res.status(201).json(request);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "Request already sent" });
    res.status(500).json({ message: err.message });
  }
});

// POST /api/friends/requests/:id/accept
router.post("/requests/:id/accept", async (req, res) => {
  const request = await FriendRequest.findById(req.params.id);
  if (!request || String(request.to) !== String(req.user._id)) {
    return res.status(404).json({ message: "Request not found" });
  }
  request.status = "accepted";
  await request.save();

  await User.findByIdAndUpdate(request.from, { $addToSet: { friends: request.to } });
  await User.findByIdAndUpdate(request.to, { $addToSet: { friends: request.from } });

  res.json({ message: "Friend request accepted" });
});

// POST /api/friends/requests/:id/reject
router.post("/requests/:id/reject", async (req, res) => {
  const request = await FriendRequest.findById(req.params.id);
  if (!request || String(request.to) !== String(req.user._id)) {
    return res.status(404).json({ message: "Request not found" });
  }
  request.status = "rejected";
  await request.save();
  res.json({ message: "Friend request rejected" });
});

// DELETE /api/friends/:userId - unfriend
router.delete("/:userId", async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $pull: { friends: req.params.userId } });
  await User.findByIdAndUpdate(req.params.userId, { $pull: { friends: req.user._id } });
  res.json({ message: "Unfriended" });
});

// POST /api/friends/:userId/dm - get or create a private 1-on-1 room with a friend
router.post("/:userId/dm", async (req, res) => {
  const { userId } = req.params;
  if (!req.user.friends.map(String).includes(userId)) {
    return res.status(403).json({ message: "You must be friends to start a DM" });
  }

  let room = await Room.findOne({
    isPrivate: true,
    isDirectMessage: true,
    members: { $all: [req.user._id, userId], $size: 2 },
  });

  if (!room) {
    const other = await User.findById(userId).select("username");
    room = await Room.create({
      name: other?.username || "Direct Message",
      isPrivate: true,
      isDirectMessage: true,
      createdBy: req.user._id,
      members: [req.user._id, userId],
    });
  }

  res.json(room);
});

export default router;
