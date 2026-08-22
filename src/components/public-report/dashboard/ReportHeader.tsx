import { Button } from "@/components/ui/button";
import { Download, Loader2, Building2 } from "lucide-react";
import Image from "next/image";

interface ReportHeaderProps {
  frequency: string;
  reportDateRange: string;
  isGenerating: boolean;
  onDownload: (fullPage: boolean) => void;
  companyName?: string;
  companyLogo?: string | null;
}

export const ReportHeader = ({
  frequency,
  reportDateRange,
  isGenerating,
  onDownload,
  companyName,
  companyLogo,
}: ReportHeaderProps) => {
  // Route external (S3) logos through a same-origin proxy so html2canvas can
  // load them with crossOrigin in non-Safari browsers during PDF capture.
  const logoSrc =
    companyLogo && /^https?:\/\//.test(companyLogo)
      ? `/api/proxy-image?url=${encodeURIComponent(companyLogo)}`
      : companyLogo;

  return (
    <div className="flex flex-col md:flex-row items-center justify-between w-full gap-6">
      <div className="flex items-center gap-4">
        {companyLogo ? (
          <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-border/50 shadow-sm bg-white">
            <Image
              src={logoSrc as string}
              alt={companyName || "Company Logo"}
              fill
              className="object-contain p-2"
              crossOrigin="anonymous"
            />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10 shadow-sm">
            <Building2 className="w-8 h-8 text-primary/40" />
          </div>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
            {companyName || "Your"}{" "}
            {frequency.charAt(0).toUpperCase() + frequency.slice(1)} Report
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {reportDateRange}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Button
          variant="default"
          size="sm"
          className="h-10 px-6 shadow-md shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] font-semibold"
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
