"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog";
import Selector from "@/components/Selector";
import { Switch } from "@/components/Switch";
import { Button } from "@/components/ui/button";
import {
  useCreateGiftCardPromo,
  useDeleteGiftCardPromo,
  useGetGiftCardPromos,
  useUpdateGiftCardPromo,
} from "@/hooks/virtual-shop/gift-card-promos/useGiftCardPromos";
import {
  useGetGiftCardSettings,
  useUpdateGiftCardSettings,
} from "@/hooks/virtual-shop/gift-card-settings/useGiftCardSettings";
import {
  useCreateGiftCardTemplate,
  useDeleteGiftCardTemplate,
  useGetGiftCardTemplates,
  useUpdateGiftCardTemplate,
} from "@/hooks/virtual-shop/gift-card-templates/useGiftCardTemplates";
import type { GiftCardPromoData } from "@/service/virtual-shop/api";
import { Popconfirm, Tooltip } from "antd";
import {
  Check,
  CircleHelp,
  DollarSign,
  FileText,
  Image as ImageIcon,
  Loader2,
  PencilLineIcon,
  Plus,
  Send,
  ShieldCheck,
  Tag,
  Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import GiftCardsTabSkeleton from "./GiftCardsTabSkeleton";

// ── Gift Card Designs ─────────────────────────────────────────────────────────

type CardDesign = {
  id: number;
  name: string;
  imageUrl?: string;
  gradient: string;
  enabled: boolean;
  isDefault: boolean;
};

const INITIAL_DESIGNS: CardDesign[] = [
  {
    id: 1,
    name: "Classic Blue",
    gradient: "from-teal-400 to-blue-500",
    enabled: true,
    isDefault: true,
  },
  {
    id: 2,
    name: "Sunset Orange",
    gradient: "from-purple-500 to-pink-500",
    enabled: true,
    isDefault: false,
  },
  {
    id: 3,
    name: "Dark Carbon",
    gradient: "from-sky-400 to-purple-600",
    enabled: true,
    isDefault: false,
  },
  {
    id: 4,
    name: "Holiday Special",
    gradient: "from-teal-400 to-blue-900",
    enabled: true,
    isDefault: false,
  },
];

// ── Discount Codes ────────────────────────────────────────────────────────────

type DiscountCodeType = "Percentage" | "Fixed";

const DELIVERY_METHODS = ["Email", "Text"] as const;
type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

const UI_TO_API_DELIVERY: Record<DeliveryMethod, "EMAIL" | "SMS"> = {
  Email: "EMAIL",
  Text: "SMS",
};

const API_TO_UI_DELIVERY: Record<"EMAIL" | "SMS" | "BOTH", DeliveryMethod> = {
  EMAIL: "Email",
  SMS: "Text",
  BOTH: "Email",
};

// ── Input helper ──────────────────────────────────────────────────────────────

function SettingInput({
  label,
  value,
  onChange,
  type = "text",
  min,
  required = false,
  className,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  min?: string;
  required?: boolean;
  className?: string;
  placeholder?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label className="text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        type={type}
        min={min}
        required={required}
        value={value}
        onKeyDown={(event) => {
          if (type !== "number") return;

          if (["e", "E", "+", "-"].includes(event.key)) {
            event.preventDefault();
          }
        }}
        onChange={(e) => {
          const nextValue = e.target.value;

          if (type !== "number") {
            onChange(nextValue);
            return;
          }

          if (nextValue === "" || /^\d*\.?\d*$/.test(nextValue)) {
            onChange(nextValue);
          }
        }}
        className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        placeholder={placeholder}
      />
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon size={20} className="text-gray-700" />
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      <p className="mt-1 text-sm text-primary">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  setChecked,
  tooltip,
}: {
  label: string;
  checked: boolean;
  setChecked: (v: boolean) => void;
  tooltip: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-gray-800">{label}</span>
        <Tooltip title={tooltip} placement="top">
          <button
            type="button"
            aria-label={`${label} info`}
            className="inline-flex text-gray-400 hover:text-gray-600"
          >
            <CircleHelp size={14} />
          </button>
        </Tooltip>
      </div>
      <Switch checked={checked} setChecked={setChecked} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type GiftCardsTabProps = {
  shopId?: number;
};

export default function GiftCardsTab({ shopId }: GiftCardsTabProps) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const {
    data: giftCardSettings,
    isLoading: isGiftCardSettingsLoading,
    isFetched: hasFetchedGiftCardSettings,
  } = useGetGiftCardSettings(shopId, accessToken);
  const { mutateAsync: updateGiftCardSettings, isPending: isSaving } =
    useUpdateGiftCardSettings();
  const { data: giftCardTemplates, isLoading: isGiftCardTemplatesLoading } =
    useGetGiftCardTemplates(shopId, accessToken);
  const { mutateAsync: createGiftCardTemplate, isPending: isCreatingTemplate } =
    useCreateGiftCardTemplate();
  const { mutateAsync: deleteGiftCardTemplate, isPending: isDeletingTemplate } =
    useDeleteGiftCardTemplate();
  const { mutateAsync: updateGiftCardTemplate, isPending: isUpdatingTemplate } =
    useUpdateGiftCardTemplate();
  const { data: promoCodes = [], isLoading: isPromoCodesLoading } =
    useGetGiftCardPromos(shopId, accessToken);
  const { mutateAsync: createGiftCardPromo, isPending: isCreatingPromo } =
    useCreateGiftCardPromo();
  const { mutateAsync: updateGiftCardPromo, isPending: isUpdatingPromo } =
    useUpdateGiftCardPromo();
  const { mutateAsync: deleteGiftCardPromo, isPending: isDeletingPromo } =
    useDeleteGiftCardPromo();

  // Designs
  const [designs, setDesigns] = useState<CardDesign[]>(INITIAL_DESIGNS);

  const toggleDesign = (id: number, enabled: boolean) => {
    setDesigns((prev) => {
      const next = prev.map((d) => (d.id === id ? { ...d, enabled } : d));

      if (enabled) {
        return next;
      }

      const toggledDesign = next.find((design) => design.id === id);
      if (!toggledDesign?.isDefault) {
        return next;
      }

      const fallbackDefault = next.find(
        (design) => design.id !== id && design.enabled,
      );
      if (!fallbackDefault) {
        return next.map((design) =>
          design.id === id ? { ...design, isDefault: false } : design,
        );
      }

      return next.map((design) => {
        if (design.id === id) {
          return { ...design, isDefault: false };
        }

        if (design.id === fallbackDefault.id) {
          return { ...design, isDefault: true };
        }

        return design;
      });
    });
  };

  const setDefaultTemplateInState = (id: number) => {
    setDesigns((prev) =>
      prev.map((design) => ({
        ...design,
        isDefault: design.id === id,
        enabled: design.id === id ? true : design.enabled,
      })),
    );
  };

  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateImageFile, setNewTemplateImageFile] = useState<File | null>(
    null,
  );
  const [isUploadingTemplateImage, setIsUploadingTemplateImage] =
    useState(false);
  const [templateImageInputKey, setTemplateImageInputKey] = useState(0);

  // Amount presets
  const [showPresets, setShowPresets] = useState(true);
  const [preset1, setPreset1] = useState("50");
  const [preset2, setPreset2] = useState("100");
  const [preset3, setPreset3] = useState("200");
  const [allowCustom, setAllowCustom] = useState(true);
  const [minAmount, setMinAmount] = useState("25");
  const [maxAmount, setMaxAmount] = useState("2000");

  // Delivery
  const [textDelivery, setTextDelivery] = useState(true);
  const [emailDelivery, setEmailDelivery] = useState(true);
  const [defaultMethod, setDefaultMethod] = useState<DeliveryMethod>("Email");
  const [scheduledSend, setScheduledSend] = useState(true);
  const handleDeliveryMethod = (item: DeliveryMethod) => setDefaultMethod(item);

  // Discount codes
  const [isPromoDialogOpen, setIsPromoDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<GiftCardPromoData | null>(
    null,
  );
  const [promoCode, setPromoCode] = useState("");
  const [promoType, setPromoType] = useState<DiscountCodeType>("Percentage");
  const [promoValue, setPromoValue] = useState("10");
  const [promoExpireDate, setPromoExpireDate] = useState("2026-12-31");
  const [promoUsageLimit, setPromoUsageLimit] = useState("100");

  const formatDateForInput = (value?: string | null) => {
    if (!value) return "";
    return new Date(value).toISOString().slice(0, 10);
  };

  const openCreatePromoDialog = () => {
    setEditingPromo(null);
    setPromoCode("");
    setPromoType("Percentage");
    setPromoValue("10");
    setPromoExpireDate("2026-12-31");
    setPromoUsageLimit("100");
    setIsPromoDialogOpen(true);
  };

  const openEditPromoDialog = (promo: GiftCardPromoData) => {
    setEditingPromo(promo);
    setPromoCode(promo.code);
    setPromoType(promo.type as DiscountCodeType);
    setPromoValue(String(promo.value ?? ""));
    setPromoExpireDate(formatDateForInput(promo.expireDate));
    setPromoUsageLimit(
      promo.usageLimit !== null && promo.usageLimit !== undefined
        ? String(promo.usageLimit)
        : "",
    );
    setIsPromoDialogOpen(true);
  };

  const formatPromoValue = (promo: GiftCardPromoData) => {
    const numericValue = Number(promo.value);
    if (promo.type === "Percentage") {
      return `${numericValue}%`;
    }
    return `$${numericValue}`;
  };

  const formatPromoExpireDate = (value?: string | null) => {
    if (!value) return "No expiry";
    return new Date(value).toLocaleDateString("en-US");
  };

  const handleDeletePromoCode = async (id: number) => {
    if (!accessToken) {
      toast.error("Session expired. Please sign in again.");
      return;
    }

    try {
      await deleteGiftCardPromo({ id, accessToken });
      toast.success("Promo code deleted successfully");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        error?.message ??
        "Failed to delete promo code";
      toast.error(message);
    }
  };

  const handleSubmitPromoCode = async () => {
    if (!accessToken) {
      toast.error("Session expired. Please sign in again.");
      return;
    }

    if (promoCode.trim().length < 2) {
      toast.error("Code must be at least 2 characters");
      return;
    }

    const parsedValue = Number(promoValue);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      toast.error("Value must be a positive number");
      return;
    }

    if (promoType === "Percentage" && parsedValue > 100) {
      toast.error("Percentage value cannot exceed 100");
      return;
    }

    const parsedUsageLimit = promoUsageLimit.trim()
      ? Number(promoUsageLimit)
      : null;

    if (
      parsedUsageLimit !== null &&
      (!Number.isInteger(parsedUsageLimit) || parsedUsageLimit < 0)
    ) {
      toast.error("Usage limit must be a non-negative whole number");
      return;
    }

    const payload = {
      code: promoCode.trim().toUpperCase(),
      type: promoType,
      value: parsedValue,
      expireDate: promoExpireDate
        ? new Date(promoExpireDate).toISOString()
        : null,
      usageLimit: parsedUsageLimit,
      isActive: true,
    };

    try {
      if (editingPromo) {
        await updateGiftCardPromo({
          id: editingPromo.id,
          payload,
          accessToken,
        });
        toast.success("Promo code updated successfully");
      } else {
        await createGiftCardPromo({ shopId: shopId!, payload, accessToken });
        toast.success("Promo code created successfully");
      }

      setIsPromoDialogOpen(false);
      setEditingPromo(null);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        error?.message ??
        "Failed to save promo code";
      toast.error(message);
    }
  };

  // Policies
  const [termsUrl, setTermsUrl] = useState("#terms");
  const [privacyUrl, setPrivacyUrl] = useState("#privacy");

  const isHydratingSettings = !!accessToken && !hasFetchedGiftCardSettings;

  const presetValues = useMemo(() => {
    return [preset1, preset2, preset3]
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value >= 0);
  }, [preset1, preset2, preset3]);

  useEffect(() => {
    if (!giftCardSettings) return;

    const presets = Array.isArray(giftCardSettings.presetAmounts)
      ? giftCardSettings.presetAmounts
      : [];

    setShowPresets(presets.length > 0);
    setPreset1(String(presets[0] ?? ""));
    setPreset2(String(presets[1] ?? ""));
    setPreset3(String(presets[2] ?? ""));

    setAllowCustom(Boolean(giftCardSettings.allowCustomAmount));
    setMinAmount(
      giftCardSettings.minCustomAmount !== null &&
        giftCardSettings.minCustomAmount !== undefined
        ? String(giftCardSettings.minCustomAmount)
        : "",
    );
    setMaxAmount(
      giftCardSettings.maxCustomAmount !== null &&
        giftCardSettings.maxCustomAmount !== undefined
        ? String(giftCardSettings.maxCustomAmount)
        : "",
    );

    setTextDelivery(Boolean(giftCardSettings.allowSmsDelivery));
    setEmailDelivery(Boolean(giftCardSettings.allowEmailDelivery));
    setDefaultMethod(
      API_TO_UI_DELIVERY[giftCardSettings.defaultDelivery] ?? "Email",
    );
    setScheduledSend(Boolean(giftCardSettings.allowScheduledSend));

    setTermsUrl(giftCardSettings.termsAndConditions ?? "");
    setPrivacyUrl(giftCardSettings.privacyPolicy ?? "");
  }, [giftCardSettings]);

  useEffect(() => {
    if (!giftCardTemplates) return;

    const gradients = [
      "from-teal-400 to-blue-500",
      "from-purple-500 to-pink-500",
      "from-sky-400 to-purple-600",
      "from-teal-400 to-blue-900",
    ];

    setDesigns(
      giftCardTemplates.map((template, index) => ({
        id: template.id,
        name: template.name,
        imageUrl: template.imageUrl,
        gradient: gradients[index % gradients.length],
        enabled: template.isActive,
        isDefault: template.isDefault,
      })),
    );
  }, [giftCardTemplates]);

  const handleCreateTemplate = async () => {
    if (!accessToken) {
      toast.error("Session expired. Please sign in again.");
      return;
    }

    if (!newTemplateName.trim()) {
      toast.error("Template name is required");
      return;
    }

    if (!newTemplateImageFile) {
      toast.error("Please select an image file");
      return;
    }

    try {
      setIsUploadingTemplateImage(true);

      const imageFormData = new FormData();
      imageFormData.append("file", newTemplateImageFile);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: imageFormData,
      });

      const uploadResult = await uploadResponse.json();
      const uploadedImageUrl = uploadResult?.data?.[0];

      if (!uploadResponse.ok || !uploadedImageUrl) {
        throw new Error("Image upload failed");
      }

      await createGiftCardTemplate({
        shopId: shopId!,
        payload: {
          name: newTemplateName.trim(),
          imageUrl: uploadedImageUrl,
          isActive: true,
          isDefault: false,
        },
        accessToken,
      });

      setNewTemplateName("");
      setNewTemplateImageFile(null);
      setTemplateImageInputKey((prev) => prev + 1);
      toast.success("Gift card template created successfully");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        error?.message ??
        "Failed to create template";
      toast.error(message);
    } finally {
      setIsUploadingTemplateImage(false);
    }
  };

  const handleDeleteTemplate = async (template: CardDesign) => {
    if (!accessToken) {
      toast.error("Session expired. Please sign in again.");
      return;
    }

    try {
      await deleteGiftCardTemplate({ id: template.id, accessToken });
      toast.success("Gift card template deleted successfully");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        error?.message ??
        "Failed to delete template";
      toast.error(message);
    }
  };

  const handleSaveTemplates = async () => {
    if (!accessToken) {
      toast.error("Session expired. Please sign in again.");
      return;
    }

    if (!designs.some((design) => design.enabled)) {
      toast.error("At least one gift card template must be active");
      return;
    }

    if (!designs.some((design) => design.enabled && design.isDefault)) {
      toast.error("Please set one active template as default");
      return;
    }

    try {
      await Promise.all(
        designs.map((design) =>
          updateGiftCardTemplate({
            id: design.id,
            payload: {
              isActive: design.enabled,
              isDefault: design.isDefault,
            },
            accessToken,
          }),
        ),
      );

      toast.success("Gift card templates saved successfully");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        error?.message ??
        "Failed to save templates";
      toast.error(message);
    }
  };

  const handleSaveSettings = async () => {
    if (!accessToken) {
      toast.error("Session expired. Please sign in again.");
      return;
    }

    const parsedMin = minAmount.trim() ? Number(minAmount) : null;
    const parsedMax = maxAmount.trim() ? Number(maxAmount) : null;

    if (allowCustom) {
      if (parsedMin === null || Number.isNaN(parsedMin) || parsedMin < 0) {
        toast.error("Please enter a valid minimum custom amount");
        return;
      }

      if (parsedMax === null || Number.isNaN(parsedMax) || parsedMax < 0) {
        toast.error("Please enter a valid maximum custom amount");
        return;
      }

      if (parsedMin > parsedMax) {
        toast.error("Minimum custom amount cannot exceed maximum amount");
        return;
      }

      if (showPresets) {
        const hasPresetOutsideRange = presetValues.some(
          (amount) => amount < parsedMin || amount > parsedMax,
        );

        if (hasPresetOutsideRange) {
          toast.error(
            "Preset amounts must be within the custom min and max range",
          );
          return;
        }
      }
    }

    if (!emailDelivery && !textDelivery) {
      toast.error("At least one delivery method must be enabled");
      return;
    }

    const defaultDelivery =
      defaultMethod === "Email"
        ? emailDelivery
          ? "EMAIL"
          : "SMS"
        : textDelivery
          ? "SMS"
          : "EMAIL";

    try {
      await updateGiftCardSettings({
        shopId: shopId!,
        payload: {
          allowCustomAmount: allowCustom,
          minCustomAmount: allowCustom ? parsedMin : null,
          maxCustomAmount: allowCustom ? parsedMax : null,
          presetAmounts: showPresets ? presetValues : [],
          allowEmailDelivery: emailDelivery,
          allowSmsDelivery: textDelivery,
          defaultDelivery,
          allowScheduledSend: scheduledSend,
          termsAndConditions: termsUrl.trim() || null,
          privacyPolicy: privacyUrl.trim() || null,
        },
        accessToken,
      });

      toast.success("Gift card settings saved successfully");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? "Failed to save gift card settings";
      toast.error(message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {isHydratingSettings && <GiftCardsTabSkeleton />}

      {!isHydratingSettings && (
        <>
          {/* ── Gift Card Designs ── */}
          <Section
            icon={ImageIcon}
            title="Gift Card Designs"
            subtitle="Manage gift card templates visible to customers"
          >
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,1.5fr,auto]">
                <SettingInput
                  label="Template Name"
                  value={newTemplateName}
                  onChange={setNewTemplateName}
                  required
                  placeholder="Enter Template Name"
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">
                    Template Image<span className="ml-1 text-red-500">*</span>
                  </label>
                  <input
                    key={templateImageInputKey}
                    type="file"
                    required
                    accept="image/*"
                    onChange={(e) =>
                      setNewTemplateImageFile(e.target.files?.[0] ?? null)
                    }
                    className="min-h-10 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 outline-none file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-[#5560ee]"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleCreateTemplate}
                    disabled={
                      isCreatingTemplate ||
                      isUploadingTemplateImage ||
                      !newTemplateName.trim() ||
                      !newTemplateImageFile
                    }
                    className="flex h-10 w-fit items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-[#5560ee] disabled:opacity-60"
                  >
                    {isCreatingTemplate || isUploadingTemplateImage ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Plus size={15} />
                    )}
                    {isUploadingTemplateImage ? "Uploading..." : "Add Template"}
                  </button>
                </div>
              </div>

              {isGiftCardTemplatesLoading && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  Loading templates...
                </div>
              )}

              {designs.map((design) => (
                <div
                  key={design.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                      {design.imageUrl ? (
                        <img
                          src={design.imageUrl}
                          alt={design.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div
                          className={`h-full w-full bg-gradient-to-br ${design.gradient}`}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">
                        {design.name}
                      </span>
                      {design.isDefault && (
                        <span className="rounded-full border border-gray-300 px-2 py-0.5 text-xs text-gray-500">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!design.isDefault && design.enabled && (
                      <button
                        onClick={() => setDefaultTemplateInState(design.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-primary px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white disabled:opacity-60"
                      >
                        <Check size={14} />
                        Set Default
                      </button>
                    )}
                    <Tooltip
                      title={
                        design.enabled
                          ? "Enabled templates are available to customers when buying gift cards."
                          : "Enable this template to make it available to customers."
                      }
                      placement="top"
                    >
                      <div>
                        <Switch
                          checked={design.enabled}
                          setChecked={(v) => toggleDesign(design.id, v)}
                        />
                      </div>
                    </Tooltip>
                    <Popconfirm
                      title="Delete template"
                      description={`Delete template "${design.name}"? This action cannot be undone.`}
                      okText="Delete"
                      cancelText="Cancel"
                      okButtonProps={{
                        danger: true,
                        loading: isDeletingTemplate,
                      }}
                      onConfirm={() => handleDeleteTemplate(design)}
                    >
                      <button
                        type="button"
                        disabled={isDeletingTemplate}
                        className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-60"
                      >
                        <Trash2 size={18} />
                      </button>
                    </Popconfirm>
                  </div>
                </div>
              ))}

              {designs.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleSaveTemplates}
                    disabled={isUpdatingTemplate || !accessToken}
                    className="bg-primary hover:bg-[#5560ee]"
                  >
                    {isUpdatingTemplate ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </div>
          </Section>

          {/* ── Amount Presets ── */}
          <Section
            icon={DollarSign}
            title="Amount Presets"
            subtitle="Configure preset amounts and custom range"
          >
            <div className="flex flex-col gap-4">
              <ToggleRow
                label="Show Presets"
                checked={showPresets}
                setChecked={setShowPresets}
                tooltip="Show quick-pick gift card amounts for faster checkout."
              />

              {showPresets && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <SettingInput
                    label="Preset 1 ($)"
                    value={preset1}
                    onChange={setPreset1}
                    type="number"
                    min="0"
                  />
                  <SettingInput
                    label="Preset 2 ($)"
                    value={preset2}
                    onChange={setPreset2}
                    type="number"
                    min="0"
                  />
                  <SettingInput
                    label="Preset 3 ($)"
                    value={preset3}
                    onChange={setPreset3}
                    type="number"
                    min="0"
                  />
                </div>
              )}

              <ToggleRow
                label="Allow Custom Amount"
                checked={allowCustom}
                setChecked={setAllowCustom}
                tooltip="Allow customers to enter their own amount within the min/max range."
              />

              {allowCustom && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <SettingInput
                    label="Min ($)"
                    value={minAmount}
                    onChange={setMinAmount}
                    type="number"
                    min="0"
                  />
                  <SettingInput
                    label="Max ($)"
                    value={maxAmount}
                    onChange={setMaxAmount}
                    type="number"
                    min="0"
                  />
                </div>
              )}
            </div>
          </Section>

          {/* ── Delivery Options ── */}
          <Section
            icon={Send}
            title="Delivery Options"
            subtitle="Configure how gift cards can be delivered"
          >
            <div className="flex flex-col gap-4">
              <ToggleRow
                label="Enable Text Delivery"
                checked={textDelivery}
                setChecked={setTextDelivery}
                tooltip="Allow gift cards to be delivered to recipients by SMS/text."
              />
              <ToggleRow
                label="Enable Email Delivery"
                checked={emailDelivery}
                setChecked={setEmailDelivery}
                tooltip="Allow gift cards to be delivered to recipients by email."
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Default Method
                </label>
                <Selector
                  items={[...DELIVERY_METHODS]}
                  selectedItem={defaultMethod}
                  onSelect={handleDeliveryMethod}
                  label={(item) => item ?? "Select method"}
                  displayList={(item) => <span>{item}</span>}
                  newButton={<></>}
                  showSearch={false}
                  className="max-w-full"
                />
              </div>

              <ToggleRow
                label="Allow Scheduled Send"
                checked={scheduledSend}
                setChecked={setScheduledSend}
                tooltip="Let customers choose a future date/time to send the gift card."
              />
            </div>
          </Section>

          {/* ── Discount Codes ── */}
          <Section
            icon={Tag}
            title="Discount Codes"
            subtitle="Create and manage gift card promo codes"
          >
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={openCreatePromoDialog}
                className="flex w-fit items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-[#5560ee] transition-colors"
              >
                <Plus size={15} />
                Add Code
              </button>

              <div className="flex flex-col gap-2">
                {isPromoCodesLoading && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    Loading promo codes...
                  </div>
                )}

                {!isPromoCodesLoading && promoCodes.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                    No discount codes yet. Click <strong>Add Code</strong> to
                    create one.
                  </div>
                )}

                {promoCodes.map((promo) => (
                  <div
                    key={promo.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800 text-sm">
                          {promo.code}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {formatPromoValue(promo)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">
                        Expires {formatPromoExpireDate(promo.expireDate)} &bull;{" "}
                        {promo.timesUsed}/{promo.usageLimit ?? "∞"} used
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => openEditPromoDialog(promo)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <PencilLineIcon size={16} color={"#6571FF"} />
                      </button>
                      <Popconfirm
                        title="Delete promo code"
                        description={`Delete promo code "${promo.code}"? This action cannot be undone.`}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{
                          danger: true,
                          loading: isDeletingPromo,
                        }}
                        onConfirm={() => handleDeletePromoCode(promo.id)}
                      >
                        <button
                          type="button"
                          disabled={isDeletingPromo}
                          className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-60"
                        >
                          <Trash2 size={16} />
                        </button>
                      </Popconfirm>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Dialog open={isPromoDialogOpen} onOpenChange={setIsPromoDialogOpen}>
            <DialogContent className="max-w-lg overflow-hidden border border-gray-200 bg-white p-0 shadow-xl">
              <div className="border-b border-gray-100 bg-gradient-to-r from-[#f7f8ff] to-[#f3f4f8] px-6 py-4">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-gray-900">
                    {editingPromo ? "Edit Discount Code" : "New Discount Code"}
                  </DialogTitle>
                </DialogHeader>
                <p className="mt-1 text-sm text-gray-500">
                  Configure promo details for gift card checkout discounts.
                </p>
              </div>

              <div className="space-y-4 bg-white px-6 py-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">
                    Code
                  </label>
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) =>
                      setPromoCode(e.target.value.replace(/\s/g, ""))
                    }
                    onKeyDown={(e) => {
                      if (e.key === " ") {
                        e.preventDefault();
                      }
                    }}
                    className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <p className="-mt-2 text-xs text-gray-400">
                  Spaces are not allowed in discount codes.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">
                      Type
                    </label>
                    <select
                      value={promoType}
                      onChange={(e) =>
                        setPromoType(e.target.value as DiscountCodeType)
                      }
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="Percentage">Percentage (%)</option>
                      <option value="Fixed">Fixed ($)</option>
                    </select>
                  </div>

                  <SettingInput
                    label="Value"
                    value={promoValue}
                    onChange={setPromoValue}
                    type="number"
                    min="0"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <SettingInput
                    label="Expiry Date"
                    value={promoExpireDate}
                    onChange={setPromoExpireDate}
                    type="date"
                  />

                  <SettingInput
                    label="Usage Limit"
                    value={promoUsageLimit}
                    onChange={setPromoUsageLimit}
                    type="number"
                    min="0"
                  />
                </div>
              </div>

              <DialogFooter className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                <button
                  type="button"
                  onClick={handleSubmitPromoCode}
                  disabled={isCreatingPromo || isUpdatingPromo}
                  className="w-full rounded-md bg-primary hover:bg-[#5560ee] px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                >
                  {isCreatingPromo || isUpdatingPromo
                    ? "Saving..."
                    : editingPromo
                      ? "Update Code"
                      : "Create Code"}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ── Policies & Links ── */}
          <Section
            icon={FileText}
            title="Policies & Links"
            subtitle="URLs shown at checkout"
          >
            <div className="flex flex-col gap-4">
              <SettingInput
                label="Terms URL"
                value={termsUrl}
                onChange={setTermsUrl}
              />
              <SettingInput
                label="Privacy Policy URL"
                value={privacyUrl}
                onChange={setPrivacyUrl}
              />
            </div>
          </Section>

          {/* ── Expiration Policy ── */}
          <Section icon={ShieldCheck} title="Expiration Policy" subtitle="">
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
              <ShieldCheck size={16} className="shrink-0" />
              Gift cards never expire (non-editable policy)
            </div>
          </Section>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleSaveSettings}
              disabled={isGiftCardSettingsLoading || isSaving || !accessToken}
              className="bg-primary hover:bg-[#5560ee]"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
