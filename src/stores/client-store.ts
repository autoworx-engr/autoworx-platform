import { Client, ClientConversationTrack } from "@prisma/client";
import { create } from "zustand";

type TConversationType = "EMAIL" | "SMS" | "PHONE";

interface ClientCommunicationState {
  client: Client | null;
  selectedConversation: TConversationType;
  selectedVehicleIndex: number;
  clientConversationTrack: ClientConversationTrack | null;
  setClientConversationTrack: (
    clientConversationTrack?: ClientConversationTrack | null,
  ) => void;
  setClient: (client: Client | null) => void;
  setSelectedConversation: (selectedConversation: TConversationType) => void;
  setVehicleIndex(selectedVehicleIndex: number): void;
  resetClientData: () => void;
}

export const useClientCommunicationStore = create<ClientCommunicationState>(
  (set) => ({
    client: null,
    selectedConversation: "SMS",
    clientConversationTrack: null,
    selectedVehicleIndex: 0,
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
    resetClientData: () =>
      set({
        client: null,
        selectedConversation: "SMS",
        selectedVehicleIndex: 0,
        clientConversationTrack: null,
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
