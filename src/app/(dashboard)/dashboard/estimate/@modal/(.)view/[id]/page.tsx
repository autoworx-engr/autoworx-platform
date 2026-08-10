import { InterceptedDialog } from "@/components/Dialog";
import { db } from "@/lib/db";

import { getTechnicians } from "@/actions/estimate/technician/getTechnicians";
import InvoiceModalBody from "@/components/invoice-modal/InvoiceModalBody";
import { getCompanyId } from "@/lib/companyId";
import ProtectedRouteForViewInvoice from "./ProtectedRouteForViewInvoice";

export default async function ViewEstimate(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  const { id } = params;

  const companyId = await getCompanyId();
  const invoice = await db.invoice.findUnique({
    where: { id, companyId },
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

  // const clientId = invoice?.clientId
  //   ? await db.client.findUnique({
  //       where: { id: invoice.clientId },
  //     })
  //   : null;
  // const vehicle = invoice?.vehicleId
  //   ? await db.vehicle.findUnique({
  //       where: { id: invoice?.vehicleId },
  //     })
  //   : null;

  // const invoiceTechnicians = await getTechnicians({ invoiceId: invoice?.id });

  return (
    <InterceptedDialog>
      <ProtectedRouteForViewInvoice hasInvoice={!!invoice}>
        {invoice && <InvoiceModalBody invoiceId={invoice.id} />}
      </ProtectedRouteForViewInvoice>
    </InterceptedDialog>
  );
}
