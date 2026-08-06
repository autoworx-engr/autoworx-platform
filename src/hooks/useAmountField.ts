"use client";

import { useCallback, useMemo, useState } from "react";

/** Round to 2 decimals. Returns NaN for anything that isn't a number. */
export function formatAmount(value: number | string): number {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(num) ? NaN : Math.round(num * 100) / 100;
}

/**
 * Keep only digits and a single decimal point, so a money field can never
 * hold anything but a number as the user types.
 */
export function sanitizeAmountInput(value: string): string {
  return value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
}

/** Keys that a native number input accepts but a money field must not. */
const BLOCKED_KEYS = ["e", "E", "+", "-"];

/**
 * Shared money-input state for payment forms (amount / deposit amount).
 *
 * Guarantees the field can only ever hold a number, and exposes an `error`
 * string that callers surface as a toast on submit.
 */
export function useAmountField(
  initialValue: number | string = 0,
  label: string = "Amount",
) {
  const [value, setValue] = useState<number | string>(initialValue);

  const numericValue = useMemo(
    () => (typeof value === "string" ? parseFloat(value) : value),
    [value],
  );

  const error = useMemo(() => {
    if (value === "" || value === null || value === undefined) {
      return `${label} is required`;
    }
    if (isNaN(numericValue)) {
      return `${label} must be a valid number`;
    }
    if (numericValue <= 0) {
      return `${label} must be greater than 0`;
    }
    return undefined;
  }, [value, numericValue, label]);

  const reset = useCallback(
    (next: number | string = initialValue) => setValue(next),
    [initialValue],
  );

  const inputProps = useMemo(
    () => ({
      type: "number" as const,
      inputMode: "decimal" as const,
      required: true,
      min: 0,
      step: "0.01",
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setValue(sanitizeAmountInput(e.target.value)),
      onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
        const rounded = formatAmount(e.target.value);
        setValue(isNaN(rounded) ? "" : rounded);
      },
      // A native number input still accepts "e", "+" and "-" — reject them
      // at the keyboard so the value never becomes an unparsable string.
      onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (BLOCKED_KEYS.includes(e.key)) e.preventDefault();
      },
      // Stop the scroll wheel from silently changing the amount.
      onWheel: (e: React.WheelEvent<HTMLInputElement>) =>
        e.currentTarget.blur(),
    }),
    [value],
  );

  return { value, setValue, numericValue, error, reset, inputProps };
}
