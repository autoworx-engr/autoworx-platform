"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { PlanEditorDialog } from "../../plans/PlanEditorDialog";

type Props = {
  companyId: number;
};

export function CompanyPlanEditor({ companyId }: Props) {
  const [open, setOpen] = useState(false);

  const handleSave = async (payload: {
    name: string;
    description: string | null;
    price: number;
    interval: any;
    trialLengthDays: number;
    displayOrder: number;
    isActive: boolean;
    features: { key: string; type: any; value: string }[];
  }) => {
    try {
      const res = await fetch("/api/awx/custom-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          label: payload.name,
          description: payload.description,
          price: payload.price,
          interval: payload.interval,
          trialLengthDays: payload.trialLengthDays,
          features: payload.features.map((f) => ({
            key: f.key,
            type: f.type,
            value: f.value,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { ok: false, message: data.message || "Failed to create plan" };
      }

      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err?.message || "An error occurred" };
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary to-[#5a66ee] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-primary/40 active:scale-95"
      >
        <Settings2
          size={16}
          className="transition-transform group-hover:rotate-45"
        />
        Configure Plan
      </button>

      <PlanEditorDialog
        open={open}
        onOpenChange={setOpen}
        plan={null}
        onSave={handleSave}
      />
    </>
  );
}
