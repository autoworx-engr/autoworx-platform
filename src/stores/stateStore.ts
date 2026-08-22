import { create } from "zustand";

interface State {
  isClientOpen: boolean;
  setIsClientOpen: (isOpen: boolean) => void;
  isEmployeeOpen?: boolean;
  setIsEmployeeOpen?: (isOpen: boolean) => void;
  isVehicleOpen?: boolean;
  setIsVehicleOpen?: (isOpen: boolean) => void;
  isAppointmentOpen?: boolean;
  setIsAppointmentOpen?: (isOpen: boolean) => void;
  isBugOpen: boolean;
  setIsBugOpen: (isOpen: boolean) => void;
  isNewBugOpen: boolean;
  setIsNewBugOpen: (isOpen: boolean) => void;
  isUploadLeadOpen: boolean;
  setIsUploadLeadOpen: (isOpen: boolean) => void;
  isUploadCannedOpen: boolean;
  setIsUploadCannedOpen: (isOpen: boolean) => void;
}

export const stateStore = create<State>((set) => ({
  isClientOpen: false,
  setIsClientOpen: (isOpen) => set({ isClientOpen: isOpen }),
  isEmployeeOpen: false,
  setIsEmployeeOpen: (isOpen) => set({ isEmployeeOpen: isOpen }),
  isVehicleOpen: false,
  setIsVehicleOpen: (isOpen) => set({ isVehicleOpen: isOpen }),
  isAppointmentOpen: false,
  setIsAppointmentOpen: (isOpen) => set({ isAppointmentOpen: isOpen }),
  isBugOpen: false,
  setIsBugOpen: (isOpen) => set({ isBugOpen: isOpen }),
  isNewBugOpen: false,
  setIsNewBugOpen: (isOpen: boolean) => set({ isNewBugOpen: isOpen }),
  isUploadLeadOpen: false,
  setIsUploadLeadOpen: (isOpen: boolean) => set({ isUploadLeadOpen: isOpen }),
  isUploadCannedOpen: false,
  setIsUploadCannedOpen: (isOpen: boolean) =>
    set({ isUploadCannedOpen: isOpen }),
}));
