// Client-side only. Produces a stable identifier for view/click-tracking
// dedup (066_view_and_click_tracking.sql's viewer_key column): 'user:<uuid>'
// for a signed-in visitor's real auth id, or 'anon:<uuid>' for a signed-out
// one — a UUID generated once and persisted to localStorage, since no
// stable anonymous-visitor identifier existed anywhere in this codebase
// before this (confirmed: useRecentlyViewed.ts stores viewed PROPERTIES per
// device, never a visitor identity). Mirrors that hook's own storage
// pattern — same localStorage-under-one-fixed-key shape, just carrying an
// identity instead of a viewed-items list.

const STORAGE_KEY = "nilay360_anon_visitor_id";

function getOrCreateAnonId(): string {
  if (typeof window === "undefined") return "unknown";
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — fall back to a
    // per-call id rather than throwing. This only degrades dedup for that
    // one request, it never breaks the page.
    return crypto.randomUUID();
  }
}

export function getVisitorKey(userId: string | null): string {
  if (userId) return `user:${userId}`;
  return `anon:${getOrCreateAnonId()}`;
}
