import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Notifies the Nilay 360 admin team when a new agent registers so the application
// can be reviewed and verified. Mirrors the pattern in send-inquiry-email.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, phone, email, rera, agency, city } = body as {
    name?: string;
    phone?: string;
    email?: string;
    rera?: string;
    agency?: string;
    city?: string;
  };

  const adminEmail = process.env.ADMIN_EMAIL || "admin@nilay360.com";

  const subject = `New agent application — ${name ?? "Unknown"} (RERA ${rera ?? "N/A"})`;

  const row = (label: string, val?: string) => val
    ? `<tr><td style="padding-bottom:18px;">
         <p style="margin:0 0 4px;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">${escHtml(label)}</p>
         <p style="margin:0;font-size:15px;color:#000000;">${escHtml(val)}</p>
       </td></tr>`
    : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000000;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(13,43,31,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:#000000;padding:32px 40px;text-align:center;">
            <p style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:400;letter-spacing:4px;color:#2BA8E0;text-transform:uppercase;">Nilay 360</p>
            <p style="margin:6px 0 0;font-size:12px;color:#A0B8AA;letter-spacing:2px;text-transform:uppercase;">Premium Real Estate</p>
          </td>
        </tr>

        <!-- Title bar -->
        <tr>
          <td style="background:#121519;padding:16px 40px;">
            <p style="margin:0;font-size:13px;color:#000000;letter-spacing:1px;text-transform:uppercase;">New Agent Application — Review Required</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 24px;font-size:15px;color:#000000;line-height:1.6;">
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
                <td style="background:#2BA8E0;border-radius:4px;padding:12px 28px;">
                  <a href="https://nilay360.com/admin" style="color:#000000;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.5px;">Review in the Admin Panel</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#000000;padding:20px 40px;border-top:1px solid #E8E3D9;">
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

  try {
    await resend.emails.send({
      from: "Nilay 360 <onboarding@resend.dev>",
      to: adminEmail,
      subject,
      html,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Resend error (notify-admin-agent):", err);
    return NextResponse.json({ error: "Email send failed" }, { status: 500 });
  }
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
