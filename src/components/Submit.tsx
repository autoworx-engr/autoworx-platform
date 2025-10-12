"use client";

import { useFormErrorStore } from "@/stores/form-error";
import { useEffect, useTransition } from "react";
import { RotatingLines } from "react-loader-spinner";
import { useFormStatus } from "react-dom";

export default function Submit({
  children,
  formAction,
  className,
  disabled = false,
}: {
  children: React.ReactNode;
  formAction?: (formData: FormData) => Promise<void>;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const { clearError } = useFormErrorStore();

  const [transitionPending, startTransition] = useTransition();

  // reset the error state when the component is mounted
  useEffect(() => {
    clearError();
  }, []);

  const handler = async (data: FormData) => {
    // reset the error state when the button is clicked
    clearError();

    if (formAction) await formAction(data);
  };

  return (
    <button
      disabled={transitionPending || disabled}
      type="submit"
      formAction={(data) => startTransition(() => handler(data))}
      className={className}
      onClick={(e) => {
        e.stopPropagation();
      }}
      style={{
        WebkitAppearance: "none",
        appearance: "none",
        border: "none",
        outline: "none",
      }}
    >
      {pending ? (
        <div className="flex flex-col items-center justify-center">
          <RotatingLines strokeColor="#fff" strokeWidth="5" width="25" />
        </div>
      ) : (
        children
      )}
    </button>
  );
}
