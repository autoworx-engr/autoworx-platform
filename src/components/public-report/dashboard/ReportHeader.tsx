import { Button } from "@/components/ui/button";
import { Eye, Download, Loader2 } from "lucide-react";

interface ReportHeaderProps {
  frequency: string;
  reportDateRange: string;
  isGenerating: boolean;
  onDownload: (fullPage: boolean) => void;
}

export const ReportHeader = ({
  frequency,
  reportDateRange,
  isGenerating,
  onDownload,
}: ReportHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Your {frequency.charAt(0).toUpperCase() + frequency.slice(1)} Report
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          {reportDateRange}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="border-primary/20 hover:border-primary/50 text-foreground shadow-sm"
          onClick={() => onDownload(false)}
        >
          <Eye className="w-4 h-4 mr-2" />
          Preview Report
        </Button>
        <Button
          variant="default"
          size="sm"
          className="px-4 shadow-md transition-all hover:scale-[1.02]"
          onClick={() => onDownload(true)}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Download PDF
        </Button>
      </div>
    </div>
  );
};
