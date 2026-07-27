"use client";

import { SlimInput } from "@/components/SlimInput";
import { SlimTextarea } from "@/components/SlimTextarea";
import CarLoading from "@/components/common/CarLoading";
import { Switch } from "@/components/ui/switch";
import {
  useConfigureShop,
  useGetVirtualShopConfigureById,
  useUpdateShop,
} from "@/hooks/virtual-shop/configure/useVirtualShopConfigure";
import { errorToast } from "@/lib/toast";
import { debounce } from "@/utils/debounce";
import { Loader2, Palette, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { ColorPicker } from "./ColorPicker";
import { FileUpload } from "./FileUpload";
import { ImageCropModal } from "./ImageCropModal";
import { Select } from "./Select";

type ThemeConfig = {
  primaryColor: string;
  fontFamily?: string;
};

type ShopFormData = {
  storeName: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  themeConfig: ThemeConfig;
  isActive: boolean;
  urgentBookingNotificationsEnabled: boolean;
  termsConditions?: string;
  privacyPolicy?: string;
};

const domain = new URL(process.env.NEXT_PUBLIC_APP_URL!).hostname;
const fonts = ["Inter", "Roboto", "Playfair Display"];

export default function ShopForm({
  shopId,
  companyId,
}: {
  shopId?: number;
  companyId: number;
}) {
  const router = useRouter();

  const { data, isPending: isFetching } =
    useGetVirtualShopConfigureById(shopId);

  const { mutateAsync: createShop, isPending: isCreating } =
    useConfigureShop(companyId);
  const { mutateAsync: updateShop, isPending: isUpdating } =
    useUpdateShop(shopId);

  const [form, setForm] = useState<ShopFormData>({
    storeName: "",
    slug: "",
    description: "",
    logoUrl: "",
    bannerUrl: "",
    themeConfig: {
      primaryColor: "#4f6ef7",
      fontFamily: "Inter",
    },
    isActive: true,
    urgentBookingNotificationsEnabled: true,
    termsConditions: "",
    privacyPolicy: "",
  });

  const [files, setFiles] = useState<{
    logo: File | null;
    banner: File | null;
  }>({ logo: null, banner: null });

  const [previews, setPreviews] = useState<{
    logo: string;
    banner: string;
  }>({ logo: "", banner: "" });

  const [errors, setErrors] = useState<{
    storeName?: string;
    description?: string;
    termsConditions?: string;
    privacyPolicy?: string;
  }>({});

  const [touched, setTouched] = useState<{
    storeName?: boolean;
    description?: boolean;
    termsConditions?: boolean;
    privacyPolicy?: boolean;
  }>({});
  const [isUploading, setIsUploading] = useState(false);

  const [cropModal, setCropModal] = useState<{
    open: boolean;
    image: string;
    type: "logo" | "banner";
  }>({ open: false, image: "", type: "logo" });

  /** slug control */
  const debouncedSetSlug = useMemo(
    () =>
      debounce((val: string) => {
        setForm((prev) => ({ ...prev, slug: val }));
      }, 400),
    [],
  );

  useEffect(() => {
    if (data) {
      setForm({
        storeName: data.storeName ?? "",
        slug: data.slug ?? "",
        description: data.description ?? "",
        logoUrl: data.logoUrl ?? "",
        bannerUrl: data.bannerUrl ?? "",
        themeConfig: data.themeConfig || {
          primaryColor: "#4f6ef7",
          fontFamily: "Inter",
        },
        isActive: data.isActive ?? true,
        urgentBookingNotificationsEnabled:
          data.urgentBookingNotificationsEnabled ?? true,
        termsConditions: data.termsConditions ?? "",
        privacyPolicy: data.privacyPolicy ?? "",
      });
    }
  }, [data]);

  useEffect(() => {
    if (!shopId) {
      const slug = form.storeName
        ?.toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      debouncedSetSlug(slug);
    }
  }, [debouncedSetSlug, form.storeName, shopId]);

  /** validation */
  const validate = () => {
    const newErrors: typeof errors = {};

    if (!form.storeName.trim()) {
      newErrors.storeName = "Store name is required";
    }

    if (form.description && form.description.length > 150) {
      newErrors.description = "Max 150 characters allowed";
    }

    if (form.termsConditions && form.termsConditions.length > 1500) {
      newErrors.termsConditions = "Max 1500 characters allowed";
    }

    if (form.privacyPolicy && form.privacyPolicy.length > 1500) {
      newErrors.privacyPolicy = "Max 1500 characters allowed";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** file handler — validates then opens crop modal */
  const handleFileChange =
    (type: "logo" | "banner") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // reset so the same file can be re-selected after cancel
      e.target.value = "";
      if (!file) return;

      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) {
        errorToast("Please upload a JPG, PNG, or WebP image.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        errorToast("Image must be smaller than 5 MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setCropModal({ open: true, image: reader.result as string, type });
      };
      reader.readAsDataURL(file);
    };

  /** called when the crop modal produces a cropped file */
  const handleCropComplete = (file: File, previewUrl: string) => {
    const { type } = cropModal;
    setFiles((prev) => ({ ...prev, [type]: file }));
    setPreviews((prev) => ({ ...prev, [type]: previewUrl }));
    setCropModal((prev) => ({ ...prev, open: false }));
  };

  /** upload helper */
  const uploadFile = async (file: File, key: string) => {
    const formData = new FormData();
    formData.append("file", file, key);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data?.data?.[0] || null;
  };

  /** submit */
  const handleSubmit = async () => {
    setTouched({ storeName: true });

    if (!validate()) return;

    setIsUploading(true);

    try {
      let logoUrl = form.logoUrl;
      let bannerUrl = form.bannerUrl;

      if (files.logo) {
        const uploaded = await uploadFile(files.logo, "logo");

        if (uploaded) logoUrl = uploaded;
      }

      if (files.banner) {
        const uploaded = await uploadFile(files.banner, "banner");
        if (uploaded) bannerUrl = uploaded;
      }

      const payload = {
        ...form,
        logoUrl,
        bannerUrl,
        companyId,
      };

      if (shopId) {
        await updateShop({ id: shopId, ...payload });
      } else {
        await createShop(payload);
      }

      router.push("/dashboard/settings/virtual-shop-configure");
    } catch {
    } finally {
      setIsUploading(false);
    }
  };

  const isLoading = isCreating || isUpdating || isUploading;

  if (isFetching && shopId) return <CarLoading />;

  return (
    <>
      <ImageCropModal
        open={cropModal.open}
        image={cropModal.image}
        aspect={cropModal.type === "logo" ? 1 : 16 / 6}
        cropShape={cropModal.type === "logo" ? "round" : "rect"}
        outputWidth={cropModal.type === "logo" ? 400 : 1600}
        outputHeight={cropModal.type === "logo" ? 400 : 600}
        fileName={cropModal.type === "logo" ? "logo.jpg" : "banner.jpg"}
        onClose={() => setCropModal((prev) => ({ ...prev, open: false }))}
        onComplete={handleCropComplete}
      />
      <div className="mx-auto w-full space-y-4 px-0 py-4">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
          <div className="absolute -bottom-16 right-12 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />

          <div className="relative z-10 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-600">
                {shopId ? "Update Shop" : "Create Shop"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Configure your store details and branding
              </p>
            </div>
          </div>
        </div>

        {/* BASIC INFO */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <SlimInput
                name="storeName"
                value={form.storeName}
                placeholder="Store name"
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    storeName: e.target.value,
                  }))
                }
                required
                onBlur={() => {
                  setTouched({ storeName: true });
                  validate();
                }}
                className={
                  touched.storeName && errors.storeName
                    ? "border-red-400"
                    : "bg-slate-50/60"
                }
              />
            </div>

            {errors.storeName && (
              <p className="text-xs text-red-500">{errors.storeName}</p>
            )}

            <div>
              <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white">
                <span className="px-3 py-2 text-xs text-slate-400 sm:text-sm">
                  https://
                </span>
                <input
                  value={form.slug}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      slug: e.target.value,
                    }))
                  }
                  className="min-w-0 flex-1 px-2 py-2 text-sm outline-none"
                />
                <span className="truncate px-3 py-2 text-xs text-slate-400 sm:text-sm">
                  .{domain}
                </span>
              </div>
            </div>

            <div>
              <SlimTextarea
                value={form.description}
                name="description"
                placeholder="Description..."
                maxLength={150}
                onChange={(e) => {
                  const value = e.target.value;

                  setForm((p) => ({
                    ...p,
                    description: value,
                  }));

                  // real-time validation
                  setErrors((prev) => ({
                    ...prev,
                    description:
                      value.length > 150
                        ? "Max 150 characters allowed"
                        : undefined,
                  }));
                }}
                onBlur={() => {
                  setTouched((p) => ({ ...p, description: true }));
                  validate();
                }}
                className={
                  touched.description && errors.description
                    ? "border-red-400"
                    : "bg-slate-50/60"
                }
              />
            </div>
          </div>

          <div className="flex justify-between text-xs">
            {errors.description && touched.description ? (
              <p className="text-red-500">{errors.description}</p>
            ) : (
              <span />
            )}

            <span
              className={
                (form.description || "").length > 150
                  ? "text-red-500"
                  : "text-slate-400"
              }
            >
              {(form.description || "").length}/150
            </span>
          </div>
        </div>

        {/* FILES + THEME */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Store className="h-4 w-4 text-slate-500" />
              Brand assets
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FileUpload
                label="Logo"
                previewUrl={previews.logo || form.logoUrl}
                hint="Square image"
                onChange={handleFileChange("logo")}
                onRemove={() => {
                  setFiles((prev) => ({ ...prev, logo: null }));
                  setPreviews((prev) => ({ ...prev, logo: "" }));
                  setForm((prev) => ({ ...prev, logoUrl: "" }));
                }}
                height="h-32"
                width="w-32"
                circular={true}
              />

              <FileUpload
                label="Banner"
                previewUrl={previews.banner || form.bannerUrl}
                onChange={handleFileChange("banner")}
                onRemove={() => {
                  setFiles((p) => ({ ...p, banner: null }));
                  setPreviews((p) => ({ ...p, banner: "" }));
                  setForm((p) => ({ ...p, bannerUrl: "" }));
                }}
              />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Palette className="h-4 w-4 text-slate-500" />
              Theme
            </div>

            <div className="grid grid-cols-1 gap-4">
              <ColorPicker
                label="Primary color"
                value={form.themeConfig.primaryColor}
                onChange={(val) =>
                  setForm((p) => ({
                    ...p,
                    themeConfig: { ...p.themeConfig, primaryColor: val },
                  }))
                }
              />

              <Select
                label="Font"
                value={form.themeConfig.fontFamily}
                options={fonts}
                onChange={(val) =>
                  setForm((p) => ({
                    ...p,
                    themeConfig: { ...p.themeConfig, fontFamily: val },
                  }))
                }
              />
            </div>
          </div>
        </div>

        {/* TERMS & POLICY */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div>
            <SlimTextarea
              value={form.termsConditions}
              name="termsConditions"
              placeholder="Enter your Terms and Conditions..."
              maxLength={1500}
              onChange={(e) => {
                const value = e.target.value;
                setForm((p) => ({ ...p, termsConditions: value }));
                setErrors((prev) => ({
                  ...prev,
                  termsConditions:
                    value.length > 1500
                      ? "Max 1500 characters allowed"
                      : undefined,
                }));
              }}
              onBlur={() => {
                setTouched((p) => ({ ...p, termsConditions: true }));
                validate();
              }}
              className={
                touched.termsConditions && errors.termsConditions
                  ? "border-red-400"
                  : "bg-slate-50/60"
              }
            />
            <div className="mt-1 flex justify-between text-xs">
              {touched.termsConditions && errors.termsConditions ? (
                <p className="text-red-500">{errors.termsConditions}</p>
              ) : (
                <span />
              )}
              <span
                className={
                  (form.termsConditions || "").length > 1500
                    ? "text-red-500"
                    : "text-slate-400"
                }
              >
                {(form.termsConditions || "").length}/1500
              </span>
            </div>
          </div>

          <div>
            <SlimTextarea
              value={form.privacyPolicy}
              name="privacyPolicy"
              placeholder="Enter your Privacy Policy..."
              maxLength={1500}
              onChange={(e) => {
                const value = e.target.value;
                setForm((p) => ({ ...p, privacyPolicy: value }));
                setErrors((prev) => ({
                  ...prev,
                  privacyPolicy:
                    value.length > 1500
                      ? "Max 1500 characters allowed"
                      : undefined,
                }));
              }}
              onBlur={() => {
                setTouched((p) => ({ ...p, privacyPolicy: true }));
                validate();
              }}
              className={
                touched.privacyPolicy && errors.privacyPolicy
                  ? "border-red-400"
                  : "bg-slate-50/60"
              }
            />
            <div className="mt-1 flex justify-between text-xs">
              {touched.privacyPolicy && errors.privacyPolicy ? (
                <p className="text-red-500">{errors.privacyPolicy}</p>
              ) : (
                <span />
              )}
              <span
                className={
                  (form.privacyPolicy || "").length > 1500
                    ? "text-red-500"
                    : "text-slate-400"
                }
              >
                {(form.privacyPolicy || "").length}/1500
              </span>
            </div>
          </div>
        </div>

        {/* ACTIVE */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-medium text-slate-700">Active</p>
            <p className="text-xs text-slate-500">
              Toggle whether this shop is visible to customers.
            </p>
          </div>

          <Switch
            checked={form.isActive}
            className="data-[state=checked]:!bg-primary data-[state=unchecked]:bg-slate-200"
            disabled={isCreating || isUpdating || isFetching}
            onCheckedChange={(checked) =>
              setForm((p) => ({
                ...p,
                isActive: checked,
              }))
            }
          />
        </div>

        {/* URGENT BOOKING NOTIFICATIONS */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-medium text-slate-700">
              Urgent Booking Notifications
            </p>
            <p className="text-xs text-slate-500">
              Receive platform notifications when a customer submits an urgent
              service request.
            </p>
          </div>

          <Switch
            checked={form.urgentBookingNotificationsEnabled}
            className="data-[state=checked]:!bg-primary data-[state=unchecked]:bg-slate-200"
            disabled={isCreating || isUpdating || isFetching}
            onCheckedChange={(checked) =>
              setForm((p) => ({
                ...p,
                urgentBookingNotificationsEnabled: checked,
              }))
            }
          />
        </div>

        {/* SUBMIT */}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-white shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : shopId ? (
            "Update Shop"
          ) : (
            "Create Shop"
          )}
        </button>
      </div>
    </>
  );
}
