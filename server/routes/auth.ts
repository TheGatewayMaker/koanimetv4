import type { RequestHandler } from "express";
import { createToken, hashPassword, verifyPassword } from "../utils/auth";
import { createUser, findUserById, findUserByUsername } from "../utils/user-store";

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const signup: RequestHandler = async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== "string" || !username.trim() || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Invalid username or password" });
    }
    const existing = await findUserByUsername(username);
    if (existing) return res.status(409).json({ error: "Username already exists" });
    const passwordHash = await hashPassword(password);
    const user = await createUser({ id: genId(), username: username.trim(), passwordHash });
    const token = createToken({ sub: user.id });
    res.json({ token, user: { id: user.id, username: user.username, createdAt: user.createdAt } });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Signup failed" });
  }
};

export const login: RequestHandler = async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    const user = await findUserByUsername(username);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const token = createToken({ sub: user.id });
    res.json({ token, user: { id: user.id, username: user.username, createdAt: user.createdAt } });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Login failed" });
  }
};

export const me: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId as string | undefined;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json({ id: user.id, username: user.username, createdAt: user.createdAt });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed" });
  }
};
