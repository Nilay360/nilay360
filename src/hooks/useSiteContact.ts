"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface SiteContact {
  contact_type: string;
  label: string;
  phone: string;
  whatsapp: string | null;
}

// Shared by every client component that previously hardcoded
// 7075792497 independently (FloatingContactMenu, ThankYouClient,
// contact/page.tsx, connect/page.tsx, pricing/page.tsx) — one fetch
// implementation instead of five copies of the same useEffect.
// Mirrors src/lib/liveStats.ts's fetchX() + useX() shape.
//
// Returns null while loading or if the row doesn't exist/isn't
// active — deliberately no hardcoded fallback number, since
// reintroducing one here would just recreate the exact problem this
// system replaces. Callers should render nothing (or omit the
// phone/WhatsApp action) until a real value arrives.
export async function fetchSiteContact(contactType: string): Promise<SiteContact | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("site_contacts")
    .select("contact_type, label, phone, whatsapp")
    .eq("contact_type", contactType)
    .maybeSingle();
  if (error || !data) return null;
  return data as SiteContact;
}

export function useSiteContact(contactType: string): SiteContact | null {
  const [contact, setContact] = useState<SiteContact | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchSiteContact(contactType).then(c => {
      if (!cancelled) setContact(c);
    });
    return () => { cancelled = true; };
  }, [contactType]);
  return contact;
}

// Fixed display order for anywhere all active contacts are listed
// together (contact/page.tsx's card, connect/page.tsx's footer column,
// privacy/page.tsx) — general first since it's the primary line, then
// the specialist departments in the order they were added to the CHECK
// constraint in 075_site_contacts.sql.
const CONTACT_TYPE_ORDER = ["general", "customer_care", "sales", "capture_team"];

export async function fetchSiteContacts(): Promise<SiteContact[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("site_contacts")
    .select("contact_type, label, phone, whatsapp")
    .eq("is_active", true);
  if (error || !data) return [];
  return (data as SiteContact[]).sort(
    (a, b) => CONTACT_TYPE_ORDER.indexOf(a.contact_type) - CONTACT_TYPE_ORDER.indexOf(b.contact_type)
  );
}

export function useSiteContacts(): SiteContact[] {
  const [contacts, setContacts] = useState<SiteContact[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchSiteContacts().then(c => {
      if (!cancelled) setContacts(c);
    });
    return () => { cancelled = true; };
  }, []);
  return contacts;
}
