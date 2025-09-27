export function calculateDue(
  grandTotal: number,
  totalPayment: number,
  deposit: number
): number {
  return Math.round((grandTotal - (totalPayment + deposit)) * 100) / 100;
}
