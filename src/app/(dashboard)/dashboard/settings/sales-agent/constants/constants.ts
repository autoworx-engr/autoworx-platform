import { Heart, MessageSquare, Smile, Volume2, Zap } from "lucide-react";
import {
  PersonalityTypeOption,
  SliderConfig,
  VoiceToneOption,
} from "../types/types";

export const PERSONALITY_TYPES: PersonalityTypeOption[] = [
  {
    value: "friendly_professional",
    emoji: "😊",
    title: "Friendly & Professional",
    description: "Warm, helpful, knows their stuff. Like a friendly expert.",
  },
  {
    value: "casual_enthusiastic",
    emoji: "🤙",
    title: "Casual & Enthusiastic",
    description: "Super chill, loves cars, talks like your buddy.",
  },
  {
    value: "warm_caring",
    emoji: "💝",
    title: "Warm & Caring",
    description: "Patient, empathetic, makes everyone feel welcome.",
  },
];

export const SLIDER_CONFIGS: SliderConfig[] = [
  {
    field: "warmth",
    icon: Heart,
    label: "Warmth",
    descriptions: {
      high: "Very friendly and approachable",
      medium: "Pleasant but professional",
      low: "More reserved and formal",
    },
    iconClassName: "text-pink-500",
  },
  {
    field: "humor",
    icon: Smile,
    label: "Humor",
    descriptions: {
      high: "Will crack jokes and be playful",
      medium: "Light humor when appropriate",
      low: "Keeps it strictly business",
    },
    iconClassName: "text-yellow-500",
  },
  {
    field: "energy",
    icon: Zap,
    label: "Energy",
    descriptions: {
      high: "High energy, gets excited about projects",
      medium: "Balanced enthusiasm",
      low: "Calm and measured",
    },
    iconClassName: "text-orange-500",
  },
];

export const VOICE_TONE_OPTIONS: VoiceToneOption[] = [
  {
    field: "useContractions",
    label: "Use contractions",
    description: '"I\'m" instead of "I am"',
  },
  {
    field: "useCasualLanguage",
    label: "Use casual language",
    description: '"Sounds good!", "No worries", "Gotcha"',
  },
  {
    field: "matchCustomerTone",
    label: "Match customer's tone",
    description: "Mirror their energy and formality level",
  },
  {
    field: "useEmojis",
    label: "Use emojis in chat",
    description: "Adds personality to text messages",
  },
];
