// stores/invoiceStore.ts
import { Invoice } from "@prisma/client";
import { create } from "zustand";

interface InvoiceStoreState {
  allInvoices: Invoice[];
  setAllInvoices: (data: Invoice[]) => void;
}

export const useInvoiceStore = create<InvoiceStoreState>((set) => ({
  allInvoices: [],
  setAllInvoices: (data) => set({ allInvoices: data }),
}));
