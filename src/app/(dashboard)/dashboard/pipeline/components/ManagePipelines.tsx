import React, { useEffect, useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import {
  createColumn,
  deleteColumn,
  getColumnsByType,
  updateColumn,
  updateColumnOrder,
} from "@/actions/pipelines/pipelinesColumn";
import { toast } from "react-hot-toast";
import { INVOICE_COLORS } from "@/lib/consts";
import { Column } from "@prisma/client";
import { GripVertical, Lock, Plus, Tally2, X } from "lucide-react";
import ColumnItem from "./ColumnItem";

export interface LocalColumn {
  id: number | null;
  title: string;
  type: string;
  order: number;
  textColor?: string | null;
  bgColor?: string | null;
  isRestricted?: boolean;
}

interface ManagePipelinesModalProps {
  columns: Column[];
  onClose: () => void;
  pipelineType: string;
}

const restrictedColumns = [
  "Pending",
  "In Progress",
  "Completed",
  "Delivered",
  "New Leads",
  "Ongoing",
  "Lead Lost",
  "Opportunity",
  "Converted",
  "Follow Up",
];

export default function ManagePipelines({
  columns,
  onClose,
  pipelineType,
}: Readonly<ManagePipelinesModalProps>) {
  const [localColumns, setLocalColumns] = useState<LocalColumn[]>([]);
  const [deletedColumns, setDeletedColumns] = useState<LocalColumn[]>([]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setLocalColumns(
      columns.map((column) => ({
        ...column,
        isRestricted: restrictedColumns.includes(column.title),
      }))
    );
  }, [columns]);

  useEffect(() => {
    if (localColumns.length > columns.length) {
      const newIndex = localColumns.length - 1;
      inputRefs.current[newIndex]?.focus();
    }
  }, [localColumns, columns]);

  const moveColumn = (dragIndex: number, hoverIndex: number) => {
    const updatedColumns = [...localColumns];
    const [draggedColumn] = updatedColumns.splice(dragIndex, 1);
    updatedColumns.splice(hoverIndex, 0, draggedColumn);
    setLocalColumns(updatedColumns);

    saveColumnsOrderToBackend(updatedColumns);
  };

  const handleColumnChange = (index: number, newName: string) => {
    const updatedColumns = [...localColumns];
    updatedColumns[index].title = newName;
    setLocalColumns(updatedColumns);
  };

  const handleDeleteColumn = async (index: number) => {
    const columnToDelete = localColumns[index];

    //prevent from deletion
    if (columnToDelete.isRestricted) {
      toast.error("Deletion of restricted column is not allowed.");
      return;
    }

    //reflect on UI
    const updatedColumns = localColumns.filter((_, i) => i !== index);
    setLocalColumns(updatedColumns);

    if (columnToDelete.id != null) {
      setDeletedColumns([...deletedColumns, columnToDelete]);
    }
  };

  const handleAddColumn = () => {
    const newOrder = localColumns.length;

    const { textColor, bgColor } =
      INVOICE_COLORS[localColumns.length % INVOICE_COLORS.length];
    const newColumn: LocalColumn = {
      id: null,
      title: "New Column",
      type: pipelineType,
      order: newOrder,
      textColor,
      bgColor,
    };
    setLocalColumns([...localColumns, newColumn]);
  };

  const handleSave = async () => {
    // Check for renamed restricted columns
    const renamedRestrictedColumns = localColumns.filter(
      (column) =>
        column.isRestricted && !restrictedColumns.includes(column.title.trim())
    );

    if (renamedRestrictedColumns.length > 0) {
      toast.error(
        `The restricted column "${renamedRestrictedColumns[0].title}" cannot be renamed.`
      );
      return;
    }

    // Check if any non-restricted column has a restricted title
    const invalidColumns = localColumns.filter(
      (column) =>
        !column.isRestricted && restrictedColumns.includes(column.title.trim())
    );

    if (invalidColumns.length > 0) {
      toast.error(
        `The column "${invalidColumns[0].title}" is a restricted title and cannot be used.`
      );
      return;
    }

    const columnsToSave = localColumns.map(async (column, index) => {
      column.order = index;

      if (restrictedColumns.includes(column.title)) {
        return;
      }

      if (column.id === null) {
        const newColumn = await createColumn(
          column.title,
          column.type,
          column.textColor ?? undefined,
          column.bgColor ?? undefined
        );
        column.id = newColumn.id;
      } else {
        await updateColumn(column.id, column.title, pipelineType, column.order);
      }
    });

    const columnsToDelete = deletedColumns.map(async (column) => {
      if (column.id !== null) {
        await deleteColumn(column.id);
      }
    });

    // Wait for all columns to be saved/updated and deleted
    await Promise.all([...columnsToSave, ...columnsToDelete]);

    // onSave(localColumns);
    onClose();
    //hard reload
    window.location.reload();
  };

  const saveColumnsOrderToBackend = async (updatedColumns: LocalColumn[]) => {
    const reorderedColumns = updatedColumns
      .filter((column) => column.id !== null)
      .map((column, index) => ({
        id: column.id!,
        order: index,
      }));
    try {
      await updateColumnOrder(reorderedColumns);
    } catch (error) {
      console.error("Error saving column order:", error);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md mx-4 max-h-[94vh] rounded-xl bg-white shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Edit Pipeline
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Drag to reorder columns, or add new ones
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0 px-6 py-4">
            <div className="flex-1  overflow-y-auto pr-2 space-y-3 thin-scrollbar">
              {localColumns.map((column, index) => (
                <ColumnItem
                  key={column.id ?? `new-${index}`}
                  index={index}
                  column={column}
                  moveColumn={moveColumn}
                  handleColumnChange={handleColumnChange}
                  handleDeleteColumn={handleDeleteColumn}
                  inputRef={(el) => (inputRefs.current[index] = el)}
                />
              ))}
            </div>

            {/* Add Button */}
            <button
              onClick={handleAddColumn}
              className="mt-4 w-full rounded-lg border-2 border-dashed border-blue-300 px-4 py-3 text-sm font-medium text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Add New Column
            </button>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 flex-shrink-0 bg-slate-50">
            <button
              onClick={onClose}
              className="
                rounded-xl mt-2 sm:mt-0 px-5 py-2.5 text-sm font-medium text-slate-500 
                hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800
                transition-colors border
              "
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="
                rounded-xl px-6 py-2.5 text-sm font-medium text-white
                bg-gradient-to-r from-[#6571FF] to-[#5a66ee]
                shadow-lg shadow-indigo-500/30
                hover:shadow-xl hover:shadow-indigo-500/40
                hover:-translate-y-0.5 hover:scale-[1.02]
                active:translate-y-0 active:scale-100
                transition-all duration-200
              "
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}


