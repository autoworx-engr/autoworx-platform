/**
 * Form-level validation for the Labor form (LaborCreate), mirroring
 * materialValidation.ts.
 *
 * Deliberately separate from `laborCreateValidationSchema`: that zod schema is
 * shared by estimate templates, virtual-shop services and the estimate save
 * path, where 0-hour / 0-charge labor is legitimate. These rules only apply to
 * what this form lets a user submit.
 */

export type LaborFormValues = {
  name: string;
  hours: number | undefined;
  charge: number | undefined;
};

export type LaborField = keyof LaborFormValues;

export type LaborFieldErrors = Partial<Record<LaborField, string>>;

export const LABOR_NAME_MAX_LENGTH = 50;

const NUMERIC_FIELDS = [
  { key: "hours", label: "No. of Hours" },
  { key: "charge", label: "$/hr" },
] as const;

export function validateLabor(
  values: LaborFormValues,
  maxValue: number,
): LaborFieldErrors {
  const errors: LaborFieldErrors = {};

  if (!values.name.trim()) {
    errors.name = "Labor Name is required";
  } else if (values.name.trim().length > LABOR_NAME_MAX_LENGTH) {
    errors.name = `Labor Name cannot exceed ${LABOR_NAME_MAX_LENGTH} characters`;
  }

  for (const { key, label } of NUMERIC_FIELDS) {
    const value = values[key];
    if (value === undefined || Number.isNaN(value)) {
      errors[key] = `${label} is required`;
    } else if (value <= 0) {
      // The inputs already coerce 0 and negatives back to empty, so anything
      // that reaches here at <= 0 is genuinely missing.
      errors[key] = `${label} must be greater than 0`;
    } else if (value > maxValue) {
      errors[key] = `${label} cannot exceed ${maxValue.toLocaleString()}`;
    }
  }

  return errors;
}
