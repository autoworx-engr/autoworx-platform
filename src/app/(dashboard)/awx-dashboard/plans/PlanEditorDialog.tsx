"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog";
import Input from "@/components/Input";
import { Button } from "@/components/ui/button";
import { PlatformFeatureType, PlatformPlanInterval } from "@prisma/client";
import { PlatformPlanWithMeta } from "./PlatformPlanManager";
import {
  DollarSign,
  Info,
  Layers,
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react";

const featureTypes = [
  PlatformFeatureType.BOOLEAN,
  PlatformFeatureType.NUMERIC,
  PlatformFeatureType.TEXT,
];

const formatFeatureName = (key: string) =>
  key
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

type FeatureDraft = {
  key: string;
  type: PlatformFeatureType;
  value: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlatformPlanWithMeta | null;
  onSave: (
    payload: {
      name: string;
      description: string | null;
      price: number;
      interval: PlatformPlanInterval;
      trialLengthDays: number;
      displayOrder: number;
      isActive: boolean;
      features: FeatureDraft[];
    },
    planId?: string,
  ) => Promise<{ ok: boolean; message?: string }>;
};

export const PlanEditorDialog = ({
  open,
  onOpenChange,
  plan,
  onSave,
}: Props) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [interval, setInterval] = useState<PlatformPlanInterval>(
    PlatformPlanInterval.MONTHLY,
  );
  const [trialLengthDays, setTrialLengthDays] = useState("0");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [features, setFeatures] = useState<FeatureDraft[]>([]);
  const [catalogFeatures, setCatalogFeatures] = useState<FeatureDraft[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [featuresDirty, setFeaturesDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(plan);

  useEffect(() => {
    if (!open) return;

    if (!plan) {
      setName("");
      setDescription("");
      setPrice("0");
      setInterval(PlatformPlanInterval.MONTHLY);
      setTrialLengthDays("0");
      setDisplayOrder("0");
      setIsActive(true);
      setError(null);
      setFeaturesDirty(false);
      return;
    }

    setName(plan.name);
    setDescription(plan.description || "");
    setPrice(String(plan.price));
    setInterval(plan.interval);
    setTrialLengthDays(String(plan.trialLengthDays || 0));
    setDisplayOrder(String(plan.displayOrder || 0));
    setIsActive(plan.isActive);
    setError(null);
    setFeaturesDirty(false);
  }, [open, plan]);

  useEffect(() => {
    if (!open) {
      setCatalogFeatures([]);
      setCatalogLoaded(false);
      return;
    }

    let isActive = true;

    const loadCatalog = async () => {
      try {
        const res = await fetch("/api/awx/platform-plan-features");
        if (!res.ok) return;
        const data = await res.json();
        if (!isActive) return;
        setCatalogFeatures(data?.features || []);
        setCatalogLoaded(true);
      } catch {
        // feature catalog load failed silently
      }
    };

    loadCatalog();

    return () => {
      isActive = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open || featuresDirty) return;

    const existingFeatures = plan
      ? plan.features.map((feature) => ({
          key: feature.featureKey,
          type: feature.type,
          value: feature.value,
        }))
      : [];

    if (!catalogLoaded) {
      setFeatures(existingFeatures);
      return;
    }

    const existingMap = new Map(
      existingFeatures.map((feature) => [feature.key, feature]),
    );

    const merged = catalogFeatures.map((feature) => {
      return existingMap.get(feature.key) || feature;
    });

    for (const feature of existingFeatures) {
      if (!merged.find((item) => item.key === feature.key)) {
        merged.push(feature);
      }
    }

    setFeatures(merged);
  }, [open, plan, catalogLoaded, catalogFeatures, featuresDirty]);

  const canSave = useMemo(() => {
    return name.trim().length > 0 && Number(price) > 0;
  }, [name, price]);

  const updateFeature = (index: number, patch: Partial<FeatureDraft>) => {
    setFeatures((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
    setFeaturesDirty(true);
  };

  const removeFeature = (index: number) => {
    setFeatures((prev) => prev.filter((_, idx) => idx !== index));
    setFeaturesDirty(true);
  };

  const handleSubmit = async () => {
    if (!canSave) {
      setError("Name and price are required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = {
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
      price: Number(price),
      interval,
      trialLengthDays: Number(trialLengthDays),
      displayOrder: Number(displayOrder),
      isActive,
      features: features.map((feature) => ({
        key: feature.key.trim(),
        type: feature.type,
        value: feature.value,
      })),
    };

    const result = await onSave(payload, plan?.id);

    if (!result.ok) {
      setError(result.message || "Save failed.");
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden rounded-[2.5rem] border-none bg-white/90 dark:bg-slate-950/90 p-0 shadow-2xl backdrop-blur-2xl ring-1 ring-slate-900/5 dark:ring-white/10">
        <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
              <Layers size={20} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                {isEdit ? "Plan Configuration" : "New Plan Configuration"}
              </DialogTitle>
              <p className="text-xs font-medium text-slate-500 tracking-tight">
                {isEdit
                  ? "Manage pricing and entitlements for this plan."
                  : "Define pricing and entitlements for a new plan."}
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 sm:flex">
            <ShieldCheck size={12} /> Live Sync
          </div>
        </div>

        <div className="max-h-[65vh] space-y-8 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Plan Name
              </label>
              <Input
                name="plan-name"
                value={name}
                onChange={(e: any) => setName(e.target.value)}
                className="h-11 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#6571FF] dark:ring-slate-800 px-4"
              />
            </div>
            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Interval
              </label>
              <select
                value={interval}
                onChange={(e) =>
                  setInterval(e.target.value as PlatformPlanInterval)
                }
                className="w-full appearance-none rounded-xl border-none bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#6571FF] dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800"
              >
                {Object.values(PlatformPlanInterval).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Price (USD)
              </label>
              <div className="relative">
                <div className="absolute left-4 top-3 text-slate-400">
                  <DollarSign size={18} />
                </div>
                <Input
                  name="plan-price"
                  type="number"
                  value={price}
                  onChange={(e: any) => setPrice(e.target.value)}
                  className="h-11 rounded-xl border-none pl-10 font-bold text-[#00b8b0] ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-500 dark:ring-slate-800"
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Trial Months
              </label>
              <Input
                name="plan-trial"
                type="number"
                min="0"
                value={trialLengthDays}
                onChange={(e: any) => setTrialLengthDays(e.target.value)}
                className="h-11 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#6571FF] dark:ring-slate-800 px-4"
              />
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Display Order
              </label>
              <Input
                name="plan-display-order"
                type="number"
                value={displayOrder}
                onChange={(e: any) => setDisplayOrder(e.target.value)}
                className="h-11 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#6571FF] dark:ring-slate-800 px-4"
              />
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Plan Status
              </label>
              <div className="flex h-11 rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
                {[true, false].map((val) => (
                  <button
                    key={val ? "active" : "inactive"}
                    onClick={() => setIsActive(val)}
                    className={`flex-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      isActive === val
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                        : "text-slate-500"
                    }`}
                  >
                    {val ? "Active" : "Inactive"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border-none bg-slate-100 p-3 text-sm text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#6571FF] dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800"
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Info size={12} /> Entitlement Overrides
              </h4>
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800">
                {features.length} features
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-[1.5rem] border border-slate-200/60 bg-slate-50/50 p-2 dark:border-slate-800/60 dark:bg-slate-900/40 custom-scrollbar overflow-x-hidden">
              {features.length === 0 && (
                <p className="px-3 py-4 text-xs text-slate-400">
                  No features yet. Add one to configure entitlements.
                </p>
              )}
              {features.map((feature, index) => (
                <div
                  key={`${feature.key}-${index}`}
                  className="group flex items-center justify-between gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-white dark:hover:bg-slate-800/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">
                      {formatFeatureName(feature.key)}
                    </p>
                    <p className="text-[10px] font-medium uppercase text-slate-400 tracking-tighter">
                      {feature.type}
                    </p>
                  </div>

                  <div className="w-40 flex-shrink-0 space-y-1">
                    {feature.type === PlatformFeatureType.BOOLEAN ? (
                      <div className="flex h-9 rounded-lg bg-slate-200 p-1 dark:bg-slate-800">
                        {["true", "false"].map((val) => (
                          <button
                            key={val}
                            onClick={() => updateFeature(index, { value: val })}
                            className={`flex-1 rounded-md text-[10px] font-black transition-all ${
                              feature.value === val
                                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                                : "text-slate-500"
                            }`}
                          >
                            {val === "true" ? "ENABLED" : "DISABLED"}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <Input
                        name={`feature-value-${index}`}
                        placeholder="value"
                        value={feature.value}
                        onChange={(e: any) =>
                          updateFeature(index, { value: e.target.value })
                        }
                        className="px-4 w-full h-9 rounded-lg border-none text-right font-mono text-[11px] font-bold text-[#6571FF] ring-1 ring-slate-200 focus:ring-2 focus:ring-[#6571FF] dark:ring-slate-700"
                      />
                    )}
                    {/* {feature.key &&
                    !catalogFeatures.some(
                      (catalogFeature) => catalogFeature.key === feature.key,
                    ) ? (
                      <button
                        onClick={() => removeFeature(index)}
                        className="text-[10px] font-bold text-rose-500 hover:text-rose-600"
                      >
                        Remove
                      </button>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400">
                        Default
                      </span>
                    )} */}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200/50 bg-slate-50/50 px-8 py-6 dark:border-slate-800/50 dark:bg-slate-900/50">
          <button
            onClick={() => onOpenChange(false)}
            className="text-xs font-bold text-slate-500 transition-colors hover:text-slate-800 dark:hover:text-slate-300"
          >
            Discard Changes
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !canSave}
            className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white transition-all hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-900"
          >
            {isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {isSaving ? "Syncing..." : isEdit ? "Save Changes" : "Create Plan"}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
