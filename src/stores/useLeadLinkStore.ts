import { create } from "zustand";
import { LeadLink } from "@prisma/client";
import { getLeadLinks } from "@/actions/lead/getLeadLinks";
import { getLeadLink } from "@/actions/lead/getLeadLink";

interface LeadLinkState {
  leadLinks: LeadLink[];
  leadLink: LeadLink | null;
  fetchLeadLinks: (companyId: number) => Promise<void>;
  fetchSingleLeadLink: (companyId: number, shortUrl: string) => Promise<void>;
}

export const useLeadLinkStore = create<LeadLinkState>((set) => ({
  leadLinks: [],
  leadLink: null,
  fetchLeadLinks: async (companyId) => {
    const res = await getLeadLinks({ companyId });
    set({ leadLinks: res?.data });
  },
  fetchSingleLeadLink: async (companyId, shortUrl) => {
    const res = await getLeadLink({ companyId, shortUrl });
    set({ leadLink: res?.data });
  },
}));
