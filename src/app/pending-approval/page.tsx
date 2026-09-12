import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";

export default async function PendingApprovalPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) redirect("/login");
  if (profile.enabled) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="h-1.5 bg-red-700" />
        <div className="p-8 text-center">
          <h1 className="mb-1 flex items-center justify-center gap-2 text-xl font-semibold text-gray-900">
            <span className="h-3 w-3 rounded-full bg-red-700" />
            JP ImportTools
          </h1>
          <p className="mt-4 text-sm font-medium text-gray-900">Your account is pending approval.</p>
          <p className="mt-2 text-sm text-gray-500">
            An admin has been notified and needs to enable your account before you can sign in. Check back
            shortly.
          </p>
          <div className="mt-6">
            <SignOutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
