import fs from "fs/promises";
import path from "path";
import { supabaseSelect, supabaseUpsert } from "./supabase";

export interface WatchEntry {
  animeId: number;
  episode: number;
  position: number; // seconds
  title?: string;
  image?: string;
  updatedAt: number; // ms
}

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: number;
  watchHistory: WatchEntry[];
}

interface DbSchema {
  users: UserRecord[];
}

const DATA_DIR = path.resolve("server/data");
const DB_PATH = path.join(DATA_DIR, "users.json");

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
}

async function readDb(): Promise<DbSchema> {
  await ensureDir();
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return { users: [] };
    if (!Array.isArray(data.users)) data.users = [];
    return data as DbSchema;
  } catch {
    return { users: [] };
  }
}

async function writeDb(db: DbSchema): Promise<void> {
  await ensureDir();
  const tmp = DB_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_PATH);
}

let writeQueue = Promise.resolve();
async function withWrite<T>(fn: (db: DbSchema) => Promise<T>): Promise<T> {
  writeQueue = writeQueue.then(async () => {
    const db = await readDb();
    const res = await fn(db);
    await writeDb(db);
    return res;
  });
  return writeQueue as unknown as T;
}

const USE_SUPABASE = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function findUserByUsername(username: string): Promise<UserRecord | null> {
  if (USE_SUPABASE) {
    try {
      const rows = await supabaseSelect("users", `?username=eq.${encodeURIComponent(username)}&select=*`);
      if (Array.isArray(rows) && rows.length) {
        const r = rows[0];
        return { id: r.id, username: r.username, passwordHash: r.password_hash, createdAt: r.created_at, watchHistory: [] };
      }
    } catch (e) {
      // fallback to json
    }
  }
  const db = await readDb();
  return db.users.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  if (USE_SUPABASE) {
    try {
      const rows = await supabaseSelect("users", `?id=eq.${encodeURIComponent(id)}&select=*`);
      if (Array.isArray(rows) && rows.length) {
        const r = rows[0];
        return { id: r.id, username: r.username, passwordHash: r.password_hash, createdAt: r.created_at, watchHistory: [] };
      }
    } catch (e) {
      // fallback
    }
  }
  const db = await readDb();
  return db.users.find((u) => u.id === id) || null;
}

export async function createUser(user: Omit<UserRecord, "createdAt" | "watchHistory">): Promise<UserRecord> {
  const now = Date.now();
  const rec: UserRecord = { ...user, createdAt: now, watchHistory: [] };
  if (USE_SUPABASE) {
    try {
      await supabaseUpsert("users", { id: rec.id, username: rec.username, password_hash: rec.passwordHash, created_at: rec.createdAt }, "id");
      return rec;
    } catch (e) {
      // fallback to json
    }
  }
  return withWrite(async (db) => {
    db.users.push(rec);
    return rec;
  });
}

export async function upsertWatchProgress(userId: string, entry: Omit<WatchEntry, "updatedAt">): Promise<WatchEntry[]> {
  const now = Date.now();
  const item: WatchEntry = { ...entry, updatedAt: now };
  if (USE_SUPABASE) {
    try {
      // upsert into watch_history table using composite key (user_id, anime_id)
      await supabaseUpsert("watch_history", { user_id: userId, anime_id: item.animeId, episode: item.episode, position: item.position, title: item.title, image: item.image, updated_at: item.updatedAt }, "user_id,anime_id");
      // return list from supabase
      const rows = await supabaseSelect("watch_history", `?user_id=eq.${encodeURIComponent(userId)}&select=anime_id,episode,position,title,image,updated_at`);
      return (Array.isArray(rows) ? rows.map((r: any) => ({ animeId: Number(r.anime_id), episode: Number(r.episode), position: Number(r.position), title: r.title || undefined, image: r.image || undefined, updatedAt: Number(r.updated_at) })) : []).sort((a,b)=>b.updatedAt-a.updatedAt);
    } catch (e) {
      // fallback
    }
  }

  return withWrite(async (db) => {
    const u = db.users.find((x) => x.id === userId);
    if (!u) throw new Error("User not found");
    const idx = u.watchHistory.findIndex((w) => w.animeId === entry.animeId);
    if (idx >= 0) {
      u.watchHistory[idx] = item;
    } else {
      u.watchHistory.push(item);
    }
    return u.watchHistory.slice();
  });
}

export async function getWatchHistory(userId: string): Promise<WatchEntry[]> {
  if (USE_SUPABASE) {
    try {
      const rows = await supabaseSelect("watch_history", `?user_id=eq.${encodeURIComponent(userId)}&select=anime_id,episode,position,title,image,updated_at&order=updated_at.desc`);
      if (Array.isArray(rows)) {
        return rows.map((r: any) => ({ animeId: Number(r.anime_id), episode: Number(r.episode), position: Number(r.position), title: r.title || undefined, image: r.image || undefined, updatedAt: Number(r.updated_at) }));
      }
    } catch (e) {
      // fallback
    }
  }
  const u = await findUserById(userId);
  return u?.watchHistory?.slice().sort((a, b) => b.updatedAt - a.updatedAt) || [];
}
