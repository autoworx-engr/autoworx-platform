import { FileText, Calendar, Building2, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useCompanyQuery } from "@/hooks/useCompanyQuery";

interface ReportPreviewProps {
  isGenerating: boolean;
  onDownload: () => void;
  
  reportDateRange?: string;
}

export const ReportPreview = ({
  isGenerating,
  onDownload,
 
  reportDateRange,
}: ReportPreviewProps) => {
    const { data: companyData } = useCompanyQuery();
  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50 sticky top-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-0">
          Report Preview
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={onDownload}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Download Sample
        </Button>
      </div>

      <div
        className="bg-muted/30 rounded-xl p-6 border border-dashed border-border"
        id="pdf-preview-content"
      >
        <div className="bg-card rounded-lg p-5 shadow-sm mb-4 border border-border/50">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
              {/* <Building2 className="w-6 h-6 text-accent" /> */}
              <Image src={companyData?.image || "/default-logo.png"} alt="Company Logo" width={48} height={48} className="rounded-lg" />
            </div>
            <div>
              <h4 className="font-bold text-lg">{companyData?.name}</h4>
              <p className="text-sm text-muted-foreground">
                Performance Report
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Reporting Period: {reportDateRange || "N/A"}</span>
          </div>
        </div>

        {/* <div className="space-y-3">
          {[
            "Executive Summary",
            "Revenue Overview",
            "Leads & Sources",
            "Services Performance",
            "Payments & Financials",
            "Team Performance",
          ].map((section, index) => (
            <div
              key={section}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 shadow-sm"
            >
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{section}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden ml-auto max-w-[60px]">
                <div
                  className="h-full bg-primary/30 rounded-full"
                  style={{ width: `${80 - index * 10}%` }}
                />
              </div>
            </div>
          ))}
        </div> */}
      </div>

      <Button
        variant="default"
        className="w-full mt-6 shadow-lg transition-all active:scale-[0.98] font-semibold py-6 text-base"
        onClick={onDownload}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <FileText className="w-4 h-4 mr-2" />
        )}
        Generate Preview PDF
      </Button>
    </div>
  );
};
