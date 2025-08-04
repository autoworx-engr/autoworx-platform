// store.ts
import { create } from "zustand";

// Define the store state type
interface StoreState {
  isActive: boolean;
  // toggle: () => void;
  setActive: (value: boolean) => void;
}

// Create the store with TypeScript typing
const VendorListStore = create<StoreState>((set) => ({
  // Your boolean state
  isActive: false,

  // Toggle function
  // toggle: () => set((state) => ({ isActive: !state.isActive })),

  // Set to specific value
  setActive: (value: boolean) => set({ isActive: value }),
}));

export default VendorListStore;
