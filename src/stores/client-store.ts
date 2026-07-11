import { Client, ClientConversationTrack } from "@prisma/client";
import { create } from "zustand";

type TConversationType = "EMAIL" | "SMS" | "PHONE";

interface ClientCommunicationState {
  client: Client | null;
  selectedConversation: TConversationType;
  selectedVehicleIndex: number;
  clientConversationTrack: ClientConversationTrack | null;
  upcomingAppointmentCount: number | null;
  setClientConversationTrack: (
    clientConversationTrack?: ClientConversationTrack | null,
  ) => void;
  setClient: (client: Client | null) => void;
  setSelectedConversation: (selectedConversation: TConversationType) => void;
  setVehicleIndex(selectedVehicleIndex: number): void;
  setUpcomingAppointmentCount: (count: number | null) => void;
  resetClientData: () => void;
}

export const useClientCommunicationStore = create<ClientCommunicationState>(
  (set) => ({
    client: null,
    selectedConversation: "SMS",
    clientConversationTrack: null,
    selectedVehicleIndex: 0,
    upcomingAppointmentCount: null,
    setClientConversationTrack: (clientConversationTrack) =>
      set({ clientConversationTrack }),
    setClient: (client) => set({ client }),
    setSelectedConversation: (selectedConversation) =>
      set({ selectedConversation }),
    setVehicleIndex: (selectedVehicleIndex) =>
      set((state) => ({
        selectedVehicleIndex:
          selectedVehicleIndex ?? state.selectedVehicleIndex,
      })),
    setUpcomingAppointmentCount: (upcomingAppointmentCount) =>
      set({ upcomingAppointmentCount }),
    resetClientData: () =>
      set({
        client: null,
        selectedConversation: "SMS",
        selectedVehicleIndex: 0,
        clientConversationTrack: null,
        upcomingAppointmentCount: null,
      }),
  }),
);

export const clientListStore = create<{
  clientList: Client[];
  setClientList: (clientList: Client[]) => void;
}>((set) => ({
  clientList: [],
  setClientList: (clientList) => set({ clientList }),
}));
