import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HelpCircle, Lightbulb, Loader2, Plus, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import {
  useOverallFaqs,
  useSaveOverallFaqs,
} from "@/hooks/sales-agent/useOverallFaqs";

interface FAQ {
  question: string;
  answer: string;
}
const OverAllFaqTab = () => {
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
              <div key={index} className="p-4 border rounded-lg bg-muted/30">
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
              <p>No FAQs added yet. Add common questions your customers ask.</p>
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
  );
};

export default OverAllFaqTab;
