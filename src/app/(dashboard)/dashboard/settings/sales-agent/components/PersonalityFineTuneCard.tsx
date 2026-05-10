import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import { Input } from "@/components/ui/input";
import {
  Sparkles,
  User,
  Lightbulb,
  Volume2,
  MessageSquare,
  AlertTriangle,
  Brain,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAiPersonality,
  useSaveAiPersonality,
} from "@/hooks/sales-agent/useAiPersonality";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { Textarea } from "@/components/ui/textarea";
import {
  PERSONALITY_TYPES,
  SLIDER_CONFIGS,
  VOICE_TONE_OPTIONS,
} from "../constants/constants";
import SliderControl from "./SliderControl";
import PersonalityTypeCard from "./PersonalityTypeCard";
import SwitchControl from "./SwitchControl";
import { PersonalityType } from "../types/types";

export default function PersonalityFineTuneCard() {
  const { data, isLoading } = useAiPersonality();
  const saveMutation = useSaveAiPersonality();
  const [personality, setPersonality] = useState({
    personalType: "friendly_professional",
    warmth: 8,
    humor: 6,
    energy: 7,
    assistantName: "",
    useContractions: true,
    useCasualLanguage: true,
    matchCustomerTone: true,
    useEmojis: true,
    openingMessage: "",
    humanHandoffMessage: "",
    systemPrompt: "",
  });

  useEffect(() => {
    if (data && !personality.assistantName && !personality.systemPrompt) {
      setPersonality((prev) => ({ ...prev, ...data }));
    }
  }, [data]);

  const handleSliderChange = useCallback(
    (field: "warmth" | "humor" | "energy", value: number[]) => {
      setPersonality((prev) => ({ ...prev, [field]: value[0] }));
    },
    [],
  );

  const handleInputChange = useCallback(
    (
      field:
        | "assistantName"
        | "openingMessage"
        | "humanHandoffMessage"
        | "systemPrompt",
      value: string,
    ) => {
      setPersonality((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSwitchChange = useCallback(
    (
      field:
        | "useContractions"
        | "useCasualLanguage"
        | "matchCustomerTone"
        | "useEmojis",
      value: boolean,
    ) => {
      setPersonality((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handlePersonalityTypeChange = useCallback((value: string) => {
    setPersonality((prev) => ({
      ...prev,
      personalType: value as PersonalityType,
    }));
  }, []);

  const handleSave = () => {
    saveMutation.mutate(personality);
  };

  if (isLoading)
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin" />
      </div>
    );
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Choose a Personality
            </div>
            <div>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                size="lg"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>Save Personality</>
                )}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Pick a base personality - your AI will talk like a real person, not
            a robot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={personality?.personalType || "friendly_professional"}
            onValueChange={handlePersonalityTypeChange}
            className="grid gap-4 md:grid-cols-3"
          >
            {PERSONALITY_TYPES.map((type) => (
              <PersonalityTypeCard
                key={type.value}
                value={type.value}
                emoji={type.emoji}
                title={type.title}
                description={type.description}
                selectedType={type.value === personality?.personalType}
              />
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Fine-tune Personality */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Fine-tune Personality
          </CardTitle>
          <CardDescription>Adjust how your AI comes across</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {SLIDER_CONFIGS.map((config) => (
              <SliderControl
                key={config.field}
                icon={config.icon}
                label={config.label}
                value={personality[config.field]}
                onChange={(v) => handleSliderChange(config.field, v)}
                descriptions={config.descriptions}
                iconClassName={config.iconClassName}
              />
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="assistantName">Assistant Name</Label>
            <Input
              id="assistantName"
              value={personality?.assistantName || ""}
              onChange={(e) =>
                handleInputChange("assistantName", e.target.value)
              }
              placeholder="Alex"
            />
            <p className="text-xs text-muted-foreground">
              Customers will see this name in the chat header
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Voice & Tone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Voice & Tone
          </CardTitle>
          <CardDescription>
            Control how your AI communicates in conversations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {VOICE_TONE_OPTIONS.map((option) => (
            <SwitchControl
              key={option.field}
              label={option.label}
              description={option.description}
              checked={personality[option.field]}
              onChange={(val) => handleSwitchChange(option.field, val)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Opening Message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Opening Message
          </CardTitle>
          <CardDescription>
            The first message your AI sends when a customer opens the chat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Greeting Message</Label>
            <Textarea
              value={personality?.openingMessage || ""}
              onChange={(e) =>
                handleInputChange("openingMessage", e.target.value)
              }
              placeholder="Hey there! 👋 What's going on?"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to let the AI generate a greeting based on its
              personality and training.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Human Handoff Message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Human Handoff Message
          </CardTitle>
          <CardDescription>
            The message your AI sends when it needs to hand off the conversation
            to a real person
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Handoff Message</Label>
            <Textarea
              value={personality?.humanHandoffMessage || ""}
              onChange={(e) =>
                handleInputChange("humanHandoffMessage", e.target.value)
              }
              placeholder="Hey, let me get one of our team members to help you out! They'll be with you shortly 🙏"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Triggered when the AI detects slang, abusive language, or a
              request it can&apos;t handle. Leave empty for a default handoff
              response.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Advanced: System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Advanced: System Prompt
          </CardTitle>
          <CardDescription>
            Full custom instructions for the AI (for advanced users)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>System Prompt</Label>
            <Textarea
              value={personality?.systemPrompt || ""}
              onChange={(e) =>
                handleInputChange("systemPrompt", e.target.value)
              }
              placeholder={`Example:
      You are "Alex", a friendly and knowledgeable sales consultant at "[Shop Name]". 
      
      Your personality:
      - Warm and welcoming, but professional
      - Enthusiastic about cars and detailing
      - Patient with questions
      - Never pushy, but helpful in guiding toward solutions
      
      Rules:
      - Always try to understand the customer's needs before quoting
      - Ask about vehicle type, condition, and goals
      - Mention warranties and aftercare
      - Collect contact info naturally to follow up
      - If unsure about pricing, offer to have the team call back with a custom quote`}
              rows={12}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              This prompt shapes how your AI talks, thinks, and interacts. Be
              specific about personality, rules, and behaviors.
            </p>
          </div>

          {/* Tips */}
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">
                  Tips for a great system prompt:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• Give your AI a name and personality</li>
                  <li>• Define the tone (casual, professional, friendly)</li>
                  <li>• Set rules for what the AI should/shouldn't do</li>
                  <li>• Describe how to handle tricky situations</li>
                  <li>
                    • Include lead capture strategy (when to ask for contact
                    info)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
