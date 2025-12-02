"use client";

import {
  InspectionType,
  Item,
  useEstimateCreateStore,
} from "@/stores/estimate-create";
import { FullPayment } from "@/types/db";
import { Invoice, InvoicePhoto, InvoiceTemplate, Task } from "@prisma/client";
import { useEffect } from "react";

export async function fetchImageAsFile(
  url: string,
  filename: string
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
  template,
}: {
  invoice?: Invoice;
  template?: InvoiceTemplate;
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
      invoiceId: invoice ? invoice.id : template?.id,
      subtotal: parseFloat(
        invoice
          ? invoice.subtotal?.toString() || "0"
          : template?.subtotal?.toString() || "0"
      ),
      type: invoice && invoice.type,
      photos: photos.map((photo) => ({
        id: photo.id,
        photo: photo.photo,
      })),
      discount: parseFloat(
        invoice
          ? invoice.discount?.toString() || "0"
          : template?.discount?.toString() || "0"
      ),
      tax: parseFloat(
        invoice
          ? invoice.tax?.toString() || "0"
          : template?.tax?.toString() || "0"
      ),
      serviceFee: parseFloat(
        invoice
          ? invoice.serviceFee?.toString() || "0"
          : template?.serviceFee?.toString() || "0"
      ),
      deposit: parseFloat((invoice && invoice.deposit?.toString()) || "0"),
      grandTotal: parseFloat(
        invoice
          ? invoice.grandTotal?.toString() || "0"
          : template?.grandTotal?.toString() || "0"
      ),
      due: parseFloat((invoice && invoice.due?.toString()) || "0"),
      internalNotes: invoice
        ? invoice.internalNotes || ""
        : template?.internalNotes || "",
      terms: (invoice && invoice.terms) || "",
      policy: (invoice && invoice.policy) || "",
      customerNotes: (invoice && invoice.customerNotes) || "",
      customerComments: (invoice && invoice.customerComments) || "",
      tasks: tasks.map((task) => ({
        id: task.id,
        task: `${task.title}: ${task.description || ""}`,
      })),
      items,
      currentSelectedCategoryId: null,
      payment,
      totalPayment: parseFloat(
        (invoice && invoice.totalPayment?.toString()) || "0"
      ),
      damageNotes: (invoice && invoice.damageNotes) || "",
      inspections,
      title: (template && template?.title) || "",
    });

    // fetchPhotos();
  }, []);

  return null;
}
