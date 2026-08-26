import { Item } from "@/stores/estimate-create";
import { PopupType } from "@/stores/estimate-popup";
import { LABOR_NAME_MAX_LENGTH, MAX_LABOR_VALUE } from "./laborValidation";
import { MAX_MONEY_VALUE, validateMaterial } from "./materialValidation";

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const LABOR_NUMERIC_FIELDS = [
  { key: "hours", label: "No. of Hours" },
  { key: "charge", label: "$/hr" },
] as const;

/**
 * The Material/Labor/Service forms render inside the create page's right
 * sidebar, directly under the save button, so the save stays clickable while a
 * form is open. Saving then throws the draft away without a word.
 */
export function validateOpenItemForm(popupType: PopupType): string | null {
  const form = popupType
    ? { SERVICE: "Service", MATERIAL: "Material", LABOR: "Labor", TAG: null }[
        popupType
      ]
    : null;

  if (!form) return null;

  return `The ${form} form is still open. Click Done to add it, or Cancel to discard it, before saving.`;
}

/**
 * Applies the form-level material rules to what is actually in the store.
 * Without this a material that never passed through MaterialCreate — loaded
 * from a template, an edited invoice, or a draft abandoned mid-edit — reaches
 * the server where a nameless material is silently dropped and a zero quantity
 * fails with a generic error.
 */
export function validateEstimateItems(items: Item[]): string | null {
  for (const [index, item] of items.entries()) {
    const itemLabel = item.service?.name?.trim() || `Service ${index + 1}`;

    for (const material of item.materials) {
      if (!material) continue;

      const errors = validateMaterial(
        {
          name: material.name ?? "",
          quantity: toNumber(material.quantity),
          cost: toNumber(material.cost),
          sell: toNumber(material.sell),
        },
        // The Cost Price input is disabled once a material exists, so requiring
        // it here would leave an older invoice permanently unsavable.
        { maxMoneyValue: MAX_MONEY_VALUE, isEdit: true },
      );

      const [firstError] = Object.values(errors);
      if (firstError) {
        const name = material.name?.trim();
        return name
          ? `${itemLabel} — material "${name}": ${firstError}`
          : `${itemLabel} — material: ${firstError}`;
      }
    }

    const labor = item.labor;
    if (!labor) continue;

    const laborName = labor.name?.trim() ?? "";
    if (!laborName) {
      return `${itemLabel} — labor: Labor Name is required`;
    }
    if (laborName.length > LABOR_NAME_MAX_LENGTH) {
      return `${itemLabel} — labor: Labor Name cannot exceed ${LABOR_NAME_MAX_LENGTH} characters`;
    }

    for (const { key, label } of LABOR_NUMERIC_FIELDS) {
      // Unlike the LaborCreate form, 0 hours / 0 charge is legitimate here —
      // canned labor and templates both rely on it. Only bounds are checked.
      const value = toNumber(labor[key]);
      if (value === undefined) continue;

      if (value < 0) {
        return `${itemLabel} — labor "${laborName}": ${label} cannot be negative`;
      }
      if (value > MAX_LABOR_VALUE) {
        return `${itemLabel} — labor "${laborName}": ${label} cannot exceed ${MAX_LABOR_VALUE.toLocaleString()}`;
      }
    }
  }

  return null;
}
