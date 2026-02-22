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
      } catch (err) {
        console.error("Failed to load feature catalog", err);
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
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto rounded-[2rem] border-none bg-white/95 p-0 shadow-2xl ring-1 ring-slate-900/10">
        <div className="flex items-center justify-between border-b border-slate-200/60 px-8 py-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {isEdit ? "Edit Plan" : "Create Plan"}
            </DialogTitle>
            <p className="text-xs font-medium text-slate-500">
              Keep plan pricing and entitlements aligned with billing.
            </p>
          </DialogHeader>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-600">
            Billing Sync
          </span>
        </div>

        <div className="space-y-6 px-8 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500">
                Plan Name
              </label>
              <Input
                value={name}
                onChange={(e: any) => setName(e.target.value)}
                className="border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500">
                Price (USD)
              </label>
              <Input
                type="number"
                value={price}
                onChange={(e: any) => setPrice(e.target.value)}
                className="border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500">
                Interval
              </label>
              <select
                value={interval}
                onChange={(e) =>
                  setInterval(e.target.value as PlatformPlanInterval)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                {Object.values(PlatformPlanInterval).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500">
                Trial Months
              </label>
              <Input
                type="number"
                min={0}
                value={trialLengthDays}
                onChange={(e: any) => setTrialLengthDays(e.target.value)}
                className="border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500">
                Display Order
              </label>
              <Input
                type="number"
                value={displayOrder}
                onChange={(e: any) => setDisplayOrder(e.target.value)}
                className="border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              <input
                id="plan-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-600">Features</h3>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Catalog-driven
              </span>
            </div>
            <div className="space-y-3">
              {features.length === 0 && (
                <p className="text-xs text-slate-400">
                  No features yet. Add one to configure entitlements.
                </p>
              )}
              {features.map((feature, index) => (
                <div
                  key={`${feature.key}-${index}`}
                  className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-4"
                >
                  <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    {formatFeatureName(feature.key)}
                  </div>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    {feature.type}
                  </div>
                  {feature.type === PlatformFeatureType.BOOLEAN ? (
                    <select
                      value={feature.value}
                      onChange={(e) =>
                        updateFeature(index, { value: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <Input
                      placeholder="value"
                      value={feature.value}
                      onChange={(e: any) =>
                        updateFeature(index, { value: e.target.value })
                      }
                      className="border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    />
                  )}
                  {feature.key &&
                  !catalogFeatures.some(
                    (catalogFeature) => catalogFeature.key === feature.key,
                  ) ? (
                    <Button
                      variant="ghost"
                      className="text-red-500"
                      onClick={() => removeFeature(index)}
                    >
                      Remove
                    </Button>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-400">
                      Default
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center justify-end gap-2 border-t border-slate-200/60 pt-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSaving || !canSave}
              className="rounded-xl bg-gradient-to-r from-[#00b8b0] to-[#0098da] text-white"
            >
              {isSaving ? "Saving..." : isEdit ? "Save Changes" : "Create Plan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
