"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [{ href: "/", label: "Utilities" }];

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
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-gray-900">ImportDrive</span>
          <nav className="flex gap-4">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm ${
                  pathname === link.href ? "font-medium text-gray-900" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-800">
          Sign out
        </button>
      </div>
    </header>
  );
}
