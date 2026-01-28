import { Dialog, DialogTrigger } from "@/components/Dialog";
import { Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";
import SettingsModalContent from "./SettingsModalContent";

export default function Settings() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            className="
  bg-white/50 backdrop-blur-sm 
  rounded-md ring-1 ring-slate-900/5 dark:bg-slate-900/50 dark:ring-slate-700/50
  p-2 border
  text-slate-600 dark:text-slate-300 font-medium text-sm
  transition-all duration-300 ease-in-out
  hover:bg-white/80 dark:hover:bg-slate-800/80
  hover:-translate-y-0.5 hover:shadow-md"
          >
            <SettingsIcon size={20} />
          </button>
        </DialogTrigger>
        {open && <SettingsModalContent onClose={() => setOpen(false)} />}
      </Dialog>
    </div>
  );
}
