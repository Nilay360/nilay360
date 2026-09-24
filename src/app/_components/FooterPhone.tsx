"use client";
import { useSiteContact } from "@/hooks/useSiteContact";
import { telHref } from "@/lib/contactFormat";

// Client island for SiteChrome's Footer phone line. SiteChrome is
// imported by both server and "use client" pages, so it must not pull in
// the server-only Supabase client (next/headers) — doing so broke the
// production build. Renders nothing while loading or on error: no
// hardcoded fallback number, by design (see useSiteContact).
export function FooterPhone() {
  const contact = useSiteContact("general");
  if (!contact?.phone) return null;
  return (
    <a href={telHref(contact.phone)} style={{ display:"block", fontSize:13, color:"rgba(255,255,255,0.55)", textDecoration:"none", marginBottom:20 }}>
      📞 {contact.phone}
    </a>
  );
}
