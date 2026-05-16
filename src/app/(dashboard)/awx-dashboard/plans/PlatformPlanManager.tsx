"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PlatformPlan, PlanFeature } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { PlanEditorDialog } from "./PlanEditorDialog";
import { ArrowLeft, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/Dialog";

export type PlatformPlanWithMeta = Omit<PlatformPlan, "price"> & {
  price: number;
  features: PlanFeature[];
  _count: { subscriptions: number };
};

type Props = {
  initialPlans: PlatformPlanWithMeta[];
};

export const PlatformPlanManager = ({ initialPlans }: Props) => {
  const [plans, setPlans] = useState<PlatformPlanWithMeta[]>(initialPlans);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlatformPlanWithMeta | null>(
    null,
  );

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    message: string;
    onConfirm: () => void;
  }>({ open: false, message: "", onConfirm: () => {} });

  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.displayOrder - b.displayOrder),
    [plans],
  );

  const openCreate = () => {
    setEditingPlan(null);
    setIsDialogOpen(true);
  };

  const openEdit = (plan: PlatformPlanWithMeta) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  const handleDelete = (plan: PlatformPlanWithMeta) => {
    if (plan._count.subscriptions > 0) {
      setActionError(
        "This plan has active subscriptions and cannot be deleted.",
      );
      return;
    }
    setConfirmDialog({
      open: true,
      message: `Delete plan "${plan.name}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog((p) => ({ ...p, open: false }));
        setPendingPlanId(plan.id);
        setActionError(null);

        const res = await fetch(`/api/awx/platform-plans/${plan.id}`, {
          method: "DELETE",
        });

        setPendingPlanId(null);

        if (res.ok) {
          setPlans((prev) => prev.filter((p) => p.id !== plan.id));
          return;
        }

        const data = await res.json().catch(() => null);
        setActionError(data?.message || "Failed to delete plan.");
      },
    });
  };

  const handleToggleActive = async (plan: PlatformPlanWithMeta) => {
    setPendingPlanId(plan.id);
    setActionError(null);

    const res = await fetch(`/api/awx/platform-plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !plan.isActive }),
    });

    setPendingPlanId(null);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setActionError(data?.message || "Failed to update plan status.");
      return;
    }

    const data = await res.json();
    setPlans((prev) => prev.map((p) => (p.id === plan.id ? data.plan : p)));
  };

  const handleSave = async (payload: any, planId?: string) => {
    const url = planId
      ? `/api/awx/platform-plans/${planId}`
      : "/api/awx/platform-plans";
    const method = planId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return { ok: false, message: data?.message || "Save failed" };
    }

    const data = await res.json();
    const plan = data.plan as PlatformPlanWithMeta;

    setPlans((prev) => {
      if (planId) {
        return prev.map((p) => (p.id === planId ? plan : p));
      }
      return [...prev, plan];
    });

    return { ok: true };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 text-xs 2xl:text-base">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/awx-dashboard"
            className="rounded-xl bg-white/80 p-2 text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:text-slate-800"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Plan Manager</h1>
            <p className="text-xs text-slate-500">
              Create, edit, and tune platform offerings.
            </p>
          </div>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 rounded-2xl bg-gradient-to-r from-[#00b8b0] to-[#0098da] px-5 py-2 text-xs font-bold text-white shadow-lg shadow-[#00b8b0]/25 hover:shadow-[#00b8b0]/40"
        >
          <Plus size={16} /> Create Plan
        </Button>
      </div>

      {/* Action Error Banner */}
      {actionError && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-400 hover:text-rose-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {sortedPlans.map((plan) => {
          const isThisPending = pendingPlanId === plan.id;
          return (
            <div
              key={plan.id}
              className="group relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl shadow-slate-200/30 ring-1 ring-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-200/40"
            >
              <div className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-br from-[#00b8b0]/5 to-transparent" />
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Subscription
                  </span>
                  <h2 className="mt-1 truncate text-xl font-bold text-slate-900">
                    {plan.name}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {plan.description || "No description"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                    plan.isActive
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {plan.isActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>

              <div className="relative z-10 mt-5 rounded-2xl border border-slate-200/60 bg-slate-50/70 p-4 text-sm text-slate-700">
                <div className="flex items-baseline justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    {plan.interval === "YEARLY" ? "Yearly" : "Monthly"}
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    ${Number(plan.price)}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-500">
                  <span>Interval</span>
                  <span className="text-right text-slate-700">
                    {plan.interval}
                  </span>
                  <span>Trial Months</span>
                  <span className="text-right text-slate-700">
                    {plan.trialLengthDays}
                  </span>
                  <span>Display Order</span>
                  <span className="text-right text-slate-700">
                    {plan.displayOrder}
                  </span>
                  <span>Features</span>
                  <span className="text-right text-slate-700">
                    {plan.features.length}
                  </span>
                  <span>Subscriptions</span>
                  <span className="text-right text-slate-700">
                    {plan._count.subscriptions}
                  </span>
                </div>
              </div>

              <div className="relative z-10 mt-6 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => openEdit(plan)}
                  disabled={isThisPending}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleToggleActive(plan)}
                  disabled={isThisPending}
                  className="flex items-center gap-1"
                >
                  {isThisPending ? (
                    "..."
                  ) : plan.isActive ? (
                    <>
                      <ToggleRight size={14} /> Deactivate
                    </>
                  ) : (
                    <>
                      <ToggleLeft size={14} /> Activate
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(plan)}
                  disabled={plan._count.subscriptions > 0 || isThisPending}
                  className="flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  Delete
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <PlanEditorDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        plan={editingPlan}
        onSave={handleSave}
      />

      {/* Inline Confirmation Dialog (replaces window.confirm) */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((p) => ({ ...p, open }))}
      >
        <DialogContent className="max-w-md rounded-2xl border border-slate-200 bg-white p-0 shadow-xl">
          <div className="px-7 py-5">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-slate-900">
                Confirm Deletion
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm text-slate-600">
                {confirmDialog.message}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-7 py-4">
            <button
              onClick={() => setConfirmDialog((p) => ({ ...p, open: false }))}
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              Cancel
            </button>
            <Button variant="destructive" onClick={confirmDialog.onConfirm}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
