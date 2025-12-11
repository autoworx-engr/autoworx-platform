import { Invoice } from "@prisma/client";
import { create } from "zustand";

interface InvoiceStoreState {
  allInvoices: Invoice[];

  setAllInvoices: (data: Invoice[]) => void;
}

export const useFleetInvoiceStore = create<InvoiceStoreState>((set) => ({
  allInvoices: [],

  setAllInvoices: (data) => set({ allInvoices: data }),
}));
