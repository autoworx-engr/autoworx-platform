"use client";

/**
 * Footer action for a `Selector` dropdown that lets the user unset the current
 * value. Rendered by SelectVehicle / SelectCategory / the vendor picker so
 * "Clear …" looks and behaves the same everywhere.
 */
export default function ClearSelectionButton({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="flex w-full items-center justify-center rounded-md border border-red-200 bg-red-50/70 px-3 py-2 text-sm font-semibold text-red-400 transition-colors duration-150 hover:bg-red-50"
    >
      {label}
    </button>
  );
}
