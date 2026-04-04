"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { debounce } from "@/utils/debounce";
import { FileUpload } from "./FileUpload";
import { ColorPicker } from "./ColorPicker";
import { Select } from "./Select";
import { SlimInput } from "@/components/SlimInput";
import { SlimTextarea } from "@/components/SlimTextarea";
import {
  useConfigureShop,
  useGetVirtualShops,
  useUpdateShop,
} from "@/hooks/virtual-shop/configure/useVirtualShopConfigure";
import CarLoading from "@/components/common/CarLoading";
import {
  ExternalLink,
  Palette,
  Eye,
  Loader2,
  Building2,
  Globe,
} from "lucide-react";

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

export default function VirtualShopConfigureList({
  companyId,
}: {
  companyId: number;
}) {
  const { data, isPending: isGetPending } = useGetVirtualShops(companyId);
  const { mutate, isPending } = useConfigureShop(companyId);
  const { mutate: updateConfigure, isPending: IsPendingUpdateConfigure } =
    useUpdateShop(companyId);

  const [isUploading, setIsUploading] = useState(false);
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
  const [files, setFiles] = useState<{
    logo: File | null;
    banner: File | null;
  }>({ logo: null, banner: null });
  const [previews, setPreviews] = useState<{ logo: string; banner: string }>({
    logo: "",
    banner: "",
  });

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
    (type: "logo" | "banner") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setFiles((prev) => ({ ...prev, [type]: file }));
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews((prev) => ({ ...prev, [type]: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
    };

  const uploadFile = async (file: File, key: string) => {
    const formData = new FormData();
    formData.append("file", file, key);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (res.ok) {
      const response = await res.json();
      return response.data?.[0] || null;
    }
    return null;
  };

  const handleSubmit = async () => {
    setTouched({ storeName: true });
    if (!validate()) return;
    setIsUploading(true);
    try {
      let logoUrl = form.logoUrl;
      let bannerUrl = form.bannerUrl;

      const logoFile = files.logo;
      const bannerFile = files.banner;

      if (logoFile) {
        const uploadedLogo = await uploadFile(logoFile, "logoUrl");
        if (uploadedLogo) logoUrl = uploadedLogo;
      }

      if (bannerFile) {
        const uploadedBanner = await uploadFile(bannerFile, "bannerUrl");
        if (uploadedBanner) bannerUrl = uploadedBanner;
      }

      const submissionData = {
        ...form,
        logoUrl,
        bannerUrl,
        slug,
      };

      if (data?.id) {
        updateConfigure(submissionData);
      } else {
        mutate(submissionData);
      }
    } catch (error) {
      console.error("Error during submission:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const isFormValid = form.storeName && slug;

  if (isGetPending) {
    return <CarLoading />;
  }
  console.log("data", data);
  return (
    <div className="w-full mx-auto p-6 space-y-4 h-screen overflow-y-auto">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Virtual shop setup</h1>
          <p className="text-sm text-gray-500">
            Configure your store's identity and appearance
          </p>
        </div>
        {data?.id && (
          <Link
            href={`${window.location.protocol}//${slug}.${domain}${window.location.port ? ":" + window.location.port : ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
          >
            <span>Preview Store</span>
            <ExternalLink className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* ── Core Identity ── */}
      <div className="p-4 border rounded-xl space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-400" />
          <h2 className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Core identity
          </h2>
        </div>

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
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-gray-400" />
            Subdomain URL <span className="text-red-500 text-normal">*</span>
          </label>
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

        <div className="space-y-1.5">
          <SlimTextarea
            value={form.description}
            name="description"
            placeholder="Tell customers what makes your store special..."
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </div>

      {/* ── Branding ── */}
      <div className="p-4 border rounded-xl space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-gray-400" />
          <h2 className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Branding & appearance
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-6">
          <div>
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
          </div>
          <div className="lg:col-span-2">
            <FileUpload
              label="Banner"
              previewUrl={previews.banner || form.bannerUrl}
              hint="Recommended 1200×400px"
              onChange={handleFileChange("banner")}
              onRemove={() => {
                setFiles((prev) => ({ ...prev, banner: null }));
                setPreviews((prev) => ({ ...prev, banner: "" }));
                setForm((prev) => ({ ...prev, bannerUrl: "" }));
              }}
              height="h-32"
            />
          </div>
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
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-gray-400" />
          <h2 className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Visibility
          </h2>
        </div>
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
        className="w-full py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        disabled={
          isPending || !isFormValid || IsPendingUpdateConfigure || isUploading
        }
        onClick={handleSubmit}
      >
        {isPending || IsPendingUpdateConfigure || isUploading ? (
          <>
            <Loader2 className="animate-spin h-4 w-4 text-white" />
            <span>Saving...</span>
          </>
        ) : (
          "Configure shop"
        )}
      </button>
    </div>
  );
}
