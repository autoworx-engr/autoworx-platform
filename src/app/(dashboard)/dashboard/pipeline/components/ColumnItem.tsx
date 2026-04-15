import { GripVertical, Lock, X } from "lucide-react";
import React from "react";
import { useDrag, useDrop } from "react-dnd";

interface DragItem {
  index: number;
  id: string;
  type: string;
}

const ItemType = "COLUMN";
export default function ColumnItem({
  column,
  index,
  moveColumn,
  handleColumnChange,
  handleDeleteColumn,
  inputRef,
}: Readonly<{
  column: any;
  index: number;
  moveColumn: (dragIndex: number, hoverIndex: number) => void;
  handleColumnChange: (index: number, newName: string) => void;
  handleDeleteColumn: (index: number) => void;
  inputRef: (el: HTMLInputElement) => void;
}>) {
  const [, drop] = useDrop({
    accept: ItemType,
    hover(item: DragItem) {
      if (item.index !== index) {
        moveColumn(item.index, index);
        item.index = index;
      }
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: { id: column.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const isRestricted = column.isRestricted;
  return (
    <div
      ref={(node) => {
        drag(node);
        drop(node);
      }}
      className={`group flex items-center gap-3 rounded-lg bg-white border border-slate-200 p-3 transition-all ${isDragging ? "cursor-grabbing" : "cursor-grab"} ${
        isDragging
          ? "opacity-50 shadow-lg scale-105"
          : "opacity-100 hover:border-slate-300 hover:shadow-md"
      } ${isRestricted ? "bg-slate-50" : ""}`}
    >
      {/* Drag Handle */}
      <div className="flex-shrink-0 text-slate-400 group-hover:text-slate-600 transition-colors">
        <GripVertical size={20} />
      </div>

      {/* Input Field */}
      <div className="flex-1">
        <input
          type="text"
          ref={inputRef}
          value={column.title}
          onChange={(e) => handleColumnChange(index, e.target.value)}
          className={`w-full px-3 py-2 text-sm font-medium rounded-lg border transition-all outline-none ${
            isRestricted
              ? "bg-slate-100 border-slate-200 text-slate-600 cursor-grab"
              : "bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          }`}
          disabled={isRestricted}
        />
      </div>

      {/* Delete Button */}
      {!isRestricted ? (
        <button
          onClick={() => handleDeleteColumn(index)}
          className="flex-shrink-0 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      ) : (
        <div className="flex-shrink-0 p-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <Lock size={16} />
        </div>
      )}
    </div>
  );
}
