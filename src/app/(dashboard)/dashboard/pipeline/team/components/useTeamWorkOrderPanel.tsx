"use client";

import WorkOrderModal from "@/components/workorder-modal/WorkOrderModal";
import { ShopLead } from "@/types/invoiceLead";
import { useState } from "react";
import TeamWorkOrderSheet from "./TeamWorkOrderSheet";

/**
 * Card click -> right-side detail sheet -> Edit -> work order modal.
 *
 * Editing replaces the sheet instead of stacking on it: a click inside the
 * Radix dialog counts as an outside-interaction for the Radix sheet, which
 * would close the sheet and unmount the modal with it.
 */
export function useTeamWorkOrderPanel() {
  const [selectedLead, setSelectedLead] = useState<ShopLead | null>(null);
  const [editingLead, setEditingLead] = useState<ShopLead | null>(null);

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
    </>
  );

  return { selectedLead, openLead: setSelectedLead, panel };
}
