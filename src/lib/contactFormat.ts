// Shared derivation from a single stored site_contacts value
// ("+91 70933 36360") into the two forms hrefs actually need —
// deliberately not stored twice. Plain functions, no "use client":
// used from both server components (Footer.tsx, privacy/page.tsx,
// fetching site_contacts directly) and client components (via
// useSiteContact()).

/** Strips everything but digits, e.g. "+91 70933 36360" -> "917093336360". */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** tel: needs a leading +, wa.me does not — same digits either way. */
export function telHref(phone: string): string {
  return `tel:+${digitsOnly(phone)}`;
}

export function waHref(whatsapp: string, text?: string): string {
  const base = `https://wa.me/${digitsOnly(whatsapp)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function smsHref(phone: string, body?: string): string {
  const base = `sms:+${digitsOnly(phone)}`;
  return body ? `${base}?body=${encodeURIComponent(body)}` : base;
}
