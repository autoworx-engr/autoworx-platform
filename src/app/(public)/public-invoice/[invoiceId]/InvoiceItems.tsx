"use client";

import type { db } from "@/lib/db";
import { stripHtml } from "@/utils/stripHtml";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export function InvoiceItems({
  items,
}: {
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
}) {
  const [openService, setOpenService] = useState<number | null>(null);

  return items.map((item) => {
    if (!item.service) return null;

    const materialCost = item.materials.reduce((acc, material) => {
      return (
        acc +
        (material && material.sell
          ? parseFloat(material.sell.toString()) * Number(material.quantity!) -
            parseFloat(material.discount?.toString() ?? "0")
          : 0)
      );
    }, 0);

    const laborCost = item.labor?.charge
      ? parseFloat(item.labor?.charge.toString()) * Number(item.labor?.hours)
      : 0;

    return (
      <div key={item.id} className="rounded-md border border-primary px-5 py-1">
        <div
          onClick={() =>
            setOpenService(openService === item.id ? null : item.id)
          }
          className="flex w-full cursor-pointer justify-between text-primary"
        >
          <p>{item.service.name}</p>
          <button
            type="button"
            onClick={() =>
              setOpenService(openService === item.id ? null : item.id)
            }
            className="flex items-center gap-1"
          >
            <p>${materialCost + laborCost}</p>
            {openService === item.id ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>

        {openService === item.id && (
          <>
            <p>{stripHtml(item.serviceDesc || item.service.description)}</p>
            <div className="mt-2 text-primary">
              <div>
                {item.materials.map((material, index) => {
                  if (!material) return null;

                  return (
                    <div key={index} className="flex justify-between">
                      <p>{material.name}</p>
                      <p>
                        ${" "}
                        {material.sell
                          ? parseFloat(material.sell.toString()) *
                              Number(material.quantity!) -
                            parseFloat(material.discount?.toString() ?? "0")
                          : 0}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-2 text-primary">
              <div className="flex justify-between">
                <p>{item.labor ? item.labor.name : "Labor"}</p>
                <p>
                  $
                  {item.labor?.charge
                    ? parseFloat(item.labor?.charge.toString()) *
                      Number(item.labor?.hours)
                    : 0}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    );
  });
}
