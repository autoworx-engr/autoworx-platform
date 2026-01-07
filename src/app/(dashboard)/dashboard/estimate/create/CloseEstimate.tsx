"use client";
import { useEstimatePopupStore } from "@/stores/estimate-popup";

export default function Close() {
  const { close } = useEstimatePopupStore();

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    close();
  };

  return (
    <button
      className="w-fit rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-800 active:scale-95 active:bg-slate-100"
      onClick={handleClose}
      type="button"
    >
      Cancel
    </button>
  );
}
