"use client";
import SmsGatewayButton from "@/app/(dashboard)/dashboard/settings/communications/SmsGatewayButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import { Button } from "@/components/ui/button";

export function ConfigureCommunicationHub() {
  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="bg-primary hover:bg-indigo-600 focus:ring-blue-500 text-white hover:text-white"
          >
            Configure Communication Hub
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="mb-4">
              Configure Communication Hub
            </DialogTitle>
            <DialogDescription>
              Configure your SMS gateway settings below.
            </DialogDescription>
          </DialogHeader>

          <SmsGatewayButton />
        </DialogContent>
      </form>
    </Dialog>
  );
}
