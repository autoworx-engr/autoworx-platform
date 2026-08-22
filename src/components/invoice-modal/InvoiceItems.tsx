"use client";

import type { db } from "@/lib/db";
import { formatCurrency } from "@/utils/formatCurrency";
import { getInvoiceItemTitle } from "@/utils/invoiceItemTitle";
import { stripHtml } from "@/utils/stripHtml";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

type InvoiceItemsProps = {
  isPrinting?: boolean;
  items: Awaited<
    ReturnType<
      typeof db.invoiceItem.findMany<{
        include: {
          service: true;
          materials: true;
          labor: true;
        };
      }>
    >
  >;
};

export function InvoiceItems({ items, isPrinting = false }: InvoiceItemsProps) {
  const [openService, setOpenService] = useState<number | null>(null);

  return items.map((item) => {
    if (!item.service && !item.labor && !item.materials?.length) return null;

    const materialCost = item.materials.reduce((acc, material) => {
      return (
        acc +
        (material && material.sell
          ? parseFloat(material.sell.toString()) *
            Number(material.quantity ?? 0)
          : 0)
      );
    }, 0);

    const laborCost = item.labor?.charge
      ? parseFloat(item.labor?.charge.toString()) * Number(item.labor?.hours)
      : 0;
    const materialDiscount = item.materials.reduce((acc, material) => {
      return (
        acc +
        (material && material.discount
          ? parseFloat(material.discount.toString())
          : 0)
      );
    }, 0);
    const laborDiscount = item.labor?.discount
      ? parseFloat(item.labor?.discount.toString())
      : 0;
    const totalDiscount = materialDiscount + laborDiscount;
    const serviceTotal = materialCost + laborCost - totalDiscount;
    const isLaborOnly = !item.service;

    if (isLaborOnly) {
      return (
        <div
          key={item.id}
          className="rounded-md border border-primary px-5 py-1"
        >
          <div
            onClick={() =>
              setOpenService(openService === item.id ? null : item.id)
            }
            className="flex w-full cursor-pointer justify-between text-primary"
          >
            <p>{getInvoiceItemTitle(item)}</p>
            <button
              type="button"
              onClick={() =>
                setOpenService(openService === item.id ? null : item.id)
              }
              className="flex items-center gap-1"
            >
              <p>{formatCurrency(serviceTotal)}</p>
              {openService === item.id ? <ChevronUp /> : <ChevronDown />}
            </button>
          </div>
          {(openService === item.id || isPrinting) && (
            <>
              <div className="mt-2 text-primary">
                {item.materials.map((material, index) => {
                  if (!material) return null;
                  const materialLineDiscount = material.discount
                    ? parseFloat(material.discount.toString())
                    : 0;
                  return (
                    <div key={index} className={index > 0 ? "mt-2" : ""}>
                      <div className="flex justify-between">
                        <p>{material.name}</p>
                        <p>
                          {formatCurrency(
                            material.sell
                              ? parseFloat(material.sell.toString()) *
                                  Number(material.quantity ?? 0)
                              : 0,
                          )}
                        </p>
                      </div>
                      {material.notes && (
                        <p className="my-1 whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-sm text-slate-500">
                          {material.notes}
                        </p>
                      )}
                      {materialLineDiscount > 0 && (
                        <div className="flex justify-between text-sm text-slate-500">
                          <p>Discount</p>
                          <p>{formatCurrency(materialLineDiscount)}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {item.labor && (
                <div className="mt-2 border-t border-slate-100 pt-2">
                  <div className="flex justify-between text-primary">
                    <p>Labor Cost</p>
                    <p>{formatCurrency(laborCost)}</p>
                  </div>
                  {item.labor.notes && (
                    <p className="my-1 whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-sm text-slate-500">
                      {item.labor.notes}
                    </p>
                  )}
                  {laborDiscount > 0 && (
                    <div className="flex justify-between text-sm text-slate-500">
                      <p>Discount</p>
                      <p>{formatCurrency(laborDiscount)}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    return (
      <div key={item.id} className="rounded-md border border-primary px-5 py-1">
        <div
          onClick={() =>
            setOpenService(openService === item.id ? null : item.id)
          }
          className="flex w-full cursor-pointer justify-between text-primary"
        >
          <p>{item.service!.name}</p>
          <button
            type="button"
            onClick={() =>
              setOpenService(openService === item.id ? null : item.id)
            }
            className="flex items-center gap-1"
          >
            <p>{formatCurrency(serviceTotal)}</p>
            {openService === item.id ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>
        {(openService === item.id || isPrinting) && (
          <>
            <p className="whitespace-pre-wrap">
              {stripHtml(item.serviceDesc || item.service!.description)}
            </p>
            <div className="mt-2 text-primary">
              {item.materials.map((material, index) => {
                if (!material) return null;
                const materialLineDiscount = material.discount
                  ? parseFloat(material.discount.toString())
                  : 0;
                return (
                  <div key={index} className={index > 0 ? "mt-2" : ""}>
                    <div className="flex justify-between">
                      <p>{material.name}</p>
                      <p>
                        {formatCurrency(
                          material.sell
                            ? parseFloat(material.sell.toString()) *
                                Number(material.quantity ?? 0)
                            : 0,
                        )}
                      </p>
                    </div>
                    {material.notes && (
                      <p className="my-1 whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-sm text-slate-500">
                        {material.notes}
                      </p>
                    )}
                    {materialLineDiscount > 0 && (
                      <div className="flex justify-between text-sm text-slate-500">
                        <p>Discount</p>
                        <p>{formatCurrency(materialLineDiscount)}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-2 border-t border-slate-100 pt-2">
              <div className="flex justify-between text-primary">
                <p>{item.labor ? item.labor.name : "Labor"}</p>
                <p>
                  {formatCurrency(
                    item.labor?.charge
                      ? parseFloat(item.labor?.charge.toString()) *
                          Number(item.labor?.hours)
                      : 0,
                  )}
                </p>
              </div>
              {item.labor?.notes && (
                <p className="my-1 whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-sm text-slate-500">
                  {item.labor.notes}
                </p>
              )}
              {laborDiscount > 0 && (
                <div className="flex justify-between text-sm text-slate-500">
                  <p>Discount</p>
                  <p>{formatCurrency(laborDiscount)}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  });
}
