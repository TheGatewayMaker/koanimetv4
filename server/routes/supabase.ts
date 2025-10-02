import type { RequestHandler } from "express";
import path from "path";
import fs from "fs/promises";
import { supabaseUpsert } from "../utils/supabase";

export const migrateToSupabase: RequestHandler = async (_req, res) => {
  try {
    const DATA_PATH = path.join(process.cwd(), "server", "data", "users.json");
    const raw = await fs.readFile(DATA_PATH, "utf8").catch(() => null);
    if (!raw) return res.status(400).json({ error: "No local data to migrate" });
    const db = JSON.parse(raw);
    if (!db || !Array.isArray(db.users)) return res.status(400).json({ error: "Invalid data" });

    for (const u of db.users) {
      const id = u.id;
      const username = u.username;
      const password_hash = u.passwordHash;
      const created_at = u.createdAt || Date.now();
      await supabaseUpsert("users", { id, username, password_hash, created_at }, "id");
      if (Array.isArray(u.watchHistory)) {
        for (const w of u.watchHistory) {
          await supabaseUpsert("watch_history", { user_id: id, anime_id: w.animeId, episode: w.episode, position: w.position, title: w.title, image: w.image, updated_at: w.updatedAt }, "user_id,anime_id");
        }
      }
    }

    return res.json({ migrated: db.users.length });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Migration failed" });
  }
};
