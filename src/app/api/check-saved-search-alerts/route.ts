import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

interface SavedSearch {
  id: string;
  user_id: string;
  name: string | null;
  filters: SearchFilters;
  alert_email: boolean;
}

interface SearchFilters {
  city?: string;
  listingType?: string;
  propTypes?: string[];
  bhk?: number[];
  minPrice?: string;
  maxPrice?: string;
  furnished?: boolean | null;
  newConstruction?: boolean;
  reraApproved?: boolean;
}

interface Listing {
  id: string;
  title: string | null;
  city: string | null;
  property_category: string | null;
  listing_type: string | null;
  price: number | null;
  slug: string | null;
  bedrooms: number | null;
}

function listingMatchesFilters(listing: Listing, filters: SearchFilters): boolean {
  if (filters.city && filters.city !== "all") {
    if (listing.city?.toLowerCase() !== filters.city.toLowerCase()) return false;
  }
  if (filters.listingType && filters.listingType !== "all") {
    if (listing.listing_type !== filters.listingType) return false;
  }
  if (filters.propTypes && filters.propTypes.length > 0) {
    if (!filters.propTypes.includes(listing.property_category ?? "")) return false;
  }
  if (filters.bhk && filters.bhk.length > 0) {
    if (!filters.bhk.includes(listing.bedrooms ?? 0)) return false;
  }
  const price = listing.price ?? 0;
  if (filters.minPrice && price < Number(filters.minPrice)) return false;
  if (filters.maxPrice && price > Number(filters.maxPrice)) return false;
  return true;
}

function buildAlertEmail(listing: Listing, searchName: string | null, userEmail: string): string {
  const title = escHtml(listing.title ?? "New Property");
  const city  = escHtml(listing.city ?? "");
  const cat   = escHtml(listing.property_category ?? "");
  const name  = escHtml(searchName ?? "your saved search");
  const price = listing.price ? `₹${(listing.price / 1e7).toFixed(2)} Cr` : "";
  const url   = listing.slug
    ? `https://nilay360.com/property/${listing.slug}`
    : "https://nilay360.com/properties";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#020C1C;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#020C1C;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.15);">

        <tr>
          <td style="background:#020C1C;padding:32px 40px;text-align:center;">
            <p style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:400;letter-spacing:4px;color:#10C4C3;text-transform:uppercase;">Nilay 360</p>
            <p style="margin:6px 0 0;font-size:12px;color:#9CA3AF;letter-spacing:2px;text-transform:uppercase;">Premium Real Estate</p>
          </td>
        </tr>

        <tr>
          <td style="background:#111F33;padding:14px 40px;">
            <p style="margin:0;font-size:12px;color:#9CA3AF;letter-spacing:1px;text-transform:uppercase;">New Listing Alert — ${name}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 40px 28px;">
            <p style="margin:0 0 6px;font-size:13px;color:#6B7686;text-transform:uppercase;letter-spacing:1px;">New Listing</p>
            <p style="margin:0 0 24px;font-size:22px;font-family:Georgia,serif;color:#020C1C;font-weight:500;line-height:1.3;">${title}</p>

            <table width="100%" cellpadding="0" cellspacing="0">
              ${city ? `<tr><td style="padding-bottom:14px;">
                <p style="margin:0 0 3px;font-size:11px;color:#6B7686;text-transform:uppercase;letter-spacing:1px;">City</p>
                <p style="margin:0;font-size:15px;color:#020C1C;">${city}</p>
              </td></tr>` : ""}
              ${cat ? `<tr><td style="padding-bottom:14px;">
                <p style="margin:0 0 3px;font-size:11px;color:#6B7686;text-transform:uppercase;letter-spacing:1px;">Type</p>
                <p style="margin:0;font-size:15px;color:#020C1C;text-transform:capitalize;">${cat}</p>
              </td></tr>` : ""}
              ${price ? `<tr><td style="padding-bottom:14px;">
                <p style="margin:0 0 3px;font-size:11px;color:#6B7686;text-transform:uppercase;letter-spacing:1px;">Price</p>
                <p style="margin:0;font-size:15px;color:#020C1C;font-weight:600;">${price}</p>
              </td></tr>` : ""}
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 40px 36px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#10C4C3;border-radius:4px;padding:12px 28px;">
                  <a href="${url}" style="color:#020C1C;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.5px;">View Property →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="background:#020C1C;padding:20px 40px;border-top:1px solid #1f2937;">
            <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
              You're receiving this because you saved a search on Nilay 360.<br>
              To stop alerts, visit your <a href="https://nilay360.com/dashboard/searches" style="color:#10C4C3;text-decoration:none;">saved searches</a> and delete the search.<br>
              © Nilay 360 Premium Real Estate
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  let body: { listingId?: string };
  try {
    body = await req.json() as { listingId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { listingId } = body;
  if (!listingId) {
    return NextResponse.json({ error: "listingId required" }, { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("check-saved-search-alerts: SUPABASE_SERVICE_ROLE_KEY not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const supabase = getAdminClient();

  // Fetch the listing
  const { data: listing, error: listingErr } = await supabase
    .from("property_listings")
    .select("id, title, city, property_category, listing_type, price, slug, bedrooms")
    .eq("id", listingId)
    .single();

  if (listingErr || !listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  // Fetch all alert-enabled saved searches
  const { data: searches, error: searchErr } = await supabase
    .from("saved_searches")
    .select("id, user_id, name, filters, alert_email")
    .eq("alert_email", true);

  if (searchErr || !searches || searches.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // Match and send
  const matched = (searches as SavedSearch[]).filter(s =>
    listingMatchesFilters(listing as Listing, s.filters ?? {})
  );

  if (matched.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  for (const search of matched) {
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(search.user_id);
      const userEmail = userData?.user?.email;
      if (!userEmail) continue;

      await resend.emails.send({
        from: "Nilay 360 <contact@nilay360.com>",
        to: userEmail,
        subject: `New listing matches your saved search: ${search.name ?? "Search Alert"}`,
        html: buildAlertEmail(listing as Listing, search.name, userEmail),
      });
      sent++;
    } catch (err) {
      console.error(`[alerts] Email failed for search ${search.id}:`, err);
    }
  }

  return NextResponse.json({ sent, matched: matched.length });
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
