"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { USER_ROLE_LABEL, type UserRole } from "@/lib/types";

const ROLES: UserRole[] = ["ADMIN", "USER"];

export default function AddUserForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<UserRole>("USER");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName, role }),
    });
    const body = await res.json();

    setSaving(false);

    if (!res.ok) {
      setError(body.error ?? "Failed to create user");
      return;
    }

    setEmail("");
    setPassword("");
    setDisplayName("");
    setRole("USER");
    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-900">Add User</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display Name"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Temporary password"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {USER_ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="ml-auto rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create User"}
        </button>
      </div>
    </form>
  );
}
