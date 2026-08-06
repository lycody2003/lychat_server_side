import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "username, email, password \u178f\u17d2\u179a\u17bc\u179c\u178f\u17c2\u1798\u17be\u1793\u1782\u17d2\u179a\u1794\u17cb" });
    }

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(409).json({ message: "Username \u17ac email \u1793\u17c1\u17c7\u178f\u17d2\u179a\u17bc\u179c\u1794\u17b6\u1793\u1795\u17b6\u1793\u178a\u17c2\u179b\u1798\u17be\u1799\u179a\u17ba\u1798\u17bd\u1799\u17a0\u17c4\u1799" });

    const user = await User.create({ username, email, password });
    const token = signToken(user._id);
    res.status(201).json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Email \u17ac password \u1798\u17b7\u1793\u178f\u17d2\u179a\u17b9\u1798\u178f\u17d2\u179a\u17bc\u179c" });
    }
    user.status = "online";
    await user.save();
    const token = signToken(user._id);
    res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get("/me", protect, async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
});

// POST /api/auth/logout
router.post("/logout", protect, async (req, res) => {
  req.user.status = "offline";
  req.user.lastSeen = new Date();
  await req.user.save();
  res.json({ message: "Logged out" });
});

export default router;
