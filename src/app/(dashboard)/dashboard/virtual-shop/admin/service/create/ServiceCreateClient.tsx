"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTriggerCreate,
} from "@/app/(dashboard)/dashboard/estimate/TabsNav";
import { CreateTab } from "@/app/(dashboard)/dashboard/estimate/create/tabs/CreateTab";
import TemplateAttachmentTab from "@/app/(dashboard)/dashboard/estimate/templates/TemplateAttachmentTab";
import TemplateInspectionTab from "@/app/(dashboard)/dashboard/estimate/templates/TemplateInspectionTab";
import ServiceInfo, { ServiceInfoState } from "./ServiceInfo";
import Create from "@/app/(dashboard)/dashboard/estimate/create/Create";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useEffect, useMemo, useState } from "react";
import { errorToast } from "@/lib/toast";
import { useGetVirtualShopConfigure } from "@/hooks/virtual-shop/configure/useVirtualShopConfigure";
import { useCreateShopService } from "@/hooks/virtual-shop/service/useShopService";
import { useRouter } from "next/navigation";

const INITIAL_SERVICE_INFO: ServiceInfoState = {
  serviceTitle: "",
  description: "",
  imageName: "",
  imageUrl: "",
  vehicleTypeModifiers: {
    coupe: "0",
    sedan: "0",
    suv: "0",
    truck: "0",
  },
};

const toSafeNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toSafeDate = (value: unknown) => {
  if (!value) return new Date();
  const parsed = new Date(value as string | Date);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

function ServiceBillSummary({
  serviceInfo,
  onSave,
  isSaving,
  isImageUploading,
}: {
  serviceInfo: ServiceInfoState;
  onSave: () => void;
  isSaving: boolean;
  isImageUploading: boolean;
}) {
  const {
    items,
    subtotal,
    discount,
    grandTotal,
    tax,
    serviceFee,
    deposit,
    totalPayment,
    setSubtotal,
    setDiscount,
    setGrandTotal,
    setDue,
  } = useEstimateCreateStore();

  const [isTaxEnabled, setIsTaxEnabled] = useState(true);
  const [isSuppliesEnabled, setIsSuppliesEnabled] = useState(true);

  const computedTax = isTaxEnabled ? tax : 0;
  const computedServiceFee = isSuppliesEnabled ? serviceFee : 0;

  useEffect(() => {
    let newServicesTotal = 0;
    let newDiscountTotal = 0;

    items.forEach((item) => {
      const { service, materials, labor } = item;

      if (!service) return;

      const materialCost = materials.reduce((acc, material) => {
        return (
          acc +
          (material && material.sell
            ? parseFloat(material.sell.toString()) * Number(material.quantity!)
            : 0)
        );
      }, 0);

      const materialDiscount = materials.reduce((acc, material) => {
        return (
          acc +
          (material && material.discount
            ? parseFloat(material.discount.toString())
            : 0)
        );
      }, 0);

      const laborCost = labor?.charge
        ? Number((Number(labor.charge) * Number(labor.hours)).toFixed(2))
        : 0;

      newServicesTotal += materialCost + laborCost;
      newDiscountTotal +=
        materialDiscount +
        (labor?.discount ? parseFloat(labor.discount.toString()) : 0);
    });

    setSubtotal(newServicesTotal);
    setDiscount(newDiscountTotal);
  }, [items, setDiscount, setSubtotal]);

  useEffect(() => {
    const netAmount = subtotal - discount;
    const taxAdd =
      computedTax > 0 ? Number((netAmount * (computedTax / 100)).toFixed(2)) : 0;
    const suppliesFeeAdd =
      computedServiceFee > 0
        ? Number((netAmount * (computedServiceFee / 100)).toFixed(2))
        : 0;

    setGrandTotal(Number((netAmount + taxAdd + suppliesFeeAdd).toFixed(2)));
  }, [computedServiceFee, computedTax, discount, setGrandTotal, subtotal]);

  useEffect(() => {
    setDue(grandTotal - (deposit + totalPayment));
  }, [deposit, grandTotal, setDue, totalPayment]);

  const summaryRows = useMemo(
    () => [
      ["subtotal", subtotal.toFixed(2)],
      ["discount", discount.toFixed(2)],
      ["deposit", deposit.toFixed(2)],
      ["payment", totalPayment.toFixed(2)],
      ["grand total", grandTotal.toFixed(2)],
    ],
    [deposit, discount, grandTotal, subtotal, totalPayment],
  );

  const isSaveDisabled =
    isSaving ||
    isImageUploading ||
    !serviceInfo.serviceTitle.trim() ||
    !serviceInfo.serviceTitle;

  return (
    <>
      <div className="space-y-1 p-1.5">
        {summaryRows.map(([title, data], index) => {
          const isToggleItem = title === "tax" || title === "shop supplies";
          const toggleState = title === "tax" ? isTaxEnabled : isSuppliesEnabled;
          const toggleSetter =
            title === "tax" ? setIsTaxEnabled : setIsSuppliesEnabled;

          return (
            <div
              key={index}
              className="relative flex items-center justify-between gap-4 rounded-md border border-solid border-slate-600 px-2 py-1"
            >
              <div className="mr-auto text-xs uppercase">{title}</div>

              {isToggleItem && (
                <div
                  onClick={() => toggleSetter((prev) => !prev)}
                  className={`ml-2 flex h-5 w-10 cursor-pointer items-center rounded-full px-1 transition-colors ${toggleState ? "bg-[#6571FF]" : "bg-gray-400"
                    }`}
                >
                  <div
                    className={`h-3 w-3 transform rounded-full bg-white transition-transform ${toggleState ? "translate-x-5" : "translate-x-0"
                      }`}
                  />
                </div>
              )}

              <input
                type="text"
                readOnly
                value={
                  isToggleItem
                    ? `${toggleState ? Number(data).toFixed(2) : 0}%${toggleState && Number(data) > 0
                      ? ` | ${(((subtotal - discount) * Number(data)) / 100).toFixed(2)}`
                      : ""
                    }`
                    : data
                }
                className="w-[130px] rounded-md bg-slate-500 px-2 py-1 text-right text-xs text-white"
              />
            </div>
          );
        })}
      </div>

      <div className="space-y-2 rounded-md bg-[#006d77] p-2 px-4 py-4 text-sm text-white">
        <button
          type="button"
          className="w-full rounded-md bg-[#6571FF] p-2 disabled:cursor-not-allowed disabled:bg-gray-500"
          disabled={isSaveDisabled}
          onClick={onSave}
        >
          {isSaving ? "Saving..." : isImageUploading ? "Uploading image..." : "Save Service"}
        </button>
      </div>
    </>
  );
}

export default function ServiceCreateClient({ companyId }: { companyId: number }) {
  const router = useRouter();
  const { data: shopConfig } = useGetVirtualShopConfigure(companyId);
  const { mutateAsync: createShopService, isPending: isSaving } = useCreateShopService();

  const { items, reset } = useEstimateCreateStore();
  const [serviceInfo, setServiceInfo] = useState<ServiceInfoState>(INITIAL_SERVICE_INFO);
  const [isImageUploading, setIsImageUploading] = useState(false);

  const uploadImage = async (file: File | null) => {
    if (!file) {
      setServiceInfo((prev) => ({ ...prev, imageName: "", imageUrl: "" }));
      return;
    }

    setIsImageUploading(true);
    try {
      const imageFormData = new FormData();
      imageFormData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: imageFormData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const result = await response.json();
      const uploadedUrl = result?.data?.[0] || "";

      if (!uploadedUrl) {
        throw new Error("Image URL not found in upload response");
      }

      setServiceInfo((prev) => ({
        ...prev,
        imageUrl: uploadedUrl,
        imageName: file.name,
      }));
    } catch (error) {
      errorToast("Failed to upload service image");
      setServiceInfo((prev) => ({ ...prev, imageUrl: "", imageName: "" }));
    } finally {
      setIsImageUploading(false);
    }
  };

  const handleSaveService = async () => {
    if (!serviceInfo.serviceTitle.trim()) {
      errorToast("Service title is required");
      return;
    }

    if (!shopConfig?.id) {
      errorToast("Virtual shop is not configured yet");
      return;
    }

    const payloadItems = (items || [])
      .map((item) => {
        const normalizedService = item.service
          ? {
            id: Number(item.service.id),
            name: item.service.name,
            categoryId: item.service.categoryId ?? null,
            description: item.service.description ?? null,
            createdAt: toSafeDate(item.service.createdAt),
            updatedAt: toSafeDate(item.service.updatedAt),
            fromRequest: (item.service as any).fromRequest ?? null,
            fromRequestedCompanyId:
              (item.service as any).fromRequestedCompanyId ?? null,
            companyId: Number(item.service.companyId || companyId),
          }
          : null;

        const normalizedMaterials = (item.materials || []).map((material) => {
          if (!material) return null;

          return {
            id: material.id,
            name: material.name,
            vendorId: material.vendorId ?? null,
            categoryId: material.categoryId ?? null,
            notes: material.notes ?? null,
            quantity: toSafeNumber(material.quantity),
            cost: toSafeNumber(material.cost),
            sell: toSafeNumber(material.sell),
            discount: toSafeNumber(material.discount),
            companyId: Number(material.companyId || companyId),
            invoiceId: material.invoiceId ?? null,
            invoiceItemId: material.invoiceItemId ?? null,
            productId: material.productId ?? null,
            createdAt: toSafeDate(material.createdAt),
            updatedAt: toSafeDate(material.updatedAt),
            tags: ((material as any).tags || [])
              .filter((tag: any) => tag?.id && tag?.name)
              .map((tag: any) => ({
                id: Number(tag.id),
                name: String(tag.name),
                textColor: String(tag.textColor || "#000000"),
                bgColor: String(tag.bgColor || "#ffffff"),
                createdAt: toSafeDate(tag.createdAt),
                updatedAt: toSafeDate(tag.updatedAt),
                companyId: Number(tag.companyId || companyId),
              })),
          };
        });

        const normalizedLabor =
          item.labor && item.labor.name?.trim()
            ? {
              name: item.labor.name,
              categoryId: item.labor.categoryId ?? null,
              notes: item.labor.notes ?? null,
              tags: ((item.labor as any).tags || [])
                .filter((tag: any) => tag?.id && tag?.name)
                .map((tag: any) => ({
                  id: Number(tag.id),
                  name: String(tag.name),
                  textColor: String(tag.textColor || "#000000"),
                  bgColor: String(tag.bgColor || "#ffffff"),
                  createdAt: toSafeDate(tag.createdAt),
                  updatedAt: toSafeDate(tag.updatedAt),
                  companyId: Number(tag.companyId || companyId),
                })),
              hours: toSafeNumber(item.labor.hours),
              charge: toSafeNumber(item.labor.charge),
              discount: toSafeNumber(item.labor.discount),
              cannedLabor: Boolean(item.labor.cannedLabor),
            }
            : null;

        const normalizedTags = (item.tags || [])
          .filter((tag) => tag?.id && tag?.name)
          .map((tag) => ({
            id: Number(tag.id),
            name: String(tag.name),
            textColor: String(tag.textColor || "#000000"),
            bgColor: String(tag.bgColor || "#ffffff"),
            createdAt: toSafeDate(tag.createdAt),
            updatedAt: toSafeDate(tag.updatedAt),
            companyId: Number(tag.companyId || companyId),
          }));

        return {
          service: normalizedService,
          materials: normalizedMaterials,
          labor: normalizedLabor,
          tags: normalizedTags,
        };
      })
      .filter(
        (item) =>
          item.service ||
          item.labor ||
          (item.materials || []).some((material) => material !== null),
      );

    try {
      await createShopService({
        shopId: Number(shopConfig.id),
        companyId,
        title: serviceInfo.serviceTitle.trim(),
        description: serviceInfo.description?.trim() || undefined,
        imageUrl: serviceInfo.imageUrl || undefined,
        modifierCoupe: serviceInfo.vehicleTypeModifiers.coupe,
        modifierSedan: serviceInfo.vehicleTypeModifiers.sedan,
        modifierSUV: serviceInfo.vehicleTypeModifiers.suv,
        modifierTruck: serviceInfo.vehicleTypeModifiers.truck,
        isActive: true,
        items: payloadItems,
      });

      reset();
      setServiceInfo(INITIAL_SERVICE_INFO);
      router.push("/dashboard/virtual-shop/admin");
      router.refresh();
    } catch (error) {
      const message =
        (error as { message?: string })?.message ||
        "Failed to create shop service";
      errorToast(message);
    }
  };

  return (
    <div className="gap-3 space-y-4 overflow-clip py-2 md:-my-2 md:min-h-[93vh] xl:flex xl:space-y-0">
      <div className="flex w-full flex-col gap-3 xl:min-w-[68%]">
        <Tabs
          defaultValue="service-info"
          className="col-start-1 flex min-h-[40vh] flex-col overflow-clip lg:min-h-[69vh]"
        >
          <TabsList className="-ml-4 grid grid-cols-4 rounded-bl-none md:inline-flex">
            <TabsTriggerCreate
              value="inspections"
              className="order-4 md:order-1"
            >
              Inspections
            </TabsTriggerCreate>
            <TabsTriggerCreate
              value="attachment"
              className="order-3 md:order-2"
            >
              Attachment
            </TabsTriggerCreate>
            <TabsTriggerCreate value="create" className="order-2 md:order-3">
              Create
            </TabsTriggerCreate>
            <TabsTriggerCreate value="service-info" className="order-1 md:order-4">
              Service Info
            </TabsTriggerCreate>
          </TabsList>

          <TabsContent value="service-info" className="h-full rounded-tl-none w-full xl:h-full xl:max-h-[calc(100vh-19.5rem)] overflow-y-auto thin-scrollbar p-2">
            <ServiceInfo
              value={serviceInfo}
              onChange={setServiceInfo}
              onImageSelect={uploadImage}
              isImageUploading={isImageUploading}
            />
          </TabsContent>

          <TabsContent value="create" className="h-full rounded-tl-none w-full xl:h-full xl:max-h-[calc(100vh-19.5rem)] overflow-y-auto thin-scrollbar p-2">
            <CreateTab />
          </TabsContent>

          <TabsContent value="attachment" className="h-full rounded-tl-none w-full xl:h-full xl:max-h-[calc(100vh-19.5rem)] overflow-y-auto thin-scrollbar p-2">
            <TemplateAttachmentTab />
          </TabsContent>

          <TabsContent value="inspections" className="h-full rounded-tl-none w-full xl:h-full xl:max-h-[calc(100vh-19.5rem)] overflow-y-auto thin-scrollbar p-2">
            <TemplateInspectionTab />
          </TabsContent>
        </Tabs>
      </div>

      <div className="app-shadow grid w-full flex-grow grid-rows-[1fr,auto,auto] divide-y rounded-md bg-slate-50 xl:max-w-[32%] xl:max-h-[calc(100vh-5rem)] overflow-y-auto thin-scrollbar">
        <div>
          <Create />
        </div>

        <ServiceBillSummary
          serviceInfo={serviceInfo}
          onSave={handleSaveService}
          isSaving={isSaving}
          isImageUploading={isImageUploading}
        />
      </div>
    </div>
  );
}
