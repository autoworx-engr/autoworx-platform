"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/Dialog";
import Input from "@/components/Input";
import { PlatformFeatureType, PlatformPlanInterval } from "@prisma/client";
import { PlatformPlanWithMeta } from "./PlatformPlanManager";
import { Loader2, Save } from "lucide-react";

const formatFeatureName = (key: string) =>
  key
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const AUTOMATION_MODULE_OPTIONS = [
  "pipeline",
  "communication",
  "invoice",
  "inventory",
  "tag",
  "service",
  "marketing",
  "reporting",
];

type FeatureDraft = {
  key: string;
  type: PlatformFeatureType;
  value: string;
};

type FieldErrorKey =
  | "name"
  | "price"
  | "trialLengthDays"
  | "displayOrder"
  | "description";

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
  const controlClassName =
    "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [interval, setInterval] = useState<PlatformPlanInterval>(
    PlatformPlanInterval.MONTHLY,
  );
  const [trialLengthDays, setTrialLengthDays] = useState("");
  const [displayOrder, setDisplayOrder] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [features, setFeatures] = useState<FeatureDraft[]>([]);
  const [catalogFeatures, setCatalogFeatures] = useState<FeatureDraft[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [featuresDirty, setFeaturesDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldErrorKey, string>>
  >({});
  const [featureErrors, setFeatureErrors] = useState<Record<number, string>>(
    {},
  );

  const isEdit = Boolean(plan);

  useEffect(() => {
    if (!open) return;

    if (!plan) {
      setName("");
      setDescription("");
      setPrice("");
      setInterval(PlatformPlanInterval.MONTHLY);
      setTrialLengthDays("");
      setDisplayOrder("");
      setIsActive(true);
      setSubmitError(null);
      setFieldErrors({});
      setFeatureErrors({});
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
    setSubmitError(null);
    setFieldErrors({});
    setFeatureErrors({});
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
    return !isSaving;
  }, [isSaving]);

  const validateForm = () => {
    const nextFieldErrors: Partial<Record<FieldErrorKey, string>> = {};
    const nextFeatureErrors: Record<number, string> = {};

    if (!name.trim()) {
      nextFieldErrors.name = "Plan name is required.";
    }

    const parsedPrice = Number(price);
    if (price === "" || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      nextFieldErrors.price = "Price must be greater than 0.";
    }

    if (description.length > 500) {
      nextFieldErrors.description =
        "Description must be 500 characters or less.";
    }

    if (trialLengthDays !== "") {
      const parsedTrial = Number(trialLengthDays);
      if (
        Number.isNaN(parsedTrial) ||
        !Number.isInteger(parsedTrial) ||
        parsedTrial < 0
      ) {
        nextFieldErrors.trialLengthDays =
          "Trial months must be a whole number 0 or greater.";
      }
    }

    if (displayOrder !== "") {
      const parsedDisplayOrder = Number(displayOrder);
      if (
        Number.isNaN(parsedDisplayOrder) ||
        !Number.isInteger(parsedDisplayOrder) ||
        parsedDisplayOrder < 0
      ) {
        nextFieldErrors.displayOrder =
          "Display order must be a whole number 0 or greater.";
      }
    }

    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      const value = feature.value?.trim() ?? "";

      if (!feature.key?.trim()) {
        nextFeatureErrors[i] = "Feature key is required.";
        continue;
      }

      if (feature.type === PlatformFeatureType.BOOLEAN) {
        if (value !== "true" && value !== "false") {
          nextFeatureErrors[i] = "Boolean feature must be true or false.";
        }
        continue;
      }

      if (feature.key === "automation_modules") {
        const modules = value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
        const hasInvalid = modules.some(
          (moduleName) => !AUTOMATION_MODULE_OPTIONS.includes(moduleName),
        );
        if (hasInvalid) {
          nextFeatureErrors[i] = "Contains unsupported automation modules.";
        }
        continue;
      }

      if (feature.type === PlatformFeatureType.NUMERIC) {
        const parsedNumber = Number(value);
        if (value === "" || Number.isNaN(parsedNumber)) {
          nextFeatureErrors[i] = "Numeric feature must contain a valid number.";
        }
        continue;
      }

      if (!value) {
        nextFeatureErrors[i] = "Value is required.";
      }
    }

    setFieldErrors(nextFieldErrors);
    setFeatureErrors(nextFeatureErrors);

    return (
      Object.keys(nextFieldErrors).length === 0 &&
      Object.keys(nextFeatureErrors).length === 0
    );
  };

  const updateFeature = (index: number, patch: Partial<FeatureDraft>) => {
    setFeatures((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
    setFeatureErrors((prev) => {
      if (!prev[index]) return prev;
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setFeaturesDirty(true);
  };

  const toggleAutomationModule = (index: number, moduleName: string) => {
    const current = features[index]?.value || "";
    const selected = current
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const nextSet = new Set(selected);
    if (nextSet.has(moduleName)) {
      nextSet.delete(moduleName);
    } else {
      nextSet.add(moduleName);
    }

    const nextValue = AUTOMATION_MODULE_OPTIONS.filter((m) =>
      nextSet.has(m),
    ).join(",");
    updateFeature(index, { value: nextValue });
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setSubmitError("Please fix the highlighted fields before saving.");
      return;
    }

    setIsSaving(true);
    setSubmitError(null);

    const payload = {
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
      price: Number(price),
      interval,
      trialLengthDays: Number(trialLengthDays || 0),
      displayOrder: Number(displayOrder || 0),
      isActive,
      features: features.map((feature) => ({
        key: feature.key.trim(),
        type: feature.type,
        value: feature.value,
      })),
    };

    const result = await onSave(payload, plan?.id);

    if (!result.ok) {
      setSubmitError(result.message || "Save failed.");
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-xl">
        <div className="border-b border-slate-200 bg-gradient-to-r from-[#EEF2FF] via-white to-[#EEF2FF] px-7 py-5">
          <DialogTitle className="text-lg font-semibold text-slate-900">
            {isEdit ? "Plan Configuration" : "New Plan Configuration"}
          </DialogTitle>
          <p className="mt-1 text-sm text-slate-600">
            {isEdit
              ? "Manage pricing and entitlements for this plan."
              : "Define pricing and entitlements for a new plan."}
          </p>
        </div>

        <div className="max-h-[65vh] space-y-6 overflow-y-auto p-7">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-800">
                Plan Basics
              </h3>
              <p className="text-xs text-slate-500">
                Configure pricing, billing cycle, and ordering.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Plan Name
                </label>
                <Input
                  name="plan-name"
                  value={name}
                  onChange={(e: any) => {
                    setName(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  className={`${controlClassName} ${fieldErrors.name ? "border-red-400 focus:border-red-400 focus:ring-red-200" : ""}`}
                />
                {fieldErrors.name && (
                  <p className="text-xs text-red-600">{fieldErrors.name}</p>
                )}
              </div>
              <div className="min-w-0 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Interval
                </label>
                <select
                  value={interval}
                  onChange={(e) =>
                    setInterval(e.target.value as PlatformPlanInterval)
                  }
                  className={`${controlClassName} appearance-none pr-8`}
                >
                  {Object.values(PlatformPlanInterval).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Price (USD)
                </label>
                <Input
                  name="plan-price"
                  type="number"
                  placeholder="0"
                  value={price}
                  onChange={(e: any) => {
                    setPrice(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, price: undefined }));
                  }}
                  className={`${controlClassName} font-semibold text-primary ${fieldErrors.price ? "border-red-400 focus:border-red-400 focus:ring-red-200" : ""}`}
                />
                {fieldErrors.price && (
                  <p className="text-xs text-red-600">{fieldErrors.price}</p>
                )}
              </div>

              <div className="min-w-0 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Trial Months
                </label>
                <Input
                  name="plan-trial"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={trialLengthDays}
                  onChange={(e: any) => {
                    setTrialLengthDays(e.target.value);
                    setFieldErrors((prev) => ({
                      ...prev,
                      trialLengthDays: undefined,
                    }));
                  }}
                  className={`${controlClassName} ${fieldErrors.trialLengthDays ? "border-red-400 focus:border-red-400 focus:ring-red-200" : ""}`}
                />
                {fieldErrors.trialLengthDays && (
                  <p className="text-xs text-red-600">
                    {fieldErrors.trialLengthDays}
                  </p>
                )}
              </div>

              <div className="min-w-0 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Display Order
                </label>
                <Input
                  name="plan-display-order"
                  type="number"
                  placeholder="0"
                  value={displayOrder}
                  onChange={(e: any) => {
                    setDisplayOrder(e.target.value);
                    setFieldErrors((prev) => ({
                      ...prev,
                      displayOrder: undefined,
                    }));
                  }}
                  className={`${controlClassName} ${fieldErrors.displayOrder ? "border-red-400 focus:border-red-400 focus:ring-red-200" : ""}`}
                />
                {fieldErrors.displayOrder && (
                  <p className="text-xs text-red-600">
                    {fieldErrors.displayOrder}
                  </p>
                )}
              </div>

              <div className="min-w-0 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Plan Status
                </label>
                <div className="grid h-11 grid-cols-2 rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
                  {[true, false].map((val) => (
                    <button
                      key={val ? "active" : "inactive"}
                      onClick={() => setIsActive(val)}
                      className={`rounded-md text-xs font-semibold transition ${
                        isActive === val
                          ? "bg-primary text-white"
                          : "text-slate-500"
                      }`}
                    >
                      {val ? "Active" : "Inactive"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-800">
                Description
              </h3>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setFieldErrors((prev) => ({
                    ...prev,
                    description: undefined,
                  }));
                }}
                className={`w-full rounded-lg border bg-white p-3 text-sm text-slate-700 shadow-sm outline-none transition focus:ring-2 ${
                  fieldErrors.description
                    ? "border-red-400 focus:border-red-400 focus:ring-red-200"
                    : "border-slate-300 focus:border-primary focus:ring-primary/20"
                }`}
                rows={3}
              />
              {fieldErrors.description && (
                <p className="text-xs text-red-600">
                  {fieldErrors.description}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-primary">
                Entitlement Overrides
              </h4>
              <span className="rounded-md bg-[#EEF2FF] px-2 py-0.5 text-xs font-semibold text-primary">
                {features.length} features
              </span>
            </div>

            <div className="rounded-lg border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-2 overflow-x-hidden">
              {features.length === 0 && (
                <p className="px-3 py-4 text-sm text-slate-500">
                  No features yet. Add one to configure entitlements.
                </p>
              )}
              {features.map((feature, index) => (
                <div
                  key={`${feature.key}-${index}`}
                  className="flex items-center justify-between gap-4 rounded-md px-3 py-2 hover:bg-[#EEF2FF]/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {formatFeatureName(feature.key)}
                    </p>
                    <p className="text-[11px] text-slate-500">{feature.type}</p>
                  </div>

                  <div
                    className={`${
                      feature.key === "automation_modules" ? "w-72" : "w-40"
                    } flex-shrink-0 space-y-1`}
                  >
                    {feature.type === PlatformFeatureType.BOOLEAN ? (
                      <div className="flex h-9 rounded-md border border-slate-300 bg-white p-1">
                        {["true", "false"].map((val) => (
                          <button
                            key={val}
                            onClick={() => updateFeature(index, { value: val })}
                            className={`flex-1 rounded text-[11px] font-medium transition ${
                              feature.value === val
                                ? "bg-primary text-white"
                                : "text-slate-500"
                            }`}
                          >
                            {val === "true" ? "ENABLED" : "DISABLED"}
                          </button>
                        ))}
                      </div>
                    ) : feature.key === "automation_modules" ? (
                      <div className="grid grid-cols-2 gap-1.5">
                        {AUTOMATION_MODULE_OPTIONS.map((moduleName) => {
                          const selectedModules = (feature.value || "")
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean);
                          const isSelected =
                            selectedModules.includes(moduleName);

                          return (
                            <button
                              key={moduleName}
                              type="button"
                              onClick={() =>
                                toggleAutomationModule(index, moduleName)
                              }
                              className={`rounded-md border px-2 py-1 text-[10px] font-semibold capitalize transition ${
                                isSelected
                                  ? "border-primary bg-primary text-white"
                                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <span className="whitespace-nowrap">
                                {moduleName}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <Input
                        name={`feature-value-${index}`}
                        placeholder={
                          feature.type === PlatformFeatureType.NUMERIC
                            ? "0"
                            : "value"
                        }
                        value={
                          feature.type === PlatformFeatureType.NUMERIC &&
                          feature.value === "0"
                            ? ""
                            : feature.value
                        }
                        onChange={(e: any) =>
                          updateFeature(index, { value: e.target.value })
                        }
                        className={`w-full h-9 rounded-md border px-3 text-right text-sm text-primary shadow-sm focus:ring-2 ${
                          featureErrors[index]
                            ? "border-red-400 focus:border-red-400 focus:ring-red-200"
                            : "border-slate-300 focus:border-primary focus:ring-primary/20"
                        }`}
                      />
                    )}
                    {featureErrors[index] && (
                      <p className="text-[11px] text-red-600">
                        {featureErrors[index]}
                      </p>
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

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/70 px-7 py-4">
          <button
            onClick={() => onOpenChange(false)}
            className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            Discard Changes
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !canSave}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-[#3730A3] disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {isSaving ? "Syncing..." : isEdit ? "Save Changes" : "Create Plan"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
