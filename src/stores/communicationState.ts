import { create } from "zustand";

interface CommunicationStateProps {
  visibleCard: number;
  setVisibleCard(cardNo: number): void;
}

export const useCommunicationState = create<CommunicationStateProps>((set) => ({
  visibleCard: 1,
  setVisibleCard: (cardNo) =>
    set(() => ({
      visibleCard: cardNo,
    })),
}));
