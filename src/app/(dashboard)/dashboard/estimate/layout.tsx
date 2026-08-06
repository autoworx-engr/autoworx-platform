import { requireRouteAccess } from "@/lib/serverRouteGuard";

export const dynamic = "force-dynamic";

/**
 * Guards the whole Estimates & Invoices subtree — /invoices, /canned,
 * /templates, /templates/create, /create, /edit/[id], /view/[id] and the
 * intercepted modals all sit under this layout, so one check covers them.
 */
export default async function EstimateLayout(props: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  await requireRouteAccess("/dashboard/estimate");

  return (
    <>
      {props.children}
      {props.modal}
    </>
  );
}
