import { useEffect, useState } from "react";
import { useAuth } from "../providers/AuthProvider";
import type { WatchEntry } from "@shared/api";
import { Link } from "react-router-dom";

export function ContinueWatching() {
  const { user, getContinue } = useAuth();
  const [items, setItems] = useState<WatchEntry[]>([]);

  useEffect(() => {
    (async () => {
      if (!user) return setItems([]);
      const h = await getContinue();
      setItems(h.slice(0, 10));
    })();
  }, [user]);

  if (!user || items.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-6 md:py-8">
      <h2 className="mb-4 text-lg font-semibold md:text-2xl">
        Continue Watching
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
        {items.map((it) => (
          <Link
            key={`${it.animeId}-${it.episode}`}
            to={`/watch/${it.animeId}?ep=${it.episode}`}
            className="group block"
          >
            <div className="aspect-[3/4] overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.image || "/placeholder.svg"}
                alt={it.title || "Anime"}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              />
            </div>
            <div className="mt-2 text-sm">
              <div className="line-clamp-1 font-medium">
                {it.title || `Anime ${it.animeId}`}
              </div>
              <div className="text-foreground/60">
                Episode {it.episode} • {formatTime(it.position)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}
