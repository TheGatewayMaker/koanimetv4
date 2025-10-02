import type { RequestHandler } from "express";
import { getWatchHistory, upsertWatchProgress } from "../utils/user-store";

export const getContinueWatching: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId as string | undefined;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const history = await getWatchHistory(userId);
    res.json({ history });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed" });
  }
};

export const postProgress: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId as string | undefined;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { animeId, episode, position, title, image } = req.body || {};
    const aId = Number(animeId);
    const ep = Number(episode);
    const pos = Number(position);
    if (!Number.isFinite(aId) || !Number.isFinite(ep) || !Number.isFinite(pos) || pos < 0) {
      return res.status(400).json({ error: "Invalid payload" });
    }
    const history = await upsertWatchProgress(userId, {
      animeId: aId,
      episode: ep,
      position: pos,
      title: typeof title === "string" ? title : undefined,
      image: typeof image === "string" ? image : undefined,
    });
    res.json({ history });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed" });
  }
};
