"use client";
import React, { useState, useEffect } from "react";
import InvoiceList from "./InvoiceList";
import { FleetTab, TabsContent, TabsList, TabsTrigger } from "./FleetTab";
import { Invoice } from "@prisma/client";
import { getFleetStatements } from "@/actions/fleet/statement";

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
  const [refreshKey, setRefreshKey] = useState(0);
  const [fleetStatements, setFleetStatements] = useState<any[]>([]);
  const [loadingStatements, setLoadingStatements] = useState(false);

  const fleetId = client?.fleet?.id;

  // Load fleet statements when component mounts or when refreshKey changes
  useEffect(() => {
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

    loadFleetStatements();
  }, [fleetId, refreshKey]);

  const handleStatementCreated = () => {
    // Trigger a refresh of the component
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="py-5" key={refreshKey}>
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
            onStatementCreated={handleStatementCreated}
          />
        </TabsContent>
        <TabsContent value="statement">
          <InvoiceList
            searchParams={searchParams}
            invoiceData={fleetStatements}
            type="Statement"
            fleetId={fleetId}
            onStatementCreated={handleStatementCreated}
            loading={loadingStatements}
            onRefresh={handleStatementCreated} // Use the same handler to refresh statements
          />
        </TabsContent>
      </FleetTab>
    </div>
  );
};

export default InvoiceAndStatementList;
