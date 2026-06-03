export type PersonalityType =
  | "friendly_professional"
  | "casual_enthusiastic"
  | "warm_caring";

export interface Personality {
  personalType: PersonalityType;
  warmth: number; // 1-10
  humor: number; // 1-10
  energy: number; // 1-10
  assistantName: string;
  useContractions: boolean;
  useCasualLanguage: boolean;
  matchCustomerTone: boolean;
  useEmojis: boolean;
  openingMessage: string;
  humanHandoffMessage: string;
  systemPrompt: string;
}

export type PersonalityField = keyof Personality;

export interface SliderConfig {
  field: "warmth" | "humor" | "energy";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  descriptions: {
    high: string;
    medium: string;
    low: string;
  };
  iconClassName: string;
}

export interface VoiceToneOption {
  field:
    | "useContractions"
    | "useCasualLanguage"
    | "matchCustomerTone"
    | "useEmojis";
  label: string;
  description: string;
}

export interface PersonalityTypeOption {
  value: PersonalityType;
  emoji: string;
  title: string;
  description: string;
}
