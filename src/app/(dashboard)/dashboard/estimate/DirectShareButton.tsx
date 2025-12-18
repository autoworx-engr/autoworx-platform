import { useInvoiceCreate } from "@/hooks/useInvoiceCreate";
import { cn } from "@/lib/cn";
import { errorToast } from "@/lib/toast";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useListsStore } from "@/stores/lists";
import { Send } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { RotatingLines } from "react-loader-spinner";

export default function DirectShareButton() {
  const router = useRouter();
  const pathname = usePathname();
  const type = pathname.includes("/invoices/") ? "Invoice" : "Estimate";
  const createInvoice = useInvoiceCreate(type);
  const resetEstimateCreate = useEstimateCreateStore(state => state.reset);
  const [pendingEmail, startEmailTransition] = useTransition();
  const [pendingSms, startSmsTransition] = useTransition();
  const resetLists = useListsStore(state => state.reset);

  async function handleSubmit() {
    const res = await createInvoice();
    if (res.type === "success") {
      if (type === "Estimate") {
        router.push("/dashboard/estimate");
      } else {
        router.push("/dashboard/estimate/invoices");
      }
      resetEstimateCreate();
      resetLists();
    } else if (res.type === "globalError") {
      errorToast(
        res.errorSource?.length ? res.errorSource[0].message : res.message
      );
      return;
    }
  }
  return (
    <div className="flex items-center gap-x-4">
      <button
        className={cn(
          "flex w-full items-center justify-center gap-2 text-nowrap  border-slate-600 p-2 text-center text-sm disabled:opacity-35 border rounded-md bg-slate-100 px-3 py-2 hover:bg-slate-200 border-none"
        )}
        onClick={() => startEmailTransition(handleSubmit)}
        disabled={pendingEmail}
      >
        {pendingEmail ? (
          <div className="flex items-center justify-center h-6">
            <RotatingLines strokeColor="#fff" strokeWidth="5" width="25" />
          </div>
        ) : (
          <>
            <Send size={18} />
            <span>Email</span>
          </>
        )}
      </button>

      <button
        className={cn(
          "flex w-full items-center justify-center gap-2 text-nowrap  border-slate-600 p-2 text-center text-sm disabled:opacity-35 border rounded-md bg-slate-100 px-3 py-2 hover:bg-slate-200 border-none"
        )}
        onClick={() => startSmsTransition(handleSubmit)}
        disabled={pendingSms}
      >
        {pendingSms ? (
          <div className="flex items-center justify-center h-6">
            <RotatingLines strokeColor="#fff" strokeWidth="5" width="25" />
          </div>
        ) : (
          <>
            <Send size={18} />
            <span>SMS</span>
          </>
        )}
      </button>
    </div>
  );
}
