import { useState } from "react";
import { ServicePlaybook, PricingRule, FAQ } from "@/types/ai-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Trash2,
  Save,
  X,
  GripVertical,
  AlertCircle,
  Copy,
} from "lucide-react";
import { Popconfirm } from "antd";
import { cn } from "@/lib/utils";
import SelectCategory from "@/components/Lists/SelectCategory";
import { Category } from "@prisma/client";
import toast from "react-hot-toast";
import { useClonePlaybooks } from "@/hooks/sales-agent/useServicePlaybooks";

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
      faqs: [],
      do_say: [],
      dont_say: [],
      warranty_policy: "",
      time_estimate: "",
      scheduling_notes: "",
      is_active: true,
    },
  );
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [newDoSay, setNewDoSay] = useState("");
  const [newDontSay, setNewDontSay] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    playbook?.categoryData ||
      (playbook?.categoryId
        ? {
            id: Number(playbook.categoryId),
            name: "",
            companyId: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        : null),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("basic");
  const { mutate: clonePlaybooks, isPending } = useClonePlaybooks();

  const validateForm = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    // Service name validation
    if (!formData.service_name || !formData.service_name.trim()) {
      newErrors.service_name = "Service name is required";
    }
    // else if (formData.service_name.length > 100) {
    //   newErrors.service_name = "Service name must be less than 100 characters";
    // }

    // Overview validation
    if (formData.overview && formData.overview.length > 1000) {
      newErrors.overview = "Overview must be less than 1000 characters";
    }

    // Pricing rules validation
    formData.pricing_rules?.forEach((rule, index) => {
      if (!rule.description || !rule.description.trim()) {
        newErrors[`pricing_rule_${index}_description`] =
          "Description is required";
      }
      const minPrice = rule.price_range?.min || 0;
      const maxPrice = rule.price_range?.max || 0;
      if (minPrice < 0) {
        newErrors[`pricing_rule_${index}_min`] = "Min price cannot be negative";
      }
      if (maxPrice < 0) {
        newErrors[`pricing_rule_${index}_max`] = "Max price cannot be negative";
      }
      if (minPrice > maxPrice) {
        newErrors[`pricing_rule_${index}_range`] =
          "Min price cannot be greater than max price";
      }
    });

    // FAQ validation
    formData.faqs?.forEach((faq, index) => {
      if (!faq.question || !faq.question.trim()) {
        newErrors[`faq_${index}_question`] = "Question is required";
      }
      if (!faq.answer || !faq.answer.trim()) {
        newErrors[`faq_${index}_answer`] = "Answer is required";
      }
      if (faq.question && faq.question.length > 500) {
        newErrors[`faq_${index}_question`] =
          "Question must be less than 500 characters";
      }
      if (faq.answer && faq.answer.length > 2000) {
        newErrors[`faq_${index}_answer`] =
          "Answer must be less than 2000 characters";
      }
    });

    // Time estimate validation
    if (formData.time_estimate && formData.time_estimate.length > 100) {
      newErrors.time_estimate =
        "Time estimate must be less than 100 characters";
    }

    // Warranty policy validation
    if (formData.warranty_policy && formData.warranty_policy.length > 500) {
      newErrors.warranty_policy =
        "Warranty policy must be less than 500 characters";
    }

    // Scheduling notes validation
    if (formData.scheduling_notes && formData.scheduling_notes.length > 1000) {
      newErrors.scheduling_notes =
        "Scheduling notes must be less than 1000 characters";
    }

    setErrors(newErrors);
    return newErrors;
  };

  const getTabForError = (errorKey: string): string => {
    if (errorKey === "service_name" || errorKey === "overview") return "basic";
    if (errorKey.startsWith("pricing_rule_")) return "pricing";
    if (errorKey.startsWith("faq_")) return "faqs";
    if (
      errorKey === "time_estimate" ||
      errorKey === "warranty_policy" ||
      errorKey === "scheduling_notes"
    )
      return "details";
    return "basic";
  };

  const handleSave = () => {
    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      const firstKey = Object.keys(newErrors)[0];
      setActiveTab(getTabForError(firstKey));
      toast.error(newErrors[firstKey]);
      return;
    }

    onSave({
      ...formData,
      categoryId: selectedCategory?.id,
    });
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

  const clonePlaybookHandler = () => {
    try {
      clonePlaybooks();
    } catch (error) {}
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-foreground">
            {playbook ? "Edit Playbook" : "Create New Playbook"}
          </h2>
          <p className="text-muted-foreground">
            Train your AI assistant on how to handle this service
          </p>
          {!playbook &&
            (Boolean(process.env.NEXT_PUBLIC_IS_CLONE_PLAYBOOK_ACCESS) ||
              false) === true && (
              <Button variant="outline" onClick={clonePlaybookHandler}>
                <Copy className="mr-2 h-4 w-4" />
                Clone playbook
              </Button>
            )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 sm:flex-none"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1 sm:flex-none">
            <Save className="mr-2 h-4 w-4" />
            Save Playbook
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
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
                  <Label htmlFor="service_name">
                    Service Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="service_name"
                    value={formData.service_name}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        service_name: e.target.value,
                      });
                      if (errors.service_name) {
                        setErrors({ ...errors, service_name: "" });
                      }
                    }}
                    placeholder="e.g., Full Vehicle Wrap"
                    className={cn(errors.service_name && "border-destructive")}
                    maxLength={100}
                  />
                  {errors.service_name && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.service_name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <SelectCategory
                    categoryData={selectedCategory}
                    onCategoryChange={(category) => {
                      setSelectedCategory(category);
                    }}
                    labelPosition="top"
                    required={false}
                    categoryOpen={isCategoryOpen}
                    setCategoryOpen={setIsCategoryOpen}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="overview">Service Overview</Label>
                <Textarea
                  id="overview"
                  value={formData.overview}
                  onChange={(e) => {
                    setFormData({ ...formData, overview: e.target.value });
                    if (errors.overview) {
                      setErrors({ ...errors, overview: "" });
                    }
                  }}
                  placeholder="Describe what this service includes and its main benefits..."
                  className={cn(
                    "min-h-[120px]",
                    errors.overview && "border-destructive",
                  )}
                />
                {errors.overview && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.overview}
                  </p>
                )}
                {/* {formData.overview && (
                  <p className="text-xs text-muted-foreground text-right">
                    {formData.overview.length}/1000 characters
                  </p>
                )} */}
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
                          onChange={(e) => {
                            updatePricingRule(index, {
                              description: e.target.value,
                            });
                            if (errors[`pricing_rule_${index}_description`]) {
                              setErrors({
                                ...errors,
                                [`pricing_rule_${index}_description`]: "",
                              });
                            }
                          }}
                          placeholder="e.g., Standard sedan"
                          className={cn(
                            errors[`pricing_rule_${index}_description`] &&
                              "border-destructive",
                          )}
                        />
                        {errors[`pricing_rule_${index}_description`] && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors[`pricing_rule_${index}_description`]}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Min Price ($)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={rule.price_range?.min || ""}
                          onChange={(e) => {
                            updatePricingRule(index, {
                              price_range: {
                                ...rule.price_range!,
                                min: Number(e.target.value),
                              },
                            });
                            const errorKeys = [
                              `pricing_rule_${index}_min`,
                              `pricing_rule_${index}_range`,
                            ];
                            const newErrors = { ...errors };
                            errorKeys.forEach((key) => delete newErrors[key]);
                            setErrors(newErrors);
                          }}
                          className={cn(
                            (errors[`pricing_rule_${index}_min`] ||
                              errors[`pricing_rule_${index}_range`]) &&
                              "border-destructive",
                          )}
                        />
                        {errors[`pricing_rule_${index}_min`] && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors[`pricing_rule_${index}_min`]}
                          </p>
                        )}
                        {errors[`pricing_rule_${index}_range`] && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors[`pricing_rule_${index}_range`]}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Max Price ($)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={rule.price_range?.max || ""}
                          onChange={(e) => {
                            updatePricingRule(index, {
                              price_range: {
                                ...rule.price_range!,
                                max: Number(e.target.value),
                              },
                            });
                            const errorKeys = [
                              `pricing_rule_${index}_max`,
                              `pricing_rule_${index}_range`,
                            ];
                            const newErrors = { ...errors };
                            errorKeys.forEach((key) => delete newErrors[key]);
                            setErrors(newErrors);
                          }}
                          className={cn(
                            (errors[`pricing_rule_${index}_max`] ||
                              errors[`pricing_rule_${index}_range`]) &&
                              "border-destructive",
                          )}
                        />
                        {errors[`pricing_rule_${index}_max`] && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors[`pricing_rule_${index}_max`]}
                          </p>
                        )}
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
                    <Popconfirm
                      title="Delete FAQ"
                      description="Are you sure you want to delete this FAQ?"
                      onConfirm={() => removeFAQ(index)}
                      okText="Yes"
                      cancelText="No"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        variant="ghost"
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </Popconfirm>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>
                          Question <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          value={faq.question}
                          onChange={(e) => {
                            updateFAQ(index, { question: e.target.value });
                            if (errors[`faq_${index}_question`]) {
                              setErrors({
                                ...errors,
                                [`faq_${index}_question`]: "",
                              });
                            }
                          }}
                          placeholder="What question might customers ask?"
                          className={cn(
                            errors[`faq_${index}_question`] &&
                              "border-destructive",
                          )}
                        />
                        {errors[`faq_${index}_question`] && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors[`faq_${index}_question`]}
                          </p>
                        )}
                        {faq.question && (
                          <p className="text-xs text-muted-foreground text-right">
                            {faq.question.length}/500 characters
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>
                          Answer <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          value={faq.answer}
                          onChange={(e) => {
                            updateFAQ(index, { answer: e.target.value });
                            if (errors[`faq_${index}_answer`]) {
                              setErrors({
                                ...errors,
                                [`faq_${index}_answer`]: "",
                              });
                            }
                          }}
                          placeholder="How should the AI respond?"
                          className={cn(
                            errors[`faq_${index}_answer`] &&
                              "border-destructive",
                          )}
                        />
                        {errors[`faq_${index}_answer`] && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors[`faq_${index}_answer`]}
                          </p>
                        )}
                        {faq.answer && (
                          <p className="text-xs text-muted-foreground text-right">
                            {faq.answer.length}/2000 characters
                          </p>
                        )}
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
                      {/* <GripVertical className="h-4 w-4 text-muted-foreground" /> */}
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
                      {/* <GripVertical className="h-4 w-4 text-muted-foreground" /> */}
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
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        time_estimate: e.target.value,
                      });
                      if (errors.time_estimate) {
                        setErrors({ ...errors, time_estimate: "" });
                      }
                    }}
                    placeholder="e.g., 3-5 business days"
                    className={cn(errors.time_estimate && "border-destructive")}
                    maxLength={100}
                  />
                  {errors.time_estimate && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.time_estimate}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warranty">Warranty Policy</Label>
                  <Input
                    id="warranty"
                    value={formData.warranty_policy}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        warranty_policy: e.target.value,
                      });
                      if (errors.warranty_policy) {
                        setErrors({ ...errors, warranty_policy: "" });
                      }
                    }}
                    placeholder="e.g., 3-year warranty on materials"
                    className={cn(
                      errors.warranty_policy && "border-destructive",
                    )}
                    maxLength={500}
                  />
                  {errors.warranty_policy && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.warranty_policy}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduling">Scheduling Notes</Label>
                <Textarea
                  id="scheduling"
                  value={formData.scheduling_notes}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      scheduling_notes: e.target.value,
                    });
                    if (errors.scheduling_notes) {
                      setErrors({ ...errors, scheduling_notes: "" });
                    }
                  }}
                  placeholder="Any special scheduling requirements or recommendations..."
                  className={cn(
                    errors.scheduling_notes && "border-destructive",
                  )}
                />
                {errors.scheduling_notes && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.scheduling_notes}
                  </p>
                )}
                {formData.scheduling_notes && (
                  <p className="text-xs text-muted-foreground text-right">
                    {formData.scheduling_notes.length}/1000 characters
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
