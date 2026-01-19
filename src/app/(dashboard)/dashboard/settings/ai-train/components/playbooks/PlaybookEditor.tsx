import { useState } from "react";
import {
  ServicePlaybook,
  ServiceCategory,
  PricingRule,
  IntakeQuestion,
  FAQ,
  Upsell,
} from "@/types/ai-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Save, X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const categories: { value: ServiceCategory; label: string; icon: string }[] = [
  { value: "vinyl_wrap", label: "Vinyl Wrap", icon: "🎨" },
  { value: "ppf", label: "Paint Protection Film", icon: "🛡️" },
  { value: "tint", label: "Window Tinting", icon: "🕶️" },
  { value: "ceramic_coating", label: "Ceramic Coating", icon: "✨" },
  { value: "detailing", label: "Detailing", icon: "🧽" },
  { value: "audio", label: "Car Audio", icon: "🔊" },
  { value: "lighting", label: "Lighting", icon: "💡" },
  { value: "paint", label: "Paint", icon: "🖌️" },
  { value: "powder_coat", label: "Powder Coating", icon: "⚙️" },
  { value: "auto_body", label: "Auto Body", icon: "🔧" },
  { value: "other", label: "Other", icon: "📦" },
];

interface PlaybookEditorProps {
  playbook?: ServicePlaybook;
  onSave: (playbook: Partial<ServicePlaybook>) => void;
  onCancel: () => void;
}

export function PlaybookEditor({
  playbook,
  onSave,
  onCancel,
}: PlaybookEditorProps) {
  const [formData, setFormData] = useState<Partial<ServicePlaybook>>(
    playbook || {
      service_name: "",
      category: "other",
      overview: "",
      pricing_rules: [],
      intake_questions: [],
      faqs: [],
      upsells: [],
      do_say: [],
      dont_say: [],
      warranty_policy: "",
      time_estimate: "",
      scheduling_notes: "",
      is_active: true,
    },
  );

  const [newDoSay, setNewDoSay] = useState("");
  const [newDontSay, setNewDontSay] = useState("");

  const handleSave = () => {
    onSave(formData);
  };

  const addPricingRule = () => {
    setFormData({
      ...formData,
      pricing_rules: [
        ...(formData.pricing_rules || []),
        {
          id: Date.now().toString(),
          description: "",
          price_range: { min: 0, max: 0 },
          factors: [],
        },
      ],
    });
  };

  const updatePricingRule = (index: number, updates: Partial<PricingRule>) => {
    const rules = [...(formData.pricing_rules || [])];
    rules[index] = { ...rules[index], ...updates };
    setFormData({ ...formData, pricing_rules: rules });
  };

  const removePricingRule = (index: number) => {
    const rules = [...(formData.pricing_rules || [])];
    rules.splice(index, 1);
    setFormData({ ...formData, pricing_rules: rules });
  };

  const addFAQ = () => {
    setFormData({
      ...formData,
      faqs: [
        ...(formData.faqs || []),
        { id: Date.now().toString(), question: "", answer: "" },
      ],
    });
  };

  const updateFAQ = (index: number, updates: Partial<FAQ>) => {
    const faqs = [...(formData.faqs || [])];
    faqs[index] = { ...faqs[index], ...updates };
    setFormData({ ...formData, faqs });
  };

  const removeFAQ = (index: number) => {
    const faqs = [...(formData.faqs || [])];
    faqs.splice(index, 1);
    setFormData({ ...formData, faqs });
  };

  const addDoSay = () => {
    if (!newDoSay.trim()) return;
    setFormData({
      ...formData,
      do_say: [...(formData.do_say || []), newDoSay.trim()],
    });
    setNewDoSay("");
  };

  const removeDoSay = (index: number) => {
    const list = [...(formData.do_say || [])];
    list.splice(index, 1);
    setFormData({ ...formData, do_say: list });
  };

  const addDontSay = () => {
    if (!newDontSay.trim()) return;
    setFormData({
      ...formData,
      dont_say: [...(formData.dont_say || []), newDontSay.trim()],
    });
    setNewDontSay("");
  };

  const removeDontSay = (index: number) => {
    const list = [...(formData.dont_say || [])];
    list.splice(index, 1);
    setFormData({ ...formData, dont_say: list });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {playbook ? "Edit Playbook" : "Create New Playbook"}
          </h2>
          <p className="text-muted-foreground">
            Train your AI assistant on how to handle this service
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Playbook
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
          <TabsTrigger value="rules">AI Rules</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Basic Info */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Service Information</CardTitle>
              <CardDescription>
                Basic details about this service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="service_name">Service Name</Label>
                  <Input
                    id="service_name"
                    value={formData.service_name}
                    onChange={(e) =>
                      setFormData({ ...formData, service_name: e.target.value })
                    }
                    placeholder="e.g., Full Vehicle Wrap"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: ServiceCategory) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <span className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="overview">Service Overview</Label>
                <Textarea
                  id="overview"
                  value={formData.overview}
                  onChange={(e) =>
                    setFormData({ ...formData, overview: e.target.value })
                  }
                  placeholder="Describe what this service includes and its main benefits..."
                  className="min-h-[120px]"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <Label>Active Status</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, the AI will use this playbook
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing */}
        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pricing Rules</CardTitle>
                  <CardDescription>
                    Define price ranges and factors that affect pricing
                  </CardDescription>
                </div>
                <Button onClick={addPricingRule} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Pricing Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.pricing_rules?.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                  <p className="text-muted-foreground">
                    No pricing rules yet. Add one to help the AI quote
                    accurately.
                  </p>
                </div>
              ) : (
                formData.pricing_rules?.map((rule, index) => (
                  <div
                    key={rule.id}
                    className="group relative rounded-lg border border-border p-4 hover:border-primary/30"
                  >
                    <Button
                      variant="ghost"
                      onClick={() => removePricingRule(index)}
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={rule.description}
                          onChange={(e) =>
                            updatePricingRule(index, {
                              description: e.target.value,
                            })
                          }
                          placeholder="e.g., Standard sedan"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Min Price ($)</Label>
                        <Input
                          type="number"
                          value={rule.price_range?.min || ""}
                          onChange={(e) =>
                            updatePricingRule(index, {
                              price_range: {
                                ...rule.price_range!,
                                min: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Price ($)</Label>
                        <Input
                          type="number"
                          value={rule.price_range?.max || ""}
                          onChange={(e) =>
                            updatePricingRule(index, {
                              price_range: {
                                ...rule.price_range!,
                                max: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQs */}
        <TabsContent value="faqs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>
                    Common questions the AI should be able to answer
                  </CardDescription>
                </div>
                <Button onClick={addFAQ} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add FAQ
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.faqs?.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                  <p className="text-muted-foreground">
                    No FAQs yet. Add common questions and answers.
                  </p>
                </div>
              ) : (
                formData.faqs?.map((faq, index) => (
                  <div
                    key={faq.id}
                    className="group relative rounded-lg border border-border p-4 hover:border-primary/30"
                  >
                    <Button
                      variant="ghost"
                      onClick={() => removeFAQ(index)}
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Question</Label>
                        <Input
                          value={faq.question}
                          onChange={(e) =>
                            updateFAQ(index, { question: e.target.value })
                          }
                          placeholder="What question might customers ask?"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Answer</Label>
                        <Textarea
                          value={faq.answer}
                          onChange={(e) =>
                            updateFAQ(index, { answer: e.target.value })
                          }
                          placeholder="How should the AI respond?"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Rules */}
        <TabsContent value="rules">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-success">
                  ✓ Things to Say
                </CardTitle>
                <CardDescription>
                  Phrases and information the AI should include
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newDoSay}
                    onChange={(e) => setNewDoSay(e.target.value)}
                    placeholder="Add a guideline..."
                    onKeyPress={(e) => e.key === "Enter" && addDoSay()}
                  />
                  <Button onClick={addDoSay} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.do_say?.map((item, index) => (
                    <div
                      key={index}
                      className="group flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 px-3 py-2"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-sm">{item}</span>
                      <Button
                        variant="ghost"
                        onClick={() => removeDoSay(index)}
                        className="opacity-0 group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  ✗ Things to Avoid
                </CardTitle>
                <CardDescription>
                  Phrases and topics the AI should never say
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newDontSay}
                    onChange={(e) => setNewDontSay(e.target.value)}
                    placeholder="Add a restriction..."
                    onKeyPress={(e) => e.key === "Enter" && addDontSay()}
                  />
                  <Button onClick={addDontSay} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.dont_say?.map((item, index) => (
                    <div
                      key={index}
                      className="group flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-sm">{item}</span>
                      <Button
                        variant="ghost"
                        onClick={() => removeDontSay(index)}
                        className="opacity-0 group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Details */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
              <CardDescription>
                Additional information for the AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="time_estimate">Time Estimate</Label>
                  <Input
                    id="time_estimate"
                    value={formData.time_estimate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        time_estimate: e.target.value,
                      })
                    }
                    placeholder="e.g., 3-5 business days"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warranty">Warranty Policy</Label>
                  <Input
                    id="warranty"
                    value={formData.warranty_policy}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        warranty_policy: e.target.value,
                      })
                    }
                    placeholder="e.g., 3-year warranty on materials"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduling">Scheduling Notes</Label>
                <Textarea
                  id="scheduling"
                  value={formData.scheduling_notes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scheduling_notes: e.target.value,
                    })
                  }
                  placeholder="Any special scheduling requirements or recommendations..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
