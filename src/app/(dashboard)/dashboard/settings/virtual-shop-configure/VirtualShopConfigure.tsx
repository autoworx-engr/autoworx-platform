"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { debounce } from "@/utils/debounce";
import { FileUpload } from "./component/FileUpload";
import { ColorPicker } from "./component/ColorPicker";
import { Select } from "./component/Select";
import { SlimInput } from "@/components/SlimInput";
import { SlimTextarea } from "@/components/SlimTextarea";
import {
  useConfigureShop,
  useGetVirtualShopConfigure,
  useUpdateShop,
} from "@/hooks/virtual-shop/configure/useVirtualShopConfigure";
import CarLoading from "@/components/common/CarLoading";

type ThemeConfig = { primaryColor: string; fontFamily?: string };
type ShopFormData = {
  storeName: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  themeConfig?: ThemeConfig;
  isActive: boolean;
  companyId: number;
};

const domain = new URL(process.env.NEXT_PUBLIC_APP_URL!).hostname;
const fonts = ["Inter", "Roboto", "Playfair Display"];

export default function VirtualShopConfigure({
  companyId,
}: {
  companyId: number;
}) {
  const { data, isPending: isGetPending } =
    useGetVirtualShopConfigure(companyId);
  const { mutate, isPending } = useConfigureShop(companyId);
  const { mutate: updateConfigure, isPending: IsPendingUpdateConfigure } =
    useUpdateShop(companyId);

  const [form, setForm] = useState<ShopFormData>({
    storeName: data?.storeName ?? "",
    slug: data?.slug ?? "",
    description: data?.description ?? "",
    logoUrl: data?.logoUrl ?? "",
    bannerUrl: data?.bannerUrl ?? "",
    themeConfig: data?.themeConfig || {
      primaryColor: "#4f6ef7",
      fontFamily: "Inter",
    },
    isActive: data?.isActive ?? true,
    companyId,
  });

  const [slug, setSlug] = useState(form.slug);
  const [errors, setErrors] = useState<{ storeName?: string }>({});
  const [touched, setTouched] = useState<{ storeName?: boolean }>({});

  const debouncedSetSlug = useMemo(
    () => debounce((val: string) => setSlug(val), 500),
    [setSlug],
  );

  useEffect(() => {
    if (data?.id) {
      setForm({
        storeName: data?.storeName ?? "",
        slug: data?.slug ?? "",
        description: data?.description ?? "",
        logoUrl: data?.logoUrl ?? "",
        bannerUrl: data?.bannerUrl ?? "",
        themeConfig: data?.themeConfig || {
          primaryColor: "#4f6ef7",
          fontFamily: "Inter",
        },
        isActive: data?.isActive ?? true,
        companyId,
      });
    }
  }, [data, companyId]);

  useEffect(() => {
    const newSlug = form.storeName
      ?.toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    debouncedSetSlug(newSlug);
  }, [form.storeName]);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!form.storeName.trim()) newErrors.storeName = "Store name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange =
    (key: "logoUrl" | "bannerUrl") =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file, key);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) return console.error(`Failed to upload ${key}`);

      const data = await uploadRes.json();
      setForm((prev) => ({ ...prev, [key]: data[0] }));
    };

  const handleSubmit = () => {
    setTouched({ storeName: true });
    if (!validate()) return;
    if (data?.storeName) {
      updateConfigure({ ...form, slug });
    } else {
      mutate({ ...form, slug });
    }
  };

  const isFormValid = form.storeName && slug;

  if (isGetPending) {
    return <CarLoading />;
  }

  return (
    <div className="w-full mx-auto p-6 space-y-4 h-screen overflow-y-auto">
      <div className="mb-2">
        <h1 className="text-xl font-medium">Virtual shop setup</h1>
        <p className="text-sm text-gray-500">
          Configure your store's identity and appearance
        </p>
      </div>

      {/* ── Core Identity ── */}
      <div className="p-4 border rounded-xl space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-gray-400">
          Core identity
        </h2>

        <div className="space-y-1">
          <SlimInput
            value={form.storeName}
            name="storeName"
            placeholder="e.g. Sunrise Boutique"
            required
            className={
              touched.storeName && errors.storeName ? "border-red-400" : ""
            }
            onChange={(e) => {
              setForm({ ...form, storeName: e.target.value });
              if (touched.storeName) validate();
            }}
            onBlur={() => {
              setTouched((p) => ({ ...p, storeName: true }));
              validate();
            }}
          />
          {touched.storeName && errors.storeName && (
            <p className="text-xs text-red-500">{errors.storeName}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Subdomain URL *</label>
          <div className="flex items-center border rounded-lg overflow-hidden">
            <span className="px-3 py-2 text-sm text-gray-400 bg-gray-50">
              https://
            </span>
            <input
              type="text"
              className="flex-1 px-2 py-2 text-sm outline-none"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                debouncedSetSlug(e.target.value);
              }}
            />
            <span className="px-3 py-2 text-sm text-gray-400 bg-gray-50">
              .{domain}
            </span>
          </div>
        </div>

        <SlimTextarea
          label="Description"
          value={form.description}
          name="description"
          placeholder="Tell customers what makes your store special..."
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      {/* ── Branding ── */}
      <div className="p-4 border rounded-xl space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-gray-400">
          Branding & appearance
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <FileUpload
            label="Logo"
            previewUrl={form.logoUrl}
            onChange={handleFileChange("logoUrl")}
          />
          <FileUpload
            label="Banner"
            previewUrl={form.bannerUrl}
            onChange={handleFileChange("bannerUrl")}
            height="h-20"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ColorPicker
            label="Brand color"
            value={form.themeConfig?.primaryColor!}
            onChange={(val) =>
              setForm((prev) => ({
                ...prev,
                themeConfig: { ...prev.themeConfig!, primaryColor: val },
              }))
            }
          />
          <Select
            label="Font family"
            value={form.themeConfig?.fontFamily}
            options={fonts}
            onChange={(val) =>
              setForm((prev) => ({
                ...prev,
                themeConfig: { ...prev.themeConfig!, fontFamily: val },
              }))
            }
          />
        </div>
      </div>

      <div className="p-4 border rounded-xl">
        <h2 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-3">
          Visibility
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Shop active</p>
            <p className="text-xs text-gray-400">
              Customers can browse and purchase
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.isActive}
            onClick={() =>
              setForm((prev) => ({ ...prev, isActive: !prev.isActive }))
            }
            className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${
              form.isActive ? "bg-blue-500" : "bg-gray-200"
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                form.isActive ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      <button
        className="w-full py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        disabled={isPending || !isFormValid || IsPendingUpdateConfigure}
        onClick={handleSubmit}
      >
        {isPending ? "Saving..." : "Configure shop"}
      </button>
    </div>
  );
}
