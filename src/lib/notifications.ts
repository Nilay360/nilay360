// Shared notification types + helpers (Phase 12).
// Small shared module rather than per-file duplication, matching the
// existing src/lib/image-url.ts precedent — the navbar bell and the
// /notifications page need the exact same row shape and relative-time
// formatting, and letting them drift apart would be a real bug source.

import { createClient } from "@/lib/supabase/client";

export interface NotificationRow {
  id: string;
  title: string;
  body: string;
  type: string;
  action_url: string | null;
  status: string;
  created_at: string;
}

// Columns selected by both surfaces — kept here so the two queries can
// never disagree about the shape they're deserialising into.
export const NOTIFICATION_SELECT = "id, title, body, type, action_url, status, created_at";

/** "2 hours ago" / "just now" / "3 days ago". Falls back to an absolute
 *  date once the gap is large enough that relative wording stops helping. */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const diffSec = Math.round(diffMs / 1000);

  if (diffSec < 0) return "just now";        // clock skew / future-dated
  if (diffSec < 60) return "just now";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;

  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** True unread total for this user — a `count: "exact", head: true` query,
 *  not derived from any limited list fetch. Both the navbar bell and the
 *  dashboard's Notifications stat card need this same real count (the
 *  bell's dropdown list itself can stay capped at 8 recent items; only the
 *  badge/stat number needs to be accurate), so it lives here rather than
 *  being computed client-side in either component. */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "unread");
  if (error) {
    console.error("getUnreadNotificationCount — query error:", error);
    return 0;
  }
  return count ?? 0;
}
