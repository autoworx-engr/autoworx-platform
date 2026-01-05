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
      className="w-fit rounded-md border-2 border-slate-400 p-1 px-5"
      onClick={handleClose}
      type="button"
    >
      Cancel
    </button>
  );
}
