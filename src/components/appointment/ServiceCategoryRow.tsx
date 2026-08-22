"use client";

import { CATEGORY_NAME_MAX_LENGTH } from "@/lib/categoryConstants";
import { cn } from "@/lib/cn";
import { Category } from "@prisma/client";
import { Check, Loader2, PencilLine, Trash2 } from "lucide-react";
import { useState } from "react";

const DEFAULT_CATEGORY_COLOR = "#94A3B8";

export const getCategoryColor = (color?: string | null) =>
  color && /^#([0-9A-Fa-f]{3}){1,2}$/.test(color)
    ? color
    : DEFAULT_CATEGORY_COLOR;

type ServiceCategoryRowProps = {
  category: Category & { color?: string };
  colors: readonly string[];
  isSaving: boolean;
  onSave: (id: number, name: string, color: string) => Promise<boolean>;
  onRequestDelete: (category: Category) => void;
};

/**
 * One row in the service-category dropdown: the colour dot and name, plus edit
 * and delete controls that appear on hover. Editing swaps in an inline form.
 */
export default function ServiceCategoryRow({
  category,
  colors,
  isSaving,
  onSave,
  onRequestDelete,
}: ServiceCategoryRowProps) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(category.name);
  const [draftColor, setDraftColor] = useState(
    getCategoryColor(category.color),
  );

  // Selecting the row is the parent's job, so every control here has to stop the
  // click from bubbling up into the Selector.
  const swallow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const startEditing = (e: React.MouseEvent) => {
    swallow(e);
    // Re-seed from the category so a cancelled edit never leaks into the next.
    setDraftName(category.name);
    setDraftColor(getCategoryColor(category.color));
    setEditing(true);
  };

  const commit = async (e: React.MouseEvent) => {
    swallow(e);
    const trimmed = draftName.trim();
    if (!trimmed || isSaving) return;

    if (
      trimmed === category.name &&
      draftColor === getCategoryColor(category.color)
    ) {
      setEditing(false);
      return;
    }

    const ok = await onSave(category.id, trimmed, draftColor);
    if (ok) setEditing(false);
  };

  if (editing) {
    return (
      // The Selector row treats Enter and Space as "pick this item", so any key
      // press that reaches it while typing would select the category and close
      // the dropdown. Keep keyboard events inside the edit form.
      <div
        className="w-full space-y-2"
        onClick={swallow}
        onKeyDown={(e) => e.stopPropagation()}
        onKeyUp={(e) => e.stopPropagation()}
      >
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(e as unknown as React.MouseEvent);
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
            }
          }}
          autoFocus
          disabled={isSaving}
          maxLength={CATEGORY_NAME_MAX_LENGTH}
          className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 outline-none focus:border-primary"
          placeholder="Category name"
        />

        <div className="flex items-center justify-center gap-2">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={(e) => {
                swallow(e);
                setDraftColor(color);
              }}
              disabled={isSaving}
              className="size-4 rounded-full border-2 transition-transform hover:scale-105"
              style={{
                backgroundColor: color,
                borderColor: draftColor === color ? "#0F172A" : "#FFFFFF",
              }}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              swallow(e);
              setEditing(false);
            }}
            disabled={isSaving}
            className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={commit}
            disabled={isSaving || !draftName.trim()}
            className="flex flex-1 items-center justify-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group/row flex w-full items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full border border-slate-200"
          style={{ backgroundColor: getCategoryColor(category.color) }}
        />
        <p className="truncate text-sm font-medium text-slate-700 transition-colors group-hover:text-primary">
          {category.name}
        </p>
      </div>

      <div
        className={cn(
          "flex shrink-0 items-center gap-1",
          // Touch devices have no hover, so the controls stay visible there and
          // only fade in on hover from `sm` up.
          "opacity-100 transition-opacity",
          "sm:opacity-0 sm:group-hover/row:opacity-100 sm:focus-within:opacity-100",
        )}
      >
        <button
          type="button"
          onClick={startEditing}
          className="flex size-8 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:size-7"
          aria-label={`Edit ${category.name}`}
        >
          <PencilLine className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            swallow(e);
            onRequestDelete(category);
          }}
          className="flex size-8 items-center justify-center rounded text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          aria-label={`Delete ${category.name}`}
        >
          <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        </button>
      </div>
    </div>
  );
}
