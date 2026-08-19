import BackButton from "@/components/BackButton";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import React from "react";
import UseProductForm from "../../UseProductForm";
import ReplenishProductForm from "../../ReplenishProductForm";
import { getCompanyId } from "@/lib/companyId";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventory - Product",
  description: "View and manage inventory product details.",
};

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;

  const { id } = params;

  if (!id) return notFound();

  const companyId = await getCompanyId();

  const productId = parseInt(id);
  const product = await db.inventoryProduct.findUnique({
    where: { id: productId, companyId },
  });

  const invoices = await db.invoice.findMany({
    where: { companyId, type: "Invoice" },
    select: {
      id: true,
      client: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });
  const invoiceWithClient = invoices.map((invoice) => ({
    id: invoice.id,
    clientName: `${invoice.client?.firstName} ${invoice.client?.lastName}`,
  }));
  // const lastHistory = await db.inventoryProductHistory.findFirst({
  //   where: { productId },
  //   orderBy: { date: "desc" },
  // });

  if (!product) return notFound();

  return (
    <div className="app-shadow mx-auto mt-10 w-full max-w-[60rem] rounded-lg bg-background p-4">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="w-full md:w-[70%]">
          <div className="mb-2 flex items-center gap-3">
            <BackButton href="/dashboard/inventory" />
            <h3 className="text-xs font-semibold sm:text-lg">
              Inventory Details
            </h3>
          </div>
          <p className="mt-1 text-sm sm:mt-2 sm:text-base">
            <span className="font-semibold">Name: </span> {product.name}
          </p>
          <p className="mt-1 text-sm sm:mt-2 sm:text-base">
            <span className="font-semibold">Type: </span> {product.type}
          </p>
          <p className="mt-1 text-sm sm:mt-2 sm:text-base truncate">
            <span className="font-semibold">Description: </span>{" "}
            {product.description}
          </p>
        </div>
        <div className="mt-3 w-full rounded-md bg-primary/10 p-2 md:mt-0 md:w-[30%] md:bg-transparent">
          <p className="text-nowrap text-center font-semibold">
            {Number(product.quantity)} {product.unit} remaining
          </p>
        </div>
      </div>
      <div className="mt-3 flex justify-center gap-3 md:justify-end">
        <UseProductForm
          productId={productId}
          invoiceIds={invoiceWithClient}
          cost={parseFloat(product?.price?.toString() || "0")}
          productType={product.type}
        />
        <ReplenishProductForm lastUnit={product.unit} productId={productId} />
      </div>
    </div>
  );
}
