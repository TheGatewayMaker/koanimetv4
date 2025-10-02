import fs from "fs/promises";
import path from "path";

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

export async function findUserByUsername(username: string): Promise<UserRecord | null> {
  const db = await readDb();
  return db.users.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const db = await readDb();
  return db.users.find((u) => u.id === id) || null;
}

export async function createUser(user: Omit<UserRecord, "createdAt" | "watchHistory">): Promise<UserRecord> {
  return withWrite(async (db) => {
    const now = Date.now();
    const rec: UserRecord = { ...user, createdAt: now, watchHistory: [] };
    db.users.push(rec);
    return rec;
  });
}

export async function upsertWatchProgress(userId: string, entry: Omit<WatchEntry, "updatedAt">): Promise<WatchEntry[]> {
  return withWrite(async (db) => {
    const u = db.users.find((x) => x.id === userId);
    if (!u) throw new Error("User not found");
    const now = Date.now();
    const idx = u.watchHistory.findIndex((w) => w.animeId === entry.animeId);
    const item: WatchEntry = { ...entry, updatedAt: now };
    if (idx >= 0) {
      u.watchHistory[idx] = item;
    } else {
      u.watchHistory.push(item);
    }
    return u.watchHistory.slice();
  });
}

export async function getWatchHistory(userId: string): Promise<WatchEntry[]> {
  const u = await findUserById(userId);
  return u?.watchHistory?.slice().sort((a, b) => b.updatedAt - a.updatedAt) || [];
}
