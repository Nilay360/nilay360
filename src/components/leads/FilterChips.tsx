"use client";

import { X } from "lucide-react";

interface FilterChip {
  id: 'status' | 'sort';
  label: string;
  value: string;
}

interface FilterChipsProps {
  filters: FilterChip[];
  onRemove: (id: 'status' | 'sort') => void;
  onClearAll: () => void;
}

export function FilterChips({ filters, onRemove, onClearAll }: FilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#0B1F3A]/60 p-3">
      <span className="text-xs font-medium text-white/50 font-[Cal_Sans]">
        Filters:
      </span>

      {filters.map((filter) => (
        <span
          key={filter.id}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#10C4C3]/10
                     px-3 py-1 text-xs font-medium text-[#10C4C3]"
        >
          <span className="truncate max-w-[160px]">
            {filter.label}: {filter.value}
          </span>
          <button
            type="button"
            onClick={() => onRemove(filter.id)}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full
                       text-[#10C4C3]/70 transition-colors hover:bg-[#10C4C3]/20 hover:text-[#3DDAD9]"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove {filter.label} filter</span>
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="ml-auto text-xs font-medium text-white/50 underline-offset-2
                   transition-colors hover:text-[#10C4C3] hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
