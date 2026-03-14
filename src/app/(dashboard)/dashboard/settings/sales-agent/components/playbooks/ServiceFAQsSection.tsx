"use client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BookOpen, CheckCircle } from "lucide-react";
import { FAQ, ServicePlaybook } from "@/types/ai-settings";
import { useServicePlaybooks } from "@/hooks/sales-agent/useServicePlaybooks";
import { convertToServicePlaybook } from "./utils";

function ServiceFAQsSection({
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
  const { data: playbooksData } = useServicePlaybooks({
    isActive: true,
    page: 1,
    limit: 100,
  });

  const activePlaybooks =
    playbooksData?.data
      ?.map(convertToServicePlaybook)
      .filter((p) => p.is_active) || [];

  const handleEditPlaybook = (playbook: ServicePlaybook) => {
    setEditingPlaybook(playbook);
    setIsEditingPlaybook(true);
  };

  if (activePlaybooks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
        <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p>No active Service Playbooks yet.</p>
        <p className="text-sm mt-1">
          Create playbooks in the Playbooks tab to see service FAQs here.
        </p>
      </div>
    );
  }

  return (
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
              <Badge variant="secondary">{pb.faqs.length} FAQs</Badge>
              {pb.warranty_policy && <Badge variant="outline">Warranty</Badge>}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            {pb.faqs.length > 0 ? (
              <div className="space-y-3">
                {pb.faqs.map((faq: FAQ, idx: number) => (
                  <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium text-sm">{faq.question}</p>
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
            {/* <div className="mt-4 text-black">
              <button onClick={() => handleEditPlaybook(pb)}>
                Edit Playbook
              </button>
            </div> */}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export default ServiceFAQsSection;
