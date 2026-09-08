"use client";

import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import WorkOrderModal from "@/components/workorder-modal/WorkOrderModal";
import { ShopLead } from "@/types/invoiceLead";
import { useState } from "react";
import TeamWorkOrderSheet from "./TeamWorkOrderSheet";

/**
 * Card click -> right-side detail sheet -> Edit / View Invoice -> modal.
 *
 * Either modal replaces the sheet instead of stacking on it: a click inside a
 * Radix dialog counts as an outside-interaction for the Radix sheet, which
 * would close the sheet and unmount the modal with it.
 */
export function useTeamWorkOrderPanel() {
  const [selectedLead, setSelectedLead] = useState<ShopLead | null>(null);
  const [editingLead, setEditingLead] = useState<ShopLead | null>(null);
  const [invoiceLead, setInvoiceLead] = useState<ShopLead | null>(null);

  const panel = (
    <>
      <TeamWorkOrderSheet
        lead={selectedLead}
        onOpenChange={(open) => {
          if (!open) setSelectedLead(null);
        }}
        onEdit={() => {
          setEditingLead(selectedLead);
          setSelectedLead(null);
        }}
        onViewInvoice={() => {
          setInvoiceLead(selectedLead);
          setSelectedLead(null);
        }}
      />

      {editingLead && (
        <WorkOrderModal
          invoiceId={editingLead.invoiceId}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingLead(null);
          }}
        />
      )}

      {invoiceLead && (
        <InvoiceModal
          invoiceId={invoiceLead.invoiceId}
          open={true}
          onOpenChange={(open) => {
            if (!open) setInvoiceLead(null);
          }}
        />
      )}
    </>
  );

  return { selectedLead, openLead: setSelectedLead, panel };
}
