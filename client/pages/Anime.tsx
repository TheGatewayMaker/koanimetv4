import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import {
  fetchAnimeInfo,
  fetchEpisodes,
  ApiAnimeSummary,
  EpisodeItem,
} from "../lib/anime";
import { toast } from "sonner";

export default function AnimePage() {
  const params = useParams();
  const id = Number(params.id);
  const [info, setInfo] = useState<ApiAnimeSummary | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [episodesPagination, setEpisodesPagination] = useState<any>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingInfo(true);
      try {
        const i = await fetchAnimeInfo(id);
        if (!i) {
          toast("Failed to load anime info", {
            description: "Could not fetch anime details from the API.",
          });
          setInfo(null);
          setSelectedId(id);
        } else {
          setInfo(i);
          const baseSeason =
            i.seasons && i.seasons.length > 0 ? i.seasons[0].id : id;
          setSelectedId(baseSeason);
        }
      } catch (e) {
        console.error(e);
        toast("Network error", {
          description: "Failed to fetch anime data. Please try again later.",
        });
        setInfo(null);
        setSelectedId(id);
      } finally {
        setLoadingInfo(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      setLoadingEpisodes(true);
      try {
        const resp = await fetchEpisodes(selectedId, 1);
        if (!resp || !Array.isArray(resp.episodes)) {
          toast("Failed to load episodes", {
            description: "Could not fetch episodes for this season.",
          });
          setEpisodes([]);
          setEpisodesPagination(null);
        } else {
          setEpisodes(resp.episodes || []);
          setEpisodesPagination(resp.pagination || null);
        }
      } catch (e) {
        console.error(e);
        toast("Network error", {
          description: "Failed to fetch episodes. Please try again later.",
        });
        setEpisodes([]);
        setEpisodesPagination(null);
      } finally {
        setLoadingEpisodes(false);
      }
    })();
  }, [selectedId]);

  const banner = useMemo(() => info?.image ?? "", [info]);
  const loading = loadingInfo || loadingEpisodes;
  const seasons = info?.seasons || [];
  const currentSeasonIndex = useMemo(() => {
    if (!seasons || !selectedId) return 0;
    const idx = seasons.findIndex((s) => s.id === selectedId);
    return idx >= 0 ? idx : 0;
  }, [seasons, selectedId]);

  return (
    <Layout>
      {loading ? (
        <div className="container mx-auto px-4 py-8">
          <div className="aspect-[16/6] w-full animate-pulse rounded-md bg-muted" />
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-3">
              <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-64 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ) : info || episodes.length > 0 ? (
        <div>
          {info && (
            <section className="relative overflow-hidden">
              <div className="relative h-48 md:h-56 lg:h-64 w-full">
                <img
                  src={banner}
                  alt="banner"
                  className="h-full w-full object-cover opacity-40"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/30 to-background" />
              </div>
              <div className="container mx-auto px-4 py-4 md:py-6">
                <div className="flex flex-col gap-6 md:flex-row">
                  <img
                    src={info.image}
                    alt={info.title}
                    className="h-[220px] w-[170px] rounded-md border object-cover"
                  />
                  <div className="flex-1">
                    <h1 className="text-xl font-bold md:text-3xl">
                      {info.title}
                    </h1>
                    <div className="mt-2 text-sm text-foreground/70">
                      {info.type} {info.year ? `• ${info.year}` : ""}
                      {info.rating != null && (
                        <span className="ml-2 rounded bg-black/20 px-2 py-0.5 text-xs">
                          ⭐ {info.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {info.genres && info.genres.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {info.genres.map((g) => (
                          <span
                            key={g}
                            className="rounded bg-accent px-2 py-1 text-xs"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                    {info.synopsis && (
                      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-foreground/80">
                        {info.synopsis}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="container mx-auto px-4 pb-10">
            <h2 className="mb-3 text-lg font-semibold">Episodes</h2>

            {info?.type !== "MOVIE" && (
              <div className="mb-4 flex items-center gap-3 overflow-x-auto pb-1">
                {seasons.length > 0 ? (
                  seasons.map((s, i) => {
                    const active = s.id === (selectedId ?? id);
                    return (
                      <button
                        key={s.id}
                        className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm ${active ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                        onClick={() => setSelectedId(s.id)}
                        aria-pressed={active}
                      >
                        {`Season ${i + 1}`}
                      </button>
                    );
                  })
                ) : (
                  <button
                    className="rounded-full border px-3 py-1 text-sm"
                    disabled
                  >
                    Season 1
                  </button>
                )}
              </div>
            )}

            {loadingEpisodes ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[3/4] animate-pulse rounded-md bg-muted"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {episodes.map((ep) => (
                  <button
                    key={ep.id + "-" + ep.number}
                    className="rounded border px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() =>
                      toast("Streaming links unavailable", {
                        description: "Where to watch will be added later.",
                        duration: 2500,
                      })
                    }
                  >
                    <div className="font-medium">Episode {ep.number}</div>
                    {ep.title && (
                      <div className="line-clamp-1 text-xs text-foreground/60">
                        {ep.title}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-10">Not found</div>
      )}
    </Layout>
  );
}
