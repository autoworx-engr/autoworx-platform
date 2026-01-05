import { sendInvoiceEmail } from "@/actions/estimate/invoice/sendInvoiceEmail";
import { sendInvoiceSms } from "@/actions/estimate/invoice/sendInvoiceSms";
import { useInvoiceCreate } from "@/hooks/useInvoiceCreate";
import { cn } from "@/lib/cn";
import { errorToast, successToast } from "@/lib/toast";
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
  const client = useListsStore(state => state.client);
  const invoiceId = useEstimateCreateStore(state => state.invoiceId);
  const [pendingEmail, startEmailTransition] = useTransition();
  const [pendingSms, startSmsTransition] = useTransition();
  const resetLists = useListsStore(state => state.reset);
  const createInvoicePath = pathname.includes("/dashboard/estimate/create");

  const clientId = client?.id;

  async function handleSubmit({ type }: { type: "Email" | "SMS" }) {
    try {
      if (!clientId) {
        errorToast("Client not selected");
        return;
      }
      await createInvoice();

      try {
        if (type === "Email") {
          const sendEmailResponse = await sendInvoiceEmail({ invoiceId });
          if (!sendEmailResponse.success) {
            throw new Error("SMS sending failed");
          }
          router.push(
            `/dashboard/communication/client/${clientId}?open=EMAIL&chat=true`
          );
          successToast("Email sent successfully");
        } else if (type === "SMS") {
          const sendEmailResponse = await sendInvoiceSms({ invoiceId });
          if (!sendEmailResponse.success) {
            throw new Error("SMS sending failed");
          }
          router.push(`/dashboard/communication/client/${clientId}?chat=true`);
          successToast("SMS sent successfully");
        }
      } catch (error) {
        errorToast("Sending failed. Please try again.");
        if (createInvoicePath) {
          router.push(
            `/dashboard/estimate/edit/${invoiceId}?clientId=${clientId}`
          );
        } else {
          router.push(`/dashboard/estimate`);
        }
      }
      resetEstimateCreate();
      resetLists();
    } catch (error) {
      errorToast(`Sending ${type} failed. Please try again.`);
    }
  }
  if (!client) return null;
  return (
    <div className="flex items-center gap-x-3">
      <button
        className={cn(
          "flex w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-500 ring-1 ring-inset ring-slate-200 transition-all hover:bg-[#6571FF]/5 hover:text-[#6571FF] hover:ring-[#6571FF]/30 disabled:opacity-40 disabled:pointer-events-none active:scale-95"
        )}
        onClick={() =>
          startEmailTransition(() => handleSubmit({ type: "Email" }))
        }
        disabled={pendingEmail}
      >
        {pendingEmail ? (
          <div className="flex h-5 items-center justify-center">
            <RotatingLines strokeColor="#6571FF" strokeWidth="5" width="20" />
          </div>
        ) : (
          <>
            <Send size={16} strokeWidth={2.5} />
            <span>Email</span>
          </>
        )}
      </button>

      <button
        className={cn(
          "flex w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500 ring-1 ring-inset ring-slate-200 transition-all hover:bg-[#6571FF]/5 hover:text-[#6571FF] hover:ring-[#6571FF]/30 disabled:opacity-40 disabled:pointer-events-none active:scale-95"
        )}
        onClick={() => startSmsTransition(() => handleSubmit({ type: "SMS" }))}
        disabled={pendingSms}
      >
        {pendingSms ? (
          <div className="flex h-5 items-center justify-center">
            <RotatingLines strokeColor="#6571FF" strokeWidth="5" width="20" />
          </div>
        ) : (
          <>
            <Send size={16} strokeWidth={2.5} />
            <span>SMS</span>
          </>
        )}
      </button>
    </div>
  );
}
