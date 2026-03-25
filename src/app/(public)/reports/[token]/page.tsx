"use client";

import {
  DollarSign,
  Briefcase,
  CalendarCheck,
  Receipt,
  Users,
  TrendingUp,
  FileText,
  CreditCard,
  Clock,
  UserX,
  Eye,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/public-report/dashboard/KPICard";
import { LeadsSourceChart } from "@/components/public-report/dashboard/LeadsSourceChart";
import { LeadsSummary } from "@/components/public-report/dashboard/LeadsSummary";
import { ServicesPerformance } from "@/components/public-report/dashboard/ServicesPerformance";
import { PaymentsFinancials } from "@/components/public-report/dashboard/PaymentsFinancials";
import { TeamPerformance } from "@/components/public-report/dashboard/TeamPerformance";
import { ReportPreview } from "@/components/public-report/dashboard/ReportPreview";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { errorToast, successToast } from "@/lib/toast";
import toast from "react-hot-toast";
import { notFound } from "next/navigation";
import { useState, useMemo } from "react";
import { usePublicReportData } from "@/hooks/public-report/usePublicReportData";
import { format, parseISO } from "date-fns";
import "../report-styles.css";

interface ReportPageProps {
  params: {
    token: string;
  };
}

export default function ReportPage({ params }: ReportPageProps) {
  const { token } = params;
  const [isGenerating, setIsGenerating] = useState(false);

  const decodedParams = useMemo(() => {
    try {
      const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
      const decodedToken = atob(base64);
      const parsed = JSON.parse(decodedToken);
      console.log("Decoded params: ", parsed);
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

  console.log("Report data: ", reportData);
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

    // Grouping by category
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
      type: "Staff", // API data doesn't have type, providing default
      jobs: t.jobsCompleted,
      revenue: t.revenue,
      pay: 0, // API data doesn't have pay, providing default
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

  const validFrequencies = ["daily", "weekly", "monthly", "annual"];

  if (!validFrequencies.includes(frequency)) {
    // Optional: handle cases where frequency isn't in our list,
    // or just default to showing something.
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
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
      toast.loading("Preparing your PDF report...");

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        ignoreElements: (element) => {
          return (
            element.classList.contains("xl:col-span-1") ||
            element.tagName === "BUTTON"
          );
        },
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
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
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] report-scope">
      <main
        id="report-content"
        className="container mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Your {frequency.charAt(0).toUpperCase() + frequency.slice(1)}{" "}
              Report
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
              onClick={() => handleDownloadReport(false)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview Report
            </Button>
            <Button
              variant="default"
              size="sm"
              className="px-4 shadow-md transition-all hover:scale-[1.02]"
              onClick={() => handleDownloadReport(true)}
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

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-8">
            {/* KPI Grid */}
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Overview Summary
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <KPICard
                  title="Total Revenue"
                  value={`$${(reportData?.kpis?.totalPayments ?? 0).toLocaleString()}`}
                  icon={DollarSign}
                  // trend="up"
                  // trendValue="12%"
                  delay={0}
                />

                <KPICard
                  title="Jobs Completed"
                  value={(reportData?.kpis?.totalJobs ?? 0).toString()}
                  icon={Briefcase}
                  // trend="up"
                  // trendValue="8%"
                  delay={50}
                />

                <KPICard
                  title="Appointments"
                  value={(reportData?.kpis?.appointments ?? 0).toString()}
                  icon={CalendarCheck}
                  delay={100}
                />

                <KPICard
                  title="Average Ticket"
                  value={`$${(reportData?.kpis?.averageTicket ?? 0).toLocaleString()}`}
                  icon={Receipt}
                  // trend="up"
                  // trendValue="5%"
                  delay={150}
                />

                <KPICard
                  title="Total Leads"
                  value={(reportData?.kpis?.totalLeads ?? 0).toString()}
                  icon={Users}
                  delay={200}
                />

                <KPICard
                  title="Conversion Rate"
                  value={`${reportData.kpis.conversionRate}%`}
                  subLabel="Lead → Booked"
                  icon={TrendingUp}
                  // trend="up"
                  // trendValue="3%"
                  delay={250}
                />

                <KPICard
                  title="Estimates Sent"
                  value={reportData.kpis.estimatesSent.toString()}
                  // subLabel="$86,400 total"
                  icon={FileText}
                  delay={300}
                />

                <KPICard
                  title="Payments Collected"
                  value={`$${reportData.kpis.totalPayments.toLocaleString()}`}
                  subLabel="Payments + Deposits"
                  icon={CreditCard}
                  // trend="up"
                  // trendValue="15%"
                  delay={350}
                />

                <KPICard
                  title="Payments Pending"
                  value={`$${reportData.kpis.paymentsPending.toLocaleString()}`}
                  subLabel="Unpaid invoices"
                  icon={Clock}
                  delay={400}
                />

                <KPICard
                  title="Unqualified Leads"
                  value={reportData.kpis.unqualifiedLeads.toString()}
                  icon={UserX}
                  delay={450}
                />
              </div>
            </section>

            {/* Leads & Sources */}
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Leads & Sources
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <LeadsSourceChart data={reportData.leadSources} />
                <LeadsSummary data={reportData.leadSources} />
              </div>
            </section>

            {/* Services Performance */}
            <section>
              <ServicesPerformance data={servicesFormatted} />
            </section>

            {/* Payments & Financials */}
            <section>
              <PaymentsFinancials data={reportData.paymentsFinancials} />
            </section>

            {/* Team Performance */}
            <section>
              <TeamPerformance data={teamFormatted} />
            </section>
          </div>

          {/* Sidebar - Report Preview */}
          <div className="xl:col-span-1">
            <ReportPreview />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} AutoWorx. Admin reporting dashboard.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">
                Last updated: {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
