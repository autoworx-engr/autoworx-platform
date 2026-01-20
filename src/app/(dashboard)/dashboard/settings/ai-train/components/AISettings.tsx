"use client";
import { useState, useEffect } from "react";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ServicePlaybook } from "@/types/ai-settings";
// import { humanPersonas } from "@/lib/humanPersona";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  Save,
  Plus,
  X,
  Loader2,
  FileText,
  Brain,
  MessageCircle,
  Upload,
  HelpCircle,
  Timer,
  Search,
  Trash2,
  BookOpen,
  Lightbulb,
  CheckCircle,
  Filter,
  Image,
  MessageSquare,
  Globe,
  RefreshCw,
  User,
  Heart,
  Smile,
  Zap,
  Volume2,
  Sparkles,
} from "lucide-react";
import { PlaybookEditor } from "./playbooks/PlaybookEditor";
import { PlaybookCard } from "./playbooks/PlaybookCard";
import toast from "react-hot-toast";
import { humanPersonas } from "@/lib/humanPersona";

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

interface ConversationExample {
  id: string;
  image_url: string;
  extracted_text: string | null;
  notes: string | null;
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

interface DBPlaybook {
  id: string;
  service_name: string;
  category: string;
  overview: string | null;
  pricing_rules: any;
  intake_questions: any;
  faqs: any;
  upsells: any;
  do_say: any;
  dont_say: any;
  warranty_policy: string | null;
  time_estimate: string | null;
  scheduling_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function convertToServicePlaybook(db: DBPlaybook): ServicePlaybook {
  return {
    id: db.id,
    shop_id: "default",
    service_name: db.service_name,
    category: db.category as any,
    overview: db.overview || "",
    pricing_rules: db.pricing_rules || [],
    intake_questions: db.intake_questions || [],
    faqs: db.faqs || [],
    upsells: db.upsells || [],
    do_say: db.do_say || [],
    dont_say: db.dont_say || [],
    warranty_policy: db.warranty_policy || "",
    time_estimate: db.time_estimate || "",
    scheduling_notes: db.scheduling_notes || "",
    is_active: db.is_active,
    created_at: db.created_at,
    updated_at: db.updated_at,
  };
}

const documentExamples = [
  {
    title: "Price List PDF",
    description: "Upload your detailed pricing sheet",
  },
  {
    title: "Service Menu",
    description: "Complete list of services with descriptions",
  },
  {
    title: "Warranty Documentation",
    description: "Warranty terms for each service type",
  },
  {
    title: "FAQ Document",
    description: "Common questions and answers from customers",
  },
  {
    title: "Training Materials",
    description: "Internal guides on service procedures",
  },
  {
    title: "Product Spec Sheets",
    description: "Manufacturer info for products used",
  },
];

const AISettings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [playbooks, setPlaybooks] = useState<ServicePlaybook[]>([]);
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [conversationExamples, setConversationExamples] = useState<
    ConversationExample[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [playbookSearchQuery, setPlaybookSearchQuery] = useState("");
  const [isUploadingExample, setIsUploadingExample] = useState(false);
  const [isScrapingWebsite, setIsScrapingWebsite] = useState(false);

  // Playbook editor state
  const [isEditingPlaybook, setIsEditingPlaybook] = useState(false);
  const [editingPlaybook, setEditingPlaybook] = useState<
    ServicePlaybook | undefined
  >();

  // Form states
  const [newFAQ, setNewFAQ] = useState<FAQ>({ question: "", answer: "" });
  const [newDoc, setNewDoc] = useState({
    title: "",
    category: "general",
    content: "",
  });

  const handleSaveAll = async () => {};

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

  // Playbook handlers
  const handleCreatePlaybook = () => {
    setEditingPlaybook(undefined);
    setIsEditingPlaybook(true);
  };

  const handleEditPlaybook = (playbook: ServicePlaybook) => {
    setEditingPlaybook(playbook);
    setIsEditingPlaybook(true);
  };

  const handleSavePlaybook = async (data: Partial<ServicePlaybook>) => {};

  const handleDeletePlaybook = async (playbook: ServicePlaybook) => {};

  const handleTogglePlaybook = async (playbook: ServicePlaybook) => {};

  const handleAddFAQ = () => {
    if (!newFAQ.question.trim() || !newFAQ.answer.trim() || !companyInfo)
      return;
    setCompanyInfo({
      ...companyInfo,
      overall_faqs: [...companyInfo.overall_faqs, newFAQ],
    });
    setNewFAQ({ question: "", answer: "" });
  };

  const handleRemoveFAQ = (index: number) => {
    if (!companyInfo) return;
    setCompanyInfo({
      ...companyInfo,
      overall_faqs: companyInfo.overall_faqs.filter((_, i) => i !== index),
    });
  };

  const handleAddDocument = async () => {
    if (!newDoc.title.trim() || !newDoc.content.trim()) {
      toast.error("Please enter a title and content.");
      return;
    }
  };

  const handleDeleteDocument = async (id: string) => {};

  const handleUploadConversationExample = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, etc.)");
      return;
    }

    setIsUploadingExample(true);
  };

  const handleDeleteConversationExample = async (
    id: string,
    imageUrl: string,
  ) => {};

  const handleUpdateExampleNotes = async (id: string, notes: string) => {};

  const filteredDocs = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredPlaybooks = playbooks.filter(
    (pb) =>
      pb.service_name
        .toLowerCase()
        .includes(playbookSearchQuery.toLowerCase()) ||
      pb.category.toLowerCase().includes(playbookSearchQuery.toLowerCase()),
  );

  const activePlaybooks = playbooks.filter((p) => p.is_active);

  const categories = ["general", "services", "pricing", "policies", "faq"];

  // if (isLoading) {
  //   return (
  //     <div>
  //       <div className="flex items-center justify-center h-64">
  //         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  //       </div>
  //     </div>
  //   );
  // }

  // Show playbook editor fullscreen when editing
  if (isEditingPlaybook) {
    return (
      <div>
        <PlaybookEditor
          playbook={editingPlaybook}
          onSave={handleSavePlaybook}
          onCancel={() => {
            setIsEditingPlaybook(false);
            setEditingPlaybook(undefined);
          }}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Save Button - Fixed at top */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-2xl font-semibold text-gray-800">
          <h2>AI Settings</h2>
        </div>
        <Button onClick={handleSaveAll} disabled={isSaving} size="lg">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save All Training Data
            </>
          )}
        </Button>
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
              <div className="grid gap-6 md:grid-cols-2">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wide">
                    Basic Information
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Shop Name</Label>
                      <Input
                        value={companyInfo?.shop_name || ""}
                        onChange={(e) =>
                          setCompanyInfo((prev) =>
                            prev
                              ? { ...prev, shop_name: e.target.value }
                              : prev,
                          )
                        }
                        placeholder="Your shop name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Phone className="h-4 w-4" /> Phone
                      </Label>
                      <Input
                        value={companyInfo?.phone || ""}
                        onChange={(e) =>
                          setCompanyInfo((prev) =>
                            prev ? { ...prev, phone: e.target.value } : prev,
                          )
                        }
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Mail className="h-4 w-4" /> Email
                      </Label>
                      <Input
                        value={companyInfo?.email || ""}
                        onChange={(e) =>
                          setCompanyInfo((prev) =>
                            prev ? { ...prev, email: e.target.value } : prev,
                          )
                        }
                        placeholder="info@yourshop.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Address
                      </Label>
                      <Input
                        value={companyInfo?.address || ""}
                        onChange={(e) =>
                          setCompanyInfo((prev) =>
                            prev ? { ...prev, address: e.target.value } : prev,
                          )
                        }
                        placeholder="123 Main St, City, State"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Business Hours
                      </Label>
                      <Input
                        value={companyInfo?.hours || ""}
                        onChange={(e) =>
                          setCompanyInfo((prev) =>
                            prev ? { ...prev, hours: e.target.value } : prev,
                          )
                        }
                        placeholder="Mon-Fri 9am-6pm, Sat 10am-4pm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Globe className="h-4 w-4" /> Website URL
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={companyInfo?.website_url || ""}
                          onChange={(e) =>
                            setCompanyInfo((prev) =>
                              prev
                                ? { ...prev, website_url: e.target.value }
                                : prev,
                            )
                          }
                          placeholder="https://yourshop.com"
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleScrapeWebsite}
                          disabled={
                            isScrapingWebsite || !companyInfo?.website_url
                          }
                          title="Scrape website content for AI training"
                        >
                          {isScrapingWebsite ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Click the refresh button to scrape your website content
                        for AI training
                      </p>
                    </div>
                  </div>
                </div>

                {/* About & Policies */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wide">
                    About & Policies
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>About Your Shop</Label>
                      <Textarea
                        value={companyInfo?.about || ""}
                        onChange={(e) =>
                          setCompanyInfo((prev) =>
                            prev ? { ...prev, about: e.target.value } : prev,
                          )
                        }
                        placeholder="Tell customers about your shop, experience, certifications, what makes you special..."
                        rows={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Policies & Notes</Label>
                      <Textarea
                        value={companyInfo?.policies || ""}
                        onChange={(e) =>
                          setCompanyInfo((prev) =>
                            prev ? { ...prev, policies: e.target.value } : prev,
                          )
                        }
                        placeholder="Deposit requirements, cancellation policy, general warranty info, payment methods..."
                        rows={5}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Service Playbooks */}
        <TabsContent value="playbooks" className="space-y-6">
          <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search playbooks..."
                  value={playbookSearchQuery}
                  onChange={(e) => setPlaybookSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
                <Button onClick={handleCreatePlaybook}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Playbook
                </Button>
              </div>
            </div>

            {/* Playbooks Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPlaybooks.map((playbook) => (
                <PlaybookCard
                  key={playbook.id}
                  playbook={playbook}
                  onEdit={() => handleEditPlaybook(playbook)}
                  onDelete={() => handleDeletePlaybook(playbook)}
                  onToggle={() => handleTogglePlaybook(playbook)}
                />
              ))}
            </div>

            {filteredPlaybooks.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  No playbooks found
                </h3>
                <p className="mt-1 text-muted-foreground">
                  {playbookSearchQuery
                    ? "Try adjusting your search query"
                    : "Create your first playbook to train the AI on services"}
                </p>
                {!playbookSearchQuery && (
                  <Button onClick={handleCreatePlaybook} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Playbook
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* 3. Conversation Examples */}
        <TabsContent value="examples" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversation Examples
              </CardTitle>
              <CardDescription>
                Upload screenshots of previous text conversations so the AI can
                learn your communication style and common interactions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload Section */}
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadConversationExample}
                  className="hidden"
                  id="conversation-upload"
                  disabled={isUploadingExample}
                />
                <label
                  htmlFor="conversation-upload"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  {isUploadingExample ? (
                    <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                  ) : (
                    <Image className="h-10 w-10 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-foreground">
                      {isUploadingExample
                        ? "Uploading..."
                        : "Click to upload conversation screenshot"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      JPG, PNG or other image formats
                    </p>
                  </div>
                </label>
              </div>

              {/* Examples Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {conversationExamples.map((example) => (
                  <div
                    key={example.id}
                    className="border rounded-lg overflow-hidden bg-card"
                  >
                    <div className="aspect-[3/4] relative">
                      <img
                        src={example.image_url}
                        alt="Conversation example"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        className="absolute top-2 right-2"
                        onClick={() =>
                          handleDeleteConversationExample(
                            example.id,
                            example.image_url,
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="p-3">
                      <Textarea
                        placeholder="Add notes about this conversation (optional)..."
                        value={example.notes || ""}
                        onChange={(e) =>
                          handleUpdateExampleNotes(example.id, e.target.value)
                        }
                        rows={2}
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Added{" "}
                        {new Date(example.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {conversationExamples.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                  <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No conversation examples uploaded yet.</p>
                  <p className="text-sm mt-1">
                    Upload screenshots of your best text conversations to help
                    the AI learn.
                  </p>
                </div>
              )}

              {/* Tips */}
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">
                      Tips for best results:
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                      <li>
                        • Upload conversations that show great customer
                        interactions
                      </li>
                      <li>
                        • Include examples of how you handle common questions
                      </li>
                      <li>
                        • Add notes to explain what makes each conversation good
                      </li>
                      <li>
                        • Include examples of successful sales or bookings
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                {companyInfo?.overall_faqs.map((faq, index) => (
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
                ))}
                {(!companyInfo?.overall_faqs ||
                  companyInfo.overall_faqs.length === 0) && (
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
              {activePlaybooks.length > 0 ? (
                <Accordion type="single" collapsible className="space-y-2">
                  {activePlaybooks.map((pb) => (
                    <AccordionItem
                      key={pb.id}
                      value={pb.id}
                      className="border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{pb.service_name}</span>
                          <Badge variant="secondary">
                            {pb.faqs.length} FAQs
                          </Badge>
                          {pb.warranty_policy && (
                            <Badge variant="outline">Warranty</Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4">
                        {pb.faqs.length > 0 ? (
                          <div className="space-y-3">
                            {pb.faqs.map((faq: FAQ, idx: number) => (
                              <div
                                key={idx}
                                className="p-3 bg-muted/50 rounded-lg"
                              >
                                <p className="font-medium text-sm">
                                  {faq.question}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {faq.answer}
                                </p>
                              </div>
                            ))}
                            {pb.warranty_policy && (
                              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                <p className="font-medium text-sm flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  Warranty Policy
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {pb.warranty_policy}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No FAQs added for this service yet.
                          </p>
                        )}
                        <div className="mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPlaybook(pb)}
                          >
                            Edit Playbook
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                  <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No active Service Playbooks yet.</p>
                  <Button
                    onClick={handleCreatePlaybook}
                    variant="outline"
                    className="mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first playbook
                  </Button>
                </div>
              )}
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Knowledge Base Documents
              </CardTitle>
              <CardDescription>
                Upload or paste documents that contain information your AI
                should know
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Document */}
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={newDoc.title}
                      onChange={(e) =>
                        setNewDoc((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="e.g., PPF Warranty Info"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <select
                      value={newDoc.category}
                      onChange={(e) =>
                        setNewDoc((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    value={newDoc.content}
                    onChange={(e) =>
                      setNewDoc((prev) => ({
                        ...prev,
                        content: e.target.value,
                      }))
                    }
                    placeholder="Paste the content from your document here..."
                    rows={6}
                  />
                </div>
                <Button onClick={handleAddDocument} disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add to Knowledge Base
                    </>
                  )}
                </Button>
              </div>

              {/* Example Documents */}
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">
                      What documents should you add?
                    </p>
                    <div className="grid gap-2 md:grid-cols-2 mt-3">
                      {documentExamples.map((ex, idx) => (
                        <div
                          key={idx}
                          className="text-sm p-2 rounded bg-background/50"
                        >
                          <span className="font-medium">{ex.title}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            - {ex.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Uploaded Documents ({documents.length})</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredDocs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>
                    No documents yet. Add your first knowledge base entry above!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <FileText className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{doc.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {doc.category}
                          </Badge>
                          <Badge
                            variant={
                              doc.status === "indexed" ? "default" : "secondary"
                            }
                            className="text-xs"
                          >
                            {doc.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {doc.content}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AISettings;
