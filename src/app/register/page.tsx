"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName }),
    });
    const body = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(body.error ?? "Failed to register.");
      return;
    }

    setDone(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="h-1.5 bg-red-700" />
        <div className="p-8">
          <h1 className="mb-1 flex items-center gap-2 text-xl font-semibold text-gray-900">
            <span className="h-3 w-3 rounded-full bg-red-700" />
            JP ImportTools
          </h1>

          {done ? (
            <>
              <p className="mb-1 text-sm font-medium text-gray-900">Account created.</p>
              <p className="mb-6 text-sm text-gray-500">
                An admin has been notified and will review your request. You&apos;ll be able to sign in once
                your account is enabled.
              </p>
              <Link href="/login" className="text-sm font-medium text-red-700 hover:underline">
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <p className="mb-6 text-sm text-gray-500">
                Request access — an admin needs to enable your account before you can sign in.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    placeholder="••••••••"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
                >
                  {loading ? "Please wait…" : "Request access"}
                </button>
              </form>

              <p className="mt-4 text-center text-sm text-gray-500">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-red-700 hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
