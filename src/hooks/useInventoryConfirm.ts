"use client";

import type {
  InventoryCheckResult,
  InventoryShortage,
} from "@/actions/estimate/invoice/checkInventory";
import { useCallback, useRef, useState } from "react";

type Runner = (
  allowInsufficientInventory: boolean,
  shortages: InventoryShortage[],
) => Promise<void> | void;

export function useInventoryConfirm() {
  const [shortages, setShortages] = useState<InventoryShortage[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const pendingRun = useRef<Runner | null>(null);
  const pendingShortages = useRef<InventoryShortage[]>([]);

  const runWithInventoryCheck = useCallback(
    async (check: () => Promise<InventoryCheckResult>, run: Runner) => {
      const result = await check();

      if (result.sufficient) {
        await run(false, []);
        return;
      }

      setShortages(result.shortages);
      pendingShortages.current = result.shortages;
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
    const confirmedShortages = pendingShortages.current;
    pendingRun.current = null;

    if (!run) {
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      await run(true, confirmedShortages);
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
