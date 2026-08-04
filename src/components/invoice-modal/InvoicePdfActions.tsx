"use client";

import { cn } from "@/lib/cn";
import { BlobProvider } from "@react-pdf/renderer";
import { Download, Printer } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import PDFComponent, { type PDFComponentProps } from "./PDFComponent";

const ACTION_CLASS =
  "flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-primary from-70% to-[#5a66ee] px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:scale-[1.02] active:scale-95";

const DISABLED_CLASS = "cursor-not-allowed opacity-70 hover:scale-100";

/**
 * Loads the generated PDF into an off-screen iframe and opens the browser's
 * print dialog on it, so Print outputs the exact same document as the PDF
 * download instead of printing the modal's DOM.
 */
function printPdfUrl(url: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  frame.src = url;

  const cleanup = () => frame.remove();

  frame.onload = () => {
    const frameWindow = frame.contentWindow;
    if (!frameWindow) {
      cleanup();
      return;
    }

    // Drop the frame once the dialog closes. The timeout is a fallback for
    // browsers that never fire `afterprint`.
    frameWindow.addEventListener("afterprint", cleanup, { once: true });
    setTimeout(cleanup, 60_000);

    frameWindow.focus();
    frameWindow.print();
  };

  document.body.appendChild(frame);
}

type TProps = PDFComponentProps & {
  /** Render the Print button next to the download link. */
  showPrint?: boolean;
};

/**
 * Renders the Print and PDF buttons off a single generated document, so both
 * actions always hand out identical output and the PDF is only rendered once.
 */
export default function InvoicePdfActions({
  showPrint = true,
  ...pdfProps
}: TProps) {
  const [isReady, setIsReady] = useState(false);

  // `attempt` is used as a key to force remounting the provider on retry
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Defer the PDF work so the modal's first paint stays cheap.
    const timer = setTimeout(() => setIsReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleErrorRetry = useCallback(() => {
    // Wait a second before retrying to give things a moment to settle
    setTimeout(() => setAttempt((prev) => prev + 1), 1000);
  }, []);

  const placeholders = (
    <>
      {showPrint && (
        <span className={cn(ACTION_CLASS, DISABLED_CLASS)}>
          <Printer className="h-4 w-4" />
          <span className="hidden md:inline">Print</span>
        </span>
      )}
      <span className={cn(ACTION_CLASS, DISABLED_CLASS)}>
        <Download className="h-5 w-5" strokeWidth={2} /> PDF
      </span>
    </>
  );

  if (!isReady) return placeholders;

  return (
    <BlobProvider key={attempt} document={<PDFComponent {...pdfProps} />}>
      {({ url, loading, error }) => {
        if (error) {
          console.error("Error generating PDF:", error);
          return (
            <button
              type="button"
              onClick={handleErrorRetry}
              className={cn(ACTION_CLASS, "bg-red-600 bg-none")}
            >
              Retry PDF
            </button>
          );
        }

        const notReady = loading || !url;

        return (
          <>
            {showPrint && (
              <button
                type="button"
                disabled={notReady}
                onClick={() => url && printPdfUrl(url)}
                className={cn(ACTION_CLASS, notReady && DISABLED_CLASS)}
              >
                <Printer className="h-4 w-4" />
                <span className="hidden md:inline">Print</span>
              </button>
            )}

            <a
              href={url ?? undefined}
              download="invoice.pdf"
              aria-disabled={notReady}
              onClick={(e) => {
                if (notReady) e.preventDefault();
              }}
              className={cn(ACTION_CLASS, notReady && DISABLED_CLASS)}
            >
              <Download className="h-5 w-5" strokeWidth={2} /> PDF
            </a>
          </>
        );
      }}
    </BlobProvider>
  );
}
