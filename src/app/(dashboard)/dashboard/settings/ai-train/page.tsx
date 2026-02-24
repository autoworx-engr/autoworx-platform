import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, Phone, Settings } from "lucide-react";
import Link from "next/link";
import React from "react";
import AIMetrics from "./components/AIMetrics";

export default function AiTrainOverview() {
  return (
    <div>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                SMS AI Agent
                <Badge
                  variant="default"
                  className="bg-green-500 hover:bg-green-600"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </h3>
              <p className="text-sm text-muted-foreground">
                Connected via Twilio • Automatically responding to customer
                texts
              </p>
            </div>
          </div>
          <Link href="/dashboard/settings/ai-train/ai-settings">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Configure AI
            </Button>
          </Link>
        </CardContent>
      </Card>
      {/* Key Metrics */}
      <AIMetrics />
      {/* Quick Actions */}
      <section>
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
              <Link href="/dashboard/settings/ai-train/ai-settings">
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
      </section>
    </div>
  );
}
