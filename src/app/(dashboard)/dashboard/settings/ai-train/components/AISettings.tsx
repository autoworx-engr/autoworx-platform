"use client";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Building2,
  Plus,
  X,
  Loader2,
  Brain,
  MessageCircle,
  Upload,
  HelpCircle,
  Timer,
  BookOpen,
  Lightbulb,
  MessageSquare,
  Globe,
  RefreshCw,
  User,
  Heart,
  Smile,
  Zap,
  Volume2,
  Sparkles,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";
import { humanPersonas } from "@/lib/humanPersona";
import { PlaybooksTab } from "./playbooks/PlaybooksTab";
import { ConversationExamplesTab } from "./ConversationExamplesTab";
import { KnowledgeBaseDocumentsTab } from "./KnowledgeBaseDocumentsTab";
import { ServicePlaybook } from "@/types/ai-settings";
import ServiceFAQsSection from "./playbooks/ServiceFAQsSection";
import CompanyKnowledgeCard from "./CompanyKnowledgeCard";
import { useOverallFaqs, useSaveOverallFaqs } from "@/hooks/ai-train/useOverallFaqs";

interface FAQ {
  question: string;
  answer: string;
}

interface KBDocument {
  id: string;
  title: string;
  category: string;
  content: string;
  file_name: string | null;
  file_url: string | null;
  file_type: string | null;
  status: string;
  created_at: string;
}

interface Personality {
  warmth: number;
  humor: number;
  formality: number;
  empathy: number;
  enthusiasm: number;
}

interface ConversationStyle {
  useContractions: boolean;
  useEmojis: boolean;
  mirrorTone: boolean;
  casualLanguage: boolean;
}

interface CompanyInfo {
  id: string;
  shop_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  hours: string | null;
  about: string | null;
  policies: string | null;
  sms_response_delay_min: number;
  sms_response_delay_max: number;
  system_prompt: string | null;
  overall_faqs: FAQ[];
  website_url: string | null;
  persona_name: string;
  persona_type: string;
  opening_message: string | null;
  personality: Personality;
  conversation_style: ConversationStyle;
}

const AISettings = () => {
  const [isEditingPlaybook, setIsEditingPlaybook] = useState(false);
  const [editingPlaybook, setEditingPlaybook] = useState<
    ServicePlaybook | undefined
  >();

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [isScrapingWebsite, setIsScrapingWebsite] = useState(false);

  // Form states
  const [newFAQ, setNewFAQ] = useState<FAQ>({ question: "", answer: "" });
  const { data: overallFaqs = [], isLoading: faqsLoading } = useOverallFaqs();
  const saveOverallFaqs = useSaveOverallFaqs();
  const [faqs, setFaqs] = useState<FAQ[]>([]);

  // Sync fetched FAQs to local state
  useEffect(() => {
    if (overallFaqs) setFaqs(overallFaqs);
  }, [overallFaqs]);

  // Website scraping handler
  const handleScrapeWebsite = async () => {
    if (!companyInfo?.website_url) {
      toast.error("Please enter a website URL first.");
      return;
    }

    setIsScrapingWebsite(true);
    // try {
    //   const { data, error } = await supabase.functions.invoke(
    //     "scrape-website",
    //     {
    //       body: { url: companyInfo.website_url },
    //     },
    //   );

    //   if (error) throw error;

    //   if (!data?.success) {
    //     throw new Error(data?.error || "Failed to scrape website");
    //   }

    //   // Save scraped content to knowledge base
    //   const { error: insertError } = await supabase
    //     .from("knowledge_base_documents")
    //     .insert({
    //       title: `Website Content: ${data.data.title || companyInfo.website_url}`,
    //       category: "website",
    //       content: `${data.data.description ? `Description: ${data.data.description}\n\n` : ""}${data.data.content}`,
    //       status: "indexed",
    //     });

    //   if (insertError) throw insertError;

    //   // Refresh documents list
    //   const { data: docs } = await supabase
    //     .from("knowledge_base_documents")
    //     .select("*")
    //     .order("created_at", { ascending: false });

    //   setDocuments(docs || []);

    //   toast({
    //     title: "Website scraped!",
    //     description: "Content has been added to your knowledge base.",
    //   });
    // } catch (error) {
    //   console.error("Error scraping website:", error);
    //   toast({
    //     variant: "destructive",
    //     title: "Error scraping website",
    //     description:
    //       error instanceof Error ? error.message : "Please try again.",
    //   });
    // } finally {
    //   setIsScrapingWebsite(false);
    // }
  };

  const handleAddFAQ = () => {
    if (!newFAQ.question.trim() || !newFAQ.answer.trim()) return;
    setFaqs(prev => [...prev, newFAQ]);
    setNewFAQ({ question: "", answer: "" });
  };

  const handleRemoveFAQ = (index: number) => {
    setFaqs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveFaqs = () => {
    saveOverallFaqs.mutate(faqs);
  };

  return (
    <div>
      {/* Save Button - Fixed at top */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-2xl font-semibold text-gray-800">
          <h2>AI Settings</h2>
        </div>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="company" className="text-xs lg:text-sm">
            <Building2 className="h-4 w-4 mr-1 lg:mr-2" />
            <span className="hidden sm:inline">Company</span>
          </TabsTrigger>
          <TabsTrigger value="playbooks" className="text-xs lg:text-sm">
            <BookOpen className="h-4 w-4 mr-1 lg:mr-2" />
            <span className="hidden sm:inline">Playbooks</span>
          </TabsTrigger>
          <TabsTrigger value="examples" className="text-xs lg:text-sm">
            <MessageSquare className="h-4 w-4 mr-1 lg:mr-2" />
            <span className="hidden sm:inline">Examples</span>
          </TabsTrigger>
          <TabsTrigger value="sms" className="text-xs lg:text-sm">
            <Timer className="h-4 w-4 mr-1 lg:mr-2" />
            <span className="hidden sm:inline">SMS</span>
          </TabsTrigger>
          <TabsTrigger value="faqs" className="text-xs lg:text-sm">
            <HelpCircle className="h-4 w-4 mr-1 lg:mr-2" />
            <span className="hidden sm:inline">FAQs</span>
          </TabsTrigger>
          <TabsTrigger value="service-faqs" className="text-xs lg:text-sm">
            <MessageCircle className="h-4 w-4 mr-1 lg:mr-2" />
            <span className="hidden sm:inline">Service FAQs</span>
          </TabsTrigger>
          <TabsTrigger value="personality" className="text-xs lg:text-sm">
            <Brain className="h-4 w-4 mr-1 lg:mr-2" />
            <span className="hidden sm:inline">Personality</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs lg:text-sm">
            <Upload className="h-4 w-4 mr-1 lg:mr-2" />
            <span className="hidden sm:inline">Docs</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. Company Knowledge */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Knowledge
              </CardTitle>
              <CardDescription>
                Basic info, contact details, and policies - the foundation of
                your AI's knowledge
              </CardDescription>
            </CardHeader>
            <CardContent>
              
              <CompanyKnowledgeCard/>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Service Playbooks */}
        <TabsContent value="playbooks" className="space-y-6">
          <PlaybooksTab
            editingPlaybook={editingPlaybook}
            isEditingPlaybook={isEditingPlaybook}
            setIsEditingPlaybook={setIsEditingPlaybook}
            setEditingPlaybook={setEditingPlaybook}
          />
        </TabsContent>

        {/* 3. Conversation Examples */}
        <TabsContent value="examples" className="space-y-6">
          <ConversationExamplesTab />
        </TabsContent>

        {/* 4. SMS Response Delay */}
        <TabsContent value="sms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                SMS Response Delay
              </CardTitle>
              <CardDescription>
                Add a random delay before responding to SMS messages to make it
                feel more human-like
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Minimum Delay (seconds)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={300}
                    value={companyInfo?.sms_response_delay_min ?? 30}
                    onChange={(e) =>
                      setCompanyInfo((prev) =>
                        prev
                          ? {
                              ...prev,
                              sms_response_delay_min: Math.max(
                                0,
                                parseInt(e.target.value) || 0,
                              ),
                            }
                          : prev,
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Shortest wait time before AI responds
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Maximum Delay (seconds)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={600}
                    value={companyInfo?.sms_response_delay_max ?? 120}
                    onChange={(e) =>
                      setCompanyInfo((prev) =>
                        prev
                          ? {
                              ...prev,
                              sms_response_delay_max: Math.max(
                                0,
                                parseInt(e.target.value) || 0,
                              ),
                            }
                          : prev,
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Longest wait time (a random value in range is used)
                  </p>
                </div>
              </div>
              <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm">
                  <strong>Current setting:</strong> The AI will wait between{" "}
                  <Badge variant="outline">
                    {companyInfo?.sms_response_delay_min ?? 30}s
                  </Badge>{" "}
                  and{" "}
                  <Badge variant="outline">
                    {companyInfo?.sms_response_delay_max ?? 120}s
                  </Badge>{" "}
                  before sending a response, simulating natural typing and
                  thinking time.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Overall FAQs */}
        <TabsContent value="faqs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Overall FAQs
              </CardTitle>
              <CardDescription>
                General frequently asked questions about booking, appointments,
                payments, etc.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Existing FAQs */}
              <div className="space-y-3">
                {faqsLoading ? (
                  <div>Loading...</div>
                ) : faqs.length > 0 ? (
                  faqs.map((faq, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-lg bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            {faq.question}
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            {faq.answer}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => handleRemoveFAQ(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                    <HelpCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>
                      No FAQs added yet. Add common questions your customers
                      ask.
                    </p>
                  </div>
                )}
              </div>

              {/* Add new FAQ */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Add New FAQ</h4>
                <div className="space-y-3">
                  <Input
                    value={newFAQ.question}
                    onChange={(e) =>
                      setNewFAQ((prev) => ({
                        ...prev,
                        question: e.target.value,
                      }))
                    }
                    placeholder="e.g., How do I book an appointment?"
                  />
                  <Textarea
                    value={newFAQ.answer}
                    onChange={(e) =>
                      setNewFAQ((prev) => ({ ...prev, answer: e.target.value }))
                    }
                    placeholder="e.g., You can book online at our website, call us, or text this number and we'll help you schedule!"
                    rows={3}
                  />
                  <Button onClick={handleAddFAQ}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add FAQ
                  </Button>
                </div>
              </div>

              {/* Save FAQs Button */}
              <div className="flex justify-end">
                <Button onClick={handleSaveFaqs} >
                   <Save className="mr-2 h-4 w-4" />
                  Save FAQs
                </Button>
              </div>

              {/* Example FAQs */}
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Example FAQs to add:</p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                      <li>• "How do I book an appointment?"</li>
                      <li>• "What payment methods do you accept?"</li>
                      <li>• "Do I need to leave my car overnight?"</li>
                      <li>• "What's your cancellation policy?"</li>
                      <li>• "Do you offer financing?"</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. Service-Based FAQs */}
        <TabsContent value="service-faqs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Service-Based FAQs
              </CardTitle>
              <CardDescription>
                FAQs specific to each service (warranty, care instructions,
                etc.) are managed in Service Playbooks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ServiceFAQsSection
                editingPlaybook={editingPlaybook}
                isEditingPlaybook={isEditingPlaybook}
                setIsEditingPlaybook={setIsEditingPlaybook}
                setEditingPlaybook={setEditingPlaybook}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. Personality, Voice & Tone, Opening Message */}
        <TabsContent value="personality" className="space-y-6">
          {/* Choose a Personality Preset */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Choose a Personality
              </CardTitle>
              <CardDescription>
                Pick a base personality - your AI will talk like a real person,
                not a robot
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={companyInfo?.persona_type || "friendly_professional"}
                onValueChange={(val) => {
                  const persona = humanPersonas[val];
                  if (persona && companyInfo) {
                    setCompanyInfo({
                      ...companyInfo,
                      persona_type: val,
                      persona_name: persona.name,
                      personality: {
                        warmth: persona.personality.warmth,
                        humor: persona.personality.humor,
                        formality: persona.personality.formality,
                        empathy: persona.personality.empathy,
                        enthusiasm: persona.personality.enthusiasm,
                      },
                      conversation_style: {
                        useContractions:
                          persona.conversationRules.useContrations,
                        useEmojis: persona.conversationRules.useEmojis,
                        mirrorTone:
                          persona.conversationRules.mirrorCustomerTone,
                        casualLanguage: persona.conversationRules.useSlang,
                      },
                    });
                  }
                }}
                className="grid gap-4 md:grid-cols-3"
              >
                <Label
                  htmlFor="friendly_professional"
                  className={`flex flex-col items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                    companyInfo?.persona_type === "friendly_professional"
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
                    companyInfo?.persona_type === "casual_expert"
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
                    companyInfo?.persona_type === "warm_helpful"
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
                      {companyInfo?.personality?.warmth ?? 8}/10
                    </span>
                  </div>
                  <Slider
                    value={[companyInfo?.personality?.warmth ?? 8]}
                    onValueChange={(v) =>
                      setCompanyInfo((prev) =>
                        prev
                          ? {
                              ...prev,
                              personality: {
                                ...prev.personality,
                                warmth: v[0],
                              },
                            }
                          : prev,
                      )
                    }
                    max={10}
                    min={1}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    {(companyInfo?.personality?.warmth ?? 8) >= 7
                      ? "Very friendly and approachable"
                      : (companyInfo?.personality?.warmth ?? 8) >= 4
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
                      {companyInfo?.personality?.humor ?? 6}/10
                    </span>
                  </div>
                  <Slider
                    value={[companyInfo?.personality?.humor ?? 6]}
                    onValueChange={(v) =>
                      setCompanyInfo((prev) =>
                        prev
                          ? {
                              ...prev,
                              personality: { ...prev.personality, humor: v[0] },
                            }
                          : prev,
                      )
                    }
                    max={10}
                    min={1}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    {(companyInfo?.personality?.humor ?? 6) >= 7
                      ? "Will crack jokes and be playful"
                      : (companyInfo?.personality?.humor ?? 6) >= 4
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
                      {companyInfo?.personality?.enthusiasm ?? 7}/10
                    </span>
                  </div>
                  <Slider
                    value={[companyInfo?.personality?.enthusiasm ?? 7]}
                    onValueChange={(v) =>
                      setCompanyInfo((prev) =>
                        prev
                          ? {
                              ...prev,
                              personality: {
                                ...prev.personality,
                                enthusiasm: v[0],
                              },
                            }
                          : prev,
                      )
                    }
                    max={10}
                    min={1}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    {(companyInfo?.personality?.enthusiasm ?? 7) >= 7
                      ? "High energy, gets excited about projects"
                      : (companyInfo?.personality?.enthusiasm ?? 7) >= 4
                        ? "Balanced enthusiasm"
                        : "Calm and measured"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="personaName">Assistant Name</Label>
                <Input
                  id="personaName"
                  value={companyInfo?.persona_name || ""}
                  onChange={(e) =>
                    setCompanyInfo((prev) =>
                      prev ? { ...prev, persona_name: e.target.value } : prev,
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
                    companyInfo?.conversation_style?.useContractions ?? true
                  }
                  onCheckedChange={(checked) =>
                    setCompanyInfo((prev) =>
                      prev
                        ? {
                            ...prev,
                            conversation_style: {
                              ...prev.conversation_style,
                              useContractions: checked,
                            },
                          }
                        : prev,
                    )
                  }
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
                    companyInfo?.conversation_style?.casualLanguage ?? true
                  }
                  onCheckedChange={(checked) =>
                    setCompanyInfo((prev) =>
                      prev
                        ? {
                            ...prev,
                            conversation_style: {
                              ...prev.conversation_style,
                              casualLanguage: checked,
                            },
                          }
                        : prev,
                    )
                  }
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
                  checked={companyInfo?.conversation_style?.mirrorTone ?? true}
                  onCheckedChange={(checked) =>
                    setCompanyInfo((prev) =>
                      prev
                        ? {
                            ...prev,
                            conversation_style: {
                              ...prev.conversation_style,
                              mirrorTone: checked,
                            },
                          }
                        : prev,
                    )
                  }
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
                  checked={companyInfo?.conversation_style?.useEmojis ?? true}
                  onCheckedChange={(checked) =>
                    setCompanyInfo((prev) =>
                      prev
                        ? {
                            ...prev,
                            conversation_style: {
                              ...prev.conversation_style,
                              useEmojis: checked,
                            },
                          }
                        : prev,
                    )
                  }
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
                  value={companyInfo?.opening_message || ""}
                  onChange={(e) =>
                    setCompanyInfo((prev) =>
                      prev
                        ? { ...prev, opening_message: e.target.value }
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
                  value={companyInfo?.system_prompt || ""}
                  onChange={(e) =>
                    setCompanyInfo((prev) =>
                      prev ? { ...prev, system_prompt: e.target.value } : prev,
                    )
                  }
                  placeholder={`Example:
You are ${companyInfo?.persona_name || "Alex"}, a friendly and knowledgeable sales consultant at ${companyInfo?.shop_name || "[Shop Name]"}. 

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
        </TabsContent>

        {/* 7. Document Uploads */}
        <TabsContent value="documents" className="space-y-6">
          <KnowledgeBaseDocumentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AISettings;
