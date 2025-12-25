"use client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/Tooltip";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import { InventoryProduct } from "@prisma/client";
import React from "react";

const ProductTooltipContainer = ({
  product,
}: {
  product: InventoryProduct;
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "text-4xl font-bold tracking-tight",
              Number(product?.quantity) === 0
                ? "text-red-500"
                : "text-slate-900 dark:text-white"
            )}
          >
            {String(product?.quantity).length > 4
              ? String(product?.quantity).slice(0, 4) + ".."
              : Number(product?.quantity)}
          </span>
        </TooltipTrigger>
        {String(product?.quantity).length > 4 && (
          <TooltipContent>
            <p>{Number(product?.quantity)}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

export default ProductTooltipContainer;
