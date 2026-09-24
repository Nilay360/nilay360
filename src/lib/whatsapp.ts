// Server-side only — never import this from a "use client" component.
// Sends a WhatsApp message via MSG91's bulk template-send endpoint, using the
// single approved generic template (name + message body — confirmed with
// Vanith it genuinely covers every notification flow, no per-flow template
// needed). Same style as send-otp/route.ts's established MSG91 pattern:
// authkey header (not Bearer, not a query param), plain fetch(), and a dual
// error check (!response.ok OR data.type === 'error') since MSG91 sometimes
// returns 200 with an error-shaped body.
//
// Fire-and-forget by design, matching every notification route built
// tonight — never throws. A missing env var, a network failure, or an MSG91
// error all just log and return false; callers are expected to call this
// alongside (not instead of) the existing in-app notification insert, never
// blocking on it or letting it fail the caller's own response.

function toBareInternationalPhone(phone: string): string {
  // Strips a leading "+" and any non-digit characters, then ensures a 91
  // country-code prefix — same "+91 + 10 digits" convention this codebase
  // already uses everywhere (api/verify-otp/route.ts, stripIndianCountryCode
  // in PropertyDetailClient.tsx/contact/page.tsx). Accepts either a bare
  // 10-digit local number or an already-prefixed +91XXXXXXXXXX/91XXXXXXXXXX.
  const digitsOnly = phone.replace(/\D/g, "");
  if (digitsOnly.length === 10) return `91${digitsOnly}`;
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) return digitsOnly;
  return digitsOnly;
}

// Meta rejects template variables containing newlines, tabs, or 4+
// consecutive spaces, and very long values. Admin notes and other free
// text flow straight into body_2, so every variable is flattened and
// capped here rather than trusting each notify-* route to do it.
function sanitizeTemplateVar(value: string, maxLength: number): string {
  const flat = value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/ {4,}/g, " ")
    .trim();
  return flat.length > maxLength ? `${flat.slice(0, maxLength - 1).trimEnd()}…` : flat;
}

export async function sendWhatsAppMessage(
  phone: string,
  customerName: string,
  messageBody: string,
): Promise<boolean> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const integratedNumber = process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER;
  const templateName = process.env.MSG91_WHATSAPP_TEMPLATE_NAME;

  if (!authKey || !integratedNumber || !templateName) {
    console.error("[whatsapp] Missing MSG91_AUTH_KEY / MSG91_WHATSAPP_INTEGRATED_NUMBER / MSG91_WHATSAPP_TEMPLATE_NAME — skipping send.");
    return false;
  }

  const toPhone = toBareInternationalPhone(phone);
  if (toPhone.length !== 12) {
    console.error(`[whatsapp] Phone "${phone}" did not normalize to a 12-digit (91 + 10 digit) number — skipping send.`);
    return false;
  }

  const payload = {
    integrated_number: integratedNumber,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: templateName,
        language: { code: "en", policy: "deterministic" },
        to_and_components: [
          {
            to: [toPhone],
            components: {
              body_1: { type: "text", value: sanitizeTemplateVar(customerName, 60) },
              body_2: { type: "text", value: sanitizeTemplateVar(messageBody, 900) },
            },
          },
        ],
      },
    },
  };

  try {
    // TEMPORARY — verbose logging for the real-send test against MSG91.
    // Remove once the payload shape is confirmed working end-to-end.
    console.log(`[whatsapp] Sending to ${toPhone}...`);

    const response = await fetch("https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "authkey": authKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || data.type === "error") {
      console.error("[whatsapp] MSG91 send error:", data);
      return false;
    }

    // TEMPORARY — see above.
    console.log(`[whatsapp] Sent successfully to ${toPhone}:`, data);

    return true;
  } catch (err) {
    console.error("[whatsapp] Unexpected error sending message:", err);
    return false;
  }
}
