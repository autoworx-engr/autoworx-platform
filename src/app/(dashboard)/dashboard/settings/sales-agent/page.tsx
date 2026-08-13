import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Settings } from "lucide-react";
import Link from "next/link";
import React from "react";
import AIMetrics from "./components/AIMetrics";
import SalesAgentPermissionPanel from "./components/SalesAgentPermissionPanel";
import { getCompanyId } from "@/lib/companyId";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import UpgradePlanBanner from "@/components/UpgradePlanBanner";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - Sales Agent",
  description: "Configure sales agent settings",
};

export default async function AiTrainOverview() {
  const companyId = await getCompanyId();
  const entitlements = await getCompanyEntitlements(companyId);

  if (!entitlements.awxSalesAgent) {
    return (
      <div className="mx-auto w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">
          AI Sales Agent is not available
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          Your current plan does not include AI Sales Agent. Upgrade to unlock
          AI-driven lead handling and automated responses.
        </p>
        <UpgradePlanBanner
          title="Unlock AI Sales Agent"
          description="Upgrade your plan to configure and use AI Sales Agent features."
          ctaLabel="Upgrade Plan"
        />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3 min-w-0">
      {/* LEFT MAIN CONTENT */}
      <div className="lg:col-span-2 space-y-6 min-w-0">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  SMS AI Agent
                </h3>
                <p className="text-sm text-muted-foreground">
                  Connected via Twilio • Automatically responding to customer
                  texts
                </p>
              </div>
            </div>
            <Link href="/dashboard/settings/sales-agent/ai-settings">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configure AI
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Metrics */}
        <AIMetrics companyId={companyId} />

        {/* Quick Setup */}
        {/* <section>
          <h2 className="my-4 text-lg font-semibold text-foreground">
            Quick Setup
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Train Your AI</CardTitle>
                <CardDescription>
                  Add your company info, services, pricing, and personality to
                  make the AI sound like your team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/settings/sales-agent/ai-settings">
                  <Button className="w-full">Go to AI Settings</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Twilio Integration</CardTitle>
                <CardDescription>
                  Your SMS agent is connected to Twilio and ready to receive
                  messages.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Twilio webhook configured
                </div>
              </CardContent>
            </Card>
          </div>
        </section> */}
      </div>

      {/* RIGHT SIDE PERMISSION PANEL */}
      <div className="space-y-6 min-w-0">
        <SalesAgentPermissionPanel companyId={companyId} />
      </div>
    </div>
  );
}
