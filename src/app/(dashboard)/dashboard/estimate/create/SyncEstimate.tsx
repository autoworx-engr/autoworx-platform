"use client";

import {
  InspectionType,
  Item,
  useEstimateCreateStore,
} from "@/stores/estimate-create";
import { FullPayment } from "@/types/db";
import { Invoice, InvoicePhoto, Task } from "@prisma/client";
import { useEffect } from "react";

export async function fetchImageAsFile(
  url: string,
  filename: string,
): Promise<File> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type });
}

export default function SyncEstimate({
  invoice,
  items,
  photos,
  tasks,
  payment,
  inspections,
}: {
  invoice: Invoice;
  items: Item[];
  photos: InvoicePhoto[];
  tasks: Task[];
  payment: FullPayment;
  inspections: InspectionType[];
}) {
  console.log({ photos });
  useEffect(() => {
    // async function fetchPhotos() {
    //   const photoFiles = await Promise.all(
    //     photos.map(async (photo, index) => {
    //       const url = photo.photo;
    //       const filename = photo.photo.split("/").pop() || "image.jpg";
    //       const fetchedImages = await fetchImageAsFile(url, filename);

    //       return fetchedImages;
    //     }),
    //   );

    //   useEstimateCreateStore.setState({
    //     photos: photos.map((photo) => photo.photo),
    //   });
    // }

    useEstimateCreateStore.setState({
      invoiceId: invoice.id,
      subtotal: parseFloat(invoice.subtotal?.toString() || "0"),
      type: invoice.type,
      photos: photos.map((photo) => photo.photo),
      discount: parseFloat(invoice.discount?.toString() || "0"),
      tax: parseFloat(invoice.tax?.toString() || "0"),
      serviceFee: parseFloat(invoice.serviceFee?.toString() || "0"),
      deposit: parseFloat(invoice.deposit?.toString() || "0"),
      grandTotal: parseFloat(invoice.grandTotal?.toString() || "0"),
      due: parseFloat(invoice.due?.toString() || "0"),
      internalNotes: invoice.internalNotes || "",
      terms: invoice.terms || "",
      policy: invoice.policy || "",
      customerNotes: invoice.customerNotes || "",
      customerComments: invoice.customerComments || "",
      tasks: tasks.map((task) => ({
        id: task.id,
        task: `${task.title}: ${task.description || ""}`,
      })),
      items,
      currentSelectedCategoryId: null,
      payment,
      totalPayment: parseFloat(invoice.totalPayment?.toString() || "0"),
      damageNotes: invoice.damageNotes || "",
      inspections,
    });

    // fetchPhotos();
  }, []);

  return null;
}
