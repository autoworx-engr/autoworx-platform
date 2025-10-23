import { Dialog, DialogTrigger } from "@/components/Dialog";
import { useState } from "react";
import SettingsModalContent from "./SettingsModalContent";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="app-shadow rounded-md p-[5px] text-xl text-[#797979] md:p-2">
            <SettingsIcon size={20} />
          </button>
        </DialogTrigger>
        {open && <SettingsModalContent onClose={() => setOpen(false)} />}
      </Dialog>
    </div>
  );
}
