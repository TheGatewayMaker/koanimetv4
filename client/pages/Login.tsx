import { useState } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../providers/AuthProvider";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
      window.location.href = "/";
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto w-full max-w-md rounded-xl border p-6 shadow-sm">
          <h1 className="text-center text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-center text-sm text-foreground/70">
            Log in to continue watching
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
              {loading ? "Signing in…" : "Log in"}
            </button>
          </form>
          <div className="mt-4 text-center text-sm">
            New here?{" "}
            <a href="/signup" className="text-primary underline">
              Create an account
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
