import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, phone } = body as { name?: string; phone?: string };

  if (!name || !phone) {
    return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000000;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.15);">

        <!-- Header -->
        <tr>
          <td style="background:#000000;padding:32px 40px;text-align:center;">
            <p style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:400;letter-spacing:4px;color:#2BA8E0;text-transform:uppercase;">Nilay 360</p>
            <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.4);letter-spacing:2px;text-transform:uppercase;">Callback Request</p>
          </td>
        </tr>

        <!-- Title bar -->
        <tr>
          <td style="background:#2BA8E0;padding:14px 40px;">
            <p style="margin:0;font-size:13px;color:#000000;font-weight:700;letter-spacing:1px;text-transform:uppercase;">📞 New Callback Request</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 24px;font-size:15px;color:#4B5563;line-height:1.6;">A visitor has requested a callback from your website. Please call them at your earliest convenience.</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E8E3D9;padding-top:24px;margin-top:4px;">
              <tr><td style="padding-bottom:20px;">
                <p style="margin:0 0 4px;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Name</p>
                <p style="margin:0;font-size:18px;color:#000000;font-weight:600;">${escHtml(name ?? "")}</p>
              </td></tr>
              <tr><td style="padding-bottom:20px;">
                <p style="margin:0 0 4px;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Phone Number</p>
                <p style="margin:0;font-size:20px;color:#000000;font-weight:700;font-family:Georgia,serif;">+91 ${escHtml(phone ?? "")}</p>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#000000;padding:20px 40px;border-top:1px solid #E8E3D9;">
            <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
              Callback request from the Nilay 360 floating contact widget.<br>
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
    const result = await resend.emails.send({
      from: "Nilay 360 <contact@nilay360.com>",
      to: "contact@nilay360.com",
      subject: `📞 Callback Request — ${name} (+91 ${phone})`,
      html,
    });
    console.log("[request-callback] Resend response:", JSON.stringify(result, null, 2));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[request-callback] Resend error:", JSON.stringify(err, null, 2));
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
