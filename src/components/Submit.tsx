"use client";

import { useFormErrorStore } from "@/stores/form-error";
import { useEffect, useTransition } from "react";
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

  useEffect(() => {
    clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset once on mount
  }, []);

  const handler = async (data: FormData) => {
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
      {pending || transitionPending ? (
        <div className="flex h-6 items-center justify-center">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
            aria-hidden
          />
        </div>
      ) : (
        children
      )}
    </button>
  );
}
