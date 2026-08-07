/**
 * Validation for the Materials/Parts form (MaterialCreate).
 *
 * Kept in its own module so MaterialCreate.tsx stays focused on rendering, and
 * so the same rules can be reused by any other caller that builds a material.
 */

export type MaterialFormValues = {
  name: string;
  quantity: number | undefined;
  cost: number | undefined;
  sell: number | undefined;
};

export type MaterialField = keyof MaterialFormValues;

export type MaterialFieldErrors = Partial<Record<MaterialField, string>>;

type ValidateOptions = {
  maxMoneyValue: number;
  /**
   * In edit mode the Cost Price input is disabled, so a missing cost cannot be
   * corrected by the user — requiring it there would deadlock the form.
   */
  isEdit?: boolean;
};

const MONEY_FIELDS = [
  { key: "cost", label: "Cost Price" },
  { key: "sell", label: "Sell Price" },
] as const;

const isBlank = (value: number | undefined) =>
  value === undefined || Number.isNaN(value);

export function validateMaterial(
  values: MaterialFormValues,
  { maxMoneyValue, isEdit = false }: ValidateOptions,
): MaterialFieldErrors {
  const errors: MaterialFieldErrors = {};

  if (!values.name.trim()) {
    errors.name = "Material / Parts Name is required";
  }

  if (isBlank(values.quantity)) {
    errors.quantity = "Quantity is required";
  } else if (values.quantity! <= 0) {
    // Matches the server-side rule in _updateInvoice.ts, which rejects the
    // whole invoice save when a material quantity is not greater than 0.
    errors.quantity = "Quantity must be greater than 0";
  }

  for (const { key, label } of MONEY_FIELDS) {
    if (isEdit && key === "cost") continue;

    const value = values[key];
    if (isBlank(value)) {
      errors[key] = `${label} is required`;
    } else if (value! < 0) {
      errors[key] = `${label} cannot be negative`;
    } else if (value! > maxMoneyValue) {
      errors[key] = `${label} cannot exceed ${maxMoneyValue.toLocaleString()}`;
    }
  }

  return errors;
}
