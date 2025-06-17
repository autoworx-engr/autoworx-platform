import { InterceptedDialog } from "@/components/Dialog";
import { db } from "@/lib/db";

import { getTechnicians } from "@/actions/estimate/technician/getTechnicians";
import InvoiceModalBody from "../../../../components/invoice-modal/InvoiceModalBody";
import ProtectedRouteForViewInvoice from "./ProtectedRouteForViewInvoice";

export default async function ViewEstimate({
  params: { invoiceId },
}: {
  params: { invoiceId: string };
}) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      company: true,
      invoiceItems: {
        include: {
          service: {
            include: {
              Technician: true,
            },
          },
          materials: true,
          labor: true,
        },
      },
      photos: true,
      tasks: true,
      column: true,
      user: true,
    },
  });

  // if (!invoice) {
  //   return notFound();
  // }

  const clientId = invoice?.clientId
    ? await db.client.findUnique({
        where: { id: invoice.clientId },
      })
    : null;

  return (
    <InterceptedDialog>
      <ProtectedRouteForViewInvoice hasInvoice={!!invoice}>
        {invoice && <InvoiceModalBody invoiceId={invoiceId} isPublic={true} />}
      </ProtectedRouteForViewInvoice>
    </InterceptedDialog>
  );
}
