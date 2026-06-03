"use client";

import { CheckCircle2, ExternalLink, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SuccessData } from "./types";

interface EmergencySuccessViewProps {
  data: SuccessData;
  onClose: () => void;
}

export function EmergencySuccessView({
  data,
  onClose,
}: EmergencySuccessViewProps) {
  return (
    <div className="p-8 text-center space-y-4">
      <div className="flex justify-center">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
      </div>
      <h3 className="text-xl font-bold">Request Submitted!</h3>
      <p className="text-muted-foreground text-sm">{data.message}</p>

      <div className="bg-muted rounded-xl p-4 space-y-2 text-sm text-left">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Request ID</span>
          <span className="font-bold">#{data.requestId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Estimated Response</span>
          <span className="font-semibold text-primary">
            {data.estimatedReviewTime}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
        <div className="flex items-center gap-1">
          <Mail className="w-3.5 h-3.5" />
          <MessageSquare className="w-3.5 h-3.5" />
        </div>
        <span>Confirmation sent to your email and phone</span>
      </div>

      {data.trackingUrl && (
        <a
          href={data.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Track My Request
        </a>
      )}

      <Button onClick={onClose} variant="outline" className="w-full">
        Close
      </Button>
    </div>
  );
}
