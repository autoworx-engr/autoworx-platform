import { EmployeeType } from "@prisma/client";

export default function RoleChangeWarning({
  from,
  to,
}: {
  from: EmployeeType | null | undefined;
  to: EmployeeType | null;
}) {
  if (!to || !from || to === from) return null;

  const consequence =
    from === "Sales"
      ? "This employee's commission rate will be cleared, and they will stop earning commission on delivered invoices."
      : to === "Sales"
        ? "This employee will start earning commission on delivered invoices. Set a commission rate below."
        : "Role-specific payout data for the previous role will no longer apply.";

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-medium">
        Changing role from {from} to {to}
      </p>
      <p className="mt-1">
        {consequence} Past payout records are not affected.
      </p>
    </div>
  );
}
