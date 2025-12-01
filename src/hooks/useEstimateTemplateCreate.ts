import { useEstimateCreateStore } from "@/stores/estimate-create";
import { usePathname } from "next/navigation";
import { ServerAction } from "@/types/action";
import { useListsStore } from "@/stores/lists";
import { TErrorHandler } from "@/types/globalError";
import { successToast } from "@/lib/toast";
import { updateEstimateTemplate } from "@/actions/estimate-template/update";
import { createEstimateTemplate } from "@/actions/estimate-template/create";

export function useEstimateTemplateCreate() {
  const {
    invoiceId,
    subtotal,
    discount,
    tax,
    serviceFee,
    grandTotal,
    internalNotes,
    photos,
    tasks,
    items,
    inspections,
    title,
  } = useEstimateCreateStore();

  const { status } = useListsStore();

  const pathaname = usePathname();

  async function handleSubmit(): Promise<ServerAction | TErrorHandler> {
    const columnId = status?.id;
    const isEditPage = pathaname?.includes("/estimate/templates?isEdit=true");

    let res: ServerAction | TErrorHandler;
    if (isEditPage) {
      res = await updateEstimateTemplate({
        id: invoiceId,
        columnId: columnId || undefined,
        subtotal,
        discount,
        tax: Number(tax) || 0,
        serviceFee: Number(serviceFee) || 0,
        grandTotal,
        internalNotes,
        photos,
        //@ts-ignore
        items: items.map((item) => ({
          ...item,
          materials: item.materials.length
            ? item.materials.map((material) => ({
                ...material,
                categoryId: Number(material?.categoryId) || null,
                cost: Number(material?.cost) || 0,
                sell: Number(material?.sell) || 0,
                discount: Number(material?.discount) || 0,
                quantity: material?.quantity?.toString() || "0",
              }))
            : null,
          labor: item.labor
            ? {
                ...item.labor,
                charge: Number(item?.labor?.charge) || 0,
                hours: Number(item?.labor?.hours) || 0,
                discount: Number(item?.labor?.discount) || 0,
              }
            : null,
        })),
        tasks,
        inspections,
      });

      if (res.type === "success") {
        successToast(`Estimate Template Update successfully!`);
        useEstimateCreateStore.setState({
          items: res?.data?.invoiceItems ?? [],
        });
      }
    } else {
      res = await createEstimateTemplate({
        templateId: invoiceId,
        title,
        columnId: columnId ? +columnId : undefined,
        subtotal,
        discount,
        tax: Number(tax) || 0,
        serviceFee: Number(serviceFee) || 0,
        grandTotal,
        internalNotes,
        photos,
        //@ts-ignore
        items: items.map(({ id, ...item }) => ({
          ...item,
          materials: item.materials.map((material) => ({
            ...material,
            categoryId: Number(material?.categoryId) || null,
            cost: Number(material?.cost) || 0,
            sell: Number(material?.sell) || 0,
            discount: Number(material?.discount) || 0,
            quantity: material?.quantity?.toString() || "0",
          })),
          labor: item.labor
            ? {
                ...item.labor,
                charge: Number(item?.labor?.charge) || 0,
                hours: Number(item?.labor?.hours) || 0,
                discount: Number(item?.labor?.discount) || 0,
              }
            : null,
        })),
        tasks,
        inspections,
      });

      if (res.type === "success") {
        // await updateInventoryWhenInvoiceCreate({
        //   items,
        //   invoiceType: res.data.type,
        //   companyId: res.data.companyId,
        //   invoiceId,
        // });

        successToast(`Estimate template create successfully!`);
      }
    }

    return res;
  }

  return handleSubmit;
}
