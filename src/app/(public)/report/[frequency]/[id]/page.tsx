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
import { useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { errorToast, successToast } from "@/lib/toast";
import toast from "react-hot-toast";
import { notFound } from "next/navigation";
import "../../report-styles.css";

interface ReportPageProps {
  params: {
    frequency: string;
    id: string;
  };
}

export default function ReportPage({ params }: ReportPageProps) {
  const { frequency, id } = params;
  const [isGenerating, setIsGenerating] = useState(false);

  const validFrequencies = ["daily", "weekly", "monthly", "annual"];
  if (!validFrequencies.includes(frequency.toLowerCase())) {
    return notFound();
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
              {frequency.charAt(0).toUpperCase() + frequency.slice(1)} Performance Report
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              {startDate && endDate ? (
                <>
                  Period: <strong>{startDate}</strong> to <strong>{endDate}</strong>
                </>
              ) : (
                "Scheduled performance reports delivered as PDF"
              )}
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
                  value="$127,500"
                  icon={DollarSign}
                  trend="up"
                  trendValue="12%"
                  delay={0}
                />

                <KPICard
                  title="Jobs Completed"
                  value="205"
                  icon={Briefcase}
                  trend="up"
                  trendValue="8%"
                  delay={50}
                />

                <KPICard
                  title="Appointments"
                  value="189"
                  icon={CalendarCheck}
                  delay={100}
                />

                <KPICard
                  title="Average Ticket"
                  value="$621"
                  icon={Receipt}
                  trend="up"
                  trendValue="5%"
                  delay={150}
                />

                <KPICard
                  title="Total Leads"
                  value="100"
                  icon={Users}
                  delay={200}
                />

                <KPICard
                  title="Conversion Rate"
                  value="42%"
                  subLabel="Lead → Booked"
                  icon={TrendingUp}
                  trend="up"
                  trendValue="3%"
                  delay={250}
                />

                <KPICard
                  title="Estimates Sent"
                  value="78"
                  subLabel="$86,400 total"
                  icon={FileText}
                  delay={300}
                />

                <KPICard
                  title="Payments Collected"
                  value="$98,750"
                  subLabel="Payments + Deposits"
                  icon={CreditCard}
                  trend="up"
                  trendValue="15%"
                  delay={350}
                />

                <KPICard
                  title="Payments Pending"
                  value="$26,650"
                  subLabel="Unpaid invoices"
                  icon={Clock}
                  delay={400}
                />

                <KPICard
                  title="Unqualified Leads"
                  value="23"
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
                <LeadsSourceChart />
                <LeadsSummary />
              </div>
            </section>

            {/* Services Performance */}
            <section>
              <ServicesPerformance />
            </section>

            {/* Payments & Financials */}
            <section>
              <PaymentsFinancials />
            </section>

            {/* Team Performance */}
            <section>
              <TeamPerformance />
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
