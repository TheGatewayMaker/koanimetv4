import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import {
  getFirebase,
  getFirebaseAsync,
  isFirebaseConfigured,
} from "../lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

export default function Signup() {
  const [configured, setConfigured] = useState(isFirebaseConfigured());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      getFirebaseAsync().then((res) => {
        if (res) setConfigured(true);
      });
    }
  }, [configured]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const lazy = (await getFirebaseAsync()) || getFirebase();
      const cred = await createUserWithEmailAndPassword(
        lazy.auth,
        email,
        password,
      );
      if (name) {
        await updateProfile(cred.user, { displayName: name });
      }
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
          <h1 className="text-center text-2xl font-bold">
            Create your account
          </h1>
          <p className="mt-1 text-center text-sm text-foreground/70">
            Join KoAnime to track your watch history
          </p>
          {!configured && (
            <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
              Firebase isn't configured. Add VITE_FIREBASE_* env vars in project
              settings to enable authentication.
            </div>
          )}
          <form className="mt-6 space-y-3" onSubmit={onSubmit}>
            <div>
              <label className="text-sm">Name</label>
              <input
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm">Email</label>
              <input
                type="email"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              disabled={!configured || loading}
            >
              {loading ? "Creating…" : "Sign up"}
            </button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <a href="/login" className="text-primary underline">
              Log in
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
