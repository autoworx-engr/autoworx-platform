"use client";
import { queryKeys } from "@/lib/queryKeys";
import { updateTechnician } from "@/service/work-order/api";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

type DistributeMode = "percent" | "fixed";

// Cents are distributed to the earliest technicians so the shares always sum
// back to the entered total instead of losing a cent to rounding.
export function splitEvenly(total: number, count: number): number[] {
  if (count <= 0) return [];

  const totalCents = Math.round(total * 100);
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;

  return Array.from(
    { length: count },
    (_, i) => (base + (i < remainder ? 1 : 0)) / 100,
  );
}

export default function EquallyDistribute({
  invoiceItemId,
  invoiceId,
  serviceId,
  serviceAmount,
  technicianList,
  writePermission,
  onUpdateTechnician,
}: {
  invoiceItemId: number;
  invoiceId: string;
  serviceId: number | null;
  serviceAmount: number;
  technicianList: any[];
  writePermission: boolean;
  onUpdateTechnician?: (
    invoiceItemId: number,
    techId: number | string,
    payload: any,
  ) => void;
}) {
  const [mode, setMode] = useState<DistributeMode>("percent");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [applied, setApplied] = useState(false);
  const appliedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryClient = useQueryClient();
  const currentUser = useGetCurrentUser();
  const companyId = currentUser?.companyId;

  useEffect(
    () => () => {
      if (appliedTimer.current) clearTimeout(appliedTimer.current);
    },
    [],
  );

  if (!writePermission || technicianList.length < 1) return null;

  const numeric = parseFloat(value);
  const valid = value !== "" && !Number.isNaN(numeric) && numeric >= 0;
  const total = mode === "percent" ? (serviceAmount * numeric) / 100 : numeric;
  const shares = valid ? splitEvenly(total, technicianList.length) : [];

  const validate = () => {
    if (value === "" || Number.isNaN(numeric)) return "Enter a number.";
    if (numeric < 0) return "Value cannot be negative.";
    if (mode === "percent" && numeric > 100)
      return "Percentage cannot exceed 100.";
    if (mode === "percent" && serviceAmount <= 0)
      return "This item has no service amount to take a percentage of.";
    return "";
  };

  const handleApply = async () => {
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setSaving(true);

    try {
      for (let i = 0; i < technicianList.length; i++) {
        const technician = technicianList[i];
        const payload = {
          date: new Date(technician.date || new Date()),
          due: technician.due ? new Date(technician.due) : null,
          amount: shares[i],
          note: technician.note || "",
          technicianNote: technician.technicianNote || "",
          userId: technician.userId,
          status: technician.status || "Pending",
          priority: technician.priority || "Low",
          invoiceId,
          serviceId,
          vehicleParts: technician.vehicleParts || [],
          imageUrls: (technician.images || []).map((img: any) => img.fileUrl),
        };

        if (onUpdateTechnician) {
          onUpdateTechnician(invoiceItemId, technician.id, {
            ...payload,
            name: technician.name,
          });
        } else {
          await updateTechnician(
            companyId!,
            invoiceId,
            technician.id as number,
            payload,
          );
        }
      }

      if (!onUpdateTechnician) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.getInvoiceModalDataKey(invoiceId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.getWorkOrderDataKey(invoiceId),
        });
        window.dispatchEvent(
          new CustomEvent("invoice-updated", { detail: { invoiceId } }),
        );
      }

      setApplied(true);
      if (appliedTimer.current) clearTimeout(appliedTimer.current);
      appliedTimer.current = setTimeout(() => setApplied(false), 3000);
    } catch (err: any) {
      setError(err?.message || "Could not distribute the amount.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-2 w-full rounded-md border border-dashed border-primary/50 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold">Equally Distribute</span>

        <div className="flex overflow-hidden rounded-md border border-primary/50">
          {(["percent", "fixed"] as DistributeMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError("");
                setApplied(false);
              }}
              className={
                mode === m
                  ? "bg-primary px-2 py-0.5 text-xs text-white"
                  : "px-2 py-0.5 text-xs"
              }
            >
              {m === "percent" ? "%" : "$"}
            </button>
          ))}
        </div>

        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
            setApplied(false);
          }}
          placeholder={mode === "percent" ? "% of service" : "Total amount"}
          className="w-28 rounded-md border px-2 py-0.5 text-xs"
        />

        <button
          type="button"
          disabled={saving || !valid}
          onClick={handleApply}
          className="rounded-md bg-primary px-3 py-0.5 text-xs text-white disabled:opacity-50"
        >
          {saving ? "Applying..." : "Apply"}
        </button>

        {applied && (
          <span className="text-xs font-semibold text-green-600">
            ✓ Applied to{" "}
            {technicianList.length === 1
              ? "1 technician"
              : `${technicianList.length} technicians`}
          </span>
        )}

        {!applied && valid && !error && (
          <span className="text-xs text-slate-500">
            {technicianList.length === 1
              ? `$${total.toFixed(2)} to ${technicianList[0]?.name ?? "the technician"}`
              : `$${total.toFixed(2)} ÷ ${technicianList.length} = $${shares[0]?.toFixed(2)} each`}
          </span>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      <p className="mt-1 text-[11px] text-slate-400">
        {technicianList.length === 1
          ? "The amount is filled in automatically. You can still edit it."
          : "Each technician's amount is filled in automatically. You can still edit any of them individually."}
      </p>
    </div>
  );
}
