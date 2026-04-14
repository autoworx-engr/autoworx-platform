import { Dialog, DialogTrigger } from "@/components/Dialog";
import { Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";
import SettingsModalContent from "./SettingsModalContent";
import { Button } from "@/components/ui/button";

export default function Settings() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon-lg">
            <SettingsIcon size={20} />
          </Button>
        </DialogTrigger>
        {open && <SettingsModalContent onClose={() => setOpen(false)} />}
      </Dialog>
    </div>
  );
}
