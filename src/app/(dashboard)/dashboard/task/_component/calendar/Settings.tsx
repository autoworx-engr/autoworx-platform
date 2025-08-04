import { Dialog, DialogTrigger } from "@/components/Dialog";
import { useState } from "react";
import { GoGear } from "react-icons/go";
// import ConnectGoogle from "./ConnectGoogle";
import SettingsModalContent from "./SettingsModalContent";

export default function Settings() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="app-shadow rounded-md p-[5px] text-xl text-[#797979] md:p-2">
            <GoGear />
          </button>
        </DialogTrigger>
        {open && <SettingsModalContent />}
      </Dialog>
    </div>
  );
}
