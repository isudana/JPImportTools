"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/", label: "Utilities" },
  { href: "/resources", label: "Resources" },
  { href: "/settings", label: "Settings" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="h-1 bg-red-700" />
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <span className="h-2.5 w-2.5 rounded-full bg-red-700" />
            JP ImportTools
          </span>
          <nav className="flex gap-4">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm ${
                  pathname === link.href ? "font-medium text-red-700" : "text-gray-500 hover:text-red-700"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-red-700">
          Sign out
        </button>
      </div>
    </header>
  );
}
