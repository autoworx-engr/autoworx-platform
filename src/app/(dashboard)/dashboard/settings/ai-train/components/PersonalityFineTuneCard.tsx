import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Sparkles, Heart, Smile, Zap, User, Lightbulb, Volume2, MessageSquare, Brain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAiPersonality, useSaveAiPersonality } from "@/hooks/ai-train/useAiPersonality";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";


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
    systemPrompt: ""
  });

useEffect(() => {
    if (data && !personality.assistantName && !personality.systemPrompt) {
    setPersonality((prev) => ({ ...prev, ...data }));
  }
  }, [data]);

const handleSave = () => {
    saveMutation.mutate(personality);
  };

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
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
                                                              disabled={
                                                                saveMutation.isPending 
                                                              }
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
                      Pick a base personality - your AI will talk like a real person,
                      not a robot
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup
                      value={personality?.personalType || "friendly_professional"}
                      onValueChange={(val) => setPersonality({ ...personality, personalType: val })}
                      className="grid gap-4 md:grid-cols-3"
                    >
                      <Label
                        htmlFor="friendly_professional"
                        className={`flex flex-col items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                          personality?.personalType === "friendly_professional"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <RadioGroupItem
                          value="friendly_professional"
                          id="friendly_professional"
                          className="sr-only"
                        />
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                          😊
                        </div>
                        <div className="text-center">
                          <p className="font-semibold">Friendly & Professional</p>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          Warm, helpful, knows their stuff. Like a friendly expert.
                        </p>
                      </Label>
      
                      <Label
                        htmlFor="casual_expert"
                        className={`flex flex-col items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                          personality?.personalType === "casual_expert"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <RadioGroupItem
                          value="casual_expert"
                          id="casual_expert"
                          className="sr-only"
                        />
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                          🤙
                        </div>
                        <div className="text-center">
                          <p className="font-semibold">Casual & Enthusiastic</p>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          Super chill, loves cars, talks like your buddy.
                        </p>
                      </Label>
      
                      <Label
                        htmlFor="warm_helpful"
                        className={`flex flex-col items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                          personality?.personalType === "warm_helpful"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <RadioGroupItem
                          value="warm_helpful"
                          id="warm_helpful"
                          className="sr-only"
                        />
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                          💝
                        </div>
                        <div className="text-center">
                          <p className="font-semibold">Warm & Caring</p>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          Patient, empathetic, makes everyone feel welcome.
                        </p>
                      </Label>
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
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            <Heart className="h-4 w-4 text-pink-500" />
                            Warmth
                          </Label>
                          <span className="text-sm text-muted-foreground">
                            {personality?.warmth ?? 8}/10
                          </span>
                        </div>
                        <Slider
                         value={[personality.warmth]} 
                onValueChange={(v) => setPersonality({ ...personality, warmth: v[0] })}
                          max={10}
                          min={1}
                          step={1}
                        />
                        <p className="text-xs text-muted-foreground">
                          {(personality?.warmth ?? 8) >= 7
                            ? "Very friendly and approachable"
                            : (personality?.warmth ?? 8) >= 4
                              ? "Pleasant but professional"
                              : "More reserved and formal"}
                        </p>
                      </div>
      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            <Smile className="h-4 w-4 text-yellow-500" />
                            Humor
                          </Label>
                          <span className="text-sm text-muted-foreground">
                            {personality?.humor ?? 6}/10
                          </span>
                        </div>
                        <Slider
                          value={[personality?.humor ?? 6]}
                          onValueChange={(v) => setPersonality({ ...personality, humor: v[0] })}
                          max={10}
                          min={1}
                          step={1}
                        />
                        <p className="text-xs text-muted-foreground">
                          {(personality?.humor ?? 6) >= 7
                            ? "Will crack jokes and be playful"
                            : (personality?.humor ?? 6) >= 4
                              ? "Light humor when appropriate"
                              : "Keeps it strictly business"}
                        </p>
                      </div>
      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-orange-500" />
                            Energy
                          </Label>
                          <span className="text-sm text-muted-foreground">
                            {personality?.energy ?? 7}/10
                          </span>
                        </div>
                        <Slider
                          value={[personality?.energy ?? 7]}
                          onValueChange={(v) => setPersonality({ ...personality, energy: v[0] })}
                          max={10}
                          min={1}
                          step={1}
                        />
                        <p className="text-xs text-muted-foreground">
                          {(personality?.energy ?? 7) >= 7
                            ? "High energy, gets excited about projects"
                            : (personality?.energy ?? 7) >= 4
                              ? "Balanced enthusiasm"
                              : "Calm and measured"}
                        </p>
                      </div>
                    </div>
      
                    <div className="space-y-2">
                      <Label htmlFor="personaName">Assistant Name</Label>
                      <Input
                        id="personaName"
                        value={personality?.assistantName || ""}
                        onChange={(e) =>
                          setPersonality((prev) =>
                            prev ? { ...prev, assistantName: e.target.value } : prev,
                          )
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
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div>
                        <Label className="text-base">Use contractions</Label>
                        <p className="text-sm text-muted-foreground">
                          "I'm" instead of "I am"
                        </p>
                      </div>
                      <Switch
                        checked={
                          personality?.useContractions ?? true
                        }
                       onCheckedChange={(val) => setPersonality({ ...personality, useContractions: val })}
                      />
                    </div>
      
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div>
                        <Label className="text-base">Use casual language</Label>
                        <p className="text-sm text-muted-foreground">
                          "Sounds good!", "No worries", "Gotcha"
                        </p>
                      </div>
                      <Switch
                        checked={
                          personality?.useCasualLanguage ?? true
                        }
                        onCheckedChange={(val) => setPersonality({ ...personality, useCasualLanguage: val })}
                      />
                                  
                    
                    </div>
      
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div>
                        <Label className="text-base">Match customer's tone</Label>
                        <p className="text-sm text-muted-foreground">
                          Mirror their energy and formality level
                        </p>
                      </div>
                      <Switch
                        checked={personality?.matchCustomerTone ?? true}
                        onCheckedChange={(val) => setPersonality({ ...personality, matchCustomerTone: val })}
                                  
                      />
                    </div>
      
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div>
                        <Label className="text-base">Use emojis in chat</Label>
                        <p className="text-sm text-muted-foreground">
                          Adds personality to text messages
                        </p>
                      </div>
                      <Switch
                        checked={personality?.useEmojis ?? true}
                        onCheckedChange={(val) => setPersonality({ ...personality, useEmojis: val })}
                                 
                      />
                    </div>
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
                          setPersonality((prev) =>
                            prev
                              ? { ...prev, openingMessage: e.target.value }
                              : prev,
                          )
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
                          setPersonality((prev) =>
                            prev ? { ...prev, systemPrompt: e.target.value } : prev,
                          )
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
                        This prompt shapes how your AI talks, thinks, and interacts.
                        Be specific about personality, rules, and behaviors.
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
                            <li>
                              • Define the tone (casual, professional, friendly)
                            </li>
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
