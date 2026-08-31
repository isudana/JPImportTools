import NavBar from "@/components/NavBar";
import { RoleProvider } from "@/components/RoleProvider";
import { getCurrentUserProfile } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentUserProfile();

  return (
    <RoleProvider role={profile?.role ?? null}>
      <div className="flex min-h-screen flex-col bg-gray-50 print:bg-white">
        <div className="print:hidden">
          <NavBar />
        </div>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 print:max-w-none print:p-0">{children}</main>
      </div>
    </RoleProvider>
  );
}
