"use client";

import React, { useEffect, useMemo, useState } from "react";
import { debounce } from "@/utils/debounce";
import { SlimInput } from "@/components/SlimInput";
import { SlimTextarea } from "@/components/SlimTextarea";
import CarLoading from "@/components/common/CarLoading";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useConfigureShop,
  useGetVirtualShopConfigureById,
  useUpdateShop,
} from "@/hooks/virtual-shop/configure/useVirtualShopConfigure";
import { FileUpload } from "./FileUpload";
import { ColorPicker } from "./ColorPicker";
import { Select } from "./Select";
import { Switch } from "@/components/ui/switch";

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
  }>({});

  const [touched, setTouched] = useState<{
    storeName?: boolean;
    description?: boolean;
  }>({});
  const [isUploading, setIsUploading] = useState(false);

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
  }, [form.storeName]);

  /** validation */
  const validate = () => {
    const newErrors: typeof errors = {};

    if (!form.storeName.trim()) {
      newErrors.storeName = "Store name is required";
    }

    if (form.description && form.description.length > 150) {
      newErrors.description = "Max 150 characters allowed";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** file handler */
  const handleFileChange =
    (type: "logo" | "banner") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setFiles((prev) => ({ ...prev, [type]: file }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => ({
          ...prev,
          [type]: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
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
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const isLoading = isCreating || isUpdating || isUploading;

  if (isFetching && shopId) return <CarLoading />;

  return (
    <div className=" mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {shopId ? "Update Shop" : "Create Shop"}
        </h1>
        <p className="text-sm text-gray-500">
          Configure your store details and branding
        </p>
      </div>

      {/* BASIC INFO */}
      <div className="p-4 border rounded-xl space-y-4">
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
          onBlur={() => {
            setTouched({ storeName: true });
            validate();
          }}
          className={
            touched.storeName && errors.storeName ? "border-red-400" : ""
          }
        />

        {errors.storeName && (
          <p className="text-xs text-red-500">{errors.storeName}</p>
        )}

        <div className="flex border rounded-lg overflow-hidden">
          <span className="px-3 py-2 text-sm text-gray-400 bg-gray-50">
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
            className="flex-1 px-2 text-sm outline-none"
          />
          <span className="px-3 py-2 text-sm text-gray-400 bg-gray-50">
            .{domain}
          </span>
        </div>

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
                value.length > 150 ? "Max 150 characters allowed" : undefined,
            }));
          }}
          onBlur={() => {
            setTouched((p) => ({ ...p, description: true }));
            validate();
          }}
          className={
            touched.description && errors.description ? "border-red-400" : ""
          }
        />

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
                : "text-gray-400"
            }
          >
            {(form.description || "").length}/150
          </span>
        </div>
      </div>

      {/* FILES */}
      <div className="p-4 border rounded-xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
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
              setForm((p) => ({ ...p, bannerUrl: "" }));
            }}
          />
        </div>
      </div>

      {/* THEME */}
      <div className="p-4 border rounded-xl grid grid-cols-2 gap-4">
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

      {/* ACTIVE */}
      <div className="flex justify-between items-center border p-4 rounded-xl">
        <span className="text-sm font-medium">Active</span>

        <Switch
          checked={form.isActive}
          disabled={isCreating || isUpdating || isFetching}
          onCheckedChange={(checked) =>
            setForm((p) => ({
              ...p,
              isActive: !p.isActive,
            }))
          }
        />
      </div>

      {/* SUBMIT */}
      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full py-2.5 rounded-lg text-white bg-blue-600 flex justify-center items-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin w-4 h-4" />
            Saving...
          </>
        ) : shopId ? (
          "Update Shop"
        ) : (
          "Create Shop"
        )}
      </button>
    </div>
  );
}
