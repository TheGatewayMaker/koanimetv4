import { useState } from "react";
import { useState } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../providers/AuthProvider";

export default function Signup() {
  const { signup } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signup(username, password);
      window.location.href = "/";
    } catch (err: any) {
      setError(err?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto w-full max-w-md rounded-xl border p-6 shadow-sm">
          <h1 className="text-center text-2xl font-bold">Create your account</h1>
          <p className="mt-1 text-center text-sm text-foreground/70">
            Join KoAnime to track your watch history
          </p>
          <form className="mt-6 space-y-3" onSubmit={onSubmit}>
            <div>
              <label className="text-sm">Username</label>
              <input
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
                placeholder="your_username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm">Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <button
              type="submit"
              className="mt-2 w-full rounded-md bg-primary px-3 py-2 font-semibold text-primary-foreground"
              disabled={loading}
            >
              {loading ? "Creating…" : "Sign up"}
            </button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account? <a href="/login" className="text-primary underline">Log in</a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
