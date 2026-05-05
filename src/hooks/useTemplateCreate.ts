import { useEstimateCreateStore } from "@/stores/estimate-create";
import { usePathname } from "next/navigation";
import { InvoiceType } from "@prisma/client";
import { createInvoice } from "@/actions/estimate/invoice/create";
import { updateInvoice } from "@/actions/estimate/invoice/update";
import { ServerAction } from "@/types/action";
import { useListsStore } from "@/stores/lists";
import { TErrorHandler } from "@/types/globalError";
import { successToast } from "@/lib/toast";
import { updateInventoryWhenInvoiceCreate } from "@/actions/estimate/invoice/updateInventory";

export function useTemplateCreate(type: InvoiceType) {
  const {
    invoiceId,
    subtotal,
    discount,
    tax,
    serviceFee,
    grandTotal,
    due,
    internalNotes,
    terms,
    policy,
    customerNotes,
    customerComments,
    photos,
    tasks,
    items,
    coupon,
    inspections,
    damageNotes,
  } = useEstimateCreateStore();

  const { client, vehicle, status } = useListsStore();

  const pathaname = usePathname();

  async function handleSubmit(
    fromPayment?: boolean,
  ): Promise<ServerAction | TErrorHandler> {
    const clientId = client?.id;
    const vehicleId = vehicle?.id;
    const columnId = status?.id;
    const isEditPage = pathaname?.includes("/template/create?isEdit=true");

    // check if client is selected
    if (!isEditPage && !client) {
      return {
        type: "globalError",
        message: "Please select a client before creating an estimate.",
      };
    }

    let res: ServerAction | TErrorHandler;
    if (isEditPage) {
      res = await updateInvoice(
        {
          id: invoiceId,
          clientId: clientId ? clientId : undefined,
          vehicleId: vehicleId ? vehicleId : undefined,
          columnId: columnId || undefined,
          subtotal,
          discount,
          tax: Number(tax) || 0,
          serviceFee: Number(serviceFee) || 0,
          grandTotal,
          due: Number(due) || 0,
          internalNotes,
          terms,
          policy,
          customerNotes,
          customerComments,
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
          type,
          inspections,
          damageNotes,
        },
        fromPayment,
      );

      if (res.type === "success") {
        successToast(`${type} Update successfully`);
        useEstimateCreateStore.setState({
          items: res?.data?.invoiceItems ?? [],
        });
      }
    } else {
      res = await createInvoice({
        invoiceId,
        type,
        clientId: clientId ? +clientId : undefined,
        vehicleId: vehicleId ? +vehicleId : undefined,

        columnId: columnId ? +columnId : undefined,
        subtotal,
        discount,
        tax: Number(tax) || 0,
        serviceFee: Number(serviceFee) || 0,
        grandTotal,
        due,
        internalNotes,
        terms,
        policy,
        customerNotes,
        customerComments,
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
        coupon,
        inspections,
        damageNotes,
      });

      if (res.type === "success") {
        await updateInventoryWhenInvoiceCreate({
          items,
          invoiceType: res.data.type,
          companyId: res.data.companyId,
          invoiceId,
        });

        successToast(`${type} Create successfully`);
      }
    }

    return res;
  }

  return handleSubmit;
}
