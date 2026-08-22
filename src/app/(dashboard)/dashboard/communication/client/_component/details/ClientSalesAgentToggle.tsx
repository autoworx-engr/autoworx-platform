"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import toast from "react-hot-toast";

type Props = {
  clientId: number;
  initialValue: boolean;
  isRestricted?: boolean;
};

export default function ClientSalesAgentToggle({
  clientId,
  initialValue,
  isRestricted = false,
}: Props) {
  const [enabled, setEnabled] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (value: boolean) => {
    setEnabled(value);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/client/${clientId}/sales-agent`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isSalesAgent: value }),
        });

        if (!res.ok) throw new Error("Failed to update");

        toast.success("Sales Agent permission updated");
      } catch (error) {
        setEnabled(!value); // revert on failure
        toast.error("Failed to update permission");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-[11px] 2xl:text-sm ${isRestricted ? "opacity-60" : "opacity-80"}`}
      >
        Sales Agent Access
      </span>
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={isPending || isRestricted}
      />
      {isRestricted && (
        <span className="text-[10px] font-medium text-amber-200/90 2xl:text-xs">
          Upgrade plan to enable
        </span>
      )}
    </div>
  );
}
