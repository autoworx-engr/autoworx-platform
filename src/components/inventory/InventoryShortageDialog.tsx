"use client";

import type { InventoryShortage } from "@/actions/estimate/invoice/checkInventory";
import ConfirmModal from "@/components/ui/ConfirmModal";

type InventoryShortageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortages: InventoryShortage[];
  loading?: boolean;
  onConfirm: () => void;
};

/** "Brake Pad (need 5, have 2)" */
function describeShortage(shortage: InventoryShortage) {
  return `${shortage.name} (need ${shortage.required}, have ${shortage.available})`;
}

/**
 * Warns that a save/convert/authorize would take the inventory below what it
 * holds, and lets the user go ahead anyway. Cancelling leaves everything
 * untouched.
 */
export default function InventoryShortageDialog({
  open,
  onOpenChange,
  shortages,
  loading = false,
  onConfirm,
}: InventoryShortageDialogProps) {
  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Not enough inventory"
      description={`${shortages
        .map(describeShortage)
        .join(", ")}. Do you want to proceed?`}
      confirmText="Proceed anyway"
      cancelText="Cancel"
      loading={loading}
      onConfirm={onConfirm}
    />
  );
}
