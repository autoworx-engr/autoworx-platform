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
import {
  useOverallFaqs,
  useSaveOverallFaqs,
} from "@/hooks/ai-train/useOverallFaqs";
import PersonalityFineTuneCard from "./PersonalityFineTuneCard";

interface FAQ {
  question: string;
  answer: string;
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

  // Form states
  const [newFAQ, setNewFAQ] = useState<FAQ>({ question: "", answer: "" });
  const { data: overallFaqs = [], isLoading: faqsLoading } = useOverallFaqs();
  const saveOverallFaqs = useSaveOverallFaqs();
  const [faqs, setFaqs] = useState<FAQ[]>([]);

  // Sync fetched FAQs to local state
  useEffect(() => {
    if (overallFaqs) setFaqs(overallFaqs);
  }, [overallFaqs]);

  const handleAddFAQ = () => {
    if (!newFAQ.question.trim() || !newFAQ.answer.trim()) return;
    setFaqs((prev) => [...prev, newFAQ]);
    setNewFAQ({ question: "", answer: "" });
  };

  const handleRemoveFAQ = (index: number) => {
    setFaqs((prev) => prev.filter((_, i) => i !== index));
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
          <CompanyKnowledgeCard />
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
              <CardTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {" "}
                  <HelpCircle className="h-5 w-5" />
                  Overall FAQs
                </div>

                <div>
                  <Button
                    onClick={handleSaveFaqs}
                    disabled={saveOverallFaqs.isPending}
                    size="lg"
                  >
                    {saveOverallFaqs.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>Save Overall FAQs</>
                    )}
                  </Button>
                </div>
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
                  <div className="text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </div>
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
          <PersonalityFineTuneCard />
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
