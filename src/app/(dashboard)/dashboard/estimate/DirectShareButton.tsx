import { sendInvoiceEmail } from "@/actions/estimate/invoice/sendInvoiceEmail";
import { sendInvoiceSms } from "@/actions/estimate/invoice/sendInvoiceSms";
import { useGoToEstimateEdit } from "@/hooks/useGoToEstimateEdit";
import { useInvoiceCreate } from "@/hooks/useInvoiceCreate";
import { cn } from "@/lib/cn";
import { errorToast, successToast } from "@/lib/toast";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useListsStore } from "@/stores/lists";
import { Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { RotatingLines } from "react-loader-spinner";
import { Session } from "next-auth";
import { sendCollaborationInvoiceSms } from "@/actions/estimate/invoice/sendCollaborationInvoiceSms";

const SEND_TIMEOUT_MS = 30_000;

async function withSendTimeout<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                "Sending is taking too long. The estimate was saved — check the client's messages before trying again.",
              ),
            ),
          SEND_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function SendButton({
  label,
  bold,
  busy,
  disabled,
  onClick,
}: {
  label: string;
  bold?: boolean;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-500 ring-1 ring-inset ring-slate-200 transition-all hover:bg-primary/5 hover:text-primary hover:ring-primary/30 disabled:opacity-40 disabled:pointer-events-none active:scale-95",
        bold ? "font-bold" : "font-semibold",
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {busy ? (
        <RotatingLines strokeColor="#6571FF" strokeWidth="5" width="16" />
      ) : (
        <Send size={16} strokeWidth={2.5} />
      )}
      <span>{label}</span>
    </button>
  );
}

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
  const goToEstimateEdit = useGoToEstimateEdit();
  const client = useListsStore((state) => state.client);
  const invoiceId = useEstimateCreateStore((state) => state.invoiceId);
  // Not useTransition: a send ends in a route change, and React 19 keeps an
  // async transition pending until that route has rendered, so the spinner
  // kept running. Owning the flag means it always clears.
  const [sending, setSending] = useState<
    "Email" | "SMS" | "Collaboration" | null
  >(null);
  const createInvoicePath = pathname.includes("/dashboard/estimate/create");
  const senderUserId = (authUser as Session & { user: { companyId: number } })
    ?.user?.id;
  const clientId = client?.id;

  async function handleSubmit({
    type,
  }: {
    type: "Email" | "SMS" | "Collaboration";
  }) {
    setSending(type);
    try {
      if (!clientId) {
        errorToast("Client not selected");
        return;
      }
      const saved = await createInvoice();

      if (saved.type !== "success") {
        const message =
          "errorSource" in saved && saved.errorSource?.length
            ? saved.errorSource[0].message
            : saved.message;
        errorToast(message || "Could not save the estimate. Please try again.");
        return;
      }

      const savedId = saved.data?.id ?? invoiceId;
      let sendFailed = false;

      try {
        if (type === "Email") {
          const sendEmailResponse = await withSendTimeout(
            sendInvoiceEmail({ invoiceId: savedId }),
          );
          if (!sendEmailResponse.success) {
            throw new Error(
              sendEmailResponse.message || "Email sending failed",
            );
          }
          if (!createInvoicePath) {
            router.push(
              `/dashboard/communication/client/${clientId}?open=EMAIL&chat=true`,
            );
          }
          successToast("Email sent successfully");
        } else if (type === "SMS") {
          const sendEmailResponse = await withSendTimeout(
            sendInvoiceSms({ invoiceId: savedId }),
          );
          if (!sendEmailResponse.success) {
            throw new Error(sendEmailResponse.message || "SMS sending failed");
          }
          if (!createInvoicePath) {
            router.push(
              `/dashboard/communication/client/${clientId}?chat=true`,
            );
          }
          successToast("SMS sent successfully");
        } else if (type === "Collaboration") {
          const sendEmailResponse = await withSendTimeout(
            sendCollaborationInvoiceSms({
              invoiceId: savedId,
              senderUserId: Number(senderUserId),
              toCompanyId: requestEstimate?.senderCompanyId,
            }),
          );
          if (!sendEmailResponse.success) {
            throw new Error(sendEmailResponse.message || "SMS sending failed");
          }

          if (!createInvoicePath) {
            router.push(
              `/dashboard/communication/collaboration?companyId=${requestEstimate?.senderCompanyId}`,
            );
          }
          successToast("SMS sent successfully");
        }
      } catch (error) {
        sendFailed = true;
        errorToast(
          error instanceof Error && error.message
            ? error.message
            : "Sending failed. Please try again.",
        );
        // The estimate is saved either way, so a failed send goes to the list
        // rather than back to the create page it was started from.
        router.push(`/dashboard/estimate`);
      }

      // A send that went through has written the estimate, so the create page
      // must not stay in its create state — the next send would write a second
      // estimate. Move to the edit state for the record that was just saved,
      // and keep the store as it is so the edit page can pick it up.
      if (!sendFailed && createInvoicePath) {
        goToEstimateEdit(savedId, clientId);
      }
    } catch (error) {
      errorToast(`Sending ${type} failed. Please try again.`);
    } finally {
      setSending(null);
    }
  }
  // Never unmount on a missing client: these buttons disappearing mid-flow is
  // worse than a disabled one, and the store can be briefly empty while a
  // route hydrates. handleSubmit still guards the send itself.
  const disabled = sending !== null || !client;

  return (
    <div className="flex items-center gap-x-3">
      <SendButton
        label="Email"
        bold
        busy={sending === "Email"}
        disabled={disabled}
        onClick={() => handleSubmit({ type: "Email" })}
      />

      <SendButton
        label="SMS"
        busy={sending === "SMS"}
        disabled={disabled}
        onClick={() => handleSubmit({ type: "SMS" })}
      />

      {requestEstimate && (
        <SendButton
          label="Collaboration"
          busy={sending === "Collaboration"}
          disabled={disabled}
          onClick={() => handleSubmit({ type: "Collaboration" })}
        />
      )}
    </div>
  );
}
