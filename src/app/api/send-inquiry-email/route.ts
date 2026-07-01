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

  const {
    sellerEmail,
    sellerName,
    inquirerName,
    inquirerEmail,
    inquirerPhone,
    message,
    propertyTitle,
    inquiryType,
  } = body as {
    sellerEmail?: string;
    sellerName?: string;
    inquirerName?: string;
    inquirerEmail?: string;
    inquirerPhone?: string;
    message?: string;
    propertyTitle?: string;
    inquiryType?: string;
  };

  // Seed properties have no seller email — skip silently
  if (!sellerEmail) {
    return NextResponse.json({ skipped: true });
  }

  const subject = `New ${inquiryType ?? "inquiry"} inquiry for ${propertyTitle ?? "your property"}`;

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
            <p style="margin:0;font-size:13px;color:#000000;letter-spacing:1px;text-transform:uppercase;">New Inquiry Received</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 6px;font-size:13px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Property</p>
            <p style="margin:0 0 28px;font-size:20px;font-family:Georgia,serif;color:#000000;font-weight:500;">${escHtml(propertyTitle ?? "")}</p>

            <p style="margin:0 0 6px;font-size:13px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Inquiry Type</p>
            <p style="margin:0 0 28px;font-size:15px;color:#000000;text-transform:capitalize;">${escHtml(inquiryType ?? "")}</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E8E3D9;padding-top:24px;margin-top:4px;">
              <tr><td style="padding-bottom:20px;">
                <p style="margin:0 0 4px;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">From</p>
                <p style="margin:0;font-size:16px;color:#000000;font-weight:600;">${escHtml(inquirerName ?? "")}</p>
              </td></tr>
              <tr><td style="padding-bottom:20px;">
                <p style="margin:0 0 4px;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Email</p>
                <p style="margin:0;font-size:15px;color:#121519;">${escHtml(inquirerEmail ?? "")}</p>
              </td></tr>
              ${inquirerPhone ? `<tr><td style="padding-bottom:20px;">
                <p style="margin:0 0 4px;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Phone</p>
                <p style="margin:0;font-size:15px;color:#000000;">${escHtml(inquirerPhone)}</p>
              </td></tr>` : ""}
              ${message ? `<tr><td style="padding-bottom:20px;">
                <p style="margin:0 0 4px;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Message</p>
                <p style="margin:0;font-size:15px;color:#000000;line-height:1.6;">${escHtml(message)}</p>
              </td></tr>` : ""}
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 40px 36px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#2BA8E0;border-radius:4px;padding:12px 28px;">
                  <a href="https://nilay360.com/dashboard" style="color:#000000;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.5px;">Log in to your Nilay 360 dashboard to respond</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#000000;padding:20px 40px;border-top:1px solid #E8E3D9;">
            <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
              This email was sent to ${escHtml(sellerName ?? sellerEmail)} because you have an active listing on Nilay 360.<br>
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
      from: "Nilay 360 <contact@nilay360.com>",
      to: sellerEmail,
      subject,
      html,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Resend error:", err);
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
