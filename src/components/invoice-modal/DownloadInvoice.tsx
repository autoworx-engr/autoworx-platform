"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import PDFComponent from "./PDFComponent";
import {
  Client,
  Column,
  Company,
  Invoice,
  InvoiceItem,
  InvoicePhoto,
  Labor,
  Material,
  Service,
  User,
  Vehicle,
} from "@prisma/client";

type DownloadInvoiceProps = {
  id: string;
  invoice: Invoice & {
    column: Column | null;
    company: Company;
    invoiceItems: (InvoiceItem & {
      materials: Material[] | [];
      service: Service | null;
      invoice: Invoice | null;
      labor: Labor | null;
    })[];
    photos: InvoicePhoto[];
    user: User;
  };
  client: Client;
  vehicle: Vehicle;
  companyDetails: Company;
  authorizedName: string;
  isStripe: boolean;
  signImageUrl?: string;
};

export default function DownloadInvoice({
  id,
  invoice,
  client,
  vehicle,
  companyDetails,
  authorizedName,
  isStripe,
  signImageUrl,
}: DownloadInvoiceProps) {
  const [isClient, setIsClient] = useState(false);
  const [isPdfReady, setIsPdfReady] = useState(false);

  // `attempt` is used as a key to force remounting of the PDFDownloadLink on retry
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setIsClient(true);
    // Delay PDF preparation to improve initial render performance
    const timer = setTimeout(() => {
      setIsPdfReady(true);
    }, 500);

    return () => clearTimeout(timer);
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
      {isClient && isPdfReady && (
        <PDFDownloadLink
          key={attempt} // Using the key forces a remount on each retry
          document={
            <PDFComponent
              id={id}
              invoice={invoice}
              client={client}
              vehicle={vehicle}
              companyDetails={companyDetails}
              authorizedName={authorizedName}
              signImageUrl={signImageUrl}
              isStripe={isStripe}
            />
          }
          fileName="invoice.pdf"
        >
            {/* @ts-ignore */}
            {({ loading, error }: any) => {
              if (error) {
                console.error("Error generating PDF:", error);
                return (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleErrorRetry();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleErrorRetry();
                      }
                    }}
                    className="text-red-600 cursor-pointer"
                  >
                    Retry Download
                  </span>
                );
              }

              return (
                <span
                  onClick={(e) => {
                    if (loading) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  className={loading ? "cursor-not-allowed" : "cursor-pointer"}
                >
                  {/* {loading ? "Download PDF..." : "Download PDF"} */}
                  Download PDF
                </span>
              );
            }}
        </PDFDownloadLink>
      )}
      {isClient && !isPdfReady && <span>Download PDF</span>}
    </div>
  );
}
