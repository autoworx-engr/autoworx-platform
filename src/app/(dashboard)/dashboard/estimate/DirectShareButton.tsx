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
          successToast("SMS sent successfully");
        } else if (type === "SMS") {
          const sendEmailResponse = await sendInvoiceSms({ invoiceId });
          if (!sendEmailResponse.success) {
            throw new Error("SMS sending failed");
          }
          successToast("SMS sent successfully");
        }
        router.push(`/dashboard/communication/client/${clientId}?chat=true`);
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
    <div className="flex items-center gap-x-4">
      <button
        className={cn(
          "flex w-full items-center justify-center gap-2 text-nowrap  border-slate-600 p-2 text-center text-sm disabled:opacity-35 border rounded-md bg-slate-100 px-3 py-2 hover:bg-slate-200 border-none"
        )}
        onClick={() =>
          startEmailTransition(() => handleSubmit({ type: "Email" }))
        }
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
        onClick={() => startSmsTransition(() => handleSubmit({ type: "SMS" }))}
        disabled={pendingSms}
      >
        {pendingSms ? (
          <div className="flex items-center justify-center h-6">
            <RotatingLines strokeColor="#5622f2" strokeWidth="5" width="25" />
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
