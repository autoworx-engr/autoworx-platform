"use client";

import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useEstimatePopupStore } from "@/stores/estimate-popup";
import { useState } from "react";
import LaborCreate from "./LaborCreate";
import MaterialCreate from "./MaterialCreate";
import ServiceCreate from "./ServiceCreate";
import { useMediaQuery } from "react-responsive";
import { formatCurrency } from "@/utils/formatCurrency";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/cn";

export default function Create() {
  const { type } = useEstimatePopupStore();
  const [openService, setOpenService] = useState<string | null>(null);
  const items = useEstimateCreateStore((x) => x.items);
  const is640Max = useMediaQuery({ query: `(max-width: 640px)` });

  if (!is640Max) {
    if (type === "SERVICE") return <ServiceCreate />;
    if (type === "MATERIAL") return <MaterialCreate />;
    if (type === "LABOR") return <LaborCreate />;
  }

  return (
    <div className="w-full space-y-3 overflow-y-auto p-3">
      {items.map((item) => {
        if (!item.service && !item.labor && !item.materials?.length)
          return null;

        const materialCost = item.materials.reduce((acc, material) => {
          return (
            acc +
            (material && material.sell
              ? parseFloat(material.sell.toString()) *
                Number(material.quantity!)
              : 0)
          );
        }, 0);

        const laborCost = item.labor?.charge
          ? parseFloat(item.labor?.charge.toString()) *
            Number(item.labor?.hours)
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
        return (
          <div
            key={item.id}
            className={cn(
              "overflow-hidden rounded-xl border border-slate-300 transition-all duration-200",
              openService === item.id
                ? "bg-slate-50 shadow-sm"
                : "bg-white hover:border-primary/30",
            )}
          >
            {/* Header / Summary Row */}
            <div
              className={cn(
                "flex w-full items-center justify-between px-4 py-3 cursor-pointer select-none",
                openService === item.id ? "text-primary" : "text-slate-600",
              )}
              onClick={() =>
                setOpenService(
                  openService === item.id ? null : (item.id as string),
                )
              }
            >
              <p className="font-semibold tracking-tight">
                {isLaborOnly
                  ? (item.labor?.name ?? "Materials")
                  : item.service!.name}
              </p>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-sm">
                  {formatCurrency(serviceTotal)}
                </p>
                <div
                  className={cn(
                    "transition-transform duration-200",
                    openService === item.id ? "rotate-180" : "rotate-0",
                  )}
                >
                  <ChevronDown
                    size={18}
                    className={
                      openService === item.id
                        ? "text-primary"
                        : "text-slate-400"
                    }
                  />
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {openService === item.id && (
              <div className="border-t border-white bg-white/50 px-4 pb-4 pt-2">
                <div className="space-y-2.5">
                  {isLaborOnly ? (
                    <>
                      {/* Materials Section (labor-only: no service) */}
                      {item.materials.map((material, index) => {
                        if (!material) return null;
                        return (
                          <div
                            key={index}
                            className="flex justify-between text-sm text-slate-500 font-medium"
                          >
                            <p className="flex items-center gap-1.5">
                              <span className="h-1 w-1 rounded-full bg-slate-300" />
                              {material.name}
                            </p>
                            <p className="text-slate-700">
                              {formatCurrency(
                                material.sell
                                  ? parseFloat(material.sell.toString()) *
                                      Number(material.quantity!)
                                  : 0,
                              )}
                            </p>
                          </div>
                        );
                      })}
                      {item.labor && (
                        <div className="flex justify-between text-sm text-slate-500 font-medium">
                          <p className="flex items-center gap-1.5">
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            Labor Cost
                          </p>
                          <p className="text-slate-700 text-base font-medium">
                            {formatCurrency(laborCost)}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Materials Section */}
                      {item.materials.map((material, index) => {
                        if (!material) return null;
                        return (
                          <div
                            key={index}
                            className="flex justify-between text-sm text-slate-500 font-medium"
                          >
                            <p className="flex items-center gap-1.5">
                              <span className="h-1 w-1 rounded-full bg-slate-300" />
                              {material.name}
                            </p>
                            <p className="text-slate-700">
                              {formatCurrency(
                                material.sell
                                  ? parseFloat(material.sell.toString()) *
                                      Number(material.quantity!)
                                  : 0,
                              )}
                            </p>
                          </div>
                        );
                      })}

                      {/* Labor Section */}
                      <div className="flex justify-between text-sm text-slate-500 font-medium">
                        <p className="flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-full bg-slate-300" />
                          {item.labor ? item.labor.name : "Labor"}
                        </p>
                        <p className="text-slate-700 text-base font-medium">
                          {formatCurrency(laborCost)}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Discount Section */}
                  {totalDiscount > 0 && (
                    <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                      {materialDiscount > 0 && (
                        <div className="flex justify-between text-xs font-medium text-slate-400">
                          <p>Material Discount</p>
                          <p>- {formatCurrency(materialDiscount)}</p>
                        </div>
                      )}
                      {laborDiscount > 0 && (
                        <div className="flex justify-between text-xs font-medium text-slate-400">
                          <p>Labor Discount</p>
                          <p>- {formatCurrency(laborDiscount)}</p>
                        </div>
                      )}
                      <div className="flex justify-between text-xs font-bold text-emerald-600">
                        <p>Total Discount</p>
                        <p>- {formatCurrency(totalDiscount)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
