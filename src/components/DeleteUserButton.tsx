"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteUserButton({
  userId,
  what,
  onSuccess,
}: {
  userId: string;
  what: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!confirm(`Delete ${what}?`)) return;
    setError(null);

    const res = await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed to delete user");
      return;
    }

    router.refresh();
    onSuccess?.();
  }

  return (
    <span>
      <button type="button" onClick={handleClick} className="text-xs font-medium text-red-600 hover:underline">
        Delete
      </button>
      {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
    </span>
  );
}
