import { getVehicles } from "@/actions/vehicle/getVehicles";
import { Vehicle } from "@prisma/client";
import { create } from "zustand";

type VehicleStoreProps = {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  fetchVehicles: () => Promise<void>;
};

export const useVehicleStore = create<VehicleStoreProps>((set) => ({
  vehicles: [],
  loading: false,
  error: null,

  fetchVehicles: async () => {
    set({ loading: true, error: null });

    try {
      const response = await getVehicles();

      set({ vehicles: response.data, loading: false });
    } catch (err: any) {
      set({ error: err.message || "Unknown error", loading: false });
    }
  },
}));
