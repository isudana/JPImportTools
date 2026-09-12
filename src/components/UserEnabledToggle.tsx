"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UserEnabledToggle({ userId, enabled }: { userId: string; enabled: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [value, setValue] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleToggle() {
    const next = !value;
    setSaving(true);
    setError(null);

    const { error } = await supabase.from("profiles").update({ enabled: next }).eq("id", userId);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setValue(next);
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleToggle}
        disabled={saving}
        className={`rounded-md px-2 py-1 text-xs font-medium disabled:opacity-50 ${
          value
            ? "bg-green-50 text-green-700 hover:bg-green-100"
            : "bg-amber-100 text-amber-800 hover:bg-amber-200"
        }`}
      >
        {saving ? "…" : value ? "Enabled" : "Pending — click to enable"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
