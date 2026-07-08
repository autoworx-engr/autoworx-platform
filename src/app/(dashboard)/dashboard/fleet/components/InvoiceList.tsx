import { FleetStatement, Invoice } from "@prisma/client";
import FilterBySearchBox from "../../reporting/components/filter/FilterBySearchBox";
import CreateStatementModal from "./CreateStatementModal";
import FleetStatementListTable from "./FleetStatementListTable";
import InvoiceListTable from "./InvoiceListTable";

export interface InVoiceDataType {
  id: string;
  invoiceNumber: string;
  year: number;
  make: string;
  model: string;
  vin: string;
  price: string;
  payment: string;
  status: string;
}

const InvoiceList = ({
  invoiceData,
  searchParams,
  type = "Invoice",
  fleetId,
  onStatementCreated,
  loading = false,
  onRefresh,
}: {
  invoiceData: Invoice[] | FleetStatement[] | any;
  searchParams: {
    search?: string;
  };
  type: string;
  fleetId?: number;
  onStatementCreated?: () => void;
  loading?: boolean;
  onRefresh?: () => void;
}) => {
  const unpaidInvoices = invoiceData?.filter(
    (item: any) =>
      item.due !== null && Number(item.due) > 0 && !item.fleetStatementId, // Exclude invoices that are already in a statement
  );

  const { search } = searchParams;

  // Filtering logic
  const filteredInvoices = invoiceData?.filter((item: any) => {
    const matchSearch = search
      ? item?.id?.toLowerCase().includes(search.toLowerCase()) ||
        item?.vehicle?.vin?.toLowerCase().includes(search.toLowerCase()) ||
        item?.vehicle?.make?.toLowerCase().includes(search.toLowerCase()) ||
        item?.vehicle?.year?.toString().includes(search) ||
        item?.vehicle?.other?.toLowerCase().includes(search)
      : true;

    return matchSearch;
  });

  const filteredStatements = invoiceData?.filter((item: any) => {
    const matchedSearch = search
      ? item?.id?.toLowerCase().includes(search.toLowerCase()) ||
        item?.invoice?.length.toString().includes(search)
      : true;

    return matchedSearch;
  });

  return (
    <div className="">
      {/* <FleetSubHeading text={`${type} List`} /> */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-md">
          <FilterBySearchBox
            searchText={searchParams?.search as string}
            placeholder={
              type === "Statement"
                ? "Search by Statement"
                : "Search by Invoice, Year, Make"
            }
          />
        </div>

        {/* Only show CreateStatementModal for Invoice type and when fleetId is available */}
        {type === "Invoice" && fleetId && (
          <div className="sm:flex-shrink-0">
            <CreateStatementModal
              unPaidInvoices={unpaidInvoices as Invoice[]}
              fleetId={fleetId}
              onStatementCreated={onStatementCreated}
            />
          </div>
        )}
      </div>

      {/* Render appropriate table based on type */}
      {type === "Statement" ? (
        <FleetStatementListTable
          statementData={filteredStatements}
          loading={loading}
          onRefresh={onRefresh}
        />
      ) : (
        <InvoiceListTable invoiceData={filteredInvoices} type={type} />
      )}
    </div>
  );
};

export default InvoiceList;
