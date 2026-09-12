import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import type { UserRole } from "@/lib/types";

const APP_URL = "https://jp-import-tools.vercel.app/";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role, enabled").eq("id", user.id).single();

  if (!profile?.enabled || profile.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, password, displayName, role } = (await request.json()) as {
    email?: string;
    password?: string;
    displayName?: string;
    role?: UserRole;
  };

  if (!email || !password || !role) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName || email, role, enabled: "true" },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role, enabled").eq("id", user.id).single();

  if (!profile?.enabled || profile.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = (await request.json()) as { userId?: string };

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  if (userId === user.id) {
    return NextResponse.json({ error: "You can't delete your own account" }, { status: 400 });
  }

  const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "ADMIN");
  const { data: target } = await supabase.from("profiles").select("role").eq("id", userId).single();

  if (target?.role === "ADMIN" && (count ?? 0) <= 1) {
    return NextResponse.json({ error: "Can't delete the last remaining admin" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role, enabled").eq("id", user.id).single();

  if (!profile?.enabled || profile.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId: targetId, enabled } = (await request.json()) as { userId?: string; enabled?: boolean };

  if (!targetId || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: target, error } = await supabase
    .from("profiles")
    .update({ enabled })
    .eq("id", targetId)
    .select("email, display_name")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Only notify on enabling an account — disabling one needs no email.
  if (enabled && target?.email) {
    await sendEmail({
      to: [target.email],
      subject: "Your JP ImportTools account is now active",
      text: `Hi ${target.display_name || target.email},\n\nAn admin has enabled your account. You can now sign in and start using JP ImportTools:\n\n${APP_URL}\n\nThanks!`,
    });
  }

  return NextResponse.json({ ok: true });
}
