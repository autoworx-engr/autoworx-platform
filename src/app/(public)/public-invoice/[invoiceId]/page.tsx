import { InterceptedDialog } from "@/components/Dialog";
import { db } from "@/lib/db";

import { getTechnicians } from "@/actions/estimate/technician/getTechnicians";
import InvoiceModalBody from "../../../../components/invoice-modal/InvoiceModalBody";
import ProtectedRouteForViewInvoice from "./ProtectedRouteForViewInvoice";
import { FleetStatementModalBody } from "./FleetStatementModalBody";

export default async function ViewEstimate(props: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ fleet?: string }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const { invoiceId } = params;

  const isFleetStatement = (await searchParams?.fleet) === "true";

  if (isFleetStatement) {
    // Load fleet statement data
    const statement = await db.fleetStatement.findFirst({
      where: {
        id: invoiceId.toString(),
      },
      include: {
        Fleet: {
          include: {
            client: {
              include: {
                company: true,
              },
            },
          },
        },
        invoice: {
          include: {
            vehicle: true,
            client: true,
            column: true,
          },
        },
      },
    });

    return (
      <InterceptedDialog>
        <ProtectedRouteForViewInvoice hasInvoice={!!statement}>
          {statement && (
            <FleetStatementModalBody
              statementId={invoiceId}
              initialStatement={statement}
            />
          )}
        </ProtectedRouteForViewInvoice>
      </InterceptedDialog>
    );
  }

  // Original invoice logic
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
