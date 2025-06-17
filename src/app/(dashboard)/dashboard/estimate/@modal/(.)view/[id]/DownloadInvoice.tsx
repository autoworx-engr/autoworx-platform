"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import PDFComponent from "./PDFComponent";

export default function DownloadInvoice({
  id,
  invoice,
  clientId,
  vehicle,
  companyDetails,
  authorizedName,
}: any) {
  const [isClient, setIsClient] = useState(false);
  // `attempt` is used as a key to force remounting of the PDFDownloadLink on retry
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Use useCallback to avoid creating new function instance on every render
  const handleErrorRetry = useCallback(() => {
    // Wait 1 second before retrying to give things a moment to settle
    setTimeout(() => {
      setAttempt((prev) => prev + 1);
    }, 1000);
  }, []);

  return (
    <div>
      {isClient && (
        <PDFDownloadLink
          key={attempt} // Using the key forces a remount on each retry
          document={
            <PDFComponent
              id={id}
              invoice={invoice}
              clientId={clientId}
              vehicle={vehicle}
              companyDetails={companyDetails}
              authorizedName={authorizedName}
            />
          }
          fileName="invoice.pdf"
        >
          {/* @ts-ignore */}
          {({ loading, error }: any) => {
            if (loading || error) return "Loading PDF...";
            if (error) {
              console.error("Error generating PDF:", error);
              // Trigger a retry when an error occurs
              handleErrorRetry();
            }
            return <span>Download PDF</span>;
          }}
        </PDFDownloadLink>
      )}
    </div>
  );
}
