// Minimal wrapper around Resend's REST API (https://resend.com) — no SDK, same lightweight
// fetch-based style as the Gemini integration. Requires RESEND_API_KEY; RESEND_FROM_EMAIL
// defaults to Resend's shared sandbox sender, which works without verifying a domain but is
// only reliable for testing — verify your own domain in Resend for real production use.
export async function sendEmail(params: { to: string[]; subject: string; text: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not configured — skipping email:", params.subject);
    return;
  }
  if (params.to.length === 0) return;

  const from = process.env.RESEND_FROM_EMAIL || "JP ImportTools <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: params.to, subject: params.subject, text: params.text }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error("Failed to send email:", await res.text());
    }
  } catch (err) {
    // Never let a notification email failure break the calling action (e.g. registration).
    console.error("Failed to send email:", err);
  }
}
