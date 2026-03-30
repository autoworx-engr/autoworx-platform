"use client";

import { LeadsSourceChart } from "@/components/public-report/dashboard/LeadsSourceChart";
import { LeadsSummary } from "@/components/public-report/dashboard/LeadsSummary";
import { ServicesPerformance } from "@/components/public-report/dashboard/ServicesPerformance";
import { PaymentsFinancials } from "@/components/public-report/dashboard/PaymentsFinancials";
import { TeamPerformance } from "@/components/public-report/dashboard/TeamPerformance";
import { ReportPreview } from "@/components/public-report/dashboard/ReportPreview";
import { ReportHeader } from "@/components/public-report/dashboard/ReportHeader";
import { KPIGrid } from "@/components/public-report/dashboard/KPIGrid";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { errorToast, successToast } from "@/lib/toast";
import toast from "react-hot-toast";
import { useState, useMemo, useEffect } from "react";
import { usePublicReportData } from "@/hooks/public-report/usePublicReportData";

import { format, parseISO } from "date-fns";
import "../report-styles.css";
import { useRouter } from "next/navigation";
import { getSession } from "next-auth/react";
import { useCompanyQuery } from "@/hooks/useCompanyQuery";
import CarLoading from "@/components/common/CarLoading";

interface ReportPageProps {
  params: {
    token: string;
  };
}

export default function ReportPage({ params }: ReportPageProps) {
  const { token } = params;
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const { data: companyData } = useCompanyQuery();
  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession();
      if (!session) {
        router.push(`/login?callbackUrl=/reports/${token}`);
      } else {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [token, router]);

  const decodedParams = useMemo(() => {
    try {
      const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
      const decodedToken = atob(base64);
      const parsed = JSON.parse(decodedToken);
      return parsed;
    } catch (error) {
      console.error("Token decoding error:", error);
      return null;
    }
  }, [token]);

  const {
    data: reportData,
    isLoading,
    error,
  } = usePublicReportData(
    decodedParams?.companyId,
    decodedParams?.startDate,
    decodedParams?.endDate,
    !!decodedParams,
  );

  const frequency = (decodedParams?.frequency || "DAILY").toLowerCase();

  const servicesFormatted = useMemo(() => {
    if (!reportData?.servicesPerformance)
      return { services: [], categories: [] };

    const services = reportData.servicesPerformance.map((s) => ({
      name: s.serviceName,
      revenue: s.revenue,
      jobs: s.jobCount,
      category: s.categoryName,
    }));

    const catMap: Record<string, number> = {};
    reportData.servicesPerformance.forEach((s) => {
      catMap[s.categoryName] = (catMap[s.categoryName] || 0) + s.revenue;
    });

    const categories = Object.entries(catMap).map(([name, revenue]) => ({
      name,
      revenue,
    }));

    return { services, categories };
  }, [reportData?.servicesPerformance]);

  const teamFormatted = useMemo(() => {
    if (!reportData?.teamPerformance) return [];

    return reportData.teamPerformance.map((t) => ({
      name: t.name,
      type: "Staff",
      jobs: t.jobsCompleted,
      revenue: t.revenue,
      pay: 0,
    }));
  }, [reportData?.teamPerformance]);

  const reportDateRange = useMemo(() => {
    if (!decodedParams?.startDate || !decodedParams?.endDate) return "";

    try {
      const start = parseISO(decodedParams.startDate);
      const end = parseISO(decodedParams.endDate);

      switch (frequency) {
        case "daily":
          return format(start, "MMMM do, yyyy");
        case "weekly":
          return `${format(start, "MMM do")} - ${format(end, "MMM do, yyyy")}`;
        case "monthly":
          return format(start, "MMMM yyyy");
        case "annual":
          return format(start, "yyyy");
        default:
          return `${format(start, "PP")} - ${format(end, "PP")}`;
      }
    } catch (e) {
      return "";
    }
  }, [decodedParams, frequency]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-1">
          <CarLoading />
          <p className="text-muted-foreground font-medium">
            Loading your report...
          </p>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <p className="text-muted-foreground">
          {error ? "Failed to load report data." : "No report data available."}
        </p>
      </div>
    );
  }

  const handleDownloadReport = async (fullPage = true) => {
    const reportElement = document.getElementById(
      fullPage ? "report-content" : "pdf-preview-content",
    );
    if (!reportElement) {
      errorToast("Report content not found");
      return;
    }

    try {
      setIsGenerating(true);
      document.body.classList.add("is-generating-pdf");
      toast.loading("Preparing your PDF report...");

      const canvas = await html2canvas(reportElement, {
        scale: 1.5, // Slightly reduced scale for better performance
        useCORS: true,
        logging: true, // Enable logging for debugging
        backgroundColor: "#ffffff",
        windowWidth: reportElement.scrollWidth,
        windowHeight: reportElement.scrollHeight,
        ignoreElements: (element) => {
          return (
            element.classList.contains("xl:col-span-1") ||
            element.tagName === "BUTTON" ||
            (element.classList.contains("opacity-60") &&
              element.classList.contains("grayscale"))
          );
        },
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.8); // Use JPEG with 0.8 quality
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt", // Use points instead of pixels
        format: [canvas.width * 0.75, canvas.height * 0.75], // Scale down PDF size
      });

      pdf.addImage(
        imgData,
        "JPEG",
        0,
        0,
        canvas.width * 0.75,
        canvas.height * 0.75,
      );
      pdf.save(
        `AutoWorx-${frequency.charAt(0).toUpperCase() + frequency.slice(1)}-Performance-Report-${new Date().toISOString().split("T")[0]}.pdf`,
      );

      toast.dismiss();
      successToast("Report downloaded successfully!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.dismiss();
      errorToast("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
      document.body.classList.remove("is-generating-pdf");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] report-scope">
      <main
        id="report-content"
        className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center"
      >
        <div className="w-full max-w-5xl space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
            <ReportHeader
              frequency={frequency}
              reportDateRange={reportDateRange}
              isGenerating={isGenerating}
              onDownload={handleDownloadReport}
              companyName={companyData?.name}
              companyLogo={companyData?.image}
            />
          </div>

          <KPIGrid kpis={reportData.kpis} />

          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Leads & Sources
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LeadsSourceChart data={reportData.leadSources} />
              <LeadsSummary data={reportData.leadSources} />
            </div>
          </section>

          <section>
            <ServicesPerformance data={servicesFormatted} />
          </section>

          <section>
            <PaymentsFinancials data={reportData.paymentsFinancials} />
          </section>

          <section>
            <TeamPerformance data={teamFormatted} />
          </section>
        </div>
      </main>

      <footer className="bg-card border-t border-border mt-12 py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {companyData?.name || "AutoWorx"} Performance Report
              </p>
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} All rights reserved. Generated via
                AutoWorx Platform.
              </p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-1">
              <span className="text-xs font-medium text-foreground">
                Report Period
              </span>
              <span className="text-xs text-muted-foreground">
                {reportDateRange}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
