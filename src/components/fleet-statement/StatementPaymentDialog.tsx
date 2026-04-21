"use client";

import React from "react";
import { PayNow } from "@/components/invoice-modal/PayNow";

interface StatementPaymentDialogProps {
  statementId: string;
  companyId: number;
  totalDue: number;
  isEnabled: boolean;
  gatewayInfo?: {
    paymentGateway: "STRIPE" | "AUTHORIZE_NET" | "BOTH";
    hasStripe: boolean;
    hasAuthorizeNet: boolean;
    tipEnabled?: boolean;
  };
}

export const StatementPaymentDialog: React.FC<StatementPaymentDialogProps> = ({
  statementId,
  companyId,
  totalDue,
  isEnabled,
  gatewayInfo,
}) => {
  const [open, setOpen] = React.useState(false);

  if (!isEnabled) {
    return null;
  }

  return (
    <div className="mt-4 flex justify-center lg:justify-end">
      <PayNow
        mode="statement"
        due={totalDue.toFixed(2)}
        statementId={statementId}
        companyId={companyId}
        open={open}
        setOpen={setOpen}
        gatewayInfo={gatewayInfo}
      />
    </div>
  );
};
