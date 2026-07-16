"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTriggerCreate,
} from "@/app/(dashboard)/dashboard/estimate/TabsNav";
import Create from "@/app/(dashboard)/dashboard/estimate/create/Create";
import { CreateTab } from "@/app/(dashboard)/dashboard/estimate/create/tabs/CreateTab";
import {
  useCreateShopService,
  useUpdateShopService,
} from "@/hooks/virtual-shop/service/useShopService";
import { errorToast } from "@/lib/toast";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useRouter } from "nextjs-toploader/app";
import { useEffect, useMemo, useRef, useState } from "react";
import ServiceInfo, { ServiceInfoState } from "./ServiceInfo";

type InitialServiceData = {
  id: number;
  serviceInfo: ServiceInfoState;
  items: any[];
};

const INITIAL_SERVICE_INFO: ServiceInfoState = {
  serviceTitle: "",
  shortDescription: "",
  description: "",
  customDuration: "",
  imageName: "",
  imageUrl: "",
  category: [],
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
  onSave,
  isSaving,
  isImageUploading,
  isEditMode,
  validationError,
}: {
  onSave: () => void;
  isSaving: boolean;
  isImageUploading: boolean;
  isEditMode: boolean;
  validationError?: string;
}) {
  const {
    items,
    subtotal,
    grandTotal,
    tax,
    serviceFee,
    setSubtotal,
    setGrandTotal,
  } = useEstimateCreateStore();

  const [isTaxEnabled, setIsTaxEnabled] = useState(true);
  const [isSuppliesEnabled, setIsSuppliesEnabled] = useState(true);

  const computedTax = isTaxEnabled ? tax : 0;
  const computedServiceFee = isSuppliesEnabled ? serviceFee : 0;

  useEffect(() => {
    let newServicesTotal = 0;

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
    });

    setSubtotal(newServicesTotal);
  }, [items, setSubtotal]);

  useEffect(() => {
    const netAmount = subtotal;
    const taxAdd =
      computedTax > 0
        ? Number((netAmount * (computedTax / 100)).toFixed(2))
        : 0;
    const suppliesFeeAdd =
      computedServiceFee > 0
        ? Number((netAmount * (computedServiceFee / 100)).toFixed(2))
        : 0;

    setGrandTotal(Number((netAmount + taxAdd + suppliesFeeAdd).toFixed(2)));
  }, [computedServiceFee, computedTax, setGrandTotal, subtotal]);

  const summaryRows = useMemo(
    () => [
      ["subtotal", subtotal.toFixed(2)],
      ["grand total", grandTotal.toFixed(2)],
    ],
    [grandTotal, subtotal],
  );

  const isSubmitting = isSaving || isImageUploading;
  const isSaveDisabled = isSubmitting;

  return (
    <>
      <div className="space-y-1 p-1.5">
        {summaryRows.map(([title, data], index) => {
          const isToggleItem = title === "tax" || title === "shop supplies";
          const toggleState =
            title === "tax" ? isTaxEnabled : isSuppliesEnabled;
          const toggleSetter =
            title === "tax" ? setIsTaxEnabled : setIsSuppliesEnabled;

          return (
            <div
              key={index}
              className="group relative flex items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 transition-all hover:border-slate-200 hover:shadow-sm"
            >
              <div className="mr-auto text-sm font-semibold capitalize text-slate-500">
                {title}
              </div>

              {isToggleItem && (
                <div
                  onClick={() => toggleSetter((prev) => !prev)}
                  className={`relative flex h-5 w-9 cursor-pointer items-center rounded-full px-1 transition-all duration-200 ${
                    toggleState ? "bg-primary" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                      toggleState ? "translate-x-3.5" : "translate-x-0"
                    }`}
                  />
                </div>
              )}

              <input
                type="text"
                readOnly
                value={
                  isToggleItem
                    ? `${toggleState ? Number(data).toFixed(2) : 0}%${
                        toggleState && Number(data) > 0
                          ? ` | ${((subtotal * Number(data)) / 100).toFixed(2)}`
                          : ""
                      }`
                    : data
                }
                className="w-[200px] rounded-lg bg-gray-500 px-3 py-1 text-right text-sm font-bold text-white ring-1 ring-inset ring-slate-100 focus:outline-none"
              />
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-4 rounded-lg bg-[#006d77] p-5 text-white shadow-xl shadow-[#006d77]/20">
        <button
          type="button"
          className="w-full rounded-xl bg-white py-3 text-sm font-bold text-primary shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={isSaveDisabled}
          onClick={onSave}
        >
          {isSubmitting
            ? isEditMode
              ? "Updating..."
              : "Saving..."
            : isEditMode
              ? "Update Service"
              : "Save Service"}
        </button>
      </div>
    </>
  );
}

export default function ServiceCreateClient({
  companyId,
  selectedShopId,
  initialServiceData,
}: {
  companyId: number;
  selectedShopId?: number | null;
  initialServiceData?: InitialServiceData | null;
}) {
  const router = useRouter();
  const isEditMode = !!initialServiceData?.id;
  const { mutateAsync: createShopService, isPending: isSaving } =
    useCreateShopService();
  const { mutateAsync: updateShopService, isPending: isUpdating } =
    useUpdateShopService();

  const { items, reset } = useEstimateCreateStore();
  const [serviceInfo, setServiceInfo] =
    useState<ServiceInfoState>(INITIAL_SERVICE_INFO);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const isSubmittingRef = useRef(false);
  const [validationErrors, setValidationErrors] = useState<{
    serviceTitle?: string;
    shortDescription?: string;
    description?: string;
    items?: string;
  }>({});

  useEffect(() => {
    if (!initialServiceData) {
      reset();
      setServiceInfo(INITIAL_SERVICE_INFO);
      setSelectedImageFile(null);
      setValidationErrors({});
      return;
    }

    setServiceInfo(initialServiceData.serviceInfo);

    useEstimateCreateStore.setState({
      items: initialServiceData.items,
      subtotal: 0,
      discount: 0,
      grandTotal: 0,
      due: 0,
      deposit: 0,
      totalPayment: 0,
    });

    setSelectedImageFile(null);
    setValidationErrors({});
  }, [initialServiceData, reset]);

  const handleImageSelect = (file: File | null) => {
    setSelectedImageFile(file);

    if (!file) {
      setServiceInfo((prev) => ({ ...prev, imageName: "" }));
      return;
    }

    setServiceInfo((prev) => ({
      ...prev,
      imageName: file.name,
      imageUrl: "",
    }));
  };

  const uploadImage = async (file: File) => {
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

      return uploadedUrl;
    } catch (error) {
      errorToast("Failed to upload service image");
      throw error;
    } finally {
      setIsImageUploading(false);
    }
  };

  const handleSaveService = async () => {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    try {
      const nextErrors: {
        serviceTitle?: string;
        shortDescription?: string;
        description?: string;
        items?: string;
      } = {};

      if (!serviceInfo.serviceTitle.trim()) {
        nextErrors.serviceTitle = "Service title is required";
      }

      if (!serviceInfo.shortDescription.trim()) {
        nextErrors.shortDescription = "Short description is required";
      }

      if (!serviceInfo.description.trim()) {
        nextErrors.description = "Description is required";
      }

      const rowStates = (items || []).map((item) => {
        const hasService = Boolean(item?.service);
        const hasLabor = Boolean(
          item?.labor && String(item.labor.name || "").trim(),
        );
        const hasMaterial = Array.isArray(item?.materials)
          ? item.materials.some((material) =>
              Boolean(material && String(material.name || "").trim()),
            )
          : false;

        return {
          hasService,
          hasLabor,
          hasMaterial,
          hasAny: hasService || hasLabor || hasMaterial,
        };
      });

      const hasAnySelectedRow = rowStates.some((row) => row.hasAny);
      const hasIncompleteSelectedRow = rowStates.some(
        (row) => row.hasAny && !row.hasLabor,
      );

      if (!hasAnySelectedRow) {
        nextErrors.items = "Labor is required";
      } else if (hasIncompleteSelectedRow) {
        nextErrors.items = "Each selected row must include labor";
      }

      const invalidMaterialQuantity = (items || []).some((item) =>
        Array.isArray(item?.materials)
          ? item.materials.some((material) => {
              if (!material || !String(material.name || "").trim()) {
                return false;
              }

              return toSafeNumber(material.quantity) <= 0;
            })
          : false,
      );

      if (invalidMaterialQuantity) {
        nextErrors.items = "Material quantity cannot be 0";
      }

      const invalidLaborHours = (items || []).some((item) => {
        if (!item?.labor || !String(item.labor.name || "").trim()) {
          return false;
        }

        return toSafeNumber(item.labor.hours) <= 0;
      });

      if (invalidLaborHours) {
        nextErrors.items = "Labor no of hours cannot be 0";
      }

      if (Object.keys(nextErrors).length > 0) {
        setValidationErrors(nextErrors);
        const validationMessage =
          nextErrors.serviceTitle ||
          nextErrors.shortDescription ||
          nextErrors.description ||
          nextErrors.items ||
          "Please complete required fields";

        errorToast(validationMessage, { id: "service-create-validation" });
        return;
      }

      setValidationErrors({});

      if (!selectedShopId) {
        errorToast("Virtual shop is not configured yet", {
          id: "service-create-shop-not-configured",
        });
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
        let imageUrl = serviceInfo.imageUrl || undefined;

        if (selectedImageFile) {
          imageUrl = await uploadImage(selectedImageFile);
        }

        const payload = {
          shopId: Number(selectedShopId),
          companyId,
          title: serviceInfo.serviceTitle.trim(),
          shortDescription: serviceInfo.shortDescription.trim(),
          description: serviceInfo.description.trim(),
          imageUrl,
          modifierCoupe: serviceInfo.vehicleTypeModifiers.coupe,
          modifierSedan: serviceInfo.vehicleTypeModifiers.sedan,
          modifierSUV: serviceInfo.vehicleTypeModifiers.suv,
          modifierTruck: serviceInfo.vehicleTypeModifiers.truck,
          customDuration:
            serviceInfo.customDuration === ""
              ? undefined
              : Number(serviceInfo.customDuration),
          isActive: true,
          category: serviceInfo.category,
          items: payloadItems,
        };

        if (isEditMode && initialServiceData?.id) {
          await updateShopService({
            id: initialServiceData.id,
            payload,
          });
        } else {
          await createShopService(payload);
        }

        reset();
        setServiceInfo(INITIAL_SERVICE_INFO);
        setSelectedImageFile(null);
        setValidationErrors({});
        router.push(`/dashboard/virtual-shop/admin/${selectedShopId}/services`);
        router.refresh();
      } catch (error) {
        const message =
          (error as { message?: string })?.message ||
          `Failed to ${isEditMode ? "update" : "create"} shop service`;
        errorToast(message, { id: "service-create-submit-error" });
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="gap-3 space-y-4 overflow-clip py-2 md:-my-2 md:min-h-[83vh] xl:flex xl:space-y-0 xl:pt-20">
      <div className="flex w-full flex-col gap-3 xl:min-w-[68%]">
        <Tabs
          defaultValue="service-info"
          className="col-start-1 flex min-h-[40vh] flex-col overflow-clip lg:min-h-[72vh]"
        >
          <TabsList className="w-[90%] grid grid-cols-2 rounded-bl-none md:-ml-4 md:inline-flex md:w-auto">
            <TabsTriggerCreate
              value="create"
              className="order-2 w-full md:order-3 md:w-auto"
            >
              Create
            </TabsTriggerCreate>
            <TabsTriggerCreate
              value="service-info"
              className="order-1 w-full md:order-4 md:w-auto"
            >
              Service Info
            </TabsTriggerCreate>
          </TabsList>

          <TabsContent
            value="service-info"
            className="h-full rounded-tl-none w-full xl:h-full xl:max-h-[calc(100vh-14rem)] overflow-y-auto thin-scrollbar p-2"
          >
            <ServiceInfo
              value={serviceInfo}
              onChange={setServiceInfo}
              onImageSelect={handleImageSelect}
              errors={validationErrors}
            />
          </TabsContent>

          <TabsContent
            value="create"
            className="h-full rounded-tl-none w-full xl:h-full xl:max-h-[calc(100vh-14rem)] overflow-y-auto thin-scrollbar p-2"
          >
            <CreateTab />
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex-grow w-full xl:max-w-[32%] xl:self-stretch app-shadow grid grid-rows-[1fr,auto,auto] divide-y rounded-md bg-slate-50 overflow-y-auto thin-scrollbar">
        <div>
          <Create />
        </div>

        <ServiceBillSummary
          onSave={handleSaveService}
          isSaving={isSaving || isUpdating}
          isImageUploading={isImageUploading}
          isEditMode={isEditMode}
          validationError={validationErrors.items}
        />
      </div>
    </div>
  );
}
