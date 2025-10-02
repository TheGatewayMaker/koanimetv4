import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  getTrending,
  getSearch,
  getInfo,
  getEpisodes,
  getDiscover,
  getGenres,
  getStreaming,
  getNewReleases,
} from "./routes/anime";
import {
  searchAniList,
  getAniListInfo,
  getAniListEpisodes,
} from "./routes/anilist";
import { authRequired } from "./utils/auth";
import { login, me, signup } from "./routes/auth";
import { getContinueWatching, postProgress } from "./routes/user";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Expose Firebase config (for clients when build-time envs are absent)
  app.get("/api/firebase/config", (_req, res) => {
    const cfg = {
      apiKey: process.env.VITE_FIREBASE_API_KEY || null,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || null,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || null,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || null,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || null,
      appId: process.env.VITE_FIREBASE_APP_ID || null,
      measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || null,
    };
    res.json({ config: cfg });
  });

  // Auth routes
  app.post("/api/auth/signup", signup);
  app.post("/api/auth/login", login);
  app.get("/api/auth/me", authRequired, me);

  // User progress routes
  app.get("/api/user/continue", authRequired, getContinueWatching);
  app.post("/api/user/progress", authRequired, postProgress);

  // Supabase migration (one-time)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    import("./routes/supabase")
      .then((mod) => {
        if (mod && typeof mod.migrateToSupabase === "function") {
          app.post("/api/supabase/migrate", mod.migrateToSupabase);
        }
      })
      .catch(() => {
        // ignore
      });
  }

  // Anime API proxies (Jikan)
  app.get("/api/anime/trending", getTrending);
  app.get("/api/anime/search", getSearch);
  app.get("/api/anime/info/:id", getInfo);
  app.get("/api/anime/episodes/:id", getEpisodes);
  app.get("/api/anime/discover", getDiscover);
  app.get("/api/anime/genres", getGenres);
  app.get("/api/anime/streams/:id", getStreaming);
  app.get("/api/anime/new", getNewReleases);

  // AniList API routes
  app.get("/api/anilist/search", searchAniList);
  app.get("/api/anilist/info/:id", getAniListInfo);
  app.get("/api/anilist/episodes/:id", getAniListEpisodes);

  return app;
}
