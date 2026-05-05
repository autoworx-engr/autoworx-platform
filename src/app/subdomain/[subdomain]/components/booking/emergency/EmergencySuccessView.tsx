"use client";

import { CheckCircle2 } from "lucide-react";
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
      <Button onClick={onClose} className="w-full">
        Close
      </Button>
    </div>
  );
}
