"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState, Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/heute";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        setAuthRequired(d.authRequired);
        if (!d.authRequired || d.authenticated) {
          router.replace(next);
        }
      });
  }, [next, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Anmeldung fehlgeschlagen.");
      return;
    }
    router.replace(next);
  }

  if (authRequired === null) {
    return <p className="text-stone-500 text-sm">Lade…</p>;
  }

  if (!authRequired) {
    return (
      <p className="text-sm text-stone-600">
        Auth ist nicht aktiv. Du wirst weitergeleitet…
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="bg-white border border-stone-200 rounded-xl p-6 space-y-4 max-w-sm w-full shadow-sm">
      <div>
        <h1 className="text-xl font-semibold text-teal-900">Nexo anmelden</h1>
        <p className="text-sm text-stone-600 mt-1">
          Einzelnutzer-Zugang. Passwort steht in deiner serverseitigen <code className="text-xs">.env</code>.
        </p>
      </div>
      <label className="block text-sm">
        Passwort
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2"
          required
        />
      </label>
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 rounded-lg bg-teal-700 text-white text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Anmelden…" : "Anmelden"}
      </button>
    </form>
  );
}

export default function AnmeldenPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Suspense fallback={<p className="text-stone-500 text-sm">Lade…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
