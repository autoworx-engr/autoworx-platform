// stores/useTwilioStore.ts
import { create } from "zustand";

type TwilioCredentials = {
  id: string;
  companyId: number;
  accountSid: string;
  phoneNumber: string;
};

type TwilioStore = {
  credentials: TwilioCredentials | null;
  fetchCredentials: () => Promise<void>;
};

export const useTwilioStore = create<TwilioStore>((set) => ({
  credentials: null,

  fetchCredentials: async () => {
    try {
      const res = await fetch(`/api/twilio`);
      const data = await res.json();
      set({ credentials: data });
    } catch (error) {
      console.error("Failed to fetch Twilio credentials", error);
    }
  },
}));
