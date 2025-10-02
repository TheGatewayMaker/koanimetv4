import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

function base64url(input: Buffer | string) {
  return (typeof input === "string" ? Buffer.from(input) : input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function sign(data: string, secret: string) {
  return base64url(crypto.createHmac("sha256", secret).update(data).digest());
}

function getSecret() {
  const s = process.env.AUTH_SECRET || process.env.JWT_SECRET || "dev-secret-change";
  return s;
}

export interface TokenPayload {
  sub: string;
  exp: number; // seconds since epoch
}

export function createToken(payload: Omit<TokenPayload, "exp">, ttlSeconds = 60 * 60 * 24 * 14) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const full: TokenPayload = { ...payload, exp: now + ttlSeconds } as TokenPayload;
  const h = base64url(JSON.stringify(header));
  const p = base64url(JSON.stringify(full));
  const toSign = `${h}.${p}`;
  const signature = sign(toSign, getSecret());
  return `${toSign}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const [h, p, s] = token.split(".");
    if (!h || !p || !s) return null;
    const expected = sign(`${h}.${p}`, getSecret());
    if (expected !== s) return null;
    const payload = JSON.parse(Buffer.from(p, "base64").toString("utf8")) as TokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && now > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100_000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const computed = crypto.pbkdf2Sync(password, salt, 100_000, 32, "sha256").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(computed, "hex"));
}

export function getAuthTokenFromRequest(req: Request): string | null {
  const auth = req.headers.authorization || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m) return m[1];
  const cookie = req.headers.cookie || "";
  const cm = cookie.match(/(?:^|; )auth=([^;]+)/);
  if (cm) return decodeURIComponent(cm[1]);
  return null;
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const token = getAuthTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const payload = verifyToken(token);
  if (!payload?.sub) return res.status(401).json({ error: "Invalid token" });
  (req as any).userId = payload.sub;
  next();
}
