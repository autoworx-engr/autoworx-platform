"use client";

import { slimInputClassName } from "@/components/SlimInput";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { KeyboardEvent, useState } from "react";

type CategoryInputProps = {
  value: string[];
  onChange: (next: string[]) => void;
};

export default function CategoryInput({ value, onChange }: CategoryInputProps) {
  const [draft, setDraft] = useState("");

  const commitDraft = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const exists = value.some(
      (item) => item.toLowerCase() === trimmed.toLowerCase(),
    );
    if (!exists) {
      onChange([...value, trimmed]);
    }
    setDraft("");
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
      return;
    }
    if (event.key === "Backspace" && draft === "" && value.length > 0) {
      event.preventDefault();
      removeAt(value.length - 1);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Category
      </label>

      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1.5",
          "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 focus-within:shadow-sm",
          "transition-all duration-200 hover:border-slate-300",
        )}
      >
        {value.map((category, index) => (
          <span
            key={`${category}-${index}`}
            className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"
          >
            {category}
            <button
              type="button"
              onClick={() => removeAt(index)}
              className="rounded-full p-0.5 text-primary/70 transition-colors hover:bg-primary/15 hover:text-primary"
              aria-label={`Remove ${category}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}

        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          placeholder={
            value.length === 0
              ? "Type a category and press Enter…"
              : "Add another…"
          }
          className={cn(
            "min-w-[140px] flex-1 bg-transparent px-1.5 py-1 text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400",
            slimInputClassName,
          )}
        />
      </div>
      <p className="text-[11px] text-slate-400">
        Press Enter to add. Click ✕ to remove.
      </p>
    </div>
  );
}
