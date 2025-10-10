"use client";

import { useFormErrorStore } from "@/stores/form-error";
import { AlertCircle } from "lucide-react";
import { useRef } from "react";
import { FaTimes } from "react-icons/fa";

export default function FormError() {
  const { error, clearError } = useFormErrorStore();
  const buttonRef = useRef<HTMLDivElement>(null);

  // close with animation
  const handleClose = () => {
    buttonRef.current?.classList.add("hide");

    setTimeout(() => {
      clearError();
    }, 400);
  };

  if (error && !error.success) {
    return (
      <div
        className="mb-6 bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-3 shadow-sm"
        ref={buttonRef}
      >
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-grow">
          {error.errorSource && error?.errorSource?.length > 0 ? (
            <p
              key={error.errorSource[0].path}
              className="text-sm font-medium text-red-800"
            >
              {error.errorSource[0].message}
            </p>
          ) : (
            <p className="text-sm font-medium text-red-800">{error.message}</p>
          )}
        </div>

        <div>
          <button type="button" onClick={handleClose}>
            <FaTimes className="text-red-400" />
          </button>
        </div>
      </div>
    );
  }
}
