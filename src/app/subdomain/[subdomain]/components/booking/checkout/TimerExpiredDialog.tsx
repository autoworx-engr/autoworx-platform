import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog";
import { AlertTriangle, Timer } from "lucide-react";

interface TimerExpiredDialogProps {
  open: boolean;
  onAddTime: () => void;
  onReturn: () => void;
}

export const TimerExpiredDialog = ({
  open,
  onAddTime,
  onReturn,
}: TimerExpiredDialogProps) => (
  <Dialog open={open} onOpenChange={() => {}}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-accent" /> Time's Up!
        </DialogTitle>
        <DialogDescription>
          Your reservation has expired. Would you like to extend or start over?
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2 pt-2">
        <Button onClick={onAddTime} className="gap-2">
          <Timer className="w-4 h-4" /> Add 10 More Minutes
        </Button>
        <Button variant="outline" onClick={onReturn}>
          Return to Booking
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);
