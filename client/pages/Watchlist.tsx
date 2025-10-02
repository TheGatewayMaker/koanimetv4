import { Layout } from "../components/Layout";
import { ContinueWatching } from "../components/ContinueWatching";
import { useAuth } from "../providers/AuthProvider";

export default function Watchlist() {
  const { user } = useAuth();
  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold">Watchlist</h1>
        {!user && (
          <p className="mt-2 text-foreground/70">Log in to save shows and resume instantly across devices.</p>
        )}
      </div>
      <ContinueWatching />
    </Layout>
  );
}
