import type { RequestHandler } from "express";
import { safeFetch } from "../utils/safe-fetch";

const JIKAN_BASE = "https://api.jikan.moe/v4";
const ANIMEDEX_BASE = "https://api3.anime-dexter-live.workers.dev";
const ANILIST_GQL = "https://graphql.anilist.co";

// Simple in-memory cache with TTL
const TTL_MS = 5 * 60 * 1000;
const cache: Record<string, { at: number; data: any }> = {};
function getCached<T = any>(key: string): T | null {
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) return null;
  return entry.data as T;
}
function setCached(key: string, data: any) {
  cache[key] = { at: Date.now(), data };
}

async function fetchJson(url: string, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await safeFetch(url, { signal: controller.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchDex(path: string, timeoutMs = 12000) {
  const url = `${ANIMEDEX_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await safeFetch(url, {
      headers: { Accept: "application/json", "User-Agent": "KoAnime/1.0" },
      signal: controller.signal,
    });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function gql<T>(query: string, variables: Record<string, any>, timeoutMs = 12000): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await safeFetch(ANILIST_GQL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const j = await res.json();
    if (j?.errors) return null;
    return j?.data as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function mapJikanAnimeToSummary(a: any) {
  const id = a?.mal_id ?? a?.id ?? null;
  const title = a?.title_english || a?.title || "";
  const image = a?.images?.jpg?.large_image_url || a?.images?.jpg?.image_url || a?.image_url || "";
  const type = a?.type || undefined;
  const year = a?.year ?? null;
  const rating = typeof a?.score === "number" ? a.score : null;
  const synopsis = typeof a?.synopsis === "string" ? a.synopsis : "";
  const genres = Array.isArray(a?.genres) ? a.genres.map((g: any) => g?.name).filter(Boolean) : [];
  return { id, title, image, type, year, rating, synopsis, genres };
}

export const getTrending: RequestHandler = async (_req, res) => {
  try {
    const key = `jikan:top:anime:24`;
    let j = getCached<any>(key);
    if (!j) {
      j = await fetchJson(`${JIKAN_BASE}/top/anime?limit=24&sfw`, 12000);
      if (j) setCached(key, j);
    }
    const results = ((j?.data as any[]) || []).map(mapJikanAnimeToSummary);
    res.json({ results });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to fetch trending" });
  }
};

export const getSearch: RequestHandler = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ results: [] });

    const url = `${JIKAN_BASE}/anime?q=${encodeURIComponent(q)}&limit=30&sfw&order_by=members&sort=desc`;
    const j = await fetchJson(url, 12000);
    const raw: any[] = (j?.data as any[]) || [];

    const norm = (s: string) => (s || "").toLowerCase().trim();
    const qNorm = norm(q);

    function allTitles(item: any) {
      const t: string[] = [];
      if (item?.title) t.push(String(item.title));
      if (item?.title_english) t.push(String(item.title_english));
      if (Array.isArray(item?.titles)) t.push(...item.titles.map((x: any) => String(x?.title || "")).filter(Boolean));
      return t.map(norm).filter(Boolean);
    }

    const exactMatches: any[] = [];
    const includesMatches: any[] = [];
    const tokenMatches: any[] = [];

    const tokens = qNorm.split(/\s+/).filter(Boolean);

    for (const a of raw) {
      const titles = allTitles(a);
      const hay = titles.join(" | ");
      if (!hay) continue;
      if (titles.some((t) => t === qNorm)) {
        exactMatches.push(a);
        continue;
      }
      if (hay.includes(qNorm)) {
        includesMatches.push(a);
        continue;
      }
      if (tokens.every((tk) => hay.includes(tk))) tokenMatches.push(a);
    }

    const toResult = (a: any) => ({ mal_id: a?.mal_id ?? null, title: a?.title_english || a?.title || "", image_url: a?.images?.jpg?.image_url || "", type: a?.type, year: a?.year ?? null });

    let ranked = [...exactMatches, ...includesMatches, ...tokenMatches].slice(0, 20).map(toResult);
    if (!ranked.length) ranked = raw.slice(0, 20).map(toResult);

    res.json({ results: ranked });
  } catch (e: any) {
    const q = String(req.query.q || "").trim();
    const dj = q ? await fetchDex(`/search/${encodeURIComponent(q)}`) : null;
    const arr: any[] = Array.isArray(dj) ? dj : dj?.results || dj?.data || dj?.items || dj?.animes || [];
    const ranked = arr.slice(0, 20).map((a: any) => ({ mal_id: a?.mal_id ?? a?.id ?? a?.animeId ?? null, title: a?.title ?? a?.name ?? a?.animeTitle ?? "", image_url: a?.image ?? a?.img ?? a?.poster ?? "", type: a?.type ?? a?.format ?? undefined, year: typeof a?.year === "number" ? a.year : typeof a?.releaseDate === "string" ? Number((a.releaseDate.match(/\d{4}/) || [])[0]) || null : null }));
    if (ranked.length) return res.json({ results: ranked });
    res.status(500).json({ error: e?.message || "Search failed" });
  }
};

export const getInfo: RequestHandler = async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: "Invalid id" });

    const j = await fetchJson(`${JIKAN_BASE}/anime/${id}/full`, 12000);
    const a = j?.data;
    if (!a) return res.status(404).json({ error: "Not found" });

    const base = mapJikanAnimeToSummary(a);

    // Build seasons using relations (best-effort)
    const seasons = (a?.relations || [])
      .flatMap((r: any) => (Array.isArray(r?.entry) ? r.entry : []))
      .filter(Boolean)
      .map((n: any, idx: number) => ({ id: n.mal_id, number: idx + 1, title: n?.title_english || n?.title }));

    res.json({ ...base, seasons });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Info failed" });
  }
};

export const getEpisodes: RequestHandler = async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const page = Math.max(1, Number(req.query.page || 1) || 1);
    if (!/^\d+$/.test(id)) return res.json({ episodes: [], pagination: null });
    const j = await fetchJson(`${JIKAN_BASE}/anime/${id}/episodes?page=${page}`, 12000);
    const items: any[] = (j?.data as any[]) || [];
    const episodes = items.map((ep: any, idx: number) => ({ id: String(ep?.mal_id ?? `${id}-${(page - 1) * 100 + idx + 1}`), number: typeof ep?.mal_id === "number" ? ep.mal_id : (ep?.episode ?? ep?.number ?? idx + 1), title: ep?.title || ep?.title_romanji || ep?.title_ja || undefined, air_date: ep?.aired || null }));
    const pagination = j?.pagination || null;
    return res.json({ episodes, pagination: pagination ? { ...pagination, last_visible_page: pagination?.last_visible_page ?? pagination?.last_page ?? null } : null });
  } catch (e: any) {
    return res.json({ episodes: [], pagination: null });
  }
};

export const getDiscover: RequestHandler = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const page = Math.max(1, Number(req.query.page || 1) || 1);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(page));
    params.set("limit", "24");
    params.set("sfw", "true");
    const url = `${JIKAN_BASE}/anime?${params.toString()}`;
    const j = await fetchJson(url, 12000);
    const results = ((j?.data as any[]) || []).map(mapJikanAnimeToSummary);
    res.json({ results, pagination: { page: j?.pagination?.current_page ?? page, has_next_page: !!j?.pagination?.has_next_page, last_visible_page: j?.pagination?.last_visible_page ?? j?.pagination?.last_page ?? null } });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Discover failed" });
  }
};

export const getGenres: RequestHandler = async (_req, res) => {
  try {
    const j = await fetchJson(`${JIKAN_BASE}/genres/anime`, 12000);
    const items: any[] = (j?.data as any[]) || [];
    const genres = items.map((g) => ({ id: g.mal_id, name: g.name }));
    res.json({ genres });
  } catch {
    res.json({ genres: [] });
  }
};

export const getStreaming: RequestHandler = async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!/^\d+$/.test(id)) return res.json({ links: [] });
    const j = await fetchJson(`${JIKAN_BASE}/anime/${id}/streaming`, 12000);
    const items: any[] = (j?.data as any[]) || [];
    const links = items.filter((s) => s?.url).map((s) => ({ name: s?.name || s?.site || "", url: s.url }));
    res.json({ links });
  } catch {
    res.json({ links: [] });
  }
};

export const getNewReleases: RequestHandler = async (_req, res) => {
  try {
    const key = `jikan:seasons:now`;
    let j = getCached<any>(key);
    if (!j) {
      j = await fetchJson(`${JIKAN_BASE}/seasons/now?limit=24&sfw`, 12000);
      if (j) setCached(key, j);
    }
    const results = ((j?.data as any[]) || []).map(mapJikanAnimeToSummary);
    res.json({ results });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to fetch new releases" });
  }
};
