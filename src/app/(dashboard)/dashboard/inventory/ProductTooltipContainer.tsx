"use client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/Tooltip";
import { cn } from "@/lib/cn";
import { InventoryProduct } from "@prisma/client";
import React from "react";

const ProductTooltipContainer = ({
  product,
}: {
  product: InventoryProduct;
}) => {
  const quantity = Number(product?.quantity || 0);
  const displayValue = quantity.toString();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-baseline justify-center gap-0 w-full min-w-0">
            <span
              className={cn(
                "truncate text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight cursor-default min-w-0",
                quantity === 0
                  ? "text-red-500"
                  : "text-slate-900 dark:text-white",
              )}
              title={displayValue}
            >
              {displayValue}
            </span>
            <span className="text-xs sm:text-sm font-medium text-slate-400 flex-shrink-0 ml-0.5">
              / {product?.unit}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{quantity}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ProductTooltipContainer;
