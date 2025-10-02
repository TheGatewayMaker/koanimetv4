import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useAuth } from "../providers/AuthProvider";
import { fetchAnimeInfo } from "../lib/anime";

const SAMPLE_SRC = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

export default function Watch() {
  const params = useParams();
  const id = Number(params.id);
  const [sp] = useSearchParams();
  const episode = Number(sp.get("ep") || 1);
  const [title, setTitle] = useState<string>("");
  const [image, setImage] = useState<string>("");
  const { user, postProgress } = useAuth();

  useEffect(() => {
    (async () => {
      const info = await fetchAnimeInfo(id);
      if (info) {
        setTitle(info.title);
        setImage(info.image);
      }
    })();
  }, [id]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-xl font-bold">{title || `Anime ${id}`} — Episode {episode}</h1>
        {!user && (
          <div className="mt-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
            Log in to save your watch progress automatically.
          </div>
        )}
        <div className="mt-4">
          <VideoPlayer
            src={SAMPLE_SRC}
            onProgress={(position) => {
              if (user) {
                postProgress({ animeId: id, episode, position, title, image });
              }
            }}
          />
        </div>
      </div>
    </Layout>
  );
}

function VideoPlayer({ src, onProgress }: { src: string; onProgress: (sec: number) => void }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [lastSent, setLastSent] = useState(0);

  // Throttle updates to avoid spamming server
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handle = () => {
      const sec = Math.floor(el.currentTime || 0);
      const now = Date.now();
      if (now - lastSent > 1500) {
        onProgress(sec);
        setLastSent(now);
      }
    };

    const onPause = () => onProgress(Math.floor(el.currentTime || 0));
    const onBeforeUnload = () => onProgress(Math.floor(el.currentTime || 0));

    el.addEventListener("timeupdate", handle);
    el.addEventListener("pause", onPause);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      el.removeEventListener("timeupdate", handle);
      el.removeEventListener("pause", onPause);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [onProgress, lastSent]);

  return (
    <video ref={ref} className="w-full max-w-[1000px] rounded-md border bg-black" src={src} controls autoPlay />
  );
}
