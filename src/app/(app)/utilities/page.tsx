import Link from "next/link";
import { getCurrentUserProfile } from "@/lib/auth";
import { BADGE_STYLES, UTILITIES } from "@/lib/utilities";

export default async function UtilitiesPage() {
  const profile = await getCurrentUserProfile();
  const visible = UTILITIES.filter((u) => !u.adminOnly || profile?.role === "ADMIN");

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-red-700 pl-3">
        <h1 className="text-lg font-semibold text-gray-900">Utilities</h1>
        <p className="mt-1 text-sm text-gray-500">Tools for checking vehicle details before import.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {visible.map((u) => (
          <Link
            key={u.href}
            href={u.href}
            className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:border-red-400"
          >
            <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg text-xl ${BADGE_STYLES[u.color]}`}>
              {u.icon}
            </span>
            <span className="min-w-0">
              <p className="font-medium text-gray-900">{u.title}</p>
              <p className="mt-1 text-sm text-gray-500">{u.description}</p>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
