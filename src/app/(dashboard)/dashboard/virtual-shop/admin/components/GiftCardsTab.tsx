"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Switch } from "@/components/Switch";
import Selector from "@/components/Selector";
import { Button } from "@/components/ui/button";
import {
  useCreateGiftCardTemplate,
  useGetGiftCardTemplates,
} from "@/hooks/virtual-shop/gift-card-templates/useGiftCardTemplates";
import {
  useGetGiftCardSettings,
  useUpdateGiftCardSettings,
} from "@/hooks/virtual-shop/gift-card-settings/useGiftCardSettings";
import {
  Image as ImageIcon,
  DollarSign,
  Send,
  Tag,
  FileText,
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";

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
  { id: 1, name: "Classic Blue", gradient: "from-teal-400 to-blue-500", enabled: true, isDefault: true },
  { id: 2, name: "Sunset Orange", gradient: "from-purple-500 to-pink-500", enabled: true, isDefault: false },
  { id: 3, name: "Dark Carbon", gradient: "from-sky-400 to-purple-600", enabled: true, isDefault: false },
  { id: 4, name: "Holiday Special", gradient: "from-teal-400 to-blue-900", enabled: true, isDefault: false },
];

// ── Discount Codes ────────────────────────────────────────────────────────────

type DiscountCode = {
  id: number;
  code: string;
  value: string;
  expires: string;
  used: number;
  limit: number;
};

const INITIAL_CODES: DiscountCode[] = [
  { id: 1, code: "GIFT10", value: "10%", expires: "2026-12-31", used: 12, limit: 100 },
  { id: 2, code: "SAVE5", value: "$5", expires: "2026-06-30", used: 3, limit: 50 },
];

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
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  min?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <input
        type={type}
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#6571FF] focus:ring-1 focus:ring-[#6571FF]"
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
      <p className="mt-1 text-sm text-[#6571FF]">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function ToggleRow({ label, checked, setChecked }: { label: string; checked: boolean; setChecked: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm font-semibold text-gray-800">{label}</span>
      <Switch checked={checked} setChecked={setChecked} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GiftCardsTab() {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const {
    data: giftCardSettings,
    isLoading: isGiftCardSettingsLoading,
    isFetched: hasFetchedGiftCardSettings,
  } = useGetGiftCardSettings(accessToken);
  const { mutateAsync: updateGiftCardSettings, isPending: isSaving } =
    useUpdateGiftCardSettings();
  const {
    data: giftCardTemplates,
    isLoading: isGiftCardTemplatesLoading,
  } = useGetGiftCardTemplates(accessToken);
  const { mutateAsync: createGiftCardTemplate, isPending: isCreatingTemplate } =
    useCreateGiftCardTemplate();

  // Designs
  const [designs, setDesigns] = useState<CardDesign[]>(INITIAL_DESIGNS);

  const toggleDesign = (id: number, enabled: boolean) =>
    setDesigns((prev) => prev.map((d) => (d.id === id ? { ...d, enabled } : d)));

  const setDefault = (id: number) =>
    setDesigns((prev) => prev.map((d) => ({ ...d, isDefault: d.id === id })));

  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateImageFile, setNewTemplateImageFile] = useState<File | null>(null);
  const [isUploadingTemplateImage, setIsUploadingTemplateImage] = useState(false);
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
  const [codes, setCodes] = useState<DiscountCode[]>(INITIAL_CODES);
  const deleteCode = (id: number) => setCodes((prev) => prev.filter((c) => c.id !== id));

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
      giftCardSettings.minCustomAmount !== null
        && giftCardSettings.minCustomAmount !== undefined
        ? String(giftCardSettings.minCustomAmount)
        : "",
    );
    setMaxAmount(
      giftCardSettings.maxCustomAmount !== null
        && giftCardSettings.maxCustomAmount !== undefined
        ? String(giftCardSettings.maxCustomAmount)
        : "",
    );

    setTextDelivery(Boolean(giftCardSettings.allowSmsDelivery));
    setEmailDelivery(Boolean(giftCardSettings.allowEmailDelivery));
    setDefaultMethod(API_TO_UI_DELIVERY[giftCardSettings.defaultDelivery] ?? "Email");
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

    if (newTemplateName.trim().length < 2) {
      toast.error("Template name must be at least 2 characters");
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
        error?.response?.data?.message ?? error?.message ?? "Failed to create template";
      toast.error(message);
    } finally {
      setIsUploadingTemplateImage(false);
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
    }

    if (!emailDelivery && !textDelivery) {
      toast.error("At least one delivery method must be enabled");
      return;
    }

    const defaultDelivery =
      defaultMethod === "Email"
        ? (emailDelivery ? "EMAIL" : "SMS")
        : (textDelivery ? "SMS" : "EMAIL");

    try {
      await updateGiftCardSettings({
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
      {isHydratingSettings && (
        <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center gap-3 text-sm text-gray-600">
            <Loader2 size={28} className="animate-spin text-[#6571FF]" />
            <span>Loading gift card settings...</span>
          </div>
        </div>
      )}

      {!isHydratingSettings && (
        <>
          {/* ── Gift Card Designs ── */}
          <Section icon={ImageIcon} title="Gift Card Designs" subtitle="Manage gift card templates visible to customers">
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,1.5fr,auto]">
                <SettingInput
                  label="Template Name"
                  value={newTemplateName}
                  onChange={setNewTemplateName}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Template Image</label>
                  <input
                    key={templateImageInputKey}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewTemplateImageFile(e.target.files?.[0] ?? null)}
                    className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none file:mr-3 file:rounded-md file:border-0 file:bg-[#6571FF] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-[#5560ee]"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleCreateTemplate}
                    disabled={isCreatingTemplate || isUploadingTemplateImage || !accessToken}
                    className="flex h-[42px] w-fit items-center gap-1.5 rounded-md bg-[#6571FF] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#5560ee] disabled:opacity-60"
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
                <div key={design.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                      {design.imageUrl ? (
                        <img
                          src={design.imageUrl}
                          alt={design.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className={`h-full w-full bg-gradient-to-br ${design.gradient}`} />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{design.name}</span>
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
                        onClick={() => setDefault(design.id)}
                        className="text-xs text-gray-400 hover:text-[#6571FF] transition-colors whitespace-nowrap"
                      >
                        Set Default
                      </button>
                    )}
                    <Switch checked={design.enabled} setChecked={(v) => toggleDesign(design.id, v)} />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Amount Presets ── */}
          <Section icon={DollarSign} title="Amount Presets" subtitle="Configure preset amounts and custom range">
            <div className="flex flex-col gap-4">
              <ToggleRow label="Show Presets" checked={showPresets} setChecked={setShowPresets} />

              {showPresets && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <SettingInput label="Preset 1 ($)" value={preset1} onChange={setPreset1} type="number" min="0" />
                  <SettingInput label="Preset 2 ($)" value={preset2} onChange={setPreset2} type="number" min="0" />
                  <SettingInput label="Preset 3 ($)" value={preset3} onChange={setPreset3} type="number" min="0" />
                </div>
              )}

              <ToggleRow label="Allow Custom Amount" checked={allowCustom} setChecked={setAllowCustom} />

              {allowCustom && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <SettingInput label="Min ($)" value={minAmount} onChange={setMinAmount} type="number" min="0" />
                  <SettingInput label="Max ($)" value={maxAmount} onChange={setMaxAmount} type="number" min="0" />
                </div>
              )}
            </div>
          </Section>

          {/* ── Delivery Options ── */}
          <Section icon={Send} title="Delivery Options" subtitle="Configure how gift cards can be delivered">
            <div className="flex flex-col gap-4">
              <ToggleRow label="Enable Text Delivery" checked={textDelivery} setChecked={setTextDelivery} />
              <ToggleRow label="Enable Email Delivery" checked={emailDelivery} setChecked={setEmailDelivery} />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">Default Method</label>
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

              <ToggleRow label="Allow Scheduled Send" checked={scheduledSend} setChecked={setScheduledSend} />
            </div>
          </Section>

          {/* ── Discount Codes ── */}
          <Section icon={Tag} title="Discount Codes" subtitle="Create and manage gift card promo codes">
            <div className="flex flex-col gap-3">
              <button className="flex w-fit items-center gap-1.5 rounded-md bg-[#6571FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5560ee] transition-colors">
                <Plus size={15} />
                Add Code
              </button>

              <div className="flex flex-col gap-2">
                {codes.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800 text-sm">{c.code}</span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{c.value}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">
                        Expires {c.expires} &bull; {c.used}/{c.limit} used
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => deleteCode(c.id)} className="text-red-400 hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ── Policies & Links ── */}
          <Section icon={FileText} title="Policies & Links" subtitle="URLs shown at checkout">
            <div className="flex flex-col gap-4">
              <SettingInput label="Terms URL" value={termsUrl} onChange={setTermsUrl} />
              <SettingInput label="Privacy Policy URL" value={privacyUrl} onChange={setPrivacyUrl} />
            </div>
          </Section>

          {/* ── Expiration Policy ── */}
          <Section icon={ShieldCheck} title="Expiration Policy" subtitle="">
            <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-600">
              <ShieldCheck size={16} className="shrink-0" />
              Gift cards never expire (non-editable policy)
            </div>
          </Section>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleSaveSettings}
              disabled={isGiftCardSettingsLoading || isSaving || !accessToken}
              className="bg-[#6571FF] hover:bg-[#5560ee]"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

