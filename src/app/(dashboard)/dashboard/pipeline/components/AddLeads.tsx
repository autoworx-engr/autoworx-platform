"use client";

import type { JSX } from "react";
import { Dialog, DialogTrigger } from "@/components/Dialog";

import AddLeadModalBody from "./AddLeadModalBody";

const AddLeads = ({
  buttonChild,
  onClose,
  isLeadOpen = false,
  setIsLeadOpen,
}: {
  buttonChild?: JSX.Element;
  onClose?: () => void;
  isLeadOpen: boolean;
  setIsLeadOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <Dialog open={isLeadOpen} onOpenChange={setIsLeadOpen}>
      <DialogTrigger asChild>{buttonChild}</DialogTrigger>
      {isLeadOpen && (
        <AddLeadModalBody
          onClose={() => {
            setIsLeadOpen(false);
            onClose && onClose();
          }}
        />
      )}
    </Dialog>
  );
};

export default AddLeads;
