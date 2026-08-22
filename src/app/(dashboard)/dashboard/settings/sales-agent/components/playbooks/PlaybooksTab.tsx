"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Search, Filter } from "lucide-react";
import { PlaybookEditor } from "./PlaybookEditor";
import { PlaybookCard } from "./PlaybookCard";
import { ServicePlaybook } from "@/types/ai-settings";
import {
  useServicePlaybooks,
  useCreatePlaybook,
  useUpdatePlaybook,
  useDeletePlaybook,
  useTogglePlaybook,
} from "@/hooks/sales-agent/useServicePlaybooks";
import { convertToServicePlaybook } from "./utils";
import toast from "react-hot-toast";

export function PlaybooksTab({
  isEditingPlaybook,
  setIsEditingPlaybook,
  setEditingPlaybook,
  editingPlaybook,
}: {
  isEditingPlaybook: boolean;
  setIsEditingPlaybook: (val: boolean) => void;
  setEditingPlaybook: (val: ServicePlaybook | undefined) => void;
  editingPlaybook: ServicePlaybook | undefined;
}) {
  const [playbookSearchQuery, setPlaybookSearchQuery] = useState("");

  const {
    data: playbooksData,
    isLoading: isLoadingPlaybooks,
    isFetching,
  } = useServicePlaybooks({
    search: playbookSearchQuery || undefined,
    page: 1,
    limit: 100,
  });

  const createPlaybook = useCreatePlaybook();
  const updatePlaybook = useUpdatePlaybook();
  const deletePlaybook = useDeletePlaybook();
  const togglePlaybook = useTogglePlaybook();

  const playbooks = playbooksData?.data?.map(convertToServicePlaybook) || [];

  const handleCreatePlaybook = () => {
    setEditingPlaybook(undefined);
    setIsEditingPlaybook(true);
  };

  const handleEditPlaybook = (playbook: ServicePlaybook) => {
    setEditingPlaybook(playbook);
    setIsEditingPlaybook(true);
  };

  const validatePlaybookData = (
    data: Partial<ServicePlaybook>,
  ): string | null => {
    // Service name validation
    if (!data.service_name || !data.service_name.trim()) {
      return "Service name is required";
    }
    if (data.service_name.length > 100) {
      return "Service name must be less than 100 characters";
    }

    // Pricing rules validation
    if (data.pricing_rules && data.pricing_rules.length > 0) {
      for (const rule of data.pricing_rules) {
        if (!rule.description || !rule.description.trim()) {
          return "All pricing rules must have a description";
        }
        const minPrice = rule.price_range?.min || 0;
        const maxPrice = rule.price_range?.max || 0;
        if (minPrice < 0 || maxPrice < 0) {
          return "Prices cannot be negative";
        }
        if (minPrice > maxPrice) {
          return "Min price cannot be greater than max price";
        }
      }
    }

    // FAQ validation
    if (data.faqs && data.faqs.length > 0) {
      for (const faq of data.faqs) {
        if (!faq.question || !faq.question.trim()) {
          return "All FAQs must have a question";
        }
        if (!faq.answer || !faq.answer.trim()) {
          return "All FAQs must have an answer";
        }
        if (faq.question.length > 500) {
          return "FAQ questions must be less than 500 characters";
        }
        if (faq.answer.length > 2000) {
          return "FAQ answers must be less than 2000 characters";
        }
      }
    }

    return null;
  };

  const handleSavePlaybook = async (data: Partial<ServicePlaybook>) => {
    // Validate data before saving
    const validationError = validatePlaybookData(data);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      const playbookData = {
        serviceName: data.service_name?.trim() || "",
        categoryId: data.categoryId ? Number(data.categoryId) : null,
        overview: data.overview?.trim() || null,
        timeEstimate: data.time_estimate?.trim() || null,
        schedulingNotes: data.scheduling_notes?.trim() || null,
        warrantyPolicy: data.warranty_policy?.trim() || null,
        isActive: data.is_active ?? true,
        doSay: data.do_say || [],
        dontSay: data.dont_say || [],
        pricingRules: (data.pricing_rules || []).map((rule: any) => ({
          description: rule.description?.trim() || "",
          minPrice: rule.price_range?.min || 0,
          maxPrice: rule.price_range?.max || 0,
        })),
        faqs: (data.faqs || []).map((faq: any) => ({
          question: faq.question?.trim() || "",
          answer: faq.answer?.trim() || "",
        })),
      };

      if (editingPlaybook?.id) {
        await updatePlaybook.mutateAsync({
          id: Number(editingPlaybook.id),
          data: playbookData,
        });
      } else {
        await createPlaybook.mutateAsync(playbookData);
      }

      setIsEditingPlaybook(false);
      setEditingPlaybook(undefined);
    } catch (error: any) {
      console.error("Error saving playbook:", error);
      toast.error(error?.message || "Failed to save playbook");
    }
  };

  const handleDeletePlaybook = async (playbook: ServicePlaybook) => {
    try {
      await deletePlaybook.mutateAsync(Number(playbook.id));
    } catch (error) {
      console.error("Error deleting playbook:", error);
    }
  };

  const handleTogglePlaybook = async (playbook: ServicePlaybook) => {
    try {
      await togglePlaybook.mutateAsync({
        id: Number(playbook.id),
        isActive: !playbook.is_active,
      });
    } catch (error) {
      console.error("Error toggling playbook:", error);
    }
  };

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
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search Playbooks..."
            value={playbookSearchQuery}
            onChange={(e) => setPlaybookSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button> */}
          <Button onClick={handleCreatePlaybook}>
            <Plus className="mr-2 h-4 w-4" />
            Create Playbook
          </Button>
        </div>
      </div>

      {/* Playbooks Grid */}
      {isLoadingPlaybooks && isFetching ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : playbooks.length === 0 ? (
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
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {playbooks.map((playbook) => (
              <PlaybookCard
                key={playbook.id}
                playbook={playbook}
                onEdit={() => handleEditPlaybook(playbook)}
                onDelete={() => handleDeletePlaybook(playbook)}
                onToggle={() => handleTogglePlaybook(playbook)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
