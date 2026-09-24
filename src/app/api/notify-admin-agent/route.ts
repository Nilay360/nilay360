import { NextRequest, NextResponse, after } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

const resend = new Resend(process.env.RESEND_API_KEY);

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Notifies the Nilay 360 admin team when a new agent/builder registers so the
// application can be reviewed and verified. Mirrors the pattern in
// send-inquiry-email for the outbound email; the in-app notification insert
// below is new (2026-09-11, Part B) and additive to that existing email path.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, phone, email, rera, oc, agency, city, account_type } = body as {
    name?: string;
    phone?: string;
    email?: string;
    rera?: string;
    oc?: string;
    agency?: string;
    city?: string;
    account_type?: string;
  };

  const adminEmail = process.env.ADMIN_EMAIL || "admin@nilay360.com";

  const subject = `New agent application — ${name ?? "Unknown"} (RERA ${rera ?? "N/A"})`;

  const row = (label: string, val?: string) => val
    ? `<tr><td style="padding-bottom:18px;">
         <p style="margin:0 0 4px;font-size:12px;color:#6B7686;text-transform:uppercase;letter-spacing:1px;">${escHtml(label)}</p>
         <p style="margin:0;font-size:15px;color:#020C1C;">${escHtml(val)}</p>
       </td></tr>`
    : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#020C1C;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#020C1C;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(13,43,31,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:#020C1C;padding:32px 40px;text-align:center;">
            <p style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:400;letter-spacing:4px;color:#10C4C3;text-transform:uppercase;">Nilay 360</p>
            <p style="margin:6px 0 0;font-size:12px;color:#A0B8AA;letter-spacing:2px;text-transform:uppercase;">Premium Real Estate</p>
          </td>
        </tr>

        <!-- Title bar -->
        <tr>
          <td style="background:#111F33;padding:16px 40px;">
            <p style="margin:0;font-size:13px;color:#020C1C;letter-spacing:1px;text-transform:uppercase;">New Agent Application — Review Required</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 24px;font-size:15px;color:#020C1C;line-height:1.6;">
              A new agent has registered on Nilay 360 and is awaiting verification.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E8E3D9;padding-top:24px;">
              ${row("Name", name)}
              ${row("Phone", phone)}
              ${row("Email", email)}
              ${row("RERA Registration No.", rera)}
              ${row("Agency", agency)}
              ${row("City", city)}
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 40px 36px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#10C4C3;border-radius:4px;padding:12px 28px;">
                  <a href="https://nilay360.com/admin" style="color:#020C1C;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.5px;">Review in the Admin Panel</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#020C1C;padding:20px 40px;border-top:1px solid #E8E3D9;">
            <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
              Automated agent-registration notification.<br>
              © Nilay 360 Premium Real Estate
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
`;

  // Two independent notification channels, each in its own try/catch — same
  // discipline as recordConsent()/change_log tonight: a secondary/non-critical
  // action must never depend on or be blocked by another one. A Resend outage
  // must not suppress the in-app admin notification, and (symmetrically) a
  // notifications-table problem must never suppress the email.
  let emailSent = false;
  try {
    await resend.emails.send({
      from: "Nilay 360 <onboarding@resend.dev>",
      to: adminEmail,
      subject,
      html,
    });
    emailSent = true;
  } catch (err) {
    console.error("Resend error (notify-admin-agent):", err);
  }

  // In-app admin notification — completeness check, agent/builder only (an
  // Individual account never providing an email is normal and expected, not
  // worth notifying admins about; agent/builder accounts missing real contact
  // info are the ones that need follow-up). Fire-and-forget, non-fatal — same
  // discipline as recordConsent(): never fails this route or blocks the
  // registration flow above, which has already completed by the time this
  // fires. Runs regardless of whether the email above succeeded.
  let notified = false;
  if (account_type === "agent" || account_type === "builder") {
    try {
      const missingRera = !rera?.trim();
      const missingOc = account_type === "builder" && !oc?.trim();
      const missingEmail = !email?.trim() || email.endsWith("@auth.nilay360.com");

      if (missingRera || missingOc || missingEmail) {
        const reasons = [
          missingRera && "RERA",
          missingOc && "OC",
          missingEmail && "email",
        ].filter(Boolean).join("/");

        const supabase = adminClient();
        const { data: admins, error: adminsErr } = await supabase
          .from("profiles")
          .select("id, phone, full_name")
          .in("role", ["admin", "super_admin"]);

        if (adminsErr) {
          console.error("[notify-admin-agent] Failed to look up admin recipients:", adminsErr);
        } else if (admins?.length) {
          const notificationBody = `${name ?? "Unknown"} (${phone ?? "no phone"}) — missing: ${reasons}`;
          const rows = admins.map((a) => ({
            user_id: a.id,
            title: `Incomplete ${account_type} registration`,
            body: notificationBody,
            type: "incomplete_registration",
            action_url: "/admin?section=agents",
          }));
          const { error: notifErr } = await supabase.from("notifications").insert(rows);
          if (notifErr) console.error("[notify-admin-agent] Failed to insert admin notifications:", notifErr);
          else notified = true;

          // WhatsApp, alongside (not instead of) the in-app notifications above —
          // fire-and-forget per admin, never blocks or fails this route.
          for (const admin of admins) {
            if (admin.phone) {
              console.log(`[notify-admin-agent] Calling sendWhatsAppMessage for admin ${admin.id}...`);
              // after(), not a bare promise: Vercel can freeze the function once
              // the response is sent, cutting off an un-awaited MSG91 call.
              const phone = admin.phone, name = admin.full_name?.trim() || "there";
              after(() => sendWhatsAppMessage(phone, name, notificationBody));
            } else {
              console.log(`[notify-admin-agent] Skipping — no phone on file for admin ${admin.id}`);
            }
          }
        } else {
          // Nothing missing — no admin follow-up needed, not a failure.
          notified = true;
        }
      } else {
        notified = true;
      }
    } catch (err) {
      console.error("[notify-admin-agent] Unexpected error during completeness check:", err);
    }
  }

  // Best-effort route by design (see AuthModal.tsx's fire-and-forget caller) —
  // always 200; emailSent/notified report what actually happened for anyone
  // who does inspect the response, without turning either failure into a
  // hard error for the other channel.
  return NextResponse.json({ success: true, emailSent, notified });
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
