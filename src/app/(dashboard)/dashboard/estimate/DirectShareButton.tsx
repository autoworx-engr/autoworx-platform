import { sendInvoiceEmail } from "@/actions/estimate/invoice/sendInvoiceEmail";
import { sendInvoiceSms } from "@/actions/estimate/invoice/sendInvoiceSms";
import { useInvoiceCreate } from "@/hooks/useInvoiceCreate";
import { cn } from "@/lib/cn";
import { errorToast, successToast } from "@/lib/toast";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useListsStore } from "@/stores/lists";
import { Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { RotatingLines } from "react-loader-spinner";
import { Session } from "next-auth";
import { sendCollaborationInvoiceSms } from "@/actions/estimate/invoice/sendCollaborationInvoiceSms";

export default function DirectShareButton({
  requestEstimate,
}: {
  requestEstimate?: any;
}) {
  const router = useRouter();
  const { data: authUser } = useSession();
  const pathname = usePathname();
  const type = pathname.includes("/invoices/") ? "Invoice" : "Estimate";
  const createInvoice = useInvoiceCreate(type);
  const resetEstimateCreate = useEstimateCreateStore((state) => state.reset);
  const client = useListsStore((state) => state.client);
  const invoiceId = useEstimateCreateStore((state) => state.invoiceId);
  const [pendingEmail, startEmailTransition] = useTransition();
  const [pendingSms, startSmsTransition] = useTransition();
  const [pendingCollaboration, startCollaborationTransition] = useTransition();
  const resetLists = useListsStore((state) => state.reset);
  const createInvoicePath = pathname.includes("/dashboard/estimate/create");
  const senderUserId = (authUser as Session & { user: { companyId: number } })
    ?.user?.id;
  const clientId = client?.id;

  async function handleSubmit({
    type,
  }: {
    type: "Email" | "SMS" | "Collaboration";
  }) {
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
            `/dashboard/communication/client/${clientId}?open=EMAIL&chat=true`,
          );
          successToast("Email sent successfully");
        } else if (type === "SMS") {
          const sendEmailResponse = await sendInvoiceSms({ invoiceId });
          if (!sendEmailResponse.success) {
            throw new Error("SMS sending failed");
          }
          router.push(`/dashboard/communication/client/${clientId}?chat=true`);
          successToast("SMS sent successfully");
        } else if (type === "Collaboration") {
          const sendEmailResponse = await sendCollaborationInvoiceSms({
            invoiceId,
            senderUserId: Number(senderUserId),
            toCompanyId: requestEstimate?.senderCompanyId,
          });
          if (!sendEmailResponse.success) {
            throw new Error("SMS sending failed");
          }

          router.push(
            `/dashboard/communication/collaboration?companyId=${requestEstimate?.senderCompanyId}`,
          );
          successToast("SMS sent successfully");
        }
      } catch (error) {
        errorToast("Sending failed. Please try again.");
        if (createInvoicePath) {
          router.push(
            `/dashboard/estimate/edit/${invoiceId}?clientId=${clientId}`,
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
          "flex w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-500 ring-1 ring-inset ring-slate-200 transition-all hover:bg-primary/5 hover:text-primary hover:ring-primary/30 disabled:opacity-40 disabled:pointer-events-none active:scale-95",
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
          "flex w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500 ring-1 ring-inset ring-slate-200 transition-all hover:bg-primary/5 hover:text-primary hover:ring-primary/30 disabled:opacity-40 disabled:pointer-events-none active:scale-95",
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

      {requestEstimate && (
        <button
          className={cn(
            "flex w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500 ring-1 ring-inset ring-slate-200 transition-all hover:bg-primary/5 hover:text-primary hover:ring-primary/30 disabled:opacity-40 disabled:pointer-events-none active:scale-95",
          )}
          onClick={() =>
            startCollaborationTransition(() =>
              handleSubmit({ type: "Collaboration" }),
            )
          }
          disabled={pendingCollaboration}
        >
          {pendingSms ? (
            <div className="flex h-5 items-center justify-center">
              <RotatingLines strokeColor="#6571FF" strokeWidth="5" width="20" />
            </div>
          ) : (
            <>
              <Send size={16} strokeWidth={2.5} />
              <span>Collaboration</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
