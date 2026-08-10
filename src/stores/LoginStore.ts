import { create } from "zustand";

interface LoginStore {
  showTwoFactor: boolean;
  email: string;
  password: string;
  setShowTwoFactor: (showTwoFactor: boolean) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  clearStore: () => void;
}

export const useLoginStore = create<LoginStore>((set) => ({
  showTwoFactor: false,
  email: "",
  password: "",
  setShowTwoFactor: (showTwoFactor) => set({ showTwoFactor }),
  setEmail: (email) => set({ email }),
  setPassword: (password) => set({ password }),
  clearStore: () => set({ showTwoFactor: false, email: "", password: "" }),
}));
