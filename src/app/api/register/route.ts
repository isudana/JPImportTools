import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

export async function POST(request: Request) {
  const { email, password, displayName } = (await request.json()) as {
    email?: string;
    password?: string;
    displayName?: string;
  };

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const admin = createAdminClient();

  // No role/enabled metadata passed — the handle_new_user trigger defaults new self-registered
  // accounts to USER + disabled, unless this happens to be the very first account on a fresh
  // project, in which case it becomes an enabled ADMIN automatically (nobody to approve them).
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName || email },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data: admins } = await admin.from("profiles").select("email").eq("role", "ADMIN");
  const adminEmails = (admins ?? []).map((a) => a.email).filter((e): e is string => !!e);

  const settingsUrl = `${new URL(request.url).origin}/settings`;
  await sendEmail({
    to: adminEmails,
    subject: `New user registration pending approval: ${email}`,
    text: `${displayName || email} (${email}) just registered for JP ImportTools and is waiting for an admin to enable their account.\n\nReview and enable it here: ${settingsUrl}`,
  });

  return NextResponse.json({ ok: true });
}
