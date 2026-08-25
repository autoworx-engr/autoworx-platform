import { Client, ClientConversationTrack } from "@prisma/client";
import { create } from "zustand";

type TConversationType = "EMAIL" | "SMS" | "PHONE";

interface ClientCommunicationState {
  client: Client | null;
  selectedConversation: TConversationType;
  selectedVehicleIndex: number;
  clientConversationTrack: ClientConversationTrack | null;
  clientTrackUpdate: ClientConversationTrack | null;
  upcomingAppointmentCount: number | null;
  pendingTaskCount: number | null;
  setClientConversationTrack: (
    clientConversationTrack?: ClientConversationTrack | null,
  ) => void;
  setClientTrackUpdate: (
    clientTrackUpdate?: ClientConversationTrack | null,
  ) => void;
  setClient: (client: Client | null) => void;
  setSelectedConversation: (selectedConversation: TConversationType) => void;
  setVehicleIndex(selectedVehicleIndex: number): void;
  setUpcomingAppointmentCount: (count: number | null) => void;
  setPendingTaskCount: (count: number | null) => void;
  resetClientData: () => void;
}

export const useClientCommunicationStore = create<ClientCommunicationState>(
  (set) => ({
    client: null,
    selectedConversation: "SMS",
    clientConversationTrack: null,
    clientTrackUpdate: null,
    selectedVehicleIndex: 0,
    upcomingAppointmentCount: null,
    pendingTaskCount: null,
    setClientConversationTrack: (clientConversationTrack) =>
      set({ clientConversationTrack }),
    setClientTrackUpdate: (clientTrackUpdate) => set({ clientTrackUpdate }),
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
    setPendingTaskCount: (pendingTaskCount) => set({ pendingTaskCount }),
    resetClientData: () =>
      set({
        client: null,
        selectedConversation: "SMS",
        selectedVehicleIndex: 0,
        clientConversationTrack: null,
        clientTrackUpdate: null,
        upcomingAppointmentCount: null,
        pendingTaskCount: null,
      }),
  }),
);

export const clientListStore = create<{
  bumpedClient: { clientId: number; nonce: number } | null;
  bumpClientToTop: (clientId: number) => void;
}>((set) => ({
  bumpedClient: null,
  bumpClientToTop: (clientId) =>
    set((state) => ({
      bumpedClient: {
        clientId,
        nonce: (state.bumpedClient?.nonce ?? 0) + 1,
      },
    })),
}));
