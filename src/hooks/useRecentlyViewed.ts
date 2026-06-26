"use client";
import { useState, useEffect, useCallback } from "react";

// Per-device recently-viewed properties. Stored in localStorage (NOT Supabase).
export interface RecentProperty {
  id: string;
  slug: string;
  title: string;
  city: string;
  price: number;
  listing_type: string;
  image: string | null;
}

const STORAGE_KEY = "nilay360_recently_viewed";
const MAX_ITEMS = 6;

function readStore(): RecentProperty[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentProperty[]) : [];
  } catch {
    return [];
  }
}

function writeStore(items: RecentProperty[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota / serialization errors are non-fatal */
  }
}

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState<RecentProperty[]>([]);

  // Hydrate after mount to avoid SSR mismatch
  useEffect(() => {
    setRecentlyViewed(readStore());
  }, []);

  const addRecentlyViewed = useCallback((item: RecentProperty) => {
    if (!item?.id) return;
    setRecentlyViewed(prev => {
      const next = [item, ...prev.filter(p => p.id !== item.id)].slice(0, MAX_ITEMS);
      writeStore(next);
      return next;
    });
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    writeStore([]);
    setRecentlyViewed([]);
  }, []);

  return { recentlyViewed, addRecentlyViewed, clearRecentlyViewed };
}
