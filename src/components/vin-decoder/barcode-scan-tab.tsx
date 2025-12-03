import { Button } from "@/components/ui/button";
import { ScanLine } from "lucide-react";

import React, { useEffect, useRef, useState } from "react";
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
} from "@zxing/library";

type TBarcodeScanTabProps = {
  onDetectedValue?: (vin: string) => void;
};

const isValidVin = (vin: string) => {
  const normalized = vin.trim().toUpperCase();
  // VIN = 17 characters, no I, O, Q
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(normalized);
};

export default function BarcodeScanTab({
  onDetectedValue,
}: TBarcodeScanTabProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const [scannedValue, setScannedValue] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>("");
  const [isCameraActive, setIsCameraActive] = useState(false);

  // init reader once
  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_39, // most VIN barcodes
      BarcodeFormat.CODE_128,
      BarcodeFormat.PDF_417,
      BarcodeFormat.DATA_MATRIX,
    ]);

    readerRef.current = new BrowserMultiFormatReader(hints);

    return () => {
      // cleanup on unmount
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);

  const onStartCamera = async () => {
    if (!readerRef.current) return;
    setError(null);
    setIsCameraActive(true);

    try {
      const devices = await readerRef.current.listVideoInputDevices();
      if (!devices.length) {
        setError("No camera devices found");
        setIsCameraActive(false);
        return;
      }

      const deviceId = devices[0].deviceId;
      console.log("Using video device:", deviceId);
      console.log("Video ref:", videoRef.current);

      await readerRef.current.decodeFromVideoDevice(
        deviceId,
        (videoRef.current as HTMLVideoElement) || undefined,
        (result, err) => {
          console.log({ result, err });
          if (result) {
            const text = result.getText().trim();
            setScannedValue(text);

            const vinOk = isValidVin(text);
            setIsValid(vinOk);

            if (vinOk) {
              // stop scanning after a valid VIN
              readerRef?.current?.reset();
              setIsCameraActive(false);
              if (onDetectedValue) onDetectedValue(text);
            }
          }
          // `err` happens a lot while scanning; usually safe to ignore
        }
      );
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Could not start VIN scanner");
      setIsCameraActive(true);
    }
  };

  const onStopScan = () => {
    if (readerRef.current) {
      readerRef.current.reset();
      setIsCameraActive(false);
    }
  };

  return (
    <div className="space-y-4">
      {!isCameraActive ? (
        <>
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 shadow-inner text-center space-y-6">
            <button
              onClick={onStartCamera}
              className="relative mx-auto w-32 h-32 group"
            >
              <div className="absolute inset-0 bg-blue-50 rounded-full animate-pulse group-hover:scale-105 transition-transform duration-300"></div>
              <div className="relative w-full h-full bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-xl group-active:scale-95 transition-transform">
                <ScanLine size={48} />
              </div>
              {/* Decorative corner brackets */}
              <div className="absolute top-0 left-0 w-full h-full border-2 border-dashed border-blue-300 rounded-full animate-[spin_10s_linear_infinite]"></div>
            </button>

            <div>
              <h2 className="text-xl font-bold text-slate-800">Tap to Scan</h2>
              <p className="text-slate-500 text-sm mt-2">
                Point your device at the VIN barcode to decode vehicle details
                instantly.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="h-64 w-full object-cover"
              muted
            />
            {/* Barcode scanning frame overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-32 w-48 border-2 border-white opacity-75" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-10 bg-white text-black border-black hover:bg-gray-100"
              // disabled={!scannedValue}
              disabled
            >
              {/* {!!scannedValue ? "Scan" : "Scanning"} */}
              Scanning
            </Button>
            <Button
              type="button"
              onClick={onStopScan}
              variant="outline"
              className="flex-10 bg-white text-black border-black hover:bg-gray-100"
            >
              Close Camera
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
