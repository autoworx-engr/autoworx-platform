"use client";
import { getFleetStatements } from "@/actions/fleet/statement";
import { useEffect, useState } from "react";
import { FleetTab, TabsContent, TabsList, TabsTrigger } from "./FleetTab";
import InvoiceList from "./InvoiceList";

type InvoiceAndStatementListProps = {
  client: any;
  searchParams: {
    search?: string;
  };
};

const InvoiceAndStatementList = ({
  client,
  searchParams,
}: InvoiceAndStatementListProps) => {
  const [fleetStatements, setFleetStatements] = useState<any[]>([]);
  const [loadingStatements, setLoadingStatements] = useState(false);

  const fleetId = client?.fleet?.id;

  // Function to load fleet statements
  const loadFleetStatements = async () => {
    if (fleetId) {
      setLoadingStatements(true);
      try {
        const result = await getFleetStatements(fleetId);
        if (result.type === "success") {
          setFleetStatements(result.data);
        } else {
          console.error("Error loading fleet statements:", result.message);
          setFleetStatements([]);
        }
      } catch (error) {
        console.error("Error loading fleet statements:", error);
        setFleetStatements([]);
      } finally {
        setLoadingStatements(false);
      }
    }
  };

  // Load fleet statements when component mounts or fleetId changes
  useEffect(() => {
    loadFleetStatements();
  }, [fleetId]);

  // Handler for when a statement is created or deleted
  const handleStatementRefresh = () => {
    // Reload statements without remounting component
    loadFleetStatements();
  };

  return (
    <div className="py-5">
      <FleetTab defaultValue="invoice">
        <TabsList>
          <TabsTrigger value="statement">Statement</TabsTrigger>
          <TabsTrigger value="invoice">Invoice</TabsTrigger>
        </TabsList>

        <TabsContent value="invoice">
          <InvoiceList
            searchParams={searchParams}
            invoiceData={client?.Invoice}
            type="Invoice"
            fleetId={fleetId}
            onStatementCreated={handleStatementRefresh}
          />
        </TabsContent>
        <TabsContent value="statement">
          <InvoiceList
            searchParams={searchParams}
            invoiceData={fleetStatements}
            type="Statement"
            fleetId={fleetId}
            onStatementCreated={handleStatementRefresh}
            loading={loadingStatements}
            onRefresh={handleStatementRefresh}
          />
        </TabsContent>
      </FleetTab>
    </div>
  );
};

export default InvoiceAndStatementList;
