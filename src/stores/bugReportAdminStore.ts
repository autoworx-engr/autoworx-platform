import { create } from "zustand";

type Contact = any;

interface BugReportAdminState {
  selectedContact: Contact | null;
  setSelectedContact: (contact: Contact | null) => void;
}

export const useBugReportAdminStore = create<BugReportAdminState>((set) => ({
  selectedContact: null,
  setSelectedContact: (contact) => set({ selectedContact: contact }),
}));
