"use client";
import { deleteLabor } from "@/actions/estimate/labor/deleteLabor";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import { Category, Labor } from "@prisma/client";
import { Popconfirm } from "antd";
import { PencilLineIcon, Trash2 } from "lucide-react";
import CannedLaborEditDialog from "./CannedLaborEditDialog";

const EditTrigger = (
  <button
    className="text-xl text-indigo-500 hover:text-indigo-600 transition-colors"
    title="Edit"
  >
    <PencilLineIcon className="w-5 h-5" />
  </button>
);

export const CannedLaborItem = ({
  labor,
  view,
  index,
}: {
  labor: Labor & { category?: Category };
  view: "table" | "card";
  index: number;
}) => {
  const deleteButton = (
    <Popconfirm
      title="Delete the Canned Labor"
      description="Are you sure to delete this Canned Labor?"
      okText="Yes"
      cancelText="No"
      onConfirm={() => deleteLabor(labor.id)}
    >
      <Trash2 className="w-5 h-5 text-red-500 hover:text-red-700 cursor-pointer transition-colors" />
    </Popconfirm>
  );

  if (view === "card") {
    return (
      <Card
        className={cn(
          "w-full transition-all duration-300 rounded-xl shadow-lg border-t-4",
          index !== undefined && index % 2 === 0
            ? "border-indigo-500 bg-white"
            : "border-teal-500 bg-gray-50",
          "shadow-md hover:shadow-lg",
        )}
      >
        <CardHeader className="p-4">
          <div className="flex items-start justify-between">
            <h3 className="line-clamp-2 text-xl font-extrabold text-gray-800">
              {labor.name}
            </h3>
            <div className="flex items-center gap-3 ml-4">
              <CannedLaborEditDialog labor={labor} trigger={EditTrigger} />
              {deleteButton}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-1 text-sm font-medium text-gray-500">Category</p>
              <p className="line-clamp-1 text-lg font-semibold text-indigo-600">
                {labor.category?.name || "-"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-gray-500">$/Hour</p>
              <p className="text-lg font-bold text-gray-700">
                {formatCurrency(labor.charge ? Number(labor.charge) : 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TableRow
      className={cn(
        "border-b border-gray-200 transition-colors hover:bg-indigo-50",
        index % 2 === 0 ? "bg-white" : "bg-gray-50",
      )}
    >
      <TableCell className="py-3">
        <span className="font-medium text-gray-800">{labor.name}</span>
      </TableCell>
      <TableCell className="py-3">
        <span className="text-gray-600">{labor.category?.name || "-"}</span>
      </TableCell>
      <TableCell className="py-3">
        <span className="text-gray-700 font-semibold">
          {formatCurrency(labor.charge ? Number(labor.charge) : 0)}
        </span>
      </TableCell>
      <TableCell className="flex items-center space-x-3 py-3 h-full">
        <CannedLaborEditDialog labor={labor} trigger={EditTrigger} />
        {deleteButton}
      </TableCell>
    </TableRow>
  );
};
