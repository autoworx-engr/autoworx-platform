"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import toast from "react-hot-toast";

type Props = {
  clientId: number;
  initialValue: boolean;
};

export default function ClientSalesAgentToggle({
  clientId,
  initialValue,
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
    <div className=" flex items-center gap-2">
      <span className="text-[11px] opacity-80 2xl:text-sm">
        Sales Agent Access
      </span>
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={isPending}
      />
    </div>
  );
}
