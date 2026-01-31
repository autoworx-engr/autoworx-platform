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
import SmsResponseDelayCard from "./SmsResponseDelayCard";
import OverAllFaqTab from "./OverAllFaqTab";

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
          <SmsResponseDelayCard />
        </TabsContent>

        {/* 4. Overall FAQs */}
        <TabsContent value="faqs" className="space-y-6">
          <OverAllFaqTab />
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
