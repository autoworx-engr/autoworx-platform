"use client";

import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function SidebarCloseButton() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const handleClose = () => {
    const params = new URLSearchParams(search);
    params.delete("productId");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <button
      onClick={handleClose}
      className="rounded p-0.5 mb-0.5 text-slate-400 hover:bg-red-50 hover:text-red-400 transition-colors dark:hover:bg-red-950/40"
    >
      <X size={20} strokeWidth={2.5} />
    </button>
  );
}
