import { getServices } from "@/actions/estimate/service/getServices";
import { Service } from "@prisma/client";
import { create } from "zustand";

type ServiceOption = {
  id: number;
  title: string;
};
interface ServiceState {
  services: Service[];
  serviceOptions: ServiceOption[];
  loading: boolean;
  fetchServices: () => Promise<void>;
}
export const useServiceStore = create<ServiceState>((set) => ({
  services: [],
  serviceOptions: [],
  loading: false,
  fetchServices: async () => {
    set({ loading: true });
    try {
      const res = await getServices();
      const formattedOptions = res.map((service) => ({
        id: service.id,
        title: service.name,
      }));

      set({
        services: res,
        serviceOptions: formattedOptions,
        loading: false,
      });
    } catch (error) {
      console.error("Failed to fetch services:", error);
      set({ loading: false });
    }
  },
}));
