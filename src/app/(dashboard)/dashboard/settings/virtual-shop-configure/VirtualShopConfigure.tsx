"use client";

import React, { useState, useEffect } from "react";
import { debounce } from "@/utils/debounce";
import { FileUpload } from "./component/FileUpload";
import { ColorPicker } from "./component/ColorPicker";
import { Select } from "./component/Select";
import { SlimInput } from "@/components/SlimInput";
import { SlimTextarea } from "@/components/SlimTextarea";
import {
  useConfigureShop,
  useGetVirtualShopConfigure,
} from "@/hooks/virtual-shop/configure/useVirtualShopConfigure";

type ThemeConfig = { primaryColor: string; fontFamily?: string };
type ShopFormData = {
  storeName: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  themeConfig?: ThemeConfig;
  isActive?: boolean;
  companyId: number;
};

const domain = new URL(process.env.NEXT_PUBLIC_APP_URL!).hostname;

const fonts = ["Inter", "Roboto", "Playfair Display"];

export default function VirtualShopConfigure({
  companyId,
}: {
  companyId: number;
}) {
  const { data, isPending: getDataPending } =
    useGetVirtualShopConfigure(companyId);
  const [form, setForm] = useState<ShopFormData>({
    storeName: data?.storeName,
    slug: data?.slug,
    description: data?.description,
    logoUrl: data?.logoUrl,
    bannerUrl: data?.bannerUrl,
    themeConfig: data?.themeConfig || {
      primaryColor: "#3b82f6",
      fontFamily: "Inter",
    },
    isActive: true,
    companyId: companyId,
  });

  const [slug, setSlug] = useState(form.slug);

  const { mutate, isPending } = useConfigureShop(companyId);
  // Debounced slug check
  const debouncedCheck = debounce((val: string) => {
    setSlug(val);
  }, 500);

  useEffect(() => {
    // Auto-generate slug
    const newSlug = form.storeName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    debouncedCheck(newSlug);
  }, [form.storeName]);

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

      setForm({ ...form, [key]: data?.data[0] });
    };

  const handleSubmit = async () => {
    try {
      form.slug === slug;
      const response = mutate(form);
      console.log(response);
    } catch (error) {}
  };

  return (
    <div className="w-full mx-auto p-6 space-y-6 h-screen overflow-y-auto">
      <h1 className="text-2xl font-bold">Configure Your Virtual Shop</h1>

      <div className="p-4 border rounded-md space-y-4">
        <h2 className="font-semibold text-lg">Core Identity</h2>
        <SlimInput
          value={form.storeName}
          name="storeName"
          placeholder="Type your store name!"
          required
          onChange={(e) => setForm({ ...form, storeName: e.target.value })}
        />

        <div>
          <label className="block font-medium">Subdomain URL *</label>
          <div className="flex items-center mt-1">
            <span className="text-gray-500">https://</span>
            <input
              type="text"
              className="flex-1 border rounded p-2 mx-2"
              value={slug}
              onChange={(e) => debouncedCheck(e.target.value)}
            />
            <span className="text-gray-500">.{domain}</span>
          </div>
        </div>

        <SlimTextarea
          label="Description"
          value={form.description}
          name="description"
          placeholder="Type your store description!"
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="p-4 border rounded-md space-y-4">
        <h2 className="font-semibold text-lg">Branding & Appearance</h2>

        <FileUpload
          label="Logo Upload"
          previewUrl={form.logoUrl}
          onChange={handleFileChange("logoUrl")}
        />
        <FileUpload
          label="Banner Upload"
          previewUrl={form.bannerUrl}
          onChange={handleFileChange("bannerUrl")}
          height="h-32"
        />
        <ColorPicker
          label="Primary Brand Color"
          value={form.themeConfig?.primaryColor!}
          onChange={(val) =>
            setForm((prev) => ({
              ...prev,
              themeConfig: { ...prev.themeConfig, primaryColor: val },
            }))
          }
        />
        <Select
          label="Font Family"
          value={form.themeConfig?.fontFamily}
          options={fonts}
          onChange={(val) =>
            setForm((prev) => ({
              ...prev,
              themeConfig: {
                ...prev.themeConfig,
                primaryColor: val,
                fontFamily: prev.themeConfig?.fontFamily || "Inter",
              },
            }))
          }
        />
      </div>

      <button
        className={`px-6 py-2 flex items-center justify-center rounded text-white bg-blue-600`}
        disabled={isPending}
        onClick={handleSubmit}
      >
        {isPending ? "Saving..." : "Configure Shop"}
      </button>
    </div>
  );
}
