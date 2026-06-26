"use client";
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

// A property staged for comparison. Carries enough data to render the /compare
// table without re-fetching. Stored per-device in localStorage.
export interface CompareItem {
  id: string;
  slug: string;
  title: string;
  price: number;
  listing_type: "sale" | "rent";
  property_type: string;
  status: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  floor_number: number | null;
  total_floors: number | null;
  parking_spaces: number | null;
  year_built: number | null;
  is_furnished: boolean | null;
  amenities: string[];
  address: string | null;
  city: string;
  neighbourhood: string;
  image: string | null;
}

const STORAGE_KEY = "nilay360_compare_items";
export const COMPARE_MAX = 3;

type CompareCtx = {
  items: CompareItem[];
  count: number;
  isFull: boolean;
  has: (id: string) => boolean;
  toggle: (item: CompareItem) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const Ctx = createContext<CompareCtx | null>(null);

function readStore(): CompareItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CompareItem[]).slice(0, COMPARE_MAX) : [];
  } catch {
    return [];
  }
}

function writeStore(items: CompareItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* non-fatal */
  }
}

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);

  useEffect(() => {
    setItems(readStore());
  }, []);

  const has = useCallback((id: string) => items.some(p => p.id === id), [items]);

  const toggle = useCallback((item: CompareItem) => {
    if (!item?.id) return;
    setItems(prev => {
      let next: CompareItem[];
      if (prev.some(p => p.id === item.id)) {
        next = prev.filter(p => p.id !== item.id);
      } else if (prev.length >= COMPARE_MAX) {
        next = prev; // at capacity — ignore
      } else {
        next = [...prev, item];
      }
      writeStore(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(p => p.id !== id);
      writeStore(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    writeStore([]);
    setItems([]);
  }, []);

  const value = useMemo<CompareCtx>(() => ({
    items,
    count: items.length,
    isFull: items.length >= COMPARE_MAX,
    has,
    toggle,
    remove,
    clear,
  }), [items, has, toggle, remove, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCompare(): CompareCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe no-op fallback if used outside the provider (avoids crashes)
    return {
      items: [], count: 0, isFull: false,
      has: () => false, toggle: () => {}, remove: () => {}, clear: () => {},
    };
  }
  return ctx;
}
