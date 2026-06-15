import WorkOrderModal from "@/components/workorder-modal/WorkOrderModal";
import React from "react";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div>
      <div>Test work order</div>

      <WorkOrderModal
        invoiceId="8956228268"
        buttonChild={<button>Test Open</button>}
      />
    </div>
  );
}
