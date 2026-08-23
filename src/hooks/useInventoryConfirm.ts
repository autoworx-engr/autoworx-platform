"use client";

import type {
  InventoryCheckResult,
  InventoryShortage,
} from "@/actions/estimate/invoice/checkInventory";
import { useCallback, useRef, useState } from "react";

type Runner = (allowInsufficientInventory: boolean) => Promise<void> | void;

/**
 * Wraps any inventory-consuming action (create / update / convert / authorize)
 * with a "not enough stock" warning:
 *
 * - stock is fine -> the action runs straight away
 * - stock is short -> the warning opens; confirming re-runs the action with
 *   `allowInsufficientInventory: true`, cancelling does nothing at all
 *
 * Pass `dialogProps` to <InventoryShortageDialog />.
 */
export function useInventoryConfirm() {
  const [shortages, setShortages] = useState<InventoryShortage[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const pendingRun = useRef<Runner | null>(null);

  const runWithInventoryCheck = useCallback(
    async (check: () => Promise<InventoryCheckResult>, run: Runner) => {
      const result = await check();

      if (result.sufficient) {
        await run(false);
        return;
      }

      setShortages(result.shortages);
      pendingRun.current = run;
      setOpen(true);
    },
    [],
  );

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    // Cancelled or dismissed — drop the queued action so nothing happens.
    if (!next) pendingRun.current = null;
  }, []);

  const handleConfirm = useCallback(async () => {
    const run = pendingRun.current;
    pendingRun.current = null;

    if (!run) {
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      await run(true);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }, []);

  return {
    runWithInventoryCheck,
    dialogProps: {
      open,
      onOpenChange: handleOpenChange,
      shortages,
      loading,
      onConfirm: handleConfirm,
    },
  };
}
